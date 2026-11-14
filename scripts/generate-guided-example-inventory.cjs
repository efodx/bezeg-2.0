#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {validateControlStep} = require('./guided-example-control-steps.cjs');
const {validateInventory, validateRecipe, recipeFingerprint} = require('./guided-example-preview-api.cjs');
const {expectedSamples, generatePatchGuidedExampleInventory} = require('./patch-guided-example-expectations.cjs');

const root = path.resolve(__dirname, '..');
const defaultOutput = 'docs/reviews/illustrated-chapter-examples/capture-inventory.json';
const patchChapterId = 'bezier-patches';
const workedParabolaId = 'splines.worked-join.spline-c1.parabola-derivatives';
const workedWeightId = 'foundations.worked-weight.bernstein.degree-comparison';

function sceneForStep(demonstrationId, step) {
    assert.ok(step, `${demonstrationId}: missing initial lesson step`);
    assert.ok(step.scene && Array.isArray(step.scene.actions) && step.scene.actions.length > 0,
        `${demonstrationId}: initial lesson step needs prepared scene actions`);
    return {demonstrationId, stepId: step.id, actions: step.scene.actions, firstFrame: step.frames?.[0] ?? null};
}

function fingerprintFor(demonstrationId, step) {
    const canonical = JSON.stringify(sceneForStep(demonstrationId, step));
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

function readableActions(actions) {
    return actions.map(action => `${action.kind}: ${JSON.stringify(action)}`);
}

function expectedFor(id, step) {
    if (id === workedParabolaId) {
        const action = step.scene.actions.find(item => item.kind === 'prepared-scene' && item.sceneId === 'worked-parabola-join');
        assert.ok(action && action.source === 'lesson-fixture' && action.curve?.degree === 2 && action.curve?.continuity === 1,
            `${id}: expected the fixture-backed worked parabola join scene`);
        return {
            types: {curve: 1, point: 5},
            curveCount: 1,
            points: [...action.curve.points.map(([x, y]) => [x, y]), [1, 1]],
            curves: [[[0, 0], [1, 1], [2, 4]]],
        };
    }
    if (id === workedWeightId) {
        const actions = step.scene.actions;
        const degreeActions = actions.filter(item => item.kind === 'bernstein-degree');
        const stackedActions = actions.filter(item => item.kind === 'bernstein-stacked-area');
        assert.equal(degreeActions.length, 1, `${id}: opening scene must set the Bernstein degree exactly once`);
        assert.equal(degreeActions[0].degree, 2,
            `${id}: opening scene must show degree-two Bernstein basis functions`);
        assert.equal(stackedActions.length, 1, `${id}: opening scene must set stacked-area visibility exactly once`);
        assert.equal(stackedActions[0].visible, false,
            `${id}: opening scene must have the stacked-area view off`);
        return {
            types: {curve: 3},
            curveCount: 3,
            curves: [
                [[0, 1], [0.5, 0.25], [1, 0]],
                [[0, 0], [0.5, 0.5], [1, 0]],
                [[0, 0], [0.5, 0.25], [1, 1]],
            ],
        };
    }
    return undefined;
}

function lessonFrames(step) {
    // Mirrors framesForLessonStep in src/learning/model.ts, including the step action a frame inherits.
    if (Array.isArray(step.frames) && step.frames.length > 0) return step.frames.map(frame => ({id: frame.id, action: frame.action ?? step.action}));
    return [{id: `${step.id}-content`, action: step.action}];
}

function locateFrame(id, lesson, frameId, where) {
    const found = [];
    lesson.steps.forEach((step, stepIndex) => lessonFrames(step).forEach((frame, frameIndex) => {
        if (frame.id === frameId) found.push({stepIndex, frameIndex, frame});
    }));
    assert.ok(found.length > 0, `${id}: ${where} names unknown frame "${frameId}"; lesson frames are: ${
        lesson.steps.flatMap(step => lessonFrames(step).map(frame => frame.id)).join(', ')}`);
    assert.equal(found.length, 1, `${id}: ${where} frame id "${frameId}" is ambiguous in the lesson`);
    return {position: {step: found[0].stepIndex, frame: found[0].frameIndex}, frame: found[0].frame};
}

/** Resolves an authored recipe (or its absence) against the example's lesson into the explicit inventory form. */
function resolveRecipe(id, lesson, authored, resolveChecks) {
    const recipe = authored === undefined ? {kind: 'start'} : authored;
    if (recipe.kind === 'start') return validateRecipe(id, {kind: 'start'});
    assert.equal(recipe.kind, 'highlight', `${id}: unknown recipe kind ${JSON.stringify(recipe.kind)} (expected "start" or "highlight")`);
    assert.ok(Array.isArray(recipe.steps), `${id}: highlight recipe steps must be an array`);
    const target = locateFrame(id, lesson, recipe.frame, 'recipe frame');
    let current = target;
    const steps = recipe.steps.map((step, index) => {
        const where = `recipe step ${index + 1}`;
        if (step.kind === 'goto-frame') {
            current = locateFrame(id, lesson, step.frame, where);
            return {kind: 'goto-frame', frame: step.frame, position: current.position};
        }
        if (step.kind === 'explore') return {kind: 'explore'};
        if (step.kind === 'select-tab' || step.kind === 'set-control') {
            validateControlStep(id, step, where);
            return step.kind === 'select-tab' ? {kind: 'select-tab', tab: step.tab}
                : {kind: 'set-control', control: step.control, label: step.label, value: step.value};
        }
        assert.equal(step.kind, 'frame-action', `${id}: ${where} has unknown kind ${JSON.stringify(step.kind)}`);
        const action = current.frame.action;
        assert.ok(action?.action, `${id}: ${where} presses the action of frame "${current.frame.id}", which has no authored action`);
        const label = action.label?.sl;
        assert.ok(typeof label === 'string' && label, `${id}: ${where} frame action has no Slovenian button label`);
        return {kind: 'frame-action', frame: current.frame.id, position: current.position, label};
    });
    // `current` is the frame the lesson is on after the steps; surface checks resolve against the step that frame belongs to.
    const checks = resolveChecks ? resolveChecks(recipe.checks, current.position) : recipe.checks;
    return validateRecipe(id, {kind: 'highlight', frame: recipe.frame, position: target.position, steps,
        expectChange: recipe.expectChange, checks});
}

function withRecipe(record, recipe) {
    return {...record, recipe, recipeFingerprint: recipeFingerprint(recipe)};
}

async function generateInventory() {
    const {createServer} = await import('vite');
    const server = await createServer({configFile: path.join(root, 'vite.config.mts'), server: {middlewareMode: true}, appType: 'custom'});
    try {
        const registry = await server.ssrLoadModule('/src/learning/chapter/guidedExamples.ts');
        const homesModule = await server.ssrLoadModule('/src/learning/chapter/retainedExamples.ts');
        const homes = homesModule.retainedExampleHomes;
        const authoredRecipes = (await server.ssrLoadModule('/src/learning/chapter/guidedExampleHighlights.ts')).guidedExampleHighlightRecipes;
        for (const key of Object.keys(authoredRecipes)) assert.ok(key.startsWith(`${patchChapterId}.`) || homes.some(home => home[0] === key), `${key}: highlight recipe belongs to no retained guided example`);
        assert.equal(homes.length, 56, `Expected 56 retained example homes, found ${homes.length}`);
        const examples = [];
        for (const home of homes) {
            const [id, chapterId, sectionId, demonstrationId, , , canonicalPath] = home;
            const links = registry.getChapterGuidedExamples(chapterId, sectionId).filter(item => item.id === id);
            assert.equal(links.length, 1, `${id}: retained card must resolve exactly once in its owning section`);
            assert.equal(links[0].path, canonicalPath, `${id}: card launch path differs from retained home`);
            const target = new URL(canonicalPath, 'https://bezeg.invalid');
            const resolved = registry.resolveGuidedExample(target.search, demonstrationId);
            assert.ok(resolved, `${id}: canonical URL does not resolve to a prepared example`);
            assert.equal(resolved.owner.chapterId, chapterId, `${id}: resolved chapter owner mismatch`);
            assert.equal(resolved.owner.sectionId, sectionId, `${id}: resolved section owner mismatch`);
            const step = resolved.lesson.steps[0];
            const record = withRecipe({id, demonstrationId, path: canonicalPath, sceneFingerprint: fingerprintFor(demonstrationId, step), actions: readableActions(step.scene.actions)},
                resolveRecipe(id, resolved.lesson, authoredRecipes[id]));
            const expected = expectedFor(id, step);
            if (expected) record.expected = expected;
            examples.push(record);
        }
        validateInventory(examples);
        return {examples};
    } finally {
        await server.close();
    }
}

/**
 * Resolves a patch example's authored recipe. `checks: {surfaceStep}` names the lesson step whose independently computed
 * expected surface (patch-guided-example-expectations.cjs) the settled surface evidence must equal; it must be the step the
 * lesson is on after the recipe steps. The resolved inventory checks carry that expected surface as `{surface}`.
 */
function resolvePatchRecipe(example, lesson, authored) {
    return resolveRecipe(example.id, lesson, authored, (checks, position) => {
        assert.ok(checks && typeof checks.surfaceStep === 'string' && checks.surfaceStep,
            `${example.id}: a patch highlight recipe needs checks.surfaceStep naming the lesson step whose expected surface must hold`);
        assert.deepEqual(Object.keys(checks), ['surfaceStep'], `${example.id}: patch recipe checks may only name surfaceStep`);
        const step = lesson.steps[position.step];
        assert.equal(step.id, checks.surfaceStep, `${example.id}: checks.surfaceStep "${checks.surfaceStep}" is not the step "${step.id}" the recipe ends on`);
        const surface = example.steps?.[position.step]?.expected?.surface;
        assert.ok(surface, `${example.id}: no expected surface was computed for step "${step.id}"`);
        return {surface};
    });
}

async function generatePatchInventory() {
    const {createServer} = await import('vite');
    const server = await createServer({configFile: path.join(root, 'vite.config.mts'), server: {middlewareMode: true}, appType: 'custom'});
    try {
        const registry = await server.ssrLoadModule('/src/learning/content/patchGuidedExampleRegistry.ts');
        const presets = await server.ssrLoadModule('/src/graphs/patches/patchPresetCollections.ts');
        const teapot = await server.ssrLoadModule('/src/graphs/patches/teapot/utahTeapot.ts');
        const joinScenes = Object.fromEntries(presets.joinStartingScenes.map(item => [item.id, item.data()]));
        joinScenes['join-c0'] = joinScenes['join-c0-kink'];
        const inventory = generatePatchGuidedExampleInventory(registry.patchGuidedExampleRegistry,
            {joinScenes, teapotPatches: Array.from({length: 32}, (_, index) => teapot.resolveTeapotPatch(index)),
                pathForSection: registry.patchGuidedExamplePath});
        const authoredRecipes = (await server.ssrLoadModule('/src/learning/chapter/guidedExampleHighlights.ts')).guidedExampleHighlightRecipes;
        const known = new Set(inventory.examples.map(example => example.id));
        for (const key of Object.keys(authoredRecipes)) if (key.startsWith(`${patchChapterId}.`)) {
            assert.ok(known.has(key), `${key}: highlight recipe belongs to no section-owned patch example (keys are full example ids ${patchChapterId}.<section>.<demonstration>)`);
        }
        inventory.examples = inventory.examples.map(example => {
            const sectionId = example.id.split('.')[1];
            return withRecipe(example, resolvePatchRecipe(example, registry.patchGuidedExampleRegistry[sectionId], authoredRecipes[example.id]));
        });
        validateInventory(inventory.examples);
        assert.equal(inventory.examples.length, 11, 'Expected all eleven section-owned patch examples');
        return inventory;
    } finally {
        await server.close();
    }
}

/**
 * Board-based chapter-owned chapters: where the chapter's registry and path function live, and its independently authored
 * expectation for one example's first frame. Add one entry per chapter that uses the chapter-owned capture mode.
 */
const chapterInventories = {
    'linear-maps': {
        module: '/src/learning/content/linearMapsChapterRegistry.ts',
        registryExport: 'linearMapsGuidedExampleRegistry',
        pathExport: 'linearMapsGuidedExamplePath',
        expectedFor: linearMapsExpectedFor,
    },
    'complex-maps': {
        module: '/src/learning/content/complexMapsChapterRegistry.ts',
        registryExport: 'complexMapsGuidedExampleRegistry',
        pathExport: 'complexMapsGuidedExamplePath',
        expectedFor: complexMapsExpectedFor,
    },
    'numerical-methods': {
        module: '/src/learning/content/numericalChapterRegistry.ts',
        registryExport: 'numericalGuidedExampleLessons',
        pathExport: 'numericalGuidedExamplePath',
        expectedFor: numericalExpectedFor,
    },
    'school-function-graphs': {
        module: '/src/learning/content/schoolFunctionGraphsChapterRegistry.ts',
        registryExport: 'schoolFunctionGraphsGuidedExampleLessons',
        pathExport: 'schoolFunctionGraphsGuidedExamplePath',
        expectedFor: schoolFunctionGraphsExpectedFor,
    },
    'fourier-series': {
        module: '/src/learning/content/fourierChapterRegistry.ts',
        registryExport: 'fourierGuidedExampleLessons',
        pathExport: 'fourierGuidedExamplePath',
        expectedFor: (id, step) => (id.endsWith('.fourier-coefficients') ? fourierCoefficientsExpectedFor : id.endsWith('.epicycles') ? epicyclesExpectedFor : fourierExpectedFor)(id, step),
    },
    'projective-conics': {
        module: '/src/learning/content/projectiveConicsChapterRegistry.ts',
        registryExport: 'projectiveConicsGuidedExampleLessons',
        pathExport: 'projectiveConicsGuidedExamplePath',
        expectedFor: projectiveConicsExpectedFor,
        // Shared registered Demonstration rows (ids and paths) of the family; the examples must cover exactly these and open on their routes.
        identities: {module: '/src/graphs/projective/registration.ts', rows: 'projectiveDemonstrationRows'},
    },
    'curve-geometry': {
        module: '/src/learning/content/curveGeometryChapterRegistry.ts',
        registryExport: 'curveGeometryGuidedExampleLessons',
        pathExport: 'curveGeometryGuidedExamplePath',
        expectedFor: curveGeometryExpectedFor,
    },
    'convexity-hulls': {
        module: '/src/learning/content/convexityChapterRegistry.ts',
        registryExport: 'convexityGuidedExampleLessons',
        pathExport: 'convexityGuidedExamplePath',
        expectedFor: convexityExpectedFor,
    },
    'triangulations-voronoi': {
        module: '/src/learning/content/triangulationChapterRegistry.ts',
        registryExport: 'triangulationGuidedExampleLessons',
        pathExport: 'triangulationGuidedExamplePath',
        expectedFor: triangulationExpectedFor,
    },
    'sweep-algorithms': {
        module: '/src/learning/content/sweepChapterRegistry.ts',
        registryExport: 'sweepGuidedExampleLessons',
        pathExport: 'sweepGuidedExamplePath',
        expectedFor: sweepExpectedFor,
    },
    'triangle-geometry': {
        module: '/src/learning/content/triangleGeometryChapterRegistry.ts',
        registryExport: 'triangleGeometryGuidedExampleRegistry',
        pathExport: 'triangleGeometryGuidedExamplePath',
        expectedFor: triangleGeometryExpectedFor,
    },
    interpolation: {
        module: '/src/learning/content/interpolationChapterRegistry.ts',
        registryExport: 'interpolationGuidedExampleLessons',
        pathExport: 'interpolationGuidedExamplePath',
        expectedFor: interpolationExpectedFor,
    },
    probability: {
        module: '/src/learning/content/probabilityChapterRegistry.ts',
        registryExport: 'probabilityGuidedExampleLessons',
        pathExport: 'probabilityGuidedExamplePath',
        expectedFor: probabilityExpectedFor,
    },
    'b-splines': {
        module: '/src/learning/content/bsplineChapterRegistry.ts',
        registryExport: 'bsplineGuidedExampleLessons',
        pathExport: 'bsplineGuidedExamplePath',
        expectedFor: bsplineExpectedFor,
    },
    'phase-portraits': {
        module: '/src/learning/content/phasePortraitsChapterRegistry.ts',
        // This registry exports its section rows and a per-section lesson function, not a `{all()}` object: the generator adapts each section on request.
        registryExport: 'phasePortraitsGuidedExampleDemonstrations',
        lessonExport: 'phasePortraitsGuidedExampleLesson',
        pathExport: 'phasePortraitsGuidedExamplePath',
        expectedFor: phasePortraitsExpectedFor,
        // The two dynamics Demonstrations of the analysis family: the examples must cover exactly these and open on their routes.
        identities: {module: '/src/graphs/dynamics/registration.ts', rows: 'dynamicsDemonstrationRows'},
    },
    trigonometry: {
        module: '/src/learning/content/trigonometryChapterRegistry.ts',
        // Like phase-portraits: section rows plus a per-section lesson function.
        registryExport: 'trigonometryGuidedExampleDemonstrations',
        lessonExport: 'trigonometryGuidedExampleLesson',
        pathExport: 'trigonometryGuidedExamplePath',
        expectedFor: trigonometryExpectedFor,
        // The two trig Demonstrations: the examples must cover exactly these and open on their routes.
        identities: {module: '/src/graphs/trig/registration.ts', rows: 'trigDemonstrationRows'},
    },
    'advanced-bezier': {
        module: '/src/learning/content/advancedBezierChapterRegistry.ts',
        registryExport: 'advancedBezierGuidedExampleLessons',
        pathExport: 'advancedBezierGuidedExamplePath',
        expectedFor: advancedBezierExpectedFor,
    },
};

// Authored from src/linear/matrix2.ts (rows of the example matrices) and src/graphs/linear/linearMapScene.ts, not from a capture.
const linearMapExampleMatrices = {identity: [[1, 0], [0, 1]], 'basis-default': [[2, -1], [1, 1]], 'eigen-default': [[4, 1], [2, 3]], symmetric: [[2, 1], [1, 2]]};

const linearMapsCompositionFixture = [[1, 0], [2, 3], [4, 2], [5, -1]];

/**
 * First frame of the composition mode on its defaults (A the quarter turn R, B the reflection F in the x-axis, no translation, no
 * pivot): five visible curves (the shared source grid, the composition's source and image grid, source and image Bezier curve) and the eight control points P_i and T(P_i).
 * Authored from the fixture of src/linear/composition2.ts and FR = [[0,-1],[-1,0]], not from a capture.
 */
function linearMapsCompositionExpectedFor(id, actions) {
    const rest = actions.filter(item => !(item.kind === 'prepared-scene' && item.source === 'demonstration-default'));
    assert.ok(rest.length === 1 && rest[0].kind === 'linear-map' && rest[0].operation === 'set-mode',
        `${id}: a composition opening scene must be the default composition mode alone`);
    const image = ([x, y]) => [0 - y, 0 - x];
    return {types: {curve: 5, point: 8}, curveCount: 5, points: [...linearMapsCompositionFixture, ...linearMapsCompositionFixture.map(image)]};
}

/**
 * First-frame expectation of a Linear maps lesson: eight curves (source and image grid, source and image square, two
 * control polygons, the fixture Bezier curve and its image) and eight points (e1, e2, O, A(e1+e2), p, Ap, a1, a2).
 */
function linearMapsExpectedFor(id, step) {
    const actions = step.scene.actions;
    if (actions.some(item => item.kind === 'linear-map' && item.operation === 'set-mode' && item.mode === 'composition')) return linearMapsCompositionExpectedFor(id, actions);
    const examples = actions.filter(item => item.kind === 'linear-map' && item.operation === 'set-example');
    const matrices = actions.filter(item => item.kind === 'linear-map' && item.operation === 'set-matrix');
    // A scene opens on one named example, or on one explicit matrix (L7 opens on Z), never both.
    assert.ok(matrices.length === 0 || examples.length === 0, `${id}: opening scene must not override the example matrix`);
    assert.equal(examples.length + matrices.length, 1, `${id}: opening scene must name exactly one linear-map example`);
    const matrix = matrices.length ? matrices[0].matrix : linearMapExampleMatrices[examples[0].exampleId];
    assert.ok(matrix, `${id}: no authored matrix for example ${JSON.stringify(examples[0]?.exampleId)}`);
    const apply = ([x, y]) => [matrix[0][0] * x + matrix[0][1] * y, matrix[1][0] * x + matrix[1][1] * y];
    const points = [[1, 0], [0, 1], [0, 0], apply([1, 1]), [1, 1], apply([1, 1]), apply([1, 0]), apply([0, 1])];
    return {types: {curve: 8, point: 8}, curveCount: 8, points};
}

// Authored from src/analysis/complexReciprocalModel.ts and complexRootsModel.ts (the named examples), not from a capture.
const complexReciprocalExamples = {outside: {z: [1, 1], w: [2, 1]}, inside: {z: [0.5, 0.5], w: [2, 1]}, 'unit-circle': {z: [0.6, 0.8], w: [2, 1]}, division: {z: [1, -1], w: [2, 1]}};
const complexRootsExamples = {'two-i': {w: [0, 2]}, 'one-plus-i': {w: [1, 1]}};

/**
 * First-frame expectation of a Complex maps lesson, from the visibility its opening scene leaves at the Demonstration default
 * (everything derived is hidden until a scene action shows it).
 * Reciprocal: the unit circle and the arrows of z and w (three curves) and the points z, w and the always shown conjugate of z.
 * Roots: only the arrow of w (one curve) and the point w, because the roots, the polygon with its circle, and the test point are hidden.
 */
function complexMapsExpectedFor(id, step) {
    const actions = step.scene.actions;
    assert.ok(actions.every(item => item.kind === 'prepared-scene' || (item.kind === 'function-choice' && /^complex-(reciprocal|roots)-example$/.test(item.name))),
        `${id}: the authored first-frame expectation assumes an opening scene that only picks the example; extend complexMapsExpectedFor`);
    const choices = actions.filter(item => item.kind === 'function-choice');
    assert.equal(choices.length, 1, `${id}: opening scene must name exactly one example`);
    const {name, value} = choices[0];
    if (name === 'complex-reciprocal-example') {
        const example = complexReciprocalExamples[value];
        assert.ok(example, `${id}: no authored reciprocal example ${JSON.stringify(value)}`);
        return {types: {curve: 3, point: 3}, curveCount: 3, points: [example.z, example.w, [example.z[0], -example.z[1]]]};
    }
    const example = complexRootsExamples[value];
    assert.ok(example, `${id}: no authored roots example ${JSON.stringify(value)}`);
    return {types: {curve: 1, point: 1}, curveCount: 1, points: [example.w]};
}

/** The one value of a `function-choice` or `function-parameter` action named `name` in an opening scene; a missing or repeated one is an error. */
function sceneValue(id, actions, kind, name) {
    const found = actions.filter(item => item.kind === kind && item.name === name);
    assert.equal(found.length, 1, `${id}: opening scene must set ${name} exactly once`);
    return found[0].value;
}

/** Fails when the opening scene holds an action outside the allowed set: the authored expectation assumes the first frame only sets those values. */
function assertOnlyActions(id, actions, allowed, extend) {
    for (const item of actions) {
        assert.ok(item.kind === 'prepared-scene' || allowed.some(([kind, pattern]) => item.kind === kind && pattern.test(item.name ?? item.target ?? '')),
            `${id}: the authored first-frame expectation assumes an opening scene that only sets ${allowed.map(([kind, pattern]) => `${kind} ${pattern}`).join(', ')}; extend ${extend}`);
    }
}

// Authored from src/analysis/rootFinding.ts (the example functions), not from a capture.
const rootFindingExamples = {'square-minus-two': x => x * x - 2};

/**
 * First-frame expectation of a Numerical methods lesson (Newton, no step taken): the graph of f (one curve), the drop line from the
 * last iterate x0 to f(x0) (one line; the tangent is hidden until a step), and three points: (x0, f(x0)), (x0, 0) and the start x0 on
 * the axis (the line's origin marker and x1 are hidden). Secant scenes also show x1 and are not authored yet.
 */
function numericalExpectedFor(id, step) {
    const actions = step.scene.actions;
    if (actions.some(item => /^quadrature-/.test(item.name ?? ''))) return quadratureExpectedFor(id, actions);
    if (actions.some(item => /^euler-/.test(item.name ?? item.target ?? ''))) return eulerExpectedFor(id, actions);
    assertOnlyActions(id, actions, [['function-choice', /^root-finding-(method|example)$/], ['function-parameter', /^root-x0$/]], 'numericalExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'root-finding-method'), 'newton', `${id}: only the Newton first frame is authored`);
    const example = sceneValue(id, actions, 'function-choice', 'root-finding-example');
    assert.ok(Object.hasOwn(rootFindingExamples, example), `${id}: no authored root-finding example ${JSON.stringify(example)}`);
    const x0 = sceneValue(id, actions, 'function-parameter', 'root-x0');
    assert.ok(Number.isFinite(x0), `${id}: root-x0 must be a finite number`);
    return {types: {point: 3, segment: 1}, curveCount: 1, points: [[x0, rootFindingExamples[example](x0)], [x0, 0]]};
}

// Authored from src/analysis/quadratureModel.ts (the model {rule, fn, a, b, n}) and src/graphs/functions/QuadratureGraph.tsx (createScene), not from a capture.
const quadratureFunctions = ['square', 'sin', 'exp'];
const quadratureRules = ['trapezoid', 'simpson'];

/**
 * First-frame expectation of the Numerical methods quadrature lesson (N4): the filled shapes of the rule (one curve) and the graph of f
 * (one functiongraph), and the two bound points (a, 0) and (b, 0) on the axis; the caption texts are not asserted, as the expectation lists no `text` key. Every one of the five model
 * values must be set exactly once by the opening scene, with a valid rule, function, a < b and n (even for Simpson, never rounded).
 */
function quadratureExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^quadrature-(function|rule)$/], ['function-parameter', /^quadrature-(a|b|n)$/]], 'numericalExpectedFor');
    const fn = sceneValue(id, actions, 'function-choice', 'quadrature-function');
    assert.ok(quadratureFunctions.includes(fn), `${id}: no authored quadrature function ${JSON.stringify(fn)}`);
    const rule = sceneValue(id, actions, 'function-choice', 'quadrature-rule');
    assert.ok(quadratureRules.includes(rule), `${id}: no authored quadrature rule ${JSON.stringify(rule)}`);
    const [a, b, n] = ['a', 'b', 'n'].map(name => sceneValue(id, actions, 'function-parameter', `quadrature-${name}`));
    assert.ok(Number.isFinite(a) && Number.isFinite(b) && a < b, `${id}: quadrature-a must be a finite number below quadrature-b`);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 150 && (rule !== 'simpson' || n % 2 === 0), `${id}: quadrature-n must be an integer from 1 to 150, even for Simpson`);
    return {types: {point: 2}, curveCount: 2, points: [[a, 0], [b, 0]]};
}

// Authored from src/analysis/eulerModel.ts / odeEuler.ts (the model) and src/graphs/functions/EulerGraph.tsx (createScene), not from a capture.
const eulerExamples = ['exponential', 'linear-relaxation', 'blow-up'];
const eulerSteps = ['1', '0.5', '0.25', '0.125', '0.0625'];

/**
 * First-frame expectation of the Numerical methods Euler lesson (N5): the direction field and the node crosses, the Euler polyline only
 * when end x > x0, the dashed exact functiongraph only when `euler-exact` is shown, and the initial point P0 = (x0, y0).
 */
function eulerExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^euler-(example|step)$/], ['function-parameter', /^euler-(x0|y0|end)$/], ['function-visibility', /^euler-exact$/]], 'eulerExpectedFor');
    const example = sceneValue(id, actions, 'function-choice', 'euler-example');
    assert.ok(eulerExamples.includes(example), `${id}: no authored Euler example ${JSON.stringify(example)}`);
    const step = sceneValue(id, actions, 'function-choice', 'euler-step');
    assert.ok(eulerSteps.includes(step), `${id}: no authored Euler step ${JSON.stringify(step)}`);
    const [x0, y0, end] = ['x0', 'y0', 'end'].map(name => sceneValue(id, actions, 'function-parameter', `euler-${name}`));
    assert.ok([x0, y0, end].every(Number.isFinite) && end >= x0, `${id}: euler-x0, euler-y0 and euler-end must be finite numbers with euler-end not below euler-x0`);
    const visibility = actions.filter(item => item.kind === 'function-visibility');
    assert.ok(visibility.length === 1 && typeof visibility[0].visible === 'boolean', `${id}: opening scene must set euler-exact exactly once`);
    // The field and the node crosses always; the polyline only with at least one step (EulerGraph hides a single-node polyline).
    const curves = 2 + (end > x0 ? 1 : 0) + (visibility[0].visible ? 1 : 0);
    return {types: {curve: curves, point: 1}, curveCount: curves, points: [[x0, y0]]};
}

// Authored from src/analysis/transformation.ts (base functions) and the rule y = a f(b (x - c)) + d, not from a capture.
const transformBases = {square: x => x * x, cube: x => x ** 3, abs: Math.abs, exp: Math.exp};

/**
 * First-frame expectation of the Graph transformations lesson: the ghost and the transformed graph (two curves), the tracked point
 * (u, f(u)) of the ghost and its image (u / b + c, a f(u) + d) (two points). The opening scene must show the ghost.
 */
function transformationExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^transform-base$/], ['function-parameter', /^transform-[abcdu]$/], ['function-visibility', /^reference$/]], 'schoolFunctionGraphsExpectedFor');
    const visibility = actions.filter(item => item.kind === 'function-visibility');
    assert.ok(visibility.length === 1 && visibility[0].target === 'reference' && visibility[0].visible === true, `${id}: the authored expectation assumes the ghost is shown`);
    const base = sceneValue(id, actions, 'function-choice', 'transform-base');
    assert.ok(Object.hasOwn(transformBases, base), `${id}: no authored transformation base ${JSON.stringify(base)}`);
    const [a, b, c, d, u] = ['a', 'b', 'c', 'd', 'u'].map(name => sceneValue(id, actions, 'function-parameter', `transform-${name}`));
    assert.ok([a, b, c, d, u].every(Number.isFinite) && b !== 0, `${id}: transformation parameters must be finite with b not zero`);
    const f = transformBases[base];
    return {types: {curve: 2, point: 2}, curveCount: 2, points: [[u, f(u)], [u / b + c, a * f(u) + d]]};
}

/**
 * First-frame expectation of the Inverse functions lesson with the square restriction (y = x^2 on x >= 0, mirrored across y = x):
 * the forward graph and the dashed connector from P to its mirror point (two curves), the line y = x, and the points P = (x0, x0^2)
 * and P' = (x0^2, x0). The inverse curve, the tangents and the asymptotes are hidden.
 */
function inverseExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^inverse-restriction$/], ['function-parameter', /^inverse-(base|x0)$/], ['function-visibility', /^(inverse-curve|tangent)$/]], 'schoolFunctionGraphsExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'inverse-restriction'), 'square', `${id}: only the square restriction is authored`);
    const visibility = Object.fromEntries(actions.filter(item => item.kind === 'function-visibility').map(item => [item.target, item.visible]));
    assert.deepEqual(visibility, {'inverse-curve': false, tangent: false}, `${id}: the authored expectation assumes the inverse curve and tangents are hidden`);
    const x0 = sceneValue(id, actions, 'function-parameter', 'inverse-x0');
    assert.ok(Number.isFinite(x0) && x0 >= 0, `${id}: inverse-x0 must be finite and inside the restriction`);
    return {types: {curve: 2, line: 1, point: 2}, curveCount: 2, points: [[x0, x0 * x0], [x0 * x0, x0]]};
}

// Authored from src/analysis/polynomialZerosModel.ts (the example zeros), not from a capture.
const polynomialExampleZeros = {default: [-2, 1], triple: [1], 'degree-five': [-3, -1, 2]};

/**
 * First-frame expectation of the Polynomial zeros lesson: the polynomial curve (and the derivative curve when it is shown) and one glider
 * point (z, 0) per zero, after the scene's `poly-zero-n` moves. The multiplicity labels are texts; a scene that merges two zeros is not authored.
 */
function polynomialExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^polynomial-example$/], ['function-parameter', /^(k|poly-zero-[1-5])$/], ['function-visibility', /^polynomial-derivative$/]], 'schoolFunctionGraphsExpectedFor');
    const example = sceneValue(id, actions, 'function-choice', 'polynomial-example');
    assert.ok(Object.hasOwn(polynomialExampleZeros, example), `${id}: no authored polynomial example ${JSON.stringify(example)}`);
    const zeros = [...polynomialExampleZeros[example]];
    for (const item of actions.filter(entry => entry.kind === 'function-parameter' && entry.name !== 'k')) {
        const index = Number(item.name.slice('poly-zero-'.length)) - 1;
        assert.ok(index < zeros.length && Number.isFinite(item.value), `${id}: ${item.name} moves a zero that the example does not have`);
        zeros[index] = item.value;
    }
    assert.equal(new Set(zeros).size, zeros.length, `${id}: the authored expectation assumes no two zeros merge`);
    const visibility = actions.filter(item => item.kind === 'function-visibility');
    assert.ok(visibility.length === 1 && typeof visibility[0].visible === 'boolean', `${id}: the opening scene must set polynomial-derivative once`);
    const curves = visibility[0].visible ? 2 : 1;
    return {types: {curve: curves, point: zeros.length}, curveCount: curves, points: zeros.map(z => [z, 0])};
}

// Authored from src/analysis/rationalFunctionModel.ts (the example zeros), not from a capture.
const rationalExamples = {
    oblique: {k: 1, numerator: [[-1, 1], [1, 1]], denominator: [[2, 1]]},
    hole: {k: 1, numerator: [[-1, 1], [1, 1]], denominator: [[1, 1]]},
    horizontal: {k: 2, numerator: [[-1, 1], [1, 1]], denominator: [[-2, 1], [2, 1]]},
    'double-pole': {k: 4, numerator: [[0, 1]], denominator: [[-2, 1], [1, 2]]},
};

/**
 * First-frame expectation of the Rational functions lesson, after the scene's `rational-*` moves and probe: the curve; one glider point
 * (z, 0) per zero of the numerator and of the denominator; an open-circle point per hole (a zero common to both lists, at the limit of the
 * reduced fraction); a dashed vertical line per pole of the reduced fraction and one for the horizontal or oblique asymptote (present when
 * the reduced numerator's degree is at most the reduced denominator's plus one); and, when the probe is neither a pole nor a hole and an
 * asymptote exists, the probe point on the curve and its segment to the asymptote. A scene that merges two zeros of one list is not authored.
 */
function rationalExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^rational-example$/], ['function-parameter', /^(k|rational-(numerator|denominator)-[12]|rational-probe)$/]],
        'rationalExpectedFor');
    const example = sceneValue(id, actions, 'function-choice', 'rational-example');
    assert.ok(Object.hasOwn(rationalExamples, example), `${id}: no authored rational example ${JSON.stringify(example)}`);
    const {k, numerator, denominator} = rationalExamples[example];
    const lists = {numerator: numerator.map(entry => [...entry]), denominator: denominator.map(entry => [...entry])};
    for (const item of actions.filter(entry => entry.kind === 'function-parameter' && /^rational-(numerator|denominator)-/.test(entry.name))) {
        const [, part, slot] = /^rational-(numerator|denominator)-([12])$/.exec(item.name);
        assert.ok(Number(slot) <= lists[part].length && Number.isFinite(item.value), `${id}: ${item.name} moves a zero that the example does not have`);
        lists[part][Number(slot) - 1][0] = item.value;
    }
    for (const part of ['numerator', 'denominator']) {
        assert.equal(new Set(lists[part].map(([z]) => z)).size, lists[part].length, `${id}: the authored expectation assumes no two zeros of one list merge`);
    }
    assert.ok(!actions.some(item => item.name === 'k'), `${id}: the authored expectation assumes the example's k`);
    const probe = sceneValue(id, actions, 'function-parameter', 'rational-probe');
    const multiplicity = (list, z) => list.find(([at]) => at === z)?.[1] ?? 0;
    const reduced = {
        numerator: lists.numerator.map(([z, m]) => [z, m - Math.min(m, multiplicity(lists.denominator, z))]).filter(([, m]) => m > 0),
        denominator: lists.denominator.map(([z, n]) => [z, n - Math.min(n, multiplicity(lists.numerator, z))]).filter(([, n]) => n > 0),
    };
    const value = (x, parts) => k * parts.numerator.reduce((v, [z, m]) => v * (x - z) ** m, 1) / parts.denominator.reduce((v, [z, n]) => v * (x - z) ** n, 1);
    const holes = lists.numerator.filter(([z, m]) => multiplicity(lists.denominator, z) > 0 && multiplicity(lists.denominator, z) <= m).map(([z]) => z);
    const degree = parts => parts.reduce((sum, [, m]) => sum + m, 0);
    const asymptote = degree(reduced.numerator) <= degree(reduced.denominator) + 1;
    const gliders = [...lists.numerator, ...lists.denominator].map(([z]) => [z, 0]);
    const holePoints = holes.map(z => [z, value(z, reduced)]);
    const probeShown = asymptote && !holes.includes(probe) && !reduced.denominator.some(([z]) => z === probe);
    const points = [...gliders, ...holePoints, ...(probeShown ? [[probe, value(probe, reduced)]] : [])];
    const lines = reduced.denominator.length + (asymptote ? 1 : 0);
    return {types: {curve: 1, ...(lines ? {line: lines} : {}), point: points.length, ...(probeShown ? {segment: 1} : {})}, curveCount: 1, points};
}

// Authored from src/analysis/geometricSeriesModel.ts (the example a and q), not from a capture.
const seriesExamples = {
    'default': {q: 0.5},
    'alternating': {q: -0.5},
    'repeating-three': {q: 0.1},
    'repeating-nine': {q: 0.1},
    'divergent': {q: -1},
};

/**
 * First-frame expectation of the Geometric series lesson, after the scene's example, number of terms n and tolerance: a thin term bar and a
 * thick partial-sum bar per shown term (2n segments), the limit line when |q| < 1 (a segment), and, when also the tolerance is positive, the
 * band (a filled curve) with two dashed edges (segments). There is no point, so the expectation has no `points`.
 */
function seriesExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^series-example$/], ['function-parameter', /^series-(n|tolerance)$/]], 'seriesExpectedFor');
    const example = sceneValue(id, actions, 'function-choice', 'series-example');
    assert.ok(Object.hasOwn(seriesExamples, example), `${id}: no authored series example ${JSON.stringify(example)}`);
    const terms = sceneValue(id, actions, 'function-parameter', 'series-n');
    const tolerance = sceneValue(id, actions, 'function-parameter', 'series-tolerance');
    assert.ok(Number.isInteger(terms) && terms >= 1 && terms <= 50 && Number.isFinite(tolerance) && tolerance >= 0, `${id}: series-n or series-tolerance is out of range`);
    const limit = Math.abs(seriesExamples[example].q) < 1;
    const band = limit && tolerance > 0;
    return {types: {segment: 2 * terms + (limit ? 1 : 0) + (band ? 2 : 0), ...(band ? {curve: 1} : {})}, curveCount: band ? 1 : 0, points: []};
}

// Authored from src/analysis/conicFocalModel.ts (the ellipse example: foci (-4, 0) and (4, 0), P = (0, 3)), not from a capture.
/**
 * First-frame expectation of the Conics lesson, authored for the opening scene only: the ellipse example without the Bezier bridge. It draws
 * the conic (a curve), the directrix (a line), the segments P to F, P to the second focus and P to the directrix, and the focus, the second
 * focus and P (points). The other examples change what is drawn (parabola and hyperbola, circle without a directrix, the bridge), so they are
 * rejected until this function is extended.
 */
function conicExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^conic-example$/]], 'conicExpectedFor');
    const example = sceneValue(id, actions, 'function-choice', 'conic-example');
    assert.equal(example, 'ellipse', `${id}: only the ellipse example has an authored first frame; extend conicExpectedFor`);
    return {types: {curve: 1, line: 1, segment: 3, point: 3}, curveCount: 1, points: [[-4, 0], [0, 3], [4, 0]]};
}

/** First-frame expectation of a School function graphs lesson, chosen by the Demonstration the id ends with. */
function schoolFunctionGraphsExpectedFor(id, step) {
    if (id.endsWith('.function-transformation')) return transformationExpectedFor(id, step.scene.actions);
    if (id.endsWith('.function-inverse')) return inverseExpectedFor(id, step.scene.actions);
    if (id.endsWith('.polynomial-zeros')) return polynomialExpectedFor(id, step.scene.actions);
    if (id.endsWith('.rational-function')) return rationalExpectedFor(id, step.scene.actions);
    if (id.endsWith('.geometric-series')) return seriesExpectedFor(id, step.scene.actions);
    if (id.endsWith('.conic-focal')) return conicExpectedFor(id, step.scene.actions);
    assert.fail(`${id}: no authored School function graphs first frame`);
}

/**
 * First-frame expectation of the Fourier series lesson (square wave): per piece of f (four on [-2pi, 2pi], split at -pi, 0 and pi) a
 * band curve, two band edges and the target segment; the zoom window and S_N (curves); the error segment, which shows while S_N differs
 * from f at x. Points: the jump limits (0, -1) and (0, 1), the midpoint (0, 0), the Gibbs peak (pi/(N+1), S_N(pi/(N+1))), the values
 * (x, S_N(x)) and (x, f(x)), and the draggable x on the axis. S_N is the closed form 4/pi * sum over odd k <= N of sin(kx)/k.
 */
function fourierExpectedFor(id, step) {
    const actions = step.scene.actions;
    assertOnlyActions(id, actions, [['function-choice', /^fourier-example$/], ['function-parameter', /^fourier-(n|x|epsilon)$/]], 'fourierExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'fourier-example'), 'square', `${id}: only the square wave is authored`);
    const n = sceneValue(id, actions, 'function-parameter', 'fourier-n');
    const x = sceneValue(id, actions, 'function-parameter', 'fourier-x');
    assert.ok(Number.isInteger(n) && n >= 1 && Number.isFinite(x), `${id}: fourier-n must be a positive integer and fourier-x finite`);
    const order = n % 2 === 0 ? n - 1 : n;
    const partialSum = at => {
        let sum = 0;
        for (let k = 1; k <= order; k += 2) sum += Math.sin(k * at) / k;
        return 4 / Math.PI * sum;
    };
    const target = Math.sign(Math.sin(x));
    const sum = partialSum(x);
    assert.ok(Math.abs(target - sum) > 0, `${id}: the authored expectation assumes the error segment shows`);
    const peakX = Math.PI / (order + 1);
    return {types: {curve: 6, segment: 13, point: 7}, curveCount: 6,
        points: [[0, -1], [0, 1], [0, 0], [peakX, partialSum(peakX)], [x, sum], [x, target], [x, 0]]};
}

/**
 * First-frame expectation of the Fourier coefficients lesson (projection view, jump layout sgn(x - 1), term b, k = 1, K = 16, partial sum on).
 * The layout breaks at -pi, 1 and pi with the handles -1, -1, 1, 1 in slot order: right of -pi, left of 1, right of 1, left of pi. Curves: the
 * two product fills, the product edge, the dashed harmonic and S_K. Segments: the two pieces of f. Points: the four handles and the
 * Dirichlet midpoints (the seam jump -1 -> 1 shows one at -pi and one at pi, both at 0; the interior jump at 1 shows (1, 0)).
 */
function fourierCoefficientsExpectedFor(id, step) {
    const actions = step.scene.actions;
    assertOnlyActions(id, actions, [['function-choice', /^fourier-(view|layout|term|selection-[123]|scale)$/],
        ['function-parameter', /^fourier-(handle-[0-3]|order|harmonic|n)$/], ['function-visibility', /^fourier-partial-sum$/]], 'fourierCoefficientsExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'fourier-view'), 'projection', `${id}: only the projection view is authored`);
    assert.equal(sceneValue(id, actions, 'function-choice', 'fourier-layout'), 'jump', `${id}: only the jump layout is authored`);
    assert.equal(sceneValue(id, actions, 'function-choice', 'fourier-term'), 'b', `${id}: only the sine term is authored`);
    assert.equal(sceneValue(id, actions, 'function-parameter', 'fourier-harmonic'), 1, `${id}: only k = 1 is authored`);
    assert.equal(sceneValue(id, actions, 'function-parameter', 'fourier-order'), 16, `${id}: only K = 16 is authored`);
    const handles = [0, 1, 2, 3].map(index => sceneValue(id, actions, 'function-parameter', `fourier-handle-${index}`));
    assert.deepEqual(handles, [-1, -1, 1, 1], `${id}: only the handles -1, -1, 1, 1 are authored`);
    const overlay = actions.filter(item => item.kind === 'function-visibility');
    assert.ok(overlay.length === 1 && overlay[0].visible === true, `${id}: the partial-sum overlay must be on`);
    return {types: {curve: 5, segment: 2, point: 7}, curveCount: 5,
        points: [[-Math.PI, -1], [1, -1], [1, 1], [Math.PI, 1], [-Math.PI, 0], [Math.PI, 0], [1, 0]]};
}

/**
 * First-frame expectation of a Curve geometry lesson, authored from the mathematics of the frame, not from a capture.
 * L1 (parametric, cycloid with radius 1 at t = 0): the curve (x, y) = (t - sin t, 1 - cos t), the dashed rolling circle with its centre
 * (t, 1) = (0, 1) and the radius segment from the centre to the marked point (0, 0). The velocity (1 - cos t, sin t) is zero at t = 0, so
 * its arrow is hidden. The scene hides the trace (`parametric-trace-full` off) so the learner predicts the path first; at t = 0 the partial
 * trace has zero length and is not drawn. Visible: no curve, 1 circle, 1 segment and the points (0, 0) and (0, 1).
 * L2 (curvature, cubic with control points (0,0), (1,0), (2,1), (3,3) at t = 1/2, frame and circle hidden): the Bezier curve, its four
 * control points and the always drawn curve point B(1/2) = (0 + 3 + 6 + 3, 0 + 0 + 3 + 3) / 8 = (1.5, 0.75) where the readout is taken.
 */
function curveGeometryExpectedFor(id, step) {
    const actions = step.scene.actions;
    if (id.endsWith('.curve-parametric')) {
        assertOnlyActions(id, actions, [['parametric-curve', /^$/], ['parameter', /^t$/], ['curve-visibility', /^parametric-trace-full$/]], 'curveGeometryExpectedFor');
        const curve = actions.filter(item => item.kind === 'parametric-curve');
        assert.ok(curve.length === 1 && curve[0].curve === 'cycloid' && curve[0].radius === 1, `${id}: only the cycloid of radius 1 is authored`);
        assert.equal(sceneValue(id, actions, 'parameter', 't'), 0, `${id}: only t = 0 is authored`);
        const trace = actions.filter(item => item.kind === 'curve-visibility' && item.target === 'parametric-trace-full');
        assert.ok(trace.length === 1 && trace[0].visible === false, `${id}: the trace must be hidden for the prediction`);
        return {types: {circle: 1, segment: 1, point: 2}, curveCount: 0, points: [[0, 0], [0, 1]]};
    }
    if (id.endsWith('.curve-comb')) return curveCombExpectedFor(id, actions);
    if (id.endsWith('.curve-evolute')) return curveEvoluteExpectedFor(id, actions);
    if (id.endsWith('.curve-offset')) return curveOffsetExpectedFor(id, actions);
    if (id.endsWith('.curve-envelope')) return curveEnvelopeExpectedFor(id, actions);
    assert.ok(id.endsWith('.curve-curvature'), `${id}: no authored Curve geometry first frame`);
    assertOnlyActions(id, actions, [['parameter', /^t$/], ['curve-visibility', /^curvature-(frame|circle)$/]], 'curveGeometryExpectedFor');
    assert.equal(sceneValue(id, actions, 'parameter', 't'), 0.5, `${id}: only t = 0.5 is authored`);
    for (const target of ['curvature-frame', 'curvature-circle']) {
        const shown = actions.filter(item => item.kind === 'curve-visibility' && item.target === target);
        assert.ok(shown.length === 1 && shown[0].visible === false, `${id}: the ${target} must be hidden`);
    }
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    assert.deepEqual(prepared.length === 1 ? prepared[0].curve?.points : undefined, [[0, 0], [1, 0], [2, 1], [3, 3]], `${id}: only the cubic with control points (0,0), (1,0), (2,1), (3,3) is authored`);
    return {types: {curve: 1, point: 5}, curveCount: 1, points: [[0, 0], [1, 0], [2, 1], [3, 3], [1.5, 0.75]]};
}

/**
 * L3 (comb, cubic with control points (0,0), (1,0), (2,1), (3,3), comb hidden, gain 1.4): the Bezier curve and its four control points; the
 * comb curves (teeth, tip line, clipped bars) are hidden and the readout is board text, so they add nothing visible.
 */
function curveCombExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['comb-curve', /^$/], ['comb-gain', /^$/], ['curve-visibility', /^curvature-comb$/]], 'curveCombExpectedFor');
    const kind = actions.filter(item => item.kind === 'comb-curve');
    assert.ok(kind.length === 1 && kind[0].curve === 'cubic', `${id}: only the demonstration cubic is authored`);
    const comb = actions.filter(item => item.kind === 'curve-visibility' && item.target === 'curvature-comb');
    assert.ok(comb.length === 1 && comb[0].visible === false, `${id}: the comb must be hidden for the prediction`);
    return {types: {curve: 1, point: 4}, curveCount: 1, points: [[0, 0], [1, 0], [2, 1], [3, 3]]};
}

/**
 * L4 (evolute, parabola y = x^2 as the quadratic Bezier with control points (-1,1), (0,-1), (1,1), x = 2t - 1, at t = 0.75, trace and
 * normal hidden, frame hidden, circle shown): the curve, its three control points, the curve point B = (1/2, 1/4), the osculating circle
 * of radius R = sqrt 2 with its centre E = (-1/2, 5/4) = B + R N (the parabola's evolute point (-4x^3, 3x^2 + 1/2) at x = 1/2), and
 * the evolute point E drawn as a diamond on the same place. Two points lie on E, so five distinct positions are listed.
 */
function curveEvoluteExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['parameter', /^t$/], ['evolute-trace', /^$/], ['curve-visibility', /^(evolute-normal|curvature-frame|curvature-circle)$/]], 'curveEvoluteExpectedFor');
    assert.equal(sceneValue(id, actions, 'parameter', 't'), 0.75, `${id}: only t = 0.75 is authored`);
    const trace = actions.filter(item => item.kind === 'evolute-trace');
    assert.ok(trace.length === 1 && trace[0].mode === 'hidden', `${id}: the trace must be hidden for the prediction`);
    const shown = target => actions.filter(item => item.kind === 'curve-visibility' && item.target === target).map(item => item.visible);
    assert.deepEqual([shown('evolute-normal'), shown('curvature-frame'), shown('curvature-circle')], [[false], [false], [true]], `${id}: normal and frame hidden, circle shown`);
    return {types: {curve: 1, circle: 1, point: 6}, curveCount: 1, points: [[-1, 1], [0, -1], [1, 1], [0.5, 0.25], [-0.5, 1.25]]};
}

/**
 * L5 (offset, the straight segment (-1,0), (0,0), (1,0) as a quadratic Bezier at d = -1/2, sampled offset shown, cusps and speed plot hidden):
 * the curve, its three control points and the sampled offset curve (the line y = 1/2 from x = -1 to x = 1, drawn dashed). The cusp markers
 * and the speed plot are hidden, so they add nothing.
 */
function curveOffsetExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['offset-distance', /^$/], ['offset-samples', /^$/], ['curve-visibility', /^offset-(trace|cusps|speed-plot)$/]], 'curveOffsetExpectedFor');
    const distance = actions.filter(item => item.kind === 'offset-distance');
    assert.ok(distance.length === 1 && distance[0].value === -0.5, `${id}: only d = -1/2 is authored`);
    const shown = target => actions.filter(item => item.kind === 'curve-visibility' && item.target === target).map(item => item.visible);
    assert.deepEqual([shown('offset-trace'), shown('offset-cusps'), shown('offset-speed-plot')], [[true], [false], [false]], `${id}: the offset shown, cusps and speed plot hidden`);
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    assert.deepEqual(prepared.length === 1 ? prepared[0].curve?.points : undefined, [[-1, 0], [0, 0], [1, 0]], `${id}: only the segment (-1,0), (0,0), (1,0) is authored`);
    return {types: {curve: 2, point: 3}, curveCount: 2, points: [[-1, 0], [0, 0], [1, 0]]};
}

/**
 * L6 (envelope, the controls (1,0), (0,0), (0,1), four lines, the curve and the touching point hidden): the control polygon's three points
 * and the family, which is one curve element holding all four lines. The Bezier curve and the highlighted line are hidden, so they add nothing.
 */
function curveEnvelopeExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['envelope-t', /^$/], ['envelope-lines', /^$/], ['curve-visibility', /^envelope-(lines|curve|touch)$/]], 'curveEnvelopeExpectedFor');
    const count = actions.filter(item => item.kind === 'envelope-lines');
    assert.ok(count.length === 1 && count[0].value === 4, `${id}: only four lines are authored`);
    const shown = target => actions.filter(item => item.kind === 'curve-visibility' && item.target === target).map(item => item.visible);
    assert.deepEqual([shown('envelope-lines'), shown('envelope-curve'), shown('envelope-touch')], [[true], [false], [false]], `${id}: the lines shown, the curve and the touching point hidden`);
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    assert.deepEqual(prepared.length === 1 ? prepared[0].curve?.points : undefined, [[1, 0], [0, 0], [0, 1]], `${id}: only the controls (1,0), (0,0), (0,1) are authored`);
    return {types: {curve: 1, point: 3}, curveCount: 1, points: [[1, 0], [0, 0], [0, 1]]};
}

/**
 * First-frame expectation of the epicycles lesson (example circle, equal parametrization, N = 1, t = 0). The circle is four cubic spans
 * through (1, 0), (0, 1), (-1, 0), (0, -1) whose handles lie at distance kappa = (4/3)(sqrt 2 - 1) along the tangent at each end vertex:
 * span i from a to b has handles a + kappa (-a.y, a.x) and b - kappa (-b.y, b.x). Curves, bottom to top: the control polygon, the loop,
 * the circles, the arm chain, the trace. Points: the four vertex handles and the eight control handles (no segment, no other point).
 */
function epicyclesExpectedFor(id, step) {
    const actions = step.scene.actions;
    assertOnlyActions(id, actions, [['function-choice', /^epicycle-(example|parametrization)$/], ['function-parameter', /^epicycle-(n|time)$/]], 'epicyclesExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'epicycle-example'), 'circle', `${id}: only the circle example is authored`);
    assert.equal(sceneValue(id, actions, 'function-choice', 'epicycle-parametrization'), 'equal', `${id}: only the equal parametrization is authored`);
    assert.equal(sceneValue(id, actions, 'function-parameter', 'epicycle-n'), 1, `${id}: only N = 1 is authored`);
    assert.equal(sceneValue(id, actions, 'function-parameter', 'epicycle-time'), 0, `${id}: only t = 0 is authored`);
    const kappa = (4 / 3) * (Math.SQRT2 - 1);
    const vertices = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const controls = vertices.flatMap(([ax, ay], i) => {
        const [bx, by] = vertices[(i + 1) % 4];
        return [[ax - kappa * ay, ay + kappa * ax], [bx + kappa * by, by - kappa * bx]];
    });
    return {types: {curve: 5, point: 12}, curveCount: 5, points: [...vertices, ...controls]};
}

/** Fails unless the opening scene is the prepared scene plus exactly one projective load-example action for the named example. */
function projectiveOpening(id, actions, operation, exampleId) {
    const loads = actions.filter(item => item.kind === 'projective');
    assert.ok(actions.every(item => item.kind === 'prepared-scene' || item.kind === 'projective'),
        `${id}: the authored first-frame expectation assumes an opening scene of the prepared scene and one projective ${operation}; extend projectiveConicsExpectedFor`);
    assert.ok(loads.length === 1 && loads[0].operation === operation && loads[0].exampleId === exampleId,
        `${id}: the authored first-frame expectation assumes exactly one ${operation} of the ${exampleId} example; extend projectiveConicsExpectedFor`);
}

/**
 * K1 (cross ratio, default example): the line y = 0 with A, B, C, D at x = 0, 1, 3, 4, the centre O = (0, 5), the handles M = (0, 1) and N = (2, 2)
 * of the second line y = 1 + x/2, and the images A'..D' where the ray from O through (a, 0) meets that line: t = 4 / (5 + a/2) along the ray gives
 * x = 8a / (10 + a). Visible: the two lines, the four dashed rays from O, seven handles and four images.
 */
function crossRatioExpectedFor(id, actions) {
    projectiveOpening(id, actions, 'load-example', 'default');
    const abscissae = [0, 1, 3, 4];
    const images = abscissae.map(a => [8 * a / (10 + a), 1 + 4 * a / (10 + a)]);
    return {types: {line: 2, segment: 4, point: 11}, curveCount: 0, points: [...abscissae.map(a => [a, 0]), [0, 5], [0, 1], [2, 2], ...images]};
}

/**
 * K2 (Pascal, default example): the ellipse x^2/25 + y^2/9 = 1 through the points (5(1-t^2)/(1+t^2), 6t/(1+t^2)) for t = 0, 1/2, 1, 2, -1, -1/3
 * in the order A..F. Opposite sides s_i and s_(i+3) meet in the three Pascal points, which lie on one line p. Visible: the conic (a curve), six side lines
 * and p (seven lines), the six handles and each Pascal point inside the view box [-12, 12] x [-10.5, 10.5].
 */
function pascalExpectedFor(id, actions) {
    projectiveOpening(id, actions, 'pascal-load-example', 'default');
    const vertices = [0, 1 / 2, 1, 2, -1, -1 / 3].map(t => [5 * (1 - t * t) / (1 + t * t), 6 * t / (1 + t * t)]);
    const side = i => {
        const [x1, y1] = vertices[i];
        const [x2, y2] = vertices[(i + 1) % 6];
        return [y1 - y2, x2 - x1, x1 * y2 - x2 * y1];
    };
    const meet = (m, n) => {
        const d = m[0] * n[1] - m[1] * n[0];
        return [(m[1] * n[2] - m[2] * n[1]) / d, (m[2] * n[0] - m[0] * n[2]) / d];
    };
    const crossings = [0, 1, 2].map(i => meet(side(i), side(i + 3)));
    const inView = ([x, y]) => Math.abs(x) <= 12 && Math.abs(y) <= 10.5;
    const shown = crossings.filter(inView);
    assert.equal(shown.length, 2, `${id}: the authored expectation assumes exactly one Pascal point outside the view box`);
    return {types: {curve: 1, line: 7, point: 6 + shown.length}, curveCount: 1, points: [...vertices, ...shown]};
}

/**
 * K3 (pole and polar, default example): the ellipse 9x^2 + 25y^2 = 225 and P = (1, 21/5), outside it (the sum is above 1). The polar of (x0, y0) is
 * 9 x0 x + 25 y0 y = 225; it meets the ellipse in the two points of tangency T1, T2 (a quadratic in y). Visible: the conic (a curve), the polar and
 * both tangents (three lines), and the points P, T1, T2 and the centre S = (0, 0).
 */
function polePolarExpectedFor(id, actions) {
    projectiveOpening(id, actions, 'pole-polar-load-example', 'default');
    const [x0, y0] = [1, 21 / 5];
    assert.ok(9 * x0 * x0 + 25 * y0 * y0 > 225, `${id}: P must lie outside the ellipse`);
    // x = (225 - 25 y0 y) / (9 x0) put into 9x^2 + 25y^2 = 225.
    const k = 25 * y0 / (9 * x0);
    const a = 9 * k * k + 25;
    const b = -2 * 9 * k * 225 / (9 * x0);
    const c = 9 * (225 / (9 * x0)) ** 2 - 225;
    const root = Math.sqrt(b * b - 4 * a * c);
    const tangency = [(-b - root) / (2 * a), (-b + root) / (2 * a)].map(y => [(225 - 25 * y0 * y) / (9 * x0), y]);
    return {types: {curve: 1, line: 3, point: 4}, curveCount: 1, points: [[x0, y0], ...tangency, [0, 0]]};
}

/** Fails unless the opening scene is the prepared scene and then exactly the listed projective actions in order; each is `{operation, ...fields}` of a projective action. */
function projectiveSequence(id, actions, wanted, lesson) {
    const projective = actions.filter(item => item.kind === 'projective');
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    assert.ok(prepared.length >= 1 && prepared.length + projective.length === actions.length && actions[0].kind === 'prepared-scene' && projective.length === wanted.length
        && wanted.every((item, index) => Object.entries(item).every(([key, value]) => projective[index][key] === value)),
    `${id}: the authored first-frame expectation assumes the ${lesson} opening ${JSON.stringify(wanted)} after the prepared scene; extend projectiveConicsExpectedFor`);
}

/**
 * K4 (five points, ellipse example, extrapolation off): the grid points A..E = (5, 0), (0, 3), (-5, 0), (4, 9/5), (-3, 12/5) on x^2/25 + y^2/9 = 1,
 * and the arc from A to B (ends a = 0, b = 1) with the weight point D. The tangents at A (x = 5) and at B (y = 3) meet in P1 = (5, 3). In barycentric
 * coordinates (al, be, ga) of D against the triangle A P1 B the arc obeys be^2 = 4 w^2 al ga, which gives w (the square root of 1/2 here); the Farin points
 * are F1 = (A + w P1) / (1 + w), F2 = (w P1 + B) / (1 + w) and the shoulder S their midpoint. Visible: the conic, the arc and the control polygon (three
 * curves), the two end tangents (lines) and the nine points (the weight readout is text); the extrapolation and the line pair are hidden.
 */
function fivePointExpectedFor(id, actions) {
    projectiveSequence(id, actions, [{operation: 'five-point-load-example', exampleId: 'ellipse'}, {operation: 'five-point-set-extrapolation', on: false}], 'five-point');
    const grid = [[5, 0], [0, 3], [-5, 0], [4, 9 / 5], [-3, 12 / 5]];
    for (const [x, y] of grid) assert.ok(Math.abs(x * x / 25 + y * y / 9 - 1) < 1e-12, `${id}: every point must lie on the ellipse`);
    const [a, b, , d] = grid;
    const pole = [a[0], b[1]];
    // Barycentric coordinates of D against A, P1, B: solve D - A = u (P1 - A) + v (B - A).
    const e1 = [pole[0] - a[0], pole[1] - a[1]], e2 = [b[0] - a[0], b[1] - a[1]], r = [d[0] - a[0], d[1] - a[1]];
    const det = e1[0] * e2[1] - e1[1] * e2[0];
    const u = (r[0] * e2[1] - r[1] * e2[0]) / det, v = (e1[0] * r[1] - e1[1] * r[0]) / det;
    const [alpha, beta, gamma] = [1 - u - v, u, v];
    assert.ok(alpha > 0 && gamma > 0, `${id}: the weight point must lie on the arc between the ends`);
    const w = Math.sqrt(beta * beta / (4 * alpha * gamma));
    assert.ok(w < 1, `${id}: the authored expectation assumes the elliptic weight`);
    const mix = (p, q, s, t) => [(s * p[0] + t * q[0]) / (s + t), (s * p[1] + t * q[1]) / (s + t)];
    const farin = [mix(a, pole, 1, w), mix(pole, b, w, 1)];
    return {types: {curve: 3, line: 2, point: 9}, curveCount: 3, points: [...grid, pole, ...farin, mix(farin[0], farin[1], 1, 1)]};
}

/**
 * K5 (three views, c = 2, no point P): two panels of half width 11/2 and half height 7 centred at x = -6 (source plane, scale 2) and x = 6 (image plane).
 * L: y = 2 misses the unit circle, so the points Q1, Q2, Q1', Q2', P and P' are hidden and no handle shows. Visible: both panel frames, the circle, the
 * line L and the image ellipse (five curves). A point sequence is JSXGraph's linear interpolation at t = 0, 1/2, 1 of the first two vertices, so
 * the samples are the corner and edge midpoint of each frame, the end and midpoint of L (y = 2 * 2 = 4 over x = -6 +- 11/2) and the circle's first two
 * vertices at angles 0 and 2 pi / 120 at x = -6 + 2 cos, y = 2 sin.
 */
function threeViewsExpectedFor(id, actions) {
    projectiveSequence(id, actions, [{operation: 'three-views-set-c', tenths: 20}, {operation: 'three-views-set-point', on: false}], 'three-views');
    const c = 2, half = [5.5, 7], centres = [-6, 6];
    assert.ok(c > 1, `${id}: L must miss the circle so that no marker is shown`);
    const edge = (x0, x1, y) => [[x0, y], [(x0 + x1) / 2, y], [x1, y]];
    const step = 2 * Math.PI / 120;
    const circle = [[-6 + 2, 0], [-6 + 2 * (1 + Math.cos(step)) / 2, 2 * Math.sin(step) / 2], [-6 + 2 * Math.cos(step), 2 * Math.sin(step)]];
    const curves = [...centres.map(m => edge(m - half[0], m + half[0], -half[1])),
        edge(-6 - half[0], -6 + half[0], 2 * c), circle];
    return {types: {curve: 5, point: 0}, curveCount: 5, points: [], curves};
}

/** First-frame expectation of a Projective conics lesson, chosen by the Demonstration the id ends with. */
function projectiveConicsExpectedFor(id, step) {
    const actions = step.scene.actions;
    if (id.endsWith('.projective-cross-ratio')) return crossRatioExpectedFor(id, actions);
    if (id.endsWith('.projective-pascal')) return pascalExpectedFor(id, actions);
    if (id.endsWith('.projective-pole-polar')) return polePolarExpectedFor(id, actions);
    if (id.endsWith('.projective-five-point')) return fivePointExpectedFor(id, actions);
    if (id.endsWith('.projective-three-views')) return threeViewsExpectedFor(id, actions);
    assert.fail(`${id}: no authored Projective conics first frame`);
}

/** A chapter-owned entry must carry real expectations; a missing or empty one is a generation error. */
function assertExpectation(id, expected) {
    assert.ok(expected && typeof expected === 'object', `${id}: chapter-owned example needs authored expected checks`);
    // A surface first frame is checked by its camera and rendered owners, which validateInventory checks; it has no board elements.
    if (expected.surface) return;
    assert.ok(expected.types && Object.keys(expected.types).length > 0, `${id}: expected.types must be nonempty`);
    assert.ok(Number.isInteger(expected.curveCount) && expected.curveCount >= 0, `${id}: expected.curveCount must be a nonnegative integer (0 for a lesson that draws no curve)`);
    // A first frame of segments only (no point, no curve) is checked by its exact visible segment count.
    const segmentsOnly = expected.curveCount === 0 && expected.types.segment > 0 && Array.isArray(expected.points) && expected.points.length === 0 && expected.curves === undefined;
    assert.ok(segmentsOnly || (Array.isArray(expected.points) && (expected.points.length > 0 || (Array.isArray(expected.curves) && expected.curves.length > 0))),
        `${id}: expected.points must be nonempty (or, for a lesson whose first frame shows no point, expected.curves)`);
}

/** D1 first frame, step 1 of the lesson: the elevated quadratic (0,0), (2,4), (4,0) with the reduced curve and the elevated net shown. */
function reductionExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['reduction-points', /^$/], ['reduction-mode', /^$/], ['curve-visibility', /^reduction-(quadratic|elevation)$/]], 'reductionExpectedFor');
    const cubic = [[0, 0], [4 / 3, 8 / 3], [8 / 3, 8 / 3], [4, 0]];
    const scene = actions.filter(item => item.kind === 'reduction-points');
    assert.deepEqual(scene.length === 1 ? scene[0].points : undefined, cubic, `${id}: only the elevated quadratic is authored`);
    const mode = actions.filter(item => item.kind === 'reduction-mode');
    assert.ok(mode.length === 1 && mode[0].mode === 'fixed', `${id}: only fixed end points are authored`);
    for (const target of ['reduction-quadratic', 'reduction-elevation']) {
        const shown = actions.filter(item => item.kind === 'curve-visibility' && item.target === target);
        assert.ok(shown.length === 1 && shown[0].visible === true, `${id}: the ${target} must be shown`);
    }
    // The cubic, the reduced quadratic and the elevated polygon; 4 + 3 + 4 points. The elevated net lies on the cubic's points, and the quadratic adds only (2,4).
    return {types: {curve: 3, point: 11}, curveCount: 3, points: [...cubic, [2, 4]]};
}

/** D3 first frame: Q with control points (0,0), (1,3), (3,3), (4,0), its N + 1 = 9 equal-t points and the mover at t = 1/4; equal-arc points and the speed plot hidden. */
function arcLengthExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['arc-curve', /^$/], ['arc-pieces', /^$/], ['arc-mover-mode', /^$/], ['arc-mover-position', /^$/], ['arc-pause', /^$/],
        ['curve-visibility', /^arc-(equal-t|equal-arc|speed-plot)$/]], 'arcLengthExpectedFor');
    const one = kind => {
        const found = actions.filter(item => item.kind === kind);
        assert.equal(found.length, 1, `${id}: opening scene must have exactly one ${kind}`);
        return found[0];
    };
    assert.equal(one('arc-curve').curve, 'bezier', `${id}: only the cubic Q is authored`);
    assert.equal(one('arc-pieces').value, 8, `${id}: only N = 8 is authored`);
    assert.equal(one('arc-mover-mode').mode, 'parameter', `${id}: only the mover in t is authored`);
    assert.equal(one('arc-mover-position').value, 0.25, `${id}: only t = 1/4 is authored`);
    const visible = target => actions.filter(item => item.kind === 'curve-visibility' && item.target === target).map(item => item.visible);
    assert.deepEqual([visible('arc-equal-t'), visible('arc-equal-arc'), visible('arc-speed-plot')], [[true], [false], [false]],
        `${id}: only the equal-t points are shown`);
    const control = [[0, 0], [1, 3], [3, 3], [4, 0]];
    // Q(t) in Bernstein form, so the equal-t points do not come from the app's evaluation.
    const q = t => [0, 1].map(axis => (1 - t) ** 3 * control[0][axis] + 3 * (1 - t) ** 2 * t * control[1][axis] + 3 * (1 - t) * t ** 2 * control[2][axis] + t ** 3 * control[3][axis]);
    const interior = Array.from({length: 7}, (_, index) => q((index + 1) / 8));
    // 4 control points, 9 equal-t points and the mover. The t = 0 and t = 1 points lie on the end points and the mover on the t = 1/4 point, so 11 positions are distinct.
    return {types: {curve: 1, point: 14}, curveCount: 1, points: [...control, ...interior]};
}

/** The default boundaries of D4 (src/graphs/patches/coonsScene.ts): c0 and c1 run along u at v = 0 and 1, d0 and d1 along v at u = 0 and 1. */
const coonsBoundaries = {
    c0: [[0, 0, 0], [1, 0, 2], [2, 0, 2], [3, 0, 0]],
    c1: [[0, 3, 0], [1, 3, -1], [2, 3, -1], [3, 3, 0]],
    d0: [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]],
    d1: [[3, 0, 0], [3, 1, 1], [3, 2, 1], [3, 3, 0]],
};

/** The bicubic net P_ij = Lc_ij + Ld_ij - B_ij from the spec's formula, written out here so the surface check does not read the app's kernel. */
function coonsNetRows({c0, c1, d0, d1}) {
    const rows = [];
    for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) {
        const u = i / 3, v = j / 3;
        const [x, y, z] = [0, 1, 2].map(axis => (1 - v) * c0[i][axis] + v * c1[i][axis] + (1 - u) * d0[j][axis] + u * d1[j][axis]
            - ((1 - u) * (1 - v) * c0[0][axis] + u * (1 - v) * c0[3][axis] + (1 - u) * v * c1[0][axis] + u * v * c1[3][axis]));
        rows.push({x, y, z});
    }
    return rows;
}

/** D4 first frame: the Coons patch S of the default boundaries with linked corners, in the camera of the default Preset, fitted at the Preset aspect 0.45 (the catalog recipe refits to the frame instead). */
function coonsExpectedFor(id, actions) {
    assert.deepEqual(actions.filter(item => item.kind !== 'prepared-scene').map(({kind, operation, linked, shown}) => ({kind, operation, linked, shown})), [
        {kind: 'coons', operation: 'set-linked-corners', linked: true, shown: undefined},
        {kind: 'coons', operation: 'set-shown', linked: undefined, shown: 's'},
    ], `${id}: only S of the unmoved default boundaries with linked corners is authored`);
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    assert.ok(prepared.length > 0 && prepared.every(item => item.source === 'demonstration-default' && !item.curve), `${id}: the scene must start from the Demonstration default`);
    return {surface: {camera: {az: -0.9, el: 0.5, distance: 18.324962732834443, target: [1.5, 1.5, 0.5]},
        owners: [{id: 'tensor-patch-0', kind: 'tensor', geometrySamples: expectedSamples({kind: 'tensor', m: 3, n: 3, net: coonsNetRows(coonsBoundaries)})}],
        geometryTolerance: 1e-6, cameraTolerance: 1e-6}};
}

/** D2 first frame: the crossing pair A, B at step 0 of the run, with control polygons and hulls and no clipping overlay. */
function bezierClippingExpectedFor(id, actions) {
    const pair = [[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]];
    const overlay = (name, visible) => ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible});
    assert.deepEqual(actions.filter(item => item.kind !== 'prepared-scene'), [
        {kind: 'point-set', operation: 'load-model', points: pair, gridStepExponent: 0},
        {kind: 'point-set', operation: 'set-clip-tolerance', exponent: 6},
        overlay('control', true), overlay('hull', true), overlay('fatLine', false), overlay('kept', false), overlay('discarded', false),
        {kind: 'point-set', operation: 'set-trace-step', step: 0},
    ], `${id}: only the crossing pair at step 0 with control polygons and hulls is authored`);
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    assert.ok(prepared.length > 0 && prepared.every(item => item.source === 'demonstration-default'), `${id}: the scene must start from the Demonstration default`);
    // The curves A and B and their control polygons are curves; each hull is a triangle, drawn as one polygon with three border segments.
    return {types: {curve: 4, point: 6, polygon: 2, segment: 6}, curveCount: 4, points: pair};
}

function advancedBezierExpectedFor(id, step) {
    const actions = step.scene.actions;
    if (id.endsWith('.reduction')) return reductionExpectedFor(id, actions);
    if (id.endsWith('.arc-length-param')) return arcLengthExpectedFor(id, actions);
    if (id.endsWith('.bezier-clipping')) return bezierClippingExpectedFor(id, actions);
    assert.ok(id.endsWith('.patch-coons'), `${id}: no authored Advanced Bézier first frame`);
    return coonsExpectedFor(id, actions);
}

// ---- Point-set chapters (convexity-hulls, triangulations-voronoi, sweep-algorithms): shared readers of the opening scene's point-set actions.

/** Fails when the opening scene holds an action outside the allowed point-set operations (or `animation` commands): the authored expectation assumes the first frame sets only those. */
function assertOnlyPointSetOps(id, actions, operations, extend, animations = []) {
    for (const item of actions) {
        const ok = item.kind === 'prepared-scene' || (item.kind === 'point-set' && operations.includes(item.operation))
            || (item.kind === 'animation' && animations.includes(item.command));
        assert.ok(ok, `${id}: the authored first-frame expectation assumes an opening scene that only uses point-set ${operations.join(', ')}${animations.length ? ` and animation ${animations.join(', ')}` : ''}; extend ${extend}`);
    }
}

/** The one `point-set` action of `operation` in an opening scene; a missing or repeated one is an error. */
function pointSetAction(id, actions, operation) {
    const found = actions.filter(item => item.kind === 'point-set' && item.operation === operation);
    assert.equal(found.length, 1, `${id}: opening scene must run point-set ${operation} exactly once`);
    return found[0];
}

/** Whether the opening scene leaves the overlay shown: the last `set-overlay` for it, else the graph's initial state `initial`. */
function pointSetOverlay(actions, overlay, initial) {
    const set = actions.filter(item => item.kind === 'point-set' && item.operation === 'set-overlay' && item.overlay === overlay);
    return set.length ? set.at(-1).visible : initial;
}

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// Authored from src/graphs/compgeo/OrientationGraph.tsx (drawOverlay "turn": the dashed line through p and q, the shaded triangle and
// its two sides only with a third point) and PointSetGraph.tsx (one board point per model point), not from a capture.
function orientationExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-overlay'], 'orientationExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'points' && set.points.length === 2, `${id}: only the two-point line (no third point, so no triangle) is authored`);
    assert.ok(pointSetOverlay(actions, 'turn', true), `${id}: the turn overlay (the line through p and q) must be shown`);
    return {types: {point: 2, line: 1}, curveCount: 0, points: set.points};
}

// Authored from src/graphs/compgeo/PolygonAreaGraph.tsx (drawFan: diagonals from v0 to v2..v(n-2) as curves, one filled triangle per
// nonzero fan area; lattice markers and area labels only when their overlay is shown) and PointSetGraph.tsx (polygon mode: n points, n edge segments).
function polygonAreaExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-overlay'], 'polygonAreaExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    const n = set.points.length;
    assert.ok(set.mode === 'polygon' && set.closed === true && n >= 3, `${id}: only a closed polygon is authored`);
    assert.ok(pointSetOverlay(actions, 'fan', true), `${id}: the fan overlay must be shown`);
    assert.ok(!pointSetOverlay(actions, 'lattice', true) && !pointSetOverlay(actions, 'values', true), `${id}: only the fan without lattice markers and values is authored`);
    const triangles = set.points.slice(2).filter((point, k) => cross(set.points[0], set.points[k + 1], point) !== 0).length;
    return {types: {point: n, segment: n, curve: n - 3, polygon: triangles}, curveCount: n - 3, points: set.points};
}

// Authored from src/compgeo/pointInPolygon.ts (NOTCHED_PENTAGON) and src/graphs/compgeo/PointInPolygonGraph.tsx (the query point q, the
// ray and winding overlays; values draw nothing), not from a capture.
const notchedPentagon = [[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]];
function pointInPolygonExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-polygon', 'set-query-point', 'set-overlay'], 'pointInPolygonExpectedFor');
    assert.equal(pointSetAction(id, actions, 'set-polygon').polygon, 'notched', `${id}: only the notched pentagon is authored`);
    const query = pointSetAction(id, actions, 'set-query-point').point;
    assert.ok(Array.isArray(query) && query.length === 2, `${id}: the query point must be a coordinate pair`);
    assert.ok(!pointSetOverlay(actions, 'ray', true) && !pointSetOverlay(actions, 'winding', false), `${id}: only the opening without the ray and the winding overlay is authored`);
    return {types: {point: 6, segment: 5}, curveCount: 0, points: [...notchedPentagon, query]};
}

// Authored from src/graphs/compgeo/HullTraceGraph.tsx (sample 1, the trace overlay draws accepted paths and probes as curves, the hull
// only once done) and src/compgeo/slowHull.ts (event 0 tests the ordered pair (0, 1) against the witnesses in index order), not from a capture.
const hullSample1 = [[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]];
function convexHullExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-algorithm', 'set-overlay'], 'convexHullExpectedFor');
    assert.equal(pointSetAction(id, actions, 'set-algorithm').algorithm, 'slow-edge-test', `${id}: only the slow edge test is authored`);
    assert.ok(pointSetOverlay(actions, 'trace', true), `${id}: the trace overlay must be shown`);
    // Step 0 is the first ordered pair (p0, p1): a reject draws the pair and the first witness as two probes, an accept the pair as an
    // accepted edge plus the probe, so two curves either way. The hull is drawn only when the trace is done.
    const witness = hullSample1.findIndex((point, k) => k > 1 && cross(hullSample1[0], hullSample1[1], point) < 0);
    assert.ok(witness > 1, `${id}: the first pair of sample 1 must be rejected by a witness`);
    return {types: {point: 9, curve: 2}, curveCount: 2, points: hullSample1};
}

// Authored from src/compgeo/monotoneChain.ts (event order; the right rule pops only on a right turn) and HullTraceGraph.tsx (done: the
// accepted lower and upper chains as two curves and the hull outline as one polygon with four visible borders). The three collinear points
// 0, 1, 2 give 12 events (lower: phase, accept 0, accept 1, test, accept 2; upper: phase, accept 2, accept 1, test, accept 0; output; done);
// 11 next steps end on the done event, with hull [0, 1, 2, 1].
function hullRobustnessExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-mode', 'set-pop-rule', 'set-duplicates', 'set-points', 'set-overlay'], 'hullRobustnessExpectedFor', ['next-step']);
    assert.equal(pointSetAction(id, actions, 'set-mode').mode, 'chain', `${id}: only the chain view is authored`);
    assert.equal(pointSetAction(id, actions, 'set-pop-rule').rule, 'right', `${id}: only the right pop rule is authored`);
    assert.equal(pointSetAction(id, actions, 'set-duplicates').duplicates, 'merge', `${id}: only merged duplicates are authored`);
    const set = pointSetAction(id, actions, 'set-points');
    assert.deepEqual(set.points, [[0, 0], [2, 0], [4, 0]], `${id}: only the three collinear points are authored`);
    assert.ok(pointSetOverlay(actions, 'trace', true) && pointSetOverlay(actions, 'hull', true), `${id}: trace and hull overlays must be shown`);
    assert.equal(actions.filter(item => item.kind === 'animation').length, 11, `${id}: the authored trace end needs exactly 11 next steps`);
    return {types: {point: 3, curve: 2, polygon: 1, segment: 4}, curveCount: 2, points: set.points};
}

// Authored from src/graphs/compgeo/CurvePairGraph.tsx (two sampled Bezier curves; the control overlay one polyline per net; the hull
// overlay one filled polygon with three visible borders per non-degenerate net) and BezierHullsGraph.tsx (the pieces overlay draws nothing when hidden).
function bezierHullsExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-overlay', 'set-trace-step'], 'bezierHullsExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'points' && set.points.length === 6, `${id}: only two quadratic nets are authored`);
    assert.equal(pointSetAction(id, actions, 'set-trace-step').step, 0, `${id}: only trace step 0 is authored`);
    assert.ok(pointSetOverlay(actions, 'control', true) && pointSetOverlay(actions, 'hull', true) && !pointSetOverlay(actions, 'pieces', true),
        `${id}: only control polygons and hulls without the pieces are authored`);
    const nets = [set.points.slice(0, 3), set.points.slice(3)];
    assert.ok(nets.every(net => cross(...net) !== 0), `${id}: each net must span a triangle hull`);
    return {types: {point: 6, curve: 4, polygon: 2, segment: 6}, curveCount: 4, points: set.points};
}

/** First-frame expectation of a Convexity and hulls lesson (the six lessons of the chapter, keyed by the demonstration in the example id). */
function convexityExpectedFor(id, step) {
    const actions = step.scene.actions;
    const byDemonstration = {orientation: orientationExpectedFor, 'polygon-area': polygonAreaExpectedFor, 'point-in-polygon': pointInPolygonExpectedFor,
        'convex-hull': convexHullExpectedFor, 'hull-robustness': hullRobustnessExpectedFor, 'bezier-hulls': bezierHullsExpectedFor};
    const author = Object.hasOwn(byDemonstration, id.split('.').at(-1)) ? byDemonstration[id.split('.').at(-1)] : undefined;
    assert.ok(author, `${id}: no authored Convexity and hulls first frame`);
    return author(id, actions);
}

// ---- Triangulations and Voronoi chapter (triangulations-voronoi): five lessons, keyed by the demonstration in the example id.

/** Reflex vertices of a simple polygon: the turn at the vertex opposes the polygon's orientation. */
function reflexVertices(points) {
    const n = points.length;
    const area2 = points.reduce((sum, p, i) => sum + (p[0] * points[(i + 1) % n][1] - points[(i + 1) % n][0] * p[1]), 0);
    return points.map((p, i) => i).filter(i => cross(points[(i + n - 1) % n], points[i], points[(i + 1) % n]) * Math.sign(area2) < 0);
}

// Authored from src/graphs/compgeo/EarClippingGraph.tsx (drawOverlay: the trace overlay draws nothing at step 0, where earClippingRun's
// state has no triangle and no candidate; the reflex overlay one diamond marker point per reflex vertex; the triangulation, colouring and
// guard overlays only at done) and PointSetGraph.tsx (polygon mode: n points, n edge segments), not from a capture.
function earClippingExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-overlay'], 'earClippingExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    const n = set.points.length;
    assert.ok(set.mode === 'polygon' && set.closed === true && n >= 3, `${id}: only a closed polygon is authored`);
    assert.ok(pointSetOverlay(actions, 'trace', true) && pointSetOverlay(actions, 'reflex', true), `${id}: trace and reflex overlays must be shown`);
    assert.ok(!pointSetOverlay(actions, 'triangulation', false) && !pointSetOverlay(actions, 'colouring', false) && !pointSetOverlay(actions, 'guards', false),
        `${id}: only the opening without the triangulation, colouring and guard overlays is authored`);
    return {types: {point: n + reflexVertices(set.points).length, segment: n}, curveCount: 0, points: set.points};
}

// Authored from src/graphs/compgeo/TriangulationGraph.tsx (drawOverlay: nothing without the triangulation overlay, no edge selected) and
// PointSetGraph.tsx (points mode: one board point per model point, no segments), not from a capture.
function pointSetTriangulationExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-overlay'], 'pointSetTriangulationExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'points' && set.points.length >= 3, `${id}: only a point set is authored`);
    assert.ok(!pointSetOverlay(actions, 'triangulation', true) && !pointSetOverlay(actions, 'edges', false) && !pointSetOverlay(actions, 'angles', false),
        `${id}: only the opening without triangulation, edge and angle overlays is authored`);
    return {types: {point: set.points.length}, curveCount: 0, points: set.points};
}

/** Whether the edge a-b of the triangles (a, b, c) and (b, a, d) is illegal: d lies strictly inside the circle through a, b and c. */
function illegalEdgeInCircle(points, a, b, c, d) {
    const orient = cross(points[a], points[b], points[c]) > 0 ? 1 : -1;
    const [u, v, w] = [a, b, c].map(i => [points[i][0] - points[d][0], points[i][1] - points[d][1]]).map(([x, y]) => [x, y, x * x + y * y]);
    const det = u[0] * (v[1] * w[2] - v[2] * w[1]) - u[1] * (v[0] * w[2] - v[2] * w[0]) + u[2] * (v[0] * w[1] - v[1] * w[0]);
    return det * orient > 0;
}

// Authored from src/graphs/compgeo/DelaunayGraph.tsx (drawTriangulation: the TriangulationGraph edge curves, a dashed curve and a text label
// over each illegal edge at the step, the test quadrilateral only for an edge under test; drawExtras: one polygon per triangle with its
// borders hidden), delaunayRun.ts (step 0 is phase-start, no edge under test) and compgeo/triangulation.ts (edges are the distinct triangle sides).
function delaunayExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-overlay', 'set-triangulation'], 'delaunayExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    const {points} = set;
    const {triangles} = pointSetAction(id, actions, 'set-triangulation');
    assert.ok(set.mode === 'points' && Array.isArray(triangles) && triangles.length > 0, `${id}: only a named triangulation of a point set is authored`);
    assert.ok(pointSetOverlay(actions, 'triangulation', true) && !pointSetOverlay(actions, 'edges', false) && !pointSetOverlay(actions, 'angles', false),
        `${id}: only the triangulation without edge and angle overlays is authored`);
    const sides = new Map();
    for (const tri of triangles) tri.forEach((v, k) => {
        const w = tri[(k + 1) % 3];
        const key = `${Math.min(v, w)}-${Math.max(v, w)}`;
        sides.set(key, [...(sides.get(key) || []), [v, w, tri[(k + 2) % 3]]]);
    });
    // An interior edge is shared by two triangles; with the apexes c and d it is illegal when d is inside the circle of the other triangle.
    let illegal = 0;
    for (const shared of sides.values()) {
        if (shared.length !== 2) continue;
        const [[a, b, c], [, , d]] = shared;
        if (illegalEdgeInCircle(points, a, b, c, d)) illegal += 1;
    }
    return {types: {point: points.length, curve: sides.size + illegal, polygon: triangles.length, ...(illegal ? {text: illegal} : {})}, curveCount: sides.size + illegal, points};
}

// Authored from src/graphs/compgeo/VoronoiGraph.tsx (syncScene: the query point is always one square board point; the diagram, Delaunay
// overlay and the selected-site construction draw nothing while hidden or with no site) and PointSetGraph.tsx (one board point per site).
function voronoiExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-overlay', 'select-site', 'set-query-point'], 'voronoiExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'points' && set.points.length >= 3, `${id}: only a site set is authored`);
    assert.equal(pointSetAction(id, actions, 'select-site').site, null, `${id}: only the opening without a selected site is authored`);
    assert.ok(!pointSetOverlay(actions, 'diagram', true) && !pointSetOverlay(actions, 'delaunay', true), `${id}: only the opening without diagram and Delaunay overlays is authored`);
    const query = pointSetAction(id, actions, 'set-query-point').point;
    assert.ok(Array.isArray(query) && query.length === 2, `${id}: the query point must be a coordinate pair`);
    return {types: {point: set.points.length + 1}, curveCount: 0, points: [...set.points, query]};
}

// Same board as above, in the sites mode of the degenerate-sites lesson (src/graphs/compgeo/DegenerateSitesGraph.tsx adds no drawing); the
// opening scene sets no query point, so the query stays at VORONOI_DEFAULT_QUERY (4, 2) of voronoiPresetCollection.ts.
function voronoiDegenerateExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-mode', 'set-points', 'set-overlay'], 'voronoiDegenerateExpectedFor');
    assert.equal(pointSetAction(id, actions, 'set-mode').mode, 'sites', `${id}: only the sites mode is authored`);
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'points' && set.points.length >= 3, `${id}: only a site set is authored`);
    assert.ok(!pointSetOverlay(actions, 'diagram', true) && !pointSetOverlay(actions, 'delaunay', true), `${id}: only the opening without diagram and Delaunay overlays is authored`);
    return {types: {point: set.points.length + 1}, curveCount: 0, points: [...set.points, [4, 2]]};
}

/** First-frame expectation of a Triangulations and Voronoi lesson (the five lessons of the chapter, keyed by the demonstration in the example id). */
function triangulationExpectedFor(id, step) {
    const byDemonstration = {'ear-clipping': earClippingExpectedFor, 'point-set-triangulation': pointSetTriangulationExpectedFor, delaunay: delaunayExpectedFor,
        voronoi: voronoiExpectedFor, 'voronoi-degenerate': voronoiDegenerateExpectedFor};
    const author = Object.hasOwn(byDemonstration, id.split('.').at(-1)) ? byDemonstration[id.split('.').at(-1)] : undefined;
    assert.ok(author, `${id}: no authored Triangulations and Voronoi first frame`);
    return author(id, step.scene.actions);
}

// ---- Sweep algorithms chapter (sweep-algorithms): five lessons, keyed by the demonstration in the example id.

/** The optional `set-trace-step` of an opening scene: the step it shows, 0 (the graph's initial step) when the scene sets none. */
function sweepTraceStep(id, actions) {
    const found = actions.filter(item => item.kind === 'point-set' && item.operation === 'set-trace-step');
    assert.ok(found.length <= 1, `${id}: opening scene must run point-set set-trace-step at most once`);
    return found.length ? found[0].step : 0;
}

// Authored from src/graphs/compgeo/IntervalSweepGraph.tsx with intervalSweepRun.view(0) (sweep position at x 0, current interval 0, nothing
// open: the sweep line plus the dashed idle current-interval curve, two curves) and PointSetGraph.tsx (intervals mode: one board point per
// endpoint, one segment and one text label per pair), not from a capture.
function intervalSweepExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-trace-step'], 'intervalSweepExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'intervals' && set.points.length >= 2 && set.points.length % 2 === 0, `${id}: only an interval set is authored`);
    assert.equal(sweepTraceStep(id, actions), 0, `${id}: only the sweep at its first step is authored`);
    const pairs = set.points.length / 2;
    return {types: {point: set.points.length, segment: pairs, text: pairs, curve: 2}, curveCount: 2, points: set.points};
}

// Authored from src/graphs/compgeo/BentleyOttmannGraph.tsx with bentleyOttmannRun.view(0) (no sweep position, so the overlay draws nothing)
// and PointSetGraph.tsx (segments mode: one board point per endpoint, one segment and one text label per pair), not from a capture.
function segmentIntersectionsExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-trace-step'], 'segmentIntersectionsExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'segments' && set.points.length >= 2 && set.points.length % 2 === 0, `${id}: only a segment set is authored`);
    assert.equal(sweepTraceStep(id, actions), 0, `${id}: only the sweep at its first step is authored`);
    const pairs = set.points.length / 2;
    return {types: {point: set.points.length, segment: pairs, text: pairs}, curveCount: 0, points: set.points};
}

// Authored from src/graphs/compgeo/MonotonePartitionGraph.tsx with its run view(0) (no vertex handled, empty status, nothing processed: only
// the sweep-line curve above the polygon) and PointSetGraph.tsx (polygon mode: n points, n edge segments), not from a capture.
function monotonePartitionExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-trace-step'], 'monotonePartitionExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    const n = set.points.length;
    assert.ok(set.mode === 'polygon' && set.closed === true && n >= 3, `${id}: only a closed polygon is authored`);
    assert.equal(sweepTraceStep(id, actions), 0, `${id}: only the sweep at its first step is authored`);
    return {types: {point: n, segment: n, curve: 1}, curveCount: 1, points: set.points};
}

// Authored from src/graphs/compgeo/MonotoneTriangulationGraph.tsx (lines 63-160) at triangulationView(15) of the lesson polygon: piece 0 with
// the cycle [5, 0, 1, 4], the earlier diagonal [1, 4], vertex 5 current, an empty stack, no test and no triangle. Drawn: the 6 polygon points,
// 4 chain markers and the ring on the current vertex; the 3 piece edges, the diagonal and the sweep line as curves; 4 labels; 1 piece polygon;
// the 6 polygon edges and the 4 borders of the piece polygon as segments. A hand count, kept only for the lesson polygon.
function monotoneTriangulationExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-trace-step'], 'monotoneTriangulationExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    const lessonPolygon = [[0, 0], [4, 3], [8, 0], [12, 8], [8, 5], [4, 8]];
    assert.ok(set.mode === 'polygon' && set.closed === true && JSON.stringify(set.points) === JSON.stringify(lessonPolygon), `${id}: only the lesson polygon is authored`);
    assert.equal(sweepTraceStep(id, actions), 15, `${id}: only step 15 of the triangulation trace is authored`);
    return {types: {point: 11, segment: 10, curve: 5, text: 4, polygon: 1}, curveCount: 5, points: set.points};
}

// Authored from src/graphs/compgeo/FortuneGraph.tsx (syncFortune) and fortuneDrawing.ts (update at run.view(0): the sweep line and the
// beach line curve, which has no arc at step 0 and so has no samples to draw, leaving the sweep line as the one curve; no breakpoint, trace, circle, vertex or current-event object) and PointSetGraph.tsx
// (points mode: one board point per site), not from a capture.
function fortuneExpectedFor(id, actions) {
    assertOnlyPointSetOps(id, actions, ['set-points', 'set-trace-step'], 'fortuneExpectedFor');
    const set = pointSetAction(id, actions, 'set-points');
    assert.ok(set.mode === 'points' && set.points.length >= 2, `${id}: only a site set is authored`);
    assert.equal(sweepTraceStep(id, actions), 0, `${id}: only the queued first step is authored`);
    return {types: {point: set.points.length, curve: 1}, curveCount: 1, points: set.points};
}

/** First-frame expectation of a Sweep algorithms lesson (the five lessons of the chapter, keyed by the demonstration in the example id). */
function sweepExpectedFor(id, step) {
    const byDemonstration = {'interval-sweep': intervalSweepExpectedFor, 'segment-intersections': segmentIntersectionsExpectedFor,
        'monotone-partition': monotonePartitionExpectedFor, 'monotone-triangulation': monotoneTriangulationExpectedFor, fortune: fortuneExpectedFor};
    const author = Object.hasOwn(byDemonstration, id.split('.').at(-1)) ? byDemonstration[id.split('.').at(-1)] : undefined;
    assert.ok(author, `${id}: no authored Sweep algorithms first frame`);
    return author(id, step.scene.actions);
}

// ---- Triangle geometry chapter (triangle-geometry): five lessons, keyed by the demonstration in the example id.

const TRIANGLE_LESSON_POINTS = [[0, 0], [7, 0], [2, 5]];

/** Asserts the opening scene shows exactly the overlays `shown` out of `all`, each set explicitly (the graph's own default is not relied on). */
function assertOverlays(id, actions, all, shown) {
    for (const overlay of all) {
        assert.equal(pointSetOverlay(actions, overlay, undefined), shown.includes(overlay), `${id}: overlay ${overlay} must be ${shown.includes(overlay) ? 'shown' : 'hidden'}`);
    }
}

/** Asserts the opening scene keeps the graph's default lesson triangle (no `set-points`) and returns its vertices. */
function defaultTriangle(id, actions) {
    assert.ok(!actions.some(item => item.kind === 'point-set' && item.operation === 'set-points'), `${id}: only the default triangle is authored`);
    return TRIANGLE_LESSON_POINTS;
}

/** The one `parameter` action of the opening scene named `name`. */
function parameterValue(id, actions, name) {
    const found = actions.filter(item => item.kind === 'parameter' && item.name === name);
    assert.equal(found.length, 1, `${id}: opening scene must set parameter ${name} exactly once`);
    return found[0].value;
}

const triangleOps = (id, actions, overlays, extra = []) => {
    for (const item of actions) {
        assert.ok(item.kind === 'prepared-scene' || (item.kind === 'point-set' && item.operation === 'set-overlay' && overlays.includes(item.overlay))
            || extra.some(test => test(item)), `${id}: the authored first-frame expectation assumes an opening scene that only sets the overlays ${overlays.join(', ')}${extra.length ? ' and its listed extra actions' : ''}; extend the expectation before changing it`);
    }
};

// Authored from src/graphs/compgeo/NotablePointsGraph.tsx (drawTriangle: three segments; drawCentre centroid: three median segments and the
// centroid point; ensureChip: one html text) and PointSetGraph.tsx (points mode: one board point per vertex), not from a capture.
function notablePointsExpectedFor(id, actions) {
    const overlays = ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'];
    triangleOps(id, actions, overlays);
    assertOverlays(id, actions, overlays, ['triangle', 'centroid']);
    return {types: {point: 4, segment: 6, text: 1}, curveCount: 0, points: defaultTriangle(id, actions)};
}

// Authored from src/graphs/compgeo/InscribedAngleGraph.tsx (createScene: the circle, the chord segment, the centre O and the glider P as
// points; drawAngles: the sides CA, CB, PA, PB as segments and the marks at C, P and O as three curves; ensureChip: one html text) and
// PointSetGraph.tsx (one board point per vertex), at glider angle 90 degrees, not from a capture.
function inscribedAngleExpectedFor(id, actions) {
    const overlays = ['radii', 'angles'];
    triangleOps(id, actions, overlays, [item => item.kind === 'parameter' && item.name === 't']);
    assertOverlays(id, actions, overlays, ['angles']);
    assert.equal(parameterValue(id, actions, 't'), 90, `${id}: only the glider at 90 degrees is authored`);
    return {types: {point: 5, circle: 1, segment: 5, curve: 3, text: 1}, curveCount: 3, points: defaultTriangle(id, actions)};
}

// Authored from src/graphs/compgeo/EulerLineGraph.tsx (drawTriangle: three segments; marker: the points H, G and O; ensureChip: one html text)
// and PointSetGraph.tsx (one board point per vertex), not from a capture.
function eulerLineExpectedFor(id, actions) {
    const overlays = ['triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle'];
    triangleOps(id, actions, overlays);
    assertOverlays(id, actions, overlays, ['triangle', 'centres']);
    return {types: {point: 6, segment: 3, text: 1}, curveCount: 0, points: defaultTriangle(id, actions)};
}

// Authored from src/graphs/compgeo/SimsonLineGraph.tsx (createScene: the feet D, E, F and the glider P as points, all inside the view at 250
// degrees; drawTriangle: three segments; drawSideLines: three lines; drawCircumcircle: the circle and its centre O; ensureChip: one html
// text) and PointSetGraph.tsx (one board point per vertex), not from a capture. The feet exist whatever the perpendiculars overlay says.
function simsonLineExpectedFor(id, actions) {
    const overlays = ['triangle', 'sidelines', 'circumcircle', 'perpendiculars', 'simson', 'pedal'];
    triangleOps(id, actions, overlays, [item => item.kind === 'parameter' && item.name === 't']);
    assertOverlays(id, actions, overlays, ['triangle', 'sidelines', 'circumcircle']);
    assert.equal(parameterValue(id, actions, 't'), 250, `${id}: only the glider at 250 degrees is authored`);
    return {types: {point: 8, segment: 3, line: 3, circle: 1, text: 1}, curveCount: 0, points: defaultTriangle(id, actions)};
}

// Authored from src/graphs/compgeo/InversionGraph.tsx (createFigure focus power: the power circle; handlesFor power: handles O and theta;
// drawSecant: the secant line and the points A and B, the circle centre (5,0) and radius 3 meeting the direction 0 in two points;
// ensureChip: one html text) and PointSetGraph.tsx (the one vertex P at the origin), after load-example power, not from a capture.
function inversionExpectedFor(id, actions) {
    const overlays = ['inversion-circle', 'rays', 'image', 'secant', 'tangent', 'angle-tangents'];
    triangleOps(id, actions, overlays, [item => item.kind === 'inversion' && item.operation === 'load-example' && item.exampleId === 'power']);
    assert.equal(actions.filter(item => item.kind === 'inversion' && item.operation === 'load-example').length, 1, `${id}: only the power example is authored`);
    assertOverlays(id, actions, overlays, ['secant']);
    return {types: {point: 5, circle: 1, line: 1, text: 1}, curveCount: 0, points: [[0, 0]]};
}

/** First-frame expectation of a Triangle geometry lesson (the five lessons of the chapter, keyed by the demonstration in the example id). */
function triangleGeometryExpectedFor(id, step) {
    const byDemonstration = {'triangle-centres': notablePointsExpectedFor, 'inscribed-angle': inscribedAngleExpectedFor, 'euler-line': eulerLineExpectedFor,
        'simson-line': simsonLineExpectedFor, inversion: inversionExpectedFor};
    const author = Object.hasOwn(byDemonstration, id.split('.').at(-1)) ? byDemonstration[id.split('.').at(-1)] : undefined;
    assert.ok(author, `${id}: no authored Triangle geometry first frame`);
    return author(id, step.scene.actions);
}

// ---- Interpolation chapter (interpolation): five lessons, keyed by the section in the example id.

const INTERPOLATION_POINTS = [[0, 0], [1, 2], [3, 3], [4, 0]];

/** Asserts every action of the opening scene is the prepared scene or one of `kind` with an operation in `operations` (an `extra` test may allow more). */
function interpolationOps(id, actions, kind, operations, extra = () => false) {
    for (const item of actions) {
        assert.ok(item.kind === 'prepared-scene' || (item.kind === kind && operations.includes(item.operation)) || extra(item),
            `${id}: the authored first-frame expectation assumes an opening scene that only uses ${kind} ${operations.join(', ')}; extend the expectation before changing it`);
    }
}

/** The last action of `kind` and `operation` (matching `test`) in the opening scene, or undefined. */
const lastOp = (actions, kind, operation, test = () => true) => actions.filter(item => item.kind === kind && item.operation === operation && test(item)).at(-1);

/** The value the opening scene gives `operation` through `field`; it must be set exactly once. */
function onceOp(id, actions, kind, operation, field) {
    const found = actions.filter(item => item.kind === kind && item.operation === operation);
    assert.equal(found.length, 1, `${id}: opening scene must run ${kind} ${operation} exactly once`);
    return found[0][field];
}

/** Whether an overlay is shown: it must be set explicitly (the graph's own default is not relied on). */
function interpolationOverlay(id, actions, kind, overlay) {
    const set = lastOp(actions, kind, 'set-overlay', item => item.overlay === overlay);
    assert.ok(set, `${id}: opening scene must set the ${overlay} overlay`);
    return set.visible;
}

// Authored from src/graphs/curves/interpolation/InterpolationScene.ts (build: the hull and Bezier curves only while shown, the Lagrange curve
// always; the Lagrange marker always and the Bezier marker only while shown; one board point per data point; the readout text only on a board at least
// 480 CSS px wide, which the 420 px wide card board is not, so no text) and the default data of interpolationModel.ts, not from a capture. The marker sits at the Lagrange point of the parameter
// t = s (n - 1) with the uniform parameters 0..n-1, computed here from the Lagrange formula.
function lagrangeExpectedFor(id, actions) {
    interpolationOps(id, actions, 'interpolation', ['set-rule', 'set-overlay'], item => item.kind === 'parameter' && item.name === 't');
    assert.equal(lastOp(actions, 'interpolation', 'set-rule')?.rule, 'uniform', `${id}: only the uniform parameter rule is authored`);
    for (const overlay of ['hull', 'bezier', 'basis']) assert.equal(interpolationOverlay(id, actions, 'interpolation', overlay), false, `${id}: only the plain Lagrange curve is authored (${overlay} must be hidden)`);
    const position = actions.filter(item => item.kind === 'parameter' && item.name === 't');
    assert.equal(position.length, 1, `${id}: opening scene must set the position s exactly once`);
    const points = INTERPOLATION_POINTS;
    const t = position[0].value * (points.length - 1);
    const basis = points.map((_, j) => points.reduce((product, _other, k) => k === j ? product : product * (t - k) / (j - k), 1));
    const marker = [0, 1].map(axis => Number(points.reduce((sum, point, j) => sum + basis[j] * point[axis], 0).toFixed(7)));
    return {types: {point: 5, curve: 1}, curveCount: 1, points: [...points, marker]};
}

// Authored from src/graphs/functions/RungeInterpolationGraph.tsx (createScene: the faint f and the polynomial p always, the error curve only
// while shown, the semicircle curves only while shown; one node marker per node 0..degree; the grid-maximum marker only with the error curve;
// one caption block, which the card capture hides because its text exceeds the 65 characters capture-demonstration-previews.cjs allows) and src/analysis/interpolation.ts (equispaced nodes on [-1, 1]), not from a capture.
function rungeExpectedFor(id, actions) {
    interpolationOps(id, actions, 'runge', ['set-function', 'set-degree', 'set-rule', 'set-overlay']);
    assert.equal(onceOp(id, actions, 'runge', 'set-function', 'function'), 'runge', `${id}: only the Runge function is authored`);
    assert.equal(onceOp(id, actions, 'runge', 'set-rule', 'rule'), 'equispaced', `${id}: only equally spaced nodes are authored`);
    const degree = onceOp(id, actions, 'runge', 'set-degree', 'value');
    assert.ok(Number.isInteger(degree) && degree >= 1, `${id}: the degree must be a positive integer`);
    for (const overlay of ['error', 'semicircle']) assert.equal(interpolationOverlay(id, actions, 'runge', overlay), false, `${id}: only the plain polynomial is authored (${overlay} must be hidden)`);
    const nodes = Array.from({length: degree + 1}, (_, j) => -1 + 2 * j / degree);
    return {types: {point: degree + 1, curve: 2}, curveCount: 2, points: nodes.map(x => [Number(x.toFixed(7)), Number((1 / (1 + 25 * x * x)).toFixed(7))])};
}

// Authored from src/graphs/curves/hermite/HermiteScene.ts (build: the control polygons and handles only with the Bezier overlay; the curve
// always; one data point, one tangent tip and one arrow per point while the tangents are shown; one status text) and the default Hermite preset
// of hermiteModel.ts (tangents m_i, tip at P_i + m_i), not from a capture. The tip of P0 lands on P1.
function hermiteExpectedFor(id, actions) {
    interpolationOps(id, actions, 'hermite', ['set-mode', 'set-rule', 'set-tension', 'set-overlay']);
    assert.equal(onceOp(id, actions, 'hermite', 'set-mode', 'mode'), 'hermite', `${id}: only the Hermite mode (global tangents, the stored defaults) is authored`);
    assert.equal(interpolationOverlay(id, actions, 'hermite', 'tangents'), true, `${id}: the tangents must be shown`);
    assert.equal(interpolationOverlay(id, actions, 'hermite', 'bezier'), false, `${id}: the Bezier overlay must be hidden`);
    const tangents = [[1, 2], [1.5, 1.5], [1.5, -1], [1, -3]];
    const tips = INTERPOLATION_POINTS.map((p, i) => [p[0] + tangents[i][0], p[1] + tangents[i][1]]);
    return {types: {point: 8, curve: 1, arrow: 4, text: 1}, curveCount: 1, points: [...INTERPOLATION_POINTS, ...tips]};
}

// Authored from src/graphs/functions/LeastSquaresGraph.tsx (createScene: a point per datum, the squares only while shown, the dashed residual
// curve whenever a line is drawn, the best-fit functiongraph only without a manual line, the manual functiongraph only with it, which JSXGraph types as a curve; one caption
// caption block, which the card capture hides because its text exceeds the 65 characters capture-demonstration-previews.cjs allows) and DEFAULT_LEAST_SQUARES_POINTS of leastSquaresModel.ts, not from a capture.
function leastSquaresExpectedFor(id, actions) {
    interpolationOps(id, actions, 'lsq', ['set-degree', 'set-line', 'set-mode', 'set-overlay']);
    assert.equal(onceOp(id, actions, 'lsq', 'set-mode', 'mode'), 'manual', `${id}: only the manual line is authored`);
    assert.equal(onceOp(id, actions, 'lsq', 'set-degree', 'value'), 1, `${id}: only degree 1 is authored`);
    const line = actions.filter(item => item.kind === 'lsq' && item.operation === 'set-line');
    assert.ok(line.length === 1 && line[0].slope === 0 && line[0].intercept === 2, `${id}: only the horizontal manual line y = 2 is authored`);
    for (const overlay of ['squares', 'normal-equations']) assert.equal(interpolationOverlay(id, actions, 'lsq', overlay), false, `${id}: ${overlay} must be hidden`);
    return {types: {point: 4, curve: 2}, curveCount: 2, points: [[0, 1], [1, 2], [2, 2], [3, 4]]};
}

// Authored from src/graphs/curves/subdivisionCurves/SubdivisionScene.ts (build: the limit curve only while shown with Chaikin; the original
// polygon and the current stage always; one pooled vertex per stage vertex, which at round 0 are the four data points again; one data point per
// vertex; one status text), not from a capture.
function subdivisionExpectedFor(id, actions) {
    interpolationOps(id, actions, 'subdivision', ['set-rule', 'set-closed', 'set-overlay']);
    assert.equal(onceOp(id, actions, 'subdivision', 'set-rule', 'rule'), 'chaikin', `${id}: only the Chaikin rule is authored`);
    assert.equal(onceOp(id, actions, 'subdivision', 'set-closed', 'closed'), false, `${id}: only the open polygon is authored`);
    assert.equal(interpolationOverlay(id, actions, 'subdivision', 'limit'), false, `${id}: the limit overlay must be hidden`);
    return {types: {point: 8, curve: 2, text: 1}, curveCount: 2, points: [...INTERPOLATION_POINTS, ...INTERPOLATION_POINTS]};
}

/** First-frame expectation of an Interpolation lesson (the five sections of the chapter, keyed by the section in the example id). */
function interpolationExpectedFor(id, step) {
    const bySection = {lagrange: lagrangeExpectedFor, runge: rungeExpectedFor, hermite: hermiteExpectedFor, 'least-squares': leastSquaresExpectedFor, subdivision: subdivisionExpectedFor};
    const section = id.split('.')[1];
    const author = Object.hasOwn(bySection, section) ? bySection[section] : undefined;
    assert.ok(author, `${id}: no authored Interpolation first frame`);
    return author(id, step.scene.actions);
}

// ---- Probability chapter (probability): five lessons, keyed by the section in the example id.

/** Whether the opening scene sets `target` visible or hidden; it must be set exactly once. */
function probabilityVisibility(id, actions, target) {
    const found = actions.filter(item => item.kind === 'function-visibility' && item.target === target);
    assert.equal(found.length, 1, `${id}: opening scene must set the ${target} visibility exactly once`);
    return found[0].visible;
}

// Authored from src/graphs/functions/DensityAreaGraph.tsx (createScene: the shaded area as one curve, the density as one functiongraph, which JSXGraph types as a curve,
// and the two ends a and b as points on the x-axis; the three caption lines are one caption block, which BaseFunctionGraph.caption creates as one JSXGraph text) and DEFAULT_DENSITY_AREA_MODEL of
// densityAreaModel.ts (mu 0, sigma 1), not from a capture. The ends are the a and b the opening scene sets.
function densityExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^density-example$/], ['function-parameter', /^density-[ab]$/]], 'probabilityExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'density-example'), 'standard', `${id}: only the standard normal example is authored`);
    const [a, b] = ['a', 'b'].map(name => sceneValue(id, actions, 'function-parameter', `density-${name}`));
    assert.ok(Number.isFinite(a) && Number.isFinite(b), `${id}: the bounds must be finite`);
    return {types: {curve: 2, point: 2, text: 1}, curveCount: 2, points: [[a, 0], [b, 0]]};
}

// Authored from src/graphs/functions/BinomialNormalGraph.tsx (createScene: the shaded bars of P(X <= k), the normal area, the bar outline and the normal density are four
// curves; the Poisson bars are a fifth curve that stays empty and so invisible while the overlay is off; the point k on the axis; the caption is one block, one JSXGraph text) and
// BINOMIAL_NORMAL_EXAMPLES of binomialNormalModel.ts (fair20 is B(20, 1/2)), not from a capture. The point k sits at (k, 0).
function binomialExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^binomial-normal-example$/], ['function-parameter', /^binomial-k$/]], 'probabilityExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'binomial-normal-example'), 'fair20', `${id}: only the fair20 example is authored`);
    const k = sceneValue(id, actions, 'function-parameter', 'binomial-k');
    assert.ok(Number.isInteger(k) && k >= 0 && k <= 20, `${id}: k must be a whole number from 0 to n = 20`);
    return {types: {curve: 4, point: 1, text: 1}, curveCount: 4, points: [[k, 0]]};
}

// Authored from src/graphs/functions/CltGraph.tsx (createScene: the dashed standard normal and the standardized sum are two curves; no point; the
// caption is one block, one JSXGraph text, which the card capture hides because the text of its two lines (title with n and the Kolmogorov distance line, about 100
// characters in Slovenian) exceeds the 65 characters capture-demonstration-previews.cjs allows, so no text is expected; the density, binomial and correlation captions stay under it) and CLT_EXAMPLES of cltModel.ts (uniform is the default, n = 1, CDF hidden), not from a capture. The scene is deterministic: no random sampling.
// No point is drawn, so the one authored curve is the dashed standard normal: its data run over CLT_WINDOW = [-6, 6] in steps of CLT_NORMAL_STEP = 0.02 and a JSXGraph
// data curve interpolates linearly in the index, so t = 0, 0.5, 1 gives the first two grid abscissas -6, -5.99, -5.98 with the density 6e-9, 1e-8, 2e-8, which rounds to 0 at 6 decimals.
function cltExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-choice', /^clt-example$/]], 'probabilityExpectedFor');
    assert.equal(sceneValue(id, actions, 'function-choice', 'clt-example'), 'uniform', `${id}: only the uniform example (n = 1, density) is authored`);
    return {types: {curve: 2}, curveCount: 2, points: [], curves: [[[-6, 0], [-5.99, 0], [-5.98, 0]]]};
}

// Authored from src/graphs/functions/SummaryStatisticsGraph.tsx (createScene: the sigma band, the box plot and the fences are curves that are visible only while shown;
// the outlier diamonds only with the box plot; the mean triangle and the median square each with a text, and the caption block is a third text; one draggable dot per value, tied values stacking up by
// SUMMARY_STACK_STEP = 0.35) and DEFAULT_SUMMARY_MODEL of summaryStatisticsModel.ts (the school data 4, 5, 5, 6, 6, 7, 8), not from a capture. The mean 41/7 sits at height
// MEAN_Y = -0.5 and the median 6 at MEDIAN_Y = -0.95.
function summaryExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-visibility', /^summary-(box-plot|sigma-band)$/]], 'probabilityExpectedFor');
    for (const target of ['summary-box-plot', 'summary-sigma-band']) {
        assert.equal(probabilityVisibility(id, actions, target), false, `${id}: only the plain dots and markers are authored (${target} must be hidden)`);
    }
    const values = [4, 5, 5, 6, 6, 7, 8];
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const stack = values.map((value, index) => [value, Number((0.35 * values.slice(0, index).filter(other => other === value).length).toFixed(7))]);
    return {types: {point: 2 + values.length, text: 3}, curveCount: 0, points: [[Number(mean.toFixed(7)), -0.5], [6, -0.95], ...stack]};
}

// Authored from src/graphs/functions/CorrelationGraph.tsx (createScene: the residual curve only while residuals are shown, the line of y on x as one curve with a text label,
// the line of x on y only while shown; one draggable point per data point; the caption is one block, a second text) and CORRELATION_EXAMPLES.default of correlationModel.ts, not from a capture.
function correlationExpectedFor(id, actions) {
    assertOnlyActions(id, actions, [['function-visibility', /^correlation-(residuals|x-on-y)$/]], 'probabilityExpectedFor');
    for (const target of ['correlation-residuals', 'correlation-x-on-y']) {
        assert.equal(probabilityVisibility(id, actions, target), false, `${id}: only the plain scatter with the line of y on x is authored (${target} must be hidden)`);
    }
    return {types: {point: 4, curve: 1, text: 2}, curveCount: 1, points: [[0, 1], [1, 2], [2, 2], [3, 4]]};
}

/** First-frame expectation of a Probability lesson (the five sections of the chapter, keyed by the section in the example id). */
function probabilityExpectedFor(id, step) {
    const bySection = {density: densityExpectedFor, 'binomial-normal': binomialExpectedFor, clt: cltExpectedFor, summary: summaryExpectedFor, correlation: correlationExpectedFor};
    const section = id.split('.')[1];
    const author = Object.hasOwn(bySection, section) ? bySection[section] : undefined;
    assert.ok(author, `${id}: no authored Probability first frame`);
    return author(id, step.scene.actions);
}

// ---- B-splines chapter (b-splines): six lessons, keyed by the section in the example id. Every scene is a `lesson-fixture` scene: the curve fixture is
// the whole opening scene, plus the few actions each section allows. Nothing is random.

/** The opening scene's fixture; it must be the one the expectation was authored for. */
function bsplineFixture(id, step, degree, knots, points) {
    const prepared = step.scene.actions.find(item => item.kind === 'prepared-scene');
    const curve = prepared && prepared.curve;
    assert.ok(curve, `${id}: the opening scene must be a lesson-fixture scene`);
    assert.deepEqual([curve.degree, curve.knots, curve.points], [degree, knots, points], `${id}: only the authored degree, knot vector and control points are expected`);
    return curve;
}

const BSPLINE_QUADRATIC = [2, [0, 0, 0, 1, 2, 2, 2], [[0, 0], [1, 2], [3, 2], [4, 0]]];

// Authored from src/graphs/curves/bspline/BSplineBasisScene.ts (build: one curve per basis function, 5 - 1 - 1 = 3 for the knots (0,0,1,2,2) of degree 1; one segment from the
// slider foot to the top, whose two end points are invisible; one dot per function at the slider t, heights N0 = 0, N1 = 1, N2 = 0 at t = 1; one diamond marker per knot at
// (knot, -0.1) with repeated knots stacking down by 0.07; a value text under the first marker of each run of equal knots (0, 1, 2), a domain note under 65 characters, and the
// readout, a fifth text that the first-frame check sees at 5 but that the presentation step then hides for exceeding 65 characters, leaving 4; the check runs on both, so no text count is
// asserted). The view is not normalized by default.
function bsplineBasisExpectedFor(id, step) {
    assertOnlyActions(id, step.scene.actions, [['parameter', /^t$/]], 'bsplineBasisExpectedFor');
    bsplineFixture(id, step, 1, [0, 0, 1, 2, 2], [[0, 0], [1, 0], [2, 0]]);
    assert.equal(sceneValue(id, step.scene.actions, 'parameter', 't'), 1, `${id}: only the slider at t = 1 is authored`);
    return {types: {curve: 3, point: 8, segment: 1}, curveCount: 3,
        points: [[1, 0], [1, 1], [0, -0.1], [0, -0.17], [1, -0.1], [2, -0.1], [2, -0.17]]};
}

// Authored from src/graphs/curves/bspline/DeBoorScene.ts (build: at level r there are k + 1 - r points, so degree 2 gives three rings at level 0, the active control points of the span
// [u2, u3), and two segments between them; the higher levels only once revealed; the readout text is seen by the first-frame check but hidden by the presentation step, so no text count is asserted) and the curve layer of JXGBSplineCurve (the curve and its four control
// points; the control polygon and hull are not shown), not from a capture. The opening scene reveals no level: the lesson has no next-step action. A first draft counted four rings and three segments.
function bsplineDeBoorExpectedFor(id, step) {
    assertOnlyActions(id, step.scene.actions, [['parameter', /^t$/]], 'bsplineDeBoorExpectedFor');
    const [degree, knots, points] = BSPLINE_QUADRATIC;
    bsplineFixture(id, step, degree, knots, points);
    assert.equal(sceneValue(id, step.scene.actions, 'parameter', 't'), 0.5, `${id}: only the slider at t = 1/2 is authored`);
    return {types: {curve: 1, point: 7, segment: 2}, curveCount: 1, points};
}

// Authored from src/graphs/curves/bspline/BSplineInsertionScene.ts (build: no ghost before an insertion; the comb adds the teeth and the envelope as two curves while shown) and
// the curve layer of JXGBSplineCurve (the curve and its four control points), not from a capture. The opening scene shows the comb and inserts no knot.
function bsplineInsertionExpectedFor(id, step) {
    assertOnlyActions(id, step.scene.actions, [['knot-insertion', /^$/]], 'bsplineInsertionExpectedFor');
    const [degree, knots, points] = BSPLINE_QUADRATIC;
    bsplineFixture(id, step, degree, knots, points);
    const operations = step.scene.actions.filter(item => item.kind === 'knot-insertion');
    assert.deepEqual(operations.map(item => [item.operation, item.visible]), [['set-comb', true]], `${id}: only the comb shown, with no knot inserted, is authored`);
    return {types: {curve: 3, point: 4}, curveCount: 3, points};
}

// Authored from src/graphs/curves/bspline/BSplineExtractionScene.ts (build: per piece one dashed Bezier polygon curve and one Bezier curve; the knots (0,0,0,1,2,2,2) of degree 2 have
// two distinct spans, so two pieces) and the curve layer of JXGBSplineCurve (the curve under the pieces and its four control points), not from a capture.
function bsplineExtractionExpectedFor(id, step) {
    assertOnlyActions(id, step.scene.actions, [], 'bsplineExtractionExpectedFor');
    const [degree, knots, points] = BSPLINE_QUADRATIC;
    bsplineFixture(id, step, degree, knots, points);
    return {types: {curve: 5, point: 4}, curveCount: 5, points};
}

// Authored from src/graphs/curves/bspline/BSplineNurbsScene.ts (build: the dashed unit circle while shown, the marker at C(t) for the default t = 1/16) and the curve layer of JXGBSplineCurve
// (the curve and its nine control points, the first and last both at (1, 0)), not from a capture.
function bsplineNurbsExpectedFor(id, step) {
    assertOnlyActions(id, step.scene.actions, [], 'bsplineNurbsExpectedFor');
    const prepared = step.scene.actions.find(item => item.kind === 'prepared-scene');
    const circle = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
    bsplineFixture(id, step, 2, [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1], circle);
    assert.deepEqual(prepared.curve.weights, [1, 1, 1, 1, 1, 1, 1, 1, 1], `${id}: only the unit weights are authored`);
    return {types: {curve: 2, point: 10}, curveCount: 2, points: circle.slice(0, 8)};
}

// Authored from src/graphs/curves/bspline/BSplineBlossomScene.ts (build: the Bezier markers and their polygon only while shown; the triangle of the arguments (0, 1) for degree 2 as 2 + 1
// points and one segment; one label text f(0;1), under 65 characters) and the curve layer of JXGBSplineCurve (the curve and its four control points), not from a capture.
function bsplineBlossomExpectedFor(id, step) {
    assertOnlyActions(id, step.scene.actions, [['blossom', /^$/]], 'bsplineBlossomExpectedFor');
    const [degree, knots, points] = BSPLINE_QUADRATIC;
    bsplineFixture(id, step, degree, knots, points);
    const operations = step.scene.actions.filter(item => item.kind === 'blossom');
    assert.deepEqual(operations.map(item => [item.operation, item.visible ?? item.args]), [['set-bezier', false], ['set-args', [0, 1]]], `${id}: only the hidden Bezier points and the arguments (0, 1) are authored`);
    return {types: {curve: 1, point: 7, segment: 1, text: 1}, curveCount: 1, points};
}

/** First-frame expectation of a B-splines lesson (the six sections of the chapter, keyed by the section in the example id). */
function bsplineExpectedFor(id, step) {
    const bySection = {'bspline-basis': bsplineBasisExpectedFor, 'bspline-deboor': bsplineDeBoorExpectedFor, 'bspline-insertion': bsplineInsertionExpectedFor,
        'bspline-extraction': bsplineExtractionExpectedFor, 'bspline-nurbs': bsplineNurbsExpectedFor, 'bspline-blossom': bsplineBlossomExpectedFor};
    const section = id.split('.')[1];
    const author = Object.hasOwn(bySection, section) ? bySection[section] : undefined;
    assert.ok(author, `${id}: no authored B-spline first frame`);
    return author(id, step);
}

/** Fails unless the examples cover exactly the family's registered Demonstration rows, each opening on its registered path. */
function assertFamilyIdentities(chapterId, examples, rows) {
    assert.ok(Array.isArray(rows) && rows.length > 0, `${chapterId}: the registered Demonstration rows are missing`);
    const registered = new Map(rows.map(row => [row.id, row.path]));
    for (const example of examples) {
        assert.ok(registered.has(example.demonstrationId), `${example.id}: ${example.demonstrationId} is not a registered ${chapterId} Demonstration`);
        assert.equal(new URL(example.path, 'https://bezeg.invalid').pathname, registered.get(example.demonstrationId), `${example.id}: the example does not open on the registered route`);
    }
    for (const id of registered.keys()) assert.ok(examples.some(example => example.demonstrationId === id), `${chapterId}: registered Demonstration ${id} has no example`);
}

// ---- Phase portraits chapter (phase-portraits): four lessons on two Demonstrations, keyed by the section in the example id. The first scene of each is the Demonstration default
// plus the `phase` actions below; nothing is random.

/** The `phase` actions of an opening scene by operation: only the operations the authored frame allows. */
function phaseActions(id, step, allowed) {
    const actions = step.scene.actions;
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    // The lesson's own scene actions repeat the prepared scene that the adapter also puts first, so two of the same default scene are expected, and applying it twice changes nothing.
    assert.ok(prepared.length >= 1 && prepared.length <= 2 && actions[0].kind === 'prepared-scene', `${id}: the opening scene must start with its prepared scene`);
    assert.ok(prepared.every(item => item.source === 'demonstration-default' && item.sceneId === prepared[0].sceneId), `${id}: the authored frame starts from the Demonstration default`);
    const phase = actions.filter(item => item.kind === 'phase');
    assert.equal(actions.length, prepared.length + phase.length, `${id}: the authored first-frame expectation assumes an opening scene of phase actions only; extend phasePortraitsExpectedFor`);
    for (const item of phase) assert.ok(allowed.includes(item.operation), `${id}: operation ${item.operation} is not authored; extend phasePortraitsExpectedFor`);
    return Object.fromEntries(phase.map(item => [item.operation, item]));
}

function assertMatrix(id, action, entries, text) {
    assert.deepEqual(['A', 'B', 'C', 'D'].map(key => action?.[key]), entries, `${id}: only the matrix ${text} (stored quarter units) is authored`);
}

function assertSeeds(id, action, seeds) {
    assert.deepEqual(action?.seeds, seeds, `${id}: only the seeds ${JSON.stringify(seeds)} (stored units, seed = value / 20) are authored`);
}

// Authored from src/graphs/dynamics/PhasePortraitGraph.tsx (buildScene) and src/dynamics/phaseModel.ts, not from a capture. Linear system, zoom 0 (view [-4, 4]^2, centre (0, 0)), one seed.
// Visible curves: the frame, the backward and the forward orbit of the seed (the separatrix, wrap and ring curves show for a nonlinear system only). Points: the equilibrium at the
// origin, the moving square at time 0 on the seed (1, 0), the seed handle (1, 0), and the two matrix-column handles (the images of (1,0) and (0,1), the columns (A, C) and (B, D)),
// each with a segment from the origin, all inside the view. Eigen-direction lines: one per real eigen-direction. The texts (legend rows, captions) are left unasserted: the capture hides
// any over 65 characters after the first-frame check.
function phaseLinearFrame(columns, lines) {
    return {types: {curve: 3, line: lines, point: 5, segment: 2}, curveCount: 3, points: [[0, 0], [1, 0], ...columns]};
}

/** PP1 opens on E = (4 1; 2 3) with the seed (1, 0); E has the eigenvalues 2 and 5 with the eigenvectors (1, -2) and (1, 1): two lines. */
function phaseLinearSystemExpectedFor(id, step) {
    const actions = phaseActions(id, step, ['set-system', 'set-matrix', 'set-seeds']);
    assert.equal(actions['set-system']?.system, 'linear', `${id}: only the linear system is authored`);
    assertMatrix(id, actions['set-matrix'], [16, 4, 8, 12], 'E = (4 1; 2 3)');
    assertSeeds(id, actions['set-seeds'], [{X: 20, Y: 0}]);
    return phaseLinearFrame([[4, 2], [1, 3]], 2);
}

/** PP2 opens on the linear centre (0 1; -1 0), the linearization of the pendulum, with the seed (1, 0): eigenvalues +-i, no real eigen-direction. */
function phasePendulumExpectedFor(id, step) {
    const actions = phaseActions(id, step, ['set-system', 'set-matrix', 'set-seeds']);
    assert.equal(actions['set-system']?.system, 'linear', `${id}: only the linear centre is authored`);
    assertMatrix(id, actions['set-matrix'], [0, 4, -4, 0], '(0 1; -1 0)');
    assertSeeds(id, actions['set-seeds'], [{X: 20, Y: 0}]);
    return phaseLinearFrame([[0, -1], [1, 0]], 0);
}

/** PP3 opens on the Demonstration default: the linear system -E = (-4 -1; -2 -3), the stable node, with the seed (1, 0): the same two eigen-directions as E, the columns (-4, -2) and (-1, -3). */
function phaseLinearizationExpectedFor(id, step) {
    const actions = phaseActions(id, step, []);
    assert.deepEqual(Object.keys(actions), [], `${id}: the opening is the Demonstration default (N = -E, seed (1, 0)) with no phase action`);
    return phaseLinearFrame([[-4, -2], [-1, -3]], 2);
}

// Authored from src/graphs/dynamics/LogisticMapGraph.tsx (buildScene), not from a capture. Curves: the two panel frames, the diagram, the three marks, the cursor, the map, the diagonal and
// the cobweb. Points: the fixed point 1 - 1/r on the diagonal, the two 2-cycle markers only for r above 3, the iterate marker only after a step, and the start handle on the diagonal.
const logisticIterate = (start, r, steps) => { let x = start; for (let i = 0; i < steps; i++) x = r * x * (1 - x); return x; };

/** PP4 opens at r = 2.9, x0 = 0.2 (the Demonstration default) and 20 cobweb steps. */
function phaseLogisticMapExpectedFor(id, step) {
    const actions = phaseActions(id, step, ['set-r', 'set-step']);
    assert.equal(actions['set-r']?.R, 290, `${id}: only r = 2.9 is authored`);
    assert.equal(actions['set-step']?.step, 20, `${id}: only 20 steps are authored`);
    const fixed = 1 - 1 / 2.9;
    const iterate = logisticIterate(0.2, 2.9, 20);
    return {types: {curve: 7, point: 3}, curveCount: 7, points: [[0.2, 0.2], [fixed, fixed], [iterate, iterate]]};
}

/** PP5 opens at r = 2.9 with the default start and step 0: no iterate marker. */
function phaseBifurcationExpectedFor(id, step) {
    const actions = phaseActions(id, step, ['set-r']);
    assert.equal(actions['set-r']?.R, 290, `${id}: only r = 2.9 is authored`);
    const fixed = 1 - 1 / 2.9;
    return {types: {curve: 7, point: 2}, curveCount: 7, points: [[0.2, 0.2], [fixed, fixed]]};
}

/** First-frame expectation of a phase-portraits lesson (the five sections of the chapter, keyed by the section in the example id). */
function phasePortraitsExpectedFor(id, step) {
    const bySection = {'linear-system': phaseLinearSystemExpectedFor, pendulum: phasePendulumExpectedFor, linearization: phaseLinearizationExpectedFor, 'logistic-map': phaseLogisticMapExpectedFor, bifurcation: phaseBifurcationExpectedFor};
    const section = id.split('.')[1];
    const author = Object.hasOwn(bySection, section) ? bySection[section] : undefined;
    assert.ok(author, `${id}: no authored phase-portraits first frame`);
    return author(id, step);
}

// ---- Trigonometry chapter (trigonometry): four lessons on two Demonstrations, keyed by the section in the example id. The first scene of each is the Demonstration default plus the
// `trig` or `triangle` actions below; nothing is random.

/** Asserts the opening scene is the prepared Demonstration default, then only `kind` actions with an operation in `allowed`; returns them. */
function trigonometryActions(id, step, kind, allowed) {
    const actions = step.scene.actions;
    const prepared = actions.filter(item => item.kind === 'prepared-scene');
    assert.ok(prepared.length >= 1 && prepared.length <= 2 && actions[0].kind === 'prepared-scene', `${id}: the opening scene must start with its prepared scene`);
    assert.ok(prepared.every(item => item.source === 'demonstration-default'), `${id}: the authored frame starts from the Demonstration default`);
    const own = actions.filter(item => item.kind === kind);
    assert.equal(actions.length, prepared.length + own.length, `${id}: the authored first-frame expectation assumes an opening scene of ${kind} actions only; extend trigonometryExpectedFor`);
    for (const item of own) assert.ok(allowed.includes(item.operation), `${id}: operation ${item.operation} is not authored; extend trigonometryExpectedFor`);
    return own;
}

// Authored from src/graphs/trig/UnitCircleGraph.tsx (buildScene), not from a capture. Visible curves: the sine trace and, for a positive angle, the arc highlight (the cosine trace shows only
// with its overlay, off here); one circle; five segments (radius, cosine leg, sine leg, dashed height, dashed link to the unrolled marker), four when the sine is 0 because the zero-length sine leg is not drawn. Points: the handle on the circle and the unrolled
// sine marker at (1.7 + pi * h / 360, sin) for h half-degrees (= 1.7 + the angle in radians); with the symmetries overlay the three mirror images. The second angle, addition overlay and cosine overlay are off.
const unitCircleFrame = (degrees, symmetries) => {
    const radians = degrees * Math.PI / 180;
    const x = Math.cos(radians), y = Math.sin(radians);
    const points = [[x, y], [1.7 + radians, y], ...(symmetries ? [[x, -y], [-x, y], [-x, -y]] : [])];
    const segments = y === 0 ? 4 : 5;
    return {types: {circle: 1, curve: degrees > 0 ? 2 : 1, point: points.length, segment: segments}, curveCount: degrees > 0 ? 2 : 1, points};
};

/** TR1 opens at the angle 0 with no overlay: the point at (1, 0), on the axis. */
function trigRadianExpectedFor(id, step) {
    const own = trigonometryActions(id, step, 'trig', ['set-angle', 'set-overlay']);
    assert.deepEqual(own, [{kind: 'trig', operation: 'set-angle', which: 'first', degrees: 0}], `${id}: only the angle 0 without overlays is authored`);
    return unitCircleFrame(0, false);
}

/** TR2 opens at 30 degrees with the symmetries overlay: the point and its three mirror images. */
function trigAdditionExpectedFor(id, step) {
    const own = trigonometryActions(id, step, 'trig', ['set-angle', 'set-overlay']);
    assert.deepEqual(own, [{kind: 'trig', operation: 'set-angle', which: 'first', degrees: 30}, {kind: 'trig', operation: 'set-overlay', overlay: 'symmetries', on: true}],
        `${id}: only the angle 30 degrees with the symmetries overlay is authored`);
    return unitCircleFrame(30, true);
}

// Authored from src/graphs/trig/TriangleSolverGraph.tsx (buildScene), not from a capture. Sides mode on A = (0, 0), B = (7, 0), C = (2, 4): three vertex handles; three triangle sides;
// the cosine-rule bars (c^2 = 49 against a^2 + b^2 = 41 + 20 = 61 give three bar segments and, as the correction 12 is not zero, the dashed correction): seven segments in all.
// No circle (circle mode only) and no curve. Texts (labels, the correction readout) are left unasserted.
function trigTriangleExpectedFor(id, step) {
    const own = trigonometryActions(id, step, 'triangle', ['set-mode', 'set-vertex']);
    const vertex = name => own.find(item => item.operation === 'set-vertex' && item.vertex === name);
    assert.deepEqual(own.filter(item => item.operation === 'set-mode').map(item => item.mode), ['sides'], `${id}: only the mode sides is authored`);
    assert.deepEqual(['A', 'B', 'C'].map(name => [vertex(name)?.x, vertex(name)?.y]), [[0, 0], [7, 0], [2, 4]], `${id}: only the triangle A = (0, 0), B = (7, 0), C = (2, 4) is authored`);
    return {types: {point: 3, segment: 7, circle: 0}, curveCount: 0, points: [[0, 0], [2, 4], [7, 0]]};
}

/** First-frame expectation of a trigonometry lesson (the four sections of the chapter, keyed by the section in the example id). */
function trigonometryExpectedFor(id, step) {
    const bySection = {'radian-sine-cosine': trigRadianExpectedFor, 'addition-formulas': trigAdditionExpectedFor, 'sine-rule': trigTriangleExpectedFor, 'cosine-rule': trigTriangleExpectedFor};
    const section = id.split('.')[1];
    const author = Object.hasOwn(bySection, section) ? bySection[section] : undefined;
    assert.ok(author, `${id}: no authored trigonometry first frame`);
    return author(id, step);
}

async function generateChapterInventory(chapterId) {
    const config = Object.hasOwn(chapterInventories, chapterId) ? chapterInventories[chapterId] : undefined;
    assert.ok(config, `Unknown chapter-owned chapter "${chapterId}"; supported: ${Object.keys(chapterInventories).join(', ')}`);
    const {createServer} = await import('vite');
    const server = await createServer({configFile: path.join(root, 'vite.config.mts'), server: {middlewareMode: true}, appType: 'custom'});
    try {
        const module = await server.ssrLoadModule(config.module);
        // A catalog-backed chapter exports cheap rows plus `all()`, which adapts every section's lesson on explicit request.
        const exported = module[config.registryExport];
        const registry = config.lessonExport ? Object.fromEntries(Object.keys(exported).map(sectionId => [sectionId, module[config.lessonExport](sectionId)]))
            : typeof exported?.all === 'function' ? exported.all() : exported;
        const pathFor = module[config.pathExport];
        assert.ok(registry && typeof pathFor === 'function', `${chapterId}: registry or path function export is missing`);
        const authoredRecipes = (await server.ssrLoadModule('/src/learning/chapter/guidedExampleHighlights.ts')).guidedExampleHighlightRecipes;
        for (const key of Object.keys(authoredRecipes)) assert.ok(!key.startsWith(`${chapterId}.`), `${key}: highlight recipes are not supported for chapter-owned chapters yet`);
        const examples = Object.entries(registry).map(([sectionId, lesson]) => {
            const id = `${chapterId}.${sectionId}.${lesson.demonstrationId}`;
            const step = lesson.steps[0];
            const record = {id, demonstrationId: lesson.demonstrationId, path: pathFor(sectionId),
                sceneFingerprint: fingerprintFor(lesson.demonstrationId, step), actions: readableActions(step.scene.actions)};
            record.expected = config.expectedFor(id, step);
            assertExpectation(id, record.expected);
            return withRecipe(record, {kind: 'start'});
        });
        assert.ok(examples.length > 0, `${chapterId}: registry has no lessons`);
        if (config.identities) assertFamilyIdentities(chapterId, examples, (await server.ssrLoadModule(config.identities.module))[config.identities.rows]);
        validateInventory(examples);
        return {examples};
    } finally {
        await server.close();
    }
}

async function main() {
    const argv = process.argv.slice(2);
    const chapterIndex = argv.indexOf('--chapter');
    const chapterId = chapterIndex >= 0 ? argv[chapterIndex + 1] : undefined;
    assert.ok(chapterIndex < 0 || (chapterId && !chapterId.startsWith('--')), '--chapter needs a chapter id');
    if (chapterIndex >= 0) argv.splice(chapterIndex, 2);
    const patchMode = argv.includes('--patches');
    assert.ok(!(patchMode && chapterId), 'Choose either --patches or --chapter');
    const args = argv.filter(arg => arg !== '--patches');
    const output = path.resolve(process.cwd(), args[0] || (chapterId ? `docs/reviews/${chapterId}/guided-example-inventory.json`
        : patchMode ? 'docs/reviews/bezier-patches/guided-example-inventory.json' : defaultOutput));
    const inventory = chapterId ? await generateChapterInventory(chapterId) : patchMode ? await generatePatchInventory() : await generateInventory();
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
    process.stdout.write(`Wrote ${inventory.examples.length} ${chapterId ? `${chapterId} chapter-owned` : patchMode ? 'patch' : 'retained'} examples to ${path.relative(process.cwd(), output)}
`);
}

if (require.main === module) main().catch(error => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});

module.exports = {assertFamilyIdentities, resolveRecipe, resolvePatchRecipe, withRecipe, fingerprintFor, readableActions, expectedFor, generateInventory, generatePatchInventory, generateChapterInventory, chapterInventories, advancedBezierExpectedFor, coonsNetRows, coonsBoundaries, linearMapsExpectedFor, complexMapsExpectedFor, numericalExpectedFor, schoolFunctionGraphsExpectedFor, fourierExpectedFor, fourierCoefficientsExpectedFor, epicyclesExpectedFor, projectiveConicsExpectedFor, curveGeometryExpectedFor, convexityExpectedFor, triangulationExpectedFor, sweepExpectedFor, triangleGeometryExpectedFor, interpolationExpectedFor, probabilityExpectedFor, bsplineExpectedFor, phasePortraitsExpectedFor, trigonometryExpectedFor, assertExpectation};
