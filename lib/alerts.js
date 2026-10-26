// Decides which notifications a fresh snapshot deserves. Pure: takes the
// previous memory and returns the alerts plus the next memory, so the main
// process only has to show them.
//
// memory: { [profileId]: { window, level, resetSeen } }
//   window    - the 5-hour window's estimated end (identifies the window)
//   level     - highest threshold already announced in that window (0/80/95)
//   resetSeen - the window end whose reset was already announced

const THRESHOLDS = [95, 80];

const levelOf = (pct) => THRESHOLDS.find((t) => pct >= t) ?? 0;

function checkAlerts(profiles, memory, now, { notifyUsage = true, notifyReset = true } = {}) {
  const alerts = [];
  const next = {};

  for (const p of profiles) {
    const usage = p.usage;
    const five = usage?.fiveHour ?? null;
    const reset = usage?.fiveHourReset ?? null;
    const window = reset ? reset.latest : null;
    const level = five == null ? 0 : levelOf(five);
    const prev = memory[p.id];

    if (!prev) {
      // First sight: remember the current state without announcing it.
      next[p.id] = { window, level, resetSeen: reset && reset.latest <= now ? reset.latest : null };
      continue;
    }

    const sameWindow = prev.window === window;
    const known = sameWindow ? prev.level : 0;
    if (notifyUsage && level > known && !(reset && reset.latest <= now)) {
      alerts.push({
        profileId: p.id,
        title: `${p.name}: ${five}% of the 5-hour limit used`,
        body: reset ? `Resets around ${new Date(reset.latest).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (estimated).` : '',
      });
    }

    let resetSeen = prev.resetSeen;
    if (reset && reset.latest <= now && resetSeen !== reset.latest) {
      if (notifyReset && five != null && five >= THRESHOLDS.at(-1)) {
        alerts.push({
          profileId: p.id,
          title: `${p.name}: 5-hour window has reset`,
          body: 'Estimated from the usage Claude Desktop saved.',
        });
      }
      resetSeen = reset.latest;
    }

    next[p.id] = { window, level: Math.max(level, known), resetSeen };
  }

  return { alerts, memory: next };
}

module.exports = { checkAlerts };
