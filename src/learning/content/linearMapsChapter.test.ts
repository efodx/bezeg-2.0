import {LinearMapGraph} from '../../graphs/linear/LinearMapGraph';
import {bezierPoint, FIXTURE_CONTROL_POINTS, imageControlPoints, shoelace} from '../../graphs/linear/linearMapScene';
import {apply, det, LINEAR_MAP_EXAMPLES, type Mat2, unitSquareImage} from '../../linear/matrix2';
import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {authoredGuidedLessonIds, getGuidedLessonOwners, guidedLessonLaunchPath} from '../chapter/guidedLessonOwnership';
import type {LessonDefinition} from '../model';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {linearMapsChapter} from './linearMapsChapter';
import {LINEAR_MAPS_CHAPTER_ID, linearMapsGuidedExamplePath, linearMapsGuidedExampleRegistry} from './linearMapsChapterRegistry';
import {learningChapters} from '../learningChapters';

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[], unitX: 50, canvasWidth: 700,
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>};
            if (type === 'point') {
                const free = parents.every((parent: unknown) => typeof parent === 'number');
                object.x = free ? parents[0] : undefined;
                object.y = free ? parents[1] : undefined;
                object.X = () => (free ? object.x : parents[0]());
                object.Y = () => (free ? object.y : parents[1]());
                object.moveTo = vi.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                object.on = vi.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: vi.fn(() => [-12, 9, 12, -9]), setBoundingBox: vi.fn(), fullUpdate: vi.fn(), update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
function makeGraph() {
    const graph = new LinearMapGraph() as any;
    graph.board = fakeBoard();
    const session: any = {
        isReady: true, isAlive: true, dispose: vi.fn(), signal: new AbortController().signal,
        waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
    };
    graph.graphSession = session;
    graph.boardUpdate = vi.fn();
    graph.initialize();
    return graph;
}

function collect(node: any, found: Record<string, any[]> = {}) {
    if (!node || typeof node !== 'object') return found;
    if (Array.isArray(node)) { node.forEach(child => collect(child, found)); return found; }
    const name = typeof node.type === 'string' ? node.type : node.type?.name;
    if (name) (found[name] ??= []).push(node);
    collect(node.props?.children, found);
    return found;
}
const readout = (graph: any, id: string): string | undefined => {
    const rows = collect(graph.renderReadout()).FunctionReadout[0].props.rows as {id: string; value: string}[];
    return rows.find(row => row.id === id)?.value;
};
const statusIds = (graph: any): string[] =>
    (collect(graph.renderReadout()).FunctionStatus[0].props.lines as {id: string}[]).map(line => line.id);

/** Runs the actions of one lesson step in one synchronous tick, as the lesson runtime does. */
const runStep = (graph: any, lesson: LessonDefinition, stepId: string) => {
    const step = lesson.steps.find(item => item.id === stepId);
    if (!step?.scene) throw new Error(`The lesson ${lesson.id} has no scene step ${stepId}.`);
    for (const action of step.scene.actions) graph.applyLessonAction(action);
    // What the host does after the commit: the inspector renders the model.
    graph.store.setState({...graph.model});
};

const A = LINEAR_MAP_EXAMPLES['basis-default'];
const B = LINEAR_MAP_EXAMPLES['orientation-reversing'];
const C = LINEAR_MAP_EXAMPLES.singular;
const E = LINEAR_MAP_EXAMPLES['eigen-default'];

interface StepExpectation {
    matrix: Mat2;
    mode: 'basis' | 'determinant';
    readouts: Record<string, string>;
    statuses: string[];
}

// Every step of both lessons has an expectation: a missing or extra step id fails the coverage test below.
const basisExpectations: Record<string, StepExpectation> = {
    'basis-identity': {matrix: [[1, 0], [0, 1]], mode: 'basis', readouts: {a1: '(1, 0)', a2: '(0, 1)', probe: '(1, 1)'}, statuses: []},
    'basis-first-column': {matrix: [[2, 0], [1, 1]], mode: 'basis', readouts: {a1: '(2, 1)', a2: '(0, 1)', probe: '(2, 2)'}, statuses: []},
    'basis-second-column': {matrix: A, mode: 'basis', readouts: {a1: '(2, 1)', a2: '(−1, 1)', probe: '(1, 2)'}, statuses: []},
    'basis-bezier': {matrix: A, mode: 'basis', readouts: {a1: '(2, 1)', a2: '(−1, 1)', probe: '(1, 2)'}, statuses: []},
    'basis-invariants': {matrix: A, mode: 'basis', readouts: {probe: '(1, 2)'}, statuses: []},
    'basis-explore': {matrix: A, mode: 'basis', readouts: {probe: '(1, 2)'}, statuses: []},
};
const determinantExpectations: Record<string, StepExpectation> = {
    'det-square': {matrix: A, mode: 'determinant', readouts: {det: '3', area: '3', orientation: 'ohranjena', 'det-formula': 'a·d − b·c = 2·1 − (−1)·1 = 3'}, statuses: ['positive']},
    'det-orientation': {matrix: B, mode: 'determinant', readouts: {det: '−3', area: '3', orientation: 'obrnjena'}, statuses: ['negative']},
    'det-flip': {matrix: [[1, 2], [1 / 2, 5 / 4]], mode: 'determinant', readouts: {det: '0,25', area: '0,25', orientation: 'ohranjena'}, statuses: ['positive']},
    'det-collapse': {matrix: C, mode: 'determinant', readouts: {det: '0', area: '0'}, statuses: ['zero', 'collapse-line']},
    'det-product': {matrix: E, mode: 'determinant', readouts: {det: '10', area: '10', orientation: 'ohranjena'}, statuses: ['positive']},
    'det-explore': {matrix: A, mode: 'determinant', readouts: {det: '3', area: '3'}, statuses: ['positive']},
};

beforeEach(() => setLanguage('sl'));

describe('chapter structure and registration', () => {
    test('the chapter advertises exactly the two activities, owned by one family Demonstration', () => {
        expect(linearMapsChapter.id).toBe(LINEAR_MAPS_CHAPTER_ID);
        expect(linearMapsChapter.sections.map(section => section.id)).toEqual(['matrix-and-image', 'determinant-area']);
        expect(Object.keys(linearMapsGuidedExampleRegistry)).toEqual(['matrix-and-image', 'determinant-area']);
        for (const section of linearMapsChapter.sections) expect(section.demonstrationIds).toEqual(['linear-map']);
        expect(familyChapters.find(chapter => chapter.id === LINEAR_MAPS_CHAPTER_ID)?.family).toBe('maps');
        expect(learningChapters.some(chapter => chapter.id === LINEAR_MAPS_CHAPTER_ID)).toBe(true);
    });

    test('the chapter is bilingual and its example links sit at the section ends', () => {
        expect(linearMapsChapter.title).toEqual({sl: 'Linearne preslikave ravnine', en: 'Linear maps of the plane'});
        const fields = [linearMapsChapter.purpose, linearMapsChapter.prerequisites];
        for (const section of linearMapsChapter.sections) fields.push(section.title, ...section.paragraphs);
        for (const field of fields) { expect(field.sl.length).toBeGreaterThan(20); expect(field.en.length).toBeGreaterThan(20); }
        for (const section of familyChapters.find(chapter => chapter.id === LINEAR_MAPS_CHAPTER_ID)!.sections) {
            const last = section.orderedContent!.at(-1)!;
            expect(last).toEqual({kind: 'example', exampleId: `linear-maps.${section.id}.linear-map`});
        }
    });

    test('lessons resolve, own their sections and keep both languages complete', () => {
        expect(getGuidedLessonOwners('linear-map')).toEqual([
            {chapterId: 'linear-maps', sectionId: 'matrix-and-image'},
            {chapterId: 'linear-maps', sectionId: 'determinant-area'},
        ]);
        expect(authoredGuidedLessonIds('linear-maps', 'determinant-area')).toEqual(['linear-map']);
        expect(getLessonForDemonstration('linear-map')).toBe(linearMapsGuidedExampleRegistry['matrix-and-image']);
        for (const lesson of Object.values(linearMapsGuidedExampleRegistry)) {
            expect(lesson.steps.length).toBeGreaterThanOrEqual(6);
            for (const field of [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.body, step.prompt!])]) {
                expect(field.sl.length).toBeGreaterThan(10);
                expect(field.en.length).toBeGreaterThan(10);
            }
        }
    });

    test('learn launches and example links select the requested section lesson', () => {
        const l1 = resolveGuidedExample('?learn=1&learnChapter=linear-maps&learnSection=matrix-and-image', 'linear-map');
        const l2 = resolveGuidedExample('?learn=1&learnChapter=linear-maps&learnSection=determinant-area', 'linear-map');
        expect(l1?.lesson.id).toBe('linear-map-basis-image');
        expect(l2?.lesson.id).toBe('linear-map-determinant-area');
        expect(resolveGuidedExample('?learn=1', 'linear-map')?.lesson.id).toBe('linear-map-basis-image');
        expect(resolveGuidedExample('?learn=1&learnChapter=linear-maps&learnSection=nope', 'linear-map')).toBeUndefined();
        const byExample = resolveGuidedExample('?example=lesson.linear-maps.determinant-area.linear-map', 'linear-map');
        expect(byExample?.lesson.id).toBe('linear-map-determinant-area');
        expect(byExample?.owner).toEqual({chapterId: 'linear-maps', sectionId: 'determinant-area'});
        expect(guidedLessonLaunchPath('linear-map')).toContain('learnChapter=linear-maps&learnSection=matrix-and-image');
        const links = linearMapsChapter.sections.map(section => getChapterGuidedExamples('linear-maps', section.id));
        expect(links.map(list => list.length)).toEqual([1, 1]);
        expect(links[1][0].path).toBe(linearMapsGuidedExamplePath('determinant-area'));
        expect(links[1][0].path).toBe('/bezeg-2.0/linear-map?example=lesson.linear-maps.determinant-area.linear-map');
    });
});

describe('scene actions drive the graph in one synchronous tick', () => {
    test('every step has an expectation and every expectation a step', () => {
        expect(linearMapsGuidedExampleRegistry['matrix-and-image'].steps.map(step => step.id)).toEqual(Object.keys(basisExpectations));
        expect(linearMapsGuidedExampleRegistry['determinant-area'].steps.map(step => step.id)).toEqual(Object.keys(determinantExpectations));
    });

    for (const [lessonKey, expectations] of [['matrix-and-image', basisExpectations], ['determinant-area', determinantExpectations]] as const) {
        const lesson = linearMapsGuidedExampleRegistry[lessonKey];
        for (const [stepId, expected] of Object.entries(expectations)) {
            test(`${lesson.id} / ${stepId}: matrix, mode, readouts and statuses`, () => {
                const graph = makeGraph();
                // Start from a dragged state: the scene must replace it, not merge with it.
                graph.applyLessonAction({kind: 'linear-map', operation: 'set-matrix', matrix: [[3, 1], [-2, 4]]});
                runStep(graph, lesson, stepId);
                expect(graph.model.matrix).toEqual(expected.matrix);
                expect(graph.model.mode).toBe(expected.mode);
                for (const [id, value] of Object.entries(expected.readouts)) expect(readout(graph, id), `${stepId} readout ${id}`).toBe(value);
                expect(statusIds(graph)).toEqual(expected.statuses);
            });
        }
    }

    test('English readouts follow the language after the same scene', () => {
        const graph = makeGraph();
        runStep(graph, linearMapsGuidedExampleRegistry['determinant-area'], 'det-orientation');
        setLanguage('en');
        expect(readout(graph, 'orientation')).toBe('reversed');
        expect(readout(graph, 'det')).toBe('−3');
    });

    test('a scene with a missing step fails loudly', () => {
        expect(() => runStep(makeGraph(), linearMapsGuidedExampleRegistry['matrix-and-image'], 'no-such-step')).toThrow(/no scene step/);
    });
});

describe('the numbers in the prose', () => {
    test('L1: images of the control points, the evaluation theorem and the midpoint', () => {
        expect(imageControlPoints(A)).toEqual([[2, 1], [1, 5], [6, 6], [11, 4]]);
        expect(apply(A, [1, 1])).toEqual([1, 2]);
        const source = bezierPoint(FIXTURE_CONTROL_POINTS, 0.5);
        expect(source).toEqual([3, 7 / 4]);
        const mapped = apply(A, source);
        const fromImages = bezierPoint(imageControlPoints(A), 0.5);
        expect(mapped).toEqual([17 / 4, 19 / 4]);
        expect(Math.abs(mapped[0] - fromImages[0])).toBeLessThan(1e-12);
        expect(Math.abs(mapped[1] - fromImages[1])).toBeLessThan(1e-12);
        const [p0, p3] = [FIXTURE_CONTROL_POINTS[0], FIXTURE_CONTROL_POINTS[3]];
        expect(apply(A, [(p0[0] + p3[0]) / 2, (p0[1] + p3[1]) / 2])).toEqual([13 / 2, 5 / 2]);
    });

    test('L2: areas, signs, the collapse, the kernel and the product rule', () => {
        expect(unitSquareImage(A)).toEqual([[0, 0], [2, 1], [1, 2], [-1, 1]]);
        expect([det(A), shoelace(unitSquareImage(A))]).toEqual([3, 3]);
        expect([det(B), shoelace(unitSquareImage(B))]).toEqual([-3, -3]);
        expect(det([[1, 2], [1 / 2, 5 / 4]])).toBe(1 / 4);
        expect(det([[1, 2], [1 / 2, 3 / 4]])).toBe(-1 / 4);
        expect(det(C)).toBe(0);
        expect(unitSquareImage(C)[2]).toEqual([3, 3 / 2]);
        expect(apply(C, [2, -1])).toEqual([0, 0]);
        expect(det(E)).toBe(10);
        const product: Mat2 = [
            [A[0][0] * E[0][0] + A[0][1] * E[1][0], A[0][0] * E[0][1] + A[0][1] * E[1][1]],
            [A[1][0] * E[0][0] + A[1][1] * E[1][0], A[1][0] * E[0][1] + A[1][1] * E[1][1]],
        ];
        expect(product).toEqual([[6, -1], [6, 4]]);
        expect(det(product)).toBe(30);
    });
});
