# v0.2.2

Structured execution results for the agent, context-safe long output, and several execution-loop reliability fixes.

## Structured execution results (agent execution loop)

- **Canonical execution envelope**: `nb_run_cell`, `nb_edit_and_run_cell`, and `nb_run_all` now return a uniform envelope — `status`, `execution_count`, `duration_ms`, `kernel_state`, merged `stdout`/`stderr`, `outputs_summary`, image paths, `error` + `traceback_text`, and `execution_index` — instead of raw output arrays the agent had to parse.
- **Context-safe long output (3 layers)**:
  1. Per-stream driver cap (500 KB) protecting stdio / host memory / UI;
  2. 6 KB head+tail summary in the envelope (tail carries tracebacks / latest output) with an explicit omission marker;
  3. The full merged text is spilled to `<notebook>_files/<cell>_stdout.txt` and the envelope carries `stdout_path` / `stderr_path`, so the agent reads details on demand — long output can never blow up the context.
- **Images out of context**: display figures are written to `<notebook>_files/` and the envelope returns their paths; base64 stays in `cell.outputs` for the UI only.
- **Per-execution history**: every run is recorded in `cell.metadata.dsh.executions` (capped at 50 per cell, persisted with the notebook) — the foundation for the execution-history UI and replay-based recovery (#3 / #6 of the roadmap).

## Fixes

- **Run All "completion" toast was a lie**: the "All cells run" toast fired the instant the request returned, while cells were still executing. It now fires only when every cell has reached a terminal state (ok/error).
- **Queue state not shown / editor flashing blank**: the HTTP run endpoint had been made to block on `wait` for the UI, which (a) delayed the `Queued` state on a second cell until the first finished, and (b) let a compact snapshot (no `source`) overwrite the editor — cells flashed empty then recovered on the next poll. The UI contract (immediate `{queued:true}` + full snapshot) is restored; agents still get the full envelope via explicit `wait:true`.
- **`t is not a function` render crash**: a local `var t` (poll timer) shadowed the i18n translator inside the new completion-detection effect; renamed to `pollTimer`. (Same class of bug as the v0.2.1 "Hand to AI" fix.)
- **Long output >6 KB but <500 KB had no spill file**: the spill-on-demand path only triggered on driver-level truncation; it now also triggers when the 6 KB envelope summary is cut, so the agent always has a path to the full text.
- **Re-running an already-queued cell returned a stub**: `nb_run_cell` on a cell already queued/running now waits for the in-flight job and returns the real envelope instead of an immediate non-envelope stub.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook@0.2.2
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.

> **Version pinning**: if you install shortly after this release, pnpm's supply-chain policy (`minimumReleaseAge`) may skip the just-published version and install an older one. Pin the version explicitly (`@beihaizb/dsh-notebook@0.2.2`), or use `@latest` once the release is older than the policy window.
