'use strict';
// Checks clip rows against the lesson source and the route probe, without a browser.
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

const plainName = name => String(name).replaceAll('$', '');
const hasValue = value => value !== undefined && value !== null && value !== '';

function checkRow(row, entry, lessons) {
    const problems = [];
    const found = lessons.find(lesson => lesson.text.includes(row.lessonQuote));
    if (!found) problems.push(`lessonQuote is not exact lesson text: ${row.lessonQuote}`);
    if (!entry) return {problems: [...problems, 'id is not in route-probe.json'], quoteFile: found?.file};
    if (!entry.exampleCandidates.some(candidate => candidate.exampleId === row.exampleId)) {
        problems.push(`exampleId ${row.exampleId} is not an example of ${row.id}; expected ${entry.exampleCandidates.map(c => c.exampleId).join(' or ')}`);
    }
    const {control} = row;
    if (control.kind === 'slider' || control.kind === 'number') {
        const match = entry.controls.find(c => c.name === control.label && ['slider', 'number', 'text'].includes(c.kind));
        if (!match) problems.push(`no slider or number control is labelled "${control.label}"`);
        else {
            if (match.disabled) problems.push(`control "${control.label}" is disabled in the example scene`);
            if (hasValue(match.min) && hasValue(match.max) && row.path.some(value => value < Number(match.min) || value > Number(match.max))) {
                problems.push(`path leaves the range ${match.min}..${match.max} of "${control.label}"`);
            }
            if (hasValue(match.value) && Math.abs(row.path[0] - Number(match.value)) > 1e-9) {
                problems.push(`path must start at the scene value ${match.value} of "${control.label}", not ${row.path[0]}`);
            }
        }
    } else if (control.kind === 'point') {
        const point = entry.draggablePoints.find(p => plainName(p.name) === plainName(control.name));
        if (!point) problems.push(`no draggable point is named "${control.name}"`);
        else if (Math.hypot(row.path[0][0] - point.x, row.path[0][1] - point.y) >= 0.02) { // the limit the capture driver applies
            problems.push(`path must start at the point's scene position (${point.x}, ${point.y})`);
        }
    } else if (control.kind === 'stepper') {
        if (!entry.controls.some(c => c.kind === 'button' && c.name === control.label && !c.disabled)) {
            problems.push(`no enabled button is labelled "${control.label}"`);
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
