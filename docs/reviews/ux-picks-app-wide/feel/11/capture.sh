#!/usr/bin/env bash
# Usage: bash docs/reviews/ux-picks-app-wide/feel/11/capture.sh before|after   (run from the repo root)
# Needs a dev/preview server at $BASE (default http://127.0.0.1:4491/bezeg-2.0). Failures of single card crops are expected
# where a scene lacks that card; they print FAIL lines and do not stop the script.
set -u
SET="${1:?before|after}"
BASE="${BASE:-http://127.0.0.1:4491/bezeg-2.0}"
RAW=".command-logs/shots/11/$SET"
DOC="docs/reviews/ux-picks-app-wide/feel/11"
WAIT=2500
ROUTES=(
  "analysis/taylor"
  "analysis/taylor?example=lesson.analysis.taylor.taylor"
  "functions/transformations"
  "bezier/decasteljau"
  "linear-map"
  "analysis/phase-portrait"
  "functions/exponential"
  "functions/inverse"
  "compgeo/polygon-area"
  "bezier/curve"
)
BOARD='.workspace-board-stage'
mkdir -p "$RAW" "$DOC"
shot() { just shot --base "$BASE" --wait "$WAIT" "$@"; }

# A. board crops
shot --width 1440 --height 900 --selector "$BOARD" --sheet --out "$RAW/board-1440" "${ROUTES[@]}"
shot --width 1280 --height 720 --selector "$BOARD" --sheet --out "$RAW/board-1280" "${ROUTES[@]}"

# B. close crops at 1440x900, one folder per element kind
for kind in readouts legend tools lesson; do
  shot --width 1440 --height 900 --selector "#board-card-$kind" --sheet --out "$RAW/cards/$kind" "${ROUTES[@]}"
done
shot --width 1440 --height 900 --selector '[data-puck-strip]' --sheet --out "$RAW/cards/strip" "${ROUTES[@]}"

# C. inspector width 310 (richest scenes: see capture.md)
shot --width 310 --height 900 --selector '#board-card-readouts' --sheet --out "$RAW/w310/readouts" "analysis/taylor" "bezier/decasteljau" "functions/transformations"
shot --width 310 --height 900 --selector '#board-card-legend' --sheet --out "$RAW/w310/legend" "analysis/taylor" "analysis/phase-portrait"
shot --width 310 --height 900 --selector '#board-card-tools' --sheet --out "$RAW/w310/tools" "functions/exponential" "analysis/taylor"
shot --width 310 --height 900 --selector '#board-card-lesson' --sheet --out "$RAW/w310/lesson" "analysis/taylor?example=lesson.analysis.taylor.taylor"
shot --width 310 --height 900 --selector '[data-puck-strip]' --sheet --out "$RAW/w310/strip" "bezier/decasteljau" "analysis/taylor"

# Contact sheets: copy and rename
for pair in board-1440:board-1440 board-1280:board-1280; do
  d="${pair%%:*}"; n="${pair##*:}"; i=1
  for f in "$RAW/$d"/sheet-*.png; do [ -f "$f" ] && cp "$f" "$DOC/$SET-$n-$i.png" && i=$((i+1)); done
done
i=1
for d in readouts legend tools lesson strip; do
  for f in "$RAW/cards/$d"/sheet-*.png; do [ -f "$f" ] && cp "$f" "$DOC/$SET-cards-$i.png" && echo "cards-$i = $d" && i=$((i+1)); done
done
i=1
for d in readouts legend tools lesson strip; do
  for f in "$RAW/w310/$d"/sheet-*.png; do [ -f "$f" ] && cp "$f" "$DOC/$SET-w310-$i.png" && echo "w310-$i = $d" && i=$((i+1)); done
done
