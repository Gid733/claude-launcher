// Adds "Claude Launcher" to the desktop's app menu for the current user, and
// routes claude:// links (such as the sign-in callback) to whichever Claude
// Desktop profile is running instead of always the default one.
//
// Desktop re-registers itself as the claude:// handler on every start, with
// `Exec=claude-desktop %U`. So instead of competing for that setting, a
// ~/.local/bin/claude-desktop link (ahead of /usr/bin on PATH) catches the
// links and passes everything else through.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const electronBin = require('electron'); // Outside Electron this is the binary's path.
const projectDir = path.resolve(__dirname, '..');
const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');

const quote = (s) => `"${s.replace(/(["`$\\])/g, '\\$1')}"`;

function writeEntry(name, lines) {
  const target = path.join(appsDir, name);
  fs.mkdirSync(appsDir, { recursive: true });
  fs.writeFileSync(target, ['[Desktop Entry]', ...lines, ''].join('\n'));
  console.log(`Wrote ${target}`);
}

writeEntry('claude-launcher.desktop', [
  'Type=Application',
  'Name=Claude Launcher',
  'Comment=Open Claude Desktop with a separate profile per account',
  `Exec=${quote(electronBin)} ${quote(projectDir)}`,
  `Icon=${path.join(projectDir, 'build', 'icon.png')}`,
  'Terminal=false',
  'Categories=Utility;',
  'StartupWMClass=claude-launcher',
]);

// An earlier version registered its own claude:// entry; Desktop overrides it.
fs.rmSync(path.join(appsDir, 'claude-launcher-url.desktop'), { force: true });

try {
  execFileSync('update-desktop-database', [appsDir], { stdio: 'ignore' });
} catch {
  // Optional: the menu cache refreshes on its own too.
}

const handler = path.join(projectDir, 'scripts', 'claude-url-handler.sh');
fs.chmodSync(handler, 0o755);
const shim = path.join(os.homedir(), '.local', 'bin', 'claude-desktop');
let existing = null;
try {
  existing = fs.readlinkSync(shim);
} catch (err) {
  if (err.code === 'EINVAL') {
    console.error(`${shim} exists and is not a link this script made; leaving it alone.`);
    process.exit(1);
  }
}
if (existing !== handler) {
  fs.mkdirSync(path.dirname(shim), { recursive: true });
  fs.rmSync(shim, { force: true });
  fs.symlinkSync(handler, shim);
}
console.log(`Linked ${shim} -> ${handler}`);
console.log('claude:// links now open in the running profile. To undo: rm ~/.local/bin/claude-desktop');
