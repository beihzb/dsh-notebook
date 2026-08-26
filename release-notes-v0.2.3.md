# v0.2.3

ANSI escape codes no longer leak into the notebook output area (fixes [#2](https://github.com/beihzb/dsh-notebook/issues/2)).

## Fixes

- **ANSI stream output rendered verbatim (issue #2)**: kernel stream text containing ANSI escape sequences without `\r` (e.g. `\x1b[32m...\x1b[0m`) was rendered raw — the user saw literal `[32m` / `[0m` garbage. Root cause: `OutputView`'s stream branch already computed the stripped string via `renderStreamText`, but the render line `(r && r.tail) || o.text` discarded it whenever `r` was a string (no `\r`) and fell back to the raw `o.text`. The stripped result is now used for string results; `\r`-style streams (tqdm progress) are unchanged.
  - Real-world impact: **IPython's colored Pdb** (`ipdb>` prompt, source lines wrapped in `\x1b[32m...`) and `colorama`-style colored prints rendered as `[32m...` garbage.
- **ANSI in error titles (`evalue`)**: `TracebackView` stripped ANSI from traceback lines but not from the error message itself (`ValueError: \x1b[31m...`), so colored exception messages leaked the same way. Now stripped too.
- **`\r` stream with an empty last segment**: a stream ending in a bare `\r` (line cleared) previously fell back to the raw text; it now renders as empty, which is the correct visual state.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook@0.2.3
```

Then restart `dsh web`. A **Notebook** tab appears at the top of the session.

> **Version pinning**: if you install shortly after this release, pnpm's supply-chain policy (`minimumReleaseAge`) may skip the just-published version and install an older one. Pin the version explicitly (`@beihaizb/dsh-notebook@0.2.3`), or use `@latest` once the release is older than the policy window.
