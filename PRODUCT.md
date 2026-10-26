# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
One person, the developer who built it, on their own CachyOS (Arch-based) Linux desktop. They hold several Claude accounts and switch Claude Desktop between them during a working day, mostly to work in Claude Code sessions.

## Product Purpose
Lets one person keep a separate Claude Desktop profile per Claude account and move between them without signing out. Success is one scan of the window telling them which account is running and how much 5-hour and 7-day usage each account has left, then one click to switch.

## Positioning
Profiles are separate Electron data folders (`--user-data-dir`), so every account keeps its own sign-in and Code session list. Usage is read from the `plan-usage-history.json` file Claude Desktop already writes, so the tool never handles credentials and never calls Anthropic's servers.

## Operating Context
A small desktop utility window (around 560×780) opened next to Claude Desktop, usually several times a day: before starting work, when a 5-hour window fills up, or when changing between personal and work accounts. Switching quits the running Desktop and starts another, which stops any working Code session, so it happens with intent.

## Capabilities and Constraints
- Per profile: name, running / closed / never opened, 5-hour and 7-day usage % with sample age and history, Code session counts (active, archived, last activity), the 3 most recent session titles, and the data folder path.
- Actions: Open, Show (when running), Quit & switch (confirmed by a native dialog), Add, Rename, Remove from list (the data folder is kept).
- Usage only updates while a profile is open (a sample every 15–30 min). There are no reset times.
- Stack: Electron with vanilla HTML/CSS/JS and no build step. Strict CSP: no inline scripts or styles, no remote resources or fonts. Light and dark follow the system.
- Terms of use: no automatic switching on limits, no reading of tokens or cookies, accounts are the user's own and never shared.

## Evidence on Hand
Real local data: Main profile at `~/.config/Claude` with ~110 Code sessions and live usage samples. Additional profiles have no data until first opened.

## Product Principles
1. State and headroom read in one scan, equally weighted.
2. Switching is deliberate: clear about what will stop, never automatic.
3. Read-only and local: show only what Desktop already wrote, and say how old it is.
4. Personal tool: dense and direct over onboarding and explanation.
