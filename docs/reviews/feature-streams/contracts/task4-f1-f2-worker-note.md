# Task 4 F1 and F2 worker note
## F1 (ComplexMultiplication, ComplexReciprocal, ComplexRoots, LinearMap)
Production: stateSnapshot() -> this.model in the four graph .tsx files (complex/, linear/); header comment reworded. No test edits (only graph.state.initialized remains). Tests 86 passed (6 files). Grep clean.
## F2 (Exponential, Trig, FunctionTransformation, FunctionInverse, Rational, PolynomialZeros, ConicFocal)
Production: this.state/stateSnapshot() -> this.model in the 7 .tsx files in src/graphs/functions. Render-time reads (ExponentialFunctionGraph ~92-110, TrigonometricFunctionsGraph ~157-187) now read this.model too; same values as the mirror.
Tests: ExponentialFunctionGraph.test.ts:72 and TrigonometricFunctionsGraph.test.ts:89 toMatchObject(graph.model) replaced by explicit values; host tests use graph.modelNow().x (model is protected) in FunctionInverse:302, FunctionTransformation:211, PolynomialZeros:173-174 (zeros literal), Rational:154. Tests 96 passed (7 files) before the modelNow fix; the four host files rerun passed. typecheck and lint pass.
