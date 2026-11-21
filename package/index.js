/**
 * Host half of the Claude UI bundle.
 *
 * The client module owns the palette, icons and wording. This half owns the
 * ClaudePet desktop companion: it installs the payload that ships inside this
 * package, starts it while the plugin is enabled, keeps it alive, and stops it
 * when the plugin is disabled. Nothing else may start the pet.
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PAYLOAD = path.join(HERE, 'pet')
const PET_EXE = 'ClaudePet.exe'

const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
const DATA = path.join(APPDATA, 'ClaudePet')
const RUNTIME = path.join(LOCALAPPDATA, 'ClaudePet', 'app')
const RUNTIME_EXE = path.join(RUNTIME, PET_EXE)
const HEARTBEAT = path.join(DATA, 'host.heartbeat')
const QUIT_FLAG = path.join(DATA, 'quit.flag')
const LOG = path.join(DATA, 'plugin.log')

const HEARTBEAT_MS = 10000
const RESTART_WINDOW_MS = 60000
const RESTART_LIMIT = 3

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch { /* exists or not writable */ }
}

function log(message) {
  const line = `${new Date().toISOString()} [claude-ui] ${message}\n`
  try {
    ensureDir(DATA)
    try {
      const stat = fs.statSync(LOG)
      if (stat.size > 256 * 1024) fs.writeFileSync(LOG, '')
    } catch { /* first line */ }
    fs.appendFileSync(LOG, line)
  } catch { /* logging must never break the host */ }
}

/** Copy the shipped payload into a normal integrity location and run it from there. */
function installPayload(exeOverride) {
  if (exeOverride) {
    if (!fs.existsSync(exeOverride)) throw new Error(`configured exe not found: ${exeOverride}`)
    return exeOverride
  }
  const source = path.join(PAYLOAD, PET_EXE)
  if (!fs.existsSync(source)) throw new Error(`payload missing: ${source}`)

  ensureDir(RUNTIME)
  const src = fs.statSync(source)
  let needsCopy = true
  try {
    const cur = fs.statSync(RUNTIME_EXE)
    needsCopy = cur.size !== src.size || cur.mtimeMs + 1000 < src.mtimeMs
  } catch { needsCopy = true }

  if (needsCopy) {
    // Byte write (not copyFile): the new file inherits the destination folder's label,
    // and the payload ships from a low-integrity workspace folder.
    try {
      fs.writeFileSync(RUNTIME_EXE, fs.readFileSync(source))
      log('payload updated')
    } catch (error) {
      // A running pet keeps its image locked. Keep the installed build instead of
      // refusing to start; the next enable after a stop installs the new one.
      if (!fs.existsSync(RUNTIME_EXE)) throw error
      log(`payload locked by a running pet, keeping the installed build (${error && error.message})`)
      needsCopy = false
    }
  }

  const assetsSrc = path.join(PAYLOAD, 'assets')
  const assetsDst = path.join(RUNTIME, 'assets')
  if (needsCopy || !fs.existsSync(assetsDst)) {
    for (const file of walk(assetsSrc)) {
      const target = path.join(assetsDst, path.relative(assetsSrc, file))
      ensureDir(path.dirname(target))
      fs.writeFileSync(target, fs.readFileSync(file))
    }
    log('assets updated')
  }
  return RUNTIME_EXE
}

function* walk(dir) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

function runQuit(exe) {
  try {
    const result = spawnSync(exe, ['--quit'], { windowsHide: true, timeout: 6000 })
    return result.status === 0 || result.status === null
  } catch (error) {
    log(`quit failed: ${error && error.message}`)
    return false
  }
}

function isRunning(exe) {
  try {
    return spawnSync(exe, ['--ping'], { windowsHide: true, timeout: 5000 }).status === 0
  } catch {
    return false
  }
}

function writeHeartbeat() {
  try {
    ensureDir(DATA)
    fs.writeFileSync(HEARTBEAT, new Date().toISOString())
  } catch (error) {
    log(`heartbeat failed: ${error && error.message}`)
  }
}

export function apply(ctx, config = {}) {
  if (process.platform !== 'win32') {
    log('skipped: not a Windows host')
    return
  }
  if (config.pet === false) {
    log('skipped by configuration')
    return
  }

  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(() => supervise(config), 'claude-ui/pet')
  } else {
    supervise(config)
  }
}

function supervise(config) {
  let child = null
  let timer = null
  let stopped = false
  const restarts = []

  let exe
  try {
    exe = installPayload(config.exe)
  } catch (error) {
    log(`cannot install payload: ${error && error.message}`)
    return () => {}
  }

  try { fs.rmSync(QUIT_FLAG, { force: true }) } catch { /* nothing to clear */ }

  const start = () => {
    if (stopped) return
    // Exactly one owner: take over a stale instance instead of running two.
    if (isRunning(exe)) runQuit(exe)
    writeHeartbeat()
    try {
      child = spawn(exe, ['--managed'], {
        stdio: 'ignore',
        windowsHide: true,
        env: { ...process.env, CLAUDE_PET_MANAGED: '1' },
      })
      log(`started pid ${child.pid}`)
    } catch (error) {
      log(`spawn failed: ${error && error.message}`)
      child = null
      return
    }

    child.on('error', (error) => log(`child error: ${error && error.message}`))
    const spawnedAt = Date.now()
    child.on('exit', (code, signal) => {
      const pid = child && child.pid
      child = null
      if (stopped) return
      log(`exited pid ${pid} code=${code} signal=${signal}`)

      let userAsked = false
      try {
        if (fs.existsSync(QUIT_FLAG)) { userAsked = true; fs.rmSync(QUIT_FLAG, { force: true }) }
      } catch { /* ignore */ }

      if (userAsked) { log('user quit: not restarting'); return }

      // Another copy (a manual launch, or an older standalone install) may hold the
      // single-instance mutex: our child then summons it and exits at once. Back off
      // instead of racing it in a restart loop.
      if (Date.now() - spawnedAt < 4000 && isRunning(exe)) {
        log('another instance owns the pet; backing off until the plugin is toggled')
        return
      }

      if (config.restart === false) return

      const now = Date.now()
      while (restarts.length && now - restarts[0] > RESTART_WINDOW_MS) restarts.shift()
      if (restarts.length >= RESTART_LIMIT) {
        log('restart budget exhausted; staying down until the plugin is toggled')
        return
      }
      restarts.push(now)
      setTimeout(() => { if (!stopped) start() }, 1500 * restarts.length)
    })
  }

  start()
  timer = setInterval(writeHeartbeat, HEARTBEAT_MS)
  if (timer && typeof timer.unref === 'function') timer.unref()

  return () => {
    stopped = true
    if (timer) clearInterval(timer)
    timer = null
    try { fs.rmSync(HEARTBEAT, { force: true }) } catch { /* ignore */ }
    if (isRunning(exe)) runQuit(exe)
    const pending = child
    child = null
    if (pending && pending.exitCode === null) {
      try { pending.kill() } catch { /* already gone */ }
    }
    log('stopped with the plugin')
  }
}
