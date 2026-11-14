'use strict';
// Capture-text policy (C1): docs/specs/site-walkthrough-graphs-and-captures.md. The in-page function runs here on a jsdom DOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {recipes, validateRecipes, foreignLetterRuns} = require('./demonstration-preview-recipes.cjs');
const {applyCaptureText, captureTextPolicy, serializableRecipe, presentBoard} = require('./capture-demonstration-previews.cjs');
const catalog = require('../tests/smoke-catalog.cjs');

const pattern = regexp => ({source: regexp.source, flags: regexp.flags});
const policy = (keep, strip = []) => ({keep: keep.map(pattern), strip: strip.map(pattern)});

function dom(html) {
    const document = new JSDOM(`<body>${html}</body>`).window.document;
    return [...document.body.children].map(rendNode => ({rendNode}));
}
const shown = node => node.style.display !== 'none';

const captionHtml = '<div class="JXGtext"><div>Korelacija 4 točk</div><div>Korelacijski koeficient r = 0,8468</div></div>';

test('only the three pilot recipes carry text, the others keep their annotation and no policy', () => {
    const withText = Object.values(recipes).filter(recipe => recipe.text).map(recipe => recipe.id).sort();
    assert.deepEqual(withText, ['curve-envelope', 'interp-subdivision', 'prob-correlation']);
    for (const id of withText) assert.equal(recipes[id].annotations, 'capture-text-policy');
    assert.equal(recipes.bezier.annotations, 'hide-point-names-retain-concept-text');
    assert.equal(captureTextPolicy(recipes.bezier), undefined);
    assert.equal(serializableRecipe(recipes.bezier), recipes.bezier);
    // validateRecipes' own shape check for text, on a registry that skips the (separately failing) exhaustiveness check.
    assert.throws(() => validateRecipes(catalog, {...recipes, bezier: {...recipes.bezier, text: {keep: ['x'], strip: []}}}), /exhaustively|text needs RegExp/);
});

test('presentBoard passes no text policy for a recipe without text (the 65-character rule stays) and a plain-record one with it', async () => {
    const seen = {};
    const locator = id => ({evaluate: async (fn, options) => { seen[id] = options; return {}; }});
    for (const id of ['bezier', 'prob-correlation']) await presentBoard(locator(id), catalog.find(d => d.id === id), recipes[id]);
    assert.equal(seen.bezier.text, undefined);
    assert.deepEqual(seen['prob-correlation'].text.keep.map(p => Object.keys(p).sort()), [['flags', 'source']]);
    assert.equal(JSON.parse(JSON.stringify(seen['prob-correlation'].text)).keep[0].source, recipes['prob-correlation'].text.keep[0].source);
});

test('an empty keep list hides every text object and its recorded strings', () => {
    const objects = dom('<div>Število premic</div><div>t = 0,5</div>');
    const result = applyCaptureText(objects, policy([]));
    assert.ok(objects.every(object => !shown(object.rendNode)));
    assert.deepEqual(result.textHidden, ['Število premic', 't = 0,5']);
    assert.deepEqual(result.textKept, []);
});

test('a caption is judged line by line: the matching line stays, the others go, the object stays shown', () => {
    const [object] = dom(captionHtml);
    const result = applyCaptureText([object], policy([/\br = /]));
    const [title, readout] = object.rendNode.children;
    assert.equal(shown(object.rendNode), true);
    assert.equal(shown(title), false);
    assert.equal(shown(readout), true);
    assert.deepEqual(result.textKept, ['Korelacijski koeficient r = 0,8468']);
    assert.deepEqual(result.textHidden, ['Korelacija 4 točk']);
});

test('a caption with no kept line is hidden whole, plate included', () => {
    const [object] = dom(captionHtml);
    applyCaptureText([object], policy([/^nič$/]));
    assert.equal(shown(object.rendNode), false);
});

test('strip removes the leading words from a kept plain-text line', () => {
    const [object] = dom(captionHtml);
    const result = applyCaptureText([object], policy([/\br = /], [/^Korelacijski koeficient /]));
    assert.equal(object.rendNode.children[1].textContent, 'r = 0,8468');
    assert.deepEqual(result.textKept, ['r = 0,8468']);
});

test('re-application is idempotent and survives JSXGraph rewriting the text', () => {
    const [object] = dom(captionHtml);
    const rule = policy([/\br = /], [/^Korelacijski koeficient /]);
    const first = applyCaptureText([object], rule);
    assert.deepEqual(applyCaptureText([object], rule), first);
    const once = object.rendNode.outerHTML;
    applyCaptureText([object], rule);
    assert.equal(object.rendNode.outerHTML, once);
    // JSXGraph rewrites the lines on update: the new text is hidden and stripped again, the number follows the app.
    object.rendNode.children[1].textContent = 'Korelacijski koeficient r = 0,5';
    object.rendNode.children[0].textContent = 'Korelacija 5 točk';
    applyCaptureText([object], rule);
    assert.equal(object.rendNode.children[1].textContent, 'r = 0,5');
    assert.equal(shown(object.rendNode.children[0]), false);
    assert.equal(shown(object.rendNode.children[1]), true);
});

test('a line that starts matching again is shown again', () => {
    const [object] = dom('<div>plain</div>');
    applyCaptureText([object], policy([]));
    assert.equal(shown(object.rendNode), false);
    applyCaptureText([object], policy([/plain/]));
    assert.equal(shown(object.rendNode), true);
});

test('C3: kept capture text carries no run of three letters apart from mathematical names', () => {
    assert.deepEqual(foreignLetterRuns('r = 0,8468'), []);
    assert.deepEqual(foreignLetterRuns('f(x) = sin(t) + max(Re z, Im z) - arg z'), []);
    assert.deepEqual(foreignLetterRuns('Korelacijski koeficient r = 0,8'), ['Korelacijski', 'koeficient']);
    assert.deepEqual(foreignLetterRuns('sinus x'), ['sinus']);
    const manifest = require('./demonstration-previews/manifest.json');
    for (const capture of manifest.captures) {
        if (!recipes[capture.id]?.text) continue;
        // A capture stored before the policy existed has no textKept yet; the next recapture adds it and is then checked.
        for (const text of capture.textKept || []) assert.deepEqual(foreignLetterRuns(text), [], `${capture.id}: kept text "${text}"`);
    }
    // Unnamed board text such as "0,0" is only ever hidden evidence, never checked.
    assert.deepEqual(foreignLetterRuns('0,0'), []);
});
