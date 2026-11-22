/**
 * The one shared step builder for plain guided lessons: explanation, a calculation frame when the step has a worked example,
 * then observation. It replaces the identical local `step` copies and can carry a `FrameDeclaration` per frame kind
 * (type it with `frameDeclarer<ItsGraphIds>()` in the lesson file).
 */
import type {FrameDeclaration} from '../../graphs/base/declare/graphDeclaration';
import type {GuidedLessonFrame, GuidedLessonStep, LessonScene, LocalizedText} from './guidedLessons';

export interface GuidedStepContent {
    readonly id: string;
    readonly order: number;
    readonly title: LocalizedText;
    readonly purpose: LocalizedText;
    readonly explanation: LocalizedText;
    readonly formulaIds: readonly string[];
    readonly workedExampleId?: string;
    readonly observationPrompt: LocalizedText;
    readonly expectedObservations: readonly LocalizedText[];
    readonly scene: LessonScene;
    /** Declarations for the frames this step builds. */
    readonly declare?: Readonly<{
        explanation?: FrameDeclaration;
        calculation?: FrameDeclaration;
        observation?: FrameDeclaration;
    }>;
}

export function guidedStep(content: GuidedStepContent): GuidedLessonStep {
    const {declare, ...rest} = content;
    const frame = (kind: 'explanation' | 'calculation' | 'observation'): GuidedLessonFrame => ({
        id: `${content.id}-${kind}`,
        kind,
        ...(declare?.[kind] ? {declare: declare[kind]} : {}),
    });
    return {
        ...rest,
        frames: [
            frame('explanation'),
            ...(content.workedExampleId ? [frame('calculation')] : []),
            frame('observation'),
        ],
    };
}
