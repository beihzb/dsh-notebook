#!/usr/bin/env python3
"""kernel_driver.py - Jupyter kernel sidecar for dsh-notebook.

Holds a real ipykernel via jupyter_client.KernelManager. The Node Host spawns
this process once per notebook session and drives it over line-delimited JSON
on stdio. One kernel per sidecar process.

Protocol:
  Request  (stdin):  {"id":"<reqId>","cmd":"<cmd>", ...args}
  Response (stdout): {"id":"<reqId>","ok":true|false, ...result}

Commands:
  start         {interpreter}        -> start kernel with given python exe
  execute       {code, timeout?}     -> run code, return outputs + status
  complete      {code, cursor_pos?}  -> ipykernel complete_request (Jedi)
  inspect       {code, cursor_pos?, detail_level?} -> object docstring/type
  interrupt                           -> interrupt current execution
  restart                            -> restart kernel (clears state)
  stop                               -> shutdown kernel and exit
  ping                               -> {alive:true}
  get_state                          -> {vars:[...], kernel_info:{...}}
  load_ipynb    {path}               -> {cells:[...], metadata:{...}}
  save_ipynb    {path, cells, metadata} -> {ok:true}
  list_vars                          -> {vars:[{name,type,module,repr}]}
  inspect_object {name}              -> structured live-object summary
"""

import sys
import os
import json
import hashlib
import tempfile
import traceback
import threading
import time
from queue import Queue

os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("PYTHONIOENCODING", "utf-8")


def _force_utf8_stdio():
    """Windows consoles default to cp936; Node always reads sidecar pipes as UTF-8."""
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


_force_utf8_stdio()


def _send(obj):
    """Write one JSON line to stdout and flush."""
    sys.stdout.write(json.dumps(obj, ensure_ascii=False, default=str) + "\n")
    sys.stdout.flush()


def _log(msg):
    """Write to stderr for diagnostics (Host captures stderr tail)."""
    sys.stderr.write(str(msg) + "\n")
    sys.stderr.flush()


# Per-stream collection cap. Protects stdio transport, host memory, and the
# agent context: a runaway print() loop cannot grow unbounded. Excess chars
# are dropped (head trimmed), tail preserved, and `truncated` is flagged.
MAX_STREAM_CHARS = 500000


# ---------------------------------------------------------------------------
# .ipynb reading and writing without nbformat
#
# nbformat is NOT a dependency of the sidecar: it is absent from many lean
# conda environments that still ship ipykernel + jupyter_client (and an R
# environment has no Python packages at all).  Importing it here made
# "open notebook" fail with ``No module named 'nbformat'`` on exactly those
# environments.  Everything the file format needs is plain JSON, so the
# reader/writer below is stdlib only.
#
# The output is byte-compatible with what nbformat.write() produces -
# ``json.dumps(indent=1, sort_keys=True, ensure_ascii=False)`` with multi-line
# strings stored as a list of lines - so files written here and by Jupyter do
# not churn in git.
# ---------------------------------------------------------------------------

IPYNB_FORMAT_VERSION = 4
IPYNB_FORMAT_MINOR = 5


def _split_lines(value):
    """Render a multi-line string the way nbformat stores it.

    nbformat writes ``"a\\nb\\n"`` as ``["a\\n", "b\\n"]``.  ``splitlines`` with
    ``keepends`` reproduces that exactly, including the "no trailing newline"
    case (``"abc"`` -> ``["abc"]``).
    """
    if not isinstance(value, str):
        return value
    if value == "":
        return [""]
    return value.splitlines(keepends=True)


def _join_lines(value):
    """Accept either the string or the list-of-lines form of a multiline field."""
    if isinstance(value, list):
        return "".join(str(part) for part in value)
    if value is None:
        return ""
    return value


def _split_data(data):
    """Apply nbformat's line splitting to an output's data bundle.

    nbformat only splits the ``text/*`` mimetypes; base64 payloads such as
    ``image/png`` stay a single string, so they are left untouched here.
    """
    if not isinstance(data, dict):
        return data
    return {
        key: _split_lines(val) if isinstance(val, str) and key.startswith("text/") else val
        for key, val in data.items()
    }


def _join_data(data):
    """Inverse of _split_data for an output read back from disk."""
    if not isinstance(data, dict):
        return data
    return {
        key: _join_lines(val) if isinstance(val, list) and key.startswith("text/") else val
        for key, val in data.items()
    }


# Cell / output keys this driver understands.  Anything else a real notebook
# carries (markdown ``attachments``, per-output ``metadata`` such as widget
# view sizes, notebook-producer extensions) is round-tripped through an
# ``extras`` dict instead of being dropped.
CELL_KEYS = {"id", "cell_type", "source", "outputs", "metadata", "execution_count"}
OUTPUT_KEYS = {
    "output_type", "name", "text", "data", "metadata",
    "execution_count", "ename", "evalue", "traceback",
}


def _new_cell_id():
    """An 8-hex-digit cell id, the shape nbformat 4.5 expects."""
    return os.urandom(4).hex()


def _extras(item, known):
    return {key: val for key, val in item.items() if key not in known}


# --- nbformat 3 support ----------------------------------------------------
#
# A v3 notebook has ``worksheets`` instead of ``cells``, ``input`` instead of
# ``source``, ``prompt_number`` instead of ``execution_count``, and outputs that
# carry mime payloads as top-level ``png``/``html``/``json`` keys.  Returning an
# empty cell list for one of those would silently wipe the file on the next
# save, so v3 documents are upgraded on read (the mapping mirrors
# nbformat.v4.convert).
V3_MIME_MAP = {
    "text": "text/plain",
    "html": "text/html",
    "svg": "image/svg+xml",
    "png": "image/png",
    "jpeg": "image/jpeg",
    "latex": "text/latex",
    "json": "application/json",
    "javascript": "application/javascript",
}


def _upgrade_v3_output(output):
    out = dict(output)
    otype = out.get("output_type")
    if otype in ("pyout", "display_data"):
        metadata = out.pop("metadata", None)
        data = {}
        for key in list(out):
            if key in ("output_type", "execution_count", "prompt_number"):
                continue
            data[key] = out.pop(key)
        data = {V3_MIME_MAP.get(key, key): val for key, val in data.items()}
        if metadata:
            out["metadata"] = {V3_MIME_MAP.get(key, key): val for key, val in metadata.items()}
        payload = data.get("application/json")
        if isinstance(payload, str):
            try:
                data["application/json"] = json.loads(payload)
            except ValueError:
                pass
        out["data"] = data
        if otype == "pyout":
            out["output_type"] = "execute_result"
            out["execution_count"] = out.pop("prompt_number", None)
        else:
            out.pop("prompt_number", None)
    elif otype == "pyerr":
        out["output_type"] = "error"
    elif otype == "stream":
        out["name"] = out.pop("stream", "stdout")
    return out


def _upgrade_v3_cell(cell):
    cell = dict(cell)
    metadata = dict(cell.get("metadata") or {})
    kind = cell.get("cell_type")
    upgraded = {"id": _new_cell_id(), "metadata": metadata}
    if kind == "code":
        cell.pop("language", None)
        if "collapsed" in cell:
            metadata["collapsed"] = cell.pop("collapsed")
        upgraded["cell_type"] = "code"
        upgraded["source"] = _join_lines(cell.pop("input", ""))
        upgraded["execution_count"] = cell.pop("prompt_number", None)
        upgraded["outputs"] = [_upgrade_v3_output(o) for o in cell.get("outputs") or []]
    elif kind == "heading":
        level = cell.pop("level", 1)
        single_line = " ".join(_join_lines(cell.get("source", "")).splitlines())
        upgraded["cell_type"] = "markdown"
        upgraded["source"] = "%s %s" % ("#" * (level or 1), single_line)
    elif kind in ("markdown", "raw"):
        upgraded["cell_type"] = kind
        upgraded["source"] = _join_lines(cell.get("source", ""))
    else:
        # "html" and anything exotic degrade to markdown rather than vanishing.
        upgraded["cell_type"] = "markdown"
        upgraded["source"] = _join_lines(cell.get("source", ""))
    return upgraded


def _upgrade_v3(nb):
    """Flatten a v3 notebook into v4 shape, in place."""
    metadata = dict(nb.get("metadata") or {})
    metadata["orig_nbformat"] = nb.pop("orig_nbformat", 3) or 3
    metadata["orig_nbformat_minor"] = nb.pop("orig_nbformat_minor", 0) or 0
    metadata.pop("name", None)
    metadata.pop("signature", None)
    cells = []
    for worksheet in nb.pop("worksheets", []) or []:
        for cell in worksheet.get("cells") or []:
            cells.append(_upgrade_v3_cell(cell))
    nb["cells"] = cells
    nb["metadata"] = metadata
    nb["nbformat"] = IPYNB_FORMAT_VERSION
    nb["nbformat_minor"] = IPYNB_FORMAT_MINOR
    return nb


# --- per-language introspection probes ------------------------------------
#
# The kernel namespace lives inside the kernel, so listing variables means
# executing code there.  The snippets below emit a single JSON line that
# _json_probe parses back.  R has no stdlib JSON, so the escaping is done by
# hand; results are trimmed before escaping so a large object cannot flood the
# sidecar's stdio.

_R_ESCAPE = r"""
  esc <- function(s) {
    s <- gsub("\\\\", "\\\\\\\\", s)
    s <- gsub("\"", "\\\\\"", s)
    s <- gsub("\r", "\\\\r", s)
    s <- gsub("\n", "\\\\n", s)
    s <- gsub("\t", "\\\\t", s)
    s
  }
"""

R_LIST_VARS = (
    r"""
local({
"""
    + _R_ESCAPE
    + r"""
  nms <- sort(ls(envir = globalenv()))
  parts <- character(0)
  for (n in nms) {
    if (substr(n, 1, 1) == ".") next
    v <- tryCatch(get(n, envir = globalenv()), error = function(e) NULL)
    if (is.function(v) || is.environment(v) || is.null(v)) next
    r <- tryCatch(paste(utils::head(deparse(v), 3), collapse = " "),
                  error = function(e) "<unprintable>")
    parts <- c(parts, sprintf(
      "{\"name\":\"%s\",\"type\":\"%s\",\"module\":\"\",\"repr\":\"%s\",\"value\":\"%s\"}",
      esc(n), esc(class(v)[1]), esc(substr(r, 1, 300)), esc(substr(r, 1, 300))))
  }
  cat("{\"vars\":[", paste(parts, collapse = ","), "]}")
})
"""
)

R_INSPECT_OBJECT = (
    r"""
local({
"""
    + _R_ESCAPE
    + r"""
  n <- __DSH_NAME__
  head_out <- c("{\"name\":\"", esc(n), "\",\"found\":false")
  if (exists(n, envir = globalenv(), inherits = FALSE)) {
    v <- get(n, envir = globalenv())
    r <- tryCatch(paste(utils::head(deparse(v), 20), collapse = "\n"),
                  error = function(e) "<unprintable>")
    head_out <- c("{\"name\":\"", esc(n), "\",\"found\":true,\"type\":\"",
                  esc(class(v)[1]), "\",\"module\":\"",
                  esc(paste(class(v), collapse = ", ")),
                  "\",\"repr\":\"", esc(substr(r, 1, 1000)), "\"")
    if (is.data.frame(v)) {
      cols <- vapply(names(v), function(cn) sprintf("\"%s\":\"%s\"",
        esc(cn), esc(class(v[[cn]])[1])), character(1))
      head_out <- c(head_out, ",\"rows\":", nrow(v), ",\"cols\":", ncol(v),
                    ",\"columns\":{", paste(cols, collapse = ","), "}")
    } else if (!is.null(dim(v)) && length(dim(v)) > 1) {
      head_out <- c(head_out, ",\"shape\":[", paste(dim(v), collapse = ","), "]")
    } else if (is.atomic(v)) {
      head_out <- c(head_out, ",\"length\":", length(v))
    }
  }
  cat(paste(c(head_out, "}"), collapse = ""))
})
"""
)


class KernelDriver:
    def __init__(self):
        self.km = None
        self.kc = None
        self.interpreter = None
        self._exec_count = 0
        # "python" or "r" - decided from the kernel's own language_info, and
        # used to pick the introspection snippets that make sense.
        self.language = "python"
        self.kernel_name = None
        self.kernel_info = {}

    def _install_kernel_spec(self, argv, display_name, language):
        """Write a throwaway kernelspec and expose it through JUPYTER_PATH.

        An R kernel is not a Python kernelspec that happens to point at R: the
        argv has to be built from the real R binary (a conda kernelspec often
        just says "R", which only resolves while that env is activated), and
        some R installs ship no kernelspec at all. Generating one in the temp
        directory keeps the user's ~/.local/share/jupyter untouched and needs
        no `jupyter kernelspec install`.
        """
        name = "dsh-" + hashlib.sha1(
            json.dumps([argv, language], ensure_ascii=False).encode("utf-8")
        ).hexdigest()[:10]
        root = os.path.join(tempfile.gettempdir(), "dsh-notebook-jupyter")
        spec_dir = os.path.join(root, "kernels", name)
        os.makedirs(spec_dir, exist_ok=True)
        with open(os.path.join(spec_dir, "kernel.json"), "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "argv": list(argv),
                    "display_name": display_name or name,
                    "language": language or "python",
                },
                handle,
                ensure_ascii=False,
            )
        parts = [root]
        for entry in (os.environ.get("JUPYTER_PATH") or "").split(os.pathsep):
            if entry and entry not in parts:
                parts.append(entry)
        os.environ["JUPYTER_PATH"] = os.pathsep.join(parts)
        return name

    def start(self, interpreter=None, cwd=None, kernel_name=None, kernel_argv=None,
              kernel_display=None, kernel_language=None, kernel_env=None):
        from jupyter_client import KernelManager

        self.interpreter = interpreter or sys.executable
        if kernel_env:
            for key, value in kernel_env.items():
                if value is not None:
                    os.environ[str(key)] = str(value)
        if cwd:
            try:
                os.chdir(cwd)
            except Exception:
                pass
        start_kwargs = {}
        if cwd:
            start_kwargs["cwd"] = cwd
        if kernel_argv:
            kernel_name = self._install_kernel_spec(
                kernel_argv, kernel_display, kernel_language or "python"
            )
        self.kernel_name = kernel_name
        if kernel_name:
            # An explicit kernel (R, or a named kernelspec) must never fall back
            # to python3 - that would silently run the user's R in a Python
            # kernel and produce nonsense results instead of an error.
            self.km = KernelManager(kernel_name=kernel_name)
            self.km.start_kernel(**start_kwargs)
        else:
            self.km = KernelManager()
            try:
                self.km.start_kernel(**start_kwargs)
            except Exception:
                self.km = KernelManager(kernel_name="python3")
                self.km.start_kernel(**start_kwargs)
        self.kc = self.km.client()
        self.kc.start_channels()
        try:
            self.kc.wait_for_ready(timeout=60)
        except Exception:
            pass
        self.kernel_info = {}
        try:
            reply = self.kc.kernel_info(reply=True, timeout=20)
            self.kernel_info = reply.get("content") or {}
        except Exception:
            pass
        detected = ((self.kernel_info.get("language_info") or {}).get("name") or "").lower()
        self.language = detected or (kernel_language or "python").lower()
        return {
            "alive": True,
            "interpreter": self.interpreter,
            "cwd": os.getcwd(),
            "language": self.language,
            "kernel_name": kernel_name,
            "kernel_info": {
                "language": self.language,
                "implementation": (self.kernel_info.get("implementation") or ""),
                "version": ((self.kernel_info.get("language_info") or {}).get("version") or ""),
            },
        }

    def _progress_outputs(self, outputs):
        """Compact transient progress payloads; final execute result still returns full outputs."""
        compact = []
        for out in list(outputs)[-3:]:
            if out.get("type") == "stream":
                item = dict(out)
                text = item.get("text") or ""
                if len(text) > 12000:
                    item["text"] = "...[output truncated during live progress]...\n" + text[-12000:]
                compact.append(item)
            else:
                compact.append(out)
        return compact

    def _progress(self, req_id, outputs, status="running"):
        if not req_id:
            return
        _send({
            "id": req_id,
            "event": "progress",
            "status": status,
            "outputs": self._progress_outputs(outputs),
        })

    def _execute(self, code, timeout=120, req_id=None, store_history=True):
        """Execute code and collect all outputs until idle."""
        import time

        msg_id = self.kc.execute(code, reply=False, store_history=store_history)
        outputs = []
        error = None
        status = "ok"
        execution_count = None
        truncated = False
        deadline = time.time() + timeout
        last_progress = 0.0

        def emit_progress(force=False):
            nonlocal last_progress
            now = time.time()
            if not force and (now - last_progress) < 0.30:
                return
            last_progress = now
            self._progress(req_id, outputs, "running")

        while True:
            remaining = deadline - time.time()
            if remaining <= 0:
                status = "timeout"
                error = {
                    "ename": "TimeoutError",
                    "evalue": "execution exceeded %ss" % timeout,
                    "traceback": [],
                }
                break
            try:
                msg = self.kc.iopub_channel.get_msg(timeout=min(remaining, 0.25))
            except Exception:
                continue

            parent = (msg.get("parent_header") or {}).get("msg_id")
            if parent and parent != msg_id:
                continue

            msg_type = msg["header"]["msg_type"]
            content = msg["content"]

            if msg_type == "stream":
                text = content.get("text", "")
                name = content.get("name", "stdout")
                if (
                    outputs
                    and outputs[-1].get("type") == "stream"
                    and outputs[-1].get("name") == name
                ):
                    merged = (outputs[-1].get("text") or "") + text
                    if len(merged) > MAX_STREAM_CHARS:
                        dropped = len(merged) - MAX_STREAM_CHARS
                        merged = "...[%d chars truncated]...\n" % dropped + merged[-MAX_STREAM_CHARS:]
                        truncated = True
                        outputs[-1]["truncated"] = True
                    outputs[-1]["text"] = merged
                else:
                    outputs.append({"type": "stream", "name": name, "text": text})
                emit_progress()
            elif msg_type == "display_data":
                outputs.append({
                    "type": "display_data",
                    "data": self._serialize_data(content.get("data", {})),
                    "metadata": content.get("metadata", {}),
                })
                emit_progress(True)
            elif msg_type == "execute_result":
                execution_count = content.get("execution_count", execution_count)
                outputs.append({
                    "type": "execute_result",
                    "data": self._serialize_data(content.get("data", {})),
                    "execution_count": execution_count,
                })
                emit_progress(True)
            elif msg_type == "error":
                status = "error"
                error = {
                    "ename": content.get("ename", "Error"),
                    "evalue": content.get("evalue", ""),
                    "traceback": content.get("traceback", []),
                }
                outputs.append({"type": "error", "error": error})
                emit_progress(True)
            elif msg_type == "clear_output":
                wait = bool(content.get("wait"))
                if not wait:
                    outputs = []
                    emit_progress(True)
            elif msg_type == "status":
                if content.get("execution_state") == "idle":
                    break

        try:
            reply = self._shell_reply(msg_id, "execute_reply", timeout=2)
            execution_count = reply.get("execution_count", execution_count)
            rep_status = reply.get("status", status)
            if rep_status == "error" and status == "ok":
                status = "error"
                if not error:
                    error = {
                        "ename": reply.get("ename", "Error"),
                        "evalue": reply.get("evalue", ""),
                        "traceback": reply.get("traceback", []),
                    }
                    outputs.append({"type": "error", "error": error})
            elif rep_status == "abort":
                status = "error"
                if not error:
                    error = {
                        "ename": "AbortError",
                        "evalue": "execution aborted",
                        "traceback": [],
                    }
        except Exception:
            pass

        if execution_count is not None:
            self._exec_count = execution_count
        elif status != "timeout":
            self._exec_count += 1
            execution_count = self._exec_count

        stdout_parts = []
        stderr_parts = []
        for out in outputs:
            if out.get("type") == "stream":
                if out.get("name") == "stderr":
                    stderr_parts.append(out.get("text") or "")
                else:
                    stdout_parts.append(out.get("text") or "")

        try:
            kernel_alive = bool(self.kc and self.kc.is_alive())
        except Exception:
            kernel_alive = True
        if not kernel_alive:
            kernel_state = "dead"
        elif status == "error":
            kernel_state = "error"
        elif status == "timeout":
            # Kernel may still be executing the abandoned request.
            kernel_state = "busy"
        else:
            kernel_state = "idle"

        return {
            "status": status,
            "outputs": outputs,
            "error": error,
            "execution_count": execution_count,
            "stdout": "".join(stdout_parts),
            "stderr": "".join(stderr_parts),
            "truncated": truncated,
            "kernel_state": kernel_state,
        }

    def _serialize_data(self, data):
        """Convert MIME-bundle into JSON-safe structures."""
        result = {}
        for mime, value in data.items():
            if mime in ("image/png", "image/jpeg", "image/gif", "image/webp"):
                result[mime] = value
            elif mime in ("image/svg+xml", "text/plain", "text/html"):
                result[mime] = value if isinstance(value, str) else str(value)
            elif mime == "application/json":
                result[mime] = value
            else:
                try:
                    json.dumps(value)
                    result[mime] = value
                except (TypeError, ValueError):
                    result[mime] = str(value)
        return result

    def execute(self, code, timeout=120, req_id=None):
        if not self.kc:
            raise RuntimeError("kernel not started")
        return self._execute(code, timeout, req_id=req_id)

    def _shell_reply(self, msg_id, reply_type, timeout=5):
        """Wait for a shell-channel reply matching msg_id."""
        import time

        deadline = time.time() + timeout
        while True:
            remaining = deadline - time.time()
            if remaining <= 0:
                raise TimeoutError("no %s within %ss" % (reply_type, timeout))
            try:
                reply = self.kc.get_shell_msg(timeout=min(remaining, 1))
            except Exception:
                continue
            parent = (reply.get("parent_header") or {}).get("msg_id")
            if parent and parent != msg_id:
                continue
            if reply["header"]["msg_type"] == reply_type:
                return reply["content"]

    def complete(self, code, cursor_pos=None, timeout=5):
        if not self.kc:
            raise RuntimeError("kernel not started")
        if cursor_pos is None:
            cursor_pos = len(code or "")
        cursor_pos = max(0, min(int(cursor_pos), len(code or "")))
        msg_id = self.kc.complete(code=code or "", cursor_pos=cursor_pos, reply=False)
        content = self._shell_reply(msg_id, "complete_reply", timeout=timeout)
        matches = content.get("matches") or []
        meta = content.get("metadata") or {}
        types = meta.get("_jupyter_types_experimental") or []
        items = []
        type_by_text = {}
        for row in types:
            if isinstance(row, dict) and row.get("text"):
                type_by_text[row["text"]] = row
        for m in matches:
            info = type_by_text.get(m) or {}
            items.append({
                "text": m,
                "type": info.get("type") or "value",
                "signature": info.get("signature") or "",
            })
        return {
            "matches": matches,
            "items": items,
            "cursor_start": content.get("cursor_start", cursor_pos),
            "cursor_end": content.get("cursor_end", cursor_pos),
            "status": content.get("status", "ok"),
        }

    def inspect(self, code, cursor_pos=None, detail_level=0, timeout=5):
        if not self.kc:
            raise RuntimeError("kernel not started")
        if cursor_pos is None:
            cursor_pos = len(code or "")
        cursor_pos = max(0, min(int(cursor_pos), len(code or "")))
        msg_id = self.kc.inspect(
            code=code or "",
            cursor_pos=cursor_pos,
            detail_level=int(detail_level or 0),
            reply=False,
        )
        content = self._shell_reply(msg_id, "inspect_reply", timeout=timeout)
        data = self._serialize_data(content.get("data") or {})
        return {
            "found": bool(content.get("found")),
            "data": data,
            "status": content.get("status", "ok"),
        }

    def interrupt(self):
        if self.km:
            self.km.interrupt_kernel()
            return {"ok": True}
        return {"ok": False, "error": "kernel not started"}

    def restart(self):
        if self.km:
            self.km.restart_kernel()
            self._exec_count = 0
            return {"ok": True}
        return {"ok": False, "error": "kernel not started"}

    def stop(self):
        try:
            if self.kc:
                self.kc.stop_channels()
            if self.km:
                self.km.shutdown_kernel(now=True)
        except Exception:
            pass
        return {"ok": True}

    def get_state(self):
        if not self.kc:
            return {"alive": False}
        return {
            "alive": True,
            "language": self.language,
            "kernel_name": self.kernel_name,
            "kernel_info": {
                "interpreter": self.interpreter or sys.executable,
                "language": self.language,
                "implementation": (self.kernel_info.get("implementation") or ""),
                "version": ((self.kernel_info.get("language_info") or {}).get("version") or ""),
            },
        }

    def _json_probe(self, code, timeout=10):
        """Execute a short probe in the kernel and parse the last JSON stdout line."""
        result = self._execute(code, timeout=timeout, store_history=False)
        text = ""
        for out in result.get("outputs", []):
            if out.get("type") == "stream" and out.get("name") == "stdout":
                text += out.get("text", "")
        for line in reversed(text.splitlines()):
            line = line.strip()
            if not line:
                continue
            try:
                return json.loads(line)
            except Exception:
                continue
        return {}

    def list_vars(self):
        """List variables in the kernel namespace without dumping large values."""
        if not self.kc:
            return {"vars": []}
        if self.language.startswith("r"):
            return self._json_probe(R_LIST_VARS, timeout=25) or {"vars": []}
        return self._json_probe(
            r'''
import json as _dnb_json, types as _dnb_types
_dnb_skip_types = (
    _dnb_types.ModuleType,
    _dnb_types.FunctionType,
    _dnb_types.BuiltinFunctionType,
    _dnb_types.MethodType,
    type,
)
_dnb_vars = []
for _dnb_n, _dnb_v in sorted(list(globals().items()), key=lambda kv: kv[0]):
    if _dnb_n.startswith('_') or _dnb_n in {'In', 'Out', 'exit', 'quit'}:
        continue
    try:
        if isinstance(_dnb_v, _dnb_skip_types):
            continue
        _dnb_t = type(_dnb_v)
        _dnb_r = repr(_dnb_v)
        _dnb_vars.append({
            'name': _dnb_n,
            'type': _dnb_t.__name__,
            'module': getattr(_dnb_t, '__module__', ''),
            'repr': _dnb_r[:300],
            'value': _dnb_r[:300],
        })
    except Exception as _dnb_e:
        _dnb_vars.append({'name': _dnb_n, 'type': 'unknown', 'module': '', 'repr': '<unrepresentable: %s>' % _dnb_e})
print(_dnb_json.dumps({'vars': _dnb_vars}, ensure_ascii=False, allow_nan=False, default=str))
''',
            timeout=10,
        ) or {"vars": []}

    def inspect_object(self, name):
        """Return a structured summary for one live kernel variable."""
        if not self.kc:
            return {"found": False, "error": "kernel not started"}
        name = str(name or "").strip()
        if not name:
            return {"found": False, "error": "name required"}
        if self.language.startswith("r"):
            return self._json_probe(
                R_INSPECT_OBJECT.replace("__DSH_NAME__", json.dumps(name, ensure_ascii=False)),
                timeout=25,
            ) or {"name": name, "found": False, "error": "no JSON result"}
        return self._json_probe(
            """
import json as _dnb_json, inspect as _dnb_inspect
_dnb_name = %r
_dnb_out = {'name': _dnb_name, 'found': False}
try:
    _dnb_obj = globals()[_dnb_name]
    _dnb_t = type(_dnb_obj)
    _dnb_out.update({
        'found': True,
        'type': _dnb_t.__name__,
        'module': getattr(_dnb_t, '__module__', ''),
        'repr': repr(_dnb_obj)[:1000],
    })
    try:
        _dnb_doc = _dnb_inspect.getdoc(_dnb_obj) or ''
        _dnb_out['doc'] = _dnb_doc[:2000]
    except Exception:
        _dnb_out['doc'] = ''
    try:
        import pandas as _dnb_pd
        if isinstance(_dnb_obj, _dnb_pd.DataFrame):
            _dnb_df = _dnb_obj
            _dnb_cols = [str(c) for c in list(_dnb_df.columns)[:50]]
            _dnb_dtype = {str(c): str(_dnb_df[c].dtype) for c in list(_dnb_df.columns)[:50]}
            _dnb_missing = {str(c): int(_dnb_df[c].isna().sum()) for c in list(_dnb_df.columns)[:50]}
            _dnb_head = _dnb_df.head(5).copy()
            _dnb_head.columns = [str(c) for c in _dnb_head.columns]
            try:
                _dnb_head = _dnb_head.astype(object).where(_dnb_head.notna(), None)
            except Exception:
                pass
            _dnb_num = {}
            try:
                _dnb_desc = _dnb_df.select_dtypes(include='number').iloc[:, :20].describe().transpose()
                for _dnb_idx, _dnb_row in _dnb_desc.iterrows():
                    _dnb_num[str(_dnb_idx)] = {str(k): (None if _dnb_pd.isna(v) else float(v)) for k, v in _dnb_row.to_dict().items()}
            except Exception as _dnb_e:
                _dnb_num = {'error': str(_dnb_e)}
            _dnb_cat = {}
            try:
                for _dnb_c in list(_dnb_df.select_dtypes(exclude='number').columns)[:20]:
                    _dnb_vc = _dnb_df[_dnb_c].astype('string').value_counts(dropna=False).head(10)
                    _dnb_cat[str(_dnb_c)] = {
                        'n_unique': int(_dnb_df[_dnb_c].nunique(dropna=True)),
                        'top_values': {str(k): int(v) for k, v in _dnb_vc.items()},
                    }
            except Exception as _dnb_e:
                _dnb_cat = {'error': str(_dnb_e)}
            _dnb_out['dataframe'] = {
                'kind': 'pandas.DataFrame',
                'shape': [int(_dnb_df.shape[0]), int(_dnb_df.shape[1])],
                'columns': _dnb_cols,
                'truncated_columns': int(max(0, _dnb_df.shape[1] - len(_dnb_cols))),
                'dtypes': _dnb_dtype,
                'index': {
                    'type': type(_dnb_df.index).__name__,
                    'name': None if _dnb_df.index.name is None else str(_dnb_df.index.name),
                    'is_unique': bool(_dnb_df.index.is_unique),
                },
                'memory_usage_bytes': int(_dnb_df.memory_usage(index=True, deep=True).sum()),
                'missing': _dnb_missing,
                'head': _dnb_head.to_dict(orient='records'),
                'numeric_summary': _dnb_num,
                'categorical_summary': _dnb_cat,
            }
    except Exception as _dnb_e:
        _dnb_out['introspection_error'] = str(_dnb_e)
except KeyError:
    _dnb_out['error'] = 'variable not found'
except Exception as _dnb_e:
    _dnb_out['error'] = str(_dnb_e)
print(_dnb_json.dumps(_dnb_out, ensure_ascii=False, allow_nan=False, default=str))
""" % name,
            timeout=15,
        ) or {"name": name, "found": False, "error": "no JSON result"}

    def load_ipynb(self, path):
        with open(path, "r", encoding="utf-8") as handle:
            nb = json.load(handle)
        if not isinstance(nb, dict):
            raise ValueError("not a notebook document: %s" % path)
        try:
            version = int(nb.get("nbformat") or 4)
        except (TypeError, ValueError):
            version = 4
        if version < 4:
            nb = _upgrade_v3(nb)
        elif "cells" not in nb and "worksheets" in nb:
            # Version tag lies but the payload is v3-shaped; upgrade anyway
            # rather than reporting an empty notebook.
            nb = _upgrade_v3(nb)
        if "cells" not in nb:
            raise ValueError(
                "not a notebook: %s has neither 'cells' nor 'worksheets'" % path
            )
        cells = []
        for cell in nb.get("cells") or []:
            cell_type = cell.get("cell_type") or "code"
            entry = {
                "id": cell.get("id") or _new_cell_id(),
                "cell_type": cell_type,
                "source": _join_lines(cell.get("source", "")),
                "outputs": [],
                "metadata": dict(cell.get("metadata") or {}),
                "execution_count": cell.get("execution_count"),
            }
            if cell_type == "code":
                for out in cell.get("outputs") or []:
                    entry["outputs"].append(self._nb_output_to_dict(out))
            extra = _extras(cell, CELL_KEYS)
            if extra:
                entry["extras"] = extra
            cells.append(entry)
        metadata = dict(nb.get("metadata") or {})
        try:
            minor = int(nb.get("nbformat_minor", IPYNB_FORMAT_MINOR))
        except (TypeError, ValueError):
            minor = IPYNB_FORMAT_MINOR
        if minor < IPYNB_FORMAT_MINOR:
            # Same upgrade nbformat.read(as_version=4) performs: a 4.0-4.4
            # notebook gains stable cell ids and is reported as 4.5.
            metadata.setdefault("orig_nbformat_minor", minor)
            minor = IPYNB_FORMAT_MINOR
        return {
            "cells": cells,
            "metadata": metadata,
            "nbformat": IPYNB_FORMAT_VERSION,
            "nbformat_minor": minor,
        }

    def _nb_output_to_dict(self, out):
        """Project a file output onto the host's output shape, keeping the rest."""
        otype = out.get("output_type") or "display_data"
        result = {"type": otype}
        if otype == "stream":
            result["name"] = out.get("name", "stdout")
            result["text"] = _join_lines(out.get("text", ""))
            if out.get("metadata"):
                result["metadata"] = out["metadata"]
        elif otype in ("display_data", "execute_result", "update_display_data"):
            result["data"] = _join_data(out.get("data") or {})
            if "metadata" in out:
                result["metadata"] = out["metadata"]
            if otype == "execute_result":
                result["execution_count"] = out.get("execution_count")
        elif otype == "error":
            result["error"] = {
                "ename": out.get("ename", ""),
                "evalue": out.get("evalue", ""),
                "traceback": [_join_lines(line) for line in out.get("traceback") or []],
            }
        extra = _extras(out, OUTPUT_KEYS)
        if extra:
            result["extras"] = extra
        return result

    def save_ipynb(self, path, cells, metadata=None):
        nb = {
            "cells": [],
            "metadata": dict(metadata or {}),
            "nbformat": IPYNB_FORMAT_VERSION,
            "nbformat_minor": IPYNB_FORMAT_MINOR,
        }
        seen_ids = set()
        for c in cells:
            cell_type = c.get("cell_type") or "code"
            # Start from whatever this cell carried that we do not model
            # (markdown attachments, vendor extensions) so saving never strips it.
            cell = dict(c.get("extras") or {})
            cell["cell_type"] = cell_type
            cell["metadata"] = dict(c.get("metadata") or {})
            cell["source"] = _split_lines(c.get("source", ""))
            cell_id = c.get("id")
            if not isinstance(cell_id, str) or not cell_id or cell_id in seen_ids:
                cell_id = _new_cell_id()
                while cell_id in seen_ids:
                    cell_id = _new_cell_id()
            seen_ids.add(cell_id)
            cell["id"] = cell_id
            if cell_type == "code":
                cell["outputs"] = [self._dict_to_nb_output(o) for o in (c.get("outputs") or [])]
                cell["execution_count"] = c.get("execution_count")
            else:
                cell.pop("outputs", None)
                cell.pop("execution_count", None)
            nb["cells"].append(cell)
        text = json.dumps(nb, indent=1, sort_keys=True, separators=(",", ": "), ensure_ascii=False) + "\n"
        # Write through a sibling temp file so a crash mid-write cannot truncate
        # an existing notebook. os.replace is atomic on the same volume.
        # No explicit newline: nbformat lets the platform translate "\n", so
        # matching that keeps our files byte-identical to what Jupyter writes.
        tmp = path + ".dsh-tmp"
        with open(tmp, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(tmp, path)
        return {"ok": True, "path": path}

    def _dict_to_nb_output(self, d):
        """Build a file output from the host's output shape."""
        kind = d.get("type") or d.get("output_type") or "display_data"
        base = dict(d.get("extras") or {})
        if kind == "stream":
            base["output_type"] = "stream"
            base["name"] = d.get("name", "stdout")
            base["text"] = _split_lines(d.get("text", ""))
            if "metadata" in d:
                base["metadata"] = d["metadata"]
        elif kind in ("display_data", "execute_result", "update_display_data"):
            if kind == "update_display_data":
                # Wire-protocol only: a saved notebook may hold stream /
                # display_data / execute_result / error, so an update collapses
                # into the display_data it was patching.
                kind = "display_data"
            base["output_type"] = kind
            base["data"] = _split_data(d.get("data") or {})
            base["metadata"] = d.get("metadata") or {}
            if kind == "execute_result":
                base["execution_count"] = d.get("execution_count")
        elif kind == "error":
            err = d.get("error") or {}
            base["output_type"] = "error"
            base["ename"] = err.get("ename", "")
            base["evalue"] = err.get("evalue", "")
            base["traceback"] = [_join_lines(line) for line in err.get("traceback") or []]
        else:
            base["output_type"] = "display_data"
            base["data"] = _split_data(d.get("data") or {"text/plain": str(d)})
            base["metadata"] = d.get("metadata") or {}
        return base


def _handle(driver, req):
    req_id = req.get("id")
    cmd = req.get("cmd", "")
    try:
        if cmd == "start":
            res = driver.start(
                interpreter=req.get("interpreter"),
                cwd=req.get("cwd"),
                kernel_name=req.get("kernel_name"),
                kernel_argv=req.get("kernel_argv"),
                kernel_display=req.get("kernel_display"),
                kernel_language=req.get("kernel_language"),
                kernel_env=req.get("kernel_env"),
            )
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "execute":
            res = driver.execute(req.get("code", ""), req.get("timeout", 120), req_id=req_id)
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "complete":
            res = driver.complete(
                req.get("code", ""),
                req.get("cursor_pos"),
                req.get("timeout", 5),
            )
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "inspect":
            res = driver.inspect(
                req.get("code", ""),
                req.get("cursor_pos"),
                req.get("detail_level", 0),
                req.get("timeout", 5),
            )
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "interrupt":
            res = driver.interrupt()
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "restart":
            res = driver.restart()
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "stop":
            res = driver.stop()
            _send({"id": req_id, "ok": True, **res})
            return "stop"
        elif cmd == "ping":
            _send({"id": req_id, "ok": True, "alive": driver.kc is not None})
        elif cmd == "get_state":
            res = driver.get_state()
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "list_vars":
            res = driver.list_vars()
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "inspect_object":
            res = driver.inspect_object(req.get("name", ""))
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "load_ipynb":
            res = driver.load_ipynb(req["path"])
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "save_ipynb":
            res = driver.save_ipynb(
                req["path"], req.get("cells", []), req.get("metadata")
            )
            _send({"id": req_id, "ok": True, **res})
        else:
            _send({"id": req_id, "ok": False, "error": "unknown command: %s" % cmd})
    except Exception as e:
        _log("ERROR in cmd=%s: %s\n%s" % (cmd, e, traceback.format_exc()))
        _send({
            "id": req_id,
            "ok": False,
            "error": str(e),
            "traceback": traceback.format_exc().splitlines()[-5:],
        })
    return None


def _parent_alive(pid):
    """Check if process `pid` is alive WITHOUT sending any signal.

    Critical: on Windows, os.kill(pid, 0) does NOT just check existence -
    it calls TerminateProcess and KILLS the target.  We use the Win32 API
    OpenProcess to query instead.  On POSIX, os.kill(pid, 0) is a safe
    no-op that only checks existence.
    """
    if sys.platform == "win32":
        import ctypes
        kernel32 = ctypes.windll.kernel32
        SYNCHRONIZE = 0x00100000
        ERROR_ACCESS_DENIED = 5
        handle = kernel32.OpenProcess(SYNCHRONIZE, False, int(pid))
        if not handle:
            # ERROR_ACCESS_DENIED means the process exists but we lack
            # access - treat as alive to avoid false-positive cleanup.
            return kernel32.GetLastError() == ERROR_ACCESS_DENIED
        kernel32.CloseHandle(handle)
        return True
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _start_parent_watchdog(driver, interval=2.0):
    """Exit this sidecar if the parent process (dsh web) dies.

    Without this, force-killing dsh web leaves python.exe / ipykernel
    orphans that keep consuming memory. Cross-platform detection:
      - Linux/macOS: a dead parent reparents us to PID 1 (init/launchd),
        so os.getppid() changes.
      - Windows: no reparent; os.getppid() keeps the stale value, so we
        query the pid via OpenProcess (NOT os.kill, which kills on Windows).
    """
    parent = os.getppid()
    def watch():
        while True:
            time.sleep(interval)
            if os.getppid() != parent:
                break
            if not _parent_alive(parent):
                break
        try:
            driver.stop()
        except Exception:
            pass
        os._exit(0)
    t = threading.Thread(target=watch, name="dnb-parent-watchdog", daemon=True)
    t.start()
    return t


def run():
    driver = KernelDriver()
    work = Queue()
    _send({"id": "_ready", "ok": True, "msg": "kernel_driver started, awaiting commands"})

    def stdin_loop():
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
            except json.JSONDecodeError as e:
                _send({"id": None, "ok": False, "error": "invalid JSON: %s" % e})
                continue
            cmd = req.get("cmd", "")
            # Interrupt/restart/stop must not wait for a blocking execute.
            if cmd in ("interrupt", "restart", "stop"):
                if _handle(driver, req) == "stop":
                    work.put(None)
                    return
                continue
            work.put(req)
        work.put(None)

    reader = threading.Thread(target=stdin_loop, name="dnb-stdin", daemon=True)
    reader.start()
    _start_parent_watchdog(driver)
    while True:
        req = work.get()
        if req is None:
            break
        if _handle(driver, req) == "stop":
            break

    try:
        driver.stop()
    except Exception:
        pass


if __name__ == "__main__":
    run()
