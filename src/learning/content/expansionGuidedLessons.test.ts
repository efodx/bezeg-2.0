import {expansionGuidedLessons} from './expansionGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES} from './guidedLessons';

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
            for (const sceneAction of step.scene?.actions ?? []) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(sceneAction.name);
            }
        }
    }
});

test('records the checked mathematics for the expansion cohort', () => {
    const rational = expansionGuidedLessons.find(lesson => lesson.demonstrationId === 'rational')!;
    expect(rational.workedExamples[0].resultLatex).toContain('(-9/11,21/11)');
    expect(rational.formulaBlocks.map(formula => formula.id)).toEqual([
        'rational-base-weighted-form',
        'rational-base-equal-weights',
        'rational-base-endpoints',
    ]);

    const ph = expansionGuidedLessons.find(lesson => lesson.demonstrationId === 'ph-quintic')!;
    expect(ph.workedExamples[0].resultLatex).toContain('\\tfrac{29}{8}');
    expect(ph.steps[2].scene?.actions).toContainEqual({name: 'show-offset-curve', value: true});

    const affine = expansionGuidedLessons.find(lesson => lesson.demonstrationId === 'affine')!;
    expect(affine.formulaBlocks.map(formula => formula.id)).toContain('affine-bezier-commutation');
    expect(affine.steps[3].scene?.actions).toContainEqual({name: 'translate-y', value: 0.5});
});
