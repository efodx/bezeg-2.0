#!/usr/bin/env bash
# Usage: bash docs/reviews/ux-picks-app-wide/feel/11/capture-proto.sh   (from the repo root)
# Needs the frozen prototype (ux-picks @ aff6df6c) production build at $BASE. All picks are named in ?ux= so the
# result does not depend on localStorage. Failed card crops (scene lacks that card) print FAIL and do not stop the run.
set -u
BASE="${BASE:-http://127.0.0.1:4492/bezeg-2.0}"
RAW=".command-logs/shots/11/proto"
DOC="docs/reviews/ux-picks-app-wide/feel/11"
UX="ux=b1,a1,a19,a3,a29,dockTools,toolsCard,viewDirector,boardText"
WAIT=3000
ROUTES=(
  "analysis/taylor?$UX"
  "analysis/taylor?$UX&learn=1"
  "functions/transformations?$UX"
  "bezier/decasteljau?$UX"
  "linear-map?$UX"
  "analysis/phase-portrait?$UX"
  "functions/exponential?$UX"
  "functions/inverse?$UX"
  "compgeo/polygon-area?$UX"
  "bezier/curve?$UX"
)
mkdir -p "$RAW" "$DOC"
shot() { just shot --base "$BASE" --wait "$WAIT" --width 1440 --height 900 "$@"; }

shot --selector '.ux-board-frame' --sheet --out "$RAW/board-1440" "${ROUTES[@]}"
for kind in readout legend tools guide; do
  shot --selector ".ux-bcard-$kind" --sheet --out "$RAW/cards/$kind" "${ROUTES[@]}"
done
shot --selector '.ux-pucks' --sheet --out "$RAW/cards/pucks" "${ROUTES[@]}"

# contact sheets copied with stable names
n=1; for f in "$RAW"/board-1440/sheet-*.png; do [ -f "$f" ] && cp "$f" "$DOC/proto-board-1440-$n.png" && n=$((n+1)); done
n=1; for k in readout legend tools guide pucks; do for f in "$RAW"/cards/$k/sheet-*.png; do [ -f "$f" ] && cp "$f" "$DOC/proto-cards-$k-$n.png" && n=$((n+1)); done; done
