import {describe, expect, it} from 'vitest';
import {activities} from '../chapter/activities';
import {GUIDED_LESSON_AVAILABLE_IDS} from '../runtime/lessonAvailability';
import {
    guidedActivityPreviewCopyById,
    guidedLessonPreviewCopyByDemonstration,
    workedParabolaJoinPreviewCopy,
} from './guidedExamplePreviewCopy';

const allCopy = [
    ...Object.values(guidedLessonPreviewCopyByDemonstration),
    ...Object.values(guidedActivityPreviewCopyById),
    workedParabolaJoinPreviewCopy,
];

describe('guided example preview copy', () => {
    it('provides a bilingual alt and observation caption for every available lesson and activity', () => {
        const lessonIds = Object.keys(guidedLessonPreviewCopyByDemonstration);
        const missingLessonCopy = GUIDED_LESSON_AVAILABLE_IDS.filter(id => !Object.hasOwn(guidedLessonPreviewCopyByDemonstration, id));
        const activityIds = activities.map(activity => activity.id);
        const missingActivityCopy = activityIds.filter(id => !Object.hasOwn(guidedActivityPreviewCopyById, id));

        expect(GUIDED_LESSON_AVAILABLE_IDS).toHaveLength(45);
        expect(lessonIds).toHaveLength(GUIDED_LESSON_AVAILABLE_IDS.length);
        expect(missingLessonCopy).toEqual([]);
        expect(Object.keys(guidedActivityPreviewCopyById)).toHaveLength(6);
        expect(missingActivityCopy).toEqual([]);
        expect(allCopy).toHaveLength(52);

        for (const item of allCopy) {
            for (const language of ['sl', 'en'] as const) {
                expect(item.alt[language].trim()).not.toBe('');
                expect(item.caption[language].trim()).not.toBe('');
            }
        }
    });

    it('keeps any formula delimiters balanced in the bilingual captions', () => {
        for (const item of allCopy) {
            for (const language of ['sl', 'en'] as const) {
                const prose = item.caption[language];
                expect(prose.split('\\(').length - 1).toBe(prose.split('\\)').length - 1);
                expect(prose.split('\\[').length - 1).toBe(prose.split('\\]').length - 1);
            }
        }
    });

    it('returns no entry for a missing demonstration instead of implying copy exists', () => {
        expect(Object.hasOwn(guidedLessonPreviewCopyByDemonstration, 'unavailable-example')).toBe(false);
    });

    it('describes the captured opening scenes rather than later construction states', () => {
        const fixedPoint = guidedLessonPreviewCopyByDemonstration['fixed-point'];
        expect(fixedPoint.alt.sl).toContain('začetni približek');
        expect(fixedPoint.caption.sl).toContain('iteracijska pot še ni prikazana');

        expect(guidedLessonPreviewCopyByDemonstration.bezier.alt.sl).not.toContain('koordinatni mreži');
        expect(guidedLessonPreviewCopyByDemonstration.bezier.alt.en).not.toContain('coordinate grid');
        expect(guidedLessonPreviewCopyByDemonstration.subdivision.caption.en).toContain('split into two subcurves');
    });

    it('describes the actual captured derivative, accumulation, PH, and rational subdivision scenes', () => {
        const derivative = guidedLessonPreviewCopyByDemonstration.derivative;
        expect(derivative.alt.sl).toContain('sekanto');
        expect(derivative.alt.sl).toContain('\\(x=1\\)');
        expect(derivative.alt.en).toContain('the secant');
        expect(derivative.alt.en).toContain('\\(x=2\\)');
        expect(derivative.caption.sl).toContain('naklon \\(3\\)');
        expect(derivative.caption.en).toContain('slope \\(3\\)');
        expect(derivative.caption.en).toContain('tangent slope');

        const accumulation = guidedLessonPreviewCopyByDemonstration.accumulation;
        expect(accumulation.alt.sl).toContain('graf \\(A(x)\\) je skrit');
        expect(accumulation.alt.sl).toContain('\\sin x');
        expect(accumulation.alt.en).toContain('graph of \\(A(x)\\) is hidden');
        expect(accumulation.alt.en).toContain('\\sin x');
        expect(accumulation.caption.sl).toContain('Osenčeno območje');
        expect(accumulation.caption.en).toContain('shaded area');

        for (const id of ['ph-cubic', 'ph-quintic'] as const) {
            expect(guidedLessonPreviewCopyByDemonstration[id].alt.sl).toContain('kontrolnimi točkami');
            expect(guidedLessonPreviewCopyByDemonstration[id].alt.en).toContain('control points');
            expect(guidedLessonPreviewCopyByDemonstration[id].alt.sl).not.toContain('koordinatni mreži');
            expect(guidedLessonPreviewCopyByDemonstration[id].alt.en).not.toContain('coordinate grid');
        }

        const rationalSubdivision = guidedLessonPreviewCopyByDemonstration['rational-subdivision'];
        expect(rationalSubdivision.alt.sl).toContain('razdeljena na dva odseka');
        expect(rationalSubdivision.alt.en).toContain('split into two pieces');
        expect(rationalSubdivision.caption.sl).toContain('prikazujejo razdelitev');
        expect(rationalSubdivision.caption.en).toContain('show the subdivision');

        const symmetricSpline = guidedLessonPreviewCopyByDemonstration['spline-g1-symmetric'];
        expect(symmetricSpline.alt.sl).not.toContain('Simetrični');
        expect(symmetricSpline.alt.en).not.toContain('symmetric');
        expect(symmetricSpline.alt.sl).toContain('kontrolnim poligonom');
        expect(symmetricSpline.alt.en).toContain('control polygon');
        expect(symmetricSpline.caption.sl).toContain('geometrijski stik');
        expect(symmetricSpline.caption.en).toContain('geometric join');
    });

    it('keeps the worked parabola join copy scene-specific and bilingual', () => {
        expect(workedParabolaJoinPreviewCopy.caption.sl).toContain('prva in druga odvoda');
        expect(workedParabolaJoinPreviewCopy.caption.en).toContain('first and second derivatives');
        expect(workedParabolaJoinPreviewCopy.alt.sl).toContain('skupni točki');
        expect(workedParabolaJoinPreviewCopy.alt.en).toContain('shared point');
    });
});
