# B8e worker note

Repairs: recipes.cjs readback polls (the Slider field commits after blur; 0.1 and 3.22 were transient reads); concept-motion.cjs:73 reads "Točka x, vrednost"; clip row euler-method control "P₀, y₀"; motion.cjs captureSweep re-presents every frame when the recipe has capture text (derivative); text entries for sequence, euler-method, accumulation, derivative; text test id list.
Diagnostic (PREVIEW_IDS) captures pass for these four. Final recapture refused: presentation fingerprint changed, needs PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 (handler). Manifest and catalog assets untouched.
Not done: area-between-curves. After the 3.22 readback is fixed, the motion fails "Decoded background changed at frame 0" (decoded blue 244, expected 245 at pixel (40,40), deterministic, CRF 10; source frames are 245). Fix needs a crf (or sample) override in the area spec in scripts/demonstration-preview-analysis-motion.cjs:190-212 (outside the owned paths, edit was denied). Its text entry (keep ^[fg]$) is not added.
Sequence pattern deviates from the verdict: the board tag reads "N", so ^N( = \d+)?$.
tooling-test: passes.
