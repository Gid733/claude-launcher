'use strict';

const api = window.launcher;
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const SVG_NS = 'http://www.w3.org/2000/svg';

const els = {
  list: document.getElementById('profiles'),
  summary: document.getElementById('summary'),
  banner: document.getElementById('banner'),
  refresh: document.getElementById('refresh'),
  add: document.getElementById('add'),
  dialog: document.getElementById('name-dialog'),
  form: document.getElementById('name-form'),
  title: document.getElementById('name-title'),
  input: document.getElementById('name-input'),
  hint: document.getElementById('name-hint'),
  error: document.getElementById('name-error'),
  ok: document.getElementById('name-ok'),
  cancel: document.getElementById('name-cancel'),
};

let snapshot = null;
let busyId = null;

// Small element builder. Text always goes in through textContent.
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child != null && child !== false) el.append(child);
  return el;
}

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

// A reference to a symbol in index.html.
function icon(id, cls) {
  const el = svg('svg', { 'aria-hidden': 'true', ...(cls ? { class: cls } : {}) });
  el.append(svg('use', { href: `#${id}` }));
  return el;
}

function timeAgo(ms, now) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hrs = Math.round(m / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

function showBanner(message) {
  els.banner.textContent = message;
  els.banner.hidden = false;
}

function hideBanner() {
  els.banner.hidden = true;
}

function level(value) {
  if (value == null) return 'none';
  if (value >= 95) return 'critical';
  if (value >= 80) return 'warn';
  return 'ok';
}

function duration(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 48) return min % 60 ? `${hrs} h ${min % 60} min` : `${hrs} h`;
  return `${Math.round(hrs / 24)} days`;
}

function clock(ms, now) {
  const d = new Date(ms);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === new Date(now).toDateString() ? time : `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`;
}

// "4:21 PM–4:36 PM" reads as "4:21–4:36 PM" when both ends share the day and suffix.
function clockRange(from, to, now) {
  const a = clock(from, now);
  const b = clock(to, now);
  const suffix = b.match(/\s?[^\d\s:]+$/)?.[0];
  const sameDay = new Date(from).toDateString() === new Date(to).toDateString();
  return sameDay && suffix && a.endsWith(suffix) ? `${a.slice(0, -suffix.length)}–${b}` : `${a} – ${b}`;
}

// Resets are estimated from samples, so they read as a range, never a promise.
function resetNote(reset, now) {
  if (!reset) return null;
  if (reset.latest <= now) return 'Has reset since the last sample';
  const range = clockRange(reset.earliest, reset.latest, now);
  if (reset.earliest <= now) return `Resetting now (${range})`;
  if (reset.latest - reset.earliest > 3 * 60 * 60 * 1000) return `Resets ${range}`;
  return `Resets in ~${duration(reset.earliest - now)} (${range})`;
}

function meter(label, value, faded, note) {
  const fill = h('div', { class: `fill ${level(value)}` }, value > 0 && icon('i-sparkle', 'fill-spark'));
  fill.style.width = `${Math.min(100, Math.max(0, value ?? 0))}%`;
  return h('div', { class: `meter-row${faded ? ' faded' : ''}` },
    h('span', { class: 'meter-label', text: label }),
    h('div', {
      class: 'meter',
      role: 'meter',
      'aria-label': `${label} usage`,
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': value == null ? null : String(value),
    }, fill),
    h('span', { class: 'meter-value', text: value == null ? '–' : `${value}%` }),
    note && h('span', {
      class: 'meter-note',
      title: 'Estimated from the usage samples Claude Desktop saved. Claude Desktop shows the exact time.',
      text: note,
    }),
  );
}

// 5-hour usage from the first sample of the last 24h up to now.
function sparkline(history, now) {
  const points = history.filter((s) => s.fiveHour != null);
  if (points.length < 2) return null;
  const W = 120;
  const H = 26;
  const start = points[0].t;
  const at = (s) => [((s.t - start) / Math.max(1, now - start)) * W, H - 2 - (Math.min(100, s.fiveHour) / 100) * (H - 4)];
  const coords = points.map(at);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = coords.at(-1);
  const label = `5-hour usage since ${new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const el = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark', role: 'img', 'aria-label': label });
  const title = svg('title');
  title.textContent = label;
  el.append(
    title,
    svg('polygon', { class: 'spark-area', points: `${coords[0][0].toFixed(1)},${H} ${line} ${lastX.toFixed(1)},${H}` }),
    svg('polyline', { class: 'spark-line', points: line }),
    svg('circle', { class: 'spark-dot', cx: lastX.toFixed(1), cy: lastY.toFixed(1), r: '2.6' }),
  );
  return el;
}

function statusPill(p) {
  if (p.running) return h('span', { class: 'pill running' }, icon('i-sparkle'), 'Running');
  if (!p.exists) return h('span', { class: 'pill', text: 'Never opened' });
  return h('span', { class: 'pill', text: 'Closed' });
}

function usageBlock(p, now) {
  if (!p.usage) {
    return h('p', { class: 'muted', text: p.exists
      ? 'No usage recorded yet. Desktop writes it every 15–30 minutes while the profile is open.'
      : 'Not signed in yet. Open it and Claude Desktop shows its sign-in screen; sign in with the account this profile is for.' });
  }
  // Desktop saves an empty sample when neither window has started.
  if (p.usage.fiveHour == null && p.usage.sevenDay == null) {
    return h('p', { class: 'muted', text: `No usage in the current 5-hour or weekly window yet. Checked ${timeAgo(p.usage.at, now)}.` });
  }
  const fiveReset = p.usage.fiveHourReset;
  const stale = now - p.usage.at > FIVE_HOURS_MS || (fiveReset != null && fiveReset.latest <= now);
  const five = p.usage.fiveHour;
  return h('div', { class: 'usage' },
    h('div', { class: `figure ${level(five)}${stale ? ' faded' : ''}` },
      h('span', { class: 'figure-value', 'data-target': five == null ? null : String(five) },
        five == null ? '–' : String(five), five != null && h('small', { text: '%' })),
      h('span', { class: 'figure-label', text: '5-hour used' }),
    ),
    h('div', { class: 'meters' },
      meter('5-hour', five, stale, resetNote(fiveReset, now)),
      meter('7-day', p.usage.sevenDay, false, resetNote(p.usage.sevenDayReset, now)),
    ),
    h('div', { class: 'usage-foot' },
      h('span', { class: 'muted', text: `Updated ${timeAgo(p.usage.at, now)}` }),
      sparkline(p.usage.history, now),
    ),
  );
}

function sessionsBlock(p, now) {
  const s = p.sessions;
  if (s.active + s.archived === 0) return null;
  const parts = [`${s.active} active`, `${s.archived} archived`];
  const working = p.liveSessions?.working ?? 0;
  if (working > 0) parts.push(`${working} working now`);
  else if (s.lastActivityAt) parts.push(`last active ${timeAgo(s.lastActivityAt, now)}`);
  return h('div', { class: 'sessions' },
    h('p', { class: 'muted', text: `Code sessions: ${parts.join(' · ')}` }),
    s.recent.length > 0 && h('ul', { class: 'recent' },
      s.recent.map((r) => h('li', { title: r.title }, icon('i-sparkle'), h('span', { text: r.title })))),
  );
}

function card(p, snap) {
  const otherRunning = snap.profiles.some((o) => o.running && o.id !== p.id) || snap.otherRunning.length > 0;
  // A never-opened profile signs in on Desktop's own first screen.
  const openLabel = p.running ? 'Show'
    : !p.exists ? (otherRunning ? 'Quit & sign in' : 'Open & sign in')
      : otherRunning ? 'Quit & switch' : 'Open';
  const busy = busyId === p.id;
  const classes = ['card', p.running && 'is-running', !p.exists && 'is-new'].filter(Boolean).join(' ');

  return h('article', { class: classes },
    h('header', { class: 'card-head' },
      h('div', { class: 'card-title' },
        h('h2', { text: p.name }),
        statusPill(p),
        p.sharedAccount && h('span', {
          class: 'pill warn',
          text: 'Same account as another profile',
          title: 'Two profiles are signed in to the same Claude account.',
        }),
      ),
      h('button', {
        type: 'button',
        class: `${p.running ? 'ghost' : 'primary'}${busy ? ' busy' : ''}`,
        disabled: busy || !snap.installed,
        'aria-busy': busy ? 'true' : null,
        onclick: (event) => openProfile(p, event.currentTarget),
      }, busy ? [icon('i-sparkle'), otherRunning ? 'Switching…' : 'Opening…'] : openLabel),
    ),
    usageBlock(p, snap.now),
    sessionsBlock(p, snap.now),
    h('footer', { class: 'card-foot' },
      h('code', { class: 'dir', title: p.dir, text: p.dir.replace(/^\/home\/[^/]+/, '~') }),
      h('div', { class: 'card-links' },
        h('button', { type: 'button', class: 'link', onclick: () => askName(p), text: 'Rename' }),
        !p.isDefault && h('button', { type: 'button', class: 'link danger', onclick: () => removeProfile(p), text: 'Remove' }),
      ),
    ),
  );
}

function render() {
  if (!snapshot) return;
  const running = snapshot.profiles.filter((p) => p.running).map((p) => p.name);
  els.summary.textContent = !snapshot.installed
    ? 'Claude Desktop was not found at /usr/bin/claude-desktop.'
    : running.length > 0
      ? `Running: ${running.join(', ')}`
      : snapshot.otherRunning.length > 0
        ? 'Claude Desktop is running with a profile that is not in this list.'
        : 'Claude Desktop is closed.';
  // Looping animations take their delay from this one clock, so cards rebuilt
  // by a refresh continue in phase instead of restarting.
  document.documentElement.style.setProperty('--clock', `${-Math.round(performance.now())}ms`);
  els.list.replaceChildren(...snapshot.profiles.map((p) => card(p, snapshot)));
}

async function refresh() {
  const res = await api.list();
  if (!res.ok) {
    showBanner(`Could not read profiles: ${res.error}`);
    return;
  }
  const first = snapshot === null;
  snapshot = res.value;
  render();
  if (first) enter();
}

// First paint only: cards rise, bars fill (CSS, under body.entering) and the
// big 5-hour figures count up from zero.
function enter() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.body.classList.add('entering');
  setTimeout(() => document.body.classList.remove('entering'), 1500);
  // Figures are looked up every frame: a refresh (the window gaining focus
  // right after launch) may rebuild the cards mid-count.
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / 1100);
    for (const el of document.querySelectorAll('.figure-value[data-target]')) {
      el.firstChild.textContent = String(Math.round(Number(el.dataset.target) * (1 - (1 - t) ** 3)));
    }
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Eight sparkles fly out from the button's centre and fade.
function burst(from) {
  if (!from || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = from.getBoundingClientRect();
  const layer = h('div', { class: 'burst' });
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 34 + Math.random() * 22;
    const star = icon('i-sparkle');
    star.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    star.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    star.style.animationDelay = `${i * 18}ms`;
    layer.append(star);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1000);
}

async function openProfile(p, button) {
  hideBanner();
  burst(button);
  busyId = p.id;
  render();
  const res = await api.open(p.id);
  busyId = null;
  if (!res.ok) showBanner(res.error);
  await refresh();
  // Desktop takes a few seconds to start; check again once it is up.
  if (res.ok && res.value.opened) setTimeout(refresh, 4000);
}

async function removeProfile(p) {
  const res = await api.remove(p.id);
  if (!res.ok) showBanner(res.error);
  await refresh();
}

// One dialog for both adding and renaming.
let dialogTarget = null;

function askName(profile = null) {
  dialogTarget = profile;
  els.title.textContent = profile ? `Rename "${profile.name}"` : 'Add profile';
  els.ok.textContent = profile ? 'Save' : 'Add';
  els.input.value = profile ? profile.name : '';
  els.hint.textContent = profile
    ? 'Only the label changes. The data folder stays the same.'
    : 'Creates a separate Claude Desktop profile in ~/.config/Claude-<name>. Sign in to it the first time you open it.';
  els.error.hidden = true;
  els.dialog.showModal();
  els.input.select();
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = els.input.value.trim();
  if (!name) return;
  const res = dialogTarget ? await api.rename(dialogTarget.id, name) : await api.add(name);
  if (!res.ok) {
    els.error.textContent = res.error;
    els.error.hidden = false;
    return;
  }
  els.dialog.close();
  await refresh();
});

els.cancel.addEventListener('click', () => els.dialog.close());
els.add.addEventListener('click', () => askName());
els.refresh.addEventListener('click', () => {
  hideBanner();
  els.refresh.classList.remove('spinning');
  void els.refresh.offsetWidth; // restart the spin animation
  els.refresh.classList.add('spinning');
  refresh();
});
window.addEventListener('focus', refresh);

// The main process refreshes on its own schedule, also while the window is
// hidden, and pushes each result here.
api.onSnapshot((snap) => {
  const first = snapshot === null;
  snapshot = snap;
  render();
  if (first) enter();
});

// Settings apply as soon as a control changes; Done only closes the panel.
const settingsEls = {
  dialog: document.getElementById('settings-dialog'),
  form: document.getElementById('settings-form'),
  error: document.getElementById('settings-error'),
};

function showSettings(values) {
  for (const control of settingsEls.form.elements) {
    if (!(control.name in values)) continue;
    if (control.type === 'checkbox') control.checked = values[control.name];
    else control.value = String(values[control.name]);
  }
}

document.getElementById('open-settings').addEventListener('click', async () => {
  const res = await api.getSettings();
  if (!res.ok) {
    showBanner(`Could not read settings: ${res.error}`);
    return;
  }
  showSettings(res.value);
  settingsEls.error.hidden = true;
  settingsEls.dialog.showModal();
});

settingsEls.form.addEventListener('change', async (event) => {
  const control = event.target;
  if (!control.name) return;
  const value = control.type === 'checkbox' ? control.checked : Number(control.value);
  const res = await api.setSettings({ [control.name]: value });
  if (!res.ok) {
    settingsEls.error.textContent = `Could not save: ${res.error}`;
    settingsEls.error.hidden = false;
    return;
  }
  settingsEls.error.hidden = true;
  showSettings(res.value);
});

refresh();
