# B1 worker note (Probability)

State: code, tests, recipes, live checks done. Recapture NOT done (blocked, see below). The `after/` folder is empty; `before/` holds the four current posters and clips.

Blocker: `capture-demonstration-previews.cjs:664` asserts "Capture presentation fingerprint changed" at HEAD, before any of my edits touch the capture script (it hashes presentBoard, applyCaptureText and the motion .cjs files, not the recipe tables). The brief forbids PREVIEW_RECAPTURE_VERIFIED_PRESENTATION, so I stopped. Capture log: .command-logs/b1/capture.log.

Resume: `just build`, serve on 4334, run the recapture command from the brief (with the verification env var if the handler allows it), copy posters/clips to after/, judge R1-R8.
