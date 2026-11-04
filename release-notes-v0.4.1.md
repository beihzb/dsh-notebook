# dsh-notebook v0.4.1

Four community fixes (thank you [@Enlux](https://github.com/Enlux)) plus the R
kernel work from 0.4.0, in the first build published to npm.

> 0.4.0 was tagged and released on GitHub but never reached npm; the fixes below
> landed before the publish, so 0.4.1 is the first installable build that
> contains both.

## Session cwd sync no longer kills the kernel (#6)

A freshly mounted notebook view synced the session's cwd with
`killSidecar(); await ensureKernel()`. Two consequences:

- every variable was discarded, and a running cell was interrupted, just because
  the view mounted;
- it fired *spuriously*, because the session state was created from
  `initialWorkspaceRoot` — read once at plugin activation — rather than from the
  session's real cwd.

Now: new state is seeded from `SessionHeader.cwd`, and both the sync and
`nb_set_cwd` change the directory **in place** through a new driver `chdir`
command. That command goes through the sequential shell channel with
`store_history=False`, so it queues behind any in-flight cell and never touches
the execution counter — the directory changes when the queue drains, and
variables survive.

The PR's snippet was Python-only (`import os; os.chdir(...)`), which would have
thrown in an R kernel; the shipped version picks `setwd()` there. Its
`cwdHint` parameter was also threaded through 28 `registerTool` call sites — here
it is injected once, in the shared tool wrapper.

## `/nb` routes are authenticated and body-bounded (#3)

The notebook's HTTP routes had no admission control: any local process, or any
website via a cross-origin form POST, could drive the kernel and execute
arbitrary Python. Every route now asks the `connection` service for a rejection
first — the same Host/Origin + login-cookie fence the platform puts in front of
`/api` — and `readJson` caps bodies at 32 MB instead of accumulating without
limit.

## No Promise leak into tool output (#5)

The in-flight run Promise was stored on the cell object, so while a cell was
queued or running, every snapshot — and therefore `nb_get`, `nb_edit_cell`, a
background `nb_run_cell` — carried a live Promise. The GUI's `JSON.stringify`
silently dropped it, but the agent-tool pipeline validates lossless JSON and
rejected it. Jobs now live in a side `Map` keyed by cell id, and snapshots strip
a stray `_runJob` if one ever appears again.

## No false hybrid-CPU warning on servers (#4)

The Linux fallback guessed "hybrid" from a `cpu MHz` max−min gap above 300. That
is true of every frequency-scaling CPU: an idle EPYC/Xeon core sits below
1.5 GHz while a busy sibling boosts past 3 GHz, so homogeneous servers showed the
P+E advisory. Only an explicit per-core `core_type` marker counts now; a CPU
that does not expose it reports no hybrid topology.

## Verification

- `tmp/verify-chdir.py` — starts a real Python kernel, defines a variable, runs
  `chdir`, then asserts the directory moved **and the variable survived** (proof
  it was not a restart) and the execution counter was untouched.
- `tmp/verify-r-kernel.py` — extended with the R branch of `chdir` (`setwd`), plus
  `exists("x")` still true afterwards.
- `tmp/verify-ipynb-io.py` (52), `tmp/verify-0.4.0.mjs`, `tmp/verify-0.3.1.mjs`
  — unchanged and still green after the merges.
