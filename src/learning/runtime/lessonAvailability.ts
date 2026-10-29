import type {DemonstrationId} from '../../demonstrations';

/** Lightweight support metadata used by catalog and homepage links. */
export const GUIDED_LESSON_AVAILABLE_IDS = [
    'bezier', 'decasteljau', 'affine', 'elevation', 'rational', 'rational-decasteljau',
    'ph-cubic', 'ph-quintic', 'bernstein', 'rational-elevation', 'weighted-parameterization',
    'uniform-parameterization', 'subdivision', 'repeated-subdivision', 'rational-subdivision',
    'extrapolation', 'rational-extrapolation', 'decasteljau-alternative', 'farin', 'circle',
    'spline-cn', 'spline-c1', 'spline-c2', 'spline-g1', 'spline-g1-symmetric',
    'spline-parameterization', 'linear-function', 'exponential-function', 'trigonometric-functions',
    'continuity', 'derivative', 'definite-integral', 'area-between-curves', 'arc-length', 'bisection',
    'mean-value', 'accumulation', 'darboux', 'extrema', 'convexity', 'taylor', 'sequence',
    'uniform-convergence', 'complex-multiplication', 'fixed-point',
    'patch-tensor', 'patch-decasteljau', 'patch-derivatives',
    'patch-subdivision', 'patch-joins', 'patch-triangular',
] as const satisfies readonly DemonstrationId[];

const availableLessonIds = new Set<DemonstrationId>(GUIDED_LESSON_AVAILABLE_IDS);

export function isGuidedLessonAvailable(id: DemonstrationId): boolean {
    return availableLessonIds.has(id);
}
