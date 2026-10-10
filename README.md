# @beihaizb/dsh-notebook

[![npm version](https://img.shields.io/npm/v/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![npm downloads](https://img.shields.io/npm/dm/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![license](https://img.shields.io/npm/l/@beihaizb/dsh-notebook.svg)](https://github.com/beihzb/dsh-notebook/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/beihzb/dsh-notebook.svg?style=social)](https://github.com/beihzb/dsh-notebook)

[English](README.md) | [中文](README.zh-CN.md)

**A stateful, Agent-controllable Jupyter workspace for DeepSeek Harness.** A persistent `ipykernel` runtime that your DSH agent can read, edit, execute, and inspect — turning a notebook from a static artifact into an operationable target.

This is not just another Notebook frontend. The kernel is **truly persistent** (variables live across cells), the notebook **saves and reloads**, and the agent has **tools** that read, modify, run, and reason about cells and their outputs. That combination gives the agent a real **Agent ↔ Kernel ↔ Artifact** loop.

## Agent workflow

The point of this plugin is that the DSH agent doesn't run one-shot scripts — it drives a live computational session:

> User: *"Switch Harmony integration to scVI."*
> → Agent finds the relevant cell → reads its source and context → edits the cell → executes it → checks stdout / traceback → iterates if needed.

Because the kernel is persistent, the agent is operating on stateful runtime state (an `Anndata`, a GPU model, loaded data), not just assembling strings.

<!-- *Screen recording coming soon.* Replace the line above with: ![demo](demo.gif) — a 30–60s clip of: user gives a task → agent edits a cell → it runs → results appear → agent adjusts → final figure. -->

## Screenshots / Demo

- Live **tqdm progress bars** and inline figures with click-to-zoom.
- **Clickable traceback** frames (`Cell In[N]`) that jump to the offending cell.
- Per-cell **"hand to AI"** revision box: type a request, the agent edits and reruns that cell.
- VS Code-aligned cell behavior (queued / executing states, execution semantics).

## Features (implemented)

- **Real persistent kernel**: `ipykernel` + `jupyter_client` sidecar — variables persist across cells.
- **Agent tools** to read, edit, run, and inspect cells (`nb_get`, `nb_edit_cell`, `nb_run_cell`, ...) with structured access to outputs and tracebacks.
- **Runtime introspection for agents**: `nb_context`, `nb_list_vars`, and `nb_inspect_object` expose live kernel variables and compact notebook state; pandas `DataFrame` objects get shape / dtype / missing-value / head / summary metadata.
- **Safe AI edit loop**: rich per-cell version snapshots, `nb_cell_history`, `nb_revert_cell`, `nb_error_context`, and `nb_edit_and_run_cell` support auditable repair-and-rerun workflows.
- **VS Code-aligned cell UI**: circular run control, `Queued` / `Executing` status bar, execution-number glyph.
- **VS Code-aligned execution semantics**: Restart keeps completed outputs, Interrupt stops only the current cell, Run All stops on error, plus Clear Outputs and Restart & Clear.
- **tqdm progress bars**, **long-output folding**, **multi-image grid**.
- **Error navigation** (click traceback to jump to the cell).
- **Resilient frontend**: a React error boundary keeps the notebook view alive instead of going blank when an output fails to render (fixed a hooks-order crash that could blank the panel).
- **Faster live updates**: live progress is throttled and compacted (last outputs only), state polling is reduced, and frequent updates no longer resend the full kernel list.
- **Session-aware working directory**: the notebook default cwd/workspace follows the current DSH session; manual "set working directory" and opened-notebook cwd take priority.
- **Per-session isolation**: each DSH session owns an independent notebook, kernel, and working directory — no cross-session state leakage. Multiple sessions can run kernels simultaneously.
- **Kernel manager**: a toolbar popup lists all active kernels across sessions (session ID, kernel name, status); close any session's kernel directly from the manager.
- **Kernel activity indicator**: a status bar shows whether the current session's kernel is active and warns when multiple sessions have kernels running (memory / resource awareness).
- **Parent watchdog**: if `dsh web` is force-killed, the Python sidecar detects parent-process death and auto-shuts-down its `ipykernel` — no orphan processes (cross-platform: `getppid` on POSIX, `OpenProcess` on Windows).
- **Bilingual UI (EN / 中文)**: the entire interface defaults to English with a one-click language toggle in the toolbar; your choice persists across sessions.
- **Hybrid-CPU hint**: on big.LITTLE (P+E core) machines a one-time, per-session hint explains how to pin the Python process to performance cores (Windows Task Manager / Activity Monitor / `taskset`), with a copy-ready `psutil` snippet; dismiss it and it won't repeat.
- **Jedi kernel completion** (`df.` / `plt.` / variable names; Tab to accept; hover for docstrings).
- **Per-cell AI revision** (version history in `cell.metadata.dsh`).
- **Standard `.ipynb`** save / load with autosave and unsaved-changes warning.
- **Kernel picker** over conda environments, with a friendly install hint when `ipykernel` is missing.
- **Scoped-install compatible**: the bundle now registers under `@beihaizb/dsh-notebook` in both the host patch (`cordis.patch.yml`) and the client loader, so `dsh plugin add @beihaizb/dsh-notebook` loads out of the box (previously the unscoped patch name failed to resolve against the scoped npm package).
- **Reliable "Hand to AI"**: fixed a regression (a local variable shadowing the i18n translator) that silently dropped the submitted suggestion before it could be sent — the cell code and your request now always reach the agent.
- **Theme-aware cell editor**: the CodeMirror editor follows the DSH light/dark theme — oneDark in dark mode, a clean light scheme with soft-gray line numbers in light mode — and re-themes live when you switch.
- **Localized CPU-hint snippet**: the copy-ready `psutil` snippet's comments follow the UI language (EN / 中文).
- **Structured execution results (v0.2.2)**: every run tool (`nb_run_cell`, `nb_edit_and_run_cell`, `nb_run_all`) returns a canonical execution envelope — `status`, `execution_count`, `duration_ms`, `kernel_state`, merged `stdout`/`stderr`, `outputs_summary`, image paths, `error` + `traceback_text`, and `execution_index` — for a reliable agent execution loop.
- **Context-safe long output (v0.2.2)**: three-layer protection keeps runaway output from blowing up the agent context — a per-stream driver cap (500 KB), a 6 KB head+tail summary in the envelope, and the full merged text spilled to `<notebook>_files/` with a path the agent reads on demand. Base64 images stay in the UI; the envelope carries file paths instead.
- **Per-execution history (v0.2.2)**: each run is recorded in `cell.metadata.dsh.executions` (capped at 50 per cell, persisted with the notebook) — the foundation for the execution-history UI and replay-based recovery.
- **Honest Run All completion (v0.2.2)**: the "All cells run" toast now fires only when every cell has actually reached a terminal state, instead of instantly when the request returns.
- **Immediate queue feedback (v0.2.2)**: running a second cell shows its `Queued` state right away (the HTTP run endpoint no longer blocks on `wait` for the UI), and no snapshot swap blanks the editor mid-run.
- **Clean ANSI stream output (v0.2.4)**: kernel stream text that contains ANSI escape sequences without `\r` (colored Pdb prompts, `colorama` prints) is now stripped before rendering — previously the cleaned string was computed but the raw `o.text` was rendered, leaking literal `[32m`/`[0m` garbage into the output area. Error titles (`evalue`) get the same treatment.
- **Long-output folding actually works (v0.3.0)**: the fold shipped in v0.2.2 could never trigger — the `fold` class (the only thing that clamps the height) was gated on a measurement taken from the already-clamped element, so overflow was never detected and the button never appeared. The overflow test now measures an inner, unclamped element against one shared `FOLD_PX` constant, and the button reports the hidden size ("Expand all (3,000 lines)").
- **Oversized output renders head+tail (v0.3.0)**: a single text block above 4,000 lines or 200 KB renders its first 300 and last 100 lines with an explicit "… N lines omitted" marker and a one-click "Show all N lines" — a 500 KB stream no longer has to live in the DOM to be folded.
- **Notebook is reachable in a brand-new session (v0.3.0)**: DSH omits the `conversation.view` slot while a session is blank, so the Notebook tab used to require sending a message first. A "📓 Open Notebook in this session" entry now appears above the composer in a blank session; it activates this View target, which reveals the normal View tabs (and the host then remembers your choice for that session).
- **Scroll position survives View switches (v0.3.0)**: the shell renders one View at a time, so switching to 对话 used to unmount the notebook and reset it to the top. The scroll offset and each cell's folded/expanded choice are now remembered per session and restored when you come back.
- **DSH 0.2.0 support (v0.3.0)**: `peerDependencies` now cover both the `0.1.x-rc` and `0.2.0-rc` lines (`@deepseek-ai/dsh-tools: ^0.1.0-rc.6 || ^0.2.0-rc.1`), so DSH's startup compatibility gate no longer refuses the plugin on a 0.2.x runtime — the old `^0.1.0-rc.6` range capped at `<0.2.0`, and the gate skips the whole bundle when a `@deepseek-ai/dsh*` peer excludes the running version. The client manifest also now names `@deepseek-ai/dsh-client-ui-renderer` (the client row that actually provides the `slots` service) instead of `@deepseek-ai/dsh-client-runtime`, a package that does not exist.
- **Session-aware kernel default (v0.3.1)**: the default kernel follows the **current** session's `dsh-envsel` selection. Before this, the plugin took whichever selection happened to be stored last in the file, so a notebook could land in an environment an unrelated session had picked; and every delegated subagent found nothing at all, because a subagent runs in its own session. A session with no selection of its own now inherits the nearest selecting session it descends from.

## Roadmap

The trajectory is toward a full **agent computational workspace**, not more Notebook UI:

- **AnnData / scientific object introspection** — extend `nb_inspect_object("adata")` with `n_obs`, layers, `obsm`, and `obs` / `var` column summaries.
- **Execution history / diff UI** — expose auditable cell versions in the browser, not just in tools / `cell.metadata.dsh` (per-execution records are already collected).
- **Context-aware cell selection** — layer / query which cells define or depend on a variable, instead of stuffing the whole notebook into context.
- **Execution safety** — classify read-only / lightweight / mutating / expensive / destructive operations; confirm before destructive or very long runs.
- **Checkpoint / rollback** — recover not just code but runtime state.
- **Remote / SLURM kernel** — run the kernel server-side / on a job while the agent drives it through the same interface.

## Compatibility

Supported DSH runtime lines: `0.1.x-rc` and `0.2.0-rc`, verified against `0.1.7-rc.2` and `0.2.0-rc.2` (the plugin declares `@deepseek-ai/dsh-tools: ^0.1.0-rc.6 || ^0.2.0-rc.1`). DSH refuses to boot a plugin whose `@deepseek-ai/dsh*` peer ranges exclude the running version and skips the whole bundle — on an untested newer line, grant an exact-version exemption (`dsh plugin allow-version`, or the plugin manager) instead of forcing it.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook@0.3.1
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.

> **Note on version pinning**: if you install shortly after a release, pnpm's supply-chain policy (`minimumReleaseAge`) may skip the just-published version and install an older one instead. Pin the version explicitly as above (`@beihaizb/dsh-notebook@0.3.1`), or use `@beihaizb/dsh-notebook@latest` once the release is older than the policy window.

### Kernel selection

- **`dsh-envsel` is an optional dependency.** With the environment picker installed, the plugin reads its selection (the store under `$DSH_HOME`, i.e. `~/.dsh/envsel-state.json`) and uses the conda environment you picked **for the session** as the default kernel. A session with no selection of its own — a delegated subagent, for example — inherits the nearest selecting session it descends from, so delegated notebook work lands in the same environment as the session that delegated it. Install:

  ```bash
  dsh plugin --profile web add @beihaizb/dsh-envsel
  ```

  (Source: [github.com/beihzb/dsh-envsel](https://github.com/beihzb/dsh-envsel))

- **Without `dsh-envsel`**, the plugin falls back to the first discovered conda environment that has `ipykernel` installed. The store is read with its own version stamp checked, so a future `envsel` state format is ignored rather than misread.
- **You are never locked in.** Switch kernels from the toolbar dropdown at any time.

The selected environment needs `ipykernel`, `jupyter_client`, and `nbformat`. If any is missing, the plugin shows a friendly error with the exact install command.

## Tools

`nb_new` / `nb_open` / `nb_save` / `nb_get` / `nb_context` / `nb_list` /
`nb_list_vars` / `nb_inspect_object` /
`nb_add_cell` / `nb_delete_cell` / `nb_move_cell` / `nb_edit_cell` / `nb_edit_and_run_cell` /
`nb_cell_history` / `nb_revert_cell` / `nb_error_context` /
`nb_run_cell` / `nb_run_all` / `nb_apply_suggestion` /
`nb_kernel_restart` / `nb_kernel_restart_and_clear` / `nb_kernel_interrupt` /
`nb_kernel_list` / `nb_kernel_select` / `nb_clear_outputs` / `nb_set_cwd`

## License

MIT
