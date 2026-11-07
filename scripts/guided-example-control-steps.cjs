const assert = require('node:assert/strict');

/** Inspector tabs a recipe can open, as the stable ids of `aria-controls="inspector-<id>"` (Uredi, Prikaz, Shrani). */
const TAB_IDS = ['edit', 'display', 'save'];
const CONTROL_KINDS = ['checkbox', 'slider', 'number'];
const CONTROL_ROLES = {checkbox: 'checkbox', slider: 'slider', number: 'spinbutton'};

/** Validates the authored shape of the learner-control step kinds; frame navigation steps are validated elsewhere. */
function validateControlStep(id, step, where) {
    if (step.kind === 'select-tab') {
        assert.ok(TAB_IDS.includes(step.tab), `${id}: ${where} select-tab needs tab ${TAB_IDS.map(tab => `"${tab}"`).join(', ')} (got ${JSON.stringify(step.tab)})`);
        return;
    }
    assert.equal(step.kind, 'set-control', `${id}: ${where} is not a control step`);
    assert.ok(CONTROL_KINDS.includes(step.control), `${id}: ${where} set-control needs control ${CONTROL_KINDS.map(kind => `"${kind}"`).join(', ')} (got ${JSON.stringify(step.control)})`);
    assert.ok(typeof step.label === 'string' && step.label.trim(), `${id}: ${where} set-control needs the control's Slovenian accessible name as label`);
    if (step.control === 'checkbox') assert.equal(typeof step.value, 'boolean', `${id}: ${where} a checkbox value must be true or false`);
    else assert.ok(typeof step.value === 'number' && Number.isFinite(step.value), `${id}: ${where} a ${step.control} value must be a finite number`);
}

/**
 * Learner-control steps need the inspector, which is inert while the lesson panel is in its content mode. A learner unlocks it with the
 * lesson's "Skrij" button; so an `explore` step must precede every select-tab/set-control step, and lesson navigation or frame actions
 * (lesson panel buttons) must not follow it.
 */
function validateStepOrder(id, steps) {
    let exploring = false;
    for (const [index, step] of steps.entries()) {
        const where = `recipe step ${index + 1} (${step.kind})`;
        if (step.kind === 'explore') {
            assert.equal(exploring, false, `${id}: ${where} repeats explore; the lesson panel is already hidden`);
            exploring = true;
        } else if (step.kind === 'select-tab' || step.kind === 'set-control') {
            assert.ok(exploring, `${id}: ${where} needs an earlier {kind: "explore"} step; the inspector is locked while the lesson panel is shown`);
        } else {
            assert.equal(exploring, false, `${id}: ${where} uses the lesson panel after explore hid it; move it before the explore step`);
        }
    }
}

/** Presses the lesson's consistent hide button, then waits for explore mode with an unlocked inspector. */
async function applyExploreStep(page) {
    const hide = page.locator('.guided-lesson-hide');
    assert.equal(await hide.count(), 1, 'the lesson hide button is not present exactly once; is the lesson already in explore mode?');
    await hide.click();
    await page.locator('.demonstration-workspace.lesson-explore').waitFor({state: 'attached', timeout: 5000});
    await page.waitForFunction(() => {
        const inspector = document.getElementById('workspace-inspector');
        return Boolean(inspector) && !inspector.inert && !inspector.hasAttribute('aria-disabled');
    }, undefined, {timeout: 5000});
}

/** Drives one control step through the visible UI as a learner would, then verifies the control shows the requested state. */
async function applyControlStep(page, step) {
    if (step.kind === 'select-tab') {
        const tab = page.locator(`.inspector-tabs button[aria-controls="inspector-${step.tab}"]`);
        assert.equal(await tab.count(), 1, `inspector tab "${step.tab}" is not present exactly once; is the workspace in presentation mode?`);
        await tab.click();
        assert.equal(await tab.getAttribute('aria-pressed'), 'true', `inspector tab "${step.tab}" did not become the open tab`);
        return;
    }
    const scope = page.locator('#inspector-content section:not([hidden])');
    const role = CONTROL_ROLES[step.control];
    const control = scope.getByRole(role, {name: step.label, exact: true});
    const found = await control.count();
    assert.ok(found > 0, `no visible ${step.control} named "${step.label}" in the open inspector tab; check the label and add a select-tab step before it`);
    assert.equal(found, 1, `${step.control} "${step.label}" is ambiguous (${found} controls share that name)`);
    assert.equal(await control.isDisabled(), false, `${step.control} "${step.label}" is disabled in this state`);
    if (step.control === 'checkbox') {
        if ((await control.isChecked()) !== step.value) await control.click();
        assert.equal(await control.isChecked(), step.value, `checkbox "${step.label}" did not become ${step.value}`);
        return;
    }
    if (step.control === 'slider') {
        const minAttribute = await control.getAttribute('min'), maxAttribute = await control.getAttribute('max');
        const min = Number(minAttribute), max = Number(maxAttribute);
        const stepSize = Number(await control.getAttribute('step') || 1);
        assert.ok(minAttribute !== null && maxAttribute !== null && Number.isFinite(min) && Number.isFinite(max), `slider "${step.label}" does not report a range`);
        const onGrid = Math.abs((step.value - min) / stepSize - Math.round((step.value - min) / stepSize)) < 1e-6;
        assert.ok(step.value >= min && step.value <= max && onGrid,
            `slider "${step.label}" does not accept ${step.value} (range ${min} to ${max}, step ${stepSize})`);
        await control.fill(String(step.value));
        const shown = Number(await control.inputValue());
        assert.ok(Math.abs(shown - step.value) < 1e-9, `slider "${step.label}" shows ${shown} after setting ${step.value}`);
        return;
    }
    const min = Number(await control.getAttribute('aria-valuemin')), max = Number(await control.getAttribute('aria-valuemax'));
    assert.ok(!(step.value < min) && !(step.value > max), `number field "${step.label}" does not accept ${step.value} (range ${min} to ${max})`);
    await control.fill(String(step.value));
    await control.press('Enter');
    const shown = Number(await control.getAttribute('aria-valuenow'));
    assert.ok(Math.abs(shown - step.value) < 1e-9, `number field "${step.label}" shows ${shown} after setting ${step.value}`);
}

module.exports = {TAB_IDS, CONTROL_KINDS, validateControlStep, validateStepOrder, applyControlStep, applyExploreStep};
