import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import type {CatalogSectionLessons} from './catalogSectionLessons';
import {complexMapsGuidedExamplePath, complexMapsGuidedExampleRegistry, COMPLEX_MAPS_CHAPTER_ID} from './complexMapsChapterRegistry';
import {CONVEXITY_CHAPTER_ID} from './convexityChapterId';
import {TRIANGULATION_CHAPTER_ID} from './triangulationChapterId';
import {SWEEP_CHAPTER_ID} from './sweepChapterId';
import {NUMERICAL_CHAPTER_ID} from './numericalChapterId';
import {FOURIER_CHAPTER_ID} from './fourierChapterId';
import {PROJECTIVE_CONICS_CHAPTER_ID} from './projectiveConicsChapterId';
import {BSPLINE_CHAPTER_ID} from './bsplineChapterId';
import {CURVE_GEOMETRY_CHAPTER_ID} from './curveGeometryChapterId';
import {ADVANCED_BEZIER_CHAPTER_ID} from './advancedBezierChapterId';
import {INTERPOLATION_CHAPTER_ID} from './interpolationChapterId';
import {PROBABILITY_CHAPTER_ID} from './probabilityChapterId';
import {SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID} from './schoolFunctionGraphsChapterId';
import {convexityGuidedExampleLessons, convexityGuidedExamplePath} from './convexityChapterRegistry';
import {triangulationGuidedExampleLessons, triangulationGuidedExamplePath} from './triangulationChapterRegistry';
import {sweepGuidedExampleLessons, sweepGuidedExamplePath} from './sweepChapterRegistry';
import {numericalGuidedExampleLessons, numericalGuidedExamplePath} from './numericalChapterRegistry';
import {fourierGuidedExampleLessons, fourierGuidedExamplePath} from './fourierChapterRegistry';
import {projectiveConicsGuidedExampleLessons, projectiveConicsGuidedExamplePath} from './projectiveConicsChapterRegistry';
import {bsplineGuidedExampleLessons, bsplineGuidedExamplePath} from './bsplineChapterRegistry';
import {curveGeometryGuidedExampleLessons, curveGeometryGuidedExamplePath} from './curveGeometryChapterRegistry';
import {advancedBezierGuidedExampleLessons, advancedBezierGuidedExamplePath} from './advancedBezierChapterRegistry';
import {interpolationGuidedExampleLessons, interpolationGuidedExamplePath} from './interpolationChapterRegistry';
import {probabilityGuidedExampleLessons, probabilityGuidedExamplePath} from './probabilityChapterRegistry';
import {schoolFunctionGraphsGuidedExampleLessons, schoolFunctionGraphsGuidedExamplePath} from './schoolFunctionGraphsChapterRegistry';
import {linearMapsGuidedExamplePath, linearMapsGuidedExampleRegistry, LINEAR_MAPS_CHAPTER_ID} from './linearMapsChapterRegistry';
import {triangleGeometryGuidedExamplePath, triangleGeometryGuidedExampleRegistry, TRIANGLE_GEOMETRY_CHAPTER_ID} from './triangleGeometryChapterRegistry';
import {trigonometryGuidedExampleDemonstrations, trigonometryGuidedExampleLesson, trigonometryGuidedExamplePath, TRIGONOMETRY_CHAPTER_ID, type TrigonometrySectionId} from './trigonometryChapterRegistry';
import {mechanicalCurvesGuidedExampleDemonstrations, mechanicalCurvesGuidedExampleLesson, mechanicalCurvesGuidedExamplePath, MECHANICAL_CURVES_CHAPTER_ID, type MechanicalCurvesSectionId} from './mechanicalCurvesChapterRegistry';
import {kinematicsGuidedExampleDemonstrations, kinematicsGuidedExampleLesson, kinematicsGuidedExamplePath, KINEMATICS_CHAPTER_ID, type KinematicsSectionId} from './kinematicsChapterRegistry';
import {combinatoricsGuidedExampleDemonstrations, combinatoricsGuidedExampleLesson, combinatoricsGuidedExamplePath, COMBINATORICS_CHAPTER_ID, type CombinatoricsSectionId} from './combinatoricsChapterRegistry';
import {circleGeometryGuidedExampleDemonstrations, circleGeometryGuidedExampleLesson, circleGeometryGuidedExamplePath, CIRCLE_GEOMETRY_CHAPTER_ID, type CircleGeometrySectionId} from './circleGeometryChapterRegistry';
import {analyticLinesGuidedExampleDemonstrations, analyticLinesGuidedExampleLesson, analyticLinesGuidedExamplePath, ANALYTIC_LINES_CHAPTER_ID, type AnalyticLinesSectionId} from './analyticLinesChapterRegistry';
import {isometriesGuidedExampleDemonstrations, isometriesGuidedExampleLesson, isometriesGuidedExamplePath, ISOMETRIES_CHAPTER_ID, type IsometriesSectionId} from './isometriesChapterRegistry';
import {patchGuidedExamplePath, patchGuidedExampleRegistry} from './patchGuidedExampleRegistry';

export interface ChapterOwnedLessons {
    /** `authored`: the registry holds the definitions. `catalog`: each section adapts reviewed catalog content on request. */
    readonly source: 'authored' | 'catalog';
    /** The owned sections and their Demonstrations, in teaching order. Reading them adapts no lesson. */
    rows(): readonly (readonly [sectionId: string, demonstrationId: DemonstrationId])[];
    /** The lesson owned by a section, or undefined when the section owns none. Only this resolves a lesson. */
    lesson(sectionId: string): LessonDefinition | undefined;
    /** The launch path of the section's lesson, or undefined when the section owns none. */
    path(sectionId: string): string | undefined;
}

/** A chapter whose lessons are authored in its own registry; the definitions already exist, so the rows read them. */
function ownedLessons<Id extends string>(registry: Readonly<Record<Id, LessonDefinition>>, pathOf: (sectionId: Id) => string): ChapterOwnedLessons {
    const isSection = (sectionId: string): sectionId is Id => Object.prototype.hasOwnProperty.call(registry, sectionId);
    const rows = Object.entries<LessonDefinition>(registry).map(([sectionId, lesson]) => [sectionId, lesson.demonstrationId] as const);
    return {
        source: 'authored',
        rows: () => rows,
        lesson: sectionId => isSection(sectionId) ? registry[sectionId] : undefined,
        path: sectionId => isSection(sectionId) ? pathOf(sectionId) : undefined,
    };
}

/** A chapter whose authored lessons are built on request (adapted from catalog-format content): the rows are cheap, a definition is created only by `lesson`. */
function lazyOwnedLessons<Id extends string>(demonstrations: Readonly<Record<Id, DemonstrationId>>, lessonOf: (sectionId: Id) => LessonDefinition, pathOf: (sectionId: Id) => string): ChapterOwnedLessons {
    const isSection = (sectionId: string): sectionId is Id => Object.prototype.hasOwnProperty.call(demonstrations, sectionId);
    const rows = Object.entries<DemonstrationId>(demonstrations).map(([sectionId, demonstrationId]) => [sectionId, demonstrationId] as const);
    return {
        source: 'authored',
        rows: () => rows,
        lesson: sectionId => isSection(sectionId) ? lessonOf(sectionId) : undefined,
        path: sectionId => isSection(sectionId) ? pathOf(sectionId) : undefined,
    };
}

/** A chapter whose sections reuse the reviewed catalog content: the rows are its section table, and a lesson is adapted only on request. */
function catalogOwnedLessons<Id extends string>(source: CatalogSectionLessons<Id>, pathOf: (sectionId: Id) => string): ChapterOwnedLessons {
    const isSection = (sectionId: string): sectionId is Id => Object.prototype.hasOwnProperty.call(source.demonstrations, sectionId);
    const rows = Object.entries<DemonstrationId>(source.demonstrations).map(([sectionId, demonstrationId]) => [sectionId, demonstrationId] as const);
    return {
        source: 'catalog',
        rows: () => rows,
        lesson: sectionId => isSection(sectionId) ? source.lesson(sectionId) : undefined,
        path: sectionId => isSection(sectionId) ? pathOf(sectionId) : undefined,
    };
}

/** Chapters whose activities are authored in the chapter itself. A later family adds one entry here. */
export const chapterOwnedLessons: Readonly<Record<string, ChapterOwnedLessons>> = {
    'bezier-patches': ownedLessons(patchGuidedExampleRegistry, patchGuidedExamplePath),
    [LINEAR_MAPS_CHAPTER_ID]: ownedLessons(linearMapsGuidedExampleRegistry, linearMapsGuidedExamplePath),
    [CONVEXITY_CHAPTER_ID]: catalogOwnedLessons(convexityGuidedExampleLessons, convexityGuidedExamplePath),
    [TRIANGULATION_CHAPTER_ID]: catalogOwnedLessons(triangulationGuidedExampleLessons, triangulationGuidedExamplePath),
    [SWEEP_CHAPTER_ID]: catalogOwnedLessons(sweepGuidedExampleLessons, sweepGuidedExamplePath),
    [NUMERICAL_CHAPTER_ID]: catalogOwnedLessons(numericalGuidedExampleLessons, numericalGuidedExamplePath),
    [FOURIER_CHAPTER_ID]: catalogOwnedLessons(fourierGuidedExampleLessons, fourierGuidedExamplePath),
    [BSPLINE_CHAPTER_ID]: catalogOwnedLessons(bsplineGuidedExampleLessons, bsplineGuidedExamplePath),
    [CURVE_GEOMETRY_CHAPTER_ID]: catalogOwnedLessons(curveGeometryGuidedExampleLessons, curveGeometryGuidedExamplePath),
    [ADVANCED_BEZIER_CHAPTER_ID]: catalogOwnedLessons(advancedBezierGuidedExampleLessons, advancedBezierGuidedExamplePath),
    [INTERPOLATION_CHAPTER_ID]: catalogOwnedLessons(interpolationGuidedExampleLessons, interpolationGuidedExamplePath),
    [PROBABILITY_CHAPTER_ID]: catalogOwnedLessons(probabilityGuidedExampleLessons, probabilityGuidedExamplePath),
    [SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID]: catalogOwnedLessons(schoolFunctionGraphsGuidedExampleLessons, schoolFunctionGraphsGuidedExamplePath),
    [COMPLEX_MAPS_CHAPTER_ID]: ownedLessons(complexMapsGuidedExampleRegistry, complexMapsGuidedExamplePath),
    [TRIANGLE_GEOMETRY_CHAPTER_ID]: ownedLessons(triangleGeometryGuidedExampleRegistry, triangleGeometryGuidedExamplePath),
    [PROJECTIVE_CONICS_CHAPTER_ID]: catalogOwnedLessons(projectiveConicsGuidedExampleLessons, projectiveConicsGuidedExamplePath),
    [TRIGONOMETRY_CHAPTER_ID]: lazyOwnedLessons<TrigonometrySectionId>(trigonometryGuidedExampleDemonstrations, trigonometryGuidedExampleLesson, trigonometryGuidedExamplePath),
    [ANALYTIC_LINES_CHAPTER_ID]: lazyOwnedLessons<AnalyticLinesSectionId>(analyticLinesGuidedExampleDemonstrations, analyticLinesGuidedExampleLesson, analyticLinesGuidedExamplePath),
    [CIRCLE_GEOMETRY_CHAPTER_ID]: lazyOwnedLessons<CircleGeometrySectionId>(circleGeometryGuidedExampleDemonstrations, circleGeometryGuidedExampleLesson, circleGeometryGuidedExamplePath),
    [KINEMATICS_CHAPTER_ID]: lazyOwnedLessons<KinematicsSectionId>(kinematicsGuidedExampleDemonstrations, kinematicsGuidedExampleLesson, kinematicsGuidedExamplePath),
    [MECHANICAL_CURVES_CHAPTER_ID]: lazyOwnedLessons<MechanicalCurvesSectionId>(mechanicalCurvesGuidedExampleDemonstrations, mechanicalCurvesGuidedExampleLesson, mechanicalCurvesGuidedExamplePath),
    [COMBINATORICS_CHAPTER_ID]: lazyOwnedLessons<CombinatoricsSectionId>(combinatoricsGuidedExampleDemonstrations, combinatoricsGuidedExampleLesson, combinatoricsGuidedExamplePath),
    [ISOMETRIES_CHAPTER_ID]: lazyOwnedLessons<IsometriesSectionId>(isometriesGuidedExampleDemonstrations, isometriesGuidedExampleLesson, isometriesGuidedExamplePath),
};

export function getChapterOwnedLessons(chapterId: string): ChapterOwnedLessons | undefined {
    return Object.prototype.hasOwnProperty.call(chapterOwnedLessons, chapterId) ? chapterOwnedLessons[chapterId] : undefined;
}

export type ChapterOwnerRow = Readonly<{chapterId: string; sectionId: string; demonstrationId: DemonstrationId}>;

let ownerRows: readonly ChapterOwnerRow[] | undefined;

/** Every chapter-owned section in default order: chapter table order, then teaching order within the chapter. Built once; adapts no lesson. */
export function chapterOwnerRows(): readonly ChapterOwnerRow[] {
    ownerRows ??= Object.entries(chapterOwnedLessons).flatMap(([chapterId, chapter]) =>
        chapter.rows().map(([sectionId, demonstrationId]) => ({chapterId, sectionId, demonstrationId})));
    return ownerRows;
}

/** The Demonstration of a chapter-owned section, or undefined when the section owns none. Adapts no lesson. */
export function chapterOwnedDemonstration(chapterId: string, sectionId: string): DemonstrationId | undefined {
    return getChapterOwnedLessons(chapterId)?.rows().find(([id]) => id === sectionId)?.[1];
}

/**
 * The first chapter-owned lesson on Demonstration `id` in default order. When a chapter has several lessons on one Demonstration
 * (`linear-map` has L1 and L2), this is the first section's, so registries list sections in teaching order. Only the selected
 * section's lesson is resolved.
 */
export function findChapterOwnedLessonByDemonstration(id: DemonstrationId): LessonDefinition | undefined {
    const row = chapterOwnerRows().find(item => item.demonstrationId === id);
    return row && chapterOwnedLessons[row.chapterId].lesson(row.sectionId);
}
