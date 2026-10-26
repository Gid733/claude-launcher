// Live Claude Code sessions, from the records Claude Code keeps for itself
// in ~/.claude/sessions/<pid>.json (the same files claude-swap reads).
//
// A record outlives its process, and PIDs get reused, so a record only counts
// when its pid is alive AND that process's start time matches the record's
// procStart (the /proc/<pid>/stat start time in clock ticks, which no two
// processes at one pid share). Read-only: nothing here writes or signals.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function sessionsDir() {
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'sessions');
}

// Returns { records, unreadable }. A record that can't be parsed is counted,
// not skipped silently: not knowing is not the same as knowing nothing runs.
function readRecords(dir = sessionsDir()) {
  const records = [];
  let unreadable = 0;
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { records, unreadable };
  }
  for (const name of names) {
    if (!/^\d+\.json$/.test(name)) continue;
    try {
      const r = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      if (!Number.isInteger(r?.pid)) throw new Error('no pid');
      records.push({
        pid: r.pid,
        procStart: r.procStart == null ? null : String(r.procStart),
        status: typeof r.status === 'string' ? r.status : null,
        name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : null,
        cwd: typeof r.cwd === 'string' ? r.cwd : null,
      });
    } catch (err) {
      // A record deleted mid-scan just means that session ended.
      if (err.code !== 'ENOENT') unreadable++;
    }
  }
  return { records, unreadable };
}

// Keeps records whose process is the one that wrote them.
function liveRecords(records, processes) {
  return records.filter((r) => r.procStart != null && processes.get(r.pid)?.start === r.procStart);
}

// Groups live sessions under the Desktop main process they descend from.
// Returns Map of mainPid -> records; sessions outside Desktop are left out.
function sessionsByDesktop(live, processes, mainPids) {
  const mains = new Set(mainPids);
  const grouped = new Map(mainPids.map((pid) => [pid, []]));
  for (const record of live) {
    let ancestor = processes.get(record.pid)?.ppid;
    for (let depth = 0; ancestor > 1 && depth < 64; depth++) {
      if (mains.has(ancestor)) {
        grouped.get(ancestor).push(record);
        break;
      }
      ancestor = processes.get(ancestor)?.ppid;
    }
  }
  return grouped;
}

const isWorking = (record) => record.status === 'busy';

function describe(record) {
  return record.name ?? (record.cwd ? path.basename(record.cwd) : `session ${record.pid}`);
}

module.exports = { sessionsDir, readRecords, liveRecords, sessionsByDesktop, isWorking, describe };
