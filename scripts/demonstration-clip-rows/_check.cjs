'use strict';
// Checks clip rows against the lesson source and the route probe (control labels and ranges; start values come from the recipe scene, which the capture asserts), without a browser.
// Usage: node scripts/demonstration-clip-rows/_check.cjs [<row file name without .cjs>]...
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const probePath = path.join(root, 'docs/reviews/feature-streams/clips/route-probe.json');

function sourceFiles(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
    });
}

/** Lesson sources with TS string escapes undone, so a row's runtime string can be searched for directly. */
function loadLessonText() {
    return sourceFiles(path.join(root, 'src/learning')).map(file => ({
        file: path.relative(root, file).replaceAll('\\', '/'),
        text: fs.readFileSync(file, 'utf8').replace(/\\\\/g, '\\').replace(/\\'/g, "'"),
    }));
}

const hasValue = value => value !== undefined && value !== null && value !== '';

function checkRow(row, entry, lessons) {
    const problems = [];
    const found = lessons.find(lesson => lesson.text.includes(row.lessonQuote));
    if (!found) problems.push(`lessonQuote is not exact lesson text: ${row.lessonQuote}`);
    if (!entry) return {problems: [...problems, 'id is not in route-probe.json'], quoteFile: found?.file};
    const {control} = row;
    if (control.kind === 'slider' || control.kind === 'number') {
        const match = entry.controls.find(c => c.name === control.label && ['slider', 'number', 'text'].includes(c.kind));
        if (!match) problems.push(`no slider or number control is labelled "${control.label}"`);
        else {
            if (match.disabled) problems.push(`control "${control.label}" is disabled in the probed scene`);
            if (hasValue(match.min) && hasValue(match.max) && row.path.some(value => value < Number(match.min) || value > Number(match.max))) {
                problems.push(`path leaves the range ${match.min}..${match.max} of "${control.label}"`);
            }
        }
    // A point's name is not checked here: the probe was taken on lesson example scenes, whose draggable points differ from the recipe scene; the capture asserts the name itself.
    } else if (control.kind === 'stepper') {
        if (!entry.controls.some(c => c.kind === 'button' && c.name === control.label && !c.disabled)) {
            problems.push(`no enabled button is labelled "${control.label}"`);
        }
    } else if (control.kind === 'button-count') {
        if (!entry.controls.some(c => c.kind === 'button' && c.name === control.label && !c.disabled)) problems.push(`no enabled button is labelled "${control.label}"`);
        if (!entry.controls.some(c => c.name.startsWith(control.countLabel) && /^\d+$/.test(c.name.slice(control.countLabel.length)))) problems.push(`no field labelled "${control.countLabel}" followed by a number`);
    } else if (control.kind === 'number-field') {
        if (!entry.controls.some(c => c.kind === 'number' && c.name === control.label && !c.disabled)) {
            problems.push(`no enabled number field is labelled "${control.label}"`);
        }
    }
    return {problems, quoteFile: found?.file};
}

function main(argv) {
    const {rows} = require('./index.cjs');
    const probe = JSON.parse(fs.readFileSync(probePath, 'utf8'));
    const lessons = loadLessonText();
    const selected = argv.length ? argv.flatMap(name => require(path.join(__dirname, `${name}.cjs`))) : rows;
    let failed = 0;
    for (const row of selected) {
        const {problems, quoteFile} = checkRow(row, probe.find(entry => entry.id === row.id), lessons);
        console.log(`${problems.length ? 'FAIL' : 'ok  '} ${row.id}${quoteFile ? ` (quote in ${quoteFile})` : ''}`);
        for (const problem of problems) console.log(`     ${problem}`);
        if (problems.length) failed++;
    }
    console.log(`${selected.length - failed} of ${selected.length} rows passed`);
    if (failed) process.exitCode = 1;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = {checkRow, loadLessonText};
