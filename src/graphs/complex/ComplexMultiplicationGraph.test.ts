import {ComplexMultiplicationGraph} from './ComplexMultiplicationGraph';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {COMPLEX_EXAMPLE_MODELS, DEFAULT_COMPLEX_MODEL} from '../../analysis/complexModel';
import {COMPLEX_MAX_PRODUCT_MODULUS, complexModulus, complexMultiply, snapComplexCoordinate} from '../../analysis/complex';
import {setLanguage, onLanguageChange} from '../../localization';

const BOX = [-4.5, 4.5, 4.5, -4.5];

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
        getBoundingBox: vi.fn(() => BOX),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick (unless asyncState is false). */
function makeGraph({asyncState = true}: { asyncState?: boolean } = {}) {
    const graph = new ComplexMultiplicationGraph() as any;
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
type ParameterName = 'complex-z-re' | 'complex-z-im' | 'complex-w-re' | 'complex-w-im' | 'complex-w-modulus' | 'complex-w-argument';
const parameter = (name: ParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'complex-example', value});
const product = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'complex-product', visible});
const arguments_ = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'complex-arguments', visible});
const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const resolve = (value: any) => typeof value === 'function' ? value() : value;
const visible = (object: any) => resolve(object.attributes.visible);

// Creation order per type (see createScene): curves are the argument arcs of z, w and zw and then the arrows of z, w and zw (straight parametric curves
// with an arrowhead); points are the product marker, z and w; texts are the axis names Re and Im and the caption.
const [ARC_Z, ARC_W, ARC_PRODUCT] = [0, 1, 2];
const [ARROW_Z, ARROW_W, ARROW_PRODUCT] = [0, 1, 2];
const [PRODUCT_POINT, Z_POINT, W_POINT] = [0, 1, 2];
const OBJECT_COUNT = 12;
const arcs = (graph: any) => ofType(graph, 'curve').slice(0, 3);
const arrows = (graph: any) => ofType(graph, 'curve').slice(3);
const points = (graph: any) => ofType(graph, 'point');
const caption = (graph: any) => graph.captionPlainLines();
const at = (point: any) => [point.X(), point.Y()];

/** Collects the React elements of a rendered tree by component name or host tag. */
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
    const [zRe, zIm, wRe, wIm, modulus, argument] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    return {
        found, select: found.ChoiceSelect[0], zRe, zIm, wRe, wIm, modulus, argument,
        showProduct: button('toggle-complex-product'), showArguments: button('toggle-complex-arguments'),
    };
};
const rows = (graph: any): Record<string, string> =>
    Object.fromEntries((graph.renderReadout().props.children[0].props.rows as { id: string; value: string }[]).map(row => [row.id, row.value]));
const statusIds = (graph: any) => graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { id: string }) => status.id);
const labelOf = (point: any) => ({anchorX: resolve(point.attributes.label.anchorX), anchorY: resolve(point.attributes.label.anchorY)});

beforeEach(() => setLanguage('sl'));

test('initialization draws (1 + i) i with the product and the arcs hidden, from a fixed pool of owned objects', () => {
    const graph = makeGraph();
    expect(graph.model).toEqual(DEFAULT_COMPLEX_MODEL);
    expect(graph.model).toEqual({example: 'rotation-i', zRe: 1, zIm: 1, wRe: 0, wIm: 1, productVisible: false, anglesVisible: false});
    expect(graph.presets()).toBe('complex-multiplication');
    // the complex plane has equal axis units
    expect(graph.board.setBoundingBox).toHaveBeenCalledWith(BOX, true);
    expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
    expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    expect(caption(graph)).toEqual(['z = 1 + i, w = i', 'zw: skrit', 'krog: z; kvadrat: w; romb: zw']);
    expect(at(points(graph)[Z_POINT])).toEqual([1, 1]);
    expect(at(points(graph)[W_POINT])).toEqual([0, 1]);
    // the axes are named Re and Im
    const texts = ofType(graph, 'text');
    expect(texts.slice(0, 2).map((text: any) => text.parents[2])).toEqual(['Re', 'Im']);
    // the pool is the same for every example, visibility and operand
    for (const action of [choice('zero'), product(true), arguments_(true), parameter('complex-z-re', -2), parameter('complex-w-im', 2), choice('general')]) {
        apply(graph, action);
        expect(graph.board.objectsList).toHaveLength(OBJECT_COUNT);
        expect(graph.generatedObjectCount).toBe(OBJECT_COUNT);
    }
    graph.removeGeneratedObjects();
    expect(graph.board.objectsList).toHaveLength(0);
    expect(graph.generatedObjectCount).toBe(0);
});

test('z, w and zw differ by shape, line pattern and name, not only by colour; the product exists only after Show product', () => {
    const graph = makeGraph();
    const [productPoint, zPoint, wPoint] = [points(graph)[PRODUCT_POINT], points(graph)[Z_POINT], points(graph)[W_POINT]];
    expect([zPoint, wPoint, productPoint].map(point => point.attributes.face)).toEqual(['o', '[]', '<>']);
    expect([zPoint, wPoint, productPoint].map(point => point.attributes.name)).toEqual(['$$z$$', '$$w$$', '$$zw$$']);
    expect(new Set([zPoint, wPoint, productPoint].map(point => point.attributes.fillColor)).size).toBe(3);
    expect([arrows(graph)[ARROW_Z], arrows(graph)[ARROW_W]].map(arrow => arrow.attributes.dash)).toEqual([0, 2]);
    expect(arrows(graph).every((arrow: any) => arrow.attributes.lastArrow)).toBe(true);
    // each arrow runs from the origin (t = 0) to its tip (t = 1)
    const tip = (arrow: any) => [arrow.parents[0](1), arrow.parents[1](1), arrow.parents[0](0), arrow.parents[1](0)].map(value => value + 0);
    expect([ARROW_Z, ARROW_W].map(index => tip(arrows(graph)[index]))).toEqual([[1, 1, 0, 0], [0, 1, 0, 0]]);
    // the product arrow is thicker than the operand arrows
    expect(resolve(arrows(graph)[ARROW_PRODUCT].attributes.strokeWidth)).toBeGreaterThan(resolve(arrows(graph)[ARROW_Z].attributes.strokeWidth));
    expect(visible(productPoint)).toBe(false);
    expect(visible(arrows(graph)[ARROW_PRODUCT])).toBe(false);
    expect([visible(arrows(graph)[ARROW_Z]), visible(arrows(graph)[ARROW_W])]).toEqual([true, true]);
    // the label of the product follows the marker
    expect(resolve(productPoint.attributes.label.visible)).toBe(false);
    apply(graph, product(true));
    expect(visible(productPoint)).toBe(true);
    expect(tip(arrows(graph)[ARROW_PRODUCT])).toEqual([-1, 1, 0, 0]);
    expect(visible(arrows(graph)[ARROW_PRODUCT])).toBe(true);
    expect(resolve(productPoint.attributes.label.visible)).toBe(true);
    // only z and w can be dragged
    expect(zPoint.on).toHaveBeenCalledWith('drag', expect.any(Function));
    expect(wPoint.on).toHaveBeenCalledWith('drag', expect.any(Function));
    expect(productPoint.on).not.toHaveBeenCalled();
    expect(productPoint.attributes.fixed).toBe(true);
});

test('(1 + i) i = -1 + i is hidden until Show product and then shown with its modulus, argument and rule', () => {
    const graph = makeGraph({asyncState: false});
    expect(rows(graph)).toMatchObject({
        z: '1 + i', 'z-modulus': '1,4142', 'z-argument': 'π/4 ≈ 0,785', w: 'i', 'w-modulus': '1', 'w-argument': 'π/2 ≈ 1,571',
        product: 'skrito', 'product-modulus': 'skrito', 'product-argument': 'skrito', 'modulus-rule': 'skrito', 'argument-rule': 'skrito',
    });
    expect(statusIds(graph)).toEqual(['hidden']);
    controls(graph).showProduct.props.onClick();
    expect(graph.model.productVisible).toBe(true);
    expect(rows(graph)).toMatchObject({
        product: '−1 + i', 'product-modulus': '1,4142', 'product-argument': '3π/4 ≈ 2,356', 'modulus-rule': '1,4142 · 1 = 1,4142', 'argument-rule': '3π/4 ≈ 2,356',
    });
    expect(statusIds(graph)).toEqual(['not-reduced']);
    expect(at(points(graph)[PRODUCT_POINT])).toEqual([-1, 1]);
    expect(caption(graph)).toEqual(['z = 1 + i, w = i', 'zw = −1 + i', 'krog: z; kvadrat: w; romb: zw']);
    // |zw| = |z||w| and the arguments add: independent values
    expect(complexModulus(complexMultiply({re: 1, im: 1}, {re: 0, im: 1}))).toBeCloseTo(Math.SQRT2, 12);
    // multiplying by 1 keeps the point, by -1 rotates it by pi, by 2 scales it
    for (const [example, expected] of [['identity', '1 + i'], ['negation', '−1 − i'], ['scaling', '2 + 2i'], ['general', '2i']] as const) {
        apply(graph, choice(example));
        expect(graph.model.productVisible).toBe(false);
        apply(graph, product(true));
        expect(rows(graph).product).toBe(expected);
    }
    expect(rows(graph)['product-modulus']).toBe('2');
    expect(rows(graph)['modulus-rule']).toBe('1,4142 · 1,4142 ≈ 2');
});

test('a zero operand gives the product 0 and an argument that reads "ni definiran", never 0', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('zero'));
    apply(graph, product(true));
    apply(graph, arguments_(true));
    expect(rows(graph)).toMatchObject({
        w: '0', 'w-modulus': '0', 'w-argument': 'ni definiran', product: '0', 'product-modulus': '0', 'product-argument': 'ni definiran', 'argument-rule': 'ni definiran',
        'modulus-rule': '1,4142 · 0 = 0',
    });
    expect(statusIds(graph)).toEqual(['w-zero', 'product-zero']);
    expect(caption(graph)).toEqual(['z = 1 + i, w = 0', 'zw = 0', 'arg zw: ni definiran', 'krog: z; kvadrat: w; romb: zw']);
    // the arrow and the arc of 0 are not drawn
    expect(visible(arrows(graph)[ARROW_W])).toBe(false);
    expect(visible(arrows(graph)[ARROW_PRODUCT])).toBe(false);
    for (const index of [ARC_W, ARC_PRODUCT]) {
        arcs(graph)[index].updateDataArray();
        expect(arcs(graph)[index].dataX).toEqual([]);
    }
    // z = 0 as well
    apply(graph, parameter('complex-z-re', 0));
    apply(graph, parameter('complex-z-im', 0));
    expect(rows(graph)['z-argument']).toBe('ni definiran');
    expect(statusIds(graph)).toEqual(['z-zero', 'w-zero', 'product-zero']);
    apply(graph, choice('rotation-i'));
    apply(graph, parameter('complex-z-re', 0));
    apply(graph, parameter('complex-z-im', 0));
    expect(statusIds(graph)).toEqual(['hidden', 'z-zero']);
    // English wording
    setLanguage('en');
    expect(rows(graph)['z-argument']).toBe('undefined');
    expect(graph.statuses(graph.model, graph.viewOf(graph.model))[1].text).toBe('z = 0: its argument is undefined (it is not 0).');
});

test('the argument sum is reduced into (-pi, pi] and the reduction is stated only when it happens', () => {
    const graph = makeGraph({asyncState: false});
    // z = w = -1 + i: 3pi/4 + 3pi/4 = 3pi/2 -> -pi/2
    for (const action of [choice('general'), parameter('complex-z-re', -1), parameter('complex-w-re', -1), product(true), arguments_(true)]) apply(graph, action);
    expect(rows(graph)).toMatchObject({product: '−2i', 'product-modulus': '2', 'product-argument': '−π/2 ≈ −1,571', 'argument-rule': '3π/2 ≈ 4,712 → −π/2 ≈ −1,571'});
    expect(statusIds(graph)).toEqual(['reduced']);
    expect(graph.statuses(graph.model, graph.viewOf(graph.model))[0].text)
        .toBe('arg z + arg w = 3π/2 ≈ 4,712 leži zunaj (−π, π]. Odštejemo ali prištejemo 2π in dobimo arg zw = −π/2 ≈ −1,571.');
    expect(caption(graph)[2]).toBe('arg: 3π/4 + 3π/4 = 3π/2 → −π/2');
    // the arcs: z and w sweep 3pi/4 counter-clockwise, zw sweeps -pi/2 (clockwise)
    arcs(graph)[ARC_PRODUCT].updateDataArray();
    const last = arcs(graph)[ARC_PRODUCT].dataX.length - 1;
    expect(arcs(graph)[ARC_PRODUCT].dataX[0]).toBeCloseTo(58 / 50, 12);
    expect(arcs(graph)[ARC_PRODUCT].dataX[last]).toBeCloseTo(0, 12);
    expect(arcs(graph)[ARC_PRODUCT].dataY[last]).toBeCloseTo(-58 / 50, 12);
    // w = -1: pi/4 + pi = 5pi/4 -> -3pi/4
    apply(graph, choice('negation'));
    apply(graph, product(true));
    expect(rows(graph)['argument-rule']).toBe('5π/4 ≈ 3,927 → −3π/4 ≈ −2,356');
    // no reduction at z = w = 1 + i
    apply(graph, choice('general'));
    apply(graph, product(true));
    expect(statusIds(graph)).toEqual(['not-reduced']);
    expect(rows(graph)['argument-rule']).toBe('π/2 ≈ 1,571');
});

test('Cartesian controls, polar controls and lesson actions give equivalent models', () => {
    const target = {example: 'rotation-i', zRe: 1, zIm: 1, wRe: 1, wIm: 1, productVisible: true, anglesVisible: false};

    const viaLesson = makeGraph({asyncState: false});
    apply(viaLesson, parameter('complex-w-re', 1));
    apply(viaLesson, product(true));

    const viaCartesian = makeGraph({asyncState: false});
    expect(controls(viaCartesian).wRe.props.onChange(1)).toBe(true);
    controls(viaCartesian).showProduct.props.onClick();

    // polar: the modulus keeps the argument of w = i (pi/2), then the argument keeps the modulus: (0, 1.4) -> (1, 1)
    const viaPolar = makeGraph({asyncState: false});
    expect(controls(viaPolar).modulus.props.onChange(Math.SQRT2)).toBe(true);
    expect(viaPolar.model).toMatchObject({wRe: 0, wIm: 1.4});
    expect(controls(viaPolar).argument.props.onChange(Math.PI / 4)).toBe(true);
    controls(viaPolar).showProduct.props.onClick();

    const viaPolarLesson = makeGraph({asyncState: false});
    apply(viaPolarLesson, parameter('complex-w-modulus', Math.SQRT2));
    apply(viaPolarLesson, parameter('complex-w-argument', Math.PI / 4));
    apply(viaPolarLesson, product(true));

    for (const graph of [viaLesson, viaCartesian, viaPolar, viaPolarLesson]) expect(graph.model).toEqual(target);
    expect(rows(viaCartesian)).toEqual(rows(viaLesson));
    expect(rows(viaPolar)).toEqual(rows(viaLesson));
    expect(caption(viaPolar)).toEqual(caption(viaLesson));
    expect(statusIds(viaPolar)).toEqual(statusIds(viaLesson));

    // the polar fields are re-derived from the snapped w, not kept as typed
    const typed = makeGraph({asyncState: false});
    apply(typed, choice('general'));
    expect(controls(typed).modulus.props.onChange(1.5)).toBe(true);
    expect(typed.model).toMatchObject({wRe: 1.05, wIm: 1.05});
    expect(controls(typed).modulus.props.value).toBeCloseTo(Math.hypot(1.05, 1.05), 12);
    expect(controls(typed).argument.props.value).toBeCloseTo(Math.PI / 4, 12);
    // polar inputs apply on Enter or blur, so the text under the user's hands is not rewritten
    expect(controls(typed).modulus.props.applyOn).toBe('confirm');
    expect(controls(typed).argument.props.applyOn).toBe('confirm');
    expect(controls(typed).zRe.props.applyOn).toBeUndefined();
});

test('the polar controls reject, never clamp: a modulus or argument that leaves the grid square or reaches the origin', () => {
    const graph = makeGraph({asyncState: false});
    apply(graph, choice('general'));
    const before = {...graph.model};
    expect(controls(graph).modulus.props.onChange(3)).toBe(false);
    expect(controls(graph).modulus.props.onChange(-1)).toBe(false);
    expect(controls(graph).modulus.props.onChange(0.01)).toBe(false);
    expect(controls(graph).argument.props.onChange(7)).toBe(false);
    expect(controls(graph).argument.props.onChange(Number.NaN)).toBe(false);
    expect(graph.model).toEqual(before);
    // modulus 2.8 at pi/4 snaps to (2, 2), a corner of the square
    expect(controls(graph).modulus.props.onChange(2.8)).toBe(true);
    expect(graph.model).toMatchObject({wRe: 2, wIm: 2});
    // turning the corner point leaves the square: refused, w stays where it was
    expect(controls(graph).argument.props.onChange(Math.PI / 4 + 0.4)).toBe(false);
    expect(controls(graph).argument.props.onChange(-Math.PI)).toBe(false);
    expect(graph.model).toMatchObject({wRe: 2, wIm: 2});
    // a half turn of a shorter w lands on the negative real axis with an exactly zero (not negative zero) imaginary part
    apply(graph, choice('general'));
    expect(controls(graph).argument.props.onChange(-Math.PI)).toBe(true);
    expect(graph.model).toMatchObject({wRe: -1.4, wIm: 0});
    expect(Object.is(graph.model.wIm, -0)).toBe(false);

    // with w = 0 the argument has no value: the field is disabled with a visible explanation and the lesson action refuses
    const zero = makeGraph({asyncState: false});
    apply(zero, choice('zero'));
    const argumentField = controls(zero).argument;
    expect(argumentField.props.disabled).toBe(true);
    expect(argumentField.props.value).toBeUndefined();
    expect(argumentField.props.describedBy).toBe('complex-w-argument-help');
    const help = collect([zero.renderControls(), zero.renderReveals()]).p.find((paragraph: any) => paragraph.props.id === 'complex-w-argument-help');
    expect(help.props['data-complex-argument-help']).toBe('zero');
    expect(help.props.children).toBe('Argument števila 0 ni definiran, zato polja ni mogoče urejati. Modul nad 0 postavi w na pozitivno realno os.');
    expect(controls(zero).argument.props.onChange(1)).toBe(false);
    expect(() => apply(zero, parameter('complex-w-argument', 1))).toThrow(/undefined/);
    expect(zero.model).toMatchObject({wRe: 0, wIm: 0});
    // a modulus above 0 puts w on the positive real axis; a modulus of 0 gives w = 0 again
    expect(controls(zero).modulus.props.onChange(1.5)).toBe(true);
    expect(zero.model).toMatchObject({wRe: 1.5, wIm: 0});
    expect(controls(zero).argument.props.disabled).toBe(false);
    expect(controls(zero).modulus.props.onChange(0)).toBe(true);
    expect(zero.model).toMatchObject({wRe: 0, wIm: 0});
    // the same refusals reach a lesson action as a DomainError, never a clamp
    expect(() => apply(zero, parameter('complex-w-modulus', 3))).toThrow();
    expect(zero.model).toMatchObject({wRe: 0, wIm: 0});
});

test('Cartesian number fields snap arithmetic noise to the 0.05 grid and reject a real off-grid or out-of-range value', () => {
    const graph = makeGraph({asyncState: false});
    expect(controls(graph).zRe.props.onChange(0.1 + 0.2)).toBe(true);
    expect(graph.model.zRe).toBe(0.3);
    expect(controls(graph).zIm.props.onChange(-0)).toBe(true);
    expect(Object.is(graph.model.zIm, -0)).toBe(false);
    expect(controls(graph).wRe.props.onChange(0.123)).toBe(false);
    expect(controls(graph).wRe.props.onChange(2.05)).toBe(false);
    expect(controls(graph).wIm.props.onChange(-2.05)).toBe(false);
    expect(controls(graph).wIm.props.onChange(Number.NaN)).toBe(false);
    expect(graph.model).toMatchObject({zRe: 0.3, zIm: 0, wRe: 0, wIm: 1});
    expect(controls(graph).wIm.props.onChange(-2)).toBe(true);
    expect(controls(graph).wRe.props.onChange(2)).toBe(true);
    expect(graph.model).toMatchObject({wRe: 2, wIm: -2});
    // a lesson action refuses with a DomainError and leaves the model unchanged
    expect(() => apply(graph, parameter('complex-z-re', 2.5))).toThrow();
    expect(() => apply(graph, choice('cubic'))).toThrow();
    expect(graph.model).toMatchObject({zRe: 0.3});
    // editing numbers keeps the last chosen example's label
    expect(graph.model.example).toBe('rotation-i');
    apply(graph, choice('scaling'));
    controls(graph).wRe.props.onChange(1);
    expect(graph.model.example).toBe('scaling');
    // every field carries its hint and a keyboard step of 0.05
    for (const field of [controls(graph).zRe, controls(graph).zIm, controls(graph).wRe, controls(graph).wIm]) {
        expect(field.props).toMatchObject({min: -2, max: 2, step: 0.05, rejectedHint: 'Vrednost mora biti večkratnik števila 0,05 med −2 in 2.'});
    }
});

test('dragging z and w projects onto the 0.05 grid inside [-2, 2] and writes through the same setter, once per event', () => {
    const graph = makeGraph({asyncState: false});
    const z = points(graph)[Z_POINT];
    const writes = graph.setState.mock.calls.length;
    z.x = 1.234;
    z.y = -0.9;
    z.handlers.drag();
    expect(graph.model).toMatchObject({zRe: 1.25, zIm: -0.9, example: 'rotation-i'});
    expect(at(z)).toEqual([1.25, -0.9]);
    expect(graph.setState.mock.calls.length).toBe(writes + 1);
    // outside the square the drag is limited to its edge (a pointer position, not an entered value)
    z.x = 5;
    z.y = -7;
    z.handlers.drag();
    expect(graph.model).toMatchObject({zRe: 2, zIm: -2});
    expect(at(z)).toEqual([2, -2]);
    const w = points(graph)[W_POINT];
    w.x = -0.5;
    w.y = 0.02;
    w.handlers.drag();
    expect(graph.model).toMatchObject({wRe: -0.5, wIm: 0});
    expect(Object.is(graph.model.wIm, -0)).toBe(false);
    expect(at(w)).toEqual([-0.5, 0]);
    // the product follows the drag
    apply(graph, product(true));
    expect(at(points(graph)[PRODUCT_POINT])).toEqual([-1, 1]);
    // a model change by something else (a lesson action) moves the points back
    apply(graph, parameter('complex-z-re', 0.5));
    expect(at(z)).toEqual([0.5, -2]);
    apply(graph, choice('rotation-i'));
    expect(at(z)).toEqual([1, 1]);
    expect(at(w)).toEqual([0, 1]);
    // a drag with a non-finite position does nothing
    const model = {...graph.model};
    z.x = Number.NaN;
    z.handlers.drag();
    expect(graph.model).toEqual(model);
});

test('the largest products stay finite and within |zw| <= 8; those beyond the default view are announced on the board and in the inspector', () => {
    const graph = makeGraph({asyncState: false});
    let largest = 0;
    for (const re of [-2, 0, 2]) for (const im of [-2, 0, 2]) largest = Math.max(largest, complexModulus(complexMultiply({re, im}, {re: 2, im: 2})));
    expect(largest).toBeCloseTo(COMPLEX_MAX_PRODUCT_MODULUS, 12);
    // z = w = 2 + 2i: zw = 8i, outside the default square of half-width 4.5
    for (const action of [parameter('complex-z-re', 2), parameter('complex-z-im', 2), parameter('complex-w-re', 2), parameter('complex-w-im', 2)]) apply(graph, action);
    // hidden: nothing about the product leaks
    expect(statusIds(graph)).toEqual(['hidden']);
    expect(caption(graph).join('|')).not.toMatch(/8/);
    apply(graph, product(true));
    expect(rows(graph).product).toBe('8i');
    expect(statusIds(graph)).toEqual(['not-reduced', 'off-view']);
    expect(graph.statuses(graph.model, graph.viewOf(graph.model))[1].text).toBe('Zmnožek zw (|zw| = 8) leži zunaj privzetega pogleda. Pomanjšaj pogled, da ga vidiš (kolešček miške ali ščipanje).');
    expect(caption(graph)).toContain('zw je zunaj pogleda');
    // zooming out until the product is inside removes the board line (the live view decides)
    graph.board.getBoundingBox.mockReturnValue([-10, 10, 10, -10]);
    expect(caption(graph)).not.toContain('zw je zunaj pogleda');
    graph.board.getBoundingBox.mockReturnValue(BOX);
    // a product inside the default view says nothing
    apply(graph, choice('rotation-i'));
    apply(graph, product(true));
    expect(statusIds(graph)).toEqual(['not-reduced']);
    expect(caption(graph)).not.toContain('zw je zunaj pogleda');
    // every product of in-domain grid operands is within the maximum modulus
    for (const a of [-2, -1.05, 0, 0.35, 2]) for (const b of [-2, -0.5, 0, 1.95, 2]) {
        const p = complexMultiply({re: a, im: b}, {re: snapComplexCoordinate(b), im: snapComplexCoordinate(a)});
        expect(complexModulus(p)).toBeLessThanOrEqual(COMPLEX_MAX_PRODUCT_MODULUS + 1e-12);
    }
});

test('labels point away from the origin, never sit on an axis, and take other sides when tips coincide', () => {
    const graph = makeGraph({asyncState: false});
    const [productPoint, zPoint, wPoint] = [points(graph)[PRODUCT_POINT], points(graph)[Z_POINT], points(graph)[W_POINT]];
    apply(graph, product(true));
    // z = 1 + i, w = i, zw = -1 + i
    expect([labelOf(zPoint), labelOf(wPoint), labelOf(productPoint)]).toEqual([
        {anchorX: 'left', anchorY: 'bottom'}, {anchorX: 'left', anchorY: 'bottom'}, {anchorX: 'right', anchorY: 'bottom'},
    ]);
    // w = 1: zw = z, so the product label goes to the other horizontal side of the shared tip while z keeps its label
    apply(graph, choice('identity'));
    apply(graph, product(true));
    expect(labelOf(zPoint)).toEqual({anchorX: 'left', anchorY: 'bottom'});
    expect(labelOf(productPoint)).toEqual({anchorX: 'right', anchorY: 'bottom'});
    // w = 0: w and zw both sit at the origin
    apply(graph, choice('zero'));
    apply(graph, product(true));
    expect(labelOf(wPoint)).toEqual({anchorX: 'right', anchorY: 'top'});
    expect(labelOf(productPoint)).toEqual({anchorX: 'left', anchorY: 'top'});
    // z = w = 1 + i: the later label moves
    apply(graph, choice('general'));
    expect(labelOf(zPoint)).not.toEqual(labelOf(wPoint));
    // z = w = zw = 1: three labels at the same tip take three different corners
    for (const action of [parameter('complex-z-re', 1), parameter('complex-z-im', 0), parameter('complex-w-re', 1), parameter('complex-w-im', 0), product(true)]) apply(graph, action);
    expect(graph.model).toMatchObject({zRe: 1, zIm: 0, wRe: 1, wIm: 0});
    expect(new Set([zPoint, wPoint, productPoint].map(point => JSON.stringify(labelOf(point)))).size).toBe(3);
    // no label is ever centred on a horizontal or vertical line through its tip (that would put it on an axis for points on the axes)
    for (const re of [-2, -0.5, 0, 0.5, 2]) {
        for (const im of [-2, -0.5, 0, 0.5, 2]) {
            apply(graph, parameter('complex-z-re', re));
            apply(graph, parameter('complex-z-im', im));
            expect(['top', 'bottom']).toContain(labelOf(zPoint).anchorY);
            expect(['left', 'right']).toContain(labelOf(zPoint).anchorX);
        }
    }
});

test('argument arcs are drawn only after Show arguments, at pixel radii that keep them inside their arrows', () => {
    const graph = makeGraph({asyncState: false});
    expect(arcs(graph).map(visible)).toEqual([false, false, false]);
    apply(graph, arguments_(true));
    expect(arcs(graph).map(visible)).toEqual([true, true, false]);
    apply(graph, product(true));
    expect(arcs(graph).map(visible)).toEqual([true, true, true]);
    arcs(graph)[ARC_Z].updateDataArray();
    expect(arcs(graph)[ARC_Z].dataX).toHaveLength(33);
    expect(arcs(graph)[ARC_Z].dataX[0]).toBeCloseTo(30 / 50, 12);
    expect(arcs(graph)[ARC_Z].dataY[0]).toBe(0);
    const end = arcs(graph)[ARC_Z].dataX.length - 1;
    expect(Math.atan2(arcs(graph)[ARC_Z].dataY[end], arcs(graph)[ARC_Z].dataX[end])).toBeCloseTo(Math.PI / 4, 12);
    // a short arrow limits its arc to 80 % of its length
    apply(graph, parameter('complex-z-re', 0.05));
    apply(graph, parameter('complex-z-im', 0));
    arcs(graph)[ARC_Z].updateDataArray();
    expect(arcs(graph)[ARC_Z].dataX[0]).toBeCloseTo(0.04, 12);
    // the argument pi sweeps a half turn
    apply(graph, parameter('complex-z-re', -1));
    arcs(graph)[ARC_Z].updateDataArray();
    const half = arcs(graph)[ARC_Z].dataX.length - 1;
    expect(arcs(graph)[ARC_Z].dataY[half]).toBeCloseTo(0, 12);
    expect(arcs(graph)[ARC_Z].dataX[half]).toBeLessThan(0);
});

test('every lesson scene reproduces the configuration its expectedState describes, applied in one synchronous sequence', () => {
    const lesson = getLessonForDemonstration('complex-multiplication')!;
    expect(lesson.id).toBe('complex-multiplication-guided');
    expect(lesson.steps).toHaveLength(7);
    const finals = lesson.steps.map(step => {
        // the React state lags inside one tick (setState is asynchronous); the model must still be what the actions describe
        const graph = makeGraph({asyncState: true});
        // a deliberately different user state that the default scene must reset
        apply(graph, choice('negation'));
        apply(graph, parameter('complex-z-re', -2));
        apply(graph, product(true));
        for (const action of step.scene!.actions) apply(graph, action);
        return [graph.model, statusIds(graph)];
    });
    const model = (example: string, z: [number, number], w: [number, number], productVisible: boolean) =>
        ({example, zRe: z[0], zIm: z[1], wRe: w[0], wIm: w[1], productVisible, anglesVisible: true});
    expect(finals).toEqual([
        [model('rotation-i', [1, 1], [0, 1], false), ['hidden']],
        [model('rotation-i', [1, 1], [0, 1], false), ['hidden']],
        [model('negation', [1, 1], [-1, 0], false), ['hidden']],
        [model('scaling', [1, 1], [2, 0], false), ['hidden']],
        [model('general', [1, 1], [1, 1], false), ['hidden']],
        [model('general', [-1, 1], [-1, 1], true), ['reduced']],
        [model('zero', [1, 1], [0, 0], false), ['hidden', 'w-zero']],
    ]);
    // the numbers the lesson prose states, read from the graph after the learner presses Show product
    const graph = makeGraph({asyncState: false});
    const run = (index: number) => { for (const action of lesson.steps[index].scene!.actions) apply(graph, action); };
    run(0);
    expect(rows(graph)).toMatchObject({'z-modulus': '1,4142', 'z-argument': 'π/4 ≈ 0,785', 'w-modulus': '1', 'w-argument': 'π/2 ≈ 1,571'});
    run(1);
    apply(graph, product(true));
    expect(rows(graph)).toMatchObject({product: '−1 + i', 'product-modulus': '1,4142', 'product-argument': '3π/4 ≈ 2,356'});
    run(2);
    apply(graph, product(true));
    expect(rows(graph)).toMatchObject({product: '−1 − i', 'product-modulus': '1,4142', 'product-argument': '−3π/4 ≈ −2,356', 'argument-rule': '5π/4 ≈ 3,927 → −3π/4 ≈ −2,356'});
    apply(graph, choice('identity'));
    apply(graph, product(true));
    expect(rows(graph).product).toBe('1 + i');
    run(3);
    apply(graph, product(true));
    expect(rows(graph)).toMatchObject({product: '2 + 2i', 'product-modulus': '2,8284', 'product-argument': 'π/4 ≈ 0,785'});
    run(4);
    apply(graph, product(true));
    expect(rows(graph)).toMatchObject({product: '2i', 'product-modulus': '2', 'product-argument': 'π/2 ≈ 1,571', 'modulus-rule': '1,4142 · 1,4142 ≈ 2', 'argument-rule': 'π/2 ≈ 1,571'});
    run(5);
    expect(rows(graph)).toMatchObject({product: '−2i', 'product-modulus': '2', 'product-argument': '−π/2 ≈ −1,571', 'argument-rule': '3π/2 ≈ 4,712 → −π/2 ≈ −1,571'});
    run(6);
    apply(graph, product(true));
    expect(rows(graph)).toMatchObject({product: '0', 'product-modulus': '0', 'product-argument': 'ni definiran', 'w-argument': 'ni definiran'});
    // Show product after the user presses it in the lesson's prediction step is the graph's own button: the model is the same as the scene's with the flag set
    expect(graph.model.productVisible).toBe(true);
});

test('the lesson action registry handles exactly the complex names and refuses the others', () => {
    const graph = makeGraph({asyncState: false});
    expect(() => apply(graph, {kind: 'function-parameter', name: 'uniform-x', value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-visibility', target: 'uniform-supremum', visible: true} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'function-choice', name: 'uniform-example', value: 'power'} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(() => apply(graph, {kind: 'animation', animationId: 'sequence', command: 'next-step'} as LessonAction)).toThrow(UnsupportedLessonActionError);
    expect(graph.model).toEqual(DEFAULT_COMPLEX_MODEL);
});

test('presets round-trip, an invalid preset loads the default, and capture and restore bring back the synchronous model', () => {
    const graph = makeGraph();
    apply(graph, choice('scaling'));
    apply(graph, parameter('complex-z-re', -1.35));
    apply(graph, parameter('complex-w-im', 0.65));
    apply(graph, product(true));
    apply(graph, arguments_(true));
    const exported = graph.exportPresetData();
    expect(exported).toEqual({example: 'scaling', zRe: -1.35, zIm: 1, wRe: 2, wIm: 0.65, productVisible: true, anglesVisible: true});
    const other = makeGraph();
    other.importPresetData(JSON.parse(JSON.stringify(exported)));
    expect(other.model).toEqual(exported);
    other.importPresetData(JSON.stringify(exported));
    expect(other.model).toEqual(exported);
    expect(graph.defaultPreset()).toBe(JSON.stringify(DEFAULT_COMPLEX_MODEL));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const valid = {...DEFAULT_COMPLEX_MODEL};
    const bad = [null, [], {}, {...valid, example: 'cubic'}, {...valid, zRe: 2.05}, {...valid, zIm: -2.5}, {...valid, wRe: 0.123}, {...valid, wIm: '1'}, {...valid, wIm: Number.NaN},
        {...valid, productVisible: 'yes'}, {...valid, anglesVisible: 1}, {example: 'zero', zRe: 1, zIm: 1, wRe: 0, wIm: 0}];
    for (const entry of bad) {
        other.importPresetData(entry);
        expect(other.model, JSON.stringify(entry)).toEqual(valid);
    }
    expect(warn).toHaveBeenCalledTimes(bad.length);
    warn.mockRestore();
    // capture and restore
    const checkpoint = graph.captureLessonState();
    expect(checkpoint.value.data).toEqual(exported);
    apply(graph, {kind: 'prepared-scene', sceneId: 'x', source: 'demonstration-default'});
    expect(graph.model).toEqual(valid);
    graph.restoreLessonState(checkpoint);
    expect(graph.model).toEqual(exported);
    expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith(checkpoint.value.boardState.boundingBox, true);
});

test('the board caption follows the language, a language change notifies subscribers, and compact boards drop the argument line and the key', () => {
    const graph = makeGraph({asyncState: false});
    for (const action of [choice('general'), parameter('complex-z-re', -1), parameter('complex-w-re', -1), product(true), arguments_(true)]) apply(graph, action);
    const listener = vi.fn();
    const unsubscribe = onLanguageChange(listener);
    setLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(caption(graph)).toEqual(['z = −1 + i, w = −1 + i', 'zw = −2i', 'arg: 3π/4 + 3π/4 = 3π/2 → −π/2', 'circle: z; square: w; diamond: zw']);
    expect(rows(graph)).toMatchObject({'product-argument': '−π/2 ≈ −1.571', z: '−1 + i', 'argument-rule': '3π/2 ≈ 4.712 → −π/2 ≈ −1.571'});
    apply(graph, choice('zero'));
    apply(graph, arguments_(true));
    expect(caption(graph)[1]).toBe('zw: hidden');
    expect(rows(graph).product).toBe('hidden');
    apply(graph, product(true));
    expect(caption(graph)).toEqual(['z = 1 + i, w = 0', 'zw = 0', 'arg zw: undefined', 'circle: z; square: w; diamond: zw']);
    setLanguage('sl');
    expect(caption(graph)).toEqual(['z = 1 + i, w = 0', 'zw = 0', 'arg zw: ni definiran', 'krog: z; kvadrat: w; romb: zw']);
    expect(rows(graph)['w-argument']).toBe('ni definiran');
    // below 520 px the labels stay short: the argument line and the key are left out
    graph.board.canvasWidth = 390;
    expect(caption(graph)).toEqual(['z = 1 + i, w = 0', 'zw = 0']);
    graph.board.canvasWidth = 700;
    expect(caption(graph)).toHaveLength(4);
    unsubscribe();
});

test('the legend and the inspector name z, w and zw with words, patterns and shapes', () => {
    const graph = makeGraph({asyncState: false});
    const legend = collect(graph.renderLegend()).FunctionLegend[0].props.items;
    expect(legend.map((item: any) => item.id)).toEqual(['z', 'w', 'product', 'arcs']);
    expect(legend.map((item: any) => item.label)).toEqual([
        'z: polna črta s krogom', 'w: črtkana črta s kvadratom', 'zw (po Pokaži zmnožek): debela črta z rombom', 'Argumenti (po Pokaži argumente): loki od pozitivne realne osi',
    ]);
    expect(new Set(legend.map((item: any) => item.kind)).size).toBeGreaterThan(1);
    expect(controls(graph).showProduct.props.children).toBe('Pokaži zmnožek');
    expect(controls(graph).showArguments.props.children).toBe('Pokaži argumente');
    expect(controls(graph).select.props.options.map((option: any) => option.value)).toEqual(['rotation-i', 'identity', 'negation', 'scaling', 'general', 'zero']);
    expect(controls(graph).select.props.options[0].text).toBe('Množenje z i (vrtež za π/2)');
    controls(graph).showArguments.props.onClick();
    expect(controls(graph).showArguments.props.children).toBe('Skrij argumente');
    expect(controls(graph).showArguments.props['data-revealed']).toBe(true);
    // the example select loads both operands and hides the product and the arcs
    controls(graph).select.props.onChange('negation');
    expect(graph.model).toEqual(COMPLEX_EXAMPLE_MODELS.negation);
});

test('no readout, caption or status ever shows NaN, Infinity, -0 or a raw undefined (Slovenian wording), in either language', () => {
    const graph = makeGraph({asyncState: false});
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const zRe of [-2, -0.05, 0, 1.95]) {
            for (const zIm of [-2, 0, 0.3]) {
                for (const wRe of [-2, 0, 0.05, 2]) {
                    for (const wIm of [-1.5, 0, 2]) {
                        for (const action of [parameter('complex-z-re', zRe), parameter('complex-z-im', zIm), parameter('complex-w-re', wRe), parameter('complex-w-im', wIm)]) apply(graph, action);
                        for (const shown of [false, true]) {
                            apply(graph, product(shown));
                            apply(graph, arguments_(shown));
                            const text = [...caption(graph), ...Object.values(rows(graph)),
                                ...graph.statuses(graph.model, graph.viewOf(graph.model)).map((status: { text: string }) => status.text)].join(' | ');
                            expect(text).not.toMatch(/NaN|Infinity|−0(?![.,\d])|[0-9]e-\d/);
                            if (language === 'sl') expect(text).not.toMatch(/undefined/);
                        }
                    }
                }
            }
        }
    }
});

test('an argument sum without a pi-multiple form is stated with "≈" alone, never "= ≈"', () => {
    const graph = makeGraph({asyncState: false});
    for (const action of [choice('general'), parameter('complex-z-im', 0.5), product(true), arguments_(true)]) apply(graph, action);
    const text = graph.statuses(graph.model, graph.viewOf(graph.model))[0].text as string;
    expect(text).toMatch(/^arg z \+ arg w ≈ 1,249 leži v \(−π, π\]/);
    expect(text).not.toContain('= ≈');
    // reduced case: 1 + 0.5i squared has argument sum 0.927 (no reduction); z = w = -1 + 0.5i has 2 * 2.678 = 5.356 -> -0.927
    for (const action of [parameter('complex-z-re', -1), parameter('complex-w-re', -1), parameter('complex-w-im', 0.5)]) apply(graph, action);
    const reduced = graph.statuses(graph.model, graph.viewOf(graph.model))[0].text as string;
    expect(reduced).toMatch(/^arg z \+ arg w ≈ 5,356 leži zunaj \(−π, π\]\. Odštejemo ali prištejemo 2π in dobimo arg zw ≈ −0,927\.$/);
    setLanguage('en');
    expect(graph.statuses(graph.model, graph.viewOf(graph.model))[0].text).toMatch(/^arg z \+ arg w ≈ 5\.356 lies outside .* arg zw ≈ −0\.927\.$/);
});
