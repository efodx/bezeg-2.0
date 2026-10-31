import {ComplexReciprocalGraph} from './ComplexReciprocalGraph';
import {complexReciprocalPresetCollection} from './complexReciprocalPresets';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {DEFAULT_COMPLEX_RECIPROCAL_MODEL} from '../../analysis/complexReciprocalModel';
import {onLanguageChange, renderMessage, setLanguage} from '../../localization';

const BOX = [-4.5, 4.5, 4.5, -4.5];
const ZBAR = 'z̄';

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        unitX: 50,
        canvasWidth: 700,
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
        getBoundingBox: vi.fn(() => board.box),
        box: BOX,
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new ComplexReciprocalGraph() as any;
    graph.board = fakeBoard();
    const session: any = {
        isReady: true, isAlive: true, dispose: vi.fn(() => { session.isAlive = false; }), signal: new AbortController().signal,
        waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
    };
    graph.graphSession = session;
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn((patch: any) => { if (!asyncState) graph.store.setState(patch); });
    graph.initialize();
    return graph;
}

const apply = (graph: any, action: LessonAction) => graph.applyLessonAction(action);
const parameter = (name: string, value: number): LessonAction => ({kind: 'function-parameter', name, value} as LessonAction);
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const visible = (object: any) => resolve(object.attributes.visible);

// Creation order per type (see createScene): curves are the unit circle, the inversion circle and the arrows of z and w; points are the markers
// of z-bar, 1/z, w/z and z', the centre and radius handles, then z and w; texts are the axis names and the caption.
const [UNIT_CIRCLE, INVERSION_CIRCLE, ARROW_Z, ARROW_W] = [0, 1, 2, 3];
const [CONJUGATE, RECIPROCAL, QUOTIENT, IMAGE, CENTRE, RADIUS, Z_POINT, W_POINT] = [0, 1, 2, 3, 4, 5, 6, 7];
const OBJECT_COUNT = 15;
const curves = (graph: any) => ofType(graph, 'curve');
const points = (graph: any) => ofType(graph, 'point');
const caption = (graph: any) => graph.captionPlainLines();
const at = (point: any) => [point.X(), point.Y()];
const shown = (point: any) => visible(point);

function collect(node: any, found: Record<string, any[]> = {}) {
    if (!node || typeof node !== 'object') return found;
    if (Array.isArray(node)) { node.forEach(child => collect(child, found)); return found; }
    const name = typeof node.type === 'string' ? node.type : node.type?.name;
    if (name) (found[name] ??= []).push(node);
    collect(node.props?.children, found);
    return found;
}
const controls = (graph: any) => {
    const found = collect([graph.renderControls(), graph.renderReveals()]);
    const [zRe, zIm, wRe, wIm, centreRe, centreIm, radius] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {
        found, select: found.ChoiceSelect[0], zRe, zIm, wRe, wIm, centreRe, centreIm, radius,
        showReciprocal: button('toggle-complex-reciprocal'), showQuotient: button('toggle-complex-quotient'), showCircle: button('toggle-complex-circle'),
    };
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { id: string }) => status.id);
const set = (graph: any, patch: object) => graph.commitModel({...graph.model, ...patch});
const everyText = (graph: any) => JSON.stringify([
    caption(graph), rows(graph), graph.statuses(graph.model, graph.viewOf(graph.model)),
    points(graph).map((point: any) => at(point)), curves(graph).slice(ARROW_Z).map((curve: any) => [curve.parents[0](0.7), curve.parents[1](0.7)]),
]);

beforeEach(() => setLanguage('sl'));

function rejectionOf(entry: unknown) {
    const result = complexReciprocalPresetCollection.check(entry);
    if (!('rejection' in result)) throw new Error('expected a rejection');
    return result.rejection;
}

test('initialization draws z = 1 + i with 1/z hidden, the unit circle and the conjugate, from a fixed pool of owned objects', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual(DEFAULT_COMPLEX_RECIPROCAL_MODEL);
    expect(graph.presets()).toBe('complex-reciprocal');
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
    expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    expect(caption(graph)).toEqual([
        'z = 1 + i, w = 2 + i', `${ZBAR} = 1 − i`, '1/z: skrit', 'krog: z; kvadrat: w; plus: z̄; romb: 1/z; trikotnik: w/z; križec: z\'',
    ]);
    expect(at(points(graph)[Z_POINT])).toEqual([1, 1]);
    expect(at(points(graph)[W_POINT])).toEqual([2, 1]);
    expect(at(points(graph)[CONJUGATE])).toEqual([1, -1]);
    expect([visible(points(graph)[CONJUGATE]), shown(points(graph)[RECIPROCAL]), shown(points(graph)[QUOTIENT]), shown(points(graph)[IMAGE])]).toEqual([true, false, false, false]);
    expect([shown(points(graph)[CENTRE]), shown(points(graph)[RADIUS]), visible(curves(graph)[INVERSION_CIRCLE]), visible(curves(graph)[UNIT_CIRCLE])]).toEqual([false, false, false, true]);
    // the unit circle is the circle of radius 1 about the origin
    const unit = curves(graph)[UNIT_CIRCLE];
    expect([unit.parents[0](0), unit.parents[1](0), unit.parents[0](Math.PI / 2), unit.parents[1](Math.PI / 2)].map(Math.round)).toEqual([1, 0, 0, 1]);
    expect(statusIds(graph)).toEqual(['predict', 'outside'.slice(0, 0)].filter(Boolean));
    // the pool is the same for every example, reveal and operand
    for (const patch of [{reciprocalVisible: true}, {quotientVisible: true}, {circleVisible: true}, {zRe: 0, zIm: 0}, {radius: 2}]) {
        set(graph, patch);
        expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
        expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    }
    graph.removeGeneratedObjects();
    expect(graph.board.objectsList).toHaveLength(0);
    expect(graph.generatedObjectCount).toBe(0);
});

test('1/z, its modulus and argument, w/z and the position of z match the checked values and appear only after their Show buttons', () => {
    const graph = makeGraph({asyncState: false});
    const inspector = controls(graph);
    expect(rows(graph)).toMatchObject({
        z: '1 + i', 'z-modulus': '1,4142', conjugate: '1 − i', reciprocal: 'skrito', 'reciprocal-modulus': 'skrito', 'reciprocal-argument': 'skrito',
        quotient: 'skrito', position: 'skrito', inversion: 'skrito', 'circle-centre': 'skrito',
    });
    inspector.showReciprocal.props.onClick();
    expect(graph.model.reciprocalVisible).toBe(true);
    // z = 1 + i: 1/z = 0.5 - 0.5i, |1/z| = 1/|z|, arg 1/z = -pi/4
    expect(rows(graph)).toMatchObject({reciprocal: '0,5 − 0,5i', 'reciprocal-modulus': '0,7071', position: 'zunaj (|z| > 1)'});
    expect(rows(graph)['reciprocal-argument']).toMatch(/^−π\/4 ≈ −0,785$/);
    expect(at(points(graph)[RECIPROCAL])).toEqual([0.5, -0.5]);
    expect(shown(points(graph)[RECIPROCAL])).toBe(true);
    expect(caption(graph)[2]).toBe('1/z = 0,5 − 0,5i');
    expect(statusIds(graph)).toEqual(['outside']);
    // z = 0.5 + 0.5i is inside the circle and goes outside: 1 - i
    set(graph, {zRe: 0.5, zIm: 0.5});
    expect(rows(graph)).toMatchObject({reciprocal: '1 − i', position: 'znotraj (|z| < 1)', 'reciprocal-modulus': '1,4142'});
    expect(statusIds(graph)).toEqual(['inside']);
    // z = 0.6 + 0.8i is on the circle, decided exactly: 1/z is the conjugate
    set(graph, {zRe: 0.6, zIm: 0.8});
    expect(statusIds(graph)).toEqual(['on-circle']);
    expect(rows(graph)).toMatchObject({reciprocal: '0,6 − 0,8i', conjugate: '0,6 − 0,8i', 'reciprocal-modulus': '1', position: 'na krožnici (|z| = 1)'});
    // a point one grid step off the circle is never reported on it
    set(graph, {zRe: 0.6, zIm: 0.85});
    expect(statusIds(graph)).toEqual(['outside']);
    // division: (2 + i) / (1 - i) = 0.5 + 1.5i, modulus sqrt(5)/sqrt(2) = 1.5811
    set(graph, {zRe: 1, zIm: -1, wRe: 2, wIm: 1});
    expect(rows(graph)).toMatchObject({quotient: 'skrito', 'quotient-modulus': 'skrito', 'quotient-argument': 'skrito'});
    expect(shown(points(graph)[QUOTIENT])).toBe(false);
    inspector.showQuotient.props.onClick();
    expect(rows(graph)).toMatchObject({quotient: '0,5 + 1,5i', 'quotient-modulus': '1,5811'});
    expect(rows(graph)['quotient-argument']).toMatch(/^≈ 1,249$/);
    expect(at(points(graph)[QUOTIENT])).toEqual([0.5, 1.5]);
    expect(shown(points(graph)[QUOTIENT])).toBe(true);
    expect(caption(graph)).toContain('w/z = 0,5 + 1,5i');
});

test('z = 0 is reachable on the grid, gives the not-defined status, and no text or coordinate shows NaN or Infinity', () => {
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        const graph = makeGraph({asyncState: false});
        apply(graph, parameter('complex-z-re', 0));
        apply(graph, parameter('complex-z-im', 0));
        set(graph, {reciprocalVisible: true, quotientVisible: true, circleVisible: true});
        expect(graph.model).toMatchObject({zRe: 0, zIm: 0});
        expect(Object.is(graph.model.zRe, -0)).toBe(false);
        expect(statusIds(graph)).toEqual(['z-zero']);
        const status = graph.statuses(graph.model, graph.viewOf(graph.model))[0].text as string;
        expect(status).toMatch(language === 'sl' ? /nista definirana/ : /not defined/);
        expect(rows(graph)).toMatchObject({
            reciprocal: language === 'sl' ? 'ni definiran' : 'undefined', 'reciprocal-modulus': language === 'sl' ? 'ni definiran' : 'undefined',
            quotient: language === 'sl' ? 'ni definiran' : 'undefined', 'z-argument': language === 'sl' ? 'ni definiran' : 'undefined',
            position: language === 'sl' ? 'ni definiran' : 'undefined',
        });
        expect(caption(graph)[2]).toBe(language === 'sl' ? '1/z: ni definiran' : '1/z: undefined');
        expect(shown(points(graph)[RECIPROCAL])).toBe(false);
        expect(shown(points(graph)[QUOTIENT])).toBe(false);
        expect(shown(curves(graph)[ARROW_Z])).toBe(false);
        expect(everyText(graph)).not.toMatch(/NaN|Infinity|undefined"?\}?(?<=[0-9])/);
        expect(everyText(graph)).not.toMatch(/NaN|Infinity/);
        expect(JSON.stringify(rows(graph))).not.toMatch(/-0\b/);
    }
});

test('the example choice sets z and w, keeps the circle, hides every reveal and ignores an unknown id', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {reciprocalVisible: true, quotientVisible: true, circleVisible: true, centreRe: -1, radius: 0.5});
    graph.setExample('division');
    expect(graph.model).toEqual({
        example: 'division', zRe: 1, zIm: -1, wRe: 2, wIm: 1, reciprocalVisible: false, quotientVisible: false, circleVisible: false, centreRe: 0.5, centreIm: 0, radius: 1,
    });
    expect(() => graph.setExample('cubic')).toThrow(/example/);
    expect(graph.model.example).toBe('division');
    controls(graph).select.props.onChange('zero');
    expect(graph.model).toMatchObject({example: 'zero', zRe: 0, zIm: 0});
    // editing the numbers keeps the example as the last chosen label
    controls(graph).zRe.props.onChange(0.5);
    expect(graph.model).toMatchObject({example: 'zero', zRe: 0.5});
});

test('numeric inputs snap arithmetic noise to the 0.05 grid and reject a real off-grid or out-of-range value without changing the model', () => {
    const graph = makeGraph({asyncState: false});
    const inspector = () => controls(graph);
    inspector().zRe.props.onChange(0.30000000000000004);
    expect(graph.model.zRe).toBe(0.3);
    inspector().wIm.props.onChange(-0);
    expect(Object.is(graph.model.wIm, -0)).toBe(false);
    const before = {...graph.model};
    for (const [field, value] of [['zRe', 0.123], ['zIm', 2.05], ['wRe', -2.5], ['wIm', Number.NaN], ['centreRe', 2.1], ['centreIm', 0.01], ['radius', 0], ['radius', 2.05], ['radius', 0.07]] as const) {
        inspector()[field].props.onChange(value);
        expect(graph.model, `${field} ${value}`).toEqual(before);
    }
    // the setters throw a DomainError that the controls swallow; lesson actions let it propagate
    expect(() => apply(graph, parameter('complex-z-re', 0.123))).toThrow(/multiple of 0.05/);
    expect(() => graph.setRadius(0)).toThrow(/radius/);
    expect(graph.model).toEqual(before);
    inspector().radius.props.onChange(1.5);
    inspector().centreRe.props.onChange(-1);
    inspector().centreIm.props.onChange(0.5);
    expect(graph.model).toMatchObject({radius: 1.5, centreRe: -1, centreIm: 0.5});
    // the points follow a change made by an input
    expect(at(points(graph)[CENTRE])).toEqual([-1, 0.5]);
    expect(at(points(graph)[RADIUS])).toEqual([0.5, 0.5]);
    expect(at(points(graph)[Z_POINT])).toEqual([0.3, 1]);
});

test('dragging z, w, the centre and the radius handle projects onto the grid inside the limits and writes once per event', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {circleVisible: true});
    const z = points(graph)[Z_POINT];
    const writes = graph.setState.mock.calls.length;
    z.x = 1.234;
    z.y = -0.9;
    z.handlers.drag();
    expect(graph.model).toMatchObject({zRe: 1.25, zIm: -0.9, example: 'outside'});
    expect(at(z)).toEqual([1.25, -0.9]);
    expect(graph.setState.mock.calls.length).toBe(writes + 1);
    // beyond the square the drag is limited to its edge; the conjugate follows
    z.x = 5;
    z.y = -7;
    z.handlers.drag();
    expect(graph.model).toMatchObject({zRe: 2, zIm: -2});
    expect(at(z)).toEqual([2, -2]);
    expect(at(points(graph)[CONJUGATE])).toEqual([2, 2]);
    const w = points(graph)[W_POINT];
    w.x = -0.5;
    w.y = 0.02;
    w.handlers.drag();
    expect(graph.model).toMatchObject({wRe: -0.5, wIm: 0});
    expect(Object.is(graph.model.wIm, -0)).toBe(false);
    // the centre
    const centre = points(graph)[CENTRE];
    centre.x = -1.01;
    centre.y = 9;
    centre.handlers.drag();
    expect(graph.model).toMatchObject({centreRe: -1, centreIm: 2});
    expect(at(centre)).toEqual([-1, 2]);
    // the radius handle sits on the circle; the radius is the distance to the centre on the grid, between 0.05 and 2
    const handle = points(graph)[RADIUS];
    expect(at(handle)).toEqual([0, 2]);
    handle.x = -1;
    handle.y = 3.31;
    handle.handlers.drag();
    expect(graph.model.radius).toBe(1.3);
    expect(handle.X()).toBeCloseTo(-1, 12);
    expect(handle.Y()).toBeCloseTo(3.3, 12);
    handle.x = -1;
    handle.y = 2;
    handle.handlers.drag();
    expect(graph.model.radius).toBe(0.05);
    handle.x = 40;
    handle.y = 2;
    handle.handlers.drag();
    expect(graph.model.radius).toBe(2);
    // a model change by something else moves the points back
    apply(graph, parameter('complex-z-re', 0.5));
    expect(at(z)).toEqual([0.5, -2]);
    // a drag with a non-finite position does nothing
    const model = {...graph.model};
    z.x = Number.NaN;
    z.handlers.drag();
    handle.y = Infinity;
    handle.handlers.drag();
    expect(graph.model).toEqual(model);
});

test('the inversion circle shows z\' = c + r^2 / conj(z - c), fixes points on the circle, has no image at the centre, and guards a bad radius', () => {
    const graph = makeGraph({asyncState: false});
    controls(graph).showCircle.props.onClick();
    expect(graph.model.circleVisible).toBe(true);
    expect([shown(points(graph)[CENTRE]), shown(points(graph)[RADIUS]), visible(curves(graph)[INVERSION_CIRCLE]), shown(points(graph)[IMAGE])]).toEqual([true, true, true, true]);
    // c = 0.5, r = 1, z = 1 + i: z - c = 0.5 + i, |z - c|^2 = 1.25, so z' = 0.5 + (0.5 + i) / 1.25 = 0.9 + 0.8i
    expect(rows(graph)).toMatchObject({inversion: '0,9 + 0,8i', 'circle-centre': '0,5', 'circle-radius': '1'});
    expect(at(points(graph)[IMAGE])[0]).toBeCloseTo(0.9, 12);
    expect(at(points(graph)[IMAGE])[1]).toBeCloseTo(0.8, 12);
    expect(caption(graph)).toContain('z\' = 0,9 + 0,8i');
    // the circle curve is centred on c with radius r
    const circle = curves(graph)[INVERSION_CIRCLE];
    expect([circle.parents[0](0), circle.parents[1](0), circle.parents[0](Math.PI), circle.parents[1](Math.PI)].map(value => Math.round(value * 1e9) / 1e9)).toEqual([1.5, 0, -0.5, 0]);
    // a point on the circle (|z - c| = r exactly) is its own image
    set(graph, {zRe: 1.5, zIm: 0});
    expect(rows(graph).inversion).toBe('1,5');
    expect(at(points(graph)[IMAGE])).toEqual([1.5, 0]);
    // involution through the model: inverting the image gives z back
    set(graph, {zRe: 1, zIm: 1, centreRe: -0.5, centreIm: 0.25, radius: 0.75});
    const image = at(points(graph)[IMAGE]);
    const offset = [image[0] + 0.5, image[1] - 0.25];
    const back = [-0.5 + 0.5625 * offset[0] / (offset[0] ** 2 + offset[1] ** 2), 0.25 + 0.5625 * offset[1] / (offset[0] ** 2 + offset[1] ** 2)];
    expect(back[0]).toBeCloseTo(1, 12);
    expect(back[1]).toBeCloseTo(1, 12);
    // z at the centre: no image, a status, no coordinate NaN
    set(graph, {zRe: -0.5, zIm: 0.25});
    expect(statusIds(graph)).toContain('centre-pole');
    expect(rows(graph).inversion).toBe('ni definiran');
    expect(shown(points(graph)[IMAGE])).toBe(false);
    expect(caption(graph)).toContain('z\': ni definiran (z = c)');
    expect(everyText(graph)).not.toMatch(/NaN|Infinity/);
    // a corrupt radius (a value the model never holds) must not throw out of the view
    for (const radius of [0, -1, Number.NaN, Infinity]) {
        expect(() => graph.viewOf({...graph.model, radius, zRe: 1}), String(radius)).not.toThrow();
        expect(graph.viewOf({...graph.model, radius, zRe: 1}).inversion).toBeUndefined();
    }
});

test('results outside the default view are announced on the board and in the inspector, never drawn at a non-finite place', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {reciprocalVisible: true, quotientVisible: true, zRe: 0.05, zIm: 0});
    // 1/z = 20, w/z = (2 + i) * 20 = 40 + 20i
    expect(rows(graph)).toMatchObject({reciprocal: '20', quotient: '40 + 20i'});
    expect(statusIds(graph)).toContain('off-view');
    expect(graph.statuses(graph.model, graph.viewOf(graph.model)).find((s: any) => s.id === 'off-view').text).toContain('1/z, w/z');
    expect(caption(graph).some((line: string) => line.startsWith('zunaj pogleda: 1/z, w/z'))).toBe(true);
    // zooming out so that both fit removes the board warning but not the default-view status
    graph.board.box = [-100, 100, 100, -100];
    expect(caption(graph).some((line: string) => line.startsWith('zunaj pogleda'))).toBe(false);
    expect(everyText(graph)).not.toMatch(/NaN|Infinity/);
});

test('the lesson action registry handles the operand names and refuses the others', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, parameter('complex-w-re', -1));
    apply(graph, parameter('complex-w-im', 0.5));
    apply(graph, parameter('complex-z-im', -1.5));
    expect(graph.model).toMatchObject({wRe: -1, wIm: 0.5, zIm: -1.5});
    expect(() => apply(graph, {kind: 'function-parameter', name: 'uniform-x', value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'complex-product', visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'complex-example', value: 'zero'} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'sequence', command: 'next-step'} as LessonAction)).toThrow(UnsupportedLessonActionError);
});

test('presets round-trip, a malformed preset explains itself and loads the default, and capture, restore and Reset bring back the model and the board', () => {
    const graph = makeGraph();
    set(graph, {example: 'division', zRe: -1.35, zIm: 1, wRe: 2, wIm: 0.65, reciprocalVisible: true, quotientVisible: true, circleVisible: true, centreRe: -0.5, centreIm: 0.25, radius: 0.75});
    const exported = graph.exportPresetData();
    expect(exported).toEqual({
        example: 'division', zRe: -1.35, zIm: 1, wRe: 2, wIm: 0.65, reciprocalVisible: true, quotientVisible: true, circleVisible: true, centreRe: -0.5, centreIm: 0.25, radius: 0.75,
    });
    const other = makeGraph();
    other.importPreset({id: 'stored', data: JSON.parse(JSON.stringify(exported))});
    expect(other.model).toEqual(exported);
    // the board shows the imported model, not only the fields
    expect(at(points(other)[Z_POINT])).toEqual([-1.35, 1]);
    expect(at(points(other)[CENTRE])).toEqual([-0.5, 0.25]);
    expect(at(points(other)[RADIUS])).toEqual([0.25, 0.25]);
    expect(shown(points(other)[RECIPROCAL])).toBe(true);
    expect(visible(curves(other)[INVERSION_CIRCLE])).toBe(true);
    expect(graph.defaultPreset()).toEqual(DEFAULT_COMPLEX_RECIPROCAL_MODEL);

    const valid = {...DEFAULT_COMPLEX_RECIPROCAL_MODEL};
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad: [unknown, RegExp][] = [
        [{...valid, example: 'cubic'}, /example/], [{...valid, zRe: 2.05}, /zRe.*0\.05.*[-−]2.*2/], [{...valid, centreIm: 0.01}, /centreIm/], [{...valid, wIm: -3}, /wIm/],
        [{...valid, radius: 0}, /radius.*0\.05.*2/], [{...valid, radius: 2.05}, /radius/], [{...valid, circleVisible: 'yes'}, /circleVisible.*true.*false/],
        [{...valid, quotientVisible: 1}, /quotientVisible/], [{...valid, wIm: '1'}, /./], [{}, /./], [[], /./],
    ];
    for (const [entry, pattern] of bad) {
        const checked = complexReciprocalPresetCollection.check(entry);
        expect('rejection' in checked, JSON.stringify(entry)).toBe(true);
        if ('rejection' in checked) expect(renderMessage(checked.rejection), JSON.stringify(entry)).toMatch(pattern);
        other.importPreset({id: 'stored', data: entry});
        expect(other.model, JSON.stringify(entry)).toEqual(valid);
        expect(shown(points(other)[RECIPROCAL])).toBe(false);
        expect(at(points(other)[Z_POINT])).toEqual([1, 1]);
    }
    expect(renderMessage(rejectionOf({...valid, radius: 3}))).toBe('polje radius mora biti večkratnik števila 0.05 med 0.05 in 2; popravi vrednost v datoteki');
    setLanguage('en');
    expect(renderMessage(rejectionOf({...valid, radius: 3}))).toBe('the field radius must be a multiple of 0.05 between 0.05 and 2; correct the value in the file');
    setLanguage('sl');
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();

    // capture, then Reset (the demonstration default), then restore: the model and the board return together
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual(exported);
    apply(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
    expect(graph.model).toEqual(valid);
    expect(at(points(graph)[Z_POINT])).toEqual([1, 1]);
    expect(at(points(graph)[CENTRE])).toEqual([0.5, 0]);
    expect(at(points(graph)[RADIUS])).toEqual([1.5, 0]);
    expect(shown(points(graph)[RECIPROCAL])).toBe(false);
    expect(visible(curves(graph)[INVERSION_CIRCLE])).toBe(false);
    expect(caption(graph)[2]).toBe('1/z: skrit');
    expect(rows(graph)).toMatchObject({reciprocal: 'skrito', 'circle-centre': 'skrito'});
    expect(controls(graph).zRe.props.value).toBe(1);
    expect(controls(graph).radius.props.value).toBe(1);
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual(exported);
    expect(at(points(graph)[Z_POINT])).toEqual([-1.35, 1]);
    expect(at(points(graph)[RADIUS])).toEqual([0.25, 0.25]);
    expect(shown(points(graph)[QUOTIENT])).toBe(true);
    expect(controls(graph).zRe.props.value).toBe(-1.35);
    expect(controls(graph).radius.props.value).toBe(0.75);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
    // the handle direction does not survive a restore: it is back on the right of the circle
    expect(at(points(graph)[RADIUS])).toEqual([-0.5 + 0.75, 0.25]);
});

test('the board caption, readouts, statuses and legend follow the language, and a language change notifies subscribers', () => {
    const graph = makeGraph({asyncState: false});
    set(graph, {reciprocalVisible: true, quotientVisible: true, circleVisible: true, zRe: 1, zIm: -1});
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    expect(caption(graph)).toEqual([
        'z = 1 − i, w = 2 + i', `${ZBAR} = 1 + i`, '1/z = 0,5 + 0,5i', 'w/z = 0,5 + 1,5i', 'z\' = 0,9 − 0,8i',
        'krog: z; kvadrat: w; plus: z̄; romb: 1/z; trikotnik: w/z; križec: z\'',
    ]);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)[2]).toBe('1/z = 0.5 + 0.5i');
    expect(caption(graph)[5]).toBe('circle: z; square: w; plus: z̄; diamond: 1/z; triangle: w/z; cross: z\'');
    expect(rows(graph)).toMatchObject({reciprocal: '0.5 + 0.5i', quotient: '0.5 + 1.5i', position: 'outside (|z| > 1)'});
    expect(graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: any) => status.text)).toEqual([
        '|z| > 1: z is outside the unit circle, so 1/z is inside it (|1/z| = 1/|z| < 1).',
    ]);
    set(graph, {reciprocalVisible: false});
    expect(caption(graph)[2]).toBe('1/z: hidden');
    expect(rows(graph).reciprocal).toBe('hidden');
    expect(controls(graph).showReciprocal.props.children).toBe('Show 1/z');
    expect(controls(graph).showCircle.props.children).toBe('Hide inversion circle');
    expect(controls(graph).radius.props.label).toBe('Radius r');
    setLanguage('sl');
    expect(caption(graph)[2]).toBe('1/z: skrit');
    expect(controls(graph).showReciprocal.props.children).toBe('Pokaži 1/z');
    expect(controls(graph).radius.props.label).toBe('Polmer r');
    // below 520 px the labels stay short: the circle line and the key are left out
    graph.board.canvasWidth = 390;
    expect(caption(graph)).toHaveLength(4);
    graph.board.canvasWidth = 700;
    expect(caption(graph)).toHaveLength(6);
    unsubscribe();
});

test('unmounting releases every owned object and reference, and a late drag after unmount only touches the model', () => {
    const graph = makeGraph({asyncState: false});
    const z = points(graph)[Z_POINT];
    expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    graph.unmount();
    expect(graph.generatedObjectCount).toBe(0);
    expect(graph.pointZ).toBeUndefined();
    expect(graph.pointCentre).toBeUndefined();
    expect(graph.pointRadius).toBeUndefined();
    expect(graph.model).toEqual(DEFAULT_COMPLEX_RECIPROCAL_MODEL);
    z.x = 0.5;
    z.y = 0.5;
    expect(() => z.handlers.drag()).not.toThrow();
});
