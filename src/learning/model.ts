import type {DemonstrationId} from '../demonstrations';

export type LessonLanguage = 'sl' | 'en';

export type LocalizedText = Readonly<Record<LessonLanguage, string>>;

export type LessonAction =
    | {readonly kind: 'prepared-scene'; readonly sceneId: string; readonly source: 'demonstration-default'}
    | {readonly kind: 'curve-visibility'; readonly target: 'control-polygon' | 'convex-hull' | 'decasteljau-scheme' | 'ph-control-polygon' | 'offset-curve' | 'weights'; readonly visible: boolean}
    | {readonly kind: 'curve-evaluation'; readonly parameter: number}
    | {readonly kind: 'degree-elevation'}
    | {readonly kind: 'affine-transform'; readonly operation: 'translate-x' | 'translate-y' | 'scale' | 'rotate'; readonly value: number}
    | {readonly kind: 'affine-transform'; readonly operation: 'reflect-x' | 'reflect-y'}
    | {readonly kind: 'parameter'; readonly name: 't' | 'offset-distance'; readonly value: number}
    | {readonly kind: 'bernstein-degree'; readonly degree: number}
    | {readonly kind: 'bernstein-stacked-area'; readonly visible: boolean}
    | {readonly kind: 'parameterization-alpha'; readonly value: number}
    | {readonly kind: 'parameterization-samples'; readonly count: number}
    | {readonly kind: 'parameterization-mode'; readonly mode: 'weighted' | 'uniform'}
    | {readonly kind: 'subdivision-parameter'; readonly value: number}
    | {readonly kind: 'subdivide'}
    | {readonly kind: 'extrapolation-parameter'; readonly value: number}
    | {readonly kind: 'extrapolate'}
    | {readonly kind: 'spline-continuity'; readonly value: number}
    | {readonly kind: 'spline-degree'; readonly value: number}
    | {readonly kind: 'spline-beta'; readonly index: number; readonly value: number}
    | {readonly kind: 'spline-label-points'; readonly visible: boolean}
    | {readonly kind: 'spline-hide-fixed'; readonly hidden: boolean}
    | {readonly kind: 'farin-points'; readonly visible: boolean}
    | {readonly kind: 'standard-form'; readonly enabled: boolean}
    | {readonly kind: 'rational-weights'; readonly weights: readonly number[]}
    | {readonly kind: 'circle-pieces'; readonly count: number}
    | {readonly kind: 'animation'; readonly animationId: 'decasteljau'; readonly command: 'play' | 'pause' | 'replay' | 'stop'};

export type LessonFrameKind = 'explanation' | 'calculation' | 'observation';

export interface LessonAnimation {
    readonly animationId: 'decasteljau';
}

export interface LessonScene {
    readonly actions: readonly LessonAction[];
}

export interface LessonStepAction {
    readonly label: LocalizedText;
    readonly action: LessonAction;
}

export interface LessonWorkedExample {
    readonly title: LocalizedText;
    readonly calculation: LocalizedText;
    readonly result: LocalizedText;
    readonly check: LocalizedText;
}

export interface LessonFrame {
    readonly id: string;
    readonly kind: LessonFrameKind;
    readonly title: LocalizedText;
    readonly body?: LocalizedText;
    readonly notation?: readonly LocalizedText[];
    readonly workedExample?: LessonWorkedExample;
    readonly prompt?: LocalizedText;
    readonly animation?: LessonAnimation;
    readonly action?: LessonStepAction;
}

export interface LessonStep {
    readonly id: string;
    readonly title: LocalizedText;
    readonly body: LocalizedText;
    readonly notation?: readonly LocalizedText[];
    readonly workedExample?: LessonWorkedExample;
    readonly prompt?: LocalizedText;
    readonly frames?: readonly LessonFrame[];
    readonly scene?: LessonScene;
    readonly action?: LessonStepAction;
}

/** Keeps the runtime compatible with small lesson fixtures while pilots use explicit frames. */
export function framesForLessonStep(step: LessonStep): readonly LessonFrame[] {
    if (step.frames && step.frames.length > 0) return step.frames;
    return [{
        id: `${step.id}-content`,
        kind: 'explanation',
        title: step.title,
        body: step.body,
        notation: step.notation,
        workedExample: step.workedExample,
        prompt: step.prompt,
        action: step.action,
    }];
}

export interface LessonDefinition {
    readonly id: string;
    readonly demonstrationId: DemonstrationId;
    readonly title: LocalizedText;
    readonly summary: LocalizedText;
    readonly steps: readonly LessonStep[];
}

/** Opaque graph-owned state. Lesson code must not depend on JSXGraph or Preset DTOs. */
export interface LessonSceneCheckpoint {
    readonly version: 1;
    readonly value: unknown;
}

export interface LessonGraphCapabilities {
    captureState(): LessonSceneCheckpoint;
    restoreState(checkpoint: LessonSceneCheckpoint): void;
    apply(action: LessonAction): void;
    /** Cancels graph-owned transient work before lesson state is restored or replaced. */
    stopAnimations?(): void;
    /** Returns false when the owning graph has already been disposed. */
    isAvailable?(): boolean;
}

export class UnsupportedLessonActionError extends Error {
    constructor(readonly action: LessonAction) {
        super(`This demonstration does not support lesson action “${action.kind}”.`);
        this.name = 'UnsupportedLessonActionError';
    }
}
