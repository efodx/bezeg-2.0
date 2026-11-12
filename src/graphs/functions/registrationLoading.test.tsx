// R2 of docs/specs/lesson-authoring-architecture.md for the functions family: the catalog reads cheap metadata only, and a functions route
// evaluates its own graph module without the legacy graph table or the sibling graph. Module evaluation is observed with mock factories;
// constructors are called only to read the class name.
import {existsSync, readFileSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {beforeEach, describe, expect, test, vi} from 'vitest';

const evaluated = vi.hoisted(() => [] as string[]);
const mark = (name: string, exports: object) => { evaluated.push(name); return exports; };

vi.mock('./LinearFunctionGraph', () => mark('LinearFunctionGraph', {LinearFunctionGraph: class LinearFunctionGraph {}}));
vi.mock('./ExponentialFunctionGraph', () => mark('ExponentialFunctionGraph', {ExponentialFunctionGraph: class ExponentialFunctionGraph {}}));
vi.mock('./TrigonometricFunctionsGraph', () => mark('TrigonometricFunctionsGraph', {TrigonometricFunctionsGraph: class TrigonometricFunctionsGraph {}}));
vi.mock('./FunctionTransformationGraph', () => mark('FunctionTransformationGraph', {FunctionTransformationGraph: class FunctionTransformationGraph {}}));
vi.mock('./FunctionInverseGraph', () => mark('FunctionInverseGraph', {FunctionInverseGraph: class FunctionInverseGraph {}}));
vi.mock('./PolynomialZerosGraph', () => mark('PolynomialZerosGraph', {PolynomialZerosGraph: class PolynomialZerosGraph {}}));
vi.mock('./RationalFunctionGraph', () => mark('RationalFunctionGraph', {RationalFunctionGraph: class RationalFunctionGraph {}}));
vi.mock('./GeometricSeriesGraph', () => mark('GeometricSeriesGraph', {GeometricSeriesGraph: class GeometricSeriesGraph {}}));
vi.mock('./ConicFocalGraph', () => mark('ConicFocalGraph', {ConicFocalGraph: class ConicFocalGraph {}}));
vi.mock('./ContinuityGraph', () => mark('ContinuityGraph', {ContinuityGraph: class ContinuityGraph {}}));
vi.mock('./DerivativeGraph', () => mark('DerivativeGraph', {DerivativeGraph: class DerivativeGraph {}}));
vi.mock('./DefiniteIntegralGraph', () => mark('DefiniteIntegralGraph', {DefiniteIntegralGraph: class DefiniteIntegralGraph {}}));
vi.mock('./AreaBetweenCurvesGraph', () => mark('AreaBetweenCurvesGraph', {AreaBetweenCurvesGraph: class AreaBetweenCurvesGraph {}}));
vi.mock('./ArcLengthGraph', () => mark('ArcLengthGraph', {ArcLengthGraph: class ArcLengthGraph {}}));
vi.mock('../graphFactories', () => mark('graphFactories', {graphFactories: {bisection: () => ({})}}));
vi.mock('../base/GraphRoute', () => mark('GraphRoute', {GraphRoute: () => null}));
vi.mock('../../learning/content/chapterOwnedLessons', () => mark('chapterOwnedLessons', {}));
vi.mock('../../learning/runtime/lessonCatalog', () => mark('lessonCatalog', {}));

beforeEach(() => {
    vi.resetModules();
    evaluated.length = 0;
});

type LazyRoute = {path: string; lazy?: () => Promise<{Component: () => {props: {create: () => object}}}>};

const routeFor = async (path: string) => {
    const {default: routes} = await import('../../Routes');
    return (routes[0].children as LazyRoute[]).find(entry => entry.path === path)!;
};

describe('module evaluation', () => {
    test('importing the catalog metadata evaluates no graph, legacy table or lesson provider', async () => {
        await import('../../demonstrations');
        await import('../../learning/runtime/lessonAvailability');
        await import('./registration');
        await import('./collections');
        await import('../base/presets/PresetImport');
        expect(evaluated).toEqual([]);
    });

    test('importing the routes evaluates no graph either', async () => {
        await import('../../Routes');
        expect(evaluated).toEqual([]);
    });

    test.each([
        ['/bezeg-2.0/functions/linear', 'LinearFunctionGraph'],
        ['/bezeg-2.0/functions/exponential', 'ExponentialFunctionGraph'],
        ['/bezeg-2.0/functions/trigonometric', 'TrigonometricFunctionsGraph'],
        ['/bezeg-2.0/functions/transformations', 'FunctionTransformationGraph'],
        ['/bezeg-2.0/functions/inverse', 'FunctionInverseGraph'],
        ['/bezeg-2.0/functions/polynomial-zeros', 'PolynomialZerosGraph'],
        ['/bezeg-2.0/functions/rational-functions', 'RationalFunctionGraph'],
        ['/bezeg-2.0/functions/geometric-series', 'GeometricSeriesGraph'],
        ['/bezeg-2.0/functions/conics', 'ConicFocalGraph'],
        ['/bezeg-2.0/functions/continuity', 'ContinuityGraph'],
        ['/bezeg-2.0/functions/derivative', 'DerivativeGraph'],
        ['/bezeg-2.0/functions/integral', 'DefiniteIntegralGraph'],
        ['/bezeg-2.0/functions/area-between', 'AreaBetweenCurvesGraph'],
        ['/bezeg-2.0/functions/arc-length', 'ArcLengthGraph'],
    ])('the route %s evaluates its graph, not the legacy table or a sibling', async (path, graph) => {
        const route = await routeFor(path);
        const {Component} = await route.lazy!();
        expect(evaluated.filter(name => name !== 'GraphRoute')).toEqual([graph]);
        expect(Component().props.create().constructor.name).toBe(graph);
    });

    test('a legacy route still resolves through the legacy table', async () => {
        const route = await routeFor('/bezeg-2.0/analysis/bisection');
        await route.lazy!();
        expect(evaluated).toContain('graphFactories');
        expect(evaluated.filter(name => name.endsWith('Graph') && name !== 'GraphRoute')).toEqual([]);
    });
});

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const isFile = (path: string) => existsSync(path) && statSync(path).isFile();

/** Resolved relative modules a file loads when it is evaluated: static imports and re-exports, not `import type` or `import()`. */
function staticImports(file: string): string[] {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const specs: string[] = [];
    for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly && ts.isStringLiteral(statement.moduleSpecifier)) specs.push(statement.moduleSpecifier.text);
        if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) specs.push(statement.moduleSpecifier.text);
    }
    return specs.filter(spec => spec.startsWith('.')).flatMap(spec => {
        const base = resolve(dirname(file), spec.split('?')[0]);
        const found = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(isFile);
        if (!found) throw new Error(`${relative(srcRoot, file)} imports ${spec}, which resolves to no file.`);
        return /\.tsx?$/.test(found) ? [found] : [];
    });
}

/** Every file reachable from the roots through static imports, with the chain that reaches it. */
function reach(roots: readonly string[]): Map<string, string[]> {
    const chains = new Map<string, string[]>(roots.map(root => [root, [root]]));
    const queue = [...roots];
    for (let head = 0; head < queue.length; head++) {
        for (const next of staticImports(queue[head])) {
            if (chains.has(next)) continue;
            chains.set(next, [...chains.get(queue[head])!, next]);
            queue.push(next);
        }
    }
    return chains;
}

const rel = (file: string) => relative(srcRoot, file).split(sep).join('/');
const forbidden = (file: string) => /Graph\.tsx$/.test(file) || /graphs\/(graphFactories|graphLoaders|allGraphFactories)\.ts$/.test(rel(file))
    || /graphs\/curves\/spline\/runtime\.ts$/.test(rel(file)) || /learning\/content\/chapterOwnedLessons\.ts$/.test(rel(file)) || /learning\/runtime\/lessonCatalog\.ts$/.test(rel(file));

describe('static import graph', () => {
    const offending = (roots: string[], allowed: (file: string) => boolean = () => false) =>
        [...reach(roots).entries()].filter(([file]) => forbidden(file) && !allowed(file)).map(([, chain]) => chain.map(rel).join(' -> '));

    test('the catalog and preset metadata reach no graph, runtime loader, legacy table or lesson provider', () => {
        const roots = ['demonstrations.ts', 'learning/runtime/lessonAvailability.ts', 'graphs/functions/registration.ts', 'graphs/functions/collections.ts', 'graphs/base/presets/PresetImport.ts']
            .map(file => join(srcRoot, file));
        roots.forEach(root => expect(existsSync(root), root).toBe(true));
        expect(offending(roots)).toEqual([]);
    });

    test('the routes reach neither the legacy table, the loaders nor a graph through static imports', () => {
        expect(offending([join(srcRoot, 'Routes.tsx')], file => /learning\//.test(rel(file)))).toEqual([]);
    });
});
