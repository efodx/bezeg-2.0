// Demonstration inventory for the board workspace conversion (docs/tasks/ux-picks-app-wide/02-declaration-contract.md, slice 5).
//
//   node scripts/inventory/inventory.cjs [--root <repo>] [--out <dir>]
//
// Reads source text only (TypeScript parser, no type check, no browser) and writes inventory.json and inventory.md to
// docs/reviews/ux-picks-app-wide/inventory/. Output is deterministic: sorted, no timestamps. See README.md for what each
// field means and for the heuristics' known blind spots.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const LABEL_PROPS = new Set(['label', 'customText', 'title', 'showLabel', 'hideLabel', 'text', 'ariaLabel', 'aria-label']);
const STRING_PROPS = new Set(['label', 'customText', 'title', 'showLabel', 'hideLabel', 'text', 'ariaLabel', 'aria-label', 'placeholder', 'help', 'hint', 'description', 'caption', 'unavailableReason', 'rejectedHint', 'alt']);
const NATIVE_CONTROLS = new Set(['input', 'select', 'button', 'textarea']);
const KEY_CALLEES = new Set(['t', 'message', 'renderMessage']);
const isKeyCall = node => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.arguments[0] !== undefined && ts.isStringLiteral(node.arguments[0])
    && (KEY_CALLEES.has(node.expression.text) || (knownKeys.has(node.arguments[0].text) && /_/.test(node.arguments[0].text)));
const HUB_SIZE = 20;
/** Shared components that show values or status, not controls the learner operates. */
const DISPLAY_TAGS = /^(Readout[A-Za-z]*|LiveReadout|SettledReadout|StatusLive|RefusalNotice|RefusalChannel|StepCounter|InspectorDisclosure)$/;
let knownKeys = new Set();
const hasLetters = text => /\p{L}{2,}/u.test(text);

const toPosix = value => value.replace(/\\/g, '/');
const isFile = file => { try { return fs.statSync(file).isFile(); } catch { return false; } };

function walk(dir, accept, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const name of fs.readdirSync(dir).sort()) {
        const file = path.join(dir, name);
        if (fs.statSync(file).isDirectory()) walk(file, accept, out);
        else if (accept(file)) out.push(file);
    }
    return out;
}

const isSource = file => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && !/\.d\.ts$/.test(file);
const isTest = file => /\.test\.tsx?$/.test(file);

function resolveModule(fromFile, spec) {
    if (!spec.startsWith('.')) return null;
    const base = path.resolve(path.dirname(fromFile), spec);
    for (const candidate of [base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx'), base]) {
        if (/\.tsx?$/.test(candidate) && isFile(candidate)) return candidate;
    }
    return null;
}

function catalog(file) {
    const result = new Map();
    if (!isFile(file)) return result;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = node => {
        if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name))
            && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
            result.set(node.name.text, node.initializer.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return result;
}

function propText(object, name) {
    const property = object.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText().replace(/['"]/g, '') === name);
    return property ? property.initializer : null;
}

/** Everything one source file contributes, with positions so a multi-class file can be cut by class. */
function analyse(file) {
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const info = {
        file, imports: new Map(), classes: [], defaultName: null,
        controls: [], strings: [], keys: [], readouts: [], legends: [], captions: [], bindings: [], panelUses: [],
        playback: false, declares: false, legacyStepHelper: false, lineOf: pos => source.getLineAndCharacterOfPosition(pos).line + 1,
    };
    for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && statement.importClause && ts.isStringLiteral(statement.moduleSpecifier)) {
            const spec = statement.moduleSpecifier.text;
            const clause = statement.importClause;
            const resolved = resolveModule(file, spec);
            const add = (local, imported) => info.imports.set(local, {spec, resolved, imported});
            if (!clause.isTypeOnly) {
                if (/PlaybackButtons|runtime\/animation|iterationController|useGraphAdjacentPlayback|PlaybackSlot/.test(spec)) info.playback = true;
                if (/base\/declare\//.test(spec)) info.declares = true;
            }
            if (clause.name) add(clause.name.text, 'default');
            if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
                for (const element of clause.namedBindings.elements) {
                    add(element.name.text, (element.propertyName ?? element.name).text);
                    if (!clause.isTypeOnly && !element.isTypeOnly && /^(AnimationDriver|PlaybackButtons|useLease)$/.test(element.name.text)) info.playback = true;
                }
            }
        }
        if (ts.isClassDeclaration(statement) && statement.name) {
            const heritage = (statement.heritageClauses ?? []).find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
            const raw = heritage ? heritage.types[0].expression.getText() : null;
            const extendsName = raw ? (raw.match(/[A-Za-z_$][\w$]*(?=\W*$)/) ?? [raw])[0] : null;
            const exportDefault = (statement.modifiers ?? []).some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
            info.classes.push({name: statement.name.text, extendsName, start: statement.getStart(), end: statement.getEnd(), exportDefault, abstract: (statement.modifiers ?? []).some(m => m.kind === ts.SyntaxKind.AbstractKeyword)});
        }
        if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) info.defaultName = statement.expression.text;
        if (ts.isFunctionDeclaration(statement) && statement.name && statement.name.text === 'step') info.legacyStepHelper = true;
        if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (declaration.name.getText() === 'step' && declaration.initializer && /^(\(|function)/.test(declaration.initializer.getText())) info.legacyStepHelper = true;
            }
        }
    }

    const sharedImport = tag => {
        const imported = info.imports.get(tag.split('.')[0]);
        return imported && imported.spec.startsWith('.') && /(^|\/)(inputs|base\/controls)\//.test(toPosix(imported.resolved ?? imported.spec)) ? imported : null;
    };
    const labelOf = expression => {
        if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return {literal: expression.text};
        if (isKeyCall(expression)) return {key: expression.arguments[0].text};
        return {expression: expression.getText().replace(/\s+/g, ' ').slice(0, 60)};
    };
    const keysIn = node => {
        const keys = [];
        const find = child => {
            if (isKeyCall(child)) keys.push(child.arguments[0].text);
            ts.forEachChild(child, find);
        };
        find(node);
        return keys;
    };

    const visit = (node, ctx) => {
        let next = ctx;
        if ((ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name) next = {...ctx, owner: node.name.getText()};
        else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) next = {...ctx, owner: node.name.getText()};
        if (ts.isMethodDeclaration(node) && node.name.getText() === 'parameterBindings') {
            const find = child => {
                if (ts.isPropertyAssignment(child) && ts.isObjectLiteralExpression(child.initializer) && child.initializer.properties.some(p => p.name && p.name.getText() === 'read')) {
                    info.bindings.push({key: child.name.getText().replace(/['"]/g, ''), pos: child.getStart()});
                }
                ts.forEachChild(child, find);
            };
            find(node);
        }
        const owner = next.owner ?? '';
        let readout = next.readout || /readout/i.test(owner);
        let legend = next.legend || /legend/i.test(owner);

        if (ts.isJsxText(node) && hasLetters(node.getText())) {
            info.strings.push({pos: node.getStart(), line: info.lineOf(node.getStart()), text: node.getText().trim().replace(/\s+/g, ' ').slice(0, 60), where: 'jsx-text'});
        }
        if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
            const tag = node.tagName.getText();
            if (/Readout/.test(tag) && ts.isJsxOpeningElement(node)) readout = true;
            const shared = sharedImport(tag);
            const native = !shared && NATIVE_CONTROLS.has(tag);
            const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
            const spread = node.attributes.properties.some(ts.isJsxSpreadAttribute);
            const props = {};
            const labels = [];
            for (const attribute of attrs) {
                const name = attribute.name.getText();
                const init = attribute.initializer;
                const expr = init && ts.isJsxExpression(init) && init.expression ? init.expression : init;
                if (['min', 'max', 'step', 'type'].includes(name) && expr) props[name] = expr.getText().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').slice(0, 50);
                if (LABEL_PROPS.has(name) && expr) labels.push({prop: name, ...labelOf(expr)});
                if (STRING_PROPS.has(name) && init && ts.isStringLiteral(init) && hasLetters(init.text)) {
                    info.strings.push({pos: init.getStart(), line: info.lineOf(init.getStart()), text: init.text.slice(0, 60), where: `attr ${name}`});
                }
            }
            if (shared && DISPLAY_TAGS.test(shared.imported === 'default' ? tag : shared.imported)) {
                // a display component, not a control
            } else if (shared) {
                info.controls.push({pos: node.getStart(), line: info.lineOf(node.getStart()), kind: 'shared', tag: shared.imported === 'default' ? tag : shared.imported, owner, props, labels, spread});
            } else if (native) {
                const type = props.type ?? '';
                if (tag !== 'input' || /^(checkbox|radio|range|number)$/.test(type) || type === '') {
                    info.controls.push({pos: node.getStart(), line: info.lineOf(node.getStart()), kind: 'native', tag: tag === 'input' ? `input:${type || 'text'}` : tag, owner, props, labels, spread});
                }
            }
            const imported = info.imports.get(tag);
            if (imported && imported.resolved && /^[A-Z]/.test(tag) && !shared) info.panelUses.push({tag, resolved: imported.resolved});
            if (readout && /Row$/.test(tag) && labels.length) info.readouts.push({pos: node.getStart(), line: info.lineOf(node.getStart()), label: labels[0], keys: labels.filter(l => l.key).map(l => l.key)});
        }
        const legendRow = ts.isObjectLiteralExpression(node) && propText(node, 'text') && propText(node, 'color') && propText(node, 'visible');
        if (legendRow) legend = true;
        if (ts.isObjectLiteralExpression(node) && (readout || legend)) {
            const label = propText(node, 'label') ?? (legend && propText(node, 'color') ? propText(node, 'text') : null);
            if (label) {
                const entry = {pos: node.getStart(), line: info.lineOf(node.getStart()), id: (() => { const id = propText(node, 'id'); return id ? id.getText().replace(/['"]/g, '') : ''; })(), label: labelOf(label), keys: keysIn(label)};
                (legend ? info.legends : info.readouts).push(entry);
            }
        }
        if (ts.isCallExpression(node)) {
            const callee = node.expression;
            if (isKeyCall(node)) {
                info.keys.push({pos: node.getStart(), key: node.arguments[0].text});
            }
            if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'create' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && /^(text|label)$/.test(node.arguments[0].text)) {
                const second = node.arguments[1];
                const third = second && ts.isArrayLiteralExpression(second) ? second.elements[2] : undefined;
                if (third) {
                    const label = labelOf(third);
                    info.captions.push({pos: node.getStart(), line: info.lineOf(node.getStart()), ...label});
                    if (label.literal !== undefined && hasLetters(label.literal)) info.strings.push({pos: third.getStart(), line: info.lineOf(third.getStart()), text: label.literal.slice(0, 60), where: 'board text'});
                }
            }
        }
        ts.forEachChild(node, child => visit(child, {...next, readout, legend}));
    };
    visit(source, {});
    return info;
}

function run(options = {}) {
    const root = path.resolve(options.root ?? path.join(__dirname, '..', '..'));
    const outDir = path.resolve(options.out ?? path.join(root, 'docs', 'reviews', 'ux-picks-app-wide', 'inventory'));
    const rel = file => toPosix(path.relative(root, file));
    const srcDir = path.join(root, 'src');
    const cache = new Map();
    const info = file => { if (!cache.has(file)) cache.set(file, analyse(file)); return cache.get(file); };
    const sl = catalog(path.join(srcDir, 'localization', 'sl.ts'));
    const en = catalog(path.join(srcDir, 'localization', 'en.ts'));
    knownKeys = new Set(sl.keys());

    // ---- Registrations ----------------------------------------------------------------------------------------------
    const registrations = [];
    for (const file of walk(path.join(srcDir, 'graphs'), f => path.basename(f) === 'runtime.ts')) {
        const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        const visit = node => {
            if (ts.isPropertyAssignment(node) && ts.isArrowFunction(node.initializer)) {
                const body = node.initializer.getText();
                const spec = body.match(/import\((['"])(.+?)\1\)/);
                const klass = body.match(/new m\.(\w+)\(/);
                if (spec && klass) {
                    registrations.push({
                        id: node.name.getText().replace(/['"]/g, ''), family: toPosix(path.relative(path.join(srcDir, 'graphs'), path.dirname(file))) || '.',
                        runtime: rel(file), graphFile: resolveModule(file, spec[2]), className: klass[1],
                    });
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    registrations.sort((a, b) => a.id.localeCompare(b.id));

    // ---- Class chains -----------------------------------------------------------------------------------------------
    const classIn = (file, name) => {
        const entry = info(file);
        if (name === 'default') {
            return entry.classes.find(c => c.exportDefault) ?? entry.classes.find(c => c.name === entry.defaultName) ?? null;
        }
        return entry.classes.find(c => c.name === name) ?? null;
    };
    const chainOf = (file, klass) => {
        const chain = [];
        const seen = new Set();
        let current = klass && classIn(file, klass);
        let at = file;
        while (current && !seen.has(at + '#' + current.name)) {
            seen.add(at + '#' + current.name);
            chain.push({name: current.name, file: at, cls: current});
            if (!current.extendsName) break;
            const entry = info(at);
            const imported = entry.imports.get(current.extendsName);
            if (imported && imported.resolved) {
                const parent = classIn(imported.resolved, imported.imported === 'default' ? 'default' : imported.imported);
                at = imported.resolved;
                if (!parent) { chain.push({name: current.extendsName, file: at, cls: null}); break; }
                current = parent;
            } else {
                const local = entry.classes.find(c => c.name === current.extendsName);
                if (!local) { chain.push({name: current.extendsName, file: null, cls: null}); break; }
                current = local;
            }
        }
        return chain;
    };

    // ---- Panels -----------------------------------------------------------------------------------------------------
    const isPrimitive = file => /\/graphs\/base\/controls\//.test(toPosix(file)) && !/Controls\.tsx$/.test(file);
    const isPanelCandidate = file => /\.tsx$/.test(file) && toPosix(file).includes('/src/graphs/') && !isPrimitive(file) && !/\/src\/inputs\//.test(toPosix(file))
        && !/\/base\/BaseGraph\.tsx$/.test(toPosix(file)) && !info(file).classes.some(c => /Graph$/.test(c.name));
    const panelsOf = (files, depth = 3) => {
        const found = new Set();
        let frontier = files;
        for (let level = 0; level < depth; level++) {
            const next = [];
            for (const file of frontier) {
                for (const use of info(file).panelUses) {
                    if (isPanelCandidate(use.resolved) && !found.has(use.resolved)) { found.add(use.resolved); next.push(use.resolved); }
                }
            }
            frontier = next;
        }
        return [...found].sort();
    };

    // ---- Lessons ----------------------------------------------------------------------------------------------------
    const lessonByDemo = new Map();
    const chapterRefs = new Map();
    let nonLiteralLessonIds = 0;
    const learningFiles = walk(path.join(srcDir, 'learning'), f => isSource(f));
    for (const file of learningFiles) {
        const text = fs.readFileSync(file, 'utf8');
        if (!text.includes('demonstrationId')) continue;
        const isLessonFile = /Lessons?\.tsx?$/.test(file) && !/Registry|Adapter/.test(path.basename(file));
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const helperStep = info(file).legacyStepHelper;
        const stepLike = object => {
            const names = new Set(object.properties.filter(p => p.name).map(p => p.name.getText()));
            if (!names.has('id') || names.has('latex') || names.has('calculationLatex')) return false;
            return names.has('frames') || (names.has('title') && ['purpose', 'explanation', 'body', 'observationPrompt'].some(n => names.has(n)));
        };
        const flatText = object => {
            const parts = [];
            const find = child => {
                if (ts.isPropertyAssignment(child) && ['scene', 'frames', 'animation', 'formulaIds'].includes(child.name.getText())) return;
                if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) parts.push(child.text);
                ts.forEachChild(child, find);
            };
            find(object);
            return parts.join(' ');
        };
        const topLevel = new Map();
        for (const statement of source.statements) {
            if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) if (d.initializer && ts.isIdentifier(d.name)) topLevel.set(d.name.text, d.initializer);
        }
        const stepsOf = lessonObject => {
            const steps = [];
            const visited = new Set();
            const find = child => {
                const viaIdentifier = (ts.isIdentifier(child) && child.parent && ((ts.isPropertyAssignment(child.parent) && child.parent.initializer === child && child.parent.name.getText() === 'steps') || ts.isSpreadElement(child.parent) || (ts.isShorthandPropertyAssignment(child.parent) && child.parent.name === child)))
                    ? topLevel.get(child.text) : undefined;
                if (viaIdentifier && !visited.has(child.text)) { visited.add(child.text); find(viaIdentifier); return; }
                if (ts.isObjectLiteralExpression(child) && child !== lessonObject && stepLike(child)) {
                    const frames = propText(child, 'frames');
                    const ids = [];
                    if (frames && ts.isArrayLiteralExpression(frames)) {
                        for (const element of frames.elements) {
                            if (ts.isCallExpression(element) && element.arguments[0] && ts.isStringLiteral(element.arguments[0])) ids.push(element.arguments[0].text);
                            else if (ts.isObjectLiteralExpression(element)) { const id = propText(element, 'id'); ids.push(id && ts.isStringLiteral(id) ? id.text : '?'); }
                            else ids.push('?');
                        }
                    } else if (frames) ids.push('?');
                    const id = propText(child, 'id');
                    steps.push({id: id && ts.isStringLiteral(id) ? id.text : '?', frames: ids, explicitFrames: Boolean(frames), text: flatText(child)});
                    return;
                }
                ts.forEachChild(child, find);
            };
            find(lessonObject);
            if (steps.length === 0) {
                // steps built by a positional helper such as notableStep(id, title, ...): one step per call of the steps array
                const holder = lessonObject.properties.find(p => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.getText() === 'steps');
                let array = holder && ts.isPropertyAssignment(holder) ? holder.initializer : holder ? topLevel.get('steps') : null;
                if (array && ts.isIdentifier(array)) array = topLevel.get(array.text);
                if (array && ts.isArrayLiteralExpression(array)) {
                    for (const element of array.elements) {
                        if (ts.isCallExpression(element)) {
                            const first = element.arguments[0];
                            steps.push({id: first && ts.isStringLiteral(first) ? first.text : '?', frames: [], explicitFrames: false, text: flatText(element)});
                        }
                    }
                }
            }
            return steps;
        };
        const visit = node => {
            if (ts.isObjectLiteralExpression(node)) {
                const id = propText(node, 'demonstrationId');
                if (id && ts.isStringLiteral(id)) {
                    if (isLessonFile) {
                        const entry = lessonByDemo.get(id.text) ?? [];
                        entry.push({file: rel(file), steps: stepsOf(node), legacyStep: helperStep});
                        lessonByDemo.set(id.text, entry);
                    } else {
                        const refs = chapterRefs.get(id.text) ?? new Set();
                        refs.add(rel(file));
                        chapterRefs.set(id.text, refs);
                    }
                } else if (id && isLessonFile) nonLiteralLessonIds += 1;
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }

    // ---- Tests ------------------------------------------------------------------------------------------------------
    const testFiles = walk(srcDir, isTest);
    const importedBy = new Map();
    for (const file of testFiles) {
        const text = fs.readFileSync(file, 'utf8');
        for (const match of text.matchAll(/from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
            const resolved = resolveModule(file, match[1] ?? match[2]);
            if (resolved) { const list = importedBy.get(resolved) ?? new Set(); list.add(rel(file)); importedBy.set(resolved, list); }
        }
    }
    const ownTests = graphFile => {
        const dir = path.dirname(graphFile);
        const base = path.basename(graphFile).replace(/\.tsx?$/, '');
        const set = new Set(testFiles.filter(t => path.dirname(t) === dir && path.basename(t).startsWith(base + '.')).map(rel));
        for (const t of importedBy.get(graphFile) ?? []) set.add(t);
        return [...set].sort();
    };

    // ---- Per demonstration ------------------------------------------------------------------------------------------
    const filterByClass = (entry, cls, list) => {
        if (!cls || entry.classes.length < 2) return list;
        const inOther = pos => entry.classes.some(c => c !== cls && pos >= c.start && pos < c.end);
        return list.filter(item => !inOther(item.pos) || (item.pos >= cls.start && item.pos < cls.end));
    };
    const labelTexts = label => {
        if (label.literal !== undefined) return [label.literal];
        if (label.key) return [sl.get(label.key), en.get(label.key)].filter(Boolean);
        return [];
    };

    const demonstrations = registrations.map(reg => {
        const chain = reg.graphFile ? chainOf(reg.graphFile, reg.className === 'default' ? 'default' : reg.className) : [];
        const baseGraphIndex = chain.findIndex(link => link.name === 'BaseGraph');
        const classes = chain.map(link => link.name);
        const scopeLinks = chain.filter((link, index) => link.file && index !== baseGraphIndex && !/\/base\/BaseGraph\.tsx$/.test(toPosix(link.file)));
        const chainFiles = [...new Set(scopeLinks.map(link => link.file))];
        const panelFiles = panelsOf(chainFiles);
        const originOf = (file, index) => (index === 0 ? 'own' : 'base');
        const scope = [
            ...scopeLinks.map((link, index) => ({file: link.file, cls: link.cls, origin: originOf(link.file, index)})),
            ...panelFiles.map(file => ({file, cls: null, origin: 'panel'})),
        ];
        const collect = pick => scope.flatMap(item => {
            const entry = info(item.file);
            return filterByClass(entry, item.cls, entry[pick]).map(row => ({...row, file: rel(item.file), origin: item.origin}));
        });
        const controls = collect('controls');
        const strings = collect('strings');
        const keys = collect('keys');
        const readouts = collect('readouts');
        const legends = collect('legends');
        const captions = collect('captions');
        const bindings = collect('bindings');
        const dedupeStrings = [...new Map(strings.map(s => [`${s.file}:${s.line}:${s.text}`, s])).values()];

        const usedTags = tags => controls.filter(c => tags.includes(c.tag));
        const rangeOf = c => ['min', 'max', 'step'].filter(k => c.props[k] !== undefined).map(k => `${k}=${c.props[k]}`).join(' ');
        const controlRows = controls.map(c => ({
            tag: c.tag, origin: c.origin, file: c.file, line: c.line, label: c.labels[0] ? (c.labels[0].key ?? c.labels[0].literal ?? c.labels[0].expression) : '', range: rangeOf(c),
        }));
        const count = tag => controls.filter(c => c.tag === tag).length;
        const scopeEntries = scope.map(item => info(item.file));
        const lessons = lessonByDemo.get(reg.id) ?? [];
        const labelsOfGraph = [...new Set(controls.flatMap(c => c.labels.flatMap(labelTexts)))].filter(l => l.replace(/[^\p{L}]/gu, '').length >= 4);
        const a9 = [];
        for (const lesson of lessons) {
            for (const step of lesson.steps) {
                const lowered = step.text.toLowerCase();
                const hits = labelsOfGraph.filter(label => lowered.includes(label.toLowerCase()));
                if (hits.length) a9.push({lessonFile: lesson.file, step: step.id, frames: step.frames, labels: hits.sort()});
            }
        }
        const ownEntry = reg.graphFile ? info(reg.graphFile) : null;
        const isSurface = chain.some(link => link.name === 'BaseSurfaceGraph');
        const isPointSet = chain.some(link => link.name === 'PointSetGraph') || scopeEntries.some(e => /getUsrCoordsOfMouse/.test(fs.readFileSync(e.file, 'utf8')));
        const hasPlayback = scopeEntries.some(e => e.playback);
        const legacyStep = lessons.some(l => l.legacyStep);
        const outside = scope.filter(item => /\/src\/learning\//.test(toPosix(item.file)) && info(item.file).controls.length > 0);
        const inheritedControls = controls.filter(c => c.origin !== 'own');
        let blocker = 'plain';
        if (outside.length) blocker = 'outside-baseGraph-controls';
        else if (isSurface) blocker = 'surface';
        else if (isPointSet) blocker = 'point-set';
        else if (hasPlayback) blocker = 'playback';
        else if (legacyStep) blocker = 'legacy-step';
        else if (inheritedControls.length) blocker = 'shared-base';
        const flags = [];
        if (isSurface) flags.push('surface');
        if (isPointSet) flags.push('point-set');
        if (hasPlayback) flags.push('playback');
        if (legacyStep) flags.push('legacy-step');
        if (inheritedControls.length) flags.push('shared-base');
        if (outside.length) flags.push('outside-baseGraph-controls');

        const sharedFiles = scope.filter(item => item.origin !== 'own').map(item => rel(item.file));
        return {
            id: reg.id, family: reg.family, runtime: reg.runtime, graphFile: reg.graphFile ? rel(reg.graphFile) : null, graphClass: reg.className === 'default' ? (chain[0] ? chain[0].name : 'default') : reg.className,
            baseClasses: classes.slice(1),
            sharedFiles: [...new Set(sharedFiles)].sort(),
            panels: panelFiles.map(rel),
            controls: {
                total: controls.length, own: controls.filter(c => c.origin === 'own').length, inherited: inheritedControls.length,
                Slider: count('Slider'), CountSetter: count('CountSetter'), PointListInput: count('PointListInput'), NumberInput: count('NumberInput'),
                checkbox: controls.filter(c => ['BooleanField', 'CheckboxGroup', 'OnOffSwitch'].includes(c.tag) || c.tag === 'input:checkbox').length,
                select: usedTags(['ChoiceSelect']).length + count('select'),
                other: [...new Set(controls.map(c => c.tag))].sort(),
                rows: controlRows.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
            },
            readout: {rows: readouts.length, keys: [...new Set(readouts.flatMap(r => r.keys))].sort(), inheritedRows: readouts.filter(r => r.origin !== 'own').length},
            catalogKeys: [...new Set(keys.map(k => k.key))].sort(),
            inlineStrings: {count: dedupeStrings.length, samples: dedupeStrings.slice(0, 5).map(s => `${s.file}:${s.line} ${s.text}`)},
            legend: {entries: legends.length, labels: legends.map(l => l.label.key ?? l.label.literal ?? l.label.expression).sort()},
            boardCaptions: {count: captions.length, labels: captions.map(c => c.key ?? c.literal ?? c.expression).sort()},
            lessons: lessons.map(l => ({file: l.file, steps: l.steps.length, frames: l.steps.reduce((sum, s) => sum + (s.explicitFrames ? s.frames.length : 1), 0), legacyStepHelper: l.legacyStep})),
            chapterFiles: [...(chapterRefs.get(reg.id) ?? [])].sort(),
            a9Candidates: a9,
            lessonTests: [...new Set(lessons.flatMap(l => testFiles.filter(t => path.dirname(t) === path.dirname(path.join(root, l.file)) && path.basename(t).startsWith(path.basename(l.file).replace(/\.tsx?$/, '') + '.')).map(rel)))].sort(),
            tests: reg.graphFile ? ownTests(reg.graphFile) : [],
            surface: isSurface, pointSet: isPointSet, playback: hasPlayback, legacyStep,
            declares: scopeEntries.some(e => e.declares) || Boolean(ownEntry && ownEntry.declares),
            bindings: [...new Set(bindings.map(b => b.key))].sort(),
            blocker, flags: flags.sort(),
        };
    });

    // ---- Components -------------------------------------------------------------------------------------------------
    const users = new Map();
    for (const demo of demonstrations) for (const file of demo.sharedFiles) { const set = users.get(file) ?? []; set.push(demo.id); users.set(file, set); }
    const componentsFor = (ignoreHubs) => {
        const parent = new Map(demonstrations.map(d => [d.id, d.id]));
        const find = id => { let at = id; while (parent.get(at) !== at) at = parent.get(at); return at; };
        for (const [, ids] of users) {
            if (ids.length < 2 || (ignoreHubs && ids.length >= HUB_SIZE)) continue;
            for (const id of ids.slice(1)) parent.set(find(id), find(ids[0]));
        }
        const groups = new Map();
        for (const demo of demonstrations) { const key = find(demo.id); const list = groups.get(key) ?? []; list.push(demo.id); groups.set(key, list); }
        return [...groups.values()].map(ids => {
            const set = new Set(ids);
            const files = [...users].filter(([, list]) => list.length > 1 && list.some(id => set.has(id)) && !(ignoreHubs && list.length >= HUB_SIZE)).map(([file, list]) => ({file, demonstrations: list.length}));
            return {size: ids.length, demonstrations: ids.sort(), sharedFiles: files.sort((a, b) => b.demonstrations - a.demonstrations || a.file.localeCompare(b.file))};
        }).sort((a, b) => b.size - a.size || a.demonstrations[0].localeCompare(b.demonstrations[0]));
    };
    const components = componentsFor(false);
    const componentsWithoutHubs = componentsFor(true);
    const hubs = [...users].filter(([, ids]) => ids.length >= HUB_SIZE).map(([file, ids]) => ({file, demonstrations: ids.length})).sort((a, b) => b.demonstrations - a.demonstrations);
    const componentSize = new Map();
    for (const component of componentsWithoutHubs) for (const id of component.demonstrations) componentSize.set(id, component.size);

    // ---- Pilots -----------------------------------------------------------------------------------------------------
    const weight = d => d.controls.total + d.readout.rows + d.legend.entries + d.inlineStrings.count + d.lessons.reduce((s, l) => s + l.frames, 0) / 4;
    const candidates = predicate => demonstrations.filter(d => !d.declares && d.bindings.length === 0 && predicate(d))
        .map(d => ({id: d.id, graphClass: d.graphClass, weight: Math.round(weight(d) * 10) / 10, componentSize: componentSize.get(d.id)}))
        .sort((a, b) => a.componentSize - b.componentSize || a.weight - b.weight || a.id.localeCompare(b.id)).slice(0, 3);
    const pilots = {
        legacyStep: candidates(d => d.legacyStep && !d.surface && !d.pointSet),
        surface: candidates(d => d.surface),
        pointSet: candidates(d => d.pointSet),
    };

    // ---- Outside BaseGraph ------------------------------------------------------------------------------------------
    const registeredFiles = new Set(demonstrations.flatMap(d => [d.graphFile, ...d.panels]).filter(Boolean));
    const outsideBaseGraph = learningFiles.filter(f => /\.tsx$/.test(f)).map(f => ({file: rel(f), controls: info(f).controls.filter(c => c.kind === 'shared').map(c => c.tag)}))
        .filter(row => row.controls.length && !registeredFiles.has(row.file))
        .map(row => ({file: row.file, controls: Object.fromEntries([...new Set(row.controls)].sort().map(tag => [tag, row.controls.filter(c => c === tag).length]))}));

    // ---- Totals -----------------------------------------------------------------------------------------------------
    const blockerCounts = {};
    for (const d of demonstrations) blockerCounts[d.blocker] = (blockerCounts[d.blocker] ?? 0) + 1;
    const flagCounts = {};
    for (const d of demonstrations) for (const flag of d.flags) flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;
    const uniqueStringCount = (() => {
        const seen = new Set();
        for (const [file, entry] of cache) {
            if (!isSource(file) || !/\/src\/graphs\//.test(toPosix(file))) continue;
            if (!demonstrations.some(d => d.graphFile === rel(file) || d.sharedFiles.includes(rel(file)))) continue;
            for (const s of entry.strings) seen.add(`${rel(file)}:${s.line}:${s.text}`);
        }
        return seen.size;
    })();
    const totals = {
        demonstrations: demonstrations.length,
        graphClasses: new Set(demonstrations.map(d => `${d.graphFile}#${d.graphClass}`)).size,
        graphFiles: new Set(demonstrations.map(d => d.graphFile)).size,
        components: components.length, componentsWithoutHubs: componentsWithoutHubs.length, hubThreshold: HUB_SIZE,
        blockers: Object.fromEntries(Object.entries(blockerCounts).sort()),
        flags: Object.fromEntries(Object.entries(flagCounts).sort()),
        withLesson: demonstrations.filter(d => d.lessons.length).length,
        lessonFrames: demonstrations.reduce((sum, d) => sum + d.lessons.reduce((s, l) => s + l.frames, 0), 0),
        a9CandidateSteps: demonstrations.reduce((sum, d) => sum + d.a9Candidates.length, 0),
        newStringCandidates: uniqueStringCount,
        newStringCandidatesPerGraphSum: demonstrations.reduce((sum, d) => sum + d.inlineStrings.count, 0),
        declaringAlready: demonstrations.filter(d => d.declares).map(d => d.id).sort(),
        withBindings: demonstrations.filter(d => d.bindings.length).map(d => d.id).sort(),
        unresolvedGraphs: demonstrations.filter(d => !d.graphFile).map(d => d.id),
        lessonObjectsWithNonLiteralId: nonLiteralLessonIds,
    };

    const result = {totals, pilots, components, componentsWithoutHubs, hubs, outsideBaseGraph, demonstrations};
    fs.mkdirSync(outDir, {recursive: true});
    fs.writeFileSync(path.join(outDir, 'inventory.json'), JSON.stringify(result, null, 1) + '\n');
    fs.writeFileSync(path.join(outDir, 'inventory.md'), markdown(result));
    return result;
}

function markdown(result) {
    const {totals, pilots, components, componentsWithoutHubs, hubs, outsideBaseGraph, demonstrations} = result;
    const cell = value => String(value).replace(/\|/g, '\\|');
    const lines = [
        '# Demonstration inventory',
        '',
        'Generated by `node scripts/inventory/inventory.cjs`; do not edit by hand. Source: task 02 slice 5 and task 08. Heuristics and blind spots: `scripts/inventory/README.md`.',
        '',
        '## Totals',
        '',
        `- Demonstrations (registered in \`src/graphs/**/runtime.ts\`): ${totals.demonstrations}; graph classes ${totals.graphClasses}; graph files ${totals.graphFiles}.`,
        `- Connected components over shared base classes and panel files: ${totals.components}; ignoring hub files used by ${totals.hubThreshold} or more demonstrations: ${totals.componentsWithoutHubs}.`,
        `- Demonstrations with a lesson file: ${totals.withLesson}; lesson frames (a step without explicit frames counts one): ${totals.lessonFrames}; steps with an A9 candidate (text names a control label): ${totals.a9CandidateSteps}.`,
        `- New-string candidates (inline user-visible strings, each file and line once): ${totals.newStringCandidates}; summed per graph (shared files counted per graph): ${totals.newStringCandidatesPerGraphSum}.`,
        `- Already declaring (imports \`base/declare\`): ${totals.declaringAlready.join(', ') || 'none'}. Already binding parameters: ${totals.withBindings.join(', ') || 'none'}.`,
        `- Lesson objects with a non-literal \`demonstrationId\` (not attributed): ${totals.lessonObjectsWithNonLiteralId}. Unresolved graph classes: ${totals.unresolvedGraphs.join(', ') || 'none'}.`,
        '',
        '### Blocker class (first match wins: outside-baseGraph-controls, surface, point-set, playback, legacy-step, shared-base, plain)',
        '',
        '| Class | Demonstrations |',
        '| --- | --- |',
        ...Object.entries(totals.blockers).map(([name, n]) => `| ${name} | ${n} |`),
        '',
        '### Flags (a demonstration can carry several)',
        '',
        '| Flag | Demonstrations |',
        '| --- | --- |',
        ...Object.entries(totals.flags).map(([name, n]) => `| ${name} | ${n} |`),
        '',
        '## Pilot candidates (smallest component, then smallest conversion; not yet declaring)',
        '',
        ...Object.entries(pilots).flatMap(([kind, list]) => [`- ${kind}: ` + (list.map(c => `\`${c.id}\` (${c.graphClass}, component ${c.componentSize}, weight ${c.weight})`).join('; ') || 'none')]),
        '',
        '## Hub files (used by many demonstrations)',
        '',
        ...hubs.map(h => `- \`${h.file}\`: ${h.demonstrations}`),
        '',
        '## Components',
        '',
        '| Size | Demonstrations | Shared files (demonstration count) |',
        '| --- | --- | --- |',
        ...components.map(c => `| ${c.size} | ${cell(c.demonstrations.length > 12 ? c.demonstrations.slice(0, 12).join(', ') + ', ...' : c.demonstrations.join(', '))} | ${cell(c.sharedFiles.slice(0, 6).map(f => `${path.posix.basename(f.file)} (${f.demonstrations})`).join(', '))} |`),
        '',
        `### Components ignoring hub files (${totals.hubThreshold}+ users)`,
        '',
        '| Size | Demonstrations | Shared files |',
        '| --- | --- | --- |',
        ...componentsWithoutHubs.map(c => `| ${c.size} | ${cell(c.demonstrations.length > 12 ? c.demonstrations.slice(0, 12).join(', ') + ', ...' : c.demonstrations.join(', '))} | ${cell(c.sharedFiles.slice(0, 6).map(f => `${path.posix.basename(f.file)} (${f.demonstrations})`).join(', '))} |`),
        '',
        '## Controls outside registered graphs (Playground-style, `src/learning`)',
        '',
        ...(outsideBaseGraph.length ? outsideBaseGraph.map(row => `- \`${row.file}\`: ${Object.entries(row.controls).map(([tag, n]) => `${tag} ${n}`).join(', ')}`) : ['None found.']),
        '',
        '## Demonstrations',
        '',
        '| Id | Class | Bases | Controls (own/inh) | Sl | Cnt | Pts | Num | Readout rows | Legend | Captions | New strings | Lesson frames | A9 | Tests | Blocker |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
        ...demonstrations.map(d => `| ${d.id} | ${d.graphClass} | ${cell(d.baseClasses.filter(b => b !== 'BaseGraph').join(' > '))} | ${d.controls.total} (${d.controls.own}/${d.controls.inherited}) | ${d.controls.Slider} | ${d.controls.CountSetter} | ${d.controls.PointListInput} | ${d.controls.NumberInput} | ${d.readout.rows} | ${d.legend.entries} | ${d.boardCaptions.count} | ${d.inlineStrings.count} | ${d.lessons.reduce((s, l) => s + l.frames, 0)} | ${d.a9Candidates.length} | ${d.tests.length} | ${d.blocker} |`),
        '',
    ];
    return lines.join('\n');
}

module.exports = {run, analyse};

if (require.main === module) {
    const args = process.argv.slice(2);
    const option = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
    const result = run({root: option('--root'), out: option('--out')});
    console.log(`inventory: ${result.totals.demonstrations} demonstrations, ${result.totals.components} components, blockers ${JSON.stringify(result.totals.blockers)}`);
}
