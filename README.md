# @beihaizb/dsh-notebook

[![npm version](https://img.shields.io/npm/v/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![npm downloads](https://img.shields.io/npm/dm/@beihaizb/dsh-notebook.svg)](https://www.npmjs.com/package/@beihaizb/dsh-notebook)
[![license](https://img.shields.io/npm/l/@beihaizb/dsh-notebook.svg)](https://github.com/beihzb/dsh-notebook/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/beihzb/dsh-notebook.svg?style=social)](https://github.com/beihzb/dsh-notebook)

[English](README.md) | [中文](README.zh-CN.md)

A native Jupyter-style notebook plugin for DeepSeek Harness: a real `ipykernel` sidecar + an in-browser cell editor, with cell behavior aligned to VS Code Jupyter.

## Screenshots / Demo

Highlights you'll see in action: live **tqdm progress bars**, **clickable traceback** that jumps to the offending cell, the per-cell **"hand to AI"** revision box, and **inline figures** with click-to-zoom.

<!-- Add a demo.gif next to this README and replace the line below with: ![demo](demo.gif) -->
> 🎬 *Screen recording coming soon.*

## Features

- **Real kernel**: `ipykernel` + `jupyter_client` sidecar — variables persist across cells.
- **VS Code-aligned cell UI**: circular run control (grey ring for queued, spinning gold ring while running), `Queued` / `Executing` status bar, small execution-number glyph. No `In [ ]` / `Out [ ]` noise.
- **VS Code-aligned execution semantics**: Restart keeps completed outputs, Interrupt only stops the current cell, Run All stops on the first error, plus Clear Outputs and Restart & Clear.
- **tqdm progress bars**: `\r`-refreshed progress streams are rendered as live progress bars.
- **Long-output folding + multi-image grid**: oversized output auto-collapses; multiple figures lay out side by side.
- **Error navigation**: `Cell In[N]` frames in a traceback are clickable and jump to the corresponding cell.
- **Kernel completion**: `df.` / `plt.` / variable names trigger Jedi completion (Tab to accept); hover for docstrings.
- **Per-cell AI revision**: type a change request under any cell and hand it to the AI to edit + rerun (version history lives in `cell.metadata.dsh`).
- **Standard `.ipynb`** save / load, with autosave and unsaved-changes warning.
- **Kernel picker**: choose from your conda environments; friendly install hint when `ipykernel` is missing.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.

### Kernel selection

Kernel selection works as follows:

- **`dsh-envsel` is an optional dependency.** If you have the environment picker installed, the notebook plugin reads its selection (`~/.dsh/envsel-state.json`) and uses the conda environment you picked for the current session as the default kernel. This keeps the notebook in sync with the environment you chose globally in DSH. Install it with:

  ```bash
  dsh plugin --profile web add @beihaizb/dsh-envsel
  ```

  (Source: [github.com/beihzb/dsh-envsel](https://github.com/beihzb/dsh-envsel))

- **Without `dsh-envsel`** (or if no selection is recorded), the plugin falls back to the first discovered conda environment that has `ipykernel` installed.
- **You are never locked in.** Use the kernel dropdown in the notebook toolbar to switch to any other conda environment at any time.

The selected environment needs `ipykernel`, `jupyter_client`, and `nbformat`. If any is missing, the plugin shows a friendly error with the exact install command instead of failing silently.

## Tools

`nb_new` / `nb_open` / `nb_save` / `nb_get` / `nb_list` /
`nb_add_cell` / `nb_delete_cell` / `nb_move_cell` / `nb_edit_cell` /
`nb_run_cell` / `nb_run_all` / `nb_apply_suggestion` /
`nb_kernel_restart` / `nb_kernel_restart_and_clear` / `nb_kernel_interrupt` /
`nb_kernel_list` / `nb_kernel_select` / `nb_clear_outputs` / `nb_set_cwd`

## License

MIT
