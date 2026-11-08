'use strict';

// Warns when a change removes a CSS class, data-* attribute or aria-label value from src/** that tests/*.cjs
// (the browser smoke specs) still reference. Static and cheap; it never fails a command. It would have caught the
// phase 0 failure (docs/reviews/verification-throughput/ci-history.md, run 42475921993: `.point-coordinate-editor`).

const {execFile} = require('node:child_process');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NAME_END = '($|[^A-Za-z0-9_-])';

// Removed tokens from a unified diff (git diff -U0 -- src): [{kind: 'class'|'data'|'aria', token, file}].
function removedTokens(diffText) {
    const found = new Map();
    let file = null;
    const add = (kind, token) => { if (token && !found.has(`${kind}:${token}`)) found.set(`${kind}:${token}`, {kind, token, file}); };
    for (const line of diffText.split('\n')) {
        if (line.startsWith('+++ ')) { file = line.slice(4).replace(/^b\//, ''); continue; }
        if (line.startsWith('--- ') || !line.startsWith('-') || !file) continue;
        const text = line.slice(1);
        for (const match of text.matchAll(/\bdata-[a-z][a-z0-9-]*/g)) add('data', match[0]);
        for (const match of text.matchAll(/aria-label=(?:"([^"{}]+)"|\{\s*['"`]([^'"`${}]+)['"`]\s*\})/g)) add('aria', match[1] || match[2]);
        if (/\.css$/.test(file)) {
            for (const match of text.matchAll(/\.([a-z][a-z0-9_-]*)(?![\w-])/gi)) add('class', match[1]);
        } else if (/className|class=/.test(text)) {
            for (const literal of text.matchAll(/["'`]([^"'`${}]+)["'`]/g)) {
                for (const name of literal[1].split(/\s+/)) if (/^[a-z][a-z0-9]*(-[a-z0-9_]+|__[a-z0-9_-]+)+$/i.test(name)) add('class', name);
            }
        }
    }
    return [...found.values()];
}

// ERE for git grep: the token as a whole name (aria: the exact value).
function srcPattern({kind, token}) {
    return kind === 'aria' ? escapeRegex(token) : `(^|[^A-Za-z0-9_-])${escapeRegex(token)}${NAME_END}`;
}

function testPattern({kind, token}) {
    if (kind === 'aria') return escapeRegex(token);
    if (kind === 'data') return srcPattern({kind, token});
    return `(\\.|class[~*^$|]?=[\\"']?)${escapeRegex(token)}${NAME_END}`;
}

// find(pattern, scope) resolves to [{file, line}] matches in 'src' or 'tests'.
// Returns [{kind, token, removedIn, references}] for tokens gone from src but still referenced by tests.
async function findStaleReferences(diffText, find) {
    const stale = [];
    for (const removed of removedTokens(diffText)) {
        if ((await find(srcPattern(removed), 'src')).length) continue;
        const references = await find(testPattern(removed), 'tests');
        if (references.length) stale.push({...removed, removedIn: removed.file, references});
    }
    return stale;
}

const describe = ({kind, token}) => kind === 'class' ? `CSS class .${token}` : kind === 'data' ? `attribute ${token}` : `aria-label "${token}"`;

function formatWarning(stale) {
    return stale.flatMap(entry => entry.references.map(ref =>
        `WARNING selector removed: ${describe(entry)} was removed in ${entry.removedIn} but tests/ still references it at ${ref.file}:${ref.line}`)).join('\n');
}

function git(root, args) {
    return new Promise(resolve => execFile('git', args, {cwd: root, maxBuffer: 64 * 1024 * 1024, windowsHide: true}, (error, stdout) => resolve({code: error ? (typeof error.code === 'number' ? error.code : 2) : 0, stdout: String(stdout || '')})));
}

// base: the ref check-changed diffs against. head: a commit to read the "after" tree from (default: the working tree).
async function checkSelectorRemovals({root, base, head}) {
    const diff = await git(root, head ? ['diff', '-U0', base, head, '--', 'src'] : ['diff', '-U0', base, '--', 'src']);
    if (diff.code !== 0) throw new Error(`git diff against ${base} failed`);
    const find = async (pattern, scope) => {
        const result = await git(root, ['grep', '-n', '-I', '-E', '-e', pattern, ...(head ? [head] : []), '--', scope === 'tests' ? 'tests/*.cjs' : 'src']);
        if (result.code > 1) throw new Error('git grep failed');
        return result.stdout.split('\n').filter(Boolean).map(entry => {
            const parts = (head ? entry.slice(head.length + 1) : entry).match(/^(.*?):(\d+):/);
            return {file: parts?.[1] || entry, line: Number(parts?.[2]) || 0};
        });
    };
    return findStaleReferences(diff.stdout, find);
}

// Never throws and never changes an exit code: it only prints.
async function warnSelectorRemovals({root, base, head, write = text => process.stderr.write(text)}) {
    try {
        const stale = await checkSelectorRemovals({root, base, head});
        if (stale.length) write(`${formatWarning(stale)}\n`);
        return stale;
    } catch (error) {
        write(`selector removal check skipped: ${error.message}\n`);
        return [];
    }
}

module.exports = {removedTokens, findStaleReferences, formatWarning, checkSelectorRemovals, warnSelectorRemovals};

if (require.main === module) {
    const args = process.argv.slice(2);
    const value = flag => { const at = args.indexOf(flag); return at >= 0 ? args[at + 1] : undefined; };
    warnSelectorRemovals({root: process.cwd(), base: value('--base') || 'origin/master', head: value('--head'), write: text => process.stdout.write(text)})
        .then(stale => { if (!stale.length) process.stdout.write('no stale selector references\n'); });
}
