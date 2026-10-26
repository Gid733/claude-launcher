---
name: Claude Launcher
description: A Twilight Sparkle themed profile switcher for Claude Desktop, read in one scan.
colors:
  ground: "#f3edfb"
  ground-star: "rgb(118 76 186 / 0.16)"
  surface: "#ffffff"
  surface-soft: "#faf6ff"
  line: "#e4d8f3"
  text: "#241a43"
  muted: "#65578a"
  indigo: "#2b3a7a"
  violet: "#6e2d8f"
  magenta: "#c2307a"
  magenta-strong: "#a8216a"
  on-magenta: "#ffffff"
  aura: "rgb(226 71 155 / 0.32)"
  aura-soft: "rgb(226 71 155 / 0.14)"
  track: "#ece3f7"
  fill-from: "#7b54d6"
  fill-to: "#d6418f"
  warn: "#a86b00"
  critical: "#d93a5a"
  running: "#b8277a"
  running-bg: "#fbe3f0"
  badge-bg: "#fdf0d2"
  badge-text: "#6b4a05"
  error-bg: "#fde4ea"
  glint: "#ffd6ec"
  ground-dark: "#15122f"
  ground-star-dark: "rgb(255 255 255 / 0.5)"
  surface-dark: "#211b47"
  surface-soft-dark: "#1b1640"
  line-dark: "#3a3170"
  text-dark: "#f5eeff"
  muted-dark: "#b9abdf"
  indigo-dark: "#8fa0ff"
  violet-dark: "#c79cf0"
  magenta-dark: "#ff6fb1"
  magenta-strong-dark: "#ff8cc2"
  on-magenta-dark: "#2a0b22"
  aura-dark: "rgb(255 111 177 / 0.45)"
  aura-soft-dark: "rgb(255 111 177 / 0.16)"
  track-dark: "#2f2763"
  fill-from-dark: "#9b7bff"
  fill-to-dark: "#ff6fb1"
  warn-dark: "#ffc24a"
  critical-dark: "#ff6b84"
  running-dark: "#ff8cc2"
  running-bg-dark: "#3d1d4f"
  badge-bg-dark: "#433316"
  badge-text-dark: "#ffd98a"
  error-bg-dark: "#4a1d33"
typography:
  display:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1
  label-sm:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
  mono:
    fontFamily: "ui-monospace, JetBrains Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  field: "12px"
  card: "16px"
  dialog: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
components:
  button-primary:
    backgroundColor: "{colors.magenta}"
    textColor: "{colors.on-magenta}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 15px"
  button-primary-hover:
    backgroundColor: "{colors.magenta-strong}"
    textColor: "{colors.on-magenta}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 15px"
  button-icon:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "8px"
  button-icon-hover:
    textColor: "{colors.violet}"
  button-link:
    textColor: "{colors.muted}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.pill}"
    padding: "5px 8px"
  button-link-hover:
    backgroundColor: "{colors.aura-soft}"
    textColor: "{colors.violet}"
  button-link-danger-hover:
    textColor: "{colors.critical}"
  pill-status:
    textColor: "{colors.muted}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.pill}"
    padding: "4px 9px"
  pill-running:
    backgroundColor: "{colors.running-bg}"
    textColor: "{colors.running}"
    rounded: "{rounded.pill}"
    padding: "4px 9px"
  pill-warn:
    backgroundColor: "{colors.badge-bg}"
    textColor: "{colors.badge-text}"
    rounded: "{rounded.pill}"
    padding: "4px 9px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "18px 18px 10px"
  card-new:
    backgroundColor: "{colors.surface-soft}"
    rounded: "{rounded.card}"
  meter-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.pill}"
    height: "10px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
    padding: "22px 20px 18px"
    width: "min(380px, calc(100vw - 32px))"
  input:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
  banner:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
---

# Design System: Claude Launcher

## Overview

**Creative North Star: "Twilight's Spellbook"**

A small desktop window that reads like a page from Twilight Sparkle's study: her lavender coat as the ground, her indigo, violet and magenta mane as the accents, and her magic as the only ornament. The world borrows her colours, her star and her aura, never her character art. It exists to refuse the neutral grey settings panel; every surface stays tinted toward lavender, and magenta is reserved for the things that act or are alive.

The window follows the system theme with two skies. Dark mode is a night star-field (deep indigo ground with sparse white dots); light mode is a lavender mist (pale lilac ground with faint violet dots). Every colour token exists in both sets, and the pairings swap together, so magenta stays the primary in both and only its lightness flips.

Density is personal and direct: a stack of profile cards, each carrying a large 5-hour numeral, two meters on one fixed scale, a sparkline and a short session list. Motion is small and purposeful (a slow aura pulse on the running card, a twinkling sparkle, an eight-sparkle burst when a switch is cast) and disappears entirely under reduced motion.

**Key Characteristics:**
- Lavender-tinted neutrals in both themes; no pure grey surface anywhere.
- Tri-colour mane stripe on the top edge of cards and the dialog.
- Four-point sparkle as the single ornament symbol.
- Rounded Fredoka for voice (headings, numerals, buttons, pills), system UI for reading.
- Pill-shaped controls; magenta primary.
- The running profile glows; nothing else does.

## Colors

A night-and-mist palette from one character: lavender neutrals, a three-hue mane, and a magenta that marks action and life. The frontmatter carries the light set under plain names and the dark set under `-dark` names; the two always ship together.

### Primary
- **Magic Magenta** (`magenta` / `magenta-dark`): primary buttons, focus outlines, input focus border, text selection, caret, sparkline stroke and dot, the running card border, and the third band of the mane stripe.
- **Deep Magenta** (`magenta-strong` / `magenta-strong-dark`): primary button hover only. In dark mode it is lighter than the base, because hover moves toward the light in both skies.
- **Ink on Magenta** (`on-magenta` / `on-magenta-dark`): label colour on magenta fills; white in light mode, a deep plum in dark mode.

### Secondary
- **Mane Violet** (`violet` / `violet-dark`): hover border for ghost and icon buttons, link hover text, session-list sparkle bullets, scrollbar hover, every other burst sparkle, and the middle stripe band.
- **Mane Indigo** (`indigo` / `indigo-dark`): first band of the mane stripe. It appears nowhere else in the UI; it is a motif colour, not a role colour.

### Tertiary
- **Aura** (`aura`, `aura-soft` and their `-dark` pairs): translucent magenta used only as light, never as a fill for content. `aura` tints soft shadows (primary button, logo, dialog, the running glow); `aura-soft` is the running ring, the sparkline area and the link hover wash.
- **Meter Gradient** (`fill-from` to `fill-to`): violet-to-magenta fill for usage under 80%.
- **Gold Warning** (`warn` / `warn-dark`): meter fill and 5-hour numeral at 80% and above.
- **Rose Critical** (`critical` / `critical-dark`): meter fill and numeral at 95% and above; inline form errors; Remove link hover.
- **Running Rose** (`running`, `running-bg`): the Running pill.
- **Badge Gold** (`badge-bg`, `badge-text`): the "same account" warning pill.
- **Error Blush** (`error-bg`): the alert banner behind body text.

### Neutral
- **Lavender Mist / Night Sky** (`ground` / `ground-dark`): window ground under the star field.
- **Star Dust** (`ground-star` / `ground-star-dark`): the sparse star dots, violet at 16% by day, white at 50% by night.
- **Card White / Twilight Panel** (`surface` / `surface-dark`): cards, dialog, ghost and icon buttons.
- **Soft Lilac** (`surface-soft` / `surface-soft-dark`): never-opened cards and text inputs.
- **Lilac Line** (`line` / `line-dark`): card borders, pill outlines, ghost button borders, card footer rule, scrollbar thumb.
- **Meter Track** (`track` / `track-dark`): empty meter channel.
- **Ink** (`text` / `text-dark`) and **Muted Lilac** (`muted` / `muted-dark`): primary and secondary text. Muted holds 5.5:1 or better on every light surface and 7.5:1 on dark ones.

### Named Rules
**The Two Skies Rule.** Every colour is a pair. A new token ships with a light and a dark value, or it does not ship.

**The Magenta Acts Rule.** Magenta marks what you can press or what is alive (primary actions, focus, the running profile, the live sparkline). It is never used for static decoration beyond the mane stripe band.

**The Headroom Ladder Rule.** Usage colour has three rungs and no others: the violet-to-magenta gradient below 80%, gold at 80% and above, rose-red at 95% and above. The numeral and its meter take the same rung.

## Typography

**Display Font:** Fredoka 500/600, bundled locally (with system-ui, sans-serif)
**Body Font:** system-ui (with -apple-system, Segoe UI, sans-serif)
**Label/Mono Font:** Fredoka 500 for labels; ui-monospace (with JetBrains Mono) for data folder paths

**Character:** Fredoka's rounded terminals give the window its storybook voice; the system face keeps reading text native and quiet. Fredoka speaks, system UI explains.

### Hierarchy
- **Display** (Fredoka 600, 40px, line-height 1, -0.02em, tabular numerals): the 5-hour usage figure on each card, the dominant numeral of the window. Its `%` sign drops to Fredoka 500 at 18px in muted lilac.
- **Headline** (Fredoka 600, 21px, 1.15, -0.01em): the window title.
- **Title** (Fredoka 600, 17px, 1.2, -0.01em): profile names and the dialog title.
- **Body** (system 400, 14px, 1.45): default text. Body-sm (13px) carries the status line, muted notes, session titles and form labels.
- **Caption** (system 400, 12px): the figure label, hints and the footer note (capped at 62ch).
- **Label** (Fredoka 500, 14px, line-height 1): buttons. Label-sm (12px) for pills; link buttons sit at 13px; meter values at 13px with tabular numerals.
- **Mono** (ui-monospace, 12px, muted): data folder paths, truncated with an ellipsis.

### Named Rules
**The Fredoka Speaks Rule.** Fredoka is for headings, numerals, buttons and pills. Paragraphs, notes, labels and lists stay in system UI.

**The Tabular Numbers Rule.** Every usage percentage uses tabular numerals so stacked cards align digit for digit.

## Layout

A single column for a window of roughly 560 by 780. The body is padded 18px top, 16px sides, 24px bottom. The header is a three-column grid (44px icon, title and status line, actions) with 12px gaps and 16px below. Cards stack in a grid with 14px between them.

Inside a card, sections are separated by 12px. The usage block is a two-column grid: the display numeral on the left, the two meters on the right (18px column gap), with each meter row a fixed 50px label, a fluid bar, and a 40px right-aligned value. The usage footer pairs the "Updated" age with a 120 by 26 sparkline. The card footer is set off by a 1px line rule and 8px padding.

Spacing steps observed in the build are 4, 8, 12, 14 and 18px, with 6, 9 and 10px used inside small components.

At 440px wide and below, the header actions wrap to their own row, the usage block collapses to one column, and the usage footer stacks.

## Elevation & Depth

Depth is soft and tinted. Light mode uses violet-tinted ambient shadows; dark mode uses deeper black shadows and relies on lighter panel tones against the night ground. Aura-tinted magenta glow is a state signal: it marks the running card, and in a softer static form it sits under the primary button, the logo and the dialog.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 6px 18px -8px rgb(56 30 110 / 0.28), 0 1px 3px rgb(56 30 110 / 0.08)`; dark `0 10px 24px -12px rgb(0 0 0 / 0.6), 0 1px 2px rgb(0 0 0 / 0.3)`): every profile card at rest.
- **Running aura** (`box-shadow: <card rest>, 0 0 0 4px <aura-soft>, 0 8px 28px -6px <aura>`): the running card, pulsing to a 6px ring and a 34px glow over 3.2s.
- **Primary lift** (`0 4px 12px -4px <aura>`, hover `0 8px 18px -6px <aura>`): primary button.
- **Logo glow** (`0 6px 16px -6px <aura>`): the header icon.
- **Dialog float** (`0 24px 60px -20px <aura>`): the dialog, over a 45% night backdrop with a 2px blur.

### Named Rules
**The One Glow Rule.** Only the running card pulses. Exactly one card can be running, so exactly one thing on screen breathes.

**The Fresh Start Rule.** Never-opened cards drop their shadow, take the soft lilac surface and a dashed border: they have no state yet, so they claim no depth.

## Shapes

Everything is rounded. Controls and pills are full pills (999px). Fields, the banner and the logo use 12px corners; cards 16px; the dialog 20px. Borders are thin (1px on cards and pills, 1.5px on buttons and inputs) and always in lilac line colour until hover or focus. Cards and the dialog clip their contents so the mane stripe follows the corner.

The four-point sparkle (a star with concave sides drawn on a 20-unit box) is the only recurring silhouette. It serves as list bullet, meter cap, running-pill mark and burst particle.

### Named Rules
**The Mane Stripe Rule.** Cards and the dialog carry a 5px tri-colour stripe across their full top edge: indigo, violet, magenta in equal hard-stop thirds. On resting cards it sits at 35% opacity; on the running card and the dialog it is solid. It never runs down a side edge and never gains a fourth colour.

**The One Star Rule.** The four-point sparkle is the only ornament symbol. Bullets, caps and celebratory particles use it; there are no emoji, glyph stars or other decorative icons. Functional icons (refresh, plus) are stroked SVG at 16px.

## Components

### Buttons
Tactile, rounded and quick: they lift slightly, never bounce.
- **Shape:** full pill (999px), 1.5px border, Fredoka 500 at 14px, 6px gap to a 16px icon.
- **Primary:** magic magenta fill, ink-on-magenta label, 8px by 15px padding, soft aura lift. Used for Add profile, Open, Quit & switch, and dialog confirm.
- **Hover / Focus:** primary deepens to the strong magenta and rises 1px with a larger aura over 0.18s on an expo-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`); it settles back on press. Every button and input shows a 2.5px magenta outline at 2px offset on keyboard focus. Disabled is 55% opacity.
- **Ghost:** surface fill with a lilac border that turns violet on hover. Used for Show (the running profile's action) and Cancel.
- **Icon:** square-padded (8px) ghost pill; the icon turns violet on hover. Refresh spins once on use.
- **Link:** borderless Fredoka 500 at 13px in muted lilac, 5px by 8px; hover washes it in soft aura with violet text. The danger variant turns rose-red on hover without the wash.

### Chips (Status Pills)
- **Style:** Fredoka 500 at 12px, 4px by 9px, full pill, 1px lilac outline, muted text. Used for Closed and Never opened.
- **Running:** running-rose text on a rose wash with no outline, led by a 10px sparkle that twinkles (scales to 60% and turns 45 degrees) every 2.4s.
- **Warning:** badge gold text on a pale gold wash, for "Same account as another profile".

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** card white or twilight panel; soft lilac when never opened.
- **Shadow Strategy:** card rest shadow; running aura when running; none when never opened (see Elevation & Depth).
- **Border:** 1px lilac line; magic magenta when running; dashed when never opened.
- **Internal Padding:** 18px top and sides, 10px bottom, 12px between sections. Top edge carries the mane stripe.

### Inputs / Fields
- **Style:** soft lilac fill, 1.5px lilac border, 12px corners, 9px by 12px padding, body type, magenta caret.
- **Focus:** border turns magenta, plus the shared 2.5px magenta focus outline.
- **Error:** a rose-red 13px message under the field; the field itself does not change.

### Usage Meter (signature)
A 10px pill track in meter-track colour holding a fill of the same radius. The fill uses the Headroom Ladder (gradient, gold, rose-red) and ends in a 14px white sparkle cap that glows with a 3px drop shadow in the fill's own colour. The fill keeps a 10px minimum width whenever usage is above zero. Both meters share one 0 to 100 scale. When the latest 5-hour sample is more than five hours old, the 5-hour numeral fades to 45% and its meter row to 50%; 7-day never fades.

### Sparkline
A 120 by 26 line of the last 24 hours of 5-hour usage: 1.75px magenta stroke with round joins, soft aura area beneath, and a 2.6-radius magenta dot at the latest sample.

### Dialog
Twilight panel or card white, 20px corners, 22px by 20px by 18px padding, at most 380px wide, with a solid mane stripe and the dialog float shadow over a blurred night backdrop. It rises 8px into place over 0.28s. Actions sit right-aligned with an 8px gap, ghost before primary.

### Sparkle Burst (signature interaction)
When Open or Quit & switch is pressed, eight 14px sparkles fly from the button's centre to a random 34 to 56px radius, alternating magenta and violet, staggered 18ms apart. Each scales from 30% to full, turns 90 degrees and fades over 0.75s on the expo-out curve. It does not fire under reduced motion.

## Do's and Don'ts

### Do:
- **Do** give every new colour a light and a dark value, and keep surfaces tinted toward lavender in both themes.
- **Do** put the 5px indigo, violet and magenta mane stripe on the top edge of any new card or dialog surface (35% at rest, solid when active).
- **Do** use the four-point sparkle for bullets, caps and celebration, and stroked 16px SVG for functional icons.
- **Do** set headings, numerals, buttons and pills in Fredoka, and reading text in system UI.
- **Do** colour usage only with the Headroom Ladder: gradient below 80%, gold at 80% and above, rose-red at 95% and above.
- **Do** fade stale data rather than hide it, and say how old it is.
- **Do** disable every animation and transition under `prefers-reduced-motion: reduce`.

### Don't:
- **Don't** use Twilight Sparkle's character art or any likeness of her; the world owns her colours, star and magic only.
- **Don't** fall back to neutral grey surfaces or a plain settings-panel look.
- **Don't** let anything but the running card pulse or glow with the ring aura.
- **Don't** run the mane stripe down a side edge or add a fourth colour to it.
- **Don't** use emoji, glyph stars or a second ornament symbol beside the sparkle.
- **Don't** use square corners on controls; buttons and pills are full pills.
- **Don't** load remote fonts or assets; Fredoka ships in the app under its OFL licence.
