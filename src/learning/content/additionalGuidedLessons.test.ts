import {additionalGuidedLessons} from './additionalGuidedLessons';

test('keeps the additional lesson bounded, localized, and source-backed', () => {
    expect(additionalGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['rational-decasteljau', 'elevation']);
    for (const lesson of additionalGuidedLessons) {
        expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
        expect(lesson.steps.length).toBeLessThanOrEqual(6);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(new Set(lesson.steps.map(step => step.id)).size).toBe(lesson.steps.length);
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.workedExamples.length).toBeGreaterThan(0);
        for (const localized of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.explanation, step.observationPrompt])]) {
            expect(localized.sl.trim()).not.toBe('');
            expect(localized.en.trim()).not.toBe('');
            expect(localized.sl).not.toBe(localized.en);
        }
        for (const step of lesson.steps) {
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames.at(-1)?.kind).toBe('observation');
        }
    }
});

test('records the quadratic opening and the weighted cubic midpoint of the rational construction', () => {
    const lesson = additionalGuidedLessons[0];
    expect(lesson.workedExamples.map(item => item.id)).toEqual(['rational-decasteljau-quadratic', 'rational-decasteljau-midpoint']);
    expect(lesson.workedExamples[0].calculationLatex).toContain('w=(1,2,1)');
    expect(lesson.workedExamples[0].resultLatex).toContain('(0,1)');
    const example = lesson.workedExamples[1];
    expect(example.calculationLatex).toContain('w=(1,2,1,1)');
    expect(example.resultLatex).toContain('(-9/11,21/11)');
    expect(lesson.steps.map(step => step.id)).toEqual([
        'rational-decasteljau-idea', 'rational-decasteljau-homogeneous', 'rational-decasteljau-projection',
        'rational-decasteljau-cubic-equal', 'rational-decasteljau-weight-effect', 'rational-decasteljau-analysis',
    ]);
    expect(lesson.formulaBlocks.map(formula => formula.id)).toEqual([
        'rational-weighted-form',
        'rational-homogeneous-row',
        'rational-projection',
    ]);
});

test('records the degree-elevation invariants for the polynomial default', () => {
    const lesson = additionalGuidedLessons.find(item => item.demonstrationId === 'elevation')!;
    expect(lesson.formulaBlocks.map(formula => formula.id)).toEqual(['elevation-control-points', 'elevation-shape-invariance']);
    expect(lesson.workedExamples[0].resultLatex).toContain('\\frac12,3');
    expect(lesson.steps[1].scene?.actions).not.toContainEqual({kind: 'degree-elevation'});
    expect(lesson.steps[3].scene?.actions).toContainEqual({kind: 'degree-elevation'});
    expect(lesson.steps[2].scene?.actions).toContainEqual({kind: 'curve-evaluation', parameter: 0.5});
});
