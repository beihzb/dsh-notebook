# v0.3.1

The default kernel now follows **the current session's** `dsh-envsel` selection, and a session with no selection of its own — every delegated subagent — inherits the nearest selecting session it descends from.

## The bug

`defaultKernelEntry()` resolved the envsel environment through `envselPython()`, which had two problems:

1. **It never found the session.** The function read `process.env.DSH_ENV_PYTHON` first, then fell back to reading `~/.dsh/envsel-state.json` and taking **the last entry in the file**, ignoring the session entirely:

   ```js
   const selections = Object.values((doc && doc.selections) || {})
   for (let i = selections.length - 1; i >= 0; i--) { … }   // ← whichever session was appended last
   ```

   The store is keyed by session id and appended in creation order, so "last" means *the most recently created session that picked anything* — an unrelated session. Pick an environment in one new session, and every notebook's default kernel followed it.

2. **`process.env.DSH_ENV_PYTHON` can never be set.** The harness resolves `DSH_ENV_*` through the `shellEnv` registry **per shell execution** and passes the result to that one child process; it never writes them into the DSH host process. So that first branch was dead, and the file fallback was the only path taken.

A delegated subagent fared worse than "wrong": DSH gives every subagent its own session (`origin: "subagent"`, `delegationDepth: 1`), so it matched nothing at all and silently got the first ipykernel-capable environment.

## The fix

- **Resolve per session, then by lineage.** The interpreter is resolved for the addressed session: its own `envsel-state.json` entry first, then the nearest entry owned by a session it descends from, recorded from `exec.agent.session.header.parentSession` on each notebook tool call. The walk is bounded (8 hops), breaks on a repeated id, and yields `null` when nothing matches — in which case the plugin falls back to the first `ipykernel`-capable environment as before.
- **Version-checked store read.** The document's `version` must be `1`; an unrecognized shape is ignored rather than misread, since this plugin does not own that schema.
- **`$DSH_HOME` is honoured** instead of a hard-coded `~/.dsh`.
- **Short read memo (2 s)** so status polling does not hit the disk on every snapshot.
- Every per-session entry point is now session-aware: the sidecar spawn (`pythonExe`), kernel start (`ensureKernel`) and the public snapshot. The session-independent CPU probe keeps its old behaviour deliberately.

## Compatibility

No manifest change: `peerDependencies` still read `@deepseek-ai/dsh-tools: ^0.1.0-rc.6 || ^0.2.0-rc.1`, and the client bundle is untouched. This release is host-side only (`lib/index.js`).

`dsh-envsel` remains optional. Pair it with **`@beihaizb/dsh-envsel@0.3.0`**, which is where the selection also starts reaching the model as text; this release is what makes the *notebook kernel* agree with it.

## Verification

`tmp/verify-0.3.1.mjs` (no browser, no DSH needed) extracts the **actual shipped functions** from `lib/index.js` and runs them in a controlled sandbox — 25 checks, all passing:

- source assertions: session-aware entry points present, the "last entry" loop gone, version stamp checked, `DSH_HOME` honoured, the session-independent probe preserved;
- behaviour: own entry wins; immediate parent inherited; unselected intermediates skipped; nearest ancestor wins; empty lineage returns `null`; a foreign store version returns `null`; a missing interpreter file is not adopted; inheritance works within the hop bound and stops past it; a lineage cycle terminates; the read memo expires after its TTL.

## Install

```bash
dsh plugin --profile web add @beihaizb/dsh-notebook@0.3.1
```

Then restart `dsh web`.

> **Version pinning**: if you install shortly after this release, pnpm's supply-chain policy (`minimumReleaseAge`) may skip the just-published version and install an older one. Pin the version explicitly (`@beihaizb/dsh-notebook@0.3.1`), or use `@latest` once the release is older than the policy window.
