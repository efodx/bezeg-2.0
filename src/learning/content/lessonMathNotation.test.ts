import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {additionalGuidedLessons} from './additionalGuidedLessons';
import {expansionGuidedLessons} from './expansionGuidedLessons';
import {foundationGuidedLessons} from './foundationGuidedLessons';
import {parameterizationGuidedLessons} from './parameterizationGuidedLessons';
import {constructionGuidedLessons} from './constructionGuidedLessons';
import {rationalConstructionGuidedLessons} from './rationalConstructionGuidedLessons';
import {splineGuidedLessons} from './splineGuidedLessons';
import {functionGuidedLessons} from './functionGuidedLessons';
import {analysisGuidedLessons} from './analysisGuidedLessons';
import {compgeoGuidedLessons} from './compgeoGuidedLessons';
import {curveGeometryGuidedLessons} from './curveGeometryGuidedLessons';
import {interpolationGuidedLessons} from './interpolationGuidedLessons';
import {numericalMethodsGuidedLessons} from './numericalMethodsGuidedLessons';
import {projectiveConicsGuidedLessons} from './projectiveConicsGuidedLessons';
import {unitCircleAdditionLesson, unitCircleRadianLesson} from './trigUnitCircleGuidedLessons';
import {lineFormsLesson, lineNormalLesson} from './analyticLinesGuidedLessons';
import {circleTangentsLesson, circleRadicalLesson} from './circleGeometryGuidedLessons';
import {isometryClassifyLesson, isometryTwoMirrorsLesson} from './isometriesGuidedLessons';
import {schoolFunctionGraphsGuidedLessons} from './schoolFunctionGraphsGuidedLessons';
import {schoolFunctionGraphsBatchBGuidedLessons} from './schoolFunctionGraphsBatchBGuidedLessons';
import {schoolFunctionGraphsBatchCGuidedLessons} from './schoolFunctionGraphsBatchCGuidedLessons';
import {coonsGuidedLessons} from './coonsGuidedLessons';
import {degreeReductionGuidedLessons} from './degreeReductionGuidedLessons';
import {arcLengthGuidedLessons} from './arcLengthGuidedLessons';
import {bezierClippingGuidedLessons} from './bezierClippingGuidedLessons';
import {bsplineBasisGuidedLessons} from './bsplineBasisGuidedLessons';
import {bsplineDeBoorGuidedLessons} from './bsplineDeBoorGuidedLessons';
import {bsplineInsertionGuidedLessons} from './bsplineInsertionGuidedLessons';
import {bsplineExtractionGuidedLessons} from './bsplineExtractionGuidedLessons';
import {bsplineNurbsGuidedLessons} from './bsplineNurbsGuidedLessons';
import {bsplineBlossomGuidedLessons} from './bsplineBlossomGuidedLessons';
import {fourierSeriesGuidedLessons} from './fourierSeriesGuidedLessons';
import {fourierCoefficientsGuidedLessons} from './fourierCoefficientsGuidedLessons';
import {epicyclesGuidedLessons} from './epicyclesGuidedLessons';
import {probabilityGuidedLessons} from './probabilityGuidedLessons';
import {pilotGuidedLessons} from './guidedLessons';
import {familyChapters} from './familyChapters';
import {patchGuidedExamplesBasics} from './patchGuidedExamplesBasics';
import {patchGuidedExamplesEvaluation} from './patchGuidedExamplesEvaluation';
import {patchGuidedExamplesAdvanced} from './patchGuidedExamplesAdvanced';

/**
 * Guards the lesson math typography contract.
 *
 * Plain localized text (every `{sl, en}` value) is typeset by MathJax only inside \( ... \)
 * (or \[ ... \]). The `latex`, `calculationLatex` and `resultLatex` fields are wrapped in
 * \[ ... \] by lessonCatalog.ts, so they must be bare TeX. Source metadata (`sources`) is not
 * rendered and is not scanned.
 *
 * Besides TeX markers, a few heuristics catch common bare math: `x=value`, numeric fractions,
 * `n+1`, intervals like `[0,1]`, numeric tuples, `f(1/2)` calls and Unicode subscripts.
 *
 * Limits: single variables in prose (`n`, `t`, `w`), symbols such as `B(t)` or `Q_i`-free names and
 * ordinary numbers cannot be detected reliably; they are wrapped by content convention and review.
 */

const lessonSets: readonly (readonly [string, readonly {demonstrationId: string}[]])[] = [
    ['guidedLessons', pilotGuidedLessons],
    ['additionalGuidedLessons', additionalGuidedLessons],
    ['expansionGuidedLessons', expansionGuidedLessons],
    ['foundationGuidedLessons', foundationGuidedLessons],
    ['parameterizationGuidedLessons', parameterizationGuidedLessons],
    ['constructionGuidedLessons', constructionGuidedLessons],
    ['rationalConstructionGuidedLessons', rationalConstructionGuidedLessons],
    ['splineGuidedLessons', splineGuidedLessons],
    ['functionGuidedLessons', functionGuidedLessons],
    ['analysisGuidedLessons', analysisGuidedLessons],
    ['compgeoGuidedLessons', compgeoGuidedLessons],
    ['curveGeometryGuidedLessons', curveGeometryGuidedLessons],
    ['interpolationGuidedLessons', interpolationGuidedLessons],
    ['numericalMethodsGuidedLessons', numericalMethodsGuidedLessons],
    ['schoolFunctionGraphsGuidedLessons', schoolFunctionGraphsGuidedLessons],
    ['schoolFunctionGraphsBatchBGuidedLessons', schoolFunctionGraphsBatchBGuidedLessons],
    ['schoolFunctionGraphsBatchCGuidedLessons', schoolFunctionGraphsBatchCGuidedLessons],
    ['projectiveConicsGuidedLessons', projectiveConicsGuidedLessons],
    ['trigUnitCircleGuidedLessons', [unitCircleRadianLesson, unitCircleAdditionLesson]],
    ['analyticLinesGuidedLessons', [lineFormsLesson, lineNormalLesson]],
    ['circleGeometryGuidedLessons', [circleTangentsLesson, circleRadicalLesson]],
    ['isometriesGuidedLessons', [isometryTwoMirrorsLesson, isometryClassifyLesson]],
    ['coonsGuidedLessons', coonsGuidedLessons],
    ['degreeReductionGuidedLessons', degreeReductionGuidedLessons],
    ['arcLengthGuidedLessons', arcLengthGuidedLessons],
    ['bezierClippingGuidedLessons', bezierClippingGuidedLessons],
    ['bsplineBasisGuidedLessons', bsplineBasisGuidedLessons],
    ['bsplineDeBoorGuidedLessons', bsplineDeBoorGuidedLessons],
    ['bsplineInsertionGuidedLessons', bsplineInsertionGuidedLessons],
    ['bsplineExtractionGuidedLessons', bsplineExtractionGuidedLessons],
    ['bsplineNurbsGuidedLessons', bsplineNurbsGuidedLessons],
    ['bsplineBlossomGuidedLessons', bsplineBlossomGuidedLessons],
    ['fourierSeriesGuidedLessons', fourierSeriesGuidedLessons],
    ['fourierCoefficientsGuidedLessons', fourierCoefficientsGuidedLessons],
    ['epicyclesGuidedLessons', epicyclesGuidedLessons],
    ['probabilityGuidedLessons', probabilityGuidedLessons],
    ['patchGuidedExamplesBasics', Object.values(patchGuidedExamplesBasics)],
    ['patchGuidedExamplesEvaluation', Object.values(patchGuidedExamplesEvaluation)],
    ['patchGuidedExamplesAdvanced', Object.values(patchGuidedExamplesAdvanced)],
];

const TEX_FIELDS = new Set(['latex', 'calculationLatex', 'resultLatex']);
const SKIPPED_KEYS = new Set(['sources']);
// Lessons whose shared latex fields already write decimals as {,} like their Slovenian prose. Other lessons still hold decimal points
// there (repeated-subdivision, curve-offset, ph-quintic, ph-cubic, uniform-parameterization, spline-parameterization); add an id once fixed.
const DECIMAL_COMMA_LATEX_LESSONS = new Set([
    'function-transformation', 'function-inverse', 'polynomial-zeros', 'rational-function', 'geometric-series', 'conic-focal',
    'root-finding', 'quadrature', 'euler-method', 'fourier-series', 'fourier-coefficients', 'epicycles',
    'projective-cross-ratio', 'projective-pascal', 'projective-pole-polar', 'projective-five-point', 'projective-three-views',
]);

function collectLocalized(value: unknown, path: string, out: {path: string; lang: string; text: string}[]): void {
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectLocalized(item, `${path}[${index}]`, out));
    } else if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (typeof record.sl === 'string' && typeof record.en === 'string') {
            out.push({path, lang: 'sl', text: record.sl}, {path, lang: 'en', text: record.en});
            return;
        }
        for (const [key, child] of Object.entries(record)) {
            if (SKIPPED_KEYS.has(key)) continue;
            collectLocalized(child, path ? `${path}.${key}` : key, out);
        }
    }
}

function collectTex(value: unknown, path: string, out: {path: string; text: string}[]): void {
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectTex(item, `${path}[${index}]`, out));
    } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            if (SKIPPED_KEYS.has(key)) continue;
            if (TEX_FIELDS.has(key) && typeof child === 'string') out.push({path: `${path}.${key}`, text: child});
            else collectTex(child, path ? `${path}.${key}` : key, out);
        }
    }
}

/** Removes delimited math, or returns a delimiter error. */
function stripMath(text: string): {outside: string} | {error: string} {
    let outside = '';
    let index = 0;
    while (index < text.length) {
        const pair = text.slice(index, index + 2);
        if (pair === '\\(' || pair === '\\[') {
            const close = pair === '\\(' ? '\\)' : '\\]';
            const end = text.indexOf(close, index + 2);
            if (end < 0) return {error: `unclosed ${pair}`};
            if (/\\[([]/.test(text.slice(index + 2, end))) return {error: 'nested math delimiters'};
            index = end + 2;
            outside += ' ';
        } else if (pair === '\\)' || pair === '\\]') {
            return {error: `unmatched ${pair}`};
        } else {
            outside += text[index];
            index += 1;
        }
    }
    return {outside};
}

const BARE_SCRIPT = /[A-Za-z0-9)\]}][_^]|[_^][A-Za-z0-9({\\-]/;
const BARE_COMMAND = /\\[A-Za-z]+/;
const BARE_MATH_HEURISTICS: readonly (readonly [string, RegExp])[] = [
    ['assignment like t=1/2', /\b[A-Za-z][A-Za-z0-9]*\s*=\s*[-\d(]/],
    ['numeric fraction', /\d\/\d/],
    ['Unicode subscript', /[₀-₉]/],
    ['function of a number', /\b[A-Za-z]\(-?\d[\d./]*\)/],
    ['numeric tuple', /\(-?\d+(?:[.,]\d+)?\s*[,;]\s*-?\d/],
    ['sum like n+1', /\b[a-z]\s?\+\s?\d/],
    ['interval', /\[-?\d+\s?,\s?-?\d+\]/],
    ['1-t', /\b1-[a-z]\b/],
];

function findings(): string[] {
    const result: string[] = [];
    const readingChapters = familyChapters.map(chapter => ({...chapter, demonstrationId: chapter.id}));
    for (const [moduleName, lessons] of [...lessonSets, ['familyChapters', readingChapters] as const]) {
        for (const lesson of lessons) {
            const where = `${moduleName}/${lesson.demonstrationId}`;
            const localized: {path: string; lang: string; text: string}[] = [];
            collectLocalized(lesson, '', localized);
            for (const {path, lang, text} of localized) {
                // A TeX command written with one backslash in a TS string (`'\ne'`, `'\times'`, `'\frac'`, `'\beta'`,
                // `'\rho'`, `'\vec'`) becomes a control character, which no localized text contains on purpose.
                if (/[\u0000-\u001f]/u.test(text)) {
                    result.push(`${where} ${path} [${lang}] control character (a TeX command with one backslash?): ${JSON.stringify(text)}`);
                }
                const stripped = stripMath(text);
                const mathSegments = [...text.matchAll(/\\\((.*?)\\\)|\\\[(.*?)\\\]/g)].map(match => match[1] ?? match[2] ?? '');
                if (lang === 'sl' && mathSegments.some(segment => /\d\.\d/.test(segment))) {
                    result.push(`${where} ${path} [sl] decimal point inside math (use {,}): ${text}`);
                }
                if (lang === 'en' && mathSegments.some(segment => /\d\{,\}\d/.test(segment))) {
                    result.push(`${where} ${path} [en] decimal comma inside math (use a point): ${text}`);
                }
                if ('error' in stripped) {
                    result.push(`${where} ${path} [${lang}] ${stripped.error}: ${text}`);
                } else if (BARE_SCRIPT.test(stripped.outside) || BARE_COMMAND.test(stripped.outside)) {
                    result.push(`${where} ${path} [${lang}] bare TeX outside \\( \\): ${text}`);
                } else {
                    const heuristic = BARE_MATH_HEURISTICS.find(([, pattern]) => pattern.test(stripped.outside));
                    if (heuristic) result.push(`${where} ${path} [${lang}] bare math outside \\( \\) (${heuristic[0]}): ${text}`);
                }
            }
            const tex: {path: string; text: string}[] = [];
            collectTex(lesson, '', tex);
            for (const {path, text} of tex) {
                if (DECIMAL_COMMA_LATEX_LESSONS.has(lesson.demonstrationId) && /\d\.\d/.test(text)) result.push(`${where} ${path} decimal point in a latex field shared by both languages (use {,}): ${text}`);
                if (/\\[()[\]]/.test(text)) result.push(`${where} ${path} contains math delimiters (added by lessonCatalog): ${text}`);
            }
        }
    }
    return result;
}

test('scans every lesson module', () => {
    expect(lessonSets.flatMap(([, lessons]) => lessons.map(lesson => lesson.demonstrationId)).sort()).toEqual(
        ['affine', 'bernstein', 'bezier', 'decasteljau', 'elevation', 'ph-cubic', 'ph-quintic', 'rational', 'rational-decasteljau', 'rational-elevation', 'uniform-parameterization', 'voronoi', 'voronoi-degenerate', 'weighted-parameterization',
            'unit-circle', 'unit-circle', // trigUnitCircleGuidedLessons.ts: TR1 and TR2
            'line-geometry', 'line-geometry', // analyticLinesGuidedLessons.ts: L1 and L2
            'circle-construction', 'circle-construction', // circleGeometryGuidedLessons.ts: CG1 and CG2
            'isometries', 'isometries', // isometriesGuidedLessons.ts: L1 and L2
            'subdivision', 'repeated-subdivision', 'rational-subdivision', 'extrapolation', 'rational-extrapolation',
            'decasteljau-alternative', 'farin', 'circle', 'spline-cn', 'spline-c1', 'spline-c2', 'spline-g1', 'spline-g1-symmetric', 'spline-parameterization', 'linear-function', 'exponential-function', 'trigonometric-functions', 'continuity', 'derivative', 'definite-integral', 'area-between-curves', 'arc-length', 'bisection', 'mean-value', 'accumulation', 'darboux', 'extrema', 'convexity', 'taylor', 'sequence', 'uniform-convergence', 'complex-multiplication', 'fixed-point', 'patch-tensor', 'patch-tensor', 'patch-tensor', 'patch-tensor', 'patch-decasteljau', 'patch-tensor', 'patch-derivatives', 'patch-subdivision', 'patch-joins', 'patch-triangular', 'patch-triangular', 'orientation', 'polygon-area', 'convex-hull', 'ear-clipping', 'point-set-triangulation', 'delaunay', 'curve-parametric', 'curve-curvature', 'interval-sweep', 'segment-intersections', 'interp-lagrange', 'interp-hermite', 'interp-subdivision', 'root-finding', 'function-transformation', 'function-inverse', 'polynomial-zeros', 'rational-function', 'geometric-series', 'conic-focal', 'bspline-blossom', 'patch-coons', 'reduction', 'arc-length-param', 'bezier-clipping', 'fourier-series', 'fourier-coefficients', 'epicycles', 'projective-cross-ratio', 'bspline-basis', 'projective-pascal', 'bspline-deboor', 'bspline-insertion', 'bspline-extraction', 'bspline-nurbs', 'projective-pole-polar', 'projective-five-point', 'projective-three-views', 'interp-runge', 'interp-least-squares', 'quadrature', 'euler-method', 'prob-density', 'monotone-partition', 'monotone-triangulation', 'fortune', 'prob-binomial-normal', 'prob-clt', 'prob-summary', 'prob-correlation', 'point-in-polygon', 'hull-robustness', 'bezier-hulls', 'curve-comb', 'curve-evolute', 'curve-offset', 'curve-envelope'].sort(),
    );
});

/**
 * A delimiter written with one backslash in a TS string (`'\(x\)'`) reaches the learner as plain `(x)`, which the
 * runtime scan above cannot tell from ordinary brackets; only the source shows it.
 */
test('lesson sources double the backslash of every MathJax delimiter', () => {
    const directory = join(process.cwd(), 'src/learning/content');
    const found = readdirSync(directory)
        .filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts'))
        .flatMap(name => readFileSync(join(directory, name), 'utf-8').split('\n')
            .flatMap((line, index) => /(?<!\\)\\[()[\]]/.test(line) ? [`${name}:${index + 1}`] : []));
    expect(found).toEqual([]);
});

test('lesson prose wraps math in MathJax delimiters and latex fields stay bare', () => {
    const found = findings();
    if (found.length) throw new Error(`${found.length} notation problem(s):\n${found.join('\n')}`);
});
