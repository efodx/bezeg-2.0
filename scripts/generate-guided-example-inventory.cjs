#!/usr/bin/env node
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {validateInventory} = require('./guided-example-preview-api.cjs');

const root = path.resolve(__dirname, '..');
const defaultOutput = 'docs/reviews/illustrated-chapter-examples/capture-inventory.json';
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

async function generateInventory() {
    const {createServer} = await import('vite');
    const server = await createServer({configFile: path.join(root, 'vite.config.mts'), server: {middlewareMode: true}, appType: 'custom'});
    try {
        const registry = await server.ssrLoadModule('/src/learning/chapter/guidedExamples.ts');
        const homesModule = await server.ssrLoadModule('/src/learning/chapter/retainedExamples.ts');
        const homes = homesModule.retainedExampleHomes;
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
            const record = {id, demonstrationId, path: canonicalPath, sceneFingerprint: fingerprintFor(demonstrationId, step), actions: readableActions(step.scene.actions)};
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

async function main() {
    const output = path.resolve(process.cwd(), process.argv[2] || defaultOutput);
    const inventory = await generateInventory();
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
    process.stdout.write(`Wrote ${inventory.examples.length} retained examples to ${path.relative(process.cwd(), output)}\n`);
}

if (require.main === module) main().catch(error => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});

module.exports = {fingerprintFor, readableActions, expectedFor, generateInventory};
