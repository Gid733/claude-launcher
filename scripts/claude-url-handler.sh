#!/bin/sh
# Installed as ~/.local/bin/claude-desktop, ahead of /usr/bin on PATH.
# Claude Desktop registers its own claude:// handler on every start, and that
# handler runs `claude-desktop <link>`, which lands here. A claude:// link
# (for example the sign-in callback) opens in the Desktop profile that is
# running instead of always in the default profile; anything else passes
# straight through to the real binary.
#
# Starting claude-desktop with a running profile's --user-data-dir hands the
# link to that window through Electron's single-instance lock. When several
# profiles run, a non-default one wins (sign-in happens in new profiles),
# then the most recently started.

REAL=/usr/bin/claude-desktop
DESKTOP_BIN=/usr/lib/claude-desktop/claude-desktop

has_link=0
for arg in "$@"; do
  case "$arg" in claude://*) has_link=1 ;; esac
done
[ "$has_link" -eq 1 ] || exec "$REAL" "$@"

is_desktop() { [ "$(readlink "/proc/$1/exe" 2>/dev/null)" = "$DESKTOP_BIN" ]; }

# Fields of /proc/<pid>/stat after the ")" that closes the command name.
stat_field() { sed 's/.*) //' "/proc/$1/stat" 2>/dev/null | cut -d' ' -f"$2"; }

best_dir=""
best_rank=-1
best_start=-1

for proc in /proc/[0-9]*; do
  pid=${proc#/proc/}
  is_desktop "$pid" || continue
  # Electron may rewrite argv into one string; either way, join it.
  cmd=$(tr '\0' ' ' < "$proc/cmdline" 2>/dev/null) || continue
  case "$cmd" in *--type=*) continue ;; esac

  # Skip Desktop's own Node-mode children: anything with a Desktop ancestor.
  child=0
  ancestor=$(stat_field "$pid" 2)
  depth=0
  while [ -n "$ancestor" ] && [ "$ancestor" -gt 1 ] && [ "$depth" -lt 64 ]; do
    if is_desktop "$ancestor"; then child=1; break; fi
    ancestor=$(stat_field "$ancestor" 2)
    depth=$((depth + 1))
  done
  [ "$child" -eq 1 ] && continue

  dir=$(printf '%s\n' "$cmd" | sed -n 's/.*--user-data-dir[= ]\(.*\)$/\1/p' | sed 's/ --.*//; s/ *$//')
  rank=0
  [ -n "$dir" ] && [ "$dir" != "$HOME/.config/Claude" ] && rank=1
  start=$(stat_field "$pid" 20)

  if [ "$rank" -gt "$best_rank" ] || { [ "$rank" -eq "$best_rank" ] && [ "$start" -gt "$best_start" ]; }; then
    best_dir=$dir
    best_rank=$rank
    best_start=$start
  fi
done

if [ -n "$best_dir" ]; then
  exec "$REAL" --user-data-dir="$best_dir" "$@"
fi
exec "$REAL" "$@"
