import {guidedLessonPreviewCopyByDemonstration as lessonCopy, type GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

/** The chapter's cards show each lesson's first frame, which is what the lesson preview copy describes, keyed by example id. */
export const advancedBezierPreviewCopy = {
    'advanced-bezier.reduction.reduction': lessonCopy.reduction,
    'advanced-bezier.arc-length-param.arc-length-param': lessonCopy['arc-length-param'],
    'advanced-bezier.bezier-clipping.bezier-clipping': lessonCopy['bezier-clipping'],
    'advanced-bezier.patch-coons.patch-coons': lessonCopy['patch-coons'],
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
