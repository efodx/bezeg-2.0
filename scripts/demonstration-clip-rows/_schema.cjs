'use strict';
// Row format for guided-lesson catalog clips. See README.md in this folder.
const assert = require('node:assert/strict');

const rowFields = ['id', 'exampleId', 'motion', 'control', 'path', 'lessonQuote', 'discreteReason'];
const motions = ['parameter-sweep', 'pointer-drag', 'discrete-exact-steps', 'surface-orbit'];
// Motions the driver can capture today. The other two are accepted by the schema so a row can name them, but the driver refuses them.
const drivenMotions = ['parameter-sweep', 'pointer-drag', 'discrete-exact-steps'];

const isPair = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

/** Throws an actionable error for the first problem in one row. */
function validateRow(row, where = 'row') {
    assert.ok(row && typeof row === 'object' && !Array.isArray(row), `${where}: a row must be an object`);
    assert.deepEqual(Object.keys(row).sort(), [...rowFields].sort(), `${where}: a row has exactly the fields ${rowFields.join(', ')}`);
    const name = `${where} (${row.id})`;
    for (const field of ['id', 'exampleId', 'lessonQuote']) assert.ok(typeof row[field] === 'string' && row[field].trim(), `${name}: ${field} must be a non-empty string`);
    assert.ok(motions.includes(row.motion), `${name}: motion must be one of ${motions.join(', ')}`);
    assert.ok(row.control && typeof row.control === 'object', `${name}: control must be an object`);
    assert.ok(Array.isArray(row.path) && row.path.length >= 2, `${name}: path needs at least two waypoints`);
    if (row.motion === 'discrete-exact-steps') assert.ok(typeof row.discreteReason === 'string' && row.discreteReason.trim(), `${name}: a discrete clip must say why smooth motion is impossible in discreteReason`);
    else assert.equal(row.discreteReason, null, `${name}: discreteReason must be null unless the motion is discrete-exact-steps`);
    if (row.motion === 'parameter-sweep') {
        assert.ok(['slider', 'number'].includes(row.control.kind), `${name}: sweep control.kind must be slider or number`);
        assert.ok(typeof row.control.label === 'string' && row.control.label, `${name}: control.label is the accessible label of the control`);
        assert.ok(Number.isFinite(row.control.step) && row.control.step > 0, `${name}: control.step must be the control's step`);
        assert.ok(row.path.every(Number.isFinite), `${name}: sweep path is a list of control values`);
        assert.equal(row.path[0], row.path.at(-1), `${name}: the sweep must end at its start value`);
    } else if (row.motion === 'discrete-exact-steps') {
        assert.equal(row.control.kind, 'stepper', `${name}: a discrete control.kind is stepper`);
        assert.ok(typeof row.control.label === 'string' && row.control.label, `${name}: control.label is the accessible name of the button that is pressed (copy it from route-probe.json)`);
        assert.ok(Number.isFinite(row.control.step) && row.control.step !== 0, `${name}: control.step is the change of the shown value for one press (for example 1)`);
        assert.ok(row.path.length >= 3 && row.path.length <= 8 && row.path.every(n => Number.isInteger(n) && n >= 0), `${name}: path is 3 to 8 cumulative press counts, one per checkpoint, each opened on a fresh example scene`);
        assert.equal(row.path[0], 0, `${name}: the first checkpoint is the example scene itself, so its press count is 0`);
        assert.equal(row.path.at(-1), 0, `${name}: the last checkpoint must be 0 presses, so the loop returns to the poster`);
        assert.ok(row.path.some(n => n > 0), `${name}: path never presses the button`);
    } else if (row.motion === 'pointer-drag') {
        assert.ok(['point', 'surface-point'].includes(row.control.kind), `${name}: drag control.kind must be point or surface-point`);
        assert.ok(typeof row.control.name === 'string' && row.control.name, `${name}: control.name is the point's JSXGraph name (point) or id (surface-point)`);
        assert.ok(row.path.every(isPair), `${name}: drag path is a list of [x, y] waypoints`);
        assert.deepEqual(row.path[0], row.path.at(-1), `${name}: the drag must end where it started`);
        if (row.control.kind === 'surface-point') assert.deepEqual(row.path[0], [0, 0], `${name}: a surface path holds pixel offsets from the start, so it begins at [0, 0]`);
    }
    return row;
}

function validateRows(rows) {
    const ids = new Set();
    rows.forEach((row, index) => {
        validateRow(row, `row ${index}`);
        assert.ok(!ids.has(row.id), `duplicate row id ${row.id}`);
        ids.add(row.id);
    });
    return rows;
}

/**
 * Cross-check of one valid row against the recipes (the Demonstrations that can be captured): the id must be a Demonstration with a
 * recipe, and a surface-point control belongs to a surface view only (every other control to a board view).
 */
function validateRowAgainstRecipes(row, recipes) {
    const recipe = Object.prototype.hasOwnProperty.call(recipes, row.id) ? recipes[row.id] : null;
    assert.ok(recipe && recipe.framing, `row ${row.id}: the id is not a Demonstration with a capture recipe; row ids are Demonstration ids (see demonstration-preview-recipes.cjs)`);
    const surfaceView = recipe.framing.kind === 'surface-view';
    assert.equal(row.control.kind === 'surface-point', surfaceView, `row ${row.id}: control.kind "${row.control.kind}" does not suit the ${surfaceView ? 'surface' : 'board'} view of this Demonstration (${surfaceView ? 'use surface-point' : 'use slider, number, stepper or point'})`);
    return row;
}

module.exports = {validateRowAgainstRecipes, rowFields, motions, drivenMotions, validateRow, validateRows};
