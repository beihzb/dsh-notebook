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
import signal
import subprocess
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


# --- safe, bounded per-language introspection probes -----------------------
# Fixed snippets only: names and options are inserted as JSON literals and
# never parsed as expressions. Base R has no supported non-forcing promise test;
# the R adapter reads values only when rlang is already loaded and confirms
# the binding is not lazy. It never loads a package.
PROBE_DEFAULT_MAX_CHARS = 16000
PROBE_MIN_MAX_CHARS = 1024
PROBE_MAX_MAX_CHARS = 64000
PROBE_DEFAULT_LIST_LIMIT = 100
PROBE_MAX_LIST_LIMIT = 200
PROBE_DEFAULT_ROWS = 5
PROBE_MAX_ROWS = 20
PROBE_DEFAULT_COLUMNS = 10
PROBE_MAX_COLUMNS = 50

R_LIST_VARS = r'''local({
  esc <- function(s) {
    s <- enc2utf8(as.character(s)[1]); ch <- utf8ToInt(s)
    if (!length(ch)) return('""')
    parts <- vapply(ch, function(x) {
      if (x == 34L) return('\\"')
      if (x == 92L) return('\\\\')
      if (x < 32L) return(sprintf('\\u%04x', x))
      intToUtf8(x)
    }, character(1), USE.NAMES=FALSE)
    paste0('"', paste0(parts, collapse=''), '"')
  }
  lazy_fn <- NULL
  if ('rlang' %in% loadedNamespaces()) {
    ns <- tryCatch(getNamespace('rlang'), error=function(e) NULL)
    if (!is.null(ns) && exists('env_binding_are_lazy', ns, inherits=FALSE))
      lazy_fn <- get('env_binding_are_lazy', ns, inherits=FALSE)
  }
  state <- function(n) {
    if (bindingIsActive(n, .GlobalEnv)) return('active')
    if (is.null(lazy_fn)) return('uninspected')
    if (tryCatch(isTRUE(lazy_fn(.GlobalEnv, n)), error=function(e) TRUE)) 'promise' else 'value'
  }
  pattern <- __PATTERN__; offset <- __OFFSET__; limit <- __LIMIT__
  nms <- sort(ls(envir=.GlobalEnv, all.names=TRUE))
  nms <- nms[!startsWith(nms, '.')]
  if (nzchar(pattern)) nms <- nms[vapply(nms, grepl, logical(1), pattern=pattern, ignore.case=TRUE, fixed=TRUE)]
  total <- length(nms); chosen <- if (offset < total) nms[seq.int(offset+1L, min(total, offset+limit))] else character(0)
  entries <- character(0)
  for (n in chosen) {
    s <- state(n); typ <- if (s == 'active') 'active_binding' else if (s == 'promise') 'promise' else 'unknown'
    if (s == 'value') {
      v <- tryCatch(get(n, .GlobalEnv, inherits=FALSE), error=function(e) NULL)
      cls <- if (is.null(v)) NULL else attr(v, 'class', exact=TRUE)
      dims <- if (is.null(v)) NULL else attr(v, 'dim', exact=TRUE)
      if (is.null(v)) typ <- 'NULL'
      else if (identical(cls, 'data.frame')) typ <- 'data.frame'
      else if (identical(cls, c('tbl_df','tbl','data.frame'))) typ <- 'tibble'
      else if (!is.null(dims) && length(dims)==2L && is.null(cls)) typ <- 'matrix'
      else if (typeof(v) %in% c('logical','integer','double','character','complex','raw','list','closure','environment','builtin','special')) typ <- typeof(v)
    }
    entries <- c(entries, paste0('{"name":', esc(substr(n,1L,256L)), ',"type":', esc(typ), ',"module":"","binding":', esc(s), '}'))
  }
  nxt <- if (offset + length(chosen) < total) as.character(offset+length(chosen)) else 'null'
  cat(paste0('{"vars":[', paste(entries,collapse=','), '],"total":',total,',"offset":',offset,
    ',"next_offset":',nxt,',"truncated":',if (nxt=='null') 'false' else 'true','}'))
})'''

R_INSPECT_OBJECT = r'''local({
  esc <- function(s) {
    s <- enc2utf8(as.character(s)[1]); ch <- utf8ToInt(s)
    if (!length(ch)) return('""')
    parts <- vapply(ch, function(x) {
      if (x == 34L) return('\\"')
      if (x == 92L) return('\\\\')
      if (x < 32L) return(sprintf('\\u%04x', x))
      intToUtf8(x)
    }, character(1), USE.NAMES=FALSE)
    paste0('"', paste0(parts, collapse=''), '"')
  }
  scalar <- function(x) {
    if (length(x)!=1L) return('null')
    if (typeof(x)=='character') return(esc(substr(x,1L,128L)))
    if (typeof(x)=='logical') return(if (is.na(x)) 'null' else if (x) 'true' else 'false')
    if (typeof(x) %in% c('integer','double')) return(if (is.na(x) || !is.finite(as.double(x))) 'null' else as.character(x))
    'null'
  }
  lazy_fn <- NULL
  if ('rlang' %in% loadedNamespaces()) {
    ns <- tryCatch(getNamespace('rlang'), error=function(e) NULL)
    if (!is.null(ns) && exists('env_binding_are_lazy', ns, inherits=FALSE))
      lazy_fn <- get('env_binding_are_lazy', ns, inherits=FALSE)
  }
  n <- __NAME__; want <- __PREVIEW__; max_rows <- __ROWS__; max_cols <- __COLUMNS__
  out <- paste0('{"name":',esc(substr(n,1L,256L)),',"found":false')
  if (exists(n, .GlobalEnv, inherits=FALSE)) {
    out <- paste0('{"name":',esc(substr(n,1L,256L)),',"found":true')
    if (bindingIsActive(n,.GlobalEnv)) out <- paste0(out,',"type":"active_binding","binding":"active","preview_available":false,"preview_reason":"active_binding_skipped"')
    else if (is.null(lazy_fn) || tryCatch(isTRUE(lazy_fn(.GlobalEnv,n)),error=function(e) TRUE))
      out <- paste0(out,',"type":"unknown","binding":"uninspected","preview_available":false,"preview_reason":"safe_binding_probe_unavailable"')
    else {
      v <- tryCatch(get(n,.GlobalEnv,inherits=FALSE),error=function(e) NULL)
      cls <- if (is.null(v)) NULL else attr(v,'class',exact=TRUE)
      dims <- if (is.null(v)) NULL else attr(v,'dim',exact=TRUE)
      typ <- if (is.null(v)) 'NULL' else typeof(v)
      kind <- if (is.null(v)) 'NULL' else if (identical(cls,'data.frame')) 'data.frame' else if (identical(cls,c('tbl_df','tbl','data.frame'))) 'tibble' else if (!is.null(dims) && length(dims)==2L && is.null(cls)) 'matrix' else typ
      out <- paste0(out,',"type":',esc(kind),',"binding":"value"')
      if (kind %in% c('data.frame','tibble')) {
        cn <- attr(v,'names',exact=TRUE); nrn <- attr(v,'row.names',exact=TRUE)
        nr <- if (length(nrn)==2L && nrn[1]<0L) -nrn[1] else length(nrn); nc <- length(cn); take <- min(nc,max_cols)
        shown <- if (take) cn[seq_len(take)] else character(0)
        out <- paste0(out,',"shape":[',nr,',',nc,'],"columns":[',paste(vapply(shown,esc,character(1)),collapse=','),']')
        if (want) {
          cols <- unclass(v); rr <- min(nr,max_rows); row_json <- character(0)
          if (rr>0L && take>0L) for (ri in seq_len(rr)) {
            vals <- character(0)
            for (ci in seq_len(take)) {
              col <- .subset2(cols,ci); cclass <- attr(col,'class',exact=TRUE)
              if (is.atomic(col) && is.null(cclass) && typeof(col) %in% c('logical','integer','double','character') && ri<=length(col)) vals <- c(vals,scalar(unclass(col)[ri])) else vals <- c(vals,'null')
            }
            row_json <- c(row_json,paste0('[',paste(vals,collapse=','),']'))
          }
          out <- paste0(out,',"preview_available":true,"preview":{"columns":[',paste(vapply(shown,esc,character(1)),collapse=','),'],"rows":[',paste(row_json,collapse=','),']},"truncated_columns":',max(0L,nc-take))
        } else out <- paste0(out,',"preview_available":true,"truncated_columns":',max(0L,nc-take))
      } else if (identical(kind,'matrix')) {
        out <- paste0(out,',"shape":[',paste(as.integer(dims),collapse=','),']')
        if (want) {
          nr <- min(dims[1],max_rows); nc <- min(dims[2],max_cols); rr <- character(0)
          if (nr>0L && nc>0L) for (i in seq_len(nr)) rr <- c(rr,paste0('[',paste(vapply(seq_len(nc),function(j) scalar(v[i,j]),character(1)),collapse=','),']'))
          out <- paste0(out,',"preview_available":true,"preview":{"rows":[',paste(rr,collapse=','),']}')
        } else out <- paste0(out,',"preview_available":true')
      } else if (is.null(cls) && is.atomic(v) && typ %in% c('logical','integer','double','character')) {
        out <- paste0(out,',"length":',length(v),',"preview_available":true')
        if (want) { count <- min(length(v),max_rows); vals <- if (count) vapply(seq_len(count),function(i) scalar(unclass(v)[i]),character(1)) else character(0); out <- paste0(out,',"preview":{"values":[',paste(vals,collapse=','),'],"truncated":',if(count<length(v))'true'else'false','}') }
      } else out <- paste0(out,',"preview_available":false')
    }
  }
  cat(paste0(out,'}'))
})'''

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
        self._kernel_busy = False
        self._active_kernel_msg_id = None
        self._external_busy_msg_id = None

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
        self._kernel_busy = True
        self._active_kernel_msg_id = msg_id
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
            if msg_type == "status":
                if content.get("execution_state") == "idle":
                    if parent == msg_id:
                        self._kernel_busy = False
                        self._active_kernel_msg_id = None
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

    def chdir(self, path, timeout=30, req_id=None):
        """Change the live kernel's working directory WITHOUT a restart.

        Sent through the sequential shell channel (store_history=False, so the
        execution counter is untouched), it queues behind any in-flight cell and
        applies when that finishes. Replaces a kill-and-restart cwd sync that
        dropped every variable and interrupted running cells.

        The snippet is language-specific: an R kernel has no `os`.
        """
        if not self.kc:
            return {"ok": True, "note": "kernel not started; cwd applies at next start"}
        target = str(path or "")
        if self.language.startswith("r"):
            code = "invisible(setwd(%s))" % json.dumps(target)
        else:
            code = "__import__('os').chdir(%s)" % json.dumps(target)
        result = self._execute(code, timeout=timeout, req_id=req_id, store_history=False)
        return {"ok": result.get("status") == "ok", "status": result.get("status"), "cwd": target}

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

    def _kernel_pid(self):
        """The pid jupyter_client started, when it is still known."""
        try:
            process = getattr(self.km, "provisioner", None)
            process = getattr(process, "process", None)
            return int(getattr(process, "pid", 0)) or None
        except Exception:
            return None

    def _kill_kernel_tree(self, pid):
        """Kill the kernel AND the processes it launched.

        A conda R kernelspec runs ``R.exe``, which immediately launches
        ``Rterm.exe`` - the process that actually computes.  ``shutdown_kernel``
        only signals the pid it spawned, so on Windows the Rterm child survives
        as an orphan holding the connection file and its memory.  Python kernels
        have no such child, which is why this never showed up before.

        Must be called while the launcher is still alive: ``taskkill /T`` walks
        the parent's children, so once R.exe is gone its child is unreachable.
        """
        if not pid:
            return
        try:
            if sys.platform == "win32":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    capture_output=True, timeout=15,
                )
            else:
                pgid = os.getpgid(pid)
                if pgid != os.getpgid(0):
                    os.killpg(pgid, signal.SIGKILL)
                else:
                    os.kill(pid, signal.SIGKILL)
        except Exception:
            pass

    def stop(self):
        pid = self._kernel_pid()
        # Tree first: after shutdown_kernel the launcher is gone and taskkill /T
        # can no longer find the worker it started.
        self._kill_kernel_tree(pid)
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

    def _probe_busy_response(self):
        return {
            "status": "busy",
            "source": "kernel_snapshot",
            "kernel_state": "busy",
            "truncated": False,
        }

    def _refresh_kernel_busy(self):
        """Consume already-available IOPub status without queuing a request."""
        if not self.kc:
            return False
        try:
            while True:
                msg = self.kc.iopub_channel.get_msg(timeout=0)
                if msg.get("header", {}).get("msg_type") != "status":
                    continue
                state = (msg.get("content") or {}).get("execution_state")
                if state == "busy":
                    self._kernel_busy = True
                    self._external_busy_msg_id = (msg.get("parent_header") or {}).get("msg_id")
                elif state == "idle":
                    parent = (msg.get("parent_header") or {}).get("msg_id")
                    if parent and parent == self._external_busy_msg_id:
                        self._kernel_busy = False
                        self._external_busy_msg_id = None
        except Exception:
            pass
        return bool(self._kernel_busy)

    def _json_probe(self, code, timeout=10, max_chars=PROBE_DEFAULT_MAX_CHARS):
        """Run one fixed safe probe; report transport/kernel failures explicitly."""
        if not self.kc:
            return {"status": "not_started", "source": "kernel_snapshot", "kernel_state": "not_started", "truncated": False}
        if self._refresh_kernel_busy():
            return self._probe_busy_response()
        try:
            result = self._execute(code, timeout=timeout, store_history=False)
        except Exception:
            return {"status": "error", "source": "kernel_snapshot", "kernel_state": "error", "truncated": False, "error": "probe transport failed"}
        if result.get("status") == "timeout":
            self._kernel_busy = True
            return {"status": "timeout", "source": "kernel_snapshot", "kernel_state": "busy", "truncated": False, "error": "probe timed out; kernel was not interrupted"}
        if result.get("status") != "ok":
            return {"status": "error", "source": "kernel_snapshot", "kernel_state": result.get("kernel_state", "error"), "truncated": False, "error": "probe execution failed"}
        text = ""
        for out in result.get("outputs", []):
            if out.get("type") == "stream" and out.get("name") == "stdout":
                text += out.get("text", "")
        payload = None
        for line in reversed(text.splitlines()):
            try:
                payload = json.loads(line.strip())
                break
            except Exception:
                continue
        if not isinstance(payload, dict):
            return {"status": "error", "source": "kernel_snapshot", "kernel_state": "idle", "truncated": False, "error": "probe returned invalid JSON"}
        cap = min(PROBE_MAX_MAX_CHARS, max(PROBE_MIN_MAX_CHARS, int(max_chars)))
        payload.update({"status": "ok", "source": "kernel_snapshot", "kernel_state": "idle"})
        # Bound the final wire payload without ever stringifying a kernel value.
        try:
            encoded = json.dumps(payload, ensure_ascii=False, allow_nan=False)
            if len(encoded) > cap:
                payload["truncated"] = True
                if isinstance(payload.get("vars"), list):
                    while payload["vars"] and len(json.dumps(payload, ensure_ascii=False, allow_nan=False)) > cap:
                        payload["vars"].pop()
                    payload["next_offset"] = payload.get("offset", 0) + len(payload["vars"])
                else:
                    payload.pop("preview", None)
                    payload.pop("dataframe", None)
                    payload.pop("truncated_columns", None)
                    if len(json.dumps(payload, ensure_ascii=False, allow_nan=False)) > cap:
                        payload = {"status": "ok", "source": "kernel_snapshot", "kernel_state": "idle", "found": payload.get("found", False), "name": payload.get("name", ""), "type": payload.get("type", "unknown"), "truncated": True}
        except Exception:
            return {"status": "error", "source": "kernel_snapshot", "kernel_state": "idle", "truncated": False, "error": "probe response was not JSON-safe"}
        return payload

    @staticmethod
    def _probe_options(options, defaults, maxima):
        options = options if isinstance(options, dict) else {}
        result = {}
        for key, default in defaults.items():
            try:
                value = int(options.get(key, default))
            except (TypeError, ValueError, OverflowError):
                value = default
            result[key] = min(maxima[key], max(0, value))
        result["max_chars"] = min(PROBE_MAX_MAX_CHARS, max(PROBE_MIN_MAX_CHARS, result.get("max_chars", PROBE_DEFAULT_MAX_CHARS)))
        return result

    def list_vars(self, options=None):
        """List bounded name/type/shape metadata only; never reads repr/value."""
        opts = self._probe_options(
            options,
            {"offset": 0, "limit": PROBE_DEFAULT_LIST_LIMIT, "max_chars": PROBE_DEFAULT_MAX_CHARS},
            {"offset": 1000000000, "limit": PROBE_MAX_LIST_LIMIT, "max_chars": PROBE_MAX_MAX_CHARS},
        )
        pattern = (options or {}).get("pattern", "") if isinstance(options, dict) else ""
        pattern = pattern if isinstance(pattern, str) else ""
        pattern = pattern[:256]
        if self.language.startswith("r"):
            code = R_LIST_VARS.replace("__OFFSET__", str(opts["offset"])).replace("__LIMIT__", str(opts["limit"])).replace("__PATTERN__", json.dumps(pattern, ensure_ascii=False))
        else:
            code = r'''import json as _dnb_json, sys as _dnb_sys, math as _dnb_math
_dnb_opts = __OPTIONS__
_dnb_pattern = _dnb_opts['pattern'].casefold()
_dnb_offset = _dnb_opts['offset']; _dnb_limit = _dnb_opts['limit']
def _dnb_safe_type(_o):
    _t = type(_o)
    for _builtin in (type(None), bool, int, float, complex, str, bytes, bytearray, list, tuple, dict, set, frozenset, range):
        if _t is _builtin: return type.__getattribute__(_t, '__name__'), type.__getattribute__(_t, '__module__')
    _mods = _dnb_sys.modules
    _np = _mods.get('numpy')
    if _np is not None and _t is _np.ndarray: return 'ndarray', 'numpy'
    _pd = _mods.get('pandas')
    if _pd is not None and (_t is _pd.DataFrame or _t is _pd.Series): return type.__getattribute__(_t, '__name__'), 'pandas'
    _ad = _mods.get('anndata')
    if _ad is not None and _t is getattr(_ad, 'AnnData', None): return 'AnnData', 'anndata'
    _sp = _mods.get('scipy.sparse')
    if _sp is not None:
        for _n in ('csr_matrix','csc_matrix','coo_matrix','bsr_matrix','dia_matrix','dok_matrix','lil_matrix','csr_array','csc_array','coo_array','bsr_array','dia_array','dok_array','lil_array'):
            _c = getattr(_sp, _n, None)
            if _c is not None and _t is _c: return _n, 'scipy.sparse'
    return type.__getattribute__(_t, '__name__'), type.__getattribute__(_t, '__module__')
def _dnb_primitive(_v):
    _t = type(_v)
    if _v is None or _t is bool: return _v
    if _t is int:
        try: return _v if len(str(_v)) <= 128 else {'type':'int'}
        except Exception: return {'type':'int'}
    if _t is float: return _v if _dnb_math.isfinite(_v) else None
    if _t is str: return _v[:128]
    if _t is bytes: return {'type':'bytes','length':len(_v)}
    _np = _dnb_sys.modules.get('numpy')
    if _np is not None:
        for _c in (_np.bool_, _np.integer, _np.floating, _np.str_, _np.bytes_):
            # isinstance, not `type(v) is c`: np.int64 is not np.integer itself,
            # it is a subclass, so an identity check would miss every real value.
            if isinstance(_v, _c):
                try: return _dnb_primitive(_v.item())
                except Exception: return {'type':type(_v).__name__}
    return {'type':_dnb_safe_type(_v)[0]}
def _dnb_shape(_o, _kind):
    try:
        if _kind == 'ndarray': return [int(x) for x in _o.shape]
        if _kind in ('DataFrame','Series'): return [int(x) for x in _o.shape]
        if _kind == 'AnnData': return [int(x) for x in _o.shape]
        if _kind.endswith(('_matrix','_array')) and _dnb_safe_type(_o)[1]=='scipy.sparse': return [int(x) for x in _o.shape]
    except Exception: return None
    if _kind in ('list','tuple','dict','set','frozenset','range','str','bytes','bytearray'):
        try: return [len(_o)]
        except Exception: return None
    return None
_dnb_names = sorted(_n for _n in globals() if not _n.startswith('_') and _n not in {'In','Out','exit','quit'} and (not _dnb_pattern or _dnb_pattern in _n.casefold()))
_dnb_total = len(_dnb_names); _dnb_selected = _dnb_names[_dnb_offset:_dnb_offset+_dnb_limit]; _dnb_vars=[]
for _n in _dnb_selected:
    _v = globals()[_n]; _type,_module = _dnb_safe_type(_v)
    _item={'name':_n[:256], 'type':_type, 'module':_module}
    _shape = _dnb_shape(_v,_type)
    if _shape is not None: _item['shape']=_shape
    _dnb_vars.append(_item)
_dnb_next = _dnb_offset+len(_dnb_selected)
print(_dnb_json.dumps({'vars':_dnb_vars,'total':_dnb_total,'offset':_dnb_offset,'next_offset':_dnb_next if _dnb_next<_dnb_total else None,'truncated':_dnb_next<_dnb_total},ensure_ascii=False,allow_nan=False))'''.replace("__OPTIONS__", json.dumps({"pattern": pattern, **opts}, ensure_ascii=False))
        return self._json_probe(code, timeout=10, max_chars=opts["max_chars"])

    def inspect_object(self, name, options=None):
        """Describe one exact namespace name; values require preview=true."""
        if not isinstance(name, str) or not name or len(name) > 256:
            return {"status": "error", "source": "kernel_snapshot", "kernel_state": "idle", "found": False, "truncated": False, "error": "invalid variable name"}
        opts = self._probe_options(
            options,
            {"preview": 0, "rows": PROBE_DEFAULT_ROWS, "columns": PROBE_DEFAULT_COLUMNS, "max_chars": PROBE_DEFAULT_MAX_CHARS},
            {"preview": 1, "rows": PROBE_MAX_ROWS, "columns": PROBE_MAX_COLUMNS, "max_chars": PROBE_MAX_MAX_CHARS},
        )
        want_preview = bool((options or {}).get("preview", False)) if isinstance(options, dict) else False
        opts["preview"] = int(want_preview)
        if self.language.startswith("r"):
            code = R_INSPECT_OBJECT.replace("__NAME__", json.dumps(name, ensure_ascii=False)).replace("__PREVIEW__", str(opts["preview"])).replace("__ROWS__", str(opts["rows"])).replace("__COLUMNS__", str(opts["columns"]))
        else:
            code = r'''import json as _dnb_json, sys as _dnb_sys, math as _dnb_math
_dnb_name=__NAME__; _dnb_want=bool(__PREVIEW__); _dnb_rows=__ROWS__; _dnb_cols=__COLUMNS__
def _dnb_safe_type(_o):
    _t=type(_o)
    for _b in (type(None),bool,int,float,complex,str,bytes,bytearray,list,tuple,dict,set,frozenset,range):
        if _t is _b:return type.__getattribute__(_t,'__name__'),type.__getattribute__(_t,'__module__')
    _mods=_dnb_sys.modules; _np=_mods.get('numpy'); _pd=_mods.get('pandas'); _ad=_mods.get('anndata'); _sp=_mods.get('scipy.sparse')
    if _np is not None and _t is _np.ndarray:return 'ndarray','numpy'
    if _pd is not None and (_t is _pd.DataFrame or _t is _pd.Series):return type.__getattribute__(_t,'__name__'),'pandas'
    if _ad is not None and _t is getattr(_ad,'AnnData',None):return 'AnnData','anndata'
    if _sp is not None:
        for _n in ('csr_matrix','csc_matrix','coo_matrix','bsr_matrix','dia_matrix','dok_matrix','lil_matrix','csr_array','csc_array','coo_array','bsr_array','dia_array','dok_array','lil_array'):
            _c=getattr(_sp,_n,None)
            if _c is not None and _t is _c:return _n,'scipy.sparse'
    return type.__getattribute__(_t,'__name__'),type.__getattribute__(_t,'__module__')
def _dnb_scalar(_v):
    _t=type(_v)
    if _v is None or _t is bool:return _v
    if _t is int:
        try:return _v if len(str(_v))<=128 else {'type':'int'}
        except Exception:return {'type':'int'}
    if _t is float:return _v if _dnb_math.isfinite(_v) else None
    if _t is str:return _v[:128]
    if _t is bytes:return {'type':'bytes','length':len(_v)}
    _np=_dnb_sys.modules.get('numpy')
    if _np is not None:
        for _c in (_np.bool_,_np.integer,_np.floating,_np.str_,_np.bytes_):
            # isinstance, not `type(v) is c` - np.int64 subclasses np.integer.
            if isinstance(_v,_c):
                try:return _dnb_scalar(_v.item())
                except Exception:return {'type':type(_v).__name__}
    return {'type':_dnb_safe_type(_v)[0]}
def _dnb_label(_v):
    _x=_dnb_scalar(_v)
    return _x if type(_x) in (str,int,float,bool) or _x is None else _x
_dnb_out={'name':_dnb_name,'found':False}
if _dnb_name in globals():
    _o=globals()[_dnb_name]; _kind,_module=_dnb_safe_type(_o); _dnb_out.update({'found':True,'type':_kind,'module':_module,'preview_available':False})
    try:
        if _kind=='ndarray':_dnb_out['shape']=[int(x) for x in _o.shape]; _dnb_out['dtype']=_o.dtype.name
        elif _kind in ('DataFrame','Series'):_dnb_out['shape']=[int(x) for x in _o.shape]
        elif _kind=='AnnData':_dnb_out.update({'shape':[int(x) for x in _o.shape],'isbacked':bool(_o.isbacked)})
        elif _kind.endswith(('_matrix','_array')) and _module=='scipy.sparse':_dnb_out.update({'shape':[int(x) for x in _o.shape],'nnz':int(_o.nnz)})
        elif _kind in ('list','tuple','dict','set','frozenset','range','str','bytes','bytearray'):_dnb_out['length']=len(_o)
    except Exception:pass
    _np=_dnb_sys.modules.get('numpy'); _pd=_dnb_sys.modules.get('pandas')
    if _dnb_want:
        if _kind in ('NoneType','bool','int','float','complex','str','bytes'):
            _dnb_out.update({'preview_available':True,'preview':{'value':_dnb_scalar(_o)}})
        elif _kind in ('list','tuple'):
            _vals=[_dnb_scalar(_o[i]) for i in range(min(len(_o),_dnb_rows))]; _dnb_out.update({'preview_available':True,'preview':{'values':_vals,'truncated':len(_vals)<len(_o)}})
        elif _kind=='dict':
            _vals=[]
            for _k in list(_o.keys())[:_dnb_rows]:_vals.append({'key':_dnb_scalar(_k),'value':_dnb_scalar(_o[_k])})
            _dnb_out.update({'preview_available':True,'preview':{'items':_vals,'truncated':len(_vals)<len(_o)}})
        elif _kind=='ndarray' and _np is not None and type(_o) is _np.ndarray:
            _dnb_out['preview_available']=True; _vals=[]
            for _i in range(min(int(_o.size),_dnb_rows)):
                try:_vals.append(_dnb_scalar(_o.flat[_i]))
                except Exception:_vals.append(None)
            _dnb_out['preview']={'values':_vals,'truncated':len(_vals)<int(_o.size)}
        elif _kind=='Series' and _pd is not None and type(_o) is _pd.Series:
            _vals=[_dnb_scalar(_o.iat[_i]) for _i in range(min(len(_o),_dnb_rows))]; _dnb_out.update({'preview_available':True,'preview':{'values':_vals,'truncated':len(_vals)<len(_o)}})
        elif _kind=='DataFrame' and _pd is not None and type(_o) is _pd.DataFrame:
            _nr=min(len(_o.index),_dnb_rows); _nc=min(len(_o.columns),_dnb_cols); _labels=[_dnb_label(_o.columns[_j]) for _j in range(_nc)]; _rows=[]
            for _i in range(_nr):_rows.append([_dnb_scalar(_o.iat[_i,_j]) for _j in range(_nc)])
            _dnb_out.update({'preview_available':True,'preview':{'columns':_labels,'rows':_rows},'truncated_columns':max(0,len(_o.columns)-_nc)})
'''
            code = code.replace("_dnb_name=__NAME__; _dnb_want=bool(__PREVIEW__); _dnb_rows=__ROWS__; _dnb_cols=__COLUMNS__", "_dnb_name=" + json.dumps(name, ensure_ascii=False) + "; _dnb_want=" + str(want_preview) + "; _dnb_rows=" + str(opts["rows"]) + "; _dnb_cols=" + str(opts["columns"]))
            code += "print(_dnb_json.dumps(_dnb_out,ensure_ascii=False,allow_nan=False))\n"
        return self._json_probe(code, timeout=10, max_chars=opts["max_chars"])


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
        elif cmd == "chdir":
            res = driver.chdir(req.get("path", ""), req.get("timeout", 30), req_id=req_id)
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
            res = driver.list_vars(req)
            _send({"id": req_id, "ok": True, **res})
        elif cmd == "inspect_object":
            res = driver.inspect_object(req.get("name", ""), req)
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
