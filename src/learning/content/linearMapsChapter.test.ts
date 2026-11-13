import {LinearMapGraph} from '../../graphs/linear/LinearMapGraph';
import {bezierPoint, FIXTURE_CONTROL_POINTS, imageControlPoints, shoelace} from '../../graphs/linear/linearMapScene';
import {apply, det, LINEAR_MAP_EXAMPLES, type Mat2, unitSquareImage} from '../../linear/matrix2';
import {classifyEigen, exactlyParallel} from '../../linear/eigen2';
import {singular} from '../../linear/singular2';
import {deriveEigen, eigenSnapAngle} from '../../graphs/linear/eigenScene';
import {deriveConic, deriveEllipse} from '../../graphs/linear/ellipseScene';
import {setLanguage} from '../../localization';
import {getChapterGuidedExamples, resolveGuidedExample} from '../chapter/guidedExamples';
import {authoredGuidedLessonIds, getGuidedLessonOwners, guidedLessonLaunchPath} from '../chapter/guidedLessonOwnership';
import type {LessonDefinition} from '../model';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {familyChapters} from './familyChapters';
import {linearMapsChapter} from './linearMapsChapter';
import {linearMapEigenLesson, linearMapEllipseLesson} from './linearMapsChapterLessons';
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
    test('the chapter advertises exactly the four activities, owned by one family Demonstration', () => {
        expect(linearMapsChapter.id).toBe(LINEAR_MAPS_CHAPTER_ID);
        expect(linearMapsChapter.sections.map(section => section.id)).toEqual(['matrix-and-image', 'determinant-area', 'eigen-directions', 'singular-ellipse']);
        expect(Object.keys(linearMapsGuidedExampleRegistry)).toEqual(['matrix-and-image', 'determinant-area', 'eigen-directions', 'singular-ellipse']);
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
        expect(links.map(list => list.length)).toEqual([1, 1, 1, 1]);
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
