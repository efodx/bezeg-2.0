#!/usr/bin/env node
/*
 * Migrates guided-lesson content files to the typed lesson action vocabulary (architecture backlog task 9).
 *
 * Usage (from the repository root):
 *   node tools/learning/migrate-lesson-actions.cjs [--check] [--quiet] <file.ts>...
 *
 * What it rewrites, per file, using the TypeScript AST of the repository's `typescript` package:
 *   - legacy string actions `{name: 'show-control-polygon', value: true}` and `action('set-decasteljau-parameter', t)` into
 *     the typed `LessonAction` literal `{kind: 'curve-visibility', target: 'control-polygon', visible: true}`; the
 *     authored value expressions are copied verbatim, so lesson text is never touched;
 *   - the `learnerInteraction` field and `sources[].supports`, which no UI or test reads (docs/specs/guided-lessons.md,
 *     "Authored review fields");
 *   - `readonly SceneAction[]` / `readonly LessonSceneAction[]` annotations into `readonly LessonAction[]`;
 *   - the file-local `const action = (...)` helper once no `action(...)` call remains;
 *   - imports: drops `SceneAction` / `SupportedSceneActionName` / `LessonSceneAction` when unused and adds `LessonAction`
 *     from `../model` when needed.
 * It is idempotent: a migrated file has no legacy forms left, so a second run changes nothing (verify with --check, which
 * writes nothing and exits 1 when any file would change). A legacy action it cannot convert (a value that is not a
 * literal of the expected shape, or `true`-only actions given another expression) is left in place and reported;
 * the typecheck then still passes through the deprecated `sceneAction()` path. Files keep their line endings.
 * After a run: `just typecheck`, `just unit src/learning`, and review the result by search, not by reading
 * (`grep -c "name: '" file` should be 0 for action objects).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const quote = value => `'${value}'`;

/** A typed action from a simple legacy value: `field` receives the value expression text. */
const simple = (kind, fixed, field) => (v) => `{kind: ${quote(kind)}${Object.entries(fixed).map(([k, x]) => `, ${k}: ${quote(x)}`).join('')}, ${field}: ${v.text}}`;
/** Legacy `true`-only actions: the typed action has no value. */
const flag = (kind, fixed = {}) => (v) => v.text === 'true' ? `{kind: ${quote(kind)}${Object.entries(fixed).map(([k, x]) => `, ${k}: ${quote(x)}`).join('')}}` : null;
const animation = animationId => (v) => `{kind: 'animation', animationId: ${quote(animationId)}, command: ${v.text}}`;
/** A legacy object value `{a: x, b: y}` into `{kind, <renamed fields>}`; `optional` fields are copied when present. */
const fromObject = (kind, fields, optional = []) => (v) => {
    if (!v.object) return null;
    const names = Object.keys(v.object);
    if (names.some(n => !fields.some(([from]) => from === n) && !optional.includes(n))) return null;
    const parts = [];
    for (const [from, to] of fields) {
        if (!(from in v.object)) return null;
        parts.push(`${to}: ${v.object[from]}`);
    }
    for (const n of optional) if (n in v.object) parts.push(`${n}: ${v.object[n]}`);
    return `{kind: ${quote(kind)}${parts.map(p => `, ${p}`).join('')}}`;
};
const fromObjectEmptyOk = (kind, fields, optional) => {
    const convert = fromObject(kind, fields, optional);
    return v => (v.object && Object.keys(v.object).length === 0) ? `{kind: ${quote(kind)}}` : convert(v);
};

/** Legacy action name -> converter. Mirrors the deprecated `sceneAction()` in lessonCatalog.ts, which this replaces. */
const TABLE = {
    'show-control-polygon': simple('curve-visibility', {target: 'control-polygon'}, 'visible'),
    'show-convex-hull': simple('curve-visibility', {target: 'convex-hull'}, 'visible'),
    'show-decasteljau-construction': simple('curve-visibility', {target: 'decasteljau-scheme'}, 'visible'),
    'show-weights': simple('curve-visibility', {target: 'weights'}, 'visible'),
    'show-offset-curve': simple('curve-visibility', {target: 'offset-curve'}, 'visible'),
    'set-decasteljau-parameter': simple('parameter', {name: 't'}, 'value'),
    'set-offset-distance': simple('parameter', {name: 'offset-distance'}, 'value'),
    'show-evaluation-point': simple('curve-evaluation', {}, 'parameter'),
    'elevate-degree': flag('degree-elevation'),
    'translate-x': simple('affine-transform', {operation: 'translate-x'}, 'value'),
    'translate-y': simple('affine-transform', {operation: 'translate-y'}, 'value'),
    'scale-affine': simple('affine-transform', {operation: 'scale'}, 'value'),
    'rotate-affine': simple('affine-transform', {operation: 'rotate'}, 'value'),
    'reflect-x': flag('affine-transform', {operation: 'reflect-x'}),
    'reflect-y': flag('affine-transform', {operation: 'reflect-y'}),
    'set-bernstein-degree': simple('bernstein-degree', {}, 'degree'),
    'show-bernstein-stacked-area': simple('bernstein-stacked-area', {}, 'visible'),
    'set-parameterization-alpha': simple('parameterization-alpha', {}, 'value'),
    'set-parameterization-samples': simple('parameterization-samples', {}, 'count'),
    'set-parameterization-mode': simple('parameterization-mode', {}, 'mode'),
    'set-subdivision-parameter': simple('subdivision-parameter', {}, 'value'),
    'subdivide': flag('subdivide'),
    'set-extrapolation-parameter': simple('extrapolation-parameter', {}, 'value'),
    'extrapolate': flag('extrapolate'),
    'show-spline-labels': simple('spline-label-points', {}, 'visible'),
    'hide-spline-fixed-points': simple('spline-hide-fixed', {}, 'hidden'),
    'set-spline-continuity': simple('spline-continuity', {}, 'value'),
    'set-spline-degree': simple('spline-degree', {}, 'value'),
    'set-spline-beta': fromObject('spline-beta', [['index', 'index'], ['value', 'value']]),
    'show-farin-points': simple('farin-points', {}, 'visible'),
    'set-standard-form': simple('standard-form', {}, 'enabled'),
    'set-rational-weights': simple('rational-weights', {}, 'weights'),
    'set-circle-pieces': simple('circle-pieces', {}, 'count'),
    'set-function-parameter': fromObject('function-parameter', [['name', 'name'], ['value', 'value']]),
    'show-function-element': fromObject('function-visibility', [['name', 'target'], ['value', 'visible']]),
    'set-function-choice': fromObject('function-choice', [['name', 'name'], ['value', 'value']]),
    'run-bisection-command': animation('bisection'),
    'run-sequence-command': animation('sequence'),
    'run-fixed-point-command': animation('fixed-point'),
    'run-patch-u-sweep': animation('patch-u-sweep'),
    'run-patch-v-sweep': animation('patch-v-sweep'),
    'show-patch-point': fromObject('patch-evaluation', [['u', 'u'], ['v', 'v']], ['w']),
    'show-patch-element': fromObject('patch-visibility', [['name', 'target'], ['value', 'visible']]),
    'subdivide-patch': fromObjectEmptyOk('patch-subdivide', [], ['direction', 'value']),
    'elevate-patch': fromObjectEmptyOk('patch-elevate', [], ['direction']),
    'set-camera-preset': simple('camera-preset', {}, 'view'),
};

const REMOVED_PROPERTIES = new Set(['learnerInteraction', 'supports']);
const LEGACY_TYPES = new Set(['SceneAction', 'LessonSceneAction']);
const LEGACY_IMPORTS = ['SceneAction', 'SupportedSceneActionName', 'LessonSceneAction'];

const propName = p => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : undefined;

/** The authored value expression, with its text and, for an object literal, the text of each property initializer. */
function valueInfo(node) {
    const info = {text: node.getText(), object: undefined};
    if (ts.isObjectLiteralExpression(node)) {
        info.object = {};
        for (const p of node.properties) {
            const name = propName(p);
            if (name === undefined || !(ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p))) return {text: info.text, object: undefined};
            info.object[name] = ts.isPropertyAssignment(p) ? p.initializer.getText() : p.name.getText();
        }
    }
    return info;
}

function legacyObject(node) {
    if (!ts.isObjectLiteralExpression(node) || node.properties.length !== 2) return undefined;
    const byName = {};
    for (const p of node.properties) {
        if (!ts.isPropertyAssignment(p)) return undefined;
        const name = propName(p);
        if (name !== 'name' && name !== 'value') return undefined;
        byName[name] = p.initializer;
    }
    if (!byName.name || !byName.value || !ts.isStringLiteral(byName.name) || !TABLE[byName.name.text]) return undefined;
    return {name: byName.name.text, value: byName.value};
}

function migrateSource(source, fileName) {
    const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const edits = [];
    const skipped = [];
    let convertedCalls = 0;
    const actionCalls = [];

    const visit = node => {
        const legacy = legacyObject(node);
        if (legacy) {
            const out = TABLE[legacy.name](valueInfo(legacy.value));
            if (out === null) skipped.push(`${legacy.name} at line ${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
            else edits.push({start: node.getStart(), end: node.end, text: out});
            return;
        }
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'action') {
            const [first, second] = node.arguments;
            if (node.arguments.length === 2 && ts.isStringLiteral(first) && TABLE[first.text]) {
                const out = TABLE[first.text](valueInfo(second));
                if (out === null) { skipped.push(`action('${first.text}') at line ${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`); actionCalls.push(node); }
                else { edits.push({start: node.getStart(), end: node.end, text: out}); convertedCalls += 1; }
                return;
            }
            actionCalls.push(node);
        }
        if (ts.isPropertyAssignment(node) && REMOVED_PROPERTIES.has(propName(node)) && ts.isObjectLiteralExpression(node.parent)) {
            const siblings = new Set(node.parent.properties.map(propName));
            const isSteps = node.name.text === 'learnerInteraction' && siblings.has('observationPrompt');
            const isSource = node.name.text === 'supports' && siblings.has('citation');
            if (isSteps || isSource) { edits.push(removeProperty(node, source)); return; }
        }
        if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && LEGACY_TYPES.has(node.typeName.text)
            && ts.isArrayTypeNode(node.parent) && !hasAncestor(node, ts.isTypeAliasDeclaration)) {
            edits.push({start: node.getStart(), end: node.end, text: 'LessonAction'});
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);

    // Remove the file-local `action` helper when every call was converted.
    if (actionCalls.length === 0) {
        for (const statement of sf.statements) {
            if (ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1
                && ts.isIdentifier(statement.declarationList.declarations[0].name) && statement.declarationList.declarations[0].name.text === 'action'
                && !(statement.modifiers ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                edits.push(removeStatement(statement, source));
            }
        }
    }

    let result = applyEdits(source, edits);
    result = fixImports(result, fileName);
    return {result, skipped, changed: result !== source, convertedCalls};
}

function hasAncestor(node, test) {
    for (let p = node.parent; p; p = p.parent) if (test(p)) return true;
    return false;
}

function lineStart(source, pos) {
    const i = source.lastIndexOf('\n', pos - 1);
    return i + 1;
}

function lineEnd(source, pos) {
    const i = source.indexOf('\n', pos);
    return i < 0 ? source.length : i + 1;
}

function removeProperty(node, source) {
    let start = node.getStart();
    let end = node.end;
    const trailing = /^[ \t]*,/.exec(source.slice(end));
    if (trailing) end += trailing[0].length;
    const before = source.slice(lineStart(source, start), start);
    const after = source.slice(end, lineEnd(source, end));
    if (/^\s*$/.test(before) && /^\s*$/.test(after)) return {start: lineStart(source, start), end: lineEnd(source, end), text: ''};
    if (trailing) {
        const spaces = /^[ \t]*/.exec(source.slice(end))[0].length;
        return {start, end: end + spaces, text: ''};
    }
    const comma = /,[ \t]*$/.exec(source.slice(0, start));
    return {start: comma ? start - comma[0].length : start, end, text: ''};
}

function removeStatement(statement, source) {
    let start = statement.getFullStart();
    // Keep the blank line structure: remove the statement's own lines including its leading doc comment.
    const leading = source.slice(start, statement.getStart());
    const doc = /\/\*\*[\s\S]*?\*\/\s*$/.exec(leading);
    start = doc ? start + doc.index : statement.getStart();
    start = lineStart(source, start);
    let end = lineEnd(source, statement.end - 1);
    const nextBlank = /^\r?\n/.exec(source.slice(end));
    if (nextBlank && /\n\s*\n$/.test(source.slice(0, start) + '\n')) end += nextBlank[0].length;
    return {start, end, text: ''};
}

function applyEdits(source, edits) {
    const sorted = [...edits].sort((a, b) => b.start - a.start);
    let out = source;
    for (const e of sorted) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    return out;
}

/** Drops now-unused legacy imports and adds `LessonAction` from the model when the file references it. */
function fixImports(source, fileName) {
    const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const used = new Set();
    const collect = node => {
        if (ts.isImportDeclaration(node)) return;
        if (ts.isIdentifier(node)) used.add(node.text);
        ts.forEachChild(node, collect);
    };
    collect(sf);
    const edits = [];
    let modelImport;
    for (const statement of sf.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings)) continue;
        const spec = statement.moduleSpecifier.text;
        const elements = statement.importClause.namedBindings.elements;
        if (/(^|\/)model$/.test(spec)) modelImport = statement;
        if (!/(^|\/)guidedLessons$/.test(spec)) continue;
        const keep = elements.filter(e => !LEGACY_IMPORTS.includes(e.name.text) || used.has(e.name.text));
        if (keep.length === elements.length) continue;
        if (keep.length === 0 && !statement.importClause.name) edits.push({start: lineStart(source, statement.getStart()), end: lineEnd(source, statement.end - 1), text: ''});
        else edits.push({start: statement.importClause.namedBindings.getStart(), end: statement.importClause.namedBindings.end, text: `{${keep.map(e => e.getText()).join(', ')}}`});
    }
    if (used.has('LessonAction') && !hasImportedName(sf, 'LessonAction')) {
        if (modelImport) {
            const named = modelImport.importClause.namedBindings;
            edits.push({start: named.getStart(), end: named.end, text: `{${[...named.elements.map(e => e.getText()), 'LessonAction'].sort().join(', ')}}`});
        } else {
            const first = sf.statements.find(ts.isImportDeclaration);
            const eol = source.includes('\r\n') ? '\r\n' : '\n';
            const at = first ? lineEnd(source, first.end - 1) : 0;
            edits.push({start: at, end: at, text: `import type {LessonAction} from '../model';${eol}`});
        }
    }
    return applyEdits(source, edits);
}

function hasImportedName(sf, name) {
    return sf.statements.some(s => ts.isImportDeclaration(s) && s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings)
        && s.importClause.namedBindings.elements.some(e => e.name.text === name));
}

function main(argv) {
    const check = argv.includes('--check');
    const quiet = argv.includes('--quiet');
    const files = argv.filter(a => !a.startsWith('--'));
    if (files.length === 0) {
        console.error('Usage: node tools/learning/migrate-lesson-actions.cjs [--check] [--quiet] <file.ts>...');
        return 2;
    }
    let changedAny = false;
    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        const {result, skipped, changed} = migrateSource(source, path.basename(file));
        if (changed) changedAny = true;
        if (changed && !check) fs.writeFileSync(file, result);
        if (!quiet) console.log(`${file}: ${changed ? (check ? 'would change' : 'migrated') : 'already migrated'}${skipped.length ? `; left unconverted: ${skipped.join(', ')}` : ''}`);
    }
    return check && changedAny ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = {migrateSource};
