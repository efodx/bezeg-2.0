# Task 13 per-step patch expectations — H26

The guided example inventory now records an independently derived camera and three numeric geometry samples for every lesson step. Tensor and triangular samples use Bernstein evaluation over each authored lesson fixture and the same fixed tessellation sampling convention, excluding degenerate faces.

Join steps resolve their named authored presets. The G1 step uses the alpha-2 G1 preset net for geometry while retaining the camera from its preceding C1 scene action. The teapot step resolves all 32 Utah teapot patches from `resolveTeapotPatch` and records numeric samples for every owner. The initial `expected.surface` remains available for preview capture compatibility.

The smoke rows keep their bilingual labels, paths, and step counts, and read each step's expected surface from the generated inventory. Focused Node checks: `node --test scripts/patch-guided-example-expectations.test.cjs` and `node --test scripts/generate-guided-example-inventory.test.cjs`.
