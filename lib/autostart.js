// Start at login through the XDG autostart folder. Electron's
// app.setLoginItemSettings does nothing on Linux.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const quote = (s) => `"${s.replace(/(["`$\\])/g, '\\$1')}"`;

function entryPath(home = os.homedir()) {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  return path.join(configHome, 'autostart', 'claude-launcher.desktop');
}

// exec: the Electron binary; appDir: the project folder it runs.
function entryText(exec, appDir, icon) {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Claude Launcher',
    'Comment=Keeps Claude Launcher in the tray',
    `Exec=${quote(exec)} ${quote(appDir)} --hidden`,
    `Icon=${icon}`,
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n');
}

function setEnabled(enabled, { exec, appDir, icon, file = entryPath() }) {
  if (enabled) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, entryText(exec, appDir, icon));
  } else {
    fs.rmSync(file, { force: true });
  }
}

function isEnabled(file = entryPath()) {
  return fs.existsSync(file);
}

module.exports = { setEnabled, isEnabled, entryPath, entryText };
