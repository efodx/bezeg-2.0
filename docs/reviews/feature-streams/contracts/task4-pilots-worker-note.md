# Task 4 pilots worker note

Done: Linear (LinearFunctionGraph.tsx:169,198) and BinomialNormal (:197,:236) read this.model; two comments reworded so grep A is empty.
Tests: LinearFunctionGraph.test.ts:75,82 toMatchObject(graph.model) became expected-value assertions. New authority test "one model object serves the inspector and the board".
Mutation (get model returns copy): 5 failed of 34: commitModel identity, valid no-op, host-only updates, pan, new test. Reverted; git diff --stat on BaseFunctionGraph.tsx empty.
Checks: 7 files, 219 passed, 4 skipped; typecheck and lint passed.
