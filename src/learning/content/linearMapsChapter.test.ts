import {LinearMapGraph} from '../../graphs/linear/LinearMapGraph';
import {bezierPoint, FIXTURE_CONTROL_POINTS, imageControlPoints, shoelace} from '../../graphs/linear/linearMapScene';
import {apply, det, LINEAR_MAP_EXAMPLES, type Mat2, type Vec2, unitSquareImage} from '../../linear/matrix2';
import {classifyEigen, exactlyParallel} from '../../linear/eigen2';
import {singular} from '../../linear/singular2';
import {deriveEigen, eigenSnapAngle} from '../../graphs/linear/eigenScene';
import {deriveConic, deriveEllipse} from '../../graphs/linear/ellipseScene';
import {setLanguage, t} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {authoredGuidedLessonIds, getGuidedLessonOwners, guidedLessonLaunchPath} from '../chapter/guidedLessonOwnership';
import type {LessonDefinition} from '../model';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {linearMapsChapter} from './linearMapsChapter';
import {linearMapCompositionLesson, linearMapEigenLesson, linearMapEllipseLesson, linearMapPowerMethodLesson, linearMapStabilityLesson} from './linearMapsChapterLessons';
import {companionOfDrag, deriveIteration, deriveTraceDet, iterateAt, STABILITY_TRIANGLE, TRACE_DET_DRAG_LIMIT} from '../../graphs/linear/iterationScene';
import {SETTLED_ANGLE_DEGREES} from '../../linear/iterate2';
import {discreteStabilityTD, exactTraceDet} from '../../linear/stability2';
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
    test('the chapter advertises exactly the seven activities, owned by one family Demonstration', () => {
        expect(linearMapsChapter.id).toBe(LINEAR_MAPS_CHAPTER_ID);
        expect(linearMapsChapter.sections.map(section => section.id)).toEqual(['matrix-and-image', 'determinant-area', 'eigen-directions', 'singular-ellipse', 'composition-affine', 'power-method', 'trace-determinant']);
        expect(Object.keys(linearMapsGuidedExampleRegistry)).toEqual(['matrix-and-image', 'determinant-area', 'eigen-directions', 'singular-ellipse', 'composition-affine', 'power-method', 'trace-determinant']);
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
            {chapterId: 'linear-maps', sectionId: 'eigen-directions'},
            {chapterId: 'linear-maps', sectionId: 'singular-ellipse'},
            {chapterId: 'linear-maps', sectionId: 'composition-affine'},
            {chapterId: 'linear-maps', sectionId: 'power-method'},
            {chapterId: 'linear-maps', sectionId: 'trace-determinant'},
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
        expect(links.map(list => list.length)).toEqual([1, 1, 1, 1, 1, 1, 1]);
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

// ---- L3 (eigen directions) and L4 (singular ellipse): every step opens on a state read here, in sl and en ----

interface FramedExpectation {
    matrix: Mat2;
    mode: 'basis' | 'eigen' | 'ellipse';
    testAngle: number;
    conic: boolean;
    sl: Record<string, string>;
    en: Record<string, string>;
    statuses: string[];
}

const S_SHEAR = LINEAR_MAP_EXAMPLES.shear;
const R_TURN = LINEAR_MAP_EXAMPLES['quarter-turn'];
const S_SYM = LINEAR_MAP_EXAMPLES.symmetric;
const N_NON = LINEAR_MAP_EXAMPLES['non-symmetric'];
const eigenStatuses = ['eigen-not-parallel', 'eigen-two'];

const eigenExpectations: Record<string, FramedExpectation> = {
    'eigen-keep': {matrix: E, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(4, 2)', a2: '(1, 3)', probe: '(5, 5)'}, en: {a1: '(4, 2)', a2: '(1, 3)', probe: '(5, 5)'}, statuses: []},
    // Opens in the basis mode (smoke finding: the eigen mode draws both eigen lines, which answer the sign-change prediction).
    'eigen-parallel': {matrix: E, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(4, 2)', a2: '(1, 3)', probe: '(5, 5)'}, en: {a1: '(4, 2)', a2: '(1, 3)', probe: '(5, 5)'}, statuses: []},
    // Opens in the basis mode (review finding: the eigen mode shows the eigenvalue 2 and the second line the prompt asks for).
    'eigen-second': {matrix: E, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(4, 2)', a2: '(1, 3)', probe: '(5, 5)'}, en: {a1: '(4, 2)', a2: '(1, 3)', probe: '(5, 5)'}, statuses: []},
    'eigen-polynomial': {matrix: C, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(1, 0,5)', a2: '(2, 1)'}, en: {a1: '(1, 0.5)', a2: '(2, 1)'}, statuses: ['collapse-line']},
    'eigen-rotation': {matrix: R_TURN, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(0, 1)', a2: '(−1, 0)', probe: '(−1, 1)'}, en: {a1: '(0, 1)', a2: '(−1, 0)', probe: '(−1, 1)'}, statuses: []},
    'eigen-shear-scalar': {matrix: S_SHEAR, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(1, 0)', a2: '(1, 1)', probe: '(2, 1)'}, en: {a1: '(1, 0)', a2: '(1, 1)', probe: '(2, 1)'}, statuses: []},
    'eigen-explore': {matrix: A, mode: 'eigen', testAngle: 0, conic: false,
        sl: {discriminant: '−3', eigenvalues: '1,5 ± 0,866i', sine: '0,4472'}, en: {discriminant: '−3', eigenvalues: '1.5 ± 0.866i', sine: '0.4472'}, statuses: ['eigen-not-parallel', 'eigen-none']},
};
const ellipseExpectations: Record<string, FramedExpectation> = {
    'ellipse-image': {matrix: S_SYM, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(2, 1)', a2: '(1, 2)', probe: '(3, 3)'}, en: {a1: '(2, 1)', a2: '(1, 2)', probe: '(3, 3)'}, statuses: []},
    'ellipse-eigen': {matrix: S_SYM, mode: 'eigen', testAngle: 20, conic: false, sl: {eigenvalues: '3 in 1', 'test-angle': '20°'}, en: {eigenvalues: '3 and 1', 'test-angle': '20°'}, statuses: eigenStatuses},
    'ellipse-conic': {matrix: S_SYM, mode: 'ellipse', testAngle: 0, conic: false,
        sl: {sigma1: '3', sigma2: '1', det: '3', 'sigma-product': '3', 'axis-image': '45°', 'axis-domain': '45°'},
        en: {sigma1: '3', sigma2: '1', det: '3', 'sigma-product': '3', 'axis-image': '45°', 'axis-domain': '45°'}, statuses: ['ellipse-symmetric']},
    'ellipse-nonsymmetric': {matrix: N_NON, mode: 'eigen', testAngle: 20, conic: false, sl: {eigenvalues: '2 in 1', 'test-angle': '20°'}, en: {eigenvalues: '2 and 1', 'test-angle': '20°'}, statuses: eigenStatuses},
    'ellipse-product': {matrix: N_NON, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(2, 0)', a2: '(1, 1)', probe: '(3, 1)'}, en: {a1: '(2, 0)', a2: '(1, 1)', probe: '(3, 1)'}, statuses: []},
    'ellipse-circle': {matrix: R_TURN, mode: 'basis', testAngle: 0, conic: false, sl: {a1: '(0, 1)', a2: '(−1, 0)', probe: '(−1, 1)'}, en: {a1: '(0, 1)', a2: '(−1, 0)', probe: '(−1, 1)'}, statuses: []},
    'ellipse-explore': {matrix: A, mode: 'ellipse', testAngle: 0, conic: false,
        sl: {sigma1: '2,3028', sigma2: '1,3028', det: '3', 'axis-image': '16,85°', 'axis-domain': '163,15°'},
        en: {sigma1: '2.3028', sigma2: '1.3028', det: '3', 'axis-image': '16.85°', 'axis-domain': '163.15°'}, statuses: ['ellipse-nonsymmetric', 'ellipse-no-lines']},
};

describe('L3 and L4: scenes in one synchronous tick, read in sl and en', () => {
    afterEach(() => { document.body.innerHTML = ''; });

    test('every step has an expectation and every expectation a step', () => {
        expect(linearMapEigenLesson.steps.map(item => item.id)).toEqual(Object.keys(eigenExpectations));
        expect(linearMapEllipseLesson.steps.map(item => item.id)).toEqual(Object.keys(ellipseExpectations));
    });

    for (const [lesson, expectations] of [[linearMapEigenLesson, eigenExpectations], [linearMapEllipseLesson, ellipseExpectations]] as const) {
        for (const [stepId, expected] of Object.entries(expectations)) {
            for (const language of ['sl', 'en'] as const) {
                test(`${lesson.id} / ${stepId} (${language}): opening state, readouts and statuses`, () => {
                    const graph = makeGraph();
                    // The eigen and ellipse modes fit the view to the container size: give the fake board a host element.
                    const host = document.createElement('div');
                    host.id = 'linear-map-test-board';
                    document.body.appendChild(host);
                    graph.board.container = host.id;
                    // Start from a dragged state in another mode: the scene must replace all of it.
                    for (const action of [
                        {kind: 'linear-map', operation: 'set-matrix', matrix: [[3, 1], [-2, 4]]},
                        {kind: 'linear-map', operation: 'set-mode', mode: 'ellipse'},
                        {kind: 'linear-map', operation: 'set-test-vector', angle: 77},
                        {kind: 'linear-map', operation: 'set-conic', visible: true},
                    ] as const) graph.applyLessonAction(action);
                    runStep(graph, lesson, stepId);
                    setLanguage(language);
                    expect(graph.model.matrix).toEqual(expected.matrix);
                    expect(graph.model.mode).toBe(expected.mode);
                    expect(graph.model.testAngle).toBe(expected.testAngle);
                    expect(Boolean(graph.model.conicVisible)).toBe(expected.conic);
                    for (const [id, value] of Object.entries(expected[language])) expect(readout(graph, id), `${stepId} readout ${id}`).toBe(value);
                    expect(statusIds(graph)).toEqual(expected.statuses);
                });
            }
        }
    }

    test('the eigen-mode openings of the prediction steps start away from the eigen-directions', () => {
        // The basis-mode openings carry no eigen or singular data in their readouts; the eigen-mode ones must not sit inside a window.
        for (const expectations of [eigenExpectations, ellipseExpectations]) {
            for (const [stepId, expected] of Object.entries(expectations)) {
                if (expected.mode !== 'eigen' || stepId === 'eigen-explore') continue;
                expect(Math.abs(deriveEigen(expected.matrix, expected.testAngle).sine), stepId).toBeGreaterThan(0.01);
            }
        }
    });

    test('the lesson steps are framed: explanation, optional calculation, observation with expected observations', () => {
        for (const lesson of [linearMapEigenLesson, linearMapEllipseLesson]) {
            for (const lessonStep of lesson.steps) {
                const frames = lessonStep.frames ?? [];
                expect(frames[0]?.kind, lessonStep.id).toBe('explanation');
                const last = frames[frames.length - 1];
                expect(last?.kind, lessonStep.id).toBe('observation');
                expect((last as {expectedObservations?: unknown[]}).expectedObservations?.length, lessonStep.id).toBeGreaterThan(0);
            }
        }
    });

    test('pmatrix row separators survive as two backslashes and every matrix block is closed', () => {
        const strings: string[] = [];
        const walk = (node: unknown): void => {
            if (typeof node === 'string') strings.push(node);
            else if (Array.isArray(node)) node.forEach(walk);
            else if (node && typeof node === 'object') Object.values(node).forEach(walk);
        };
        walk([linearMapEigenLesson, linearMapEllipseLesson]);
        const blocks = strings.flatMap(text => [...text.matchAll(/\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}/gs)].map(match => match[1]));
        expect(blocks.length).toBeGreaterThan(0);
        // Every block here has two rows, so the separator (two backslash characters) must be present.
        for (const body of blocks) expect(body).toContain('\\\\');
        for (const text of strings) expect((text.match(/\\begin\{pmatrix\}/g) ?? []).length).toBe((text.match(/\\end\{pmatrix\}/g) ?? []).length);
    });
});

describe('the numbers in the L3 and L4 prose', () => {
    // Half width in degrees of the window |sine| < 0,01 around an eigen-direction.
    const halfWidth = (m: Mat2, centre: number): number => {
        let width = 0;
        while (Math.abs(deriveEigen(m, centre + width).sine) < 0.01 && Math.abs(deriveEigen(m, centre - width).sine) < 0.01) width += 0.001;
        return width;
    };
    const angleBetween = (u: readonly [number, number], v: readonly [number, number]): number =>
        Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180 / Math.PI;

    test('E: invariants, eigenvectors, images and the angle between the eigenvectors', () => {
        const view = classifyEigen(E);
        if (view.kind !== 'distinct-real') throw new Error('E has two real eigenvalues');
        expect([view.discriminant, view.eigenvalues]).toEqual([9, [5, 2]]);
        expect([E[0][0] + E[1][1], det(E)]).toEqual([7, 10]);
        expect([apply(E, [1, 1]), apply(E, [1, -2])]).toEqual([[5, 5], [2, -4]]);
        expect(exactlyParallel([1, 1], E)).toBe(true);
        expect(exactlyParallel([1, -2], E)).toBe(true);
        // E(1,k) = (4+k, 2+3k) is parallel to (1,k) when 2+3k = k(4+k), that is k^2 + k - 2 = 0.
        expect([1, -2].map(k => k * k + k - 2)).toEqual([0, 0]);
        const [v1, v2] = view.eigenvectors;
        expect(angleBetween(v1, v2)).toBeCloseTo(108.4349, 3);
        expect(180 - angleBetween(v1, v2)).toBeCloseTo(71.5651, 3);
        expect(Math.atan2(-2, 1) * 180 / Math.PI + 180).toBeCloseTo(116.565, 3);
    });

    test('the sine at 0 degrees, its signs over a half turn and the angle between v and Av', () => {
        const first = deriveEigen(E, 0);
        expect(first.sine).toBeCloseTo(0.4472, 4);
        expect(first.angleBetween).toBeCloseTo(26.565, 2);
        expect(deriveEigen(E, 20).sine).toBeCloseTo(0.2642, 4);
        expect([10, 60, 150].map(angle => Math.sign(deriveEigen(E, angle).sine))).toEqual([1, -1, 1]);
    });

    test('the tolerance windows: about +-0,95 degrees around 45 and +-0,38 degrees around 116,57', () => {
        expect(halfWidth(E, 45)).toBeCloseTo(0.95, 1);
        expect(halfWidth(E, 116.565)).toBeCloseTo(0.38, 1);
        expect(Math.abs(deriveEigen(E, 44).sine)).toBeGreaterThan(0.01);
        expect(Math.abs(deriveEigen(E, 44.9).sine)).toBeLessThan(0.01);
        expect(Math.abs(deriveEigen(E, 117).sine)).toBeGreaterThan(0.01);
        expect(Math.abs(deriveEigen(E, 116.57).sine)).toBeLessThan(0.01);
        expect(deriveEigen(E, 45).exactlyParallel).toBe(true);
        expect(deriveEigen(E, 116.57).exactlyParallel).toBe(false);
        expect(eigenSnapAngle(E, 117)).toBeCloseTo(116.57, 2);
    });

    test('C: tau, det, Delta, the kernel and the eigenvalues 2 and 0', () => {
        const view = classifyEigen(C);
        if (view.kind !== 'distinct-real') throw new Error('C has two real eigenvalues');
        expect([C[0][0] + C[1][1], det(C), view.discriminant, view.eigenvalues]).toEqual([2, 0, 4, [2, 0]]);
        expect(apply(C, [2, -1])).toEqual([0, 0]);
        expect(apply(C, [2, 1])).toEqual([4, 2]);
        expect(singular(C).sigma[1]).toBe(0);
    });

    test('R, S, 2I and the two quarter-grid examples of the exploration', () => {
        expect(classifyEigen(R_TURN)).toMatchObject({kind: 'complex', discriminant: -4, real: 0, imaginary: 1});
        expect(classifyEigen(S_SHEAR)).toMatchObject({kind: 'repeated', repeated: 'defective', eigenvalue: 1, discriminant: 0, eigenvector: [1, 0]});
        expect(classifyEigen(LINEAR_MAP_EXAMPLES['scalar-2'])).toMatchObject({kind: 'repeated', repeated: 'scalar', discriminant: 0});
        expect(classifyEigen([[1, 1 / 4], [0, 1]])).toMatchObject({kind: 'repeated', repeated: 'defective', discriminant: 0});
        expect(classifyEigen([[1, 0], [0, 0]])).toMatchObject({kind: 'distinct-real', discriminant: 1});
        expect(classifyEigen(A)).toMatchObject({kind: 'complex', discriminant: -3});
    });

    test('S_y: eigenvalues, singular values and the conic semi-axes', () => {
        const eigen = classifyEigen(S_SYM);
        if (eigen.kind !== 'distinct-real') throw new Error('S_y has two real eigenvalues');
        expect(eigen.eigenvalues).toEqual([3, 1]);
        const sing = singular(S_SYM);
        expect(sing.sigma[0]).toBeCloseTo(3, 12);
        expect(sing.sigma[1]).toBeCloseTo(1, 12);
        const conicView = deriveConic(S_SYM);
        expect(conicView.kind).toBe('ellipse');
        expect(conicView.semiAxes![0]).toBeCloseTo(1 / Math.sqrt(3), 12);
        expect(conicView.semiAxes![0]).toBeCloseTo(0.5774, 4);
        expect(conicView.semiAxes![1]).toBeCloseTo(1, 12);
        // The point (s, s)/sqrt2 at s = 1/sqrt3 lies on 2x^2 + 2xy + 2y^2 = 1: 1/3 + 1/3 + 1/3.
        const s = 1 / Math.sqrt(3) / Math.SQRT2;
        expect(2 * s * s + 2 * s * s + 2 * s * s).toBeCloseTo(1, 12);
        expect(deriveEllipse(S_SYM).imageAxisAngle).toBeCloseTo(45, 10);
    });

    test('B (ellipse-eigen prediction): eigenvalues 3 and -1, singular values 3 and 1, axes along (1,1) and (1,-1)', () => {
        expect(B).toEqual([[1, 2], [2, 1]]); // columns (1,2) and (2,1); symmetric
        expect(apply(B, [1, 1])).toEqual([3, 3]);
        expect(apply(B, [1, -1])).toEqual([-1, 1]);
        const eigen = classifyEigen(B);
        if (eigen.kind !== 'distinct-real') throw new Error('B has two real eigenvalues');
        expect([...eigen.eigenvalues].sort((x, y) => y - x)).toEqual([3, -1]);
        const view = deriveEllipse(B);
        expect(view.singular.sigma[0]).toBeCloseTo(3, 12);
        expect(view.singular.sigma[1]).toBeCloseTo(1, 12);
        expect(view.symmetric).toBe(true);
        expect(view.imageAxisAngle).toBeCloseTo(45, 10);
        expect(view.domainAxisAngle).toBeCloseTo(45, 10);
    });

    test('N: eigenvalues, singular values, product and the axes', () => {
        const eigen = classifyEigen(N_NON);
        if (eigen.kind !== 'distinct-real') throw new Error('N has two real eigenvalues');
        expect(eigen.eigenvalues).toEqual([2, 1]);
        expect(apply(N_NON, [1, 0])).toEqual([2, 0]);
        expect(apply(N_NON, [1, -1])).toEqual([1, -1]);
        expect(angleBetween(eigen.eigenvectors[0], eigen.eigenvectors[1])).toBeCloseTo(45, 10);
        const view = deriveEllipse(N_NON);
        expect(view.singular.sigma[0]).toBeCloseTo(Math.sqrt(3 + Math.sqrt(5)), 12);
        expect(view.singular.sigma[1]).toBeCloseTo(Math.sqrt(3 - Math.sqrt(5)), 12);
        expect(view.singular.sigma[0]).toBeCloseTo(2.2882, 4);
        expect(view.singular.sigma[1]).toBeCloseTo(0.874, 3);
        expect(view.product).toBeCloseTo(2, 12);
        expect(det(N_NON)).toBe(2);
        expect(2.288 * 0.874).toBeCloseTo(2, 2);
        expect(view.imageAxisAngle).toBeCloseTo(13.28, 2);
        expect(view.domainAxisAngle).toBeCloseTo(31.72, 2);
        expect(view.symmetric).toBe(false);
        expect(view.conic.symmetricPart).toEqual([[2, 1 / 2], [1 / 2, 1]]);
        expect(view.conic.kind).toBe('ellipse');
    });

    test('F, the circle matrices and the general matrix of the exploration', () => {
        expect(deriveConic(LINEAR_MAP_EXAMPLES['reflection-x']).kind).toBe('hyperbola');
        const turn = singular([[1, -1], [1, 1]]);
        expect(turn.sigma[0]).toBeCloseTo(Math.SQRT2, 12);
        expect(turn.sigma[1]).toBeCloseTo(Math.SQRT2, 12);
        expect(turn.circle).toBe(true);
        expect(singular(R_TURN)).toMatchObject({sigma: [1, 1], circle: true});
        expect(deriveEllipse(R_TURN).imageAxisAngle).toBeUndefined();
        const general = deriveEllipse(A);
        expect(general.singular.sigma[0]).toBeCloseTo(2.3028, 4);
        expect(general.singular.sigma[1]).toBeCloseTo(1.3028, 4);
    });
});

// ---- L6 (power method) and L7 (trace and determinant): every step opens on a state read here, in sl and en ----

const R_QUARTER = LINEAR_MAP_EXAMPLES['quarter-turn'];
const Z_SPIRAL: Mat2 = [[1, -1], [1, 1]];
const Q_SWAP: Mat2 = [[0, 3], [3, 0]];
const M_SYM: Mat2 = [[1 / 2, 1 / 4], [1 / 4, 1 / 2]];
const W_HALF: Mat2 = [[1 / 2, -1 / 2], [1 / 2, 1 / 2]];
const MINUS_E: Mat2 = [[-4, -1], [-2, -3]];
const IDENTITY = LINEAR_MAP_EXAMPLES.identity;
const basisReadouts = (a1: string, a2: string, probe: string) => ({a1, a2, probe});

interface IterationExpectation {
    matrix: Mat2;
    mode: 'basis' | 'iterate' | 'tracedet';
    start: readonly [number, number];
    step: number;
    sl: Record<string, string>;
    en: Record<string, string>;
    statuses: string[];
}

const powerExpectations: Record<string, IterationExpectation> = {
    'power-first': {matrix: E, mode: 'basis', start: [1, 0], step: 0, sl: basisReadouts('(4, 2)', '(1, 3)', '(5, 5)'), en: basisReadouts('(4, 2)', '(1, 3)', '(5, 5)'), statuses: []},
    // Opens in the iterate mode itself: it shows the dominant line, the angle 45 and the ratio 0,4 at k = 0, which step 1 already answered.
    'power-settle': {matrix: E, mode: 'iterate', start: [1, 0], step: 0,
        sl: {start: '(1, 0)', iterate: '(1, 0)', angle: '45°', ratio: '0,4', rayleigh: '4'}, en: {start: '(1, 0)', iterate: '(1, 0)', angle: '45°', ratio: '0.4', rayleigh: '4'}, statuses: ['dominant']},
    'power-stretch': {matrix: E, mode: 'basis', start: [1, 0], step: 0, sl: basisReadouts('(4, 2)', '(1, 3)', '(5, 5)'), en: basisReadouts('(4, 2)', '(1, 3)', '(5, 5)'), statuses: []},
    'power-other-eigenvector': {matrix: E, mode: 'basis', start: [1, -2], step: 0, sl: basisReadouts('(4, 2)', '(1, 3)', '(5, 5)'), en: basisReadouts('(4, 2)', '(1, 3)', '(5, 5)'), statuses: []},
    'power-no-settling': {matrix: R_QUARTER, mode: 'basis', start: [1, 0], step: 0, sl: basisReadouts('(0, 1)', '(−1, 0)', '(−1, 1)'), en: basisReadouts('(0, 1)', '(−1, 0)', '(−1, 1)'), statuses: []},
    'power-flip': {matrix: Q_SWAP, mode: 'basis', start: [1, 0], step: 0, sl: basisReadouts('(0, 3)', '(3, 0)', '(3, 3)'), en: basisReadouts('(0, 3)', '(3, 0)', '(3, 3)'), statuses: []},
    'power-explore': {matrix: IDENTITY, mode: 'iterate', start: [1, 0], step: 0,
        sl: {start: '(1, 0)', iterate: '(1, 0)'}, en: {start: '(1, 0)', iterate: '(1, 0)'}, statuses: ['scalar']},
};
const stabilityExpectations: Record<string, IterationExpectation> = {
    'td-plane': {matrix: Z_SPIRAL, mode: 'basis', start: [1, 0], step: 0, sl: basisReadouts('(1, 1)', '(−1, 1)', '(0, 2)'), en: basisReadouts('(1, 1)', '(−1, 1)', '(0, 2)'), statuses: []},
    // Opens in the tracedet mode: W (tau 1, delta 1/2, Delta -1) already shows `inside`, which td-triangle explains later.
    'td-parabola': {matrix: W_HALF, mode: 'tracedet', start: [1, 0], step: 0,
        sl: {tau: '1', delta: '0,5', discriminant: '−1'}, en: {tau: '1', delta: '0.5', discriminant: '−1'}, statuses: ['td-inside', 'flow-unstable']},
    'td-triangle': {matrix: M_SYM, mode: 'basis', start: [4, 0], step: 0, sl: basisReadouts('(0,5, 0,25)', '(0,25, 0,5)', '(0,75, 0,75)'), en: basisReadouts('(0.5, 0.25)', '(0.25, 0.5)', '(0.75, 0.75)'), statuses: []},
    'td-edges': {matrix: M_SYM, mode: 'tracedet', start: [1, 0], step: 0,
        sl: {tau: '1', delta: '0,1875', discriminant: '0,25'}, en: {tau: '1', delta: '0.1875', discriminant: '0.25'}, statuses: ['td-inside', 'flow-unstable']},
    'td-flow': {matrix: MINUS_E, mode: 'basis', start: [1, 0], step: 0, sl: basisReadouts('(−4, −2)', '(−1, −3)', '(−5, −5)'), en: basisReadouts('(−4, −2)', '(−1, −3)', '(−5, −5)'), statuses: []},
    'td-vertex': {matrix: S_SHEAR, mode: 'basis', start: [0, 1], step: 0, sl: basisReadouts('(1, 0)', '(1, 1)', '(2, 1)'), en: basisReadouts('(1, 0)', '(1, 1)', '(2, 1)'), statuses: []},
    'td-explore': {matrix: IDENTITY, mode: 'tracedet', start: [1, 0], step: 0,
        sl: {tau: '2', delta: '1', discriminant: '0'}, en: {tau: '2', delta: '1', discriminant: '0'}, statuses: ['td-edge', 'flow-unstable']},
};

describe('L6 and L7: scenes in one synchronous tick, read in sl and en', () => {
    afterEach(() => { document.body.innerHTML = ''; });

    const withHost = (graph: any) => {
        const host = document.createElement('div');
        host.id = 'linear-map-test-board';
        document.body.appendChild(host);
        graph.board.container = host.id;
    };

    test('every step has an expectation and every expectation a step', () => {
        expect(linearMapPowerMethodLesson.steps.map(item => item.id)).toEqual(Object.keys(powerExpectations));
        expect(linearMapStabilityLesson.steps.map(item => item.id)).toEqual(Object.keys(stabilityExpectations));
    });

    for (const [lesson, expectations] of [[linearMapPowerMethodLesson, powerExpectations], [linearMapStabilityLesson, stabilityExpectations]] as const) {
        for (const [stepId, expected] of Object.entries(expectations)) {
            for (const language of ['sl', 'en'] as const) {
                test(`${lesson.id} / ${stepId} (${language}): opening state, readouts and statuses`, () => {
                    const graph = makeGraph();
                    withHost(graph);
                    // Start from a dragged state in another mode: the scene must replace the matrix, mode and start. The step is left at 0.
                    for (const action of [
                        {kind: 'linear-map', operation: 'set-matrix', matrix: [[3, 1], [-2, 4]]},
                        {kind: 'linear-map', operation: 'set-mode', mode: 'ellipse'},
                        {kind: 'linear-map', operation: 'set-start', start: [-2, 1.5]},
                    ] as const) graph.applyLessonAction(action);
                    runStep(graph, lesson, stepId);
                    setLanguage(language);
                    expect(graph.model.matrix).toEqual(expected.matrix);
                    expect(graph.model.mode).toBe(expected.mode);
                    expect(graph.model.start ?? [1, 0]).toEqual(expected.start);
                    expect(graph.model.step ?? 0).toBe(expected.step);
                    for (const [id, value] of Object.entries(expected[language])) expect(readout(graph, id), `${stepId} readout ${id}`).toBe(value);
                    expect(statusIds(graph)).toEqual(expected.statuses);
                });
            }
        }
    }

    test('every scene opens at step 0 even after the learner pressed "Next step"', () => {
        for (const [lesson, expectations] of [[linearMapPowerMethodLesson, powerExpectations], [linearMapStabilityLesson, stabilityExpectations]] as const) {
            for (const stepId of Object.keys(expectations)) {
                const graph = makeGraph();
                withHost(graph);
                for (const action of [
                    {kind: 'linear-map', operation: 'set-mode', mode: 'iterate'},
                    {kind: 'linear-map', operation: 'step', count: 5},
                ] as const) graph.applyLessonAction(action);
                expect(graph.model.step).toBe(5);
                runStep(graph, lesson, stepId);
                expect(graph.model.step ?? 0, stepId).toBe(0);
            }
        }
    });

    test('the basis-mode openings carry no iteration or trace-determinant readouts', () => {
        for (const expectations of [powerExpectations, stabilityExpectations]) {
            for (const [stepId, expected] of Object.entries(expectations)) {
                if (expected.mode !== 'basis') continue;
                for (const id of ['angle', 'ratio', 'stretch', 'tau', 'stability']) expect(expected.sl, `${stepId} ${id}`).not.toHaveProperty(id);
                expect(expected.statuses, stepId).toEqual([]);
            }
        }
    });

    test('the lesson steps are framed: explanation, optional calculation, observation with expected observations', () => {
        for (const lesson of [linearMapPowerMethodLesson, linearMapStabilityLesson]) {
            for (const lessonStep of lesson.steps) {
                const frames = lessonStep.frames ?? [];
                expect(frames[0]?.kind, lessonStep.id).toBe('explanation');
                const last = frames[frames.length - 1];
                expect(last?.kind, lessonStep.id).toBe('observation');
                expect((last as {expectedObservations?: unknown[]}).expectedObservations?.length, lessonStep.id).toBeGreaterThan(0);
            }
        }
    });

    test('pmatrix row separators survive as two backslashes and every matrix block is closed', () => {
        const strings: string[] = [];
        const walk = (node: unknown): void => {
            if (typeof node === 'string') strings.push(node);
            else if (Array.isArray(node)) node.forEach(walk);
            else if (node && typeof node === 'object') Object.values(node).forEach(walk);
        };
        walk([linearMapPowerMethodLesson, linearMapStabilityLesson]);
        const blocks = strings.flatMap(text => [...text.matchAll(/\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}/gs)].map(match => match[1]));
        expect(blocks.length).toBeGreaterThan(0);
        for (const body of blocks) expect(body).toContain('\\\\');
        for (const text of strings) expect((text.match(/\\begin\{pmatrix\}/g) ?? []).length).toBe((text.match(/\\end\{pmatrix\}/g) ?? []).length);
    });

    test('set-start and step through the shared union: invalid payloads throw before any write, valid ones chain in one tick', () => {
        const graph = makeGraph();
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-mode', mode: 'iterate'});
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-start', start: [1, -2]});
        graph.applyLessonAction({kind: 'linear-map', operation: 'step', count: 2});
        graph.applyLessonAction({kind: 'linear-map', operation: 'step'});
        expect(graph.model).toMatchObject({mode: 'iterate', start: [1, -2], step: 3});
        const before = {...graph.model};
        for (const bad of [
            {kind: 'linear-map', operation: 'set-start', start: [0.3, 0]},
            {kind: 'linear-map', operation: 'set-start', start: [5, 0]},
            {kind: 'linear-map', operation: 'set-start', start: [1]},
            {kind: 'linear-map', operation: 'step', count: 0},
            {kind: 'linear-map', operation: 'step', count: 31},
            {kind: 'linear-map', operation: 'step', count: 1.5},
        ]) expect(() => graph.applyLessonAction(bad as never), JSON.stringify(bad)).toThrow();
        expect(graph.model).toEqual(before);
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-start', start: [1, 0]});
        expect(graph.model).toMatchObject({start: [1, 0], step: 3});
    });
});

describe('the numbers in the L6 prose', () => {
    const at = (matrix: Mat2, start: Vec2, k: number) => iterateAt(deriveIteration(matrix, start), matrix, k);
    const Ek = (k: number) => at(E, [1, 0], k);

    test('E, (1,0): the iterates are exact integers, and E^k v0 = (2/3) 5^k (1,1) + (1/3) 2^k (1,-2)', () => {
        expect([1, 2, 3, 4].map(k => Ek(k).point)).toEqual([[4, 2], [18, 14], [86, 78], [422, 406]]);
        expect(Ek(5).point).toEqual([2094, 2062]);
        for (let k = 0; k <= 6; k++) {
            expect(Ek(k).point[0]).toBeCloseTo((2 / 3) * 5 ** k + (1 / 3) * 2 ** k, 6);
            expect(Ek(k).point[1]).toBeCloseTo((2 / 3) * 5 ** k - (2 / 3) * 2 ** k, 6);
        }
    });

    test('the decomposition (1,0) = 2/3 (1,1) + 1/3 (1,-2) and the eigenvalues 5 and 2', () => {
        expect([2 / 3 + 1 / 3, 2 / 3 - 2 / 3]).toEqual([1, 0]);
        expect(apply(E, [1, 1])).toEqual([5, 5]);
        expect(apply(E, [1, -2])).toEqual([2, -4]);
        const view = classifyEigen(E);
        if (view.kind !== 'distinct-real') throw new Error('E has two real eigenvalues');
        expect(view.eigenvalues).toEqual([5, 2]);
        expect(deriveIteration(E, [1, 0]).outcome).toBe('dominant');
        expect(deriveIteration(E, [1, 0]).orbit.modulusRatio).toBeCloseTo(2 / 5, 12);
    });

    test('angle errors: 45, 18,43, 7,13, 2,79, 1,11, 0,44 for k = 0..5, 0,01 at k = 9; arctan(14/18) = 37,87', () => {
        const rounded = [0, 1, 2, 3, 4, 5].map(k => Math.round(Ek(k).angleError! * 100) / 100);
        expect(rounded).toEqual([45, 18.43, 7.13, 2.79, 1.11, 0.44]);
        expect(Ek(9).angleError!).toBeCloseTo(0.01, 2);
        expect(Math.atan(14 / 18) * 180 / Math.PI).toBeCloseTo(37.87, 2);
        expect(45 - Math.atan(14 / 18) * 180 / Math.PI).toBeCloseTo(7.13, 2);
    });

    test('settling: k = 4 is above the 1 degree tolerance, k = 5 below; the error shrinks by about 2/5 per step', () => {
        expect(Ek(4).angleError!).toBeGreaterThan(SETTLED_ANGLE_DEGREES);
        expect(Ek(5).angleError!).toBeLessThan(SETTLED_ANGLE_DEGREES);
        expect([0, 1, 2, 3, 4, 5].filter(k => Ek(k).angleError! < SETTLED_ANGLE_DEGREES)[0]).toBe(5);
        expect(Ek(4).angleError! / Ek(3).angleError!).toBeCloseTo(0.4, 1);
        expect(Math.tan(Ek(30).angleError! * Math.PI / 180) / Math.tan(Ek(29).angleError! * Math.PI / 180)).toBeCloseTo(0.4, 3);
    });

    test('the stretch of the graph step k is the spec step n+1: 5,099 at k=2, 5,0915 at k=3, 5,0185 at k=5, 5,0005 at k=9', () => {
        expect(Ek(0).stretch).toBeUndefined();
        expect(Ek(1).stretch!).toBeCloseTo(Math.hypot(4, 2), 12);
        expect(Ek(2).stretch!).toBeCloseTo(Math.hypot(18, 14) / Math.hypot(4, 2), 12);
        expect(Ek(2).stretch!).toBeCloseTo(5.099, 3);
        expect(Ek(3).stretch!).toBeCloseTo(5.0915, 4);
        expect(Ek(5).stretch!).toBeCloseTo(5.0185, 4);
        expect(Ek(9).stretch!).toBeCloseTo(5.0005, 4);
        expect(Ek(30).stretch!).toBeCloseTo(5, 10);
        expect(Ek(0).rayleigh!).toBeCloseTo(4, 12);
        expect(Ek(1).rayleigh!).toBeCloseTo(5, 12);
    });

    test('start (1,-2): the iterates stay on the eigenvalue 2 line, stretch 2, angle 71,57, status other-eigenvector', () => {
        const view = deriveIteration(E, [1, -2]);
        expect([1, 2, 3].map(k => iterateAt(view, E, k).point)).toEqual([[2, -4], [4, -8], [8, -16]]);
        expect(view.otherEigenvector).toBe(true);
        expect(at(E, [1, -2], 3).stretch).toBe(2);
        expect(at(E, [1, -2], 0).angleError!).toBeCloseTo(71.57, 2);
        expect(at(E, [1, -2], 5).angleError!).toBeCloseTo(71.57, 2);
    });

    test('the perturbed start (1+1e-6, -2+1e-6) first comes within 1 degree of the dominant direction at k = 20 (floating point, off the graph grid)', () => {
        let v: Vec2 = [1 + 1e-6, -2 + 1e-6];
        const errorAt = (p: Vec2) => {
            let d = Math.abs(Math.atan2(p[1], p[0]) - Math.PI / 4) % Math.PI;
            if (d > Math.PI / 2) d = Math.PI - d;
            return d * 180 / Math.PI;
        };
        let first = -1;
        for (let k = 0; k <= 40 && first < 0; k++) {
            if (errorAt(v) < 1) first = k;
            v = apply(E, v);
        }
        expect(first).toBe(20);
    });

    test('R: the iterates have period 4, length 1 and the status is rotating', () => {
        const view = deriveIteration(R_QUARTER, [1, 0]);
        expect([1, 2, 3, 4].map(k => iterateAt(view, R_QUARTER, k).point.map(x => x + 0))).toEqual([[0, 1], [-1, 0], [0, -1], [1, 0]]);
        expect([1, 2, 3, 4].map(k => iterateAt(view, R_QUARTER, k).norm)).toEqual([1, 1, 1, 1]);
        expect(view.outcome).toBe('rotating');
    });

    test('Z: tau 2, delta 2, Delta -4, eigenvalues 1 +- i, iterates (1,1), (0,2), (-2,2), (-4,0), turning by 45 degrees and stretching by sqrt2', () => {
        const {tau, delta} = exactTraceDet(Z_SPIRAL);
        expect([tau, delta, tau * tau - 4 * delta]).toEqual([2, 2, -4]);
        expect(classifyEigen(Z_SPIRAL)).toMatchObject({kind: 'complex', discriminant: -4, real: 1, imaginary: 1});
        const view = deriveIteration(Z_SPIRAL, [1, 0]);
        const points = [0, 1, 2, 3, 4].map(k => iterateAt(view, Z_SPIRAL, k).point.map(x => x + 0));
        expect(points.slice(1)).toEqual([[1, 1], [0, 2], [-2, 2], [-4, 0]]);
        for (const k of [1, 2, 3, 4]) expect(iterateAt(view, Z_SPIRAL, k).stretch!).toBeCloseTo(Math.SQRT2, 12);
        const angle = (p: number[]) => Math.atan2(p[1], p[0]) * 180 / Math.PI;
        for (let k = 1; k <= 4; k++) expect(angle(points[k]) - angle(points[k - 1])).toBeCloseTo(45, 10);
        expect(view.outcome).toBe('rotating');
    });

    test('Q: tau 0, delta -9, eigenvalues 3 and -3, iterates (0,3), (9,0), (0,27), Q^2 = 9I, status equal-moduli; (1,1) is an eigenvector', () => {
        const {tau, delta} = exactTraceDet(Q_SWAP);
        expect([tau, delta]).toEqual([0, -9]);
        const eigen = classifyEigen(Q_SWAP);
        if (eigen.kind !== 'distinct-real') throw new Error('Q has two real eigenvalues');
        expect([...eigen.eigenvalues].sort((x, y) => y - x)).toEqual([3, -3]);
        const view = deriveIteration(Q_SWAP, [1, 0]);
        expect([1, 2, 3].map(k => iterateAt(view, Q_SWAP, k).point)).toEqual([[0, 3], [9, 0], [0, 27]]);
        expect(apply(Q_SWAP, apply(Q_SWAP, [0, 1]))).toEqual([0, 9]);
        expect(view.outcome).toBe('equal-moduli');
        expect([1, 2].map(k => at(Q_SWAP, [1, 1], k).point)).toEqual([[3, 3], [9, 9]]);
        expect(at(Q_SWAP, [1, 0], 2).stretch).toBe(3);
    });

    test('exploration: diag(4,1) with start (1,1) has ratio 1/4 and is within 1 degree at k = 3; -E has iterates (-4,-2), (18,14), (-86,-78)', () => {
        const D4: Mat2 = [[4, 0], [0, 1]];
        const dview = deriveIteration(D4, [1, 1]);
        expect(dview.orbit.modulusRatio).toBeCloseTo(1 / 4, 12);
        expect([0, 1, 2, 3, 4].filter(k => iterateAt(dview, D4, k).angleError! < SETTLED_ANGLE_DEGREES)[0]).toBe(3);
        expect(iterateAt(dview, D4, 2).angleError!).toBeGreaterThan(SETTLED_ANGLE_DEGREES);
        const nview = deriveIteration(MINUS_E, [1, 0]);
        expect([1, 2, 3].map(k => iterateAt(nview, MINUS_E, k).point)).toEqual([[-4, -2], [18, 14], [-86, -78]]);
        const eigen = classifyEigen(MINUS_E);
        if (eigen.kind !== 'distinct-real') throw new Error('-E has two real eigenvalues');
        expect([...eigen.eigenvalues].sort((x, y) => x - y)).toEqual([-5, -2]);
        expect(nview.orbit.modulusRatio).toBeCloseTo(0.4, 12);
        for (let k = 0; k <= 5; k++) expect(iterateAt(nview, MINUS_E, k).angleError!).toBeCloseTo(Ek(k).angleError!, 10);
        expect(nview.outcome).toBe('dominant');
    });
});

describe('the numbers in the L7 prose', () => {
    const td = (m: Mat2) => deriveTraceDet(m);

    test('W = Z/2: tau 1, delta 1/2, Delta -1, inside, flow not stable, modulus sqrt(1/2) = 0,7071', () => {
        expect(td(W_HALF)).toMatchObject({tau: 1, delta: 0.5, discriminant: -1, stability: {kind: 'inside'}, flowStable: false});
        expect(Math.sqrt(0.5)).toBeCloseTo(0.7071, 4);
        expect(classifyEigen(W_HALF)).toMatchObject({kind: 'complex', discriminant: -1});
    });

    test('the drag points: (1, 1/4) has Delta 0 and the double eigenvalue 1/2, (1, 1/2) has Delta -1; the companion matrix has exactly that trace and determinant', () => {
        expect(td(companionOfDrag(1, 0.25))).toMatchObject({tau: 1, delta: 0.25, discriminant: 0});
        expect(td(companionOfDrag(1, 0.5))).toMatchObject({tau: 1, delta: 0.5, discriminant: -1});
        expect(companionOfDrag(1, 0.25)).toEqual([[0, 1], [-0.25, 1]]);
        expect(classifyEigen(companionOfDrag(1, 0.25))).toMatchObject({kind: 'repeated', eigenvalue: 0.5});
    });

    test('M: tau 1, delta 3/16, Delta 1/4, eigenvalues 3/4 and 1/4, inside, flow not stable; at k = 10 the iterate of (4,0) is about (0,11, 0,11), the stretch 0,75', () => {
        expect(td(M_SYM)).toMatchObject({tau: 1, delta: 3 / 16, discriminant: 1 / 4, stability: {kind: 'inside'}, flowStable: false});
        expect(1 - 3 / 4).toBe(1 / 4);
        const eigen = classifyEigen(M_SYM);
        if (eigen.kind !== 'distinct-real') throw new Error('M has two real eigenvalues');
        expect([...eigen.eigenvalues].sort((x, y) => y - x)).toEqual([3 / 4, 1 / 4]);
        const view = deriveIteration(M_SYM, [4, 0]);
        const tenth = iterateAt(view, M_SYM, 10);
        expect(tenth.point[0]).toBeCloseTo(0.11, 2);
        expect(tenth.point[1]).toBeCloseTo(0.11, 2);
        expect(tenth.stretch!).toBeCloseTo(0.75, 3);
        expect(iterateAt(view, M_SYM, 30).stretch!).toBeCloseTo(0.75, 10);
    });

    test('the triangle: vertices (-2,1), (2,1), (0,-1); inside is delta < 1 and |tau| < 1 + delta', () => {
        expect(STABILITY_TRIANGLE).toEqual([[-2, 1], [2, 1], [0, -1]]);
        for (const [tau, delta] of STABILITY_TRIANGLE) expect(discreteStabilityTD(tau, delta).kind).toBe('edge');
        expect(discreteStabilityTD(2, 1)).toMatchObject({kind: 'edge', edges: ['determinant-one', 'eigenvalue-one']});
        expect(discreteStabilityTD(0, 0.99).kind).toBe('inside');
        expect(discreteStabilityTD(1, 0.25).kind).toBe('inside');
    });

    test('the edge points: (1,0) has eigenvalue 1, (-1,0) has eigenvalue -1, (0,1) is the quarter turn; p(1) and p(-1) vanish on the edges; across an edge the point is outside', () => {
        const p = (tau: number, delta: number, lambda: number) => lambda * lambda - tau * lambda + delta;
        expect([p(1, 0, 1), p(-1, 0, -1)]).toEqual([0, 0]);
        expect(discreteStabilityTD(1, 0)).toMatchObject({kind: 'edge', edge: 'eigenvalue-one'});
        expect(discreteStabilityTD(-1, 0)).toMatchObject({kind: 'edge', edge: 'eigenvalue-minus-one'});
        expect(discreteStabilityTD(0, 1)).toMatchObject({kind: 'edge', edge: 'determinant-one'});
        expect(classifyEigen(companionOfDrag(0, 1))).toMatchObject({kind: 'complex', real: 0, imaginary: 1});
        expect(td(R_QUARTER)).toMatchObject({tau: 0, delta: 1, stability: {kind: 'edge', edge: 'determinant-one'}});
        expect(discreteStabilityTD(1, -0.25).kind).toBe('outside');
        expect(discreteStabilityTD(0, 1.25).kind).toBe('outside');
        expect(discreteStabilityTD(-1, -0.25).kind).toBe('outside');
    });

    test('-E: tau -7, delta 10, Delta 9, eigenvalues -5 and -2, outside, flow stable, outside the drag range; E at (7,10) is outside too', () => {
        expect(td(MINUS_E)).toMatchObject({tau: -7, delta: 10, discriminant: 9, stability: {kind: 'outside'}, flowStable: true});
        expect(TRACE_DET_DRAG_LIMIT).toBe(4);
        expect(td(E)).toMatchObject({tau: 7, delta: 10, stability: {kind: 'outside'}, flowStable: false});
    });

    test('S: tau 2, delta 1, Delta 0, the vertex (2,1) on two edges; iterates (1,1), (2,1), ..., (10,1), angle 5,71 degrees at k = 10', () => {
        expect(td(S_SHEAR)).toMatchObject({tau: 2, delta: 1, discriminant: 0, stability: {kind: 'edge', edges: ['determinant-one', 'eigenvalue-one']}, flowStable: false});
        const view = deriveIteration(S_SHEAR, [0, 1]);
        expect(view.outcome).toBe('defective');
        expect([1, 2, 10].map(k => iterateAt(view, S_SHEAR, k).point)).toEqual([[1, 1], [2, 1], [10, 1]]);
        expect(iterateAt(view, S_SHEAR, 10).angleError!).toBeCloseTo(5.71, 2);
        expect(Math.atan(1 / 10) * 180 / Math.PI).toBeCloseTo(5.71, 2);
        expect(iterateAt(view, S_SHEAR, 30).angleError!).toBeCloseTo(1.91, 2);
    });

    test('exploration: -I/2 has tau -1, delta 1/4, inside with a stable flow; the identity opens on the vertex (2,1); Z is outside above the parabola', () => {
        expect(td([[-1 / 2, 0], [0, -1 / 2]])).toMatchObject({tau: -1, delta: 1 / 4, stability: {kind: 'inside'}, flowStable: true});
        expect(td(IDENTITY)).toMatchObject({tau: 2, delta: 1, stability: {kind: 'edge'}});
        expect(td(Z_SPIRAL)).toMatchObject({tau: 2, delta: 2, discriminant: -4, stability: {kind: 'outside'}});
    });
});

// L5 (composition and affine maps). The lesson is not registered in the chapter yet; the tests import it directly.
const MINUS = '−';
const compOrderElementSl = 'zrcaljenje čez premico pod kotom 135° (k = 18)';
const compOrderElementEn = 'reflection in the line at the angle 135° (k = 18)';
const compImages = (points: readonly (readonly [number, number])[]): Record<string, string> =>
    Object.fromEntries(points.map((point, index) => [`image-${index}`, `(${point.map(value => (value < 0 ? `${MINUS}${-value}` : String(value))).join(', ')})`]));
const compFixture = [[1, 0], [2, 3], [4, 2], [5, -1]] as const;
const compDefaultImages = compImages([[0, -1], [-3, -2], [-2, -4], [1, -5]]);
const compQuarterImages = compImages([[0, 1], [-3, 2], [-2, 4], [1, 5]]);
const compPivotImages = compImages([[4, -1], [1, 0], [2, 2], [5, 3]]);

interface CompExpectation {
    readonly actions?: readonly object[];
    readonly det: string;
    readonly detEn?: string;
    readonly element?: {readonly sl: string; readonly en: string};
    readonly images: Record<string, string>;
    readonly t?: string;
    readonly noT?: boolean;
}
const compExpectations: Record<string, CompExpectation> = {
    'comp-order': {det: `${MINUS}1`, element: {sl: compOrderElementSl, en: compOrderElementEn}, images: compDefaultImages, noT: true},
    'comp-reflections': {det: `približno ${MINUS}1`, detEn: `approximately ${MINUS}1`, images: {}, noT: true},
    'comp-translation': {det: `${MINUS}1`, element: {sl: compOrderElementSl, en: compOrderElementEn}, images: compDefaultImages, noT: true},
    'comp-pivot': {det: '1', images: compQuarterImages, noT: true},
    'comp-bezier': {det: '1', images: compPivotImages, t: `(4, ${MINUS}2)`},
    'comp-affine-link': {det: '1', images: compPivotImages, t: `(4, ${MINUS}2)`},
    'comp-explore': {det: '1', images: compImages(compFixture), noT: true},
};
const compAction = (operation: string, extra: object) => ({kind: 'linear-map', operation, ...extra});
const compChoose = (slot: 'first' | 'second', element: object | null) => compAction('choose-element', {slot, element});

describe('L5: scenes in one synchronous tick, read in sl and en', () => {
    const lesson = linearMapCompositionLesson;
    const stepIds = Object.keys(compExpectations);
    const stepText = (stepId: string, language: 'sl' | 'en'): string => {
        const found = lesson.steps.find(item => item.id === stepId);
        const strings: string[] = [];
        const walk = (node: unknown): void => {
            if (typeof node === 'string') strings.push(node);
            else if (Array.isArray(node)) node.forEach(walk);
            else if (node && typeof node === 'object') {
                const record = node as Record<string, unknown>;
                if (typeof record.sl === 'string' && typeof record.en === 'string') strings.push(record[language] as string);
                else Object.values(record).forEach(walk);
            }
        };
        walk(found?.frames);
        return strings.join('\n');
    };
    const dirty = (graph: any) => {
        for (const action of [
            compAction('set-mode', {mode: 'composition'}), compChoose('first', {kind: 'reflection', k: 9}), compChoose('second', {kind: 'rotation', k: 5}),
            compAction('set-translation', {translation: [1, -3]}), compAction('set-pivot', {pivot: [-2, 2]}),
        ]) graph.applyLessonAction(action);
    };
    const checkOpening = (graph: any, stepId: string, language: 'sl' | 'en') => {
        const expected = compExpectations[stepId];
        expect(graph.model.mode, stepId).toBe('composition');
        expect(readout(graph, 'product-det'), `${stepId} det`).toBe(language === 'en' && expected.detEn ? expected.detEn : expected.det);
        for (const [id, value] of Object.entries(expected.images)) expect(readout(graph, id), `${stepId} ${id}`).toBe(value);
        // With B the free identity (comp-reflections) the graph shows no "BA je" row: the prose says the row appears only when both slots are elements.
        expect(readout(graph, 'product-element'), `${stepId} product-element`).toBe(expected.element?.[language]);
        if (expected.t) expect(readout(graph, 't'), `${stepId} t`).toBe(expected.t);
        if (expected.noT) expect(readout(graph, 't'), `${stepId} t`).toBeUndefined();
    };

    test('every step has an expectation and every expectation a step', () => {
        expect(lesson.steps.map(item => item.id)).toEqual(stepIds);
    });

    for (const stepId of stepIds) {
        for (const language of ['sl', 'en'] as const) {
            test(`${lesson.id} / ${stepId} (${language}): opening state and readouts after a dragged state`, () => {
                const graph = makeGraph();
                dirty(graph);
                runStep(graph, lesson, stepId);
                setLanguage(language);
                checkOpening(graph, stepId, language);
            });
        }
    }

    test('the openings do not depend on the order of the steps and survive running a step twice in one act', () => {
        const graph = makeGraph();
        for (const stepId of [...stepIds].reverse()) {
            runStep(graph, lesson, stepId);
            checkOpening(graph, stepId, 'sl');
        }
        for (const stepId of ['comp-bezier', 'comp-pivot', 'comp-bezier', 'comp-order']) {
            const step = lesson.steps.find(item => item.id === stepId)!;
            for (const action of [...step.scene!.actions, ...step.scene!.actions]) graph.applyLessonAction(action);
            graph.store.setState({...graph.model});
            checkOpening(graph, stepId, 'sl');
        }
    });

    test('the specific openings: free identity in slot B, no pivot, the product of the two reflections', () => {
        const graph = makeGraph();
        runStep(graph, lesson, 'comp-pivot');
        expect(graph.model).toMatchObject({secondMatrix: [[1, 0], [0, 1]], element: {kind: 'rotation', k: 6}});
        expect(graph.model.secondElement).toBeUndefined();
        expect(graph.model.pivot).toBeUndefined();
        runStep(graph, lesson, 'comp-reflections');
        expect(graph.model).toMatchObject({element: {kind: 'reflection', k: 3}, secondMatrix: [[1, 0], [0, 1]]});
        expect(graph.model.secondElement).toBeUndefined();
        runStep(graph, lesson, 'comp-bezier');
        expect(graph.model.pivot).toEqual([3, 1]);
    });

    test('restoring on exit returns the free state', () => {
        const graph = makeGraph();
        const before = JSON.stringify(graph.model);
        const checkpoint = graph.captureLessonState();
        for (const stepId of stepIds) runStep(graph, lesson, stepId);
        expect(JSON.stringify(graph.model)).not.toBe(before);
        graph.restoreLessonState(checkpoint);
        expect(JSON.stringify(graph.model)).toBe(before);
    });

    test('every control and readout label a prompt names exists in the graph strings, in both languages', () => {
        const labels = (language: 'sl' | 'en'): Record<string, string[]> => {
            setLanguage(language);
            return {
                'comp-order': [t('linear_map_comp_source_label', {value0: 'A'}), t('linear_map_comp_source_label', {value0: 'B'}), t('linear_map_comp_source_reflection'),
                    t('linear_map_comp_source_rotation'), t('linear_map_comp_angle_reflection', {value0: 'A'}), t('linear_map_comp_angle_rotation', {value0: 'B'}),
                    t('linear_map_comp_readout_row', {value0: 'BA', value1: '1'}), t('linear_map_comp_readout_row', {value0: 'BA', value1: '2'})],
                'comp-reflections': [t('linear_map_comp_angle_reflection', {value0: 'A'}), t('linear_map_comp_angle_reflection', {value0: 'B'}), t('linear_map_comp_readout_product_element')],
                'comp-translation': [t('linear_map_comp_translation_x'), t('linear_map_comp_translation_y')],
                'comp-pivot': [t('linear_map_comp_pivot_toggle'), t('linear_map_comp_pivot_x'), t('linear_map_comp_pivot_y'), t('linear_map_comp_readout_t')],
                'comp-bezier': [t('linear_map_comp_pivot_toggle')],
            };
        };
        for (const language of ['sl', 'en'] as const) {
            for (const [stepId, names] of Object.entries(labels(language))) {
                const text = stepText(stepId, language);
                for (const name of names) expect(text, `${stepId} (${language}) names "${name}"`).toContain(name);
            }
        }
    });

    test('no step opens on the state its prompt asks the learner to produce', () => {
        const graph = makeGraph();
        runStep(graph, lesson, 'comp-order');
        expect(graph.model.element).not.toEqual({kind: 'reflection', k: 0});
        expect(graph.model.secondElement).not.toEqual({kind: 'rotation', k: 6});
        runStep(graph, lesson, 'comp-reflections');
        expect(graph.model.secondElement).toBeUndefined();
        expect(graph.model.element).not.toEqual({kind: 'reflection', k: 0});
        runStep(graph, lesson, 'comp-translation');
        expect(graph.model.translation ?? [0, 0]).toEqual([0, 0]);
        runStep(graph, lesson, 'comp-pivot');
        expect(graph.model.pivot).toBeUndefined();
        runStep(graph, lesson, 'comp-bezier');
        expect(graph.model.pivot).toEqual([3, 1]);
    });

    test('the states reached through the controls give the readouts the observations quote', () => {
        const apply = (graph: any, ...actions: object[]) => { for (const action of actions) graph.applyLessonAction(action); graph.store.setState({...graph.model}); };
        for (const language of ['sl', 'en'] as const) {
            const graph = makeGraph();
            setLanguage(language);
            // Swap, B first: B Rotation k=0 -> BA = R; B k=6 -> BA = -I; A Reflection (index kept, k=6) -> line at 90 degrees; A k=0 -> RF, line 45 degrees.
            const rotationText = (degrees: number, k: number) => language === 'sl' ? `vrtež za ${degrees}° (k = ${k})` : `rotation by ${degrees}° (k = ${k})`;
            const lineText = (degrees: number, k: number) => language === 'sl' ? `zrcaljenje čez premico pod kotom ${degrees}° (k = ${k})` : `reflection in the line at the angle ${degrees}° (k = ${k})`;
            runStep(graph, lesson, 'comp-order');
            apply(graph, compChoose('second', {kind: 'rotation', k: 0}));
            expect(readout(graph, 'product-element')).toBe(rotationText(90, 6));
            apply(graph, compChoose('second', {kind: 'rotation', k: 6}));
            expect(readout(graph, 'product-element')).toBe(rotationText(180, 12));
            apply(graph, compChoose('first', {kind: 'reflection', k: 6}));
            expect(readout(graph, 'product-element')).toBe(lineText(90, 12));
            apply(graph, compChoose('first', {kind: 'reflection', k: 0}));
            expect(readout(graph, 'product-element')).toBe(lineText(45, 6));
            for (const [id, value] of Object.entries(compImages([[0, 1], [3, 2], [2, 4], [-1, 5]]))) expect(readout(graph, id), id).toBe(value);
            expect(readout(graph, 'product-det')).toBe(`${MINUS}1`);
            // Two reflections: the opening BA = A (line 22,5 degrees); B Reflection (k=0) -> rotation 315 degrees; then A k=0, B k=3 -> rotation 45 degrees.
            runStep(graph, lesson, 'comp-reflections');
            expect(readout(graph, 'product-det')).toBe(language === 'sl' ? `približno ${MINUS}1` : `approximately ${MINUS}1`);
            apply(graph, compChoose('second', {kind: 'reflection', k: 0}));
            expect(readout(graph, 'product-det')).toBe(language === 'sl' ? 'približno 1' : 'approximately 1');
            expect(readout(graph, 'product-element')).toBe(rotationText(315, 21));
            expect(readout(graph, 'image-0')).toBe(language === 'sl' ? `približno (0,7071, ${MINUS}0,7071)` : `approximately (0.7071, ${MINUS}0.7071)`);
            apply(graph, compChoose('first', {kind: 'reflection', k: 0}));
            expect(readout(graph, 'product-element')).toBe(rotationText(0, 0));
            apply(graph, compChoose('second', {kind: 'reflection', k: 3}));
            expect(readout(graph, 'product-element')).toBe(rotationText(45, 3));
            expect(readout(graph, 'image-0')).toBe(language === 'sl' ? 'približno (0,7071, 0,7071)' : 'approximately (0.7071, 0.7071)');
            // Translation (2,1).
            runStep(graph, lesson, 'comp-translation');
            apply(graph, compAction('set-translation', {translation: [2, 1]}));
            for (const [id, value] of Object.entries(compImages([[2, 0], [-1, -1], [0, -3], [3, -4]]))) expect(readout(graph, id), id).toBe(value);
            expect(readout(graph, 'product-det')).toBe(`${MINUS}1`);
            expect(readout(graph, 'product-element')).toBe(language === 'sl' ? compOrderElementSl : compOrderElementEn);
            // Pivot on (3,1), then off.
            runStep(graph, lesson, 'comp-pivot');
            apply(graph, compAction('set-pivot', {pivot: [0, 0]}));
            expect(readout(graph, 't')).toBe('(0, 0)');
            apply(graph, compAction('set-pivot', {pivot: [3, 1]}));
            expect(readout(graph, 't')).toBe(`(4, ${MINUS}2)`);
            for (const [id, value] of Object.entries(compPivotImages)) expect(readout(graph, id), id).toBe(value);
            runStep(graph, lesson, 'comp-bezier');
            apply(graph, compAction('set-pivot', {pivot: null}));
            expect(readout(graph, 't')).toBeUndefined();
            expect(graph.model.pivot).toBeUndefined();
            for (const [id, value] of Object.entries(compQuarterImages)) expect(readout(graph, id), id).toBe(value);
        }
    });
});

describe('the numbers in the L5 prose', () => {
    type P = readonly [number, number];
    type M = readonly [P, P];
    const mul = (x: M, y: M): M => [
        [x[0][0] * y[0][0] + x[0][1] * y[1][0] + 0, x[0][0] * y[0][1] + x[0][1] * y[1][1] + 0],
        [x[1][0] * y[0][0] + x[1][1] * y[1][0] + 0, x[1][0] * y[0][1] + x[1][1] * y[1][1] + 0],
    ];
    const act = (m: M, p: P): P => [m[0][0] * p[0] + m[0][1] * p[1], m[1][0] * p[0] + m[1][1] * p[1]];
    const detOf = (m: M) => m[0][0] * m[1][1] - m[0][1] * m[1][0];
    const R: M = [[0, -1], [1, 0]];
    const F: M = [[1, 0], [0, -1]];
    const points: readonly P[] = [[1, 0], [2, 3], [4, 2], [5, -1]];
    const rot = (degrees: number): M => {
        const a = degrees * Math.PI / 180;
        return [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]];
    };
    const refl = (degrees: number): M => {
        const a = 2 * degrees * Math.PI / 180;
        return [[Math.cos(a), Math.sin(a)], [Math.sin(a), -Math.cos(a)]];
    };
    const affine = (m: M, b: P) => (p: P): P => { const q = act(m, p); return [q[0] + b[0], q[1] + b[1]]; };
    const aboutCentre = (m: M, c: P) => (p: P): P => { const q = act(m, [p[0] - c[0], p[1] - c[1]]); return [c[0] + q[0], c[1] + q[1]]; };
    const lerp = (u: P, v: P, s: number): P => [(1 - s) * u[0] + s * v[0], (1 - s) * u[1] + s * v[1]];
    const casteljau = (q: readonly P[], s: number): P => {
        let level = q;
        while (level.length > 1) level = level.slice(1).map((next, index) => lerp(level[index], next, s));
        return level[0];
    };
    const bernstein = (q: readonly P[]): P => {
        const w = [1 / 8, 3 / 8, 3 / 8, 1 / 8];
        return [0, 1].map(axis => q.reduce((sum, p, index) => sum + w[index] * p[axis], 0)) as unknown as P;
    };
    const close = (actual: P, expected: P) => { expect(actual[0]).toBeCloseTo(expected[0], 12); expect(actual[1]).toBeCloseTo(expected[1], 12); };
    const allText = (language: 'sl' | 'en'): string => {
        const strings: string[] = [];
        const walk = (node: unknown): void => {
            if (typeof node === 'string') strings.push(node);
            else if (Array.isArray(node)) node.forEach(walk);
            else if (node && typeof node === 'object') {
                const record = node as Record<string, unknown>;
                if (typeof record.sl === 'string' && typeof record.en === 'string') strings.push(record[language] as string);
                else Object.values(record).forEach(walk);
            }
        };
        walk(linearMapCompositionLesson.steps.map(item => item.frames));
        return strings.join('\n');
    };

    test('step 1: RF, FR and RR are the integer matrices quoted, and the determinants are exact', () => {
        expect(mul(F, R)).toEqual([[0, -1], [-1, 0]]);
        expect(mul(R, F)).toEqual([[0, 1], [1, 0]]);
        expect(mul(R, R)).toEqual([[-1, 0], [0, -1]]);
        expect([detOf(R), detOf(F), detOf(mul(F, R)), detOf(mul(R, F)), detOf(mul(R, R))]).toEqual([1, -1, -1, -1, 1]);
        expect(mul(R, F)).not.toEqual(mul(F, R));
        // RF sends e1 to (0,1), e2 to (1,0): the mirror line y = x (45 degrees, k = 6); FR reflects in y = -x (135 degrees, k = 18).
        expect([act(mul(R, F), [1, 0]), act(mul(R, F), [0, 1])]).toEqual([[0, 1], [1, 0]]);
        expect(45 / 7.5).toBe(6);
        expect(135 / 7.5).toBe(18);
        close([mul(F, R)[0][0], mul(F, R)[0][1]], [refl(135)[0][0], refl(135)[0][1]]);
        close([mul(R, F)[1][0], mul(R, F)[1][1]], [refl(45)[1][0], refl(45)[1][1]]);
        // The reflection chosen by the swap (A reflection k=0, B rotation k=6) is RF.
        const swapped = mul(rot(90), refl(0));
        for (const row of [0, 1]) close(swapped[row], mul(R, F)[row]);
    });

    test('step 2: a product of two reflections is the rotation by twice the angle difference, for every pair of k', () => {
        for (let a = 0; a < 24; a += 1) {
            for (let b = 0; b < 24; b += 1) {
                const product = mul(refl(b * 7.5), refl(a * 7.5));
                const expected = rot(2 * (b - a) * 7.5);
                for (const row of [0, 1]) close(product[row], expected[row]);
                expect(detOf(product)).toBeCloseTo(1, 12);
            }
        }
        // The quoted pairs: first line 22,5 degrees, second 0 -> -45 = 315 degrees (k = 21); swapped -> +45 degrees (k = 3).
        expect(2 * (0 - 22.5)).toBe(-45);
        expect(((2 * (0 - 22.5)) % 360 + 360) % 360).toBe(315);
        expect(315 / 15).toBe(21);
        expect(45 / 15).toBe(3);
        const first = mul(refl(0), refl(22.5));
        const swapped = mul(refl(22.5), refl(0));
        close(act(first, [1, 0]), [Math.SQRT1_2, -Math.SQRT1_2]);
        close(act(swapped, [1, 0]), [Math.SQRT1_2, Math.SQRT1_2]);
        expect(Math.SQRT1_2).toBeCloseTo(0.707, 3);
        // The opening BA = A (B the identity) is the reflection in the line at 22,5 degrees.
        expect(detOf(refl(22.5))).toBeCloseTo(-1, 12);
        // Equal lines: rotation by 0 (the identity).
        const equal = mul(refl(22.5), refl(22.5));
        for (const row of [0, 1]) close(equal[row], [[1, 0], [0, 1]][row] as unknown as P);
        expect(22.5 / 7.5).toBe(3);
    });

    test('step 3: the translation b = (2,1) moves T(P0) and T(P1) to (2,0) and (-1,-1) and does not touch the linear part', () => {
        const fr = mul(F, R);
        const T = affine(fr, [2, 1]);
        expect([T(points[0]), T(points[1]), T(points[2]), T(points[3])]).toEqual([[2, 0], [-1, -1], [0, -3], [3, -4]]);
        expect(act(fr, [1, 0])).toEqual([0, -1]);
        expect(act(fr, [2, 3])).toEqual([-3, -2]);
        expect(T([0, 0])).toEqual([2, 1]);
        expect(detOf(fr)).toBe(-1);
    });

    test('steps 4 to 6: the quarter turn about c = (3,1): P - c, rotated, images, t, and T(c) = c', () => {
        const c: P = [3, 1];
        const minusC = points.map(p => [p[0] - c[0], p[1] - c[1]] as P);
        expect(minusC).toEqual([[-2, -1], [-1, 2], [1, 1], [2, -2]]);
        expect(minusC.map(p => act(R, p))).toEqual([[1, -2], [-2, -1], [-1, 1], [2, 2]]);
        const T = aboutCentre(R, c);
        expect(points.map(T)).toEqual([[4, -1], [1, 0], [2, 2], [5, 3]]);
        // T(P) = M P + t with t = c - R c.
        const rc = act(R, c);
        expect(rc).toEqual([-1, 3]);
        const t: P = [c[0] - rc[0], c[1] - rc[1]];
        expect(t).toEqual([4, -2]);
        expect(points.map(p => affine(R, t)(p))).toEqual(points.map(T));
        expect(T(c)).toEqual(c);
        // The opening of step 4 (no pivot): R alone.
        expect(points.map(p => act(R, p))).toEqual([[0, 1], [-3, 2], [-2, 4], [1, 5]]);
    });

    test('step 5: B(1/2) = (3, 7/4); T(B(1/2)) = (9/4, 1) both ways, and (-7/4, 3) without the centre; the midpoint and its image', () => {
        const c: P = [3, 1];
        const half = bernstein(points);
        close(half, [3, 7 / 4]);
        close(casteljau(points, 0.5), half);
        expect(8 * half[0]).toBeCloseTo(1 + 6 + 12 + 5, 12);
        expect(8 * half[1]).toBeCloseTo(0 + 9 + 6 - 1, 12);
        const T = aboutCentre(R, c);
        const direct = T(half);
        const images = points.map(T);
        const viaImages = casteljau(images, 0.5);
        close(direct, [9 / 4, 1]);
        close(viaImages, [9 / 4, 1]);
        close(bernstein(images), [9 / 4, 1]);
        expect(8 * viaImages[0]).toBeCloseTo(18, 12);
        expect(8 * viaImages[1]).toBeCloseTo(8, 12);
        // Without the centre the map is R and B(1/2) goes to (-7/4, 3).
        close(act(R, half), [-7 / 4, 3]);
        close(casteljau(points.map(p => act(R, p)), 0.5), [-7 / 4, 3]);
        // Midpoint of P1 and P2 and its image against the midpoint of the images.
        const mid = lerp(points[1], points[2], 0.5);
        close(mid, [3, 5 / 2]);
        close(T(mid), [3 / 2, 1]);
        close(lerp(images[1], images[2], 0.5), [3 / 2, 1]);
        close(lerp(images[1], images[2], 0.5), T(mid));
        // The pivot case also for another affine map: the preservation holds for T(P) = A P + b.
        const generic = affine([[2, -1], [1, 3]], [-2, 5]);
        close(casteljau(points.map(generic), 0.37), generic(casteljau(points, 0.37)));
    });

    test('step 6: the mean of the control points and the centre of their bounding rectangle are (3,1)', () => {
        const mean: P = [points.reduce((sum, p) => sum + p[0], 0) / 4, points.reduce((sum, p) => sum + p[1], 0) / 4];
        expect(mean).toEqual([3, 1]);
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([1, 5, -1, 3]);
        expect([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]).toEqual([3, 1]);
        expect([FIXTURE_CONTROL_POINTS[0], FIXTURE_CONTROL_POINTS[1], FIXTURE_CONTROL_POINTS[2], FIXTURE_CONTROL_POINTS[3]]).toEqual(points);
    });

    test('step 7: the shear pairs and the inverse pair as stated', () => {
        const s1: M = [[1, 1], [0, 1]];
        const s2: M = [[1, 2], [0, 1]];
        expect(mul(s2, s1)).toEqual([[1, 3], [0, 1]]);
        expect(mul(s1, s2)).toEqual([[1, 3], [0, 1]]);
        expect(mul(s1, [[1, -1], [0, 1]])).toEqual([[1, 0], [0, 1]]);
        expect(mul(R, R)).toEqual([[-1, 0], [0, -1]]);
    });

    test('the quoted numbers appear in the sl and en text', () => {
        const quoted = [
            '\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}', '\\begin{pmatrix}0&-1\\\\-1&0\\end{pmatrix}', '45^\\circ', 'k=6', '135^\\circ', 'k=18',
            '315^\\circ', 'k=21', '(2,0)', '(-1,-1)', '(4,-1),(1,0),(2,2),(5,3)', '(4,-2)', '(-2,-1),(-1,2),(1,1),(2,-2)',
            '(3,\\tfrac74)', '(\\tfrac94,1)', '(-\\tfrac74,3)', '(3,\\tfrac52)', '(\\tfrac32,1)', '\\tfrac{18}{8}', '(3,1)',
            '(0,-1)+(2,1)', '(-3,-2)+(2,1)', '\\tfrac{1+2+4+5}{4}', '\\tfrac{0+3+2-1}{4}',
        ];
        for (const language of ['sl', 'en'] as const) {
            const text = allText(language);
            for (const snippet of quoted) expect(text, `${language}: ${snippet}`).toContain(snippet);
        }
    });
});
