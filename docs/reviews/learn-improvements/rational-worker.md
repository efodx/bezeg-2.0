# Rational content worker evidence

Scope: `docs/specs/learn-improvements.md` §6b, implemented on the handler's `4d509b9` checkout. Code changes are limited to `src/learning/content/familyChapters.ts` and `src/learning/content/familyChapters.test.ts`; the handler owns integration, build, and browser review.

The rational chapter now uses the rational and circle catalog preview assets. Captions state that the first capture is a cubic with weights \(1,2,1,1\), distinct from the worked quadratic with weights \(1,1/\sqrt2,1\); the circle capture shows three pieces, distinct from the worked unit quarter-circle. Alt text is natural language. The worked proof defines \(a=1-t\), \(b=t\), \(q=\sqrt2ab\), \(X=a^2+q\), \(Y=b^2+q\), and \(D=a^2+b^2+q\), then shows \(X^2+Y^2-D^2=q^2-2a^2b^2=0\). It states \(D>0\) on \([0,1]\), verifies both endpoints, and retains the midpoint calculation. The prose explains that positive control weights alone do not prevent a zero denominator during extrapolation.

Every rational demonstration link now has a bilingual, action-specific prompt. The prompts name the available weight selector/value controls, parameter slider, degree-elevation button, extrapolation slider/button, subdivision control, Farin toggle, and circle piece counter, then say what changes and what that means. A new focused assertion checks bilingual prompts at every link occurrence and verifies both expected assets and distinguishing caption details.

Evidence:

- Before the chapter edit, `just unit src/learning/content/familyChapters.test.ts` failed the new assertion at `why-rational/rational` because the Slovenian prompt was `undefined` (`.command-logs/rational-old-regression.log`).
- Final `just unit src/learning/content/familyChapters.test.ts src/learning/content/lessonMathNotation.test.ts src/learning/LearningPage.test.tsx`: 3 files, 25 tests passed (`.command-logs/rational-focused-unit.log`).
- Final `npx tsc --noEmit --pretty false` and `just lint src/learning/content/familyChapters.ts src/learning/content/familyChapters.test.ts` passed (`.command-logs/rational-tsc.log`, `.command-logs/rational-lint.log`).
- Handler independently sampled 1001 parameters on \([0,1]\): minimum denominator \(0.8535533905932737\), maximum circle residual \(4.44\times10^{-16}\) (reported in the worker assignment follow-up).

No route, runtime, lesson, or preset behavior changed. Production build and targeted browser/layout review remain with the handler.
