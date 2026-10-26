const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { readUsage, readSessions, readAccountId, profileExists } = require('../lib/profile-data');
const { userDataDirFrom, selectMainProcesses } = require('../lib/desktop-process');
const { ProfileStore, DEFAULT_DIR, slugify } = require('../lib/profiles');

const NOW = Date.UTC(2026, 9, 26, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-launcher-test-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(rel, data) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
  return file;
}

test('readUsage returns the latest sample and the last 24 hours', () => {
  write('plan-usage-history.json', {
    version: 2,
    samples: [
      { t: NOW - 30 * HOUR, org: 'o1', u: { fh: 90, sd: 40 } },
      { t: NOW - 2 * HOUR, org: 'o1', u: { fh: 25, sd: 4 } },
      { t: NOW - HOUR, org: 'o1', u: { fh: 74, sd: 12 } },
    ],
  });
  const usage = readUsage(dir, NOW);
  assert.equal(usage.at, NOW - HOUR);
  assert.equal(usage.fiveHour, 74);
  assert.equal(usage.sevenDay, 12);
  assert.deepEqual(usage.history.map((s) => s.fiveHour), [25, 74]);
});

test('readUsage sorts samples and ignores other organizations in the history', () => {
  write('plan-usage-history.json', {
    samples: [
      { t: NOW - HOUR, org: 'new', u: { fh: 10, sd: 1 } },
      { t: NOW - 3 * HOUR, org: 'old', u: { fh: 99, sd: 99 } },
      { t: NOW - 2 * HOUR, org: 'new', u: { fh: 5 } },
    ],
  });
  const usage = readUsage(dir, NOW);
  assert.equal(usage.fiveHour, 10);
  assert.deepEqual(usage.history, [
    { t: NOW - 2 * HOUR, fiveHour: 5, sevenDay: null },
    { t: NOW - HOUR, fiveHour: 10, sevenDay: 1 },
  ]);
});

const MIN = 60 * 1000;
const WEEK = 7 * 24 * HOUR;
const usageAt = (...rows) => ({ samples: rows.map(([t, fh, sd]) => ({ t, org: 'o', u: { fh, sd } })) });

test('the 5-hour reset is bracketed by the rise that started the window', () => {
  write('plan-usage-history.json', usageAt(
    [NOW - 9 * HOUR, 100, 50],
    [NOW - 3 * HOUR, 0, 50],
    [NOW - 3 * HOUR + 15 * MIN, 10, 51],
    [NOW - HOUR, 74, 60],
  ));
  assert.deepEqual(readUsage(dir, NOW).fiveHourReset, {
    earliest: NOW + 2 * HOUR,
    latest: NOW + 2 * HOUR + 15 * MIN,
  });
});

test('a fall without a zero sample also starts a new 5-hour window', () => {
  write('plan-usage-history.json', usageAt([NOW - 4 * HOUR, 90, 10], [NOW - 2 * HOUR, 20, 12]));
  assert.deepEqual(readUsage(dir, NOW).fiveHourReset, { earliest: NOW + HOUR, latest: NOW + 3 * HOUR });
});

test('no 5-hour reset when the window is idle or its start is unseen', () => {
  write('plan-usage-history.json', usageAt([NOW - 2 * HOUR, 40, 10], [NOW - HOUR, 0, 10]));
  assert.equal(readUsage(dir, NOW).fiveHourReset, null);
  write('plan-usage-history.json', usageAt([NOW - 2 * HOUR, 40, 10], [NOW - HOUR, 50, 10]));
  assert.equal(readUsage(dir, NOW).fiveHourReset, null);
});

test('weekly falls a week apart narrow the next weekly reset', () => {
  const reset = NOW - 2 * 24 * HOUR; // the true weekly moment, last seen two days ago
  write('plan-usage-history.json', usageAt(
    [reset - WEEK - 5 * HOUR, 0, 90], [reset - WEEK + HOUR, 0, 0], // wide bracket: -5h..+1h
    [reset - 2 * HOUR, 0, 99], [reset + 8 * HOUR, 0, 0], // wide bracket: -2h..+8h
  ));
  assert.deepEqual(readUsage(dir, NOW).sevenDayReset, {
    earliest: reset - 2 * HOUR + WEEK,
    latest: reset + HOUR + WEEK,
  });
});

test('a weekly bracket that does not line up is ignored', () => {
  const reset = NOW - 24 * HOUR;
  write('plan-usage-history.json', usageAt(
    [reset - WEEK + 30 * HOUR, 0, 80], [reset - WEEK + 31 * HOUR, 0, 0], // old schedule
    [reset - HOUR, 0, 70], [reset + HOUR, 0, 0],
  ));
  assert.deepEqual(readUsage(dir, NOW).sevenDayReset, { earliest: reset - HOUR + WEEK, latest: reset + HOUR + WEEK });
});

test('readUsage returns null for missing, malformed or empty files', () => {
  assert.equal(readUsage(dir, NOW), null);
  write('plan-usage-history.json', '{not json');
  assert.equal(readUsage(dir, NOW), null);
  write('plan-usage-history.json', { version: 99, samples: [] });
  assert.equal(readUsage(dir, NOW), null);
  write('plan-usage-history.json', { samples: [{ t: 'x' }, null, { t: 1 }] });
  assert.equal(readUsage(dir, NOW), null);
});

test('readSessions counts active and archived sessions and lists recent titles', () => {
  const org = 'claude-code-sessions/acct/org';
  write(`${org}/local_a.json`, { title: 'Old', isArchived: false, lastActivityAt: 1 });
  write(`${org}/local_b.json`, { title: 'Newest', isArchived: false, lastActivityAt: 30 });
  write(`${org}/local_c.json`, { title: 'Archived', isArchived: true, lastActivityAt: 50 });
  write(`${org}/local_d.json`, { title: '  ', lastActivityAt: 20 });
  write(`${org}/local_e.json`, 'broken');
  write(`${org}/scheduled-tasks.json`, { title: 'not a session' });

  const sessions = readSessions(dir);
  assert.equal(sessions.active, 3);
  assert.equal(sessions.archived, 1);
  assert.equal(sessions.lastActivityAt, 50);
  assert.deepEqual(sessions.recent.map((s) => s.title), ['Newest', 'Untitled session', 'Old']);
});

test('readSessions picks up a changed session file', () => {
  const file = write('claude-code-sessions/a/o/local_x.json', { title: 'First', lastActivityAt: 1 });
  assert.equal(readSessions(dir).recent[0].title, 'First');
  fs.writeFileSync(file, JSON.stringify({ title: 'Second', lastActivityAt: 2 }));
  fs.utimesSync(file, new Date(), new Date(Date.now() + 5000));
  assert.equal(readSessions(dir).recent[0].title, 'Second');
});

test('readSessions is empty for a profile that was never opened', () => {
  assert.deepEqual(readSessions(path.join(dir, 'missing')), { active: 0, archived: 0, lastActivityAt: null, recent: [] });
});

test('readAccountId returns only the account id', () => {
  assert.equal(readAccountId(dir), null);
  write('config.json', { lastKnownAccountUuid: 'acct-1', 'oauth:tokenCache': 'secret' });
  assert.equal(readAccountId(dir), 'acct-1');
});

test('profileExists checks for a folder', () => {
  assert.equal(profileExists(dir), true);
  assert.equal(profileExists(path.join(dir, 'nope')), false);
});

test('userDataDirFrom reads both flag forms and defaults to the main folder', () => {
  assert.equal(userDataDirFrom(['/bin/x']), DEFAULT_DIR);
  assert.equal(userDataDirFrom(['/bin/x', '--user-data-dir=/tmp/a/']), '/tmp/a');
  assert.equal(userDataDirFrom(['/bin/x', '--user-data-dir', '/tmp/b']), '/tmp/b');
  // Electron's rewritten argv: one string holding the whole command line.
  assert.equal(userDataDirFrom(['/bin/x --user-data-dir=/home/u/.config/Claude-yehor']), '/home/u/.config/Claude-yehor');
  assert.equal(userDataDirFrom(['/bin/x --user-data-dir=/tmp/my dir --enable-foo']), '/tmp/my dir');
  assert.equal(userDataDirFrom(['/bin/x claude://login/google-auth?code=1']), DEFAULT_DIR);
});

test('selectMainProcesses skips helpers and Node-mode children', () => {
  const bin = '/usr/lib/claude-desktop/claude-desktop';
  const processes = new Map([
    [1, { ppid: 0, isDesktop: false, args: [] }],
    [100, { ppid: 1, isDesktop: false, args: [] }], // session manager
    [200, { ppid: 100, isDesktop: true, args: [bin] }], // main, default profile
    [201, { ppid: 200, isDesktop: true, args: [bin, '--type=renderer'] }],
    [205, { ppid: 100, isDesktop: true, args: [`${bin} --type=zygote`] }], // rewritten argv, reparented
    [202, { ppid: 200, isDesktop: true, args: [bin, '/opt/mcp/server.js'] }], // Node-mode child
    [203, { ppid: 200, isDesktop: false, args: [] }], // e.g. a shell
    [204, { ppid: 203, isDesktop: true, args: [bin, 'tool.js'] }], // grandchild through a shell
    [300, { ppid: 100, isDesktop: true, args: [bin, '--user-data-dir=/tmp/work'] }], // second profile
  ]);
  assert.deepEqual(selectMainProcesses(processes), [
    { pid: 200, userDataDir: DEFAULT_DIR },
    { pid: 300, userDataDir: '/tmp/work' },
  ]);
});

test('ProfileStore keeps main first, makes unique ids and never drops main', () => {
  const file = path.join(dir, 'profiles.json');
  const store = new ProfileStore(file);
  assert.deepEqual(store.list().map((p) => p.id), ['main']);

  const work = store.add('Work Account');
  assert.equal(work.id, 'work-account');
  assert.equal(path.basename(work.dir), 'Claude-work-account');
  assert.equal(store.add('work account!').id, 'work-account-2');
  assert.throws(() => store.add('***'));
  assert.throws(() => store.add('Main'));
  assert.throws(() => store.remove('main'));

  store.rename('main', 'Personal');
  store.remove('work-account-2');

  const reloaded = new ProfileStore(file);
  assert.deepEqual(reloaded.list().map((p) => [p.id, p.name, p.isDefault]), [
    ['main', 'Personal', true],
    ['work-account', 'Work Account', false],
  ]);
  assert.equal(reloaded.get('main').dir, DEFAULT_DIR);
});

test('slugify', () => {
  assert.equal(slugify('  Ça va / Work #2 '), 'a-va-work-2');
});
