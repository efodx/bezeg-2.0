// Lists every shared-control call site in graph and lesson code, with the props that decide which control fits
// (docs/specs/control-choice-and-composition.md, Part A; the choice table is in docs/controls.md).
//
//   node scripts/controls-inventory.cjs            writes docs/tasks/control-choice/inventory.md
//   node scripts/controls-inventory.cjs --json     prints the rows as JSON
//   node scripts/controls-inventory.cjs --check    lists the NumberInput call sites nobody has decided yet; exits 1 if any
//
// A decision is one entry of docs/tasks/control-choice/decisions.json: "<file>#<owner>#<label>": "keep: <reason>". A call site
// that was migrated to another control simply leaves the list.
//
// A shared control is any JSX element whose tag is imported from src/inputs/ or src/graphs/base/controls/. The script reads
// source text only (TypeScript parser, no type check), so it is complete by construction and runs in about a second.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SCOPES = ['src/graphs', 'src/learning'];
const SHARED = /(^|\/)(inputs|base\/controls|controls)\/[A-Za-z]+$/;
const CHOICE_PROPS = ['min', 'max', 'step', 'grid', 'integer', 'cyclic'];
const DECISIONS_FILE = path.join(ROOT, 'docs', 'tasks', 'control-choice', 'decisions.json');
const DECISIONS = fs.existsSync(DECISIONS_FILE) ? JSON.parse(fs.readFileSync(DECISIONS_FILE, 'utf8')) : {};
const keyOf = row => row.file + '#' + row.owner + '#' + row.label;

function sourceFiles(dir, out = []) {
    for (const name of fs.readdirSync(dir)) {
        const file = path.join(dir, name);
        if (fs.statSync(file).isDirectory()) sourceFiles(file, out);
        else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) && !/(Behaviour|Contract|Harness|TestAccess)\.tsx$/.test(name)) out.push(file);
    }
    return out;
}

/** The name of the function, method or component that renders a node. */
function owner(node) {
    for (let at = node.parent; at; at = at.parent) {
        if ((ts.isFunctionDeclaration(at) || ts.isMethodDeclaration(at)) && at.name) return at.name.getText();
        if (ts.isVariableDeclaration(at) && at.initializer && (ts.isArrowFunction(at.initializer) || ts.isFunctionExpression(at.initializer))) return at.name.getText();
    }
    return '';
}

function rowsOf(file) {
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const shared = new Set();
    for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
        const from = statement.moduleSpecifier.text.replace(/\\/g, '/');
        const resolved = from.startsWith('.') ? path.posix.join(path.posix.dirname(file.replace(/\\/g, '/')), from) : from;
        if (!SHARED.test(resolved) || !/\/(inputs|base\/controls)\//.test(resolved)) continue;
        const clause = statement.importClause;
        if (clause.name) shared.add(clause.name.text);
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const element of clause.namedBindings.elements) shared.add(element.name.text);
    }
    const rows = [];
    const helperCalls = new Map();
    const visit = node => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
            const name = node.expression.name.text;
            helperCalls.set(name, (helperCalls.get(name) ?? 0) + 1);
        }
        if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
            const tag = node.tagName.getText();
            if (shared.has(tag)) {
                const props = {};
                let label = '';
                let spread = false;
                for (const attribute of node.attributes.properties) {
                    if (ts.isJsxSpreadAttribute(attribute)) { spread = true; continue; }
                    const name = attribute.name.getText();
                    const value = attribute.initializer ? attribute.initializer.getText().replace(/^\{|\}$/g, '').replace(/\s+/g, ' ') : 'true';
                    if (CHOICE_PROPS.includes(name)) props[name] = value;
                    if (name === 'label' || name === 'customText' || name === 'title') label = value;
                }
                rows.push({
                    file: path.relative(ROOT, file).replace(/\\/g, '/'),
                    line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
                    control: tag, owner: owner(node), label: label.slice(0, 70), props, spread,
                });
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    // A control rendered by a private helper stands for every call of that helper.
    for (const row of rows) row.uses = helperCalls.get(row.owner) ?? 1;
    return rows;
}

/** The mechanical first reading of a row against the choice table; a person confirms it. */
function reading(row) {
    if (row.control !== 'NumberInput') return '';
    if (DECISIONS[keyOf(row)]) return DECISIONS[keyOf(row)];
    const ranged = (row.props.min !== undefined && row.props.max !== undefined) || row.spread;
    const axis = /(^|[^a-z])[xyz]\b|_[xyz]_|[XYZ]"|value1: "[xyz]"|axis/.test(row.label);
    if (axis) return 'point row?';
    return ranged ? 'slider?' : 'no range: keep?';
}

const rows = SCOPES.flatMap(scope => sourceFiles(path.join(ROOT, scope))).sort().flatMap(rowsOf);
for (const row of rows) row.reading = reading(row);

if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(rows, null, 1));
} else if (process.argv.includes('--check')) {
    const open = rows.filter(row => row.reading.endsWith('?'));
    for (const row of open) console.log(`${row.file}:${row.line} ${row.control} ${row.label} -> ${row.reading}`);
    console.log(`${open.length} NumberInput call site(s) without a decided choice`);
    process.exit(open.length ? 1 : 0);
} else {
    const family = row => row.file.split('/').slice(1, 3).join('/');
    const families = [...new Set(rows.map(family))];
    const counts = name => rows.filter(row => row.control === name).length;
    const controls = [...new Set(rows.map(row => row.control))].sort((a, b) => counts(b) - counts(a));
    const cell = text => String(text).replace(/\|/g, '\\|');
    const lines = [
        '# Control call-site inventory',
        '',
        'Generated by `node scripts/controls-inventory.cjs`; do not edit by hand. Source: [control choice and composition](../../specs/control-choice-and-composition.md). The *Reading* column is the script\'s mechanical first reading of a `NumberInput` against the [choice table](../../controls.md#which-control); a trailing `?` means nobody has decided it yet.',
        '',
        `Call sites: ${rows.length} in ${new Set(rows.map(row => row.file)).size} files. ` + controls.map(name => `\`${name}\` ${counts(name)}`).join(', ') + '.',
        '',
        '## Typed number fields',
        '',
        '| Family | File | Line | In | Label | Range and step | Uses | Reading |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        ...rows.filter(row => row.control === 'NumberInput').map(row => `| ${family(row)} | \`${path.posix.basename(row.file)}\` | ${row.line} | \`${row.owner}\` | \`${cell(row.label)}\` | ${cell(['min', 'max', 'step', 'grid', 'integer'].filter(name => row.props[name] !== undefined).map(name => `${name} \`${row.props[name]}\``).join(', ') || (row.spread ? 'spread props' : 'none'))} | ${row.uses} | ${row.reading} |`),
        '',
        '## All controls by family',
        '',
        '| Family | ' + controls.join(' | ') + ' |',
        '| --- | ' + controls.map(() => '---').join(' | ') + ' |',
        ...families.map(name => `| ${name} | ` + controls.map(control => rows.filter(row => family(row) === name && row.control === control).length || '').join(' | ') + ' |'),
        '',
    ];
    const out = path.join(ROOT, 'docs', 'tasks', 'control-choice', 'inventory.md');
    fs.mkdirSync(path.dirname(out), {recursive: true});
    fs.writeFileSync(out, lines.join('\n'));
    console.log(`wrote ${path.relative(ROOT, out)}: ${rows.length} call sites, ${counts('NumberInput')} NumberInput`);
}
