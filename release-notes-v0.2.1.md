# v0.2.1

Bug-fix + polish release.

## Fixes

- **Plugin now loads when installed as `@beihaizb/dsh-notebook`** ([#1](https://github.com/beihzb/dsh-notebook/issues/1))
  - `cordis.patch.yml` referenced the unscoped `dsh-notebook`, which could not resolve against the scoped npm package, taking down the whole plugin tree (`Failed to load plugins`).
  - Both the host patch `name` and the client self-register `id` now use `@beihaizb/dsh-notebook`, matching `@beihaizb/dsh-envsel`'s working setup.
- **"Hand to AI" now actually reaches the agent**
  - A local variable (`var t`) shadowed the i18n translator `t()` after the v0.2.0 i18n refactor, throwing `TypeError` before the draft was submitted — the AI never received the cell code or request. Renamed the local to `txt`.

## Improvements

- **Theme-aware cell editor**: the CodeMirror editor follows the DSH light/dark theme — oneDark in dark mode, a clean light scheme with soft-gray line numbers in light mode — and re-themes live (MutationObserver) when you switch themes.
- **Localized CPU-hint snippet**: the copy-ready `psutil` snippet's comments now follow the UI language (EN / 中文) instead of being hardcoded Chinese.
- `@codemirror/language` added as an explicit dependency for the light-mode syntax highlighting.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.
