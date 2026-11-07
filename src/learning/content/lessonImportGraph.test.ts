// L3 of docs/specs/lesson-authoring-architecture.md: the content layer depends one way. No content file may reach the runtime
// catalog (src/learning/runtime/lessonCatalog.ts), and no content file other than the composition layer may reach
// chapterOwnedLessons.ts, directly or through any chain of imports.
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {describe, expect, test} from 'vitest';

type Graph = ReadonlyMap<string, readonly string[]>;

/** The shortest import chain from `from` to `target` (both included), or undefined when `target` is unreachable. */
function importChain(graph: Graph, from: string, target: string): string[] | undefined {
    const previous = new Map<string, string | undefined>([[from, undefined]]);
    const queue = [from];
    for (let head = 0; head < queue.length; head++) {
        const file = queue[head];
        if (file === target && file !== from) {
            const chain: string[] = [];
            for (let at: string | undefined = file; at !== undefined; at = previous.get(at)) chain.unshift(at);
            return chain;
        }
        for (const next of graph.get(file) ?? []) {
            if (previous.has(next)) continue;
            previous.set(next, file);
            queue.push(next);
        }
    }
    return undefined;
}

/** Every offending chain `file -> ... -> target` from the given roots. */
function offendingChains(graph: Graph, roots: readonly string[], target: string): string[][] {
    return roots.flatMap(root => { const chain = importChain(graph, root, target); return chain ? [chain] : []; });
}

describe('import walker on a synthetic graph', () => {
    const graph: Graph = new Map([
        ['a', ['b']], ['b', ['c']], ['c', ['target']], ['d', ['e']], ['e', []], ['loop1', ['loop2']], ['loop2', ['loop1']],
    ]);
    test('finds a transitive chain, naming every hop', () => {
        expect(importChain(graph, 'a', 'target')).toEqual(['a', 'b', 'c', 'target']);
        expect(offendingChains(graph, ['a', 'c', 'd'], 'target')).toEqual([['a', 'b', 'c', 'target'], ['c', 'target']]);
    });
    test('reports nothing when the target is unreachable, and terminates on cycles', () => {
        expect(importChain(graph, 'd', 'target')).toBeUndefined();
        expect(importChain(graph, 'loop1', 'target')).toBeUndefined();
        expect(offendingChains(graph, ['d', 'loop1'], 'target')).toEqual([]);
    });
});

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const contentDir = join(srcRoot, 'learning', 'content');
const catalogFile = join(srcRoot, 'learning', 'runtime', 'lessonCatalog.ts');
const compositionFile = join(contentDir, 'chapterOwnedLessons.ts');
const isSource = (name: string) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts');

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? sourceFiles(path) : isSource(name) ? [path] : [];
    });
}

/**
 * Static and dynamic import and export-from specifiers of a file, relative ones resolved to existing source files under src.
 * Relative assets (styles, images, `?raw`) have no imports of their own and are skipped. A relative specifier that resolves to
 * nothing throws, so an import the walker cannot follow is never silently dropped.
 */
function localImports(file: string): string[] {
    const info = ts.preProcessFile(readFileSync(file, 'utf8'), true, true);
    return info.importedFiles.map(item => item.fileName).filter(spec => spec.startsWith('.')).flatMap(spec => {
        const base = resolve(dirname(file), spec.split('?')[0]);
        const isFile = (path: string) => existsSync(path) && statSync(path).isFile();
        const found = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(isFile);
        if (!found) throw new Error(`${relative(srcRoot, file)} imports ${spec}, which resolves to no file.`);
        return isSource(found) && found.startsWith(srcRoot) ? [found] : [];
    });
}

function buildGraph(starts: readonly string[]): Graph {
    const graph = new Map<string, string[]>();
    const pending = [...starts];
    while (pending.length) {
        const file = pending.pop()!;
        if (graph.has(file)) continue;
        const imports = localImports(file);
        graph.set(file, imports);
        pending.push(...imports);
    }
    return graph;
}

const show = (chain: readonly string[]) => chain.map(file => relative(srcRoot, file).split(sep).join('/')).join(' -> ');

describe('the lesson content import graph', () => {
    const contentFiles = sourceFiles(contentDir);
    const graph = buildGraph([...contentFiles, compositionFile]);

    test('the walk covers the content layer and its targets', () => {
        expect(contentFiles.length).toBeGreaterThan(30);
        expect(graph.has(compositionFile)).toBe(true);
        expect(graph.get(join(contentDir, 'bsplineChapterRegistry.ts'))?.length).toBeGreaterThan(0);
        expect(existsSync(catalogFile)).toBe(true);
    });

    test('no content file except the composition layer reaches the runtime lesson catalog', () => {
        const chains = offendingChains(graph, contentFiles.filter(file => file !== compositionFile), catalogFile);
        expect(chains.map(show)).toEqual([]);
    });

    test('no content file except the composition layer reaches chapterOwnedLessons.ts', () => {
        const chains = offendingChains(graph, contentFiles.filter(file => file !== compositionFile), compositionFile);
        expect(chains.map(show)).toEqual([]);
    });
});
