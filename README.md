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

- **Real persistent kernel**: `ipykernel` + `jupyter_client` sidecar — variables persist across cells. **R kernels** (`IRkernel`) are supported too, picked from the same dropdown.
- **Agent tools** to read, edit, run, and inspect cells (`nb_get`, `nb_edit_cell`, `nb_run_cell`, ...) with structured access to outputs and tracebacks.
- **Runtime introspection for agents (safety-first)**: `nb_context`, `nb_list_vars`, and `nb_inspect_object` expose live kernel variables and compact notebook state, but **never call `repr()` on an arbitrary object**. `nb_list_vars` returns name, exact type, and shape only, with `pattern` filtering and `offset`/`limit` paging (default 100, max 200, `max_chars` bounds the payload); `nb_inspect_object` returns type/shape by default and only a bounded preview when `preview=true` is passed **and** the object is an allowlisted exact type (builtin containers and scalars, NumPy arrays, pandas `DataFrame`/`Series`, scipy sparse matrices, `AnnData` shape/`isbacked`). Unknown types stay metadata-only. With no kernel running it answers `not_started` (**it will not start one just to look at variables**); while a cell is executing it answers `busy` (**it will not queue behind or ahead of your code**), and a probe timeout never interrupts your cell.
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
- **Hybrid-CPU hint (Windows)**: on a big.LITTLE (P+E core) machine the plugin reads each physical core's `EfficiencyClass`, computes the P-core affinity mask, and offers a copy-ready snippet for **this session's kernel** — the panel names that kernel, and the snippet matches its language: a `psutil` script for Python, and for R a `system2("powershell", …)` wrapper targeting `Sys.getpid()` (the `Rterm.exe` that actually computes; `R.exe` is only a launcher), so no other session is touched. Windows-scoped on purpose: macOS has no per-process affinity API, and the Linux topology signal readable without extra tooling is unreliable. A toolbar button reopens the panel after dismissal.
- **Jedi kernel completion** (`df.` / `plt.` / variable names; Tab to accept; hover for docstrings).
- **Per-cell AI revision** (version history in `cell.metadata.dsh`).
- **Standard `.ipynb`** save / load with autosave and unsaved-changes warning — no `nbformat` needed, and unknown fields survive a round-trip.
- **Kernel picker** over conda environments **and R kernels**, with a friendly install hint when `ipykernel` / `jupyter_client` / `IRkernel` is missing.
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
- **Scroll position survives View switches (v0.3.0, actually working since v0.4.2)**: the shell renders one View at a time, so switching to 对话 unmounts the notebook and loses the scroll offset. The v0.3.0 implementation never worked: it saved and restored the offset of `.dnb-body`, which has `overflow:auto` but no height constraint, so it grows with the cells and never scrolls — its `scrollTop` is permanently 0. Measured in the running UI: `.dnb-body` is 3732/3732 (not scrollable) while the shell's own `.wSkVaW_scrollBody` is 3942/519. v0.4.2 fixes it properly: the real container is resolved by walking up to the first genuinely scrollable ancestor, the offset is captured on the document in the capture phase (element scroll events do not bubble, and the shell replaces the node), the shell's reset-to-0 during the switch is no longer mistaken for a user scroll, and the position is restored by **cell anchor** (`{id, delta}`) rather than a pixel offset, so content that changes height does not shift it. The restore is applied in a layout effect before paint, and the previous snapshot is reused on mount, so coming back lands directly on the right cell with no loading flash.
- **R kernel trees are reaped (v0.4.2)**: `stop()` now kills the kernel process tree (`taskkill /F /T` on Windows, `killpg` elsewhere) *before* `shutdown_kernel`. A conda `R.exe` is only a launcher that spawns `Rterm.exe`; signalling the launcher left the real worker running, so closing an R kernel could leave an orphan `Rterm.exe` behind.
- **Hybrid-CPU advice is Windows-only and kernel-aware (v0.4.2)**: the panel used to appear on macOS/Linux too, where per-process affinity either does not exist (macOS) or cannot be read reliably without extra tooling. Detection is now `win32`-only, and the panel states **which kernel** it would pin and offers a snippet matching that kernel's language: `psutil` for Python, and for R a `system2("powershell", …)` wrapper that writes a temporary `.ps1` and runs it with `-File` (quoting a `-Command` string through R → PowerShell echoed instead of executing) targeting `Sys.getpid()` — the `Rterm.exe` that actually computes.
- **DSH 0.2.0 support (v0.3.0)**: `peerDependencies` now cover both the `0.1.x-rc` and `0.2.0-rc` lines (`@deepseek-ai/dsh-tools: ^0.1.0-rc.6 || ^0.2.0-rc.1`), so DSH's startup compatibility gate no longer refuses the plugin on a 0.2.x runtime — the old `^0.1.0-rc.6` range capped at `<0.2.0`, and the gate skips the whole bundle when a `@deepseek-ai/dsh*` peer excludes the running version. The client manifest also now names `@deepseek-ai/dsh-client-ui-renderer` (the client row that actually provides the `slots` service) instead of `@deepseek-ai/dsh-client-runtime`, a package that does not exist.
- **Session-aware kernel default (v0.3.1)**: the default kernel follows the **current** session's `dsh-envsel` selection. Before this, the plugin took whichever selection happened to be stored last in the file, so a notebook could land in an environment an unrelated session had picked; and every delegated subagent found nothing at all, because a subagent runs in its own session. A session with no selection of its own now inherits the nearest selecting session it descends from.
- **R kernels (v0.4.0)**: the kernel picker now lists R kernels, discovered the way Jupyter discovers them — kernelspecs in the user data dir, kernelspecs shipped inside a conda env (`<env>/share/jupyter/kernels`), and conda environments that merely have `IRkernel` installed in their R library (synthesised). A conda R is started with its env's DLL directories on `PATH` and `R_HOME` set, because launching the bare binary dies instantly with `0xC0000135` (DLL not found); a kernelspec whose `argv[0]` is just `"R"` is resolved to the absolute binary so it works without activating the env. Saving writes the real `kernelspec.language` (`r` or `python`). R-side variable introspection is deliberately conservative: names and paging always work, but a binding is only typed when that can be decided safely — `bindingIsActive()` skips active bindings, and a `delayedAssign` promise is never typed or previewed, because base R has no supported way to recognise one without forcing it (and forcing runs user code). When `rlang` is **already loaded** in that session, its lazy-binding predicate unlocks types and bounded previews; the plugin never loads a package itself.
- **`nbformat` is no longer required (v0.4.0)**: reading and writing `.ipynb` is done with the standard library. Previously the sidecar did `import nbformat` when opening or saving a notebook, so a conda env that had `ipykernel` + `jupyter_client` but not `nbformat` failed with `Operation failed: No module named 'nbformat'` — and a lean or R-only environment could never have it at all. Output is byte-identical to `nbformat.write()` (indent/sort/CRLF/line-splitting all match), so files written here and by Jupyter do not churn in git.
- **Lossless notebook round-trip (v0.4.0)**: anything the plugin does not model — markdown `attachments` (pasted images), per-output `metadata` (widget view sizes), notebook `metadata.widgets` state, vendor keys — is carried through untouched instead of being dropped on save. `nbformat` **3** notebooks (pre-2015 `worksheets`/`input`/`prompt_number`/`png` aliases) are upgraded to v4 on read rather than being read as an empty notebook and wiped on the next save; 4.0–4.4 files gain cell ids the same way `nbformat.read` does.
- **The hybrid-CPU hint can be reopened (v0.4.0)**: dismissing it used to be permanent for the browser session with no way back. The CPU probe result is now kept for the session and a `⚡ 大小核` / `⚡ Hybrid CPU` toolbar button reopens the same panel; only the *automatic* popup stays dismissed.
- **Session cwd sync no longer kills the kernel (v0.4.1)**: a freshly mounted notebook view synced the session's cwd by killing the sidecar and restarting the kernel — which discarded every variable and interrupted a running cell, and fired spuriously when the session's state had been created from a stale `process.cwd()`. New sessions are now seeded from `SessionHeader.cwd`, and both the sync and `nb_set_cwd` change the directory **in place** (queued behind any in-flight cell, so it cannot interrupt a run). Credit: [#6](https://github.com/beihzb/dsh-notebook/pull/6).
- **`/nb` routes are authenticated and body-bounded (v0.4.1)**: the notebook's HTTP routes now ask the `connection` service for a rejection first — the same Host/Origin + login-cookie fence the platform puts in front of `/api` — and request bodies are capped at 32 MB. Before this, any local process, or any website via a cross-origin form POST, could drive the kernel and execute arbitrary Python. Credit: [#3](https://github.com/beihzb/dsh-notebook/pull/3).
- **No more Promise leak into tool output (v0.4.1)**: the in-flight run Promise used to be stored on the cell object, so every snapshot (and therefore `nb_get`, `nb_edit_cell`, `nb_run_cell`) carried a live Promise while a cell was queued or running. Jobs now live in a side map and snapshots are guaranteed JSON-serializable. Credit: [#5](https://github.com/beihzb/dsh-notebook/pull/5).
- **No false hybrid-CPU warning on servers (v0.4.1)**: the Linux fallback that guessed "hybrid" from a `cpu MHz` max−min gap flagged every frequency-scaling EPYC/Xeon part, because an idle core downclocks while a busy sibling boosts. Only an explicit per-core `core_type` marker counts now. Credit: [#4](https://github.com/beihzb/dsh-notebook/pull/4).

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
dsh plugin --profile web add @beihaizb/dsh-notebook@0.4.2
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.

> **Note on version pinning**: if you install shortly after a release, pnpm's supply-chain policy (`minimumReleaseAge`) may skip the just-published version and install an older one instead. Pin the version explicitly as above (`@beihaizb/dsh-notebook@0.4.2`), or use `@beihaizb/dsh-notebook@latest` once the release is older than the policy window. A locally built tarball installs with `dsh plugin --profile web add <file.tgz> --config.minimumReleaseAge=0`.

### Kernel selection

- **`dsh-envsel` is an optional dependency.** With the environment picker installed, the plugin reads its selection (the store under `$DSH_HOME`, i.e. `~/.dsh/envsel-state.json`) and uses the conda environment you picked **for the session** as the default kernel. A session with no selection of its own — a delegated subagent, for example — inherits the nearest selecting session it descends from, so delegated notebook work lands in the same environment as the session that delegated it. Install:

  ```bash
  dsh plugin --profile web add @beihaizb/dsh-envsel
  ```

  (Source: [github.com/beihzb/dsh-envsel](https://github.com/beihzb/dsh-envsel))

- **Without `dsh-envsel`**, the plugin falls back to the first discovered conda environment that has `ipykernel` installed. The store is read with its own version stamp checked, so a future `envsel` state format is ignored rather than misread.
- **You are never locked in.** Switch kernels from the toolbar dropdown at any time.

### Kernel requirements

| Kernel | Needs |
|---|---|
| Python | `ipykernel` **and** `jupyter_client` — the first runs the kernel, the second runs the sidecar that talks to it |
| R | `IRkernel` in that R's library; nothing Python-side (the sidecar is borrowed from a Python env, preferring your `dsh-envsel` python) |

`nbformat` is **not** required — notebook files are read and written with the standard library.

`jupyter_client` and `ipykernel` are genuinely third-party protocol implementations, so a missing one is reported with the exact install command instead of a raw `ModuleNotFoundError`; the kernel dropdown also marks such environments as unavailable rather than letting you pick a kernel that cannot start.

**R kernels are opt-in**: opening a fresh notebook never silently starts R. Use the kernel dropdown (`R · ggtree`, `R · hdWGCNA`, …) for an R notebook. Every entry is labelled with its language — `py · scRNAv2`, `R · ggtree` — so the two are never confused, and `nb_kernel_list` reports the same `language` field (`"python"` / `"r"`). An environment that only has a Python interpreter but additionally ships R (very common in conda) is still reported in the runtime context by `dsh-envsel`, so the agent knows both invocations.

## Tools

`nb_new` / `nb_open` / `nb_save` / `nb_get` / `nb_context` / `nb_list` /
`nb_list_vars` / `nb_inspect_object` /
`nb_add_cell` / `nb_delete_cell` / `nb_move_cell` / `nb_edit_cell` / `nb_edit_and_run_cell` /
`nb_cell_history` / `nb_revert_cell` / `nb_error_context` /
`nb_run_cell` / `nb_run_all` / `nb_apply_suggestion` /
`nb_kernel_restart` / `nb_kernel_restart_and_clear` / `nb_kernel_interrupt` /
`nb_kernel_list` / `nb_kernel_select` / `nb_clear_outputs` / `nb_set_cwd`

### Introspection contract

```text
nb_list_vars({ pattern?, offset?, limit?, max_chars? })
  -> { status, source, kernel_state, vars:[{name,type,module?,shape?}],
       total, offset, next_offset, truncated }

nb_inspect_object({ name, preview?, rows?, columns?, max_chars? })
  -> { status, name, found, type, module?, shape?, preview_available,
       preview?, truncated_columns?, binding? }
```

- `status` is `ok` / `busy` / `not_started` / `timeout` / `error`. `busy` and `not_started` are answers, not failures: retry at another moment instead of starting a kernel.
- `name` is a **literal**, never an expression — `__import__('os')` yields `found: false`.
- No variable contents are returned unless `preview: true`, and even then only for allowlisted exact types, bounded to 20 rows / 50 columns and a `max_chars` budget (1024–64000).

## License

MIT
