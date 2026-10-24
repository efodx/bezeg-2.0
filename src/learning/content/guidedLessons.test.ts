import {
    getPilotGuidedLesson,
    GuidedLesson,
    pilotGuidedLessons,
    SUPPORTED_SCENE_ACTION_NAMES,
} from './guidedLessons';

const pilotIds = ['bezier', 'decasteljau', 'ph-cubic'] as const;

const localizedFields = (lesson: GuidedLesson) => [
    lesson.title,
    lesson.summary,
    ...lesson.prerequisites,
    ...lesson.learningGoals,
    ...lesson.formulaBlocks.flatMap(formula => [formula.notation, formula.explanation]),
    ...lesson.workedExamples.flatMap(example => [example.title, example.check]),
    ...lesson.steps.flatMap(step => [
        step.title,
        step.purpose,
        step.explanation,
        step.observationPrompt,
        ...step.expectedObservations,
        ...(step.scene ? [step.scene.expectedState] : []),
    ]),
    ...lesson.edgeCases,
    ...lesson.unresolvedQuestions,
];

const allStepIds = pilotGuidedLessons.flatMap(lesson => lesson.steps.map(step => step.id));
const allSceneIds = pilotGuidedLessons.flatMap(lesson => lesson.steps.flatMap(step => step.scene ? [step.scene.id] : []));
const allFormulaIds = pilotGuidedLessons.flatMap(lesson => lesson.formulaBlocks.map(formula => formula.id));
const allWorkedExampleIds = pilotGuidedLessons.flatMap(lesson => lesson.workedExamples.map(example => example.id));
const allFrameIds = pilotGuidedLessons.flatMap(lesson => lesson.steps.flatMap(step => step.frames.map(frame => frame.id)));

test('covers exactly the three planned pilot demonstrations', () => {
    expect(pilotGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(pilotIds);
    for (const demonstrationId of pilotIds) {
        expect(getPilotGuidedLesson(demonstrationId)?.demonstrationId).toBe(demonstrationId);
    }
});
test('uses bounded ordered lessons with stable unique step and scene IDs', () => {
    expect(new Set(allStepIds).size).toBe(allStepIds.length);
    expect(new Set(allSceneIds).size).toBe(allSceneIds.length);
    expect(new Set(allFormulaIds).size).toBe(allFormulaIds.length);
    expect(new Set(allWorkedExampleIds).size).toBe(allWorkedExampleIds.length);
    for (const lesson of pilotGuidedLessons) {
        expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
        expect(lesson.steps.length).toBeLessThanOrEqual(7);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(lesson.formulaBlocks.length).toBeGreaterThan(0);
        expect(lesson.workedExamples.length).toBeGreaterThan(0);
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
    }
});

test('declares bounded explanation, calculation, and observation frames for every pilot step', () => {
    expect(new Set(allFrameIds).size).toBe(allFrameIds.length);
    for (const lesson of pilotGuidedLessons) {
        for (const step of lesson.steps) {
            expect(step.frames.length).toBeGreaterThanOrEqual(2);
            expect(step.frames.length).toBeLessThanOrEqual(3);
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames[step.frames.length - 1].kind).toBe('observation');
            expect(step.frames.filter(frame => frame.kind === 'calculation').length).toBe(step.workedExampleId ? 1 : 0);
        }
    }
});

test('provides Slovenian and English counterparts for every learner-facing content block', () => {
    for (const lesson of pilotGuidedLessons) {
        for (const localized of localizedFields(lesson)) {
            expect(localized.sl.trim()).not.toBe('');
            expect(localized.en.trim()).not.toBe('');
            expect(localized.sl).not.toBe(localized.en);
        }
    }
});

test('keeps formula references valid and formula blocks non-empty', () => {
    for (const lesson of pilotGuidedLessons) {
        const formulaIds = new Set(lesson.formulaBlocks.map(formula => formula.id));
        expect(formulaIds.size).toBe(lesson.formulaBlocks.length);
        for (const formula of lesson.formulaBlocks) {
            expect(formula.latex.trim()).not.toBe('');
        }
        for (const step of lesson.steps) {
            for (const formulaId of step.formulaIds) {
                expect(formulaIds.has(formulaId)).toBe(true);
            }
            for (const frame of step.frames) {
                for (const formulaId of frame.formulaIds ?? []) {
                    expect(formulaIds.has(formulaId)).toBe(true);
                }
            }
        }
    }
});

test('declares only scene actions supported by the content adapter contract', () => {
    const supported = new Set<string>(SUPPORTED_SCENE_ACTION_NAMES);
    for (const lesson of pilotGuidedLessons) {
        for (const step of lesson.steps) {
            for (const scene of step.scene ? [step.scene] : []) {
                for (const sceneAction of scene.actions) {
                    expect(supported.has(sceneAction.name)).toBe(true);
                    expect(['boolean', 'number']).toContain(typeof sceneAction.value);
                }
            }
        }
    }
});

// Whether scene values are inside the graphs' ranges is checked by applying every scene to its real graph
// (sceneContentAgainstGraphs.test.tsx); this test pins the exact PH offsets the pilot lesson shows.
test('keeps the exact pilot scene values', () => {
    const ph = getPilotGuidedLesson('ph-cubic')!;
    const distances = ph.steps.flatMap(step => step.scene?.actions ?? [])
        .filter(sceneAction => sceneAction.name === 'set-offset-distance')
        .map(sceneAction => sceneAction.value);
    expect(distances).toEqual([1, -1, 1]);
});

test('records the thesis-consistent cubic PH mixed control-point coefficient', () => {
    const ph = getPilotGuidedLesson('ph-cubic')!;
    const formula = ph.formulaBlocks.find(block => block.id === 'ph-cubic-control-points')!;
    expect(formula.latex).toContain('P_2&=P_1+\\frac13w_0w_1');
    expect(ph.sources.some(source => source.id === 'stampar-thesis-ph')).toBe(true);
});
