// Slice 1 of docs/tasks/lesson-authoring-architecture/02-lesson-lookup.md: pins lesson lookup behavior of 2e76896d
// with literal expectations, independent of the representation the refactor introduces.
// Already pinned elsewhere, not repeated here: lessonCatalog.test.ts (adapter output, availability vs content),
// guidedLessonOwnership.test.ts (owner existence, lessonless throw, authoredGuidedLessonIds for patches/bernstein, legacy explore owners),
// guidedExamples.test.ts (patch-basics canonical/legacy routes, family/activity aliases, rejected malformed routes).
import {describe, expect, it} from 'vitest';
import {getDemonstrationCatalog, LESSON_DEMONSTRATION_IDS} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {getChapterOwnedLessons} from '../content/chapterOwnedLessons';
import {getCatalogLessonForDemonstration, getLessonForDemonstration} from '../runtime/lessonCatalog';
import {authoredGuidedLessonIds, getGuidedLessonOwnerForSection, getGuidedLessonOwners, guidedLessonLaunchPath} from './guidedLessonOwnership';
import {resolveGuidedExample} from './guidedExamples';

const BSPLINE = 'b-splines';
const bsplineSections = ['bspline-basis', 'bspline-deboor', 'bspline-insertion', 'bspline-extraction', 'bspline-nurbs', 'bspline-blossom'] as const;

describe('catalog default order', () => {
    it('lists the owners of a Demonstration with several chapter owners in chapter-table then registry order', () => {
        expect(getGuidedLessonOwners('linear-map')).toEqual([
            {chapterId: 'linear-maps', sectionId: 'matrix-and-image'},
            {chapterId: 'linear-maps', sectionId: 'determinant-area'},
            {chapterId: 'linear-maps', sectionId: 'eigen-directions'},
            {chapterId: 'linear-maps', sectionId: 'singular-ellipse'},
            {chapterId: 'linear-maps', sectionId: 'power-method'},
            {chapterId: 'linear-maps', sectionId: 'trace-determinant'},
        ]);
        expect(getGuidedLessonOwners('patch-tensor')).toEqual([
            {chapterId: 'bezier-patches', sectionId: 'curve-to-patch'},
            {chapterId: 'bezier-patches', sectionId: 'bilinear-patch'},
            {chapterId: 'bezier-patches', sectionId: 'control-net'},
            {chapterId: 'bezier-patches', sectionId: 'boundary-iso-curves'},
            {chapterId: 'bezier-patches', sectionId: 'properties'},
        ]);
        expect(getGuidedLessonOwners('patch-triangular')).toEqual([
            {chapterId: 'bezier-patches', sectionId: 'triangular-patches'},
            {chapterId: 'bezier-patches', sectionId: 'square-vs-triangular'},
        ]);
    });

    it('returns the lesson of the first registry key as the default for those Demonstrations', () => {
        expect(getLessonForDemonstration('linear-map')?.id).toBe('linear-map-basis-image');
        expect(getLessonForDemonstration('patch-tensor')?.id).toBe('patch-basics-curve-sweep');
        expect(getLessonForDemonstration('patch-triangular')?.id).toBe('patch-advanced-triangular');
    });

    it('lists primary, additional, family and retained owners in that order for Demonstrations outside the chapter table', () => {
        expect(getGuidedLessonOwners('bezier')).toEqual([
            {chapterId: 'bezier-curves', sectionId: 'control-points'},
            {chapterId: 'bezier-curves', sectionId: 'geometric-properties'},
        ]);
        expect(getGuidedLessonOwners('bernstein')).toEqual([
            {chapterId: 'foundations', sectionId: 'why-weights'},
            {chapterId: 'bezier-curves', sectionId: 'bernstein-form'},
            {chapterId: 'foundations', sectionId: 'reading-bernstein'},
            {chapterId: 'foundations', sectionId: 'worked-weight'},
            {chapterId: 'foundations', sectionId: 'investigate-limits'},
        ]);
        expect(getGuidedLessonOwners('spline-c1')).toEqual([
            {chapterId: 'splines', sectionId: 'continuity-levels'},
            {chapterId: 'splines', sectionId: 'worked-join'},
            {chapterId: 'splines', sectionId: 'investigate-splines'},
        ]);
        expect(getGuidedLessonOwners('fixed-point')).toEqual([
            {chapterId: 'analysis', sectionId: 'convergence'},
            {chapterId: 'analysis', sectionId: 'investigate'},
        ]);
    });
});

describe('B-spline exact-section lookup', () => {
    it('resolves each of the six sections to its own Demonstration and lesson', () => {
        const chapter = getChapterOwnedLessons(BSPLINE);
        expect(chapter).toBeDefined();
        for (const section of bsplineSections) {
            expect(chapter?.lesson(section)?.demonstrationId, section).toBe(section);
            expect(chapter?.lesson(section)?.id, section).toBe(`${section}-guided`);
            expect(getGuidedLessonOwnerForSection(section, BSPLINE, section), section).toEqual({chapterId: BSPLINE, sectionId: section});
            expect(authoredGuidedLessonIds(BSPLINE, section), section).toEqual([section]);
        }
        expect(chapter?.rows().map(([sectionId]) => sectionId)).toEqual([...bsplineSections]);
    });

    it('does not resolve a section against another section Demonstration', () => {
        expect(getGuidedLessonOwnerForSection('bspline-deboor', BSPLINE, 'bspline-basis')).toBeUndefined();
        expect(getGuidedLessonOwnerForSection('bspline-basis', 'linear-maps', 'bspline-basis')).toBeUndefined();
    });

    it('gives the opening section no lesson and no authored lesson ids', () => {
        const chapter = getChapterOwnedLessons(BSPLINE);
        expect(chapter?.lesson('bspline-intro')).toBeUndefined();
        expect(chapter?.path('bspline-intro')).toBeUndefined();
        expect(authoredGuidedLessonIds(BSPLINE, 'bspline-intro')).toEqual([]);
    });

    it('publishes the canonical example path of each section', () => {
        expect(getChapterOwnedLessons(BSPLINE)?.path('bspline-deboor')).toBe('/bezeg-2.0/bspline/deboor?example=lesson.b-splines.bspline-deboor.bspline-deboor');
        expect(getChapterOwnedLessons(BSPLINE)?.path('bspline-nurbs')).toBe('/bezeg-2.0/bspline/nurbs?example=lesson.b-splines.bspline-nurbs.bspline-nurbs');
    });
});

describe('linear maps L1 and L2', () => {
    const chapter = () => getChapterOwnedLessons('linear-maps');

    it('selects distinct lessons on one Demonstration by exact section', () => {
        expect(chapter()?.lesson('matrix-and-image')?.id).toBe('linear-map-basis-image');
        expect(chapter()?.lesson('determinant-area')?.id).toBe('linear-map-determinant-area');
        expect(chapter()?.lesson('matrix-and-image')?.demonstrationId).toBe('linear-map');
        expect(chapter()?.lesson('determinant-area')?.demonstrationId).toBe('linear-map');
        expect(chapter()?.rows().map(([sectionId]) => sectionId)).toEqual(['matrix-and-image', 'determinant-area', 'eigen-directions', 'singular-ellipse', 'power-method', 'trace-determinant']);
        expect(getGuidedLessonOwnerForSection('linear-map', 'linear-maps', 'determinant-area')).toEqual({chapterId: 'linear-maps', sectionId: 'determinant-area'});
        expect(authoredGuidedLessonIds('linear-maps', 'matrix-and-image')).toEqual(['linear-map']);
        expect(authoredGuidedLessonIds('linear-maps', 'determinant-area')).toEqual(['linear-map']);
    });

    it('defaults to L1 and launches L1 first', () => {
        expect(getLessonForDemonstration('linear-map')).toBe(chapter()?.lesson('matrix-and-image'));
        expect(guidedLessonLaunchPath('linear-map')).toBe('/bezeg-2.0/linear-map?learn=1&learnChapter=linear-maps&learnSection=matrix-and-image');
    });

    it('resolves each section through learn= and rejects an unknown section', () => {
        expect(resolveGuidedExample('?learn=1&learnChapter=linear-maps&learnSection=determinant-area', 'linear-map'))
            .toMatchObject({lesson: {id: 'linear-map-determinant-area'}, owner: {chapterId: 'linear-maps', sectionId: 'determinant-area'}});
        expect(resolveGuidedExample('?learn=1&learnChapter=linear-maps&learnSection=matrix-and-image', 'linear-map'))
            .toMatchObject({lesson: {id: 'linear-map-basis-image'}, owner: {chapterId: 'linear-maps', sectionId: 'matrix-and-image'}});
        expect(resolveGuidedExample('?learn=1&learnChapter=linear-maps&learnSection=determinant', 'linear-map')).toBeUndefined();
    });
});

describe('fallback and unavailable lessons', () => {
    it('returns the catalog-adapted lesson for a lesson Demonstration with no chapter-owned lesson', () => {
        for (const [id, lessonId] of [['bezier', 'bezier-pilot'], ['bernstein', 'bernstein-guided'], ['spline-c1', 'spline-c1-guided']] as const) {
            expect(getLessonForDemonstration(id)?.id, id).toBe(lessonId);
            expect(getCatalogLessonForDemonstration(id)?.id, id).toBe(lessonId);
            expect(getLessonForDemonstration(id), id).toBe(getCatalogLessonForDemonstration(id));
        }
    });

    it('returns undefined for every Demonstration that opts out of lessons', () => {
        // Only the trigonometry, line-geometry, isometry (now chapter-owned), circle-construction (now chapter-owned), combinatorics (now chapter-owned), simulation, recursion, solids, contour-map, linear-program, complex-power and complex-euler rows opt out (families-prep F3 gives them lessons); the unknown id covers the missing case.
        const lessonless = getDemonstrationCatalog().demonstrations.map(entry => entry.id).filter(id => !LESSON_DEMONSTRATION_IDS.includes(id));
        expect(lessonless).toEqual(['complex-power', 'complex-euler', 'recursion-cobweb', 'contour-map']);
        for (const id of lessonless) {
            expect(getLessonForDemonstration(id), id).toBeUndefined();
            expect(getCatalogLessonForDemonstration(id), id).toBeUndefined();
        }
        const unknown = 'no-such-demonstration' as DemonstrationId;
        expect(getLessonForDemonstration(unknown)).toBeUndefined();
        expect(getCatalogLessonForDemonstration(unknown)).toBeUndefined();
    });
});

describe('launch paths and example resolution', () => {
    it('builds launch paths from the primary owner', () => {
        expect(guidedLessonLaunchPath('bezier')).toBe('/bezeg-2.0/bezier/curve?learn=1&learnChapter=bezier-curves&learnSection=control-points');
        expect(guidedLessonLaunchPath('bspline-basis')).toBe('/bezeg-2.0/bspline/basis?learn=1&learnChapter=b-splines&learnSection=bspline-basis');
        expect(guidedLessonLaunchPath('bernstein')).toBe('/bezeg-2.0/bernstein?learn=1&learnChapter=foundations&learnSection=reading-bernstein');
        expect(guidedLessonLaunchPath('patch-tensor')).toBe('/bezeg-2.0/patches/tensor?learn=1&learnChapter=bezier-patches&learnSection=curve-to-patch');
        expect(guidedLessonLaunchPath('fixed-point')).toBe('/bezeg-2.0/analysis/fixed-point?learn=1&learnChapter=analysis&learnSection=convergence');
        expect(guidedLessonLaunchPath('complex-roots')).toBe('/bezeg-2.0/complex-roots?learn=1&learnChapter=complex-maps&learnSection=roots');
        expect(guidedLessonLaunchPath('triangle-centres')).toBe('/bezeg-2.0/triangle-centres?learn=1&learnChapter=triangle-geometry&learnSection=notable-points');
    });

    it('builds a launch path for a requested owner and falls back to the primary one for a foreign owner', () => {
        expect(guidedLessonLaunchPath('linear-map', {chapterId: 'linear-maps', sectionId: 'determinant-area'}))
            .toBe('/bezeg-2.0/linear-map?learn=1&learnChapter=linear-maps&learnSection=determinant-area');
        expect(guidedLessonLaunchPath('linear-map', {chapterId: 'b-splines', sectionId: 'bspline-basis'}))
            .toBe('/bezeg-2.0/linear-map?learn=1&learnChapter=linear-maps&learnSection=matrix-and-image');
    });

    const cases: readonly (readonly [label: string, search: string, id: DemonstrationId, lessonId: string | undefined, owner: {chapterId: string; sectionId: string} | undefined])[] = [
        ['plain learn, fallback lesson', '?learn=1', 'bezier', 'bezier-pilot', {chapterId: 'bezier-curves', sectionId: 'control-points'}],
        ['plain learn, chapter-owned lesson', '?learn=1', 'bezier-hulls', 'bezier-hulls-guided', {chapterId: 'convexity-hulls', sectionId: 'bezier-hulls'}],
        ['plain learn, static registry', '?learn=1', 'triangle-centres', 'triangle-notable-points', {chapterId: 'triangle-geometry', sectionId: 'notable-points'}],
        ['plain learn, default owner of a shared Demonstration', '?learn=1', 'linear-map', 'linear-map-basis-image', {chapterId: 'linear-maps', sectionId: 'matrix-and-image'}],
        ['learn with B-spline section', '?learn=1&learnChapter=b-splines&learnSection=bspline-deboor', 'bspline-deboor', 'bspline-deboor-guided', {chapterId: 'b-splines', sectionId: 'bspline-deboor'}],
        ['learn with wrong section of a chapter-owned chapter', '?learn=1&learnChapter=b-splines&learnSection=bspline-basis', 'bspline-deboor', undefined, undefined],
        ['learn with retained section', '?learn=1&learnChapter=analysis&learnSection=convergence', 'fixed-point', 'fixed-point-guided', {chapterId: 'analysis', sectionId: 'convergence'}],
        ['canonical example, chapter-owned', '?example=lesson.b-splines.bspline-deboor.bspline-deboor', 'bspline-deboor', 'bspline-deboor-guided', {chapterId: 'b-splines', sectionId: 'bspline-deboor'}],
        ['canonical example, linear-map L2', '?example=lesson.linear-maps.determinant-area.linear-map', 'linear-map', 'linear-map-determinant-area', {chapterId: 'linear-maps', sectionId: 'determinant-area'}],
        ['canonical example, fallback lesson', '?example=lesson.bezier-curves.control-points.bezier', 'bezier', 'bezier-pilot', {chapterId: 'bezier-curves', sectionId: 'control-points'}],
        ['canonical example, retained lesson', '?example=lesson.analysis.convergence.sequence', 'sequence', 'sequence-guided', {chapterId: 'analysis', sectionId: 'convergence'}],
        ['canonical example, recursion RG1', '?example=lesson.recursion.sequences.recursion-growth', 'recursion-growth', 'recursion-sequences', {chapterId: 'recursion', sectionId: 'sequences'}],
        ['canonical example, recursion RG3', '?example=lesson.recursion.compound-interest.recursion-growth', 'recursion-growth', 'recursion-interest', {chapterId: 'recursion', sectionId: 'compound-interest'}],
        ['canonical example, solids SV1', '?example=lesson.solids.cube-sections.solids', 'solids', 'solids-cube-sections', {chapterId: 'solids', sectionId: 'cube-sections'}],
        ['canonical example, solids SV2', '?example=lesson.solids.pyramid-sections.solids', 'solids', 'solids-pyramid-sections', {chapterId: 'solids', sectionId: 'pyramid-sections'}],
        ['canonical example, phase portraits PP1', '?example=lesson.phase-portraits.linear-system.phase-portrait', 'phase-portrait', 'phase-portraits-linear-system', {chapterId: 'phase-portraits', sectionId: 'linear-system'}],
        ['canonical example, phase portraits PP2', '?example=lesson.phase-portraits.pendulum.phase-portrait', 'phase-portrait', 'phase-portraits-pendulum', {chapterId: 'phase-portraits', sectionId: 'pendulum'}],
        ['canonical example, phase portraits PP3', '?example=lesson.phase-portraits.linearization.phase-portrait', 'phase-portrait', 'phase-portraits-linearization', {chapterId: 'phase-portraits', sectionId: 'linearization'}],
        ['canonical example, phase portraits PP4', '?example=lesson.phase-portraits.logistic-map.logistic-map', 'logistic-map', 'phase-portraits-logistic-map', {chapterId: 'phase-portraits', sectionId: 'logistic-map'}],
        ['canonical example, phase portraits PP5', '?example=lesson.phase-portraits.bifurcation.logistic-map', 'logistic-map', 'phase-portraits-bifurcation', {chapterId: 'phase-portraits', sectionId: 'bifurcation'}],
        ['canonical example, level sets LS5', '?example=lesson.level-sets.linear-programming.linear-program', 'linear-program', 'level-sets-linear-programming', {chapterId: 'level-sets', sectionId: 'linear-programming'}],
        ['canonical example, randomness RS1', '?example=lesson.randomness.galton-board.prob-simulation', 'prob-simulation', 'randomness-galton', {chapterId: 'randomness', sectionId: 'galton-board'}],
        ['canonical example, randomness RS2', '?example=lesson.randomness.law-of-large-numbers.prob-simulation', 'prob-simulation', 'randomness-large-numbers', {chapterId: 'randomness', sectionId: 'law-of-large-numbers'}],
        ['canonical family example', '?example=family.splines.worked-join.spline-c1', 'spline-c1', 'explore-splines-worked-join-spline-c1', {chapterId: 'splines', sectionId: 'worked-join'}],
        ['legacy activity alias example', '?example=activity.bezier-curves.control-points.bezier', 'bezier', 'bezier-pilot', {chapterId: 'bezier-curves', sectionId: 'control-points'}],
        ['legacy chapter and activity', '?chapter=bezier-curves&activity=curve-parameter', 'decasteljau', 'activity-curve-parameter', {chapterId: 'bezier-curves', sectionId: 'parameter'}],
        ['legacy explore', '?explore=splines.worked-join.spline-c1', 'spline-c1', 'explore-splines-worked-join-spline-c1', {chapterId: 'splines', sectionId: 'worked-join'}],
        ['explore naming an owner without a retained home', '?explore=bezier-curves.bernstein-form.bernstein', 'bernstein', undefined, undefined],
        ['example for the wrong Demonstration', '?example=lesson.b-splines.bspline-deboor.bspline-deboor', 'bspline-basis', undefined, undefined],
        ['no query', '', 'bezier', undefined, undefined],
    ];

    it.each(cases)('resolves %s', (_label, search, id, lessonId, owner) => {
        const resolved = resolveGuidedExample(search, id);
        expect(resolved?.lesson.id).toBe(lessonId);
        expect(resolved?.owner).toEqual(owner);
    });
});
