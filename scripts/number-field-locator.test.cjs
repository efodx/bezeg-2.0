const test = require('node:test');
const assert = require('node:assert/strict');
const {numberFieldLocator} = require('./number-field-locator.cjs');

const pageWith = fieldCount => {
    const seen = [];
    return {seen, getByRole: (role, options) => (seen.push({role, options}), {count: async () => fieldCount, id: 'field'})};
};

test('a Slider label resolves to its exact field named "<label>, vrednost" or "<label>, value"', async () => {
    const page = pageWith(1);
    const located = await numberFieldLocator(page, 'Točka x', 'fallback');
    assert.equal(located.id, 'field');
    const {role, options} = page.seen[0];
    assert.equal(role, 'spinbutton');
    assert.ok(options.name.test('Točka x, vrednost') && options.name.test('Točka x, value'));
    assert.ok(!options.name.test('Točka x') && !options.name.test('Točka xy, vrednost'));
});

test('regex characters in a label are matched literally', async () => {
    const page = pageWith(1);
    await numberFieldLocator(page, 'Lega točke P (t, stopinje)', 'fallback');
    const {name} = page.seen[0].options;
    assert.ok(name.test('Lega točke P (t, stopinje), vrednost'));
    assert.ok(!name.test('Lega točke P t, stopinje, vrednost'));
});

test('a label without a Slider field keeps the recipe locator', async () => {
    assert.equal(await numberFieldLocator(pageWith(0), 'P, y', 'fallback'), 'fallback');
});
