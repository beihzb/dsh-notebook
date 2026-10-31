# dsh-notebook v0.4.0

R kernels, a notebook format that no longer needs `nbformat`, and a hybrid-CPU
hint you can actually find again.

## R kernels

`IRkernel` is now a first-class kernel, discovered the way Jupyter discovers it:

- kernelspecs in the user data dir (`%APPDATA%\jupyter\kernels`,
  `~/.local/share/jupyter/kernels`),
- kernelspecs shipped inside a conda env (`<env>/share/jupyter/kernels`),
- conda environments that merely have `IRkernel` in their R library — a
  kernelspec is synthesised for them.

Two details that make it work in practice:

- **A conda R needs its env's DLL directories.** Launching the bare
  `<env>/lib/R/bin/x64/R.exe` exits instantly with `0xC0000135` (DLL not found).
  The kernel is started with the env's `bin`/`Library/bin` directories prepended
  to `PATH` and `R_HOME` set — the equivalent of `conda activate`, without a
  shell.
- **`argv[0]` is not trusted.** The kernelspec a conda env ships usually says
  `"R"`, which only resolves while that env is activated (and often lacks the
  `.exe`). The absolute binary is substituted, and the spec is regenerated in a
  temp dir exposed through `JUPYTER_PATH`, so your Jupyter config is untouched
  and nothing has to be installed.

`nb_list_vars` / `nb_inspect_object` have R implementations (`ls`/`class`/
`deparse`; `data.frame` additionally reports rows, columns and column types).
Saving writes the real `kernelspec.language` (`r` or `python`).

Every entry in the kernel dropdown is labelled with its language — `py ·
scRNAv2`, `R · ggtree` — with the full launch line as its tooltip.
`nb_kernel_list` reports the same `language` field, and the catalog is projected
before it leaves the host, so an R entry's `argv` and activation `PATH`/`R_HOME`
stay on the host instead of reaching the browser or the agent's context.

R kernels are **opt-in**: a fresh notebook still defaults to Python. Pick one in
the kernel dropdown (`R · ggtree`, `R · hdWGCNA`, …). An env that has Python and
R together is reported to the agent by `dsh-envsel` 0.3.1, which now states the
Rscript of the selected python environment.

## `nbformat` is no longer a dependency

Opening a notebook used to `import nbformat` inside the sidecar, and the sidecar
runs on *the interpreter you selected*. Any conda env with `ipykernel` +
`jupyter_client` but without `nbformat` therefore failed on open with:

```
Operation failed: No module named 'nbformat'
```

That is a common shape — `nbformat` is not an `ipykernel` dependency — and a lean
or R-only environment can never have it. Reading and writing `.ipynb` now uses
the standard library and is **byte-identical** to `nbformat.write()`: same
`indent=1` / `sort_keys` / `ensure_ascii=False`, same line-list form for
multi-line strings, same rule that only `text/*` mime payloads are split,
`image/png` base64 kept as one string, same CRLF and trailing newline. Files do
not churn in git.

`jupyter_client` and `ipykernel` remain genuine requirements; a missing one is
now reported as such (and the kernel dropdown marks the env unavailable) instead
of surfacing a raw `ModuleNotFoundError`.

## Lossless notebook round-trip

Anything the plugin does not model survives a load → save cycle: markdown
`attachments` (pasted images), per-output `metadata` (widget view sizes),
`metadata.widgets` state, vendor keys. Outputs the file format does not allow
(`update_display_data`) collapse to `display_data`; duplicate or missing cell ids
are regenerated so the result always passes `nbformat.validate`.

`nbformat` **3** notebooks — `worksheets` / `input` / `prompt_number` and the
`png`/`html`/`json` mime aliases — are upgraded on read (mirroring
`nbformat.v4.convert`) instead of being read as an empty notebook and wiped on
the next save. 4.0–4.4 files gain stable cell ids exactly as
`nbformat.read(as_version=4)` does, with `orig_nbformat_minor` recorded.
A document that is neither v4 nor v3-shaped is rejected instead of being treated
as empty.

## The hybrid-CPU hint can be reopened

Dismissing it used to be permanent for the browser session, with no entry point
anywhere. The CPU probe result now stays in the session and a
`⚡ 大小核` / `⚡ Hybrid CPU` toolbar button reopens the same panel — only the
*automatic* popup remains dismissed.

## Verification

- `tmp/verify-ipynb-io.py` — 52 checks: byte-identity with `nbformat.write`,
  `nbformat.validate` acceptance, attachments/widgets/`application/json`/
  update_display_data round-trip, v3 upgrade, 4.4 → 4.5, malformed input.
- `tmp/verify-sidecar-no-nbformat.py` — drives the real sidecar with an
  interpreter that genuinely lacks `nbformat` and loads/saves a notebook.
- `tmp/verify-r-kernel.py` — 19 checks through the real sidecar: start, execute,
  error path, `list_vars`, `inspect_object` on a `data.frame`, restart.
- `tmp/verify-0.4.0.mjs` — extracts the shipped discovery functions and runs them
  against the real machine (R kernels resolve to real binaries with a valid
  `R_HOME`; envs without `IRkernel` are not offered; one R binary is not listed
  twice).

## Compatibility

Unchanged: `@deepseek-ai/dsh-tools: ^0.1.0-rc.6 || ^0.2.0-rc.1`, verified against
DSH `0.2.0-rc.2`. Existing notebooks, tools and UI are unaffected.
