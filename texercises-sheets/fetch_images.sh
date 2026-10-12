#!/bin/bash
# Fetch TeXercises gallery images through Safari (where you are logged in) into images/.
#   ./fetch_images.sh <list file from build_sheet.py, e.g. pilot-minion-images.txt>
# A separate Safari window opens https://texercises.com/gallery/image/file/<name>/, which
# redirects to a signed download link; curl saves that file as images/<name>.<ext>.
# Images already in images/ are skipped; SVG files also get a PDF copy for LaTeX.
set -u
list="$1"; dir="$(cd "$(dirname "$0")" && pwd)/images"; mkdir -p "$dir"
# The window must belong to the Safari profile in which you are logged in to TeXercises:
# a new window opens in the profile of the frontmost window, so bring such a window to the front
# first (or pass the id of a window to use: TX_WINDOW=1234 ./fetch_images.sh ...).
marker="https://texercises.com/?fetch-images"
if [ -n "${TX_WINDOW:-}" ]; then win=$TX_WINDOW; own=0; else
  win=$(osascript -e 'on run argv
    tell application "Safari"
      make new document with properties {URL:item 1 of argv}
      delay 3
      repeat with w in windows
        try
          if URL of current tab of w is item 1 of argv then return id of w
        end try
      end repeat
    end tell
  end run' "$marker"); own=1
fi
if osascript -e "tell application \"Safari\" to return source of current tab of window id $win" 2>/dev/null | grep -q 'Access without login'; then
  echo "This Safari window is not logged in to TeXercises: bring a window of the profile where you are logged in to the front and run again."
  [ "$own" = 1 ] && [ "$own" = 1 ] && osascript -e "tell application \"Safari\" to close window id $win" >/dev/null 2>&1
  exit 1
fi
resolve() {
  osascript -e 'on run argv
    tell application "Safari"
      set w to window id (item 2 of argv as integer)
      set URL of current tab of w to "about:blank"
      delay 0.5
      set URL of current tab of w to "https://texercises.com/gallery/image/file/" & item 1 of argv & "/"
      set u to ""
      repeat 40 times
        delay 0.5
        set u to URL of current tab of w
        if u starts with "https://s3." then exit repeat
      end repeat
      return u
    end tell
  end run' "$1" "$win"
}
# SVG -> PDF for LaTeX: rendered by Quick Look (WebKit, renders like the browser), trimmed
svgpng() {
  local tmp; tmp=$(mktemp -d)
  qlmanage -t -s 2400 -o "$tmp" "$1" >/dev/null 2>&1 &&
    magick "$tmp/$(basename "$1").png" -trim +repage -bordercolor white -border 8 -units PixelsPerInch -density 300 "$2"
}
cut -f1 "$list" | while read -r name; do
  [ -z "$name" ] && continue
  if ls "$dir/$name".* >/dev/null 2>&1 || [ -e "$dir/$name" ]; then echo "have  $name"; continue; fi
  url=$(resolve "$name")
  case "$url" in
    https://s3.*) ;;
    *) echo "FAIL  $name  (${url%%\?*})"; continue ;;
  esac
  ext=$(printf '%s' "${url%%\?*}" | sed -E 's/.*\.([A-Za-z0-9]+)$/\1/' | tr 'A-Z' 'a-z')
  if curl -sf -m 60 -o "$dir/$name.$ext" "$url"; then
    echo "got   $name.$ext   <- ${url%%\?*}"
    if [ "$ext" = svg ]; then svgpng "$dir/$name.svg" "$dir/$name.pdf" && echo "      $name.pdf (from svg)"; fi
  else echo "FAIL  $name  (download)"; fi
done
[ "$own" = 1 ] && osascript -e "tell application \"Safari\" to close window id $win" >/dev/null 2>&1
