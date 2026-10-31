import {expansionGuidedLessons} from './expansionGuidedLessons';
import {sceneActions} from '../runtime/lessonCatalog';

test('keeps the expansion cohort bounded, localized, and source-backed', () => {
    expect(expansionGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['rational', 'ph-quintic', 'affine']);
    for (const lesson of expansionGuidedLessons) {
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
            // action names and parameters are checked by the `LessonAction` type; the adapter must accept the whole scene
            expect(() => sceneActions(step.scene!)).not.toThrow();
        }
    }
});

test('records the checked mathematics for the expansion cohort', () => {
    const rational = expansionGuidedLessons.find(lesson => lesson.demonstrationId === 'rational')!;
    expect(rational.workedExamples.map(example => example.id)).toEqual(['rational-base-equal', 'rational-base-midpoint', 'rational-base-heavy']);
    expect(rational.workedExamples[0].resultLatex).toContain('(0,3/2)');
    expect(rational.workedExamples[1].resultLatex).toContain('(-9/11,21/11)');
    expect(rational.workedExamples[2].resultLatex).toContain('(-27/17,39/17)');
    expect(rational.formulaBlocks.map(formula => formula.id)).toEqual([
        'rational-base-weighted-form',
        'rational-base-equal-weights',
        'rational-base-second-weight',
        'rational-base-endpoints',
    ]);
    expect(rational.steps.map(step => step.id)).toEqual([
        'rational-base-weights', 'rational-base-evaluation', 'rational-base-heavy', 'rational-base-endpoints', 'rational-base-analysis',
    ]);

    const ph = expansionGuidedLessons.find(lesson => lesson.demonstrationId === 'ph-quintic')!;
    expect(ph.workedExamples[0].resultLatex).toContain('\\tfrac{29}{8}');
    expect(ph.steps[2].scene?.actions).toContainEqual({kind: 'curve-visibility', target: 'offset-curve', visible: true});

    const affine = expansionGuidedLessons.find(lesson => lesson.demonstrationId === 'affine')!;
    expect(affine.formulaBlocks.map(formula => formula.id)).toContain('affine-bezier-commutation');
    expect(affine.steps).toHaveLength(5);
    expect(affine.steps[1].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'translate-x', value: -2});
    expect(affine.steps[1].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'translate-y', value: -1});
    expect(affine.steps[2].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'rotate', value: Math.PI / 2});
    expect(affine.steps[3].scene?.actions).toContainEqual({kind: 'affine-transform', operation: 'scale', value: 2});
});
