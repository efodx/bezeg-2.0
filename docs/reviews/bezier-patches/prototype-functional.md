# JSXGraph prototype functional checks — 2026-10-26

Browser checks used Chromium with the isolated JSXGraph **1.14.1** installation at `http://127.0.0.1:4181/docs/prototypes/bezier-patches/`. The primary checkout's installed JSXGraph 1.9.2 was not used. Durable [machine-readable output](renderer-functional/results.json), eight preset-view screenshots and [SVG export](renderer-functional/figure.svg) are in `renderer-functional/`. Original logs and the source hash manifest remain in `.command-logs/patches-functional/`.

The final harness passed tensor and triangular Bernstein/de Casteljau agreement (maximum coordinate errors `1.11e-16` and `3.33e-16`), mouse XY and z movement, mouse and keyboard orbit, tensor and triangular inset movement, triangular-domain clamping, 64 rendered triangular faces, presentation expansion and resize, three dispose/remount cycles with exactly two boards after each remount, and touch orbit plus touch XY movement with height and camera fixed. Browser page errors were empty. The screen review of `triangular-mesh-isometric.png` shows the 8×8 triangle mesh, inset, net, construction, and labels rendered; visual depth ordering across the four screenshots was not conclusively accepted.

Open acceptance findings:

- **Triangle mesh during drag:** the model coordinate changed before pointer release. The harness could not read a polygon SVG path (`null` before and during), so its face-path comparison is inconclusive; it records this as an acceptance gap. A bounded repair changed mesh faces to share owned function-backed 3D vertices and explicitly refresh them during drag. The live visible-face update still needs an instrument that observes the rendered polygons.
- **PNG export:** SVG export succeeded at 822,013 bytes with the surface fill and text labels. PNG did not download; Chromium reported `Failed to execute 'toBlob' on 'HTMLCanvasElement': Tainted canvases may not be exported.` The exported SVG is saved, but PNG content remains unverified.
- **Disposal:** board registration returned to zero on dispose and to two on remount. Instrumented listeners on `#main-board` increased from 15 to 21 after three cycles; window, document, and inset counts stayed stable. Listener cleanup therefore remains unaccepted.
- **Touch z mode:** z changed from `0.1475589` to `0.5807272`, but XY also shifted from `(-3.659817, 2.845637)` to `(-3.791780, 2.814764)`. Height movement worked; the requirement to preserve XY in touch z mode did not pass.

The first mid-drag harness attempt stopped at a stale-face assertion. A second bounded source repair introduced explicit mesh vertex ownership and drag-time refresh. The final run retained the geometry, listener, and touch measurements above and continued through all remaining checks. No performance measurement was taken. The local server and Playwright process were stopped after the run.

Source SHA-256 values for the reviewed prototype are recorded below; `prototype-functional-source-sha256.json` in the evidence directory is the machine-readable copy.

| Source | SHA-256 |
| --- | --- |
| `index.html` | `A3BAAB5EF98E8A29F131DC345C190AC78F0EA092E589BE1D8DEC7E01EB257971` |
| `prototype.js` | `6D9A29A1AAF298A346B96B098122049D97E73EFCA4E538C57D34BABFCD2CFA2B` |
| `style.css` | `287004FFF163A8CF282B7570EA677534ACFA5D07C60E22DDE7CC886570A3463A` |
| `verify-functional.mjs` | `3A1119E490B3B379EFF50B6C661840ECB7E2BEC95656F568E8FC72A6996248AD` |
