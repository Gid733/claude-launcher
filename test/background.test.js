const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkAlerts } = require('../lib/alerts');
const { SettingsStore, DEFAULTS, sanitize } = require('../lib/settings');
const autostart = require('../lib/autostart');
const claudeSessions = require('../lib/claude-sessions');

const NOW = Date.UTC(2026, 9, 26, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

const profile = (fiveHour, reset, id = 'main', name = 'Leonid') => ({
  id,
  name,
  usage: { fiveHour, sevenDay: 10, fiveHourReset: reset },
});
const windowEnding = (latest) => ({ earliest: latest - 15 * 60 * 1000, latest });

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-launcher-bg-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the first look at a profile is silent', () => {
  const { alerts, memory } = checkAlerts([profile(96, windowEnding(NOW + HOUR))], {}, NOW);
  assert.deepEqual(alerts, []);
  assert.equal(memory.main.level, 95);
});

test('crossing 80% and then 95% each alert once per window', () => {
  const win = windowEnding(NOW + 2 * HOUR);
  let { memory } = checkAlerts([profile(60, win)], {}, NOW);

  let result = checkAlerts([profile(82, win)], memory, NOW);
  assert.deepEqual(result.alerts.map((a) => a.title), ['Leonid: 82% of the 5-hour limit used']);

  result = checkAlerts([profile(85, win)], result.memory, NOW);
  assert.deepEqual(result.alerts, []);

  result = checkAlerts([profile(97, win)], result.memory, NOW);
  assert.deepEqual(result.alerts.map((a) => a.title), ['Leonid: 97% of the 5-hour limit used']);

  result = checkAlerts([profile(99, win)], result.memory, NOW);
  assert.deepEqual(result.alerts, []);
});

test('a new window can alert again', () => {
  const first = windowEnding(NOW - HOUR);
  let { memory } = checkAlerts([profile(90, first)], {}, NOW - 2 * HOUR);
  const second = windowEnding(NOW + 4 * HOUR);
  const { alerts } = checkAlerts([profile(81, second)], memory, NOW);
  assert.deepEqual(alerts.map((a) => a.title), ['Leonid: 81% of the 5-hour limit used']);
});

test('a nearly full window announces its reset once', () => {
  const win = windowEnding(NOW + 10 * 60 * 1000);
  let { memory } = checkAlerts([profile(94, win)], {}, NOW);

  let result = checkAlerts([profile(94, win)], memory, NOW + 20 * 60 * 1000);
  assert.deepEqual(result.alerts.map((a) => a.title), ['Leonid: 5-hour window has reset']);

  result = checkAlerts([profile(94, win)], result.memory, NOW + 30 * 60 * 1000);
  assert.deepEqual(result.alerts, []);
});

test('quiet resets: light use, already past at first sight, or turned off', () => {
  const win = windowEnding(NOW + 10 * 60 * 1000);
  const later = NOW + 20 * 60 * 1000;

  let { memory } = checkAlerts([profile(40, win)], {}, NOW);
  assert.deepEqual(checkAlerts([profile(40, win)], memory, later).alerts, []);

  ({ memory } = checkAlerts([profile(95, win)], {}, later));
  assert.deepEqual(checkAlerts([profile(95, win)], memory, later + 1000).alerts, []);

  ({ memory } = checkAlerts([profile(95, win)], {}, NOW));
  assert.deepEqual(checkAlerts([profile(95, win)], memory, later, { notifyReset: false }).alerts, []);
});

test('usage alerts can be turned off and profiles without usage are skipped', () => {
  const win = windowEnding(NOW + HOUR);
  let { memory } = checkAlerts([profile(50, win), { id: 'gid', name: 'Gid', usage: null }], {}, NOW);
  const result = checkAlerts([profile(90, win), { id: 'gid', name: 'Gid', usage: null }], memory, NOW, { notifyUsage: false });
  assert.deepEqual(result.alerts, []);
  assert.equal(result.memory.gid.level, 0);
});

test('session records count only when the pid and its start time both match', () => {
  const write = (name, body) => fs.writeFileSync(path.join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  write('500.json', { pid: 500, procStart: '9000', status: 'busy', name: 'Bike app', cwd: '/w/bike' });
  write('501.json', { pid: 501, procStart: '9100', status: 'idle', cwd: '/w/coffee' });
  write('502.json', { pid: 502, procStart: '1234', status: 'busy' }); // pid reused by another process
  write('503.json', { pid: 503, procStart: '9300', status: 'busy' }); // process gone
  write('504.json', { pid: 504, procStart: '9400', status: 'busy' }); // a plain terminal claude
  write('505.json', '{broken');
  write('notes.txt', 'ignored');

  const { records, unreadable } = claudeSessions.readRecords(dir);
  assert.equal(records.length, 5);
  assert.equal(unreadable, 1);

  // 100 = Desktop main; 200 = a wrapper it started; 300 = a terminal shell.
  const processes = new Map([
    [100, { ppid: 1, start: '100' }],
    [200, { ppid: 100, start: '200' }],
    [300, { ppid: 1, start: '300' }],
    [500, { ppid: 200, start: '9000' }],
    [501, { ppid: 100, start: '9100' }],
    [502, { ppid: 100, start: '5555' }],
    [504, { ppid: 300, start: '9400' }],
  ]);
  const live = claudeSessions.liveRecords(records, processes);
  assert.deepEqual(live.map((r) => r.pid).sort(), [500, 501, 504]);

  const byMain = claudeSessions.sessionsByDesktop(live, processes, [100]);
  const mine = byMain.get(100);
  assert.deepEqual(mine.map((r) => r.pid).sort(), [500, 501]);
  assert.deepEqual(mine.filter(claudeSessions.isWorking).map(claudeSessions.describe), ['Bike app']);
  assert.equal(claudeSessions.describe(mine.find((r) => r.pid === 501)), 'coffee');
});

test('a missing sessions folder reads as no sessions', () => {
  assert.deepEqual(claudeSessions.readRecords(path.join(dir, 'nope')), { records: [], unreadable: 0 });
});

test('settings keep only known keys with valid values', () => {
  assert.deepEqual(sanitize(null), DEFAULTS);
  assert.deepEqual(sanitize({ refreshMinutes: 7, closeToTray: 'yes', extra: 1 }), DEFAULTS);
  assert.equal(sanitize({ refreshMinutes: 15 }).refreshMinutes, 15);

  const file = path.join(dir, 'settings.json');
  const store = new SettingsStore(file);
  assert.deepEqual(store.get(), DEFAULTS);
  store.update({ startHidden: true, refreshMinutes: 5, bogus: true });
  assert.deepEqual(new SettingsStore(file).get(), { ...DEFAULTS, startHidden: true, refreshMinutes: 5 });
});

test('autostart writes and removes a hidden-start entry', () => {
  const file = path.join(dir, 'autostart', 'claude-launcher.desktop');
  const opts = { exec: '/opt/e/electron', appDir: '/home/u/my app', icon: '/home/u/icon.png', file };
  autostart.setEnabled(true, opts);
  assert.equal(autostart.isEnabled(file), true);
  assert.match(fs.readFileSync(file, 'utf8'), /^Exec="\/opt\/e\/electron" "\/home\/u\/my app" --hidden$/m);
  autostart.setEnabled(false, opts);
  assert.equal(autostart.isEnabled(file), false);
});
