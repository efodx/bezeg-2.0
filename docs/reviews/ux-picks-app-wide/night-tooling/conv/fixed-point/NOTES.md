# fixed-point (done)
Files: src/graphs/functions/FixedPointGraph.tsx; src/learning/content/analysisGuidedLessons.ts (fixed-point frames only).
Declared: formula T(x)=...; readout groups iteration (step,x0,current,delta,tolerance,end), bound (q,a-priori,a-posteriori); notes = statuses (hypotheses, cycle, no-bound...); readoutHelp fixed_point_note; legend drawn-only (cobweb/start only from step 1, bound only when drawn); rows link legend: x0->start (step>=1), current->iterate, a-posteriori->bound.
Pucks: fixed-point.x0 (Slider), fixed-point.digits (CountSetter).
Sections: fixed-point-playback (help = playback note), -example, -x0, -digits; reveals help via revealsHelp() override (p removed from renderReveals).
Removed under pick: whole board caption (formula, progress, bound, cycle, end, key), inspector readout/status/legend.
Frames with ux: cobweb expl (readouts+legend), next expl (step,current), contraction expl (q,a-priori,a-posteriori), rounding expl (step,current); observations/cosine/free: open readouts only, no highlights (predict prompts; cosine/reflection scenes hide the bound).
Inline strings: group titles "Iteracija"; x0 puck help.
Gaps: no x* row (old panel had none); legend entries are the long catalog labels.
Checks: tsc clean; just unit FixedPointGraph + lessonMathNotation pass; shots picks/1024/none; lesson walk 17 frames, no page errors.
Known: Odčitki card scrolls at 900 px height with bound rows cut (inner scroll).
