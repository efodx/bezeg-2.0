'use strict';
// Board pucks (task 08): a converted graph's range, count, choice and toggle controls live in `.puck-strip`, not in the inspector.
// A puck is found by its accessible name (the parameter's name, plus its symbol when it has one: "Povprečje μ"); the tools here
// give it the small Locator-like surface the capture drivers use for a native input, so a row only names the label.
const assert = require('node:assert/strict');

const STRIP = '.puck-strip';

/** The puck body (range slider, count spinbutton or toggle switch) or choice group with this exact name, or null when none. */
async function findPuck(page, label) {
    for (const role of ['slider', 'spinbutton', 'switch', 'radiogroup']) {
        const found = page.locator(`${STRIP} [role="${role}"]`).and(page.getByLabel(label, {exact: true}));
        if (await found.count() === 1) return {role, locator: found};
    }
    return null;
}

const parseNumber = value => Number(String(value).replace('−', '-').replace(',', '.'));

/**
 * A range or count puck as an input stand-in: `inputValue` reads aria-valuenow, `focus`/`press` drive the keyboard
 * (ArrowLeft/ArrowRight step by the puck's step, Home/End jump), and `fill` types the value through the puck's entry
 * (double-click, type, Enter, as `typePuck` does in the unit tests).
 */
function numberPuck(page, found) {
    const {locator} = found;
    // Opening the entry replaces the puck's body with an input, so the entry is found by the puck's key, not through the body.
    const entryOf = async () => page.locator(`${STRIP} [data-puck-key=${JSON.stringify(await locator.evaluate(e => e.closest('[data-puck-key]').dataset.puckKey))}] input.puck-input`);
    return {
        isPuck: true,
        count: async () => 1,
        isVisible: () => locator.isVisible(),
        getAttribute: name => locator.getAttribute(name),
        inputValue: async () => String(parseNumber(await locator.getAttribute('aria-valuenow'))),
        focus: () => locator.focus(),
        press: (key, options) => key === 'Tab' ? Promise.resolve() : locator.press(key, options),
        fill: async value => {
            const entry = await entryOf();
            if (await entry.count() === 0) await locator.dblclick();
            await entry.fill(String(value));
            await entry.press('Enter');
        },
        min: async () => parseNumber(await locator.getAttribute('aria-valuemin')),
        max: async () => parseNumber(await locator.getAttribute('aria-valuemax')),
        locator,
    };
}

/** A choice puck: `selectOption(value)` clicks the segment whose option value it is; `inputValue` is the checked segment's value. */
function choicePuck(found) {
    const {locator} = found;
    return {
        isPuck: true,
        count: async () => 1,
        isVisible: () => locator.isVisible(),
        selectOption: async value => { await locator.locator(`[role="radio"][data-value=${JSON.stringify(String(value))}]`).click(); },
        inputValue: () => locator.locator('[role="radio"][aria-checked="true"]').getAttribute('data-value'),
        locator,
    };
}

/** A toggle puck: `setChecked` clicks it when its state differs; `isChecked` reads aria-checked. */
function togglePuck(found) {
    const {locator} = found;
    const isChecked = async () => (await locator.getAttribute('aria-checked')) === 'true';
    return {
        isPuck: true,
        count: async () => 1,
        isVisible: () => locator.isVisible(),
        isChecked,
        setChecked: async value => { if (await isChecked() !== value) await locator.click(); },
        locator,
    };
}

/** The puck named `label` as the stand-in for `kind` ('range', 'number', 'select', 'toggle'), or null when no puck of that kind has the name. */
async function puckControl(page, kind, label) {
    const found = await findPuck(page, label);
    if (!found) return null;
    if (['range', 'number'].includes(kind) && ['slider', 'spinbutton'].includes(found.role)) return numberPuck(page, found);
    if (kind === 'select' && found.role === 'radiogroup') return choicePuck(found);
    if (kind === 'toggle' && found.role === 'switch') return togglePuck(found);
    assert.fail(`The puck "${label}" is a ${found.role}, which the "${kind}" action cannot drive`);
}

/** Unfolds the Orodja card (`[data-card-id="tools"]`, folded by default on a converted graph) and reports whether `locator` is visible. */
async function revealInTools(page, locator) {
    if (await locator.isVisible()) return true;
    const fold = page.locator('[data-card-id="tools"] .board-card-fold[aria-expanded="false"]');
    if (await fold.count() === 1) await fold.click();
    return locator.isVisible();
}

/** Types `value` into the range or count puck named `label` (a perf or capture setup step); fails when no such puck exists. */
async function setPuckValue(page, label, value) {
    const puck = await puckControl(page, 'number', label);
    assert.ok(puck, `no range or count puck named "${label}"`);
    await puck.fill(value);
    assert.ok(Math.abs(Number(await puck.inputValue()) - value) < 1e-9, `the puck "${label}" did not take ${value}`);
}

/** Unfolds the Orodja card so its controls (the folded card keeps them hidden) can be driven; a no-op when it is open. */
async function openTools(page) {
    const fold = page.locator('[data-card-id="tools"] .board-card-fold[aria-expanded="false"]');
    if (await fold.count() === 1) await fold.click();
}

module.exports = {setPuckValue, openTools, findPuck, puckControl, revealInTools, numberPuck, choicePuck, togglePuck};
