#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {validateControlStep} = require('./guided-example-control-steps.cjs');
const {validateInventory, validateRecipe, recipeFingerprint} = require('./guided-example-preview-api.cjs');
const {generatePatchGuidedExampleInventory} = require('./patch-guided-example-expectations.cjs');

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
};

// Authored from src/linear/matrix2.ts (rows of the example matrices) and src/graphs/linear/linearMapScene.ts, not from a capture.
const linearMapExampleMatrices = {identity: [[1, 0], [0, 1]], 'basis-default': [[2, -1], [1, 1]]};

/**
 * First-frame expectation of a Linear maps lesson: eight curves (source and image grid, source and image square, two
 * control polygons, the fixture Bezier curve and its image) and eight points (e1, e2, O, A(e1+e2), p, Ap, a1, a2).
 */
function linearMapsExpectedFor(id, step) {
    const actions = step.scene.actions;
    const examples = actions.filter(item => item.kind === 'linear-map' && item.operation === 'set-example');
    assert.equal(examples.length, 1, `${id}: opening scene must name exactly one linear-map example`);
    const matrix = linearMapExampleMatrices[examples[0].exampleId];
    assert.ok(matrix, `${id}: no authored matrix for example ${JSON.stringify(examples[0].exampleId)}`);
    assert.ok(actions.every(item => !(item.kind === 'linear-map' && item.operation === 'set-matrix')),
        `${id}: opening scene must not override the example matrix`);
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

/** A chapter-owned entry must carry real expectations; a missing or empty one is a generation error. */
function assertExpectation(id, expected) {
    assert.ok(expected && typeof expected === 'object', `${id}: chapter-owned example needs authored expected checks`);
    assert.ok(expected.types && Object.keys(expected.types).length > 0, `${id}: expected.types must be nonempty`);
    assert.ok(Number.isInteger(expected.curveCount) && expected.curveCount > 0, `${id}: expected.curveCount must be a positive integer`);
    assert.ok(Array.isArray(expected.points) && expected.points.length > 0, `${id}: expected.points must be nonempty`);
}

async function generateChapterInventory(chapterId) {
    const config = Object.hasOwn(chapterInventories, chapterId) ? chapterInventories[chapterId] : undefined;
    assert.ok(config, `Unknown chapter-owned chapter "${chapterId}"; supported: ${Object.keys(chapterInventories).join(', ')}`);
    const {createServer} = await import('vite');
    const server = await createServer({configFile: path.join(root, 'vite.config.mts'), server: {middlewareMode: true}, appType: 'custom'});
    try {
        const module = await server.ssrLoadModule(config.module);
        const registry = module[config.registryExport];
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

module.exports = {resolveRecipe, resolvePatchRecipe, withRecipe, fingerprintFor, readableActions, expectedFor, generateInventory, generatePatchInventory, generateChapterInventory, chapterInventories, linearMapsExpectedFor, complexMapsExpectedFor, assertExpectation};
