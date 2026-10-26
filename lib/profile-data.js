// Read-only views of the files Claude Desktop writes into a profile folder.
// Nothing here touches sign-in data: only the fields named below are kept,
// and every reader returns null or empty values when a file is missing or
// its format has changed.
const fs = require('node:fs');
const path = require('node:path');

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

const pct = (v) => (Number.isFinite(v) ? v : null);

// Reset times are not in the file, so they are bracketed from the samples.
// Both return { earliest, latest } in ms, or null when the samples can't tell.

// Usage only falls when a window resets, and the 5-hour window starts with
// the first use after that. The newest rise from 0 (or fall) therefore puts
// the current window's start between two samples.
function estimateFiveHourReset(samples) {
  if (!(samples.at(-1)?.u.fh > 0)) return null;
  for (let i = samples.length - 1; i > 0; i--) {
    const before = samples[i - 1].u.fh;
    const after = samples[i].u.fh;
    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
    if (after > 0 && (before === 0 || after < before)) {
      return { earliest: samples[i - 1].t + FIVE_HOURS_MS, latest: samples[i].t + FIVE_HOURS_MS };
    }
  }
  return null;
}

// The weekly window resets on a fixed schedule, used or not, so every fall
// brackets the same weekly moment. Overlapping the brackets a week apart
// narrows it; then it is moved forward to the next reset after now.
function estimateWeeklyReset(samples, now) {
  const falls = [];
  for (let i = 1; i < samples.length; i++) {
    const before = samples[i - 1].u.sd;
    const after = samples[i].u.sd;
    if (Number.isFinite(before) && Number.isFinite(after) && after < before) {
      falls.push([samples[i - 1].t, samples[i].t]);
    }
  }
  if (falls.length === 0) return null;

  let [lo, hi] = falls.at(-1);
  for (const [a, b] of falls.slice(0, -1).reverse()) {
    const shift = Math.round((lo - a) / WEEK_MS) * WEEK_MS;
    // A bracket that doesn't overlap means the schedule moved; ignore it.
    if (b + shift > lo && a + shift < hi) {
      lo = Math.max(lo, a + shift);
      hi = Math.min(hi, b + shift);
    }
  }
  while (hi <= now) {
    lo += WEEK_MS;
    hi += WEEK_MS;
  }
  return { earliest: lo, latest: hi };
}

// plan-usage-history.json: { version, samples: [{ t, org, u: { fh, sd } }] },
// where fh is the 5-hour window % and sd the 7-day window %.
function readUsage(dir, now = Date.now()) {
  const data = readJson(path.join(dir, 'plan-usage-history.json'));
  const samples = (Array.isArray(data?.samples) ? data.samples : [])
    .filter((s) => Number.isFinite(s?.t) && s.u && typeof s.u === 'object')
    .sort((a, b) => a.t - b.t);
  if (samples.length === 0) return null;

  // A profile that changed organization keeps the old org's samples too.
  const latest = samples.at(-1);
  const sameOrg = samples.filter((s) => s.org === latest.org);
  return {
    at: latest.t,
    fiveHour: pct(latest.u.fh),
    sevenDay: pct(latest.u.sd),
    fiveHourReset: estimateFiveHourReset(sameOrg),
    sevenDayReset: estimateWeeklyReset(sameOrg, now),
    history: sameOrg
      .filter((s) => s.t >= now - DAY_MS)
      .map((s) => ({ t: s.t, fiveHour: pct(s.u.fh), sevenDay: pct(s.u.sd) })),
  };
}

// Session files run to hundreds of KB each, so parsed summaries are cached
// until the file's mtime changes.
const sessionCache = new Map();

function summarizeSession(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  const cached = sessionCache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.summary;

  const data = readJson(file);
  const summary = data && typeof data === 'object'
    ? {
        title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Untitled session',
        isArchived: data.isArchived === true,
        lastActivityAt: Number.isFinite(data.lastActivityAt) ? data.lastActivityAt : null,
      }
    : null;
  sessionCache.set(file, { mtimeMs: stat.mtimeMs, summary });
  return summary;
}

// claude-code-sessions/<account>/<org>/local_<id>.json
function readSessions(dir, recentCount = 3) {
  const root = path.join(dir, 'claude-code-sessions');
  const sessions = [];
  for (const account of readDirSafe(root)) {
    for (const org of readDirSafe(path.join(root, account))) {
      const orgDir = path.join(root, account, org);
      for (const name of readDirSafe(orgDir)) {
        if (!/^local_.+\.json$/.test(name)) continue;
        const summary = summarizeSession(path.join(orgDir, name));
        if (summary) sessions.push(summary);
      }
    }
  }

  const active = sessions.filter((s) => !s.isArchived);
  const byActivity = (a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
  const lastActivityAt = sessions.reduce((max, s) => Math.max(max, s.lastActivityAt ?? 0), 0) || null;
  return {
    active: active.length,
    archived: sessions.length - active.length,
    lastActivityAt,
    recent: active.sort(byActivity).slice(0, recentCount).map(({ title, lastActivityAt: at }) => ({ title, lastActivityAt: at })),
  };
}

// Only this one key leaves the file; config.json also holds sign-in caches.
function readAccountId(dir) {
  const id = readJson(path.join(dir, 'config.json'))?.lastKnownAccountUuid;
  return typeof id === 'string' && id ? id : null;
}

function profileExists(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

module.exports = { readUsage, readSessions, readAccountId, profileExists };
