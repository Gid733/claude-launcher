# claude-launcher

A small Electron app for Linux. It opens Claude Desktop with a separate profile for each of your Claude accounts and shows each profile's usage, so you can switch accounts without signing out.

## How it works

- Each profile is its own Electron data folder: `claude-desktop --user-data-dir=~/.config/Claude-<name>`. The folder holds that profile's sign-in, Code tab session list and app settings. The **Main** profile is your normal `~/.config/Claude`.
- Only one profile runs at a time. **Quit & switch** asks first, closes the running Desktop with SIGTERM (as a logout would), then opens the profile you picked. The question names any Claude Code session that is working right now. It finds them the way claude-swap does: from Claude Code's own `~/.claude/sessions/<pid>.json` records, counting a record only when its process is alive and its start time matches the record, so a reused PID never counts. A new profile's button reads **Open & sign in**: Claude Desktop shows its own sign-in screen the first time, and the profile stays signed in from then on.
- Usage comes from `plan-usage-history.json`, which Claude Desktop writes into each profile folder every 15–30 minutes while that profile is open. The cards show how old the numbers are.
- Reset times are estimated from those samples, and the cards show them as a time range:
  - The 5-hour window starts with the first use after a reset, so the newest rise from 0 brackets its start.
  - The weekly window resets on a fixed schedule, so past weekly drops, overlaid a week apart, narrow it down.

  Claude Desktop's own usage panel shows the exact times.
- Session counts and recent titles come from `claude-code-sessions/*/*/local_*.json` (only `title`, `isArchived` and `lastActivityAt` are read).
- All profiles share `~/.claude` (transcripts, settings, skills, memory).

## Tray and settings

The launcher sits in the system tray. Hover the icon for every account's 5-hour and 7-day usage. Right-click it to switch profiles, show the window, refresh now or quit. Left-click shows or hides the window.

Settings (the sliders button in the window's header) apply immediately:

| Setting | Default |
|---|---|
| Keep running in the tray when closed | on |
| Start in the tray (no window on start) | off |
| Start at login (writes `~/.config/autostart/claude-launcher.desktop`, starts in the tray) | off |
| Check profiles every 1 / 5 / 15 minutes | 1 minute |
| Notify at 80% and 95% of a 5-hour window | on |
| Notify when a nearly full 5-hour window resets | on |

Background refresh re-reads what each profile's Claude Desktop has saved. It updates the tray, the window and the reset estimates, and sends notifications. A closed profile's usage only changes after you open that profile again: the launcher never signs in or calls Anthropic's servers itself.

Notifications stay quiet the first time the launcher sees a profile, so starting it doesn't announce the current state. Each threshold alerts once per 5-hour window. A reset only alerts when the window was at least 80% used.

Settings live in `~/.config/claude-launcher/settings.json`, and the profile list in `profiles.json` next to it.

## What it deliberately does not do

- It makes no network requests and never calls Anthropic's servers.
- It never reads, copies or moves sign-in tokens or cookies. From `config.json` it reads only `lastKnownAccountUuid`, to warn when two profiles use the same account.
- It never switches accounts on its own. Moving from account to account to get around usage limits could break Anthropic's [Consumer Terms](https://www.anthropic.com/legal/consumer-terms), which prohibit "bypassing any of our systems or protective measures". Use it for accounts you own and keep for separate purposes (personal / work). Never share an account.
- It is not an Anthropic product. Desktop's file formats can change. The readers then show "no data" instead of failing.

## Use

```bash
npm install
npm start
```

Add it to your app menu and route `claude://` links to the running profile:

```bash
npm run desktop-entry
```

Signing in with Google (or anything else that goes through the browser) returns to Desktop through a `claude://` link. Desktop registers itself as the handler on every start, as `claude-desktop %U`, and that always opens the default profile. A new profile's sign-in would land in the wrong window. `npm run desktop-entry` therefore also links `~/.local/bin/claude-desktop` to `scripts/claude-url-handler.sh`, which comes ahead of `/usr/bin` on PATH. It passes `claude://` links to the running profile (a non-default one first) and every other launch straight through to `/usr/bin/claude-desktop`. To undo it:

```bash
rm ~/.local/bin/claude-desktop
```

Run the tests:

```bash
npm test
```

The icon source is `renderer/icon.svg`. Regenerate the PNGs after editing it:

```bash
magick -background none -density 192 renderer/icon.svg -resize 512x512 build/icon.png
magick -background none -density 96 renderer/icon.svg -resize 32x32 build/tray.png
magick -background none -density 192 renderer/icon.svg -resize 64x64 build/tray@2x.png
```

The display font is Fredoka (SIL Open Font License, `renderer/fonts/OFL.txt`), bundled so the strict CSP needs no remote fonts.

Removing a profile only takes it off the list. To delete its sign-in and session list as well, remove `~/.config/Claude-<name>` yourself.
