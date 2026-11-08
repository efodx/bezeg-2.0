'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {removedTokens, findStaleReferences, formatWarning} = require('./selector-removal-check.cjs');

// The phase 0 failure: 97d22db4 removed PointCoordinateEditor, tests/*.cjs still waited for its class.
const DIFF = [
    'diff --git a/src/ui/PointCoordinateEditor.tsx b/src/ui/PointCoordinateEditor.tsx',
    '--- a/src/ui/PointCoordinateEditor.tsx',
    '+++ b/src/ui/PointCoordinateEditor.tsx',
    '@@ -3,2 +3,0 @@',
    '-    return <div className="point-coordinate-editor point-row" data-testid="coords"><input aria-label="Koordinata x" /></div>;',
    'diff --git a/src/ui/app.css b/src/ui/app.css',
    '--- a/src/ui/app.css',
    '+++ b/src/ui/app.css',
    '@@ -9,1 +9,0 @@',
    '-.point-coordinate-editor .field { color: red; }',
].join('\n');

const fixtureFind = ({src = [], tests = []}) => async (pattern, scope) => {
    const lines = scope === 'src' ? src : tests;
    return lines.map((text, index) => ({text, file: `${scope}/f.cjs`, line: index + 1})).filter(entry => new RegExp(pattern).test(entry.text));
};

test('removedTokens reads classes, data attributes and aria-label values from removed lines only', () => {
    const tokens = removedTokens(`${DIFF}\n+    <div className="added-class" data-added="1" />`).map(({kind, token}) => `${kind}:${token}`);
    assert.deepEqual(tokens.sort(), ['aria:Koordinata x', 'class:field', 'class:point-coordinate-editor', 'class:point-row', 'data:data-testid']);
});

test('a removed class that a smoke spec still references produces a warning naming token, removing file and test line', async () => {
    const stale = await findStaleReferences(DIFF, fixtureFind({
        src: ['.other { }'],
        tests: ['await page.waitForSelector("x");', "await page.locator('.point-coordinate-editor').waitFor();"],
    }));
    const warning = formatWarning(stale);
    assert.match(warning, /CSS class \.point-coordinate-editor was removed in src\/ui\/PointCoordinateEditor\.tsx but tests\/ still references it at tests\/f\.cjs:2/);
    assert.equal(stale.length, 1);
});

test('no warning when the token still exists elsewhere in src, or no test references it', async () => {
    const stillThere = await findStaleReferences(DIFF, fixtureFind({
        src: ['<section className="point-coordinate-editor wide">'],
        tests: ["page.locator('.point-coordinate-editor')"],
    }));
    assert.deepEqual(stillThere, []);
    assert.deepEqual(await findStaleReferences(DIFF, fixtureFind({src: [], tests: ["page.locator('.point-coordinate-editor-ish')"]})), []);
});

test('a removed aria-label and data attribute are matched in tests', async () => {
    const stale = await findStaleReferences(DIFF, fixtureFind({tests: ["getByLabel('Koordinata x')", '[data-testid="coords"]']}));
    assert.deepEqual(stale.map(entry => entry.token).sort(), ['Koordinata x', 'data-testid']);
});
