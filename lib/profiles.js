// The launcher's own list of Desktop profiles. Each profile is just a name and
// the Electron user-data folder Claude Desktop is started with.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CONFIG_ROOT = path.join(os.homedir(), '.config');
const DEFAULT_DIR = path.join(CONFIG_ROOT, 'Claude');

const MAIN_PROFILE = { id: 'main', name: 'Main', dir: DEFAULT_DIR, isDefault: true };

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

class ProfileStore {
  constructor(file) {
    this.file = file;
    this.profiles = this.#load();
  }

  #load() {
    let saved = [];
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(data.profiles)) saved = data.profiles;
    } catch {
      // First run or unreadable file: start with just the main profile.
    }
    const extra = saved.filter(
      (p) => p && typeof p.id === 'string' && p.id !== MAIN_PROFILE.id &&
        typeof p.name === 'string' && typeof p.dir === 'string',
    );
    const main = saved.find((p) => p?.id === MAIN_PROFILE.id);
    return [
      { ...MAIN_PROFILE, name: typeof main?.name === 'string' ? main.name : MAIN_PROFILE.name },
      ...extra.map(({ id, name, dir }) => ({ id, name, dir, isDefault: false })),
    ];
  }

  #save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    const profiles = this.profiles.map(({ id, name, dir }) => ({ id, name, dir }));
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, profiles }, null, 2));
    fs.renameSync(tmp, this.file);
  }

  list() {
    return this.profiles.map((p) => ({ ...p }));
  }

  get(id) {
    return this.profiles.find((p) => p.id === id) ?? null;
  }

  add(name) {
    const clean = String(name ?? '').trim();
    const slug = slugify(clean);
    if (!slug) throw new Error('Use a name with at least one letter or digit.');
    if (slug === MAIN_PROFILE.id) throw new Error('"main" is reserved for the default profile.');

    // The folder comes from the id, so a unique id means a unique folder. A
    // Claude-<id> folder left from a removed profile is reused, sign-in included.
    let id = slug;
    for (let n = 2; this.get(id); n++) id = `${slug}-${n}`;
    const profile = { id, name: clean, dir: path.join(CONFIG_ROOT, `Claude-${id}`), isDefault: false };
    this.profiles.push(profile);
    this.#save();
    return { ...profile };
  }

  rename(id, name) {
    const profile = this.get(id);
    if (!profile) throw new Error('Profile not found.');
    const clean = String(name ?? '').trim();
    if (!clean) throw new Error('Name cannot be empty.');
    profile.name = clean;
    this.#save();
    return { ...profile };
  }

  // Removes the profile from the list only. Its data folder stays on disk.
  remove(id) {
    if (id === MAIN_PROFILE.id) throw new Error('The main profile cannot be removed.');
    const before = this.profiles.length;
    this.profiles = this.profiles.filter((p) => p.id !== id);
    if (this.profiles.length === before) throw new Error('Profile not found.');
    this.#save();
  }
}

module.exports = { ProfileStore, DEFAULT_DIR, slugify };
