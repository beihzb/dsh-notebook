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


class KernelDriver:
    def __init__(self):
        self.km = None
        self.kc = None
        self.interpreter = None
        self._exec_count = 0

    def start(self, interpreter=None, cwd=None):
        from jupyter_client import KernelManager

        self.interpreter = interpreter or sys.executable
        if cwd:
            try:
                os.chdir(cwd)
            except Exception:
                pass
        self.km = KernelManager()
        start_kwargs = {}
        if cwd:
            start_kwargs["cwd"] = cwd
        try:
            self.km.start_kernel(**start_kwargs)
        except Exception:
            self.km = KernelManager(kernel_name="python3")
            self.km.start_kernel(**start_kwargs)
        self.kc = self.km.client()
        self.kc.start_channels()
        try:
            self.kc.wait_for_ready(timeout=30)
        except Exception:
            pass
        return {"alive": True, "interpreter": self.interpreter, "cwd": os.getcwd()}

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
        return {"alive": True, "kernel_info": {"interpreter": self.interpreter or sys.executable}}

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
        import nbformat
        nb = nbformat.read(path, as_version=4)
        cells = []
        for cell in nb.cells:
            c = {
                "id": cell.get("id", "cell-%d" % len(cells)),
                "cell_type": cell.cell_type,
                "source": cell.source,
                "outputs": [],
                "metadata": dict(cell.get("metadata", {})),
                "execution_count": cell.get("execution_count"),
            }
            if cell.cell_type == "code":
                for out in cell.get("outputs", []):
                    c["outputs"].append(self._nb_output_to_dict(out))
            cells.append(c)
        return {
            "cells": cells,
            "metadata": dict(nb.get("metadata", {})),
            "nbformat": nb.get("nbformat", 4),
            "nbformat_minor": nb.get("nbformat_minor", 5),
        }

    def _nb_output_to_dict(self, out):
        result = {"output_type": out.get("output_type", "")}
        if out["output_type"] == "stream":
            result["type"] = "stream"
            result["name"] = out.get("name", "stdout")
            result["text"] = out.get("text", "")
        elif out["output_type"] in ("display_data", "execute_result"):
            result["type"] = out["output_type"]
            result["data"] = self._serialize_data(out.get("data", {}))
            result["execution_count"] = out.get("execution_count")
        elif out["output_type"] == "error":
            result["type"] = "error"
            result["error"] = {
                "ename": out.get("ename", ""),
                "evalue": out.get("evalue", ""),
                "traceback": out.get("traceback", []),
            }
        return result

    def save_ipynb(self, path, cells, metadata=None):
        import nbformat
        nb = nbformat.v4.new_notebook()
        if metadata:
            nb.metadata = metadata
        for c in cells:
            if c.get("cell_type") == "markdown":
                cell = nbformat.v4.new_markdown_cell(c.get("source", ""))
            else:
                cell = nbformat.v4.new_code_cell(c.get("source", ""))
                if c.get("id"):
                    cell["id"] = c["id"]
                if c.get("outputs"):
                    cell["outputs"] = [self._dict_to_nb_output(o) for o in c["outputs"]]
                    cell["execution_count"] = c.get("execution_count")
                if c.get("metadata"):
                    cell["metadata"] = c["metadata"]
            nb.cells.append(cell)
        nbformat.write(nb, path)
        return {"ok": True, "path": path}

    def _dict_to_nb_output(self, d):
        import nbformat
        otype = d.get("output_type", d.get("type", ""))
        if d.get("type") == "stream" or otype == "stream":
            return nbformat.v4.new_output(
                "stream", name=d.get("name", "stdout"), text=d.get("text", "")
            )
        elif d.get("type") in ("display_data", "execute_result") or otype in (
            "display_data",
            "execute_result",
        ):
            return nbformat.v4.new_output(otype or "display_data", data=d.get("data", {}))
        elif d.get("type") == "error" or otype == "error":
            err = d.get("error", {})
            return nbformat.v4.new_output(
                "error",
                ename=err.get("ename", ""),
                evalue=err.get("evalue", ""),
                traceback=err.get("traceback", []),
            )
        return nbformat.v4.new_output("display_data", data={"text/plain": str(d)})


def _handle(driver, req):
    req_id = req.get("id")
    cmd = req.get("cmd", "")
    try:
        if cmd == "start":
            res = driver.start(req.get("interpreter"), req.get("cwd"))
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
