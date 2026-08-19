// Host half of dsh-notebook. Spawns python/kernel_driver.py as a persistent
// jupyter_client sidecar and registers nb_* tools + /nb/* HTTP routes.

import { defineTool } from "@deepseek-ai/dsh-tools"
import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"
import { dirname, join, basename, extname, resolve as pathResolve } from "node:path"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { homedir } from "node:os"

export const name = "dsh-notebook"
export const inject = ["tools", "webServer"]

const HERE = dirname(fileURLToPath(import.meta.url))
const DRIVER = join(HERE, "..", "python", "kernel_driver.py")

function nowIso() {
  return new Date().toISOString()
}

function newId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10)
}

function emptyNotebook(title) {
  return {
    cells: [
      {
        id: newId("cell"),
        cell_type: "code",
        source: "",
        outputs: [],
        metadata: { dsh: { suggestions: [], versions: [] } },
        execution_count: null,
        status: "idle",
      },
    ],
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python" },
      dsh: { title: title || "untitled", createdAt: nowIso() },
    },
    nbformat: 4,
    nbformat_minor: 5,
    path: null,
    dirty: true,
  }
}

function ensureDshMeta(cell) {
  cell.metadata = cell.metadata || {}
  cell.metadata.dsh = cell.metadata.dsh || { suggestions: [], versions: [] }
  cell.metadata.dsh.suggestions = cell.metadata.dsh.suggestions || []
  cell.metadata.dsh.versions = cell.metadata.dsh.versions || []
  return cell
}

export function apply(ctx) {
  const tools = ctx.tools
  const webServer = ctx.webServer
  if (!tools) return

  const workspaceRoot = (ctx.get("sandboxPolicy") && ctx.get("sandboxPolicy").workspaceRoot) || process.cwd()
  const notebooksDir = join(workspaceRoot, "notebooks")

  const state = {
    notebook: emptyNotebook("untitled"),
    sidecar: null,
    kernel: { alive: false, interpreter: null, name: null, id: null, starting: false },
    cwd: workspaceRoot,
    execQueue: Promise.resolve(),
    runGen: 0,
    savedAt: null,
  }

  function envselPython() {
    if (process.env.DSH_ENV_PYTHON && existsSync(process.env.DSH_ENV_PYTHON)) {
      return process.env.DSH_ENV_PYTHON
    }
    try {
      const raw = readFileSync(join(homedir(), ".dsh", "envsel-state.json"), "utf8")
      const doc = JSON.parse(raw)
      const selections = Object.values((doc && doc.selections) || {})
      for (let i = selections.length - 1; i >= 0; i--) {
        const py = selections[i] && selections[i].python
        const cmd = py && (py.pythonCommand || py.python)
        if (cmd && existsSync(cmd)) return cmd
      }
    } catch {
      /* envsel state is optional */
    }
    return null
  }

  function pythonFromPrefix(prefix) {
    const cands = [
      join(prefix, "python.exe"),
      join(prefix, "Scripts", "python.exe"),
      join(prefix, "bin", "python.exe"),
      join(prefix, "bin", "python"),
      join(prefix, "bin", "python3"),
    ]
    for (const c of cands) if (existsSync(c)) return c
    return null
  }

  function hasIpykernel(prefix) {
    const direct = [
      join(prefix, "Lib", "site-packages", "ipykernel"),
      join(prefix, "lib", "site-packages", "ipykernel"),
    ]
    for (const c of direct) if (existsSync(c)) return true
    const lib = join(prefix, "lib")
    if (!existsSync(lib)) return false
    try {
      for (const n of readdirSync(lib)) {
        if (n.indexOf("python") === 0 && existsSync(join(lib, n, "site-packages", "ipykernel"))) return true
      }
    } catch {
      /* ignore unreadable lib dir */
    }
    return false
  }

  function condaPrefixes() {
    const out = []
    const seen = new Set()
    function add(p) {
      if (!p) return
      const n = String(p).replace(/[\\/]+$/, "")
      const key = n.toLowerCase()
      if (seen.has(key) || !existsSync(n)) return
      seen.add(key)
      out.push(n)
    }
    const envTxt = join(homedir(), ".conda", "environments.txt")
    if (existsSync(envTxt)) {
      for (const line of readFileSync(envTxt, "utf8").split(/\r?\n/)) add(line.trim())
    }
    const envsDir = join(homedir(), ".conda", "envs")
    if (existsSync(envsDir)) {
      try {
        for (const n of readdirSync(envsDir)) add(join(envsDir, n))
      } catch {
        /* ignore */
      }
    }
    add("C:\\ProgramData\\anaconda3")
    add(join(homedir(), "anaconda3"))
    add(join(homedir(), "miniconda3"))
    return out
  }

  function kernelIdFor(prefix, python) {
    const base = prefix ? String(prefix).split(/[\\/]/).filter(Boolean).pop() : "python"
    return "conda:" + base + ":" + String(python || "").slice(-24)
  }

  let kernelCache = { at: 0, kernels: null }
  function listKernels() {
    if (kernelCache.kernels && Date.now() - kernelCache.at < 15000) return kernelCache.kernels
    const kernels = []
    for (const prefix of condaPrefixes()) {
      const python = pythonFromPrefix(prefix)
      if (!python) continue
      const name = String(prefix).split(/[\\/]/).filter(Boolean).pop() || prefix
      kernels.push({
        id: kernelIdFor(prefix, python),
        name,
        kind: "conda",
        prefix,
        python,
        hasIpykernel: hasIpykernel(prefix),
        display: name + "  ·  " + python,
      })
    }
    kernels.sort((a, b) => {
      if (a.hasIpykernel !== b.hasIpykernel) return a.hasIpykernel ? -1 : 1
      return String(a.name).localeCompare(String(b.name))
    })
    kernelCache = { at: Date.now(), kernels }
    return kernels
  }

  function defaultKernelEntry() {
    const kernels = listKernels()
    const envsel = envselPython()
    if (envsel) {
      const hit = kernels.find((k) => k.python.toLowerCase() === envsel.toLowerCase())
      if (hit) return hit
      return {
        id: "envsel",
        name: "envsel",
        kind: "envsel",
        prefix: dirname(envsel),
        python: envsel,
        hasIpykernel: true,
        display: envsel,
      }
    }
    return kernels.find((k) => k.hasIpykernel) || kernels[0] || {
      id: "python",
      name: "python",
      kind: "system",
      prefix: "",
      python: "python",
      hasIpykernel: true,
      display: "python",
    }
  }

  function pythonExe() {
    return (state.kernel && state.kernel.interpreter) || defaultKernelEntry().python
  }

  function killSidecar() {
    if (!state.sidecar || !state.sidecar.child) return
    try {
      state.sidecar.child.stdin.write(JSON.stringify({ id: "bye", cmd: "stop" }) + "\n")
    } catch {
      /* already gone */
    }
    try {
      state.sidecar.child.kill()
    } catch {
      /* already gone */
    }
    state.sidecar = null
    state.kernel.alive = false
  }

  function ensureSidecar() {
    if (state.sidecar && state.sidecar.child && !state.sidecar.child.killed) {
      return state.sidecar
    }
    const exe = pythonExe()
    const child = spawn(exe, [DRIVER], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      cwd: state.cwd || workspaceRoot,
      env: Object.assign({}, process.env, {
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
        PYTHONLEGACYWINDOWSSTDIO: "0",
      }),
    })
    if (child.stdout && child.stdout.setEncoding) child.stdout.setEncoding("utf8")
    if (child.stderr && child.stderr.setEncoding) child.stderr.setEncoding("utf8")
    if (child.stdin && child.stdin.setDefaultEncoding) child.stdin.setDefaultEncoding("utf8")
    const pending = new Map()
    const rl = createInterface({ input: child.stdout })
    rl.on("line", (line) => {
      const text = String(line || "").trim()
      if (!text) return
      let msg
      try {
        msg = JSON.parse(text)
      } catch {
        return
      }
      const id = msg && msg.id
      const item = id && pending.get(id)
      if (msg && msg.event === "progress") {
        if (item && item.onProgress) {
          try { item.onProgress(msg) } catch { /* progress is best-effort */ }
        }
        return
      }
      if (item) {
        pending.delete(id)
        item.resolve(msg)
      }
    })
    child.on("exit", () => {
      for (const { resolve } of pending.values()) {
        resolve({ ok: false, error: "sidecar exited" })
      }
      pending.clear()
      if (state.sidecar && state.sidecar.child === child) {
        state.sidecar = null
        state.kernel.alive = false
      }
    })
    child.stderr.on("data", () => {})
    const sidecar = {
      child,
      pending,
      request(cmd, args, timeoutMs, opts) {
        const id = newId("req")
        const payload = Object.assign({ id, cmd }, args || {})
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.delete(id)
            reject(new Error("sidecar timeout: " + cmd))
          }, timeoutMs || 180000)
          pending.set(id, {
            onProgress: opts && opts.onProgress,
            resolve: (msg) => {
              clearTimeout(timer)
              resolve(msg)
            },
          })
          try {
            child.stdin.write(JSON.stringify(payload) + "\n", "utf8")
          } catch (err) {
            clearTimeout(timer)
            pending.delete(id)
            reject(err)
          }
        })
      },
    }
    state.sidecar = sidecar
    return sidecar
  }

  function friendlyKernelError(err) {
    const msg = String((err && err.message) || err || "")
    const exe = state.kernel.interpreter || "python"
    if (/No module named ['"]?ipykernel|ipykernel[\s\S]*not/i.test(msg) || /ModuleNotFoundError/.test(msg)) {
      return "该环境缺少 ipykernel，请先安装：\n" + exe + " -m pip install ipykernel\n（原始错误：" + msg.slice(0, 200) + "）"
    }
    if (/ENOENT|spawn .* ENOENT|not found/i.test(msg)) {
      return "找不到 Python 解释器：\n" + exe + "\n请在内核下拉框里重新选择环境。"
    }
    if (/timed? ?out|timeout/i.test(msg)) {
      return "内核启动超时（30 秒）。可能是该环境较慢或损坏，请换一个环境试试。"
    }
    return "内核启动失败：" + (msg.slice(0, 300) || "未知错误")
  }

  async function ensureKernel() {
    if (state.kernel.alive) return { ok: true, interpreter: state.kernel.interpreter }
    if (state.kernel.starting) {
      // wait briefly for in-flight start
      for (let i = 0; i < 50; i++) {
        await new Promise((r) => setTimeout(r, 200))
        if (state.kernel.alive) return { ok: true, interpreter: state.kernel.interpreter }
      }
    }
    state.kernel.starting = true
    try {
      const entry = defaultKernelEntry()
      if (!state.kernel.interpreter) {
        state.kernel.interpreter = entry.python
        state.kernel.name = entry.name
        state.kernel.id = entry.id
      }
      const sc = ensureSidecar()
      const exe = state.kernel.interpreter
      const res = await sc.request("start", { interpreter: exe, cwd: state.cwd || workspaceRoot }, 60000)
      if (!res || !res.ok) throw new Error((res && res.error) || "kernel start failed")
      state.kernel.alive = true
      state.kernel.interpreter = res.interpreter || exe
      return { ok: true, interpreter: state.kernel.interpreter }
    } catch (e) {
      throw new Error(friendlyKernelError(e))
    } finally {
      state.kernel.starting = false
    }
  }

  function findCell(cellId) {
    return (state.notebook.cells || []).find((c) => c.id === cellId)
  }

  function snapshotPublic() {
    if (!state.kernel.id || !state.kernel.interpreter) {
      const entry = defaultKernelEntry()
      state.kernel.interpreter = state.kernel.interpreter || entry.python
      state.kernel.name = state.kernel.name || entry.name
      state.kernel.id = state.kernel.id || entry.id
    }
    const kernels = listKernels().slice()
    if (state.kernel.interpreter && !kernels.some((k) => k.id === state.kernel.id || k.python === state.kernel.interpreter)) {
      kernels.unshift({
        id: state.kernel.id || "current",
        name: state.kernel.name || "current",
        kind: "current",
        prefix: "",
        python: state.kernel.interpreter,
        hasIpykernel: true,
        display: state.kernel.interpreter,
      })
    }
    return {
      path: state.notebook.path,
      dirty: !!state.notebook.dirty,
      savedAt: state.savedAt || null,
      metadata: state.notebook.metadata,
      cells: state.notebook.cells,
      kernel: {
        alive: state.kernel.alive,
        interpreter: state.kernel.interpreter,
        name: state.kernel.name,
        id: state.kernel.id,
        starting: !!state.kernel.starting,
        busy: (state.notebook.cells || []).some((c) => c.status === "running" || c.status === "queued"),
      },
      kernels,
      cwd: state.cwd,
      workspaceRoot,
    }
  }

  async function listDir(args) {
    const raw = String((args && args.dir) || state.cwd || notebooksDir || workspaceRoot)
    const abs = pathResolve(raw)
    if (!existsSync(abs)) throw new Error("directory not found: " + abs)
    let names = []
    try {
      names = readdirSync(abs)
    } catch (e) {
      throw new Error("cannot read directory: " + abs)
    }
    const dirs = []
    const notebooks = []
    for (const n of names) {
      if (n === "." || n === "..") continue
      const p = join(abs, n)
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      if (st.isDirectory()) dirs.push({ name: n, path: p })
      else if (n.toLowerCase().endsWith(".ipynb")) {
        notebooks.push({ name: n, path: p, mtime: st.mtime.toISOString() })
      }
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name))
    notebooks.sort((a, b) => a.name.localeCompare(b.name))
    const parent = dirname(abs)
    return {
      dir: abs,
      parent: parent !== abs ? parent : null,
      dirs,
      notebooks,
      current: snapshotPublic(),
    }
  }

  async function listNotebooks(args) {
    const dir = (args && args.dir) || notebooksDir
    try {
      await mkdir(dir, { recursive: true })
    } catch {
      /* directory may already exist */
    }
    return listDir({ dir })
  }

  async function setCwd(args) {
    const raw = String((args && args.dir) || "").trim()
    if (!raw) throw new Error("dir required")
    const abs = pathResolve(raw)
    if (!existsSync(abs) || !statSync(abs).isDirectory()) throw new Error("not a directory: " + abs)
    state.cwd = abs
    if (state.kernel.alive) {
      killSidecar()
      await ensureKernel()
    }
    return snapshotPublic()
  }

  async function newNotebook(args) {
    const title = (args && args.title) || "untitled"
    state.notebook = emptyNotebook(title)
    state.savedAt = null
    return snapshotPublic()
  }

  async function openNotebook(args) {
    const raw = String((args && args.path) || "")
    if (!raw) throw new Error("path required")
    const abs = pathResolve(raw)
    const sc = ensureSidecar()
    const res = await sc.request("load_ipynb", { path: abs }, 30000)
    if (!res || !res.ok) throw new Error((res && res.error) || "failed to load ipynb")
    const cells = (res.cells || []).map((c, i) => {
      const cell = ensureDshMeta({
        id: c.id || newId("cell"),
        cell_type: c.cell_type || "code",
        source: c.source || "",
        outputs: c.outputs || [],
        metadata: c.metadata || {},
        execution_count: c.execution_count || null,
        status: (c.outputs || []).some((o) => o.type === "error" || o.error)
          ? "error"
          : (c.execution_count ? "ok" : "idle"),
      })
      if (!cell.id) cell.id = newId("cell") + "-" + i
      return cell
    })
    if (cells.length === 0) cells.push(emptyNotebook().cells[0])
    state.notebook = {
      cells,
      metadata: res.metadata || {},
      nbformat: res.nbformat || 4,
      nbformat_minor: res.nbformat_minor || 5,
      path: abs,
      dirty: false,
    }
    const savedCwd = res.metadata && res.metadata.dsh && res.metadata.dsh.cwd
    const nextCwd = savedCwd && existsSync(savedCwd) ? savedCwd : dirname(abs)
    if (nextCwd && nextCwd !== state.cwd) {
      state.cwd = nextCwd
      if (state.kernel.alive) {
        killSidecar()
      }
    }
    return snapshotPublic()
  }

  async function saveNotebook(args) {
    let dest = (args && args.path) || state.notebook.path
    if (!dest) {
      const dir = (args && args.dir) || state.cwd || notebooksDir
      await mkdir(dir, { recursive: true })
      let title = String((args && args.name) || (state.notebook.metadata && state.notebook.metadata.dsh && state.notebook.metadata.dsh.title) || "untitled")
      title = title.replace(/\.ipynb$/i, "").replace(/[<>:\"|?*]+/g, "_").slice(0, 80) || "untitled"
      dest = join(dir, title + ".ipynb")
    }
    dest = pathResolve(dest)
    if (!String(dest).toLowerCase().endsWith(".ipynb")) dest = dest + ".ipynb"
    await mkdir(dirname(dest), { recursive: true })
    if (state.notebook.metadata && state.notebook.metadata.dsh) {
      state.notebook.metadata.dsh.title = basename(dest).replace(/\.ipynb$/i, "")
      state.notebook.metadata.dsh.cwd = state.cwd
    }
    const sc = ensureSidecar()
    const res = await sc.request(
      "save_ipynb",
      {
        path: dest,
        cells: state.notebook.cells,
        metadata: state.notebook.metadata,
      },
      30000
    )
    if (!res || !res.ok) throw new Error((res && res.error) || "failed to save ipynb")
    state.notebook.path = dest
    state.notebook.dirty = false
    state.savedAt = Date.now()
    if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null }
    return { ok: true, path: dest, current: snapshotPublic() }
  }

  async function addCell(args) {
    const after = args && args.after
    const cellType = args && args.cell_type === "markdown" ? "markdown" : "code"
    const cell = ensureDshMeta({
      id: newId("cell"),
      cell_type: cellType,
      source: (args && args.source) || "",
      outputs: [],
      metadata: {},
      execution_count: null,
      status: "idle",
    })
    const cells = state.notebook.cells
    const idx = after ? cells.findIndex((c) => c.id === after) : cells.length - 1
    const at = idx >= 0 ? idx + 1 : cells.length
    cells.splice(at, 0, cell)
    markDirty()
    return { cell, index: at, current: snapshotPublic() }
  }

  async function deleteCell(args) {
    const cellId = args && args.cellId
    const cells = state.notebook.cells
    const idx = cells.findIndex((c) => c.id === cellId)
    if (idx < 0) throw new Error("cell not found: " + cellId)
    if (cells.length === 1) throw new Error("cannot delete the last cell")
    const removed = cells.splice(idx, 1)[0]
    markDirty()
    return { deleted: removed.id, current: snapshotPublic() }
  }

  async function moveCell(args) {
    const cellId = args && args.cellId
    const dir = (args && args.dir) || 0
    const cells = state.notebook.cells
    const idx = cells.findIndex((c) => c.id === cellId)
    if (idx < 0) throw new Error("cell not found: " + cellId)
    const to = idx + (dir > 0 ? 1 : -1)
    if (to < 0 || to >= cells.length) return { moved: false, current: snapshotPublic() }
    const tmp = cells[idx]
    cells[idx] = cells[to]
    cells[to] = tmp
    markDirty()
    return { moved: true, from: idx, to, current: snapshotPublic() }
  }

  async function editCell(args) {
    const cell = findCell(args && args.cellId)
    if (!cell) throw new Error("cell not found: " + (args && args.cellId))
    ensureDshMeta(cell)
    if (args && args.source !== undefined) {
      cell.metadata.dsh.versions.push({
        at: nowIso(),
        source: cell.source,
        reason: (args && args.reason) || "edit",
      })
      if (cell.metadata.dsh.versions.length > 20) cell.metadata.dsh.versions.shift()
      cell.source = String(args.source)
    }
    if (args && args.cell_type) cell.cell_type = args.cell_type
    markDirty()
    return { cell, current: snapshotPublic() }
  }

  function bumpRunGen() {
    state.runGen += 1
    return state.runGen
  }

  let autosaveTimer = null
  function markDirty() {
    state.notebook.dirty = true
    scheduleAutoSave()
  }
  function scheduleAutoSave() {
    if (!state.notebook.path) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(function () {
      autosaveTimer = null
      if (!state.notebook.dirty || !state.notebook.path) return
      const busy = (state.notebook.cells || []).some((c) => c.status === "queued" || c.status === "running")
      if (busy) { scheduleAutoSave(); return }
      saveNotebook({ path: state.notebook.path }).catch(function () {})
    }, 2500)
  }

  function applyOutputs(cell, outputs) {
    cell.outputs = Array.isArray(outputs) ? outputs.slice() : []
    markDirty()
  }

  function cancelQueuedCells() {
    for (const cell of state.notebook.cells || []) {
      if (cell.status === "queued") {
        cell.status = cell.execution_count ? "ok" : "idle"
        cell.queuedAt = null
        cell.startedAt = null
      }
    }
  }

  async function executeOne(cell, args) {
    const gen = state.runGen
    await ensureKernel()
    if (state.runGen !== gen || cell.status !== "queued") return { cell, current: snapshotPublic() }
    cell.status = "running"
    cell.startedAt = Date.now()
    cell.outputs = []
    markDirty()
    const sc = ensureSidecar()
    const timeout = (args && args.timeout) || 180
    const t0 = Date.now()
    const res = await sc.request(
      "execute",
      { code: cell.source, timeout },
      (timeout + 15) * 1000,
      {
        onProgress: function (msg) {
          if (state.runGen !== gen || cell.status !== "running") return
          if (msg && msg.outputs) applyOutputs(cell, msg.outputs)
        },
      }
    )
    if (state.runGen !== gen) return { cell, current: snapshotPublic() }
    cell.durationMs = Date.now() - t0
    cell.startedAt = null
    cell.queuedAt = null
    if (!res || !res.ok) {
      cell.status = "error"
      applyOutputs(cell, [{ type: "error", error: { ename: "SidecarError", evalue: (res && res.error) || "execute failed", traceback: [] } }])
      return { cell, current: snapshotPublic() }
    }
    cell.status = res.status === "ok" ? "ok" : "error"
    applyOutputs(cell, res.outputs || [])
    if (res.error && !(cell.outputs || []).some((o) => o.type === "error" || o.error)) {
      cell.outputs.push({ type: "error", error: res.error })
    }
    if (res.execution_count != null) cell.execution_count = res.execution_count
    return { cell, status: cell.status, durationMs: cell.durationMs, current: snapshotPublic() }
  }

  function enqueueRun(cell, args) {
    if (cell.status === "queued" || cell.status === "running") {
      return Promise.resolve({ cell, current: snapshotPublic() })
    }
    cell.status = "queued"
    cell.queuedAt = Date.now()
    cell.startedAt = null
    const queuedGen = state.runGen
    const job = state.execQueue.then(function () {
      if (state.runGen !== queuedGen || cell.status !== "queued") return { cell, current: snapshotPublic() }
      return executeOne(cell, args)
    }).catch(function (err) {
      cell.status = "error"
      cell.startedAt = null
      cell.queuedAt = null
      applyOutputs(cell, [{ type: "error", error: { ename: "SidecarError", evalue: String(err && err.message ? err.message : err), traceback: [] } }])
      return { cell, current: snapshotPublic() }
    })
    state.execQueue = job.then(function () {}, function () {})
    return job
  }

  async function runCell(args) {
    const cell = findCell(args && args.cellId)
    if (!cell) throw new Error("cell not found: " + (args && args.cellId))
    if (cell.cell_type !== "code") return { cell, skipped: true, current: snapshotPublic() }
    const wait = !!(args && args.wait)
    const job = enqueueRun(cell, args)
    if (wait) return job
    return { queued: true, cellId: cell.id, current: snapshotPublic() }
  }

  async function runAll(args) {
    const wait = !!(args && args.wait)
    const jobs = []
    for (const cell of state.notebook.cells) {
      if (cell.cell_type !== "code") continue
      jobs.push(enqueueRun(cell, args))
    }
    const settle = async function () {
      const results = []
      for (const job of jobs) {
        const r = await job
        results.push({ cellId: r.cell.id, status: r.cell.status })
        if (r.cell.status === "error") {
          cancelQueuedCells()
          bumpRunGen()
          break
        }
      }
      return { results, current: snapshotPublic() }
    }
    if (wait) return settle()
    settle().catch(function () {})
    return { queued: true, current: snapshotPublic() }
  }

  async function recordSuggestion(args) {
    const cell = findCell(args && args.cellId)
    if (!cell) throw new Error("cell not found: " + (args && args.cellId))
    ensureDshMeta(cell)
    const text = String((args && args.text) || "").trim()
    if (!text) throw new Error("empty suggestion")
    cell.metadata.dsh.suggestions.push({ at: nowIso(), text })
    markDirty()
    return { ok: true, cell, current: snapshotPublic() }
  }

  async function applySuggestion(args) {
    const rec = await recordSuggestion(args)
    return {
      ok: true,
      prompt:
        "[notebook] 对 cell `" +
        (args && args.cellId) +
        "` 的修改意见：" +
        String((args && args.text) || "").trim() +
        "。请用 nb_edit_cell 按意见改这段代码，再用 nb_run_cell 重跑该 cell。当前代码：\n```python\n" +
        rec.cell.source +
        "\n```",
      current: snapshotPublic(),
    }
  }

  function resetPendingCells() {
    bumpRunGen()
    for (const cell of state.notebook.cells || []) {
      if (cell.status === "queued" || cell.status === "running") {
        cell.status = cell.execution_count ? "ok" : "idle"
        cell.startedAt = null
        cell.queuedAt = null
      }
    }
  }

  function clearAllOutputs() {
    bumpRunGen()
    for (const cell of state.notebook.cells || []) {
      if (cell.cell_type !== "code") continue
      cell.status = "idle"
      cell.execution_count = null
      cell.outputs = []
      cell.durationMs = null
      cell.startedAt = null
      cell.queuedAt = null
    }
    markDirty()
    return snapshotPublic()
  }

  async function kernelRestart() {
    resetPendingCells()
    const sc = ensureSidecar()
    try {
      await sc.request("interrupt", {}, 4000)
    } catch {
      /* interrupt is best-effort before restart */
    }
    if (state.kernel.alive) {
      await sc.request("restart", {}, 30000)
    } else {
      await ensureKernel()
    }
    state.kernel.alive = true
    return { ok: true, current: snapshotPublic() }
  }

  async function kernelInterrupt() {
    if (!state.kernel.alive) return { ok: false, error: "kernel not running", current: snapshotPublic() }
    const sc = ensureSidecar()
    await sc.request("interrupt", {}, 10000)
    return { ok: true, current: snapshotPublic() }
  }

  async function kernelRestartAndRunAll(args) {
    await kernelRestart()
    return runAll(args || {})
  }

  async function kernelRestartAndClear() {
    const snap = clearAllOutputs()
    await kernelRestart()
    return { ok: true, current: snapshotPublic() || snap }
  }

  async function kernelStatus() {
    return snapshotPublic()
  }

  async function completeCode(args) {
    await ensureKernel()
    const sc = ensureSidecar()
    const code = String((args && args.code) || "")
    const cursorPos = args && args.cursor_pos != null ? Number(args.cursor_pos) : code.length
    const res = await sc.request(
      "complete",
      { code, cursor_pos: cursorPos, timeout: (args && args.timeout) || 5 },
      8000
    )
    if (!res || !res.ok) throw new Error((res && res.error) || "complete failed")
    return {
      matches: res.matches || [],
      items: res.items || [],
      cursor_start: res.cursor_start,
      cursor_end: res.cursor_end,
      status: res.status || "ok",
    }
  }

  async function inspectCode(args) {
    await ensureKernel()
    const sc = ensureSidecar()
    const code = String((args && args.code) || "")
    const cursorPos = args && args.cursor_pos != null ? Number(args.cursor_pos) : code.length
    const res = await sc.request(
      "inspect",
      {
        code,
        cursor_pos: cursorPos,
        detail_level: (args && args.detail_level) || 0,
        timeout: (args && args.timeout) || 5,
      },
      8000
    )
    if (!res || !res.ok) throw new Error((res && res.error) || "inspect failed")
    return {
      found: !!res.found,
      data: res.data || {},
      status: res.status || "ok",
    }
  }

  async function selectKernel(args) {
    const kernels = listKernels()
    let entry = null
    if (args && args.id) entry = kernels.find((k) => k.id === args.id)
    if (!entry && args && args.python) entry = kernels.find((k) => k.python === args.python)
    if (!entry && args && args.name) entry = kernels.find((k) => k.name === args.name)
    if (!entry && args && args.python && existsSync(args.python)) {
      entry = {
        id: "custom:" + args.python,
        name: basename(args.python),
        kind: "custom",
        prefix: dirname(args.python),
        python: args.python,
        hasIpykernel: true,
        display: args.python,
      }
    }
    if (!entry) throw new Error("kernel not found")
    resetPendingCells()
    killSidecar()
    state.kernel = {
      alive: false,
      interpreter: entry.python,
      name: entry.name,
      id: entry.id,
      starting: false,
    }
    await ensureKernel()
    if (state.notebook.metadata) {
      state.notebook.metadata.kernelspec = {
        display_name: entry.name,
        language: "python",
        name: entry.name,
      }
      markDirty()
    }
    return snapshotPublic()
  }

  function registerTool(name, description, parameters, execute) {
    const tool = defineTool({
      name,
      description,
      parameters,
      output: {
        schema: { type: "json" },
        render: function (_args, value) {
          return [{ type: "text", text: JSON.stringify(value, null, 2) }]
        },
      },
      execute: function (args) {
        return execute(args)
      },
    })
    ctx.effect(function () {
      return ctx.tools.register(tool)
    })
  }

  registerTool(
    "nb_list",
    "List .ipynb files under the workspace notebooks/ directory and return the current in-memory notebook snapshot.",
    {},
    listNotebooks
  )
  registerTool(
    "nb_new",
    "Create a new empty in-memory notebook (one blank code cell). Does not write disk until nb_save.",
    { title: { type: "string", description: "Optional notebook title." } },
    newNotebook
  )
  registerTool(
    "nb_open",
    "Open a .ipynb file into the current notebook editor (replaces the in-memory notebook).",
    { path: { type: "string", required: true, description: "Absolute or workspace-relative .ipynb path." } },
    openNotebook
  )
  registerTool(
    "nb_save",
    "Save the current notebook as a standard .ipynb (cell.metadata.dsh keeps suggestion/version history).",
    {
      path: { type: "string", description: "Destination path; defaults to last opened path or notebooks/<title>.ipynb." },
      name: { type: "string", description: "File name without directory (used when path is omitted)." },
      dir: { type: "string", description: "Directory to save into when path is omitted." },
    },
    saveNotebook
  )
  registerTool(
    "nb_add_cell",
    "Insert a code or markdown cell after a given cell (or at the end).",
    {
      after: { type: "string", description: "Insert after this cell id; omit to append." },
      cell_type: { type: "string", enum: ["code", "markdown"], description: "Cell type; defaults to code." },
      source: { type: "string", description: "Initial cell source." },
    },
    addCell
  )
  registerTool(
    "nb_delete_cell",
    "Delete a cell by id. Refuses to delete the last remaining cell.",
    { cellId: { type: "string", required: true, description: "Cell id to delete." } },
    deleteCell
  )
  registerTool(
    "nb_move_cell",
    "Move a cell up (dir = -1) or down (dir = 1) in the notebook ordering.",
    {
      cellId: { type: "string", required: true, description: "Cell id to move." },
      dir: { type: "integer", description: "1 to move down, -1 to move up." },
    },
    moveCell
  )
  registerTool(
    "nb_edit_cell",
    "Replace a cell's source (records a version snapshot in cell.metadata.dsh.versions). Use after a user modification suggestion.",
    {
      cellId: { type: "string", required: true, description: "Cell id to edit." },
      source: { type: "string", required: true, description: "Full replacement source." },
      reason: { type: "string", description: "Why this edit happened (e.g. the user suggestion)." },
      cell_type: { type: "string", enum: ["code", "markdown"], description: "Optionally change cell type." },
    },
    editCell
  )
  registerTool(
    "nb_run_cell",
    "Execute one code cell against the live Jupyter kernel (ipykernel via jupyter_client). State persists across cells. Returns structured outputs (stream / display_data / error traceback).",
    {
      cellId: { type: "string", required: true, description: "Cell id to run." },
      timeout: { type: "integer", description: "Seconds; defaults to 180." },
    },
    function (args) {
      return runCell(Object.assign({}, args || {}, { wait: true }))
    }
  )
  registerTool(
    "nb_run_all",
    "Run every code cell from top to bottom against the live Jupyter kernel. On error, remaining queued cells are cancelled (VS Code jupyter.stopOnError).",
    {},
    function (args) {
      return runAll(Object.assign({}, args || {}, { wait: true }))
    }
  )
  registerTool(
    "nb_apply_suggestion",
    "Record a per-cell modification suggestion and return a prompt the agent should follow: edit that cell then rerun it.",
    {
      cellId: { type: "string", required: true, description: "Target cell id." },
      text: { type: "string", required: true, description: "The user's modification suggestion." },
    },
    applySuggestion
  )
  registerTool(
    "nb_kernel_restart",
    "Restart the live Jupyter kernel (clears all variables). Cancels queued/running cells but keeps completed outputs, like VS Code Restart Kernel.",
    {},
    kernelRestart
  )
  registerTool(
    "nb_kernel_restart_and_run_all",
    "Restart the kernel then run every code cell from top to bottom.",
    {},
    kernelRestartAndRunAll
  )
  registerTool(
    "nb_kernel_restart_and_clear",
    "Restart the kernel and clear all cell outputs and execution counts (VS Code Restart & Clear Output).",
    {},
    kernelRestartAndClear
  )
  registerTool(
    "nb_clear_outputs",
    "Clear all code-cell outputs and execution counts without restarting the kernel.",
    {},
    async function () {
      return { ok: true, current: clearAllOutputs() }
    }
  )
  registerTool(
    "nb_kernel_interrupt",
    "Interrupt the currently executing cell.",
    {},
    kernelInterrupt
  )
  registerTool(
    "nb_kernel_list",
    "List discoverable Python kernels (conda envs with python.exe, plus whether ipykernel is installed).",
    {},
    async function () {
      return { kernels: listKernels(), current: snapshotPublic() }
    }
  )
  registerTool(
    "nb_kernel_select",
    "Select and start a Jupyter kernel by conda env name, kernel id, or python.exe path. Restarts the sidecar.",
    {
      id: { type: "string", description: "Kernel id from nb_kernel_list." },
      name: { type: "string", description: "Conda env name (as listed by nb_kernel_list)." },
      python: { type: "string", description: "Absolute python.exe path." },
    },
    selectKernel
  )
  registerTool(
    "nb_get",
    "Return the current in-memory notebook (cells, outputs, kernel status, path).",
    {},
    async function () {
      return snapshotPublic()
    }
  )
  registerTool(
    "nb_set_cwd",
    "Set the Jupyter kernel working directory (os.getcwd / relative paths). Restarts the kernel if one is already running.",
    { dir: { type: "string", required: true, description: "Absolute directory path." } },
    setCwd
  )

  if (webServer) {
    const routes = {
      list: listNotebooks,
      listDir: listDir,
      setCwd: setCwd,
      get: async () => snapshotPublic(),
      new: newNotebook,
      open: openNotebook,
      save: saveNotebook,
      addCell: addCell,
      deleteCell: deleteCell,
      moveCell: moveCell,
      editCell: editCell,
      runCell: runCell,
      runAll: runAll,
      recordSuggestion: recordSuggestion,
      applySuggestion: applySuggestion,
      kernelRestart: kernelRestart,
      kernelInterrupt: kernelInterrupt,
      kernelRestartAndRunAll: kernelRestartAndRunAll,
      kernelRestartAndClear: kernelRestartAndClear,
      clearOutputs: async function () {
        return { ok: true, current: clearAllOutputs() }
      },
      kernelStatus: kernelStatus,
      kernelList: async () => ({ kernels: listKernels(), current: snapshotPublic() }),
      kernelSelect: selectKernel,
      complete: completeCode,
      inspect: inspectCode,
    }
    const send = function (res, value, status) {
      res.statusCode = status || 200
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.end(JSON.stringify(value))
    }
    ctx.effect(function () {
      return webServer.register({
        kind: "prefix",
        path: "/nb",
        handler: async function (req, res) {
          try {
            const url = new URL(req.url, "http://localhost")
            const name = url.pathname.replace(/^\/nb\/?/, "")
            if ((req.method === "GET" || req.method === "HEAD") && name === "cm.js") {
              const vendor = join(HERE, "cm-vendor.js")
              if (!existsSync(vendor)) return send(res, { error: "cm vendor missing" }, 404)
              const body = readFileSync(vendor)
              res.statusCode = 200
              res.setHeader("Content-Type", "application/javascript; charset=utf-8")
              res.setHeader("Cache-Control", "no-cache")
              if (req.method === "HEAD") return res.end()
              return res.end(body)
            }
            const fn = routes[name]
            if (!fn) return send(res, { error: "unknown endpoint: " + name }, 404)
            const body = req.method === "POST" ? await readJson(req) : {}
            send(res, await fn(body), 200)
          } catch (e) {
            send(res, { error: String(e && e.message ? e.message : e) }, 500)
          }
        },
      })
    })
  }

  ctx.effect(function () {
    return function () {
      try {
        if (state.sidecar && state.sidecar.child) {
          try {
            state.sidecar.child.stdin.write(JSON.stringify({ id: "bye", cmd: "stop" }) + "\n")
          } catch {
            /* sidecar already gone */
          }
          state.sidecar.child.kill()
        }
      } catch {
        /* dispose best-effort */
      }
    }
  })
}

function readJson(req) {
  return new Promise(function (resolve, reject) {
    let data = ""
    req.on("data", function (c) {
      data += c
    })
    req.on("end", function () {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch (e) {
        reject(e)
      }
    })
    req.on("error", reject)
  })
}
