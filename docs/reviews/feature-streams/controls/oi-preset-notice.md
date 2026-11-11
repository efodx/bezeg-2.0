# OI: preset notice cleared on clean remount
- Fix: src/graphs/base/BaseGraph.tsx:877-878 `this.presetNoticeValue = undefined` before `loadPresets()` in the mount path. Later operations' notices untouched.
- Test: ConsumerPreparation.test.tsx, "a clean remount of the same instance clears the notice..." (bad collection, and refused selected preset).
- Before fix: that test failed, "expected { ...(2) } to be undefined" (.command-logs/oi-notice-before.txt); 9 others passed.
- After: `just unit src/graphs/base` passed (oi-notice-after.txt); `npx tsc --noEmit --pretty false` exit 0, no output.
