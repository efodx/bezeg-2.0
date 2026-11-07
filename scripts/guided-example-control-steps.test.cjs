const assert = require('node:assert/strict');
const test = require('node:test');
const {validateControlStep, validateStepOrder, applyControlStep, applyExploreStep} = require('./guided-example-control-steps.cjs');
const {resolveRecipe} = require('./generate-guided-example-inventory.cjs');
const {validateRecipe} = require('./guided-example-preview-api.cjs');

const lesson = {steps: [{id: 's1', frames: [{id: 'a'}, {id: 'b'}]}]};
const authored = steps => ({kind: 'highlight', frame: 'a', steps, expectChange: true, checks: {curveCount: 1}});

test('authoring validation of select-tab and set-control steps', () => {
    const good = [{kind: 'explore'}, {kind: 'select-tab', tab: 'display'}, {kind: 'set-control', control: 'checkbox', label: 'Odmiki krivulje', value: true},
        {kind: 'set-control', control: 'slider', label: 'Razdalja odmika d', value: 0.5}, {kind: 'set-control', control: 'number', label: 'x', value: 3}];
    const resolved = resolveRecipe('x', lesson, authored(good));
    assert.deepEqual(resolved.steps, good);
    assert.doesNotThrow(() => validateRecipe('x', resolved));
    for (const [step, message] of [
        [{kind: 'select-tab', tab: 'nope'}, /select-tab needs tab/],
        [{kind: 'select-tab'}, /select-tab needs tab/],
        [{kind: 'set-control', control: 'knob', label: 'x', value: 1}, /set-control needs control/],
        [{kind: 'set-control', control: 'slider', label: '', value: 1}, /needs the control.s Slovenian accessible name/],
        [{kind: 'set-control', control: 'slider', label: 'x', value: '1'}, /slider value must be a finite number/],
        [{kind: 'set-control', control: 'slider', label: 'x', value: NaN}, /slider value must be a finite number/],
        [{kind: 'set-control', control: 'checkbox', label: 'x', value: 1}, /checkbox value must be true or false/],
        [{kind: 'set-control', control: 'number', label: 'x'}, /number value must be a finite number/],
    ]) {
        assert.throws(() => resolveRecipe('x', lesson, authored([step])), message, JSON.stringify(step));
        assert.throws(() => validateControlStep('x', step, 'step'), message, JSON.stringify(step));
    }
    // Ordering: controls need an earlier explore step; lesson-panel steps cannot follow it.
    const tab = {kind: 'select-tab', tab: 'display'};
    assert.throws(() => resolveRecipe('x', lesson, authored([tab])), /needs an earlier \{kind: "explore"\} step/);
    assert.throws(() => validateRecipe('x', {...resolved, steps: [tab]}), /needs an earlier \{kind: "explore"\} step/);
    assert.throws(() => validateStepOrder('x', [{kind: 'explore'}, {kind: 'goto-frame'}]), /after explore hid it/);
    assert.throws(() => validateStepOrder('x', [{kind: 'explore'}, {kind: 'explore'}]), /repeats explore/);
    assert.throws(() => validateRecipe('x', {...resolved, steps: [{kind: 'explore', extra: 1}]}), /explore takes no other fields/);
    assert.doesNotThrow(() => validateStepOrder('x', [{kind: 'frame-action'}, {kind: 'explore'}, tab]));
    // Inventory-level validation rejects a hand-edited control step too.
    assert.throws(() => validateRecipe('x', {...resolved, steps: [{kind: 'set-control', control: 'slider', label: 'x', value: 'a'}]}), /finite number/);
});

/** A fake inspector with tabs, a checkbox (Prikaz), a slider and a number field (Uredi). */
function fakeInspector(options = {}) {
    const state = {tab: 'edit', checked: false, slider: 0.5, number: 1};
    const controls = {
        checkbox: {name: 'Odmiki krivulje', tab: 'display'},
        slider: {name: 'Razdalja odmika d', tab: 'edit'},
        spinbutton: {name: 'Število', tab: 'edit'},
    };
    const element = (role, name) => ({
        count: async () => (controls[role]?.name === name && controls[role].tab === state.tab ? (options.duplicate ? 2 : 1) : 0),
        isDisabled: async () => Boolean(options.disabled),
        isChecked: async () => state.checked,
        click: async () => { state.checked = options.stuck ? state.checked : !state.checked; },
        getAttribute: async attribute => options.noRange && attribute === 'min' ? null : ({min: '-3', max: '3', step: '0.01', 'aria-valuemin': '0', 'aria-valuemax': '25',
            'aria-valuenow': String(state.number)})[attribute],
        fill: async text => {
            if (options.ignoreFill) return;
            if (role === 'slider') state.slider = Number(text); else state.number = Number(text);
        },
        inputValue: async () => String(state.slider),
        press: async () => {},
    });
    const tabs = ['edit', 'display', 'save'];
    return {state, locator: selector => {
        const tab = /aria-controls="inspector-(\w+)"/.exec(selector)?.[1];
        if (tab) return {count: async () => (tabs.includes(tab) ? 1 : 0), click: async () => { if (!options.tabStuck) state.tab = tab; },
            getAttribute: async () => String(state.tab === tab)};
        assert.equal(selector, '#inspector-content section:not([hidden])');
        return {getByRole: (role, {name, exact}) => { assert.equal(exact, true); return element(role, name); }};
    }};
}

test('the control driver switches tabs and sets a checkbox, a slider and a number field, then verifies the shown value', async () => {
    const page = fakeInspector();
    await applyControlStep(page, {kind: 'select-tab', tab: 'display'});
    await applyControlStep(page, {kind: 'set-control', control: 'checkbox', label: 'Odmiki krivulje', value: true});
    assert.equal(page.state.checked, true);
    await applyControlStep(page, {kind: 'set-control', control: 'checkbox', label: 'Odmiki krivulje', value: true});
    assert.equal(page.state.checked, true, 'an already-set checkbox is not toggled');
    await applyControlStep(page, {kind: 'select-tab', tab: 'edit'});
    await applyControlStep(page, {kind: 'set-control', control: 'slider', label: 'Razdalja odmika d', value: 0.5});
    await applyControlStep(page, {kind: 'set-control', control: 'slider', label: 'Razdalja odmika d', value: 1.25});
    assert.equal(page.state.slider, 1.25);
    await applyControlStep(page, {kind: 'set-control', control: 'number', label: 'Število', value: 7});
    assert.equal(page.state.number, 7);
});

test('the control driver fails with actionable messages for missing, ambiguous, disabled or unaccepting controls', async () => {
    const step = (control, label, value) => ({kind: 'set-control', control, label, value});
    await assert.rejects(() => applyControlStep(fakeInspector(), {kind: 'select-tab', tab: 'nope'}), /inspector tab "nope" is not present exactly once/);
    await assert.rejects(() => applyControlStep(fakeInspector(), step('checkbox', 'Odmiki krivulje', true)), /no visible checkbox named "Odmiki krivulje" in the open inspector tab; check the label and add a select-tab step/);
    await assert.rejects(() => applyControlStep(fakeInspector(), step('slider', 'Napačno ime', 1)), /no visible slider named "Napačno ime"/);
    await assert.rejects(() => applyControlStep(fakeInspector({duplicate: true}), step('slider', 'Razdalja odmika d', 1)), /slider "Razdalja odmika d" is ambiguous \(2 controls/);
    await assert.rejects(() => applyControlStep(fakeInspector({disabled: true}), step('slider', 'Razdalja odmika d', 1)), /is disabled in this state/);
    await assert.rejects(() => applyControlStep(fakeInspector(), step('slider', 'Razdalja odmika d', 5)), /does not accept 5 \(range -3 to 3, step 0.01\)/);
    await assert.rejects(() => applyControlStep(fakeInspector(), step('slider', 'Razdalja odmika d', 0.123)), /does not accept 0.123/);
    await assert.rejects(() => applyControlStep(fakeInspector({ignoreFill: true}), step('slider', 'Razdalja odmika d', 1)), /shows 0.5 after setting 1/);
    await assert.rejects(() => applyControlStep(fakeInspector(), step('number', 'Število', 99)), /does not accept 99 \(range 0 to 25\)/);
    await assert.rejects(() => applyControlStep(fakeInspector({ignoreFill: true}), step('number', 'Število', 3)), /shows 1 after setting 3/);
    await assert.rejects(() => applyControlStep(fakeInspector({tabStuck: true}), {kind: 'select-tab', tab: 'display'}), /did not become the open tab/);
    await assert.rejects(() => applyControlStep(fakeInspector({noRange: true}), step('slider', 'Razdalja odmika d', 1)), /does not report a range/);
    assert.throws(() => validateControlStep('x', {kind: 'goto-frame'}, 'step'), /is not a control step/);
    const stuck = fakeInspector({stuck: true});
    await applyControlStep(stuck, {kind: 'select-tab', tab: 'display'});
    await assert.rejects(() => applyControlStep(stuck, step('checkbox', 'Odmiki krivulje', true)), /did not become true/);
});

test('the explore step presses the lesson hide button and waits for explore mode with an unlocked inspector', async () => {
    const log = [];
    const page = {
        locator: selector => ({count: async () => selector === '.guided-lesson-hide' ? 1 : 0, click: async () => log.push(`click ${selector}`),
            waitFor: async () => log.push(`wait ${selector}`)}),
        waitForFunction: async () => log.push('wait inspector unlocked'),
    };
    await applyExploreStep(page);
    assert.deepEqual(log, ['click .guided-lesson-hide', 'wait .demonstration-workspace.lesson-explore', 'wait inspector unlocked']);
    await assert.rejects(() => applyExploreStep({locator: () => ({count: async () => 0})}), /hide button is not present exactly once/);
});
