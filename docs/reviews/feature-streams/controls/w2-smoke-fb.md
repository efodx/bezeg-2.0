# Wave 2 smoke, group fb (preview 5e2bfc47, http://localhost:4327/bezeg-2.0/, Chromium 1280x800; mobile 390x844 touch)
Scripts and screenshots: .command-logs/w2-smoke-fb/. Observations: see handback summary; key points below.
- Darboux: stepper + works (4->5), typed 99999 -> aria-invalid, hint "Vnesi vrednost med 1 in 128.", reverts to 4 on blur. At n=128 Refine aria-disabled, focusable. Reason text visible TWICE as inspector-help: "...doseglo mejo 128, zato razdelitve ni mogoce se bolj zgostiti. ..." (id darboux-refine-help) and "...doseglo mejo 128: razdelitve ni mogoce..." (status line).
- CLT: Add disabled at cap, "Ni vec korakov." visible once; forced click shows "Vec kot 30 seštevancev..." once visible + once in live region. Back-to-n=1 disabled shows reason.
- Correlation: stepper 4->20 with "Najvec 20." only in title/describedby (not visible text); min 2. Drag past limit NOT exercised.
- Summary: Add at 15 items aria-disabled, reason visible once.
- Binomial: only host "Prilagodi tockam"; no local fit button; board changed after Fit (screenshot differs; bbox not measured).
- Conic: slider, field, button aria-disabled, reason visible once (help) plus describedby/title.
- Keyboard (Darboux, Correlation): Enter and Space on + step; focus outline 3px. Language SL->EN->SL relabels and keeps value.
- Mobile: steppers 44x47 / 44x44, + works after opening Uredi. Console errors: none.
