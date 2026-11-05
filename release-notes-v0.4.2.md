# dsh-notebook v0.4.2

Two user-facing fixes and one correctness fix, all found by driving the running
app instead of reasoning about the source:

- the scroll position finally survives a View switch (it never actually did);
- the agent can read live kernel variables again, safely and in bounded pages;
- closing an R kernel no longer leaves an orphan `Rterm.exe`.

## Scroll position survives View switches — for real this time

The v0.3.0 notes claimed this worked. It did not, and the reason is worth
writing down: the restore targeted `.dnb-body`, which has `overflow:auto` but
no height constraint of its own, so it grows with the cells and never scrolls.
Measured in the live UI:

```text
.dnb-body          h=3737  scrollHeight 3732  clientHeight 3732   not scrollable
.wSkVaW_scrollBody h=524   scrollHeight 3942  clientHeight 519    the shell's scroller
```

So `onScroll` never fired, nothing was ever saved, and every restore had nothing
to restore. Two further bugs sat behind that one:

- switching Views resets the shell's shared scroll container to 0 **before** the
  component unmounts, and that reset arrived as an ordinary scroll event — it
  was being saved, overwriting the position on the way out (measured: leaving at
  1800 stored 0);
- a raw pixel offset is only valid while the content above it keeps its height.
  Outputs gain and lose height between mounts (images decode, long outputs fold,
  a traceback appears), so 1800 px on the way out was a different cell on the way
  back — a consistent, "always the same wrong place" error.

The fix: resolve the genuinely scrollable ancestor, capture the offset on the
document in the capture phase (element scroll events do not bubble, and the shell
replaces the node), only trust a jump to 0 when the user actually did something
inside the view in the last 800 ms, and restore by **cell anchor**
(`{id, delta}`) with the pixel offset as a fallback. The restore runs in a layout
effect — after the cells commit, before the browser paints — and the previous
snapshot is reused on mount, so returning lands directly on the right cell with
no loading gap and no settle.

Verified with a per-frame sampler around a 对话 → Notebook switch on a real
notebook (152–159 frames per run):

```text
target 1800 -> hidden 1 frame, empty 0, first visible frame at 1799, max deviation 1 px
target 2600 -> hidden 1 frame, empty 0, first visible frame at 2599, max deviation 1 px
```

and on the switch itself, the top cell and its offset are identical before and
after (`neighbors_umap @ -85` → `neighbors_umap @ -85`).

## Variable introspection is safe and bounded

`nb_list_vars` used to call `repr()` on every object in the namespace, and
`nb_inspect_object` ran a full `describe()` over any DataFrame. That ran
arbitrary user code, scanned large frames, and — worst of all — silently started
a **new kernel** when none was running, discarding the variables the caller
wanted to look at.

The contract now:

| tool | returns |
|---|---|
| `nb_list_vars` | `name`, exact `type`, `shape` only — never `repr()`, never a value. Literal `pattern` filter, `offset`/`limit` paging (default 100, max 200), `max_chars` budget (1024–64000) that trims the page. |
| `nb_inspect_object` | type/shape by default; values only with `preview: true` **and** an allowlisted exact type (builtin containers/scalars, NumPy arrays, pandas `DataFrame`/`Series`, scipy sparse shape/nnz, `AnnData` shape/isbacked). Unknown types stay metadata-only. |

Three "cannot look right now" answers are explicit instead of being forced:

- no kernel → `not_started` (it will not start one to look at variables);
- a queued or running cell → `busy` (it will not queue a probe ahead of user code);
- probe timeout → `timeout`, and the kernel is **not** interrupted, because the
  probe and the user's cell can be in flight from the user's point of view.

Variable names are literals: `nb_inspect_object(name="__import__('os')")` returns
`found: false` rather than evaluating anything.

R is conservative on purpose. Base R has no supported way to ask "is this binding
a promise?" without forcing it, and forcing a `delayedAssign` promise runs user
code. So names and paging always work, `bindingIsActive()` skips active bindings
without calling them, and anything that cannot be proven safe reports
`type: "unknown"`, `binding: "uninspected"` with no preview. When `rlang` is
**already loaded** in that session its lazy-binding predicate unlocks types and
bounded previews; the plugin never loads a package itself.

Tests: `tests/test_kernel_introspection.py` (durable pytest), plus
`tmp/verify-safe-introspection.py` and `tmp/verify-r-safe-introspection.py`,
which assert from inside R that a `delayedAssign` promise and an active binding
are **never forced**.

## R kernel process trees are reaped

`stop()` now kills the kernel process tree (`taskkill /F /T` on Windows,
`killpg` elsewhere) *before* `shutdown_kernel`. A conda `R.exe` is only a
launcher that spawns `Rterm.exe`; signalling the launcher left the worker
running, so closing an R kernel could leave an orphan `Rterm.exe` behind.

## Hybrid-CPU advice is Windows-only and names the kernel

The panel used to appear on macOS and Linux too, where per-process affinity
either does not exist (macOS) or cannot be read reliably without extra tooling.
Detection is now `win32`-only, and the panel states which kernel it would pin
plus a snippet matching that kernel's language: `psutil` for Python, and for R a
`system2("powershell", …)` wrapper that writes a temporary `.ps1` and runs it
with `-File` — quoting a `-Command` string through R → PowerShell had it echoed
instead of executed — targeting `Sys.getpid()`, the `Rterm.exe` that actually
computes.

## Verification summary

- `tests/test_kernel_introspection.py` — 3 passed
- `tmp/verify-safe-introspection.py` — all checks passed
- `tmp/verify-r-safe-introspection.py` — all checks passed
- `tmp/verify-scroll-restore.mjs` — 8 scenarios passed
- `tmp/verify-0.4.0.mjs`, `tmp/verify-0.3.1.mjs` — all passed
- `tmp/verify-r-kernel.py`, `tmp/verify-chdir.py` — 0 failures
