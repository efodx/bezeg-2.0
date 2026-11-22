import {describe, expect, it} from 'vitest';
import {frameDeclarer} from '../../graphs/base/declare/graphDeclaration';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import type {GuidedLesson, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';
import {guidedStep, type GuidedStepContent} from './guidedStep';

const t = (s: string): LocalizedText => ({sl: s, en: s});
const scene: LessonScene = {id: 's', basedOn: 'demonstration-default', actions: [], expectedState: t('state')};

/** The local copy that 45 lesson files carried before the shared builder. */
const localStep = (content: GuidedStepContent): GuidedLessonStep => {
    const frame = (id: string, kind: 'explanation' | 'calculation' | 'observation') => ({id, kind});
    return {
        ...content,
        frames: [
            frame(`${content.id}-explanation`, 'explanation'),
            ...(content.workedExampleId ? [frame(`${content.id}-calculation`, 'calculation')] : []),
            frame(`${content.id}-observation`, 'observation'),
        ],
    };
};

const content = (workedExampleId?: string): GuidedStepContent => ({
    id: 'one', order: 1, title: t('T'), purpose: t('P'), explanation: t('E'), formulaIds: [],
    ...(workedExampleId ? {workedExampleId} : {}),
    observationPrompt: t('O'), expectedObservations: [t('x')], scene,
});

type Ids = {param: 'a'; row: 'r1' | 'r2'; note: 'n1'; legend: never; section: never; action: never};
const declare = frameDeclarer<Ids>();

describe('guidedStep', () => {
    it('builds the same step as the local copy, without a worked example', () => {
        expect(guidedStep(content())).toEqual(localStep(content()));
    });

    it('builds the same step as the local copy, with a worked example', () => {
        expect(guidedStep(content('w'))).toEqual(localStep(content('w')));
        expect(guidedStep(content('w')).frames.map(f => f.kind)).toEqual(['explanation', 'calculation', 'observation']);
    });

    it('puts a declaration on each frame kind and none elsewhere', () => {
        const step = guidedStep({
            ...content('w'),
            declare: {
                explanation: declare({highlight: ['r1']}),
                calculation: declare({highlight: ['n1']}),
                observation: declare({highlight: ['r2']}),
            },
        });
        expect(step.frames.map(f => f.declare?.highlight)).toEqual([['r1'], ['n1'], ['r2']]);
        expect('declare' in step).toBe(false);
        expect(guidedStep(content()).frames.some(f => 'declare' in f)).toBe(false);
    });

    it('reaches the runtime LessonFrame through the adapter for every frame kind', () => {
        const lesson: GuidedLesson = {
            demonstrationId: 'taylor', title: t('L'), summary: t('S'), prerequisites: [], learningGoals: [],
            formulaBlocks: [],
            workedExamples: [{id: 'w', title: t('W'), calculationLatex: 'a', resultLatex: 'b', check: t('c')}],
            steps: [guidedStep({
                ...content('w'),
                declare: {
                    explanation: declare({highlight: ['r1']}),
                    calculation: declare({highlight: ['n1']}),
                    observation: declare({highlight: ['r2']}),
                },
            })],
            sources: [], edgeCases: [], unresolvedQuestions: [],
        };
        const frames = adaptGuidedLessonContent(lesson, 'x').steps[0].frames ?? [];
        expect(frames.map(f => [f.kind, f.declare?.highlight])).toEqual([
            ['explanation', ['r1']], ['calculation', ['n1']], ['observation', ['r2']],
        ]);
    });
});
