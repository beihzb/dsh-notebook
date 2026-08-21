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

## Roadmap

The trajectory is toward a full **agent computational workspace**, not more Notebook UI:

- **AnnData / scientific object introspection** — extend `nb_inspect_object("adata")` with `n_obs`, layers, `obsm`, and `obs` / `var` column summaries.
- **Structured execution results** — return `cell_id`, `execution_count`, `stdout`, `stderr`, `display_data`, `error`, `duration`, `kernel_state` to the agent for a reliable execution loop.
- **Execution history / diff UI** — expose auditable cell versions in the browser, not just in tools / `cell.metadata.dsh`.
- **Context-aware cell selection** — layer / query which cells define or depend on a variable, instead of stuffing the whole notebook into context.
- **Execution safety** — classify read-only / lightweight / mutating / expensive / destructive operations; confirm before destructive or very long runs.
- **Checkpoint / rollback** — recover not just code but runtime state.
- **Remote / SLURM kernel** — run the kernel server-side / on a job while the agent drives it through the same interface.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.

### Kernel selection

- **`dsh-envsel` is an optional dependency.** With the environment picker installed, the plugin reads its selection (`~/.dsh/envsel-state.json`) and uses the conda environment you picked for the session as the default kernel. Install:

  ```bash
  dsh plugin --profile web add @beihaizb/dsh-envsel
  ```

  (Source: [github.com/beihzb/dsh-envsel](https://github.com/beihzb/dsh-envsel))

- **Without `dsh-envsel`**, the plugin falls back to the first discovered conda environment that has `ipykernel` installed.
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
