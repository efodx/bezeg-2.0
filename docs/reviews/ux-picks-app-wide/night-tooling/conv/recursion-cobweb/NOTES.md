# recursion-cobweb (done)
Files: src/graphs/recursion/RecursionCobwebGraph.tsx; src/learning/content/recursionCobwebGuidedLessons.ts (legacy step pattern).
Declared: formula (affine/cosine/logistic TeX, decimal {,}); groups map(map,slope,intercept,rate), fixed(fixed,decisive,shape), run(start,steps,iterate) from readoutRows() (same strings); note = statusText(); readoutHelp note_exact (not cosine); legend map/diagonal always, cobweb when step>0, start, fixed/iterate only when in view; rows link map/start/fixed/steps->cobweb/iterate.
Pucks: cobweb.m, .c (affine), .r (logistic), .x. Sections: cobweb-playback (pickTitle). Commands panel (shared) untouched.
Removed under pick: all 6 board captions (caption() gets visible guard); BoardReadout wrapper replaced by pickOn switch; under pick only LiveReadout stays (a11y).
Frames: all 14 observations open readouts; rg2-line-diagonal expl opens readouts+legend, highlights slope,fixed; rg4-staircase expl highlights fixed. Other explanations are predict prompts: no ux.
Inline strings: puck help for m and c; legend/group titles reuse keys.
Gaps: step counter/speed are host-like state (not rows); speed slider has no puck.
Checks: tsc clean; just unit src/graphs/recursion, recursionCobweb lesson, lessonMathNotation pass; shots picks/1024/none; walk 14 frames, no page errors.
Known: map row repeats the group title; Odčitki card scrolls inside at 900 px.
