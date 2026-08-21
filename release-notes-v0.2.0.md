## What's New in v0.2.0

### Per-Session Isolation
Each DSH session now owns an independent notebook, kernel, and working directory. Multiple sessions can run kernels simultaneously without state leakage.

### Kernel Manager
A new toolbar popup lists all active kernels across sessions — session ID, kernel name, and status. Close any session's kernel directly from the manager.

### Kernel Activity Indicator
A status bar shows whether the current session's kernel is active and warns when multiple sessions have kernels running (memory / resource awareness).

### Parent Watchdog (Orphan Cleanup)
If `dsh web` is force-killed, the Python sidecar detects parent-process death and automatically shuts down its `ipykernel` — no orphan processes left behind.
- **POSIX** (Linux/macOS): `getppid()` reparent detection
- **Windows**: `ctypes.OpenProcess` query (NOT `os.kill`, which kills on Windows)

### Bilingual UI (EN / 中文)
The entire interface now defaults to **English** with a one-click language toggle in the toolbar. Your language choice persists across sessions via `localStorage`.

### Bug Fix
Fixed a critical crash where the parent watchdog's `os.kill(parent, 0)` on Windows called `TerminateProcess` and killed the `dsh web` main process ~2 seconds after any cell execution. Replaced with `ctypes.OpenProcess(SYNCHRONIZE, ...)` which queries without killing.

---

**Full Changelog**: https://github.com/beihzb/dsh-notebook/compare/v0.1.3...v0.2.0
