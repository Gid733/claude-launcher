const path = require('node:path');
const { app, BrowserWindow, Menu, Notification, Tray, dialog, ipcMain, nativeImage, nativeTheme } = require('electron');

const { ProfileStore } = require('./lib/profiles');
const { SettingsStore } = require('./lib/settings');
const { checkAlerts } = require('./lib/alerts');
const autostart = require('./lib/autostart');
const claudeSessions = require('./lib/claude-sessions');
const desktop = require('./lib/desktop-process');
const data = require('./lib/profile-data');

const ICON = path.join(__dirname, 'build', 'icon.png');
const TRAY_ICON = path.join(__dirname, 'build', 'tray.png');

let store;
let settings;
let win;
let tray = null;
let quitting = false;
let refreshTimer = null;
let alertMemory = {};

function profileNameFor(dir) {
  return store.list().find((p) => path.resolve(p.dir) === dir)?.name ?? dir;
}

// Running Desktop main processes and the live Claude Code sessions under
// each, from one /proc scan.
function desktopState() {
  const processes = desktop.readProcesses();
  const mains = desktop.selectMainProcesses(processes);
  const { records, unreadable } = claudeSessions.readRecords();
  const live = claudeSessions.liveRecords(records, processes);
  const byMain = claudeSessions.sessionsByDesktop(live, processes, mains.map((m) => m.pid));
  return { mains, byMain, unreadable };
}

function liveSessionsFor(state, dir) {
  const sessions = state.mains.filter((m) => m.userDataDir === dir).flatMap((m) => state.byMain.get(m.pid) ?? []);
  return { open: sessions.length, working: sessions.filter(claudeSessions.isWorking).length };
}

function snapshot() {
  const state = desktopState();
  const running = state.mains;
  const profiles = store.list().map((p) => {
    const dir = path.resolve(p.dir);
    return {
      ...p,
      dir,
      exists: data.profileExists(dir),
      running: running.some((r) => r.userDataDir === dir),
      liveSessions: liveSessionsFor(state, dir),
      usage: data.readUsage(dir),
      sessions: data.readSessions(dir),
      accountId: data.readAccountId(dir),
    };
  });

  // The renderer only learns whether an account appears twice, not its id.
  const counts = new Map();
  for (const p of profiles) if (p.accountId) counts.set(p.accountId, (counts.get(p.accountId) ?? 0) + 1);
  const known = new Set(profiles.map((p) => p.dir));

  return {
    now: Date.now(),
    installed: desktop.isInstalled(),
    profiles: profiles.map(({ accountId, ...p }) => ({ ...p, sharedAccount: Boolean(accountId && counts.get(accountId) > 1) })),
    otherRunning: running.filter((r) => !known.has(r.userDataDir)).map((r) => r.userDataDir),
  };
}

// Dialogs attach to the window only while it is on screen; from the tray
// they open on their own.
function dialogParent() {
  return win && win.isVisible() ? win : undefined;
}

async function openProfile(id) {
  const profile = store.get(id);
  if (!profile) throw new Error('Profile not found.');
  if (!desktop.isInstalled()) throw new Error('Claude Desktop is not installed at /usr/bin/claude-desktop.');

  const target = path.resolve(profile.dir);
  const state = desktopState();
  const others = state.mains.filter((r) => r.userDataDir !== target);
  if (others.length > 0) {
    const names = [...new Set(others.map((r) => profileNameFor(r.userDataDir)))].join(', ');
    const sessions = others.flatMap((r) => state.byMain.get(r.pid) ?? []);
    const working = sessions.filter(claudeSessions.isWorking);
    const options = {
      type: working.length > 0 ? 'warning' : 'question',
      buttons: [working.length > 0 ? 'Stop them and switch' : 'Quit and switch', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: `Quit "${names}" and open "${profile.name}"?`,
      detail: switchDetail(working, sessions.length - working.length, state.unreadable),
    };
    const parent = dialogParent();
    const { response } = parent ? await dialog.showMessageBox(parent, options) : await dialog.showMessageBox(options);
    if (response !== 0) return { opened: false };
    for (const r of others) {
      if (!(await desktop.quit(r.pid))) {
        throw new Error(`"${profileNameFor(r.userDataDir)}" did not quit within 15 seconds. Close it yourself, then try again.`);
      }
    }
  }

  // When this profile is already running, Desktop's single-instance lock
  // focuses its window instead of starting a second copy.
  desktop.launch(profile);
  setTimeout(refresh, 4000);
  return { opened: true };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// What a switch would interrupt, from Claude Code's own session records.
function switchDetail(working, idle, unreadable) {
  const lines = [];
  if (working.length > 0) {
    const shown = working.slice(0, 3).map((r) => `  • ${claudeSessions.describe(r)}`);
    if (working.length > 3) shown.push(`  • and ${working.length - 3} more`);
    lines.push(`${plural(working.length, 'Claude Code session')} ${working.length === 1 ? 'is' : 'are'} working right now and will stop mid-task:`, ...shown);
  } else {
    lines.push('No Claude Code session is working right now.');
  }
  if (idle > 0) lines.push(`${plural(idle, 'idle session')} will close; you can resume ${idle === 1 ? 'it' : 'them'} after switching back.`);
  if (unreadable > 0) lines.push(`${plural(unreadable, 'session record')} could not be read, so a working session may be missing from this list.`);
  return lines.join('\n');
}

async function removeProfile(id) {
  const profile = store.get(id);
  if (!profile) throw new Error('Profile not found.');
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Remove from list', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: `Remove "${profile.name}" from the launcher?`,
    detail: `Its data folder stays on disk:\n${profile.dir}\nAdd a profile with the same name to use it again.`,
  });
  if (response !== 0) return { removed: false };
  store.remove(id);
  refresh();
  return { removed: true };
}

function getSettings() {
  return settings.get();
}

function updateSettings(patch) {
  const before = settings.get();
  const after = settings.update(patch);
  if (after.openAtLogin !== before.openAtLogin) {
    autostart.setEnabled(after.openAtLogin, { exec: process.execPath, appDir: app.getAppPath(), icon: ICON });
  }
  if (after.refreshMinutes !== before.refreshMinutes) scheduleRefresh();
  return after;
}

// --- Background refresh: re-reads every profile's files, updates the tray,
// raises notifications and keeps an open window current.

function usageLabel(p) {
  if (!p.exists) return 'not signed in';
  const u = p.usage;
  if (!u || (u.fiveHour == null && u.sevenDay == null)) return 'no usage yet';
  return `5h ${u.fiveHour ?? '–'}% · 7d ${u.sevenDay ?? '–'}%`;
}

function updateTray(snap) {
  if (!tray) return;
  const lines = snap.profiles.map((p) => `${p.name}${p.running ? ' (running)' : ''}: ${usageLabel(p)}`);
  tray.setToolTip(['Claude Launcher', ...lines].join('\n'));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Claude Launcher', enabled: false },
    { type: 'separator' },
    ...snap.profiles.map((p) => ({
      label: `${p.name} — ${usageLabel(p)}`,
      type: 'radio',
      checked: p.running,
      click: () => openProfile(p.id).catch((err) => dialog.showErrorBox('Could not switch', err.message)),
    })),
    { type: 'separator' },
    { label: 'Show window', click: showWindow },
    { label: 'Refresh now', click: refresh },
    { type: 'separator' },
    { label: 'Quit Claude Launcher', click: () => app.quit() },
  ]));
}

function notify(alerts) {
  if (!Notification.isSupported()) return;
  for (const alert of alerts) {
    const n = new Notification({ title: alert.title, body: alert.body, icon: ICON, silent: false });
    n.on('click', showWindow);
    n.show();
  }
}

function refresh() {
  let snap;
  try {
    snap = snapshot();
  } catch {
    return;
  }
  updateTray(snap);
  const result = checkAlerts(snap.profiles, alertMemory, snap.now, settings.get());
  alertMemory = result.memory;
  notify(result.alerts);
  if (win && !win.isDestroyed() && win.isVisible()) win.webContents.send('snapshot', snap);
  return snap;
}

function scheduleRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, settings.get().refreshMinutes * 60 * 1000);
}

// --- Window and tray

function showWindow() {
  if (!win || win.isDestroyed()) createWindow(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  refresh();
}

function createWindow(visible) {
  win = new BrowserWindow({
    width: 560,
    height: 780,
    minWidth: 380,
    minHeight: 420,
    show: false,
    title: 'Claude Launcher',
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#15122f' : '#f3edfb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (visible) win.once('ready-to-show', () => win.show());

  // With the tray available, closing the window only hides it.
  win.on('close', (event) => {
    if (!quitting && tray && settings.get().closeToTray) {
      event.preventDefault();
      win.hide();
    }
  });

  // The UI never needs to navigate or open windows.
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function createTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
  } catch {
    tray = null; // No tray host on this desktop: the launcher behaves like a plain window.
    return;
  }
  tray.on('click', () => (win && win.isVisible() && win.isFocused() ? win.hide() : showWindow()));
}

// Errors reach the renderer as plain messages instead of Electron's wrapped ones.
function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, value: await fn(...args) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    const userData = app.getPath('userData');
    store = new ProfileStore(path.join(userData, 'profiles.json'));
    settings = new SettingsStore(path.join(userData, 'settings.json'));
    // The autostart file is the truth; it may have been removed by hand.
    if (settings.get().openAtLogin !== autostart.isEnabled()) settings.update({ openAtLogin: autostart.isEnabled() });

    handle('profiles:list', snapshot);
    handle('profiles:add', (name) => store.add(name));
    handle('profiles:rename', (id, name) => store.rename(id, name));
    handle('profiles:remove', removeProfile);
    handle('profiles:open', openProfile);
    handle('settings:get', getSettings);
    handle('settings:set', updateSettings);

    createTray();
    const hidden = Boolean(tray) && (process.argv.includes('--hidden') || settings.get().startHidden);
    createWindow(!hidden);
    refresh();
    scheduleRefresh();
  });

  app.on('before-quit', () => {
    quitting = true;
  });

  // The tray keeps the launcher alive; without one, closing the window quits.
  app.on('window-all-closed', () => {
    if (!tray) app.quit();
  });
}
