import {additionalGuidedLessons} from './additionalGuidedLessons';
import {expansionGuidedLessons} from './expansionGuidedLessons';
import {foundationGuidedLessons} from './foundationGuidedLessons';
import {parameterizationGuidedLessons} from './parameterizationGuidedLessons';
import {constructionGuidedLessons} from './constructionGuidedLessons';
import {rationalConstructionGuidedLessons} from './rationalConstructionGuidedLessons';
import {splineGuidedLessons} from './splineGuidedLessons';
import {functionGuidedLessons} from './functionGuidedLessons';
import {pilotGuidedLessons} from './guidedLessons';

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
];

const TEX_FIELDS = new Set(['latex', 'calculationLatex', 'resultLatex']);
const SKIPPED_KEYS = new Set(['sources']);

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
    for (const [moduleName, lessons] of lessonSets) {
        for (const lesson of lessons) {
            const where = `${moduleName}/${lesson.demonstrationId}`;
            const localized: {path: string; lang: string; text: string}[] = [];
            collectLocalized(lesson, '', localized);
            for (const {path, lang, text} of localized) {
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
                if (/\\[()[\]]/.test(text)) result.push(`${where} ${path} contains math delimiters (added by lessonCatalog): ${text}`);
            }
        }
    }
    return result;
}

test('scans every lesson module', () => {
    expect(lessonSets.flatMap(([, lessons]) => lessons.map(lesson => lesson.demonstrationId)).sort()).toEqual(
        ['affine', 'bernstein', 'bezier', 'decasteljau', 'elevation', 'ph-cubic', 'ph-quintic', 'rational', 'rational-decasteljau', 'rational-elevation', 'uniform-parameterization', 'weighted-parameterization',
            'subdivision', 'repeated-subdivision', 'rational-subdivision', 'extrapolation', 'rational-extrapolation',
            'decasteljau-alternative', 'farin', 'circle', 'spline-cn', 'spline-c1', 'spline-c2', 'spline-g1', 'spline-g1-symmetric', 'spline-parameterization', 'linear-function', 'exponential-function', 'trigonometric-functions', 'continuity', 'derivative', 'definite-integral', 'area-between-curves'].sort(),
    );
});

test('lesson prose wraps math in MathJax delimiters and latex fields stay bare', () => {
    const found = findings();
    if (found.length) throw new Error(`${found.length} notation problem(s):\n${found.join('\n')}`);
});
