// Finds, quits and starts Claude Desktop. Linux only: reads /proc directly.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { DEFAULT_DIR } = require('./profiles');

const DESKTOP_BIN = '/usr/lib/claude-desktop/claude-desktop';
const DESKTOP_LAUNCHER = '/usr/bin/claude-desktop';

// Electron rewrites its main process's argv into a single space-joined
// string, so flags are matched in the joined command line, not per argument.
// The value runs up to the next " --" switch or the end.
function userDataDirFrom(args) {
  const match = args.join(' ').match(/--user-data-dir[= ](.+?)(?= --|$)/);
  return match ? path.resolve(match[1].trim()) : DEFAULT_DIR;
}

const isHelper = (args) => args.join(' ').includes('--type=');

// processes: Map of pid -> { ppid, start, isDesktop, args }. Desktop runs its
// helpers from its own binary: Chromium ones carry --type=, and Node-mode
// children (MCP servers and the like) carry a script path instead. Only a
// Desktop process with no Desktop ancestor is a main process.
function selectMainProcesses(processes) {
  const found = [];
  for (const [pid, proc] of processes) {
    if (!proc.isDesktop || isHelper(proc.args)) continue;
    let ancestor = proc.ppid;
    let child = false;
    for (let depth = 0; ancestor > 1 && depth < 64; depth++) {
      const parent = processes.get(ancestor);
      if (!parent) break;
      if (parent.isDesktop) {
        child = true;
        break;
      }
      ancestor = parent.ppid;
    }
    if (!child) found.push({ pid, userDataDir: userDataDirFrom(proc.args) });
  }
  return found;
}

function readProcesses() {
  const processes = new Map();
  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      // The command name may hold spaces or parentheses; fields resume after
      // the last ")" at field 3, so ppid (4) is [1] and starttime (22) is [19].
      const stat = fs.readFileSync(`/proc/${entry}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      const ppid = Number(fields[1]);
      const start = fields[19];
      let isDesktop = false;
      let args = [];
      try {
        isDesktop = fs.readlinkSync(`/proc/${entry}/exe`) === DESKTOP_BIN;
        if (isDesktop) args = fs.readFileSync(`/proc/${entry}/cmdline`, 'utf8').split('\0').filter(Boolean);
      } catch {
        // Another user's process: its exe is unreadable, but it still links the tree.
      }
      processes.set(Number(entry), { ppid, start, isDesktop, args });
    } catch {
      // Process exited mid-scan.
    }
  }
  return processes;
}

function findRunning() {
  return selectMainProcesses(readProcesses());
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

// Asks Desktop to quit the same way the session manager does on logout.
async function quit(pid, timeoutMs = 15000) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return !isAlive(pid);
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return !isAlive(pid);
}

// Our own Electron/npm variables would change how the child Electron app runs.
function childEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('ELECTRON_') || key.startsWith('npm_')) continue;
    env[key] = value;
  }
  return env;
}

function launch(profile) {
  const args = profile.isDefault ? [] : [`--user-data-dir=${profile.dir}`];
  const child = spawn(DESKTOP_LAUNCHER, args, { detached: true, stdio: 'ignore', env: childEnv() });
  child.unref();
}

function isInstalled() {
  return fs.existsSync(DESKTOP_LAUNCHER);
}

module.exports = { findRunning, quit, launch, isInstalled, userDataDirFrom, selectMainProcesses, readProcesses };
