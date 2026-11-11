# CountSetter ReplacementRevision (worker note)
- src/inputs/CountSetter.tsx:57-67: reads ReplacementRevision; a changed revision clears `pressed` (derived state in render, like NumberInput:132-135).
- Test added at end of src/inputs/CountSetter.test.tsx (same revision keeps refusal; new revision drops it, count 5 shown).
- Before change: new test failed; after: `just unit src/inputs` passed; tsc clean.
- No numeric draft in CountSetter; the typed field is NumberInput, which already resets on revision.
- Logs: .command-logs/oi-count-before.log, oi-count-after.log, oi-count-tsc.log
