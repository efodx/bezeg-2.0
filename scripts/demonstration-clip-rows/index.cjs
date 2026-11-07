'use strict';
// Gathers every family row file (any *.cjs not starting with "_", not index.cjs, not *.test.cjs).
const fs = require('node:fs');
const path = require('node:path');
const {validateRows, validateRowAgainstRecipes} = require('./_schema.cjs');
const {recipes} = require('../demonstration-preview-recipes.cjs');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.cjs') && !f.startsWith('_') && f !== 'index.cjs' && !f.endsWith('.test.cjs')).sort();
const rows = validateRows(files.flatMap(file => {
    const exported = require(path.join(__dirname, file));
    if (!Array.isArray(exported)) throw new Error(`${file} must export an array of rows`);
    return exported;
}));
rows.forEach(row => validateRowAgainstRecipes(row, recipes));
const rowsById = Object.freeze(Object.fromEntries(rows.map(row => [row.id, Object.freeze(row)])));

module.exports = Object.freeze({rows: Object.freeze([...rows]), rowsById, rowIds: Object.freeze(rows.map(row => row.id))});
