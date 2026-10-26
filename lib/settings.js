// The launcher's own preferences, saved next to profiles.json.
const fs = require('node:fs');
const path = require('node:path');

const REFRESH_CHOICES = [1, 5, 15];

const DEFAULTS = Object.freeze({
  closeToTray: true, // closing the window keeps the launcher running in the tray
  startHidden: false, // start in the tray without opening the window
  openAtLogin: false, // start with the desktop session (always hidden)
  refreshMinutes: 1, // how often profile files are read again
  notifyUsage: true, // notify at 80% and 95% of a 5-hour window
  notifyReset: true, // notify when a nearly full 5-hour window has reset
});

// Unknown keys and values of the wrong type fall back to the defaults.
function sanitize(input) {
  const out = { ...DEFAULTS };
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(DEFAULTS)) {
    if (key === 'refreshMinutes') {
      if (REFRESH_CHOICES.includes(input.refreshMinutes)) out.refreshMinutes = input.refreshMinutes;
    } else if (typeof input[key] === 'boolean') {
      out[key] = input[key];
    }
  }
  return out;
}

class SettingsStore {
  constructor(file) {
    this.file = file;
    let saved = null;
    try {
      saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // First run or unreadable file: defaults.
    }
    this.values = sanitize(saved);
  }

  get() {
    return { ...this.values };
  }

  // Applies only known keys with valid values; returns the full result.
  update(patch) {
    this.values = sanitize({ ...this.values, ...patch });
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.values, null, 2));
    fs.renameSync(tmp, this.file);
    return this.get();
  }
}

module.exports = { SettingsStore, DEFAULTS, REFRESH_CHOICES, sanitize };
