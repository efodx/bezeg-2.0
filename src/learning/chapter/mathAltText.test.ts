import {describe, expect, it} from 'vitest';
import type {DemonstrationId} from '../../demonstrations';
import type {Language} from '../../localization';
import {mathAltText} from './mathAltText';
import {
    CHAPTER_GUIDED_EXAMPLE_PREVIEWS,
    getGuidedExamplePreviewCopy,
    resolveGuidedExamplePreview,
} from './guidedExamplePreviews';
import {retainedExampleHomes} from './retainedExamples';

describe('mathAltText', () => {
    it.each([
        ['Krog s polmerom \\(1\\) pri \\(t=0{,}5\\).', 'Krog s polmerom 1 pri t=0,5.'],
        ['\\(\\tfrac{x^2}{25}+\\tfrac{y^2}9=1\\)', 'x²/25+y²/9=1'],
        ['\\(\\frac{x^2-1}{x-2}\\)', '(x²-1)/(x-2)'],
        ['\\(y=1+\\tfrac x2\\)', 'y=1+x/2'],
        ['\\(\\tfrac98\\)', '9/8'],
        ['\\(P=(1,\\tfrac{21}5)\\)', 'P=(1,21/5)'],
        ['\\(\\tfrac{\\sqrt2}2\\)', '√2/2'],
        ['\\(S_{16}\\), \\(x_0\\), \\(P_1,\\dots,P_7\\)', 'S₁₆, x₀, P₁,…,P₇'],
        ['\\(\\bar z=1-i\\)', 'z̄=1-i'],
        ['\\(\\operatorname{sgn}(x-1)\\)', 'sgn(x-1)'],
        ['\\([-\\pi,\\pi]\\), \\(x\\ge0\\), \\((\\pm4,0)\\), \\(f\\sin x\\)', '[-π,π], x≥0, (±4,0), fsin x'],
        ['\\(L\\colon y=2\\)', 'L: y=2'],
        ["\\(y'=y\\)", "y'=y"],
        ['\\(x^n\\)', 'x^n'],
        ['\\(\\theta=0\\)', 'θ=0'],
        ['No math here.', 'No math here.'],
    ])('turns %s into plain text', (source, expected) => {
        expect(mathAltText(source)).toBe(expected);
    });
});

const LATEX_LEFTOVER = /[\\{}]/;

it('leaves no LaTeX in the alternative text of any example card', () => {
    let resolved = 0;
    let authoredWithMath = 0;
    const check = (id: string, demonstrationId: DemonstrationId, language: Language, authored: string) => {
        const preview = resolveGuidedExamplePreview(id, demonstrationId, language);
        expect(preview, `${id}/${language}`).toBeDefined();
        resolved += 1;
        if (authored.includes('\\(')) authoredWithMath += 1;
        else expect(preview?.alt, `${id}/${language}`).toBe(authored);
        expect(preview?.alt, `${id}/${language}`).not.toMatch(LATEX_LEFTOVER);
        expect(preview?.alt.trim(), `${id}/${language}`).not.toBe('');
    };
    for (const language of ['sl', 'en'] as const) {
        for (const [id, , , demonstrationId] of retainedExampleHomes) {
            const authored = getGuidedExamplePreviewCopy(id, demonstrationId)?.alt[language];
            if (authored) check(id, demonstrationId, language, authored);
        }
        // Chapter-owned cards resolve by id alone, so any demonstration id reaches them.
        for (const copyById of Object.values(CHAPTER_GUIDED_EXAMPLE_PREVIEWS)) {
            for (const [id, copy] of Object.entries(copyById)) check(id, 'curve-curvature', language, copy.alt[language]);
        }
    }
    expect(resolved).toBeGreaterThan(100);
    expect(authoredWithMath).toBeGreaterThan(0);
});
