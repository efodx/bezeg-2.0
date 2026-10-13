import {versionOf} from "../../../bezeg/impl/versioning";
import {JXGBezierCurve} from "./JXGBezierCurve";
import {JXGRationalBezierCurve} from "./JXGRationalBezierCurve";
import {JXGQuadraticC1SplineCurve} from "./JXGQuadraticC1SplineCurve";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";

class FakeSlider {
    private value: number;

    constructor(initialValue: number, readonly parents: any[] = []) { this.value = initialValue; }
    Value() { return this.value; }
    setValue(value: number) { this.value = value; }
    on(_event: string, _handler: () => void) {}
}

class FakePoint {
    private x: number | (() => number);
    private y: number | (() => number);
    private handlers = new Map<string, Set<() => void>>();
    readonly visProp: {fixed?: boolean};
    readonly setPositionDirectly = vi.fn((_mode: number, coords: [number, number]) => {
        this.x = coords[0];
        this.y = coords[1];
    });

    constructor(x: number | (() => number), y: number | (() => number), attributes?: any) {
        this.x = x;
        this.y = y;
        this.visProp = {fixed: attributes?.fixed};
    }

    X() { return typeof this.x === "function" ? this.x() : this.x; }
    Y() { return typeof this.y === "function" ? this.y() : this.y; }
    on(event: string, handler: () => void) {
        const handlers = this.handlers.get(event) ?? new Set();
        handlers.add(handler);
        this.handlers.set(event, handlers);
    }
    off(event: string, handler: () => void) { this.handlers.get(event)?.delete(handler); }
    trigger(event: string) { this.handlers.get(event)?.forEach(handler => handler()); }
    setName(_name: string) {}
    setAttribute(_attributes: any) {}
    hide() {}
    show() {}
    hasPoint() { return false; }
}

function fakeBoard(): {board: JXG.Board; points: FakePoint[]; sliders: FakeSlider[]; removed: any[]} {
    const points: FakePoint[] = [];
    const sliders: FakeSlider[] = [];
    const removed: any[] = [];
    const board = {
        renderer: {},
        containerObj: {style: {}},
        create(type: string, parents: any[], attributes?: any) {
            if (type === "point") {
                const point = new FakePoint(parents[0], parents[1], attributes);
                points.push(point);
                return point;
            }
            if (type === "slider") {
                const slider = new FakeSlider(parents[2][1], parents);
                sliders.push(slider);
                return slider;
            }
            if (type === "curve") return {hasPoint: () => false, hide() {}, show() {}};
            return {hide() {}, show() {}};
        },
        removeObject(objects: any) { removed.push(objects); },
        on: vi.fn(), off: vi.fn(), update: vi.fn(), fullUpdate: vi.fn(),
        suspendUpdate: vi.fn(), unsuspendUpdate: vi.fn(),
    };
    return {board: board as unknown as JXG.Board, points, sliders, removed};
}

function expectWeightsToBeCloseTo(actual: number[], expected: number[]) {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((weight, i) => expect(weight).toBeCloseTo(expected[i], 10));
}

const previousJXG = (globalThis as any).JXG;
beforeAll(() => { (globalThis as any).JXG = {...previousJXG, COORDS_BY_USER: 1}; });
afterAll(() => {
    if (previousJXG === undefined) delete (globalThis as any).JXG;
    else (globalThis as any).JXG = previousJXG;
});

test("Bézier adapter keeps numeric model inputs independent and replaces same-count bindings", () => {
    const {board, points: boardPoints, removed} = fakeBoard();
    const curve = new JXGBezierCurve([[0, 0], [1, 2], [3, 1]], board);
    const modelPoints = curve.getCurve().getPoints();
    const inputPoints = curve.jxgPoints.slice(0, 3) as unknown as FakePoint[];
    expect(modelPoints.every(point => point instanceof PointImpl)).toBe(true);
    expect(modelPoints[0]).not.toBe(inputPoints[0]);

    const oldModelPoint = modelPoints[1] as PointImpl;
    const oldBoardPoint = inputPoints[1];
    oldBoardPoint.setPositionDirectly(1, [1.5, 2.5]);
    expect([oldModelPoint.X(), oldModelPoint.Y()]).toEqual([1, 2]);
    const version = versionOf(curve.getCurve());
    oldBoardPoint.trigger("drag");
    expect([oldModelPoint.X(), oldModelPoint.Y()]).toEqual([1.5, 2.5]);
    expect(versionOf(curve.getCurve())).toBeGreaterThan(version);

    curve.getCurve().moveFor(2, -1);
    expect([oldBoardPoint.X(), oldBoardPoint.Y()]).toEqual([3.5, 1.5]);

    const replacements = [new PointImpl(-1, 0), new PointImpl(0, 3), new PointImpl(2, 0)];
    (curve as any).replaceEditablePoints(replacements);
    const replacementPoints = curve.getCurve().getPoints() as PointImpl[];
    const replacementBoardPoints = curve.jxgPoints.slice(0, 3) as unknown as FakePoint[];
    expect(replacementPoints.map(point => [point.X(), point.Y()])).toEqual([[-1, 0], [0, 3], [2, 0]]);
    expect(removed).toContainEqual(expect.arrayContaining(inputPoints));

    const oldSyncCalls = oldBoardPoint.setPositionDirectly.mock.calls.length;
    oldModelPoint.setCoordinates(9, 9);
    oldBoardPoint.trigger("drag");
    expect(oldBoardPoint.setPositionDirectly).toHaveBeenCalledTimes(oldSyncCalls);
    expect([oldModelPoint.X(), oldModelPoint.Y()]).toEqual([9, 9]);

    replacementPoints[1].setCoordinates(4, 5);
    expect([replacementBoardPoints[1].X(), replacementBoardPoints[1].Y()]).toEqual([4, 5]);
    const curveBeforeElevation = [0, 0.25, 0.5, 0.75, 1].map(t => [curve.getCurve().eval(t).X(), curve.getCurve().eval(t).Y()]);
    curve.elevate();
    const curveAfterElevation = [0, 0.25, 0.5, 0.75, 1].map(t => [curve.getCurve().eval(t).X(), curve.getCurve().eval(t).Y()]);
    expect(curve.getCurve().getPoints().every(point => point instanceof PointImpl)).toBe(true);
    curveBeforeElevation.forEach(([x, y], i) => {
        expect(curveAfterElevation[i][0]).toBeCloseTo(x, 10);
        expect(curveAfterElevation[i][1]).toBeCloseTo(y, 10);
    });
    const elevatedModelPoint = curve.getCurve().getPoints()[1] as PointImpl;
    const elevatedBoardPoint = curve.jxgPoints[1] as unknown as FakePoint;
    curve.dispose();
    const replacementSyncCalls = elevatedBoardPoint.setPositionDirectly.mock.calls.length;
    elevatedModelPoint.setCoordinates(6, 7);
    expect(elevatedBoardPoint.setPositionDirectly).toHaveBeenCalledTimes(replacementSyncCalls);
    expect(boardPoints.length).toBeGreaterThan(3);
});

test("spline inputs remain numeric while derived points stay constrained and cannot be deleted", () => {
    const {board, points: boardPoints} = fakeBoard();
    const curve = new JXGQuadraticC1SplineCurve([[0, 2], [1, -1], [2, 1], [3, 3]], board);
    const inputPoints = curve.getCurve().getPoints();
    const derivedPoints = curve.getCurve().getNonFreePoints();
    expect(inputPoints.every(point => point instanceof PointImpl && !point.isXFunction() && !point.isYFunction())).toBe(true);
    expect(derivedPoints.length).toBeGreaterThan(0);
    expect(derivedPoints.every(point => point.isXFunction() && point.isYFunction())).toBe(true);

    const derived = derivedPoints[0];
    const before = [derived.X(), derived.Y()];
    const inputBoardPoint = curve.jxgPoints[1] as unknown as FakePoint;
    inputBoardPoint.setPositionDirectly(1, [1, -2]);
    inputBoardPoint.trigger("drag");
    expect([inputPoints[1].X(), inputPoints[1].Y()]).toEqual([1, -2]);
    expect([derived.X(), derived.Y()]).not.toEqual(before);

    const fixedBoardPoint = curve.jxgPoints.find(point => (point as any).visProp.fixed)!;
    const fixedIndex = curve.getJxgPoints().indexOf(fixedBoardPoint);
    expect(fixedIndex).toBeGreaterThanOrEqual(0);
    const inputCount = inputPoints.length;
    curve.removePoint(fixedIndex);
    expect(curve.getCurve().getPoints()).toHaveLength(inputCount);
    expect(boardPoints).toContain(fixedBoardPoint);
    curve.dispose();
});

test("rational adapter binds numeric inputs and removes the matching weight", () => {
    const {board} = fakeBoard();
    const curve = new JXGRationalBezierCurve([[0, 0], [1, 2], [2, 1], [3, 0]], [1, 2, 3, 4], board);
    expect(curve.getCurve().getPoints().every(point => point instanceof PointImpl && !point.isXFunction() && !point.isYFunction())).toBe(true);
    curve.removePoint(2);
    expect(curve.getCurve().getPoints()).toHaveLength(3);
    expect(curve.getCurve().getWeights()).toEqual([1, 2, 4]);
    curve.dispose();
});

test("standard form keeps rational raw weights through point addition and deletion", () => {
    const added = new JXGRationalBezierCurve([[0, 0], [1, 2], [2, 1], [3, 0]], [1, 2, 3, 4], fakeBoard().board);
    added.setStandardForm(true);
    added.addPoint(4, 2);
    expect(added.getCurve().getEffectiveWeights()).toEqual([1, 2, 3, 4, 1]);
    added.setStandardForm(false);
    expect(added.getCurve().getWeights()).toEqual([1, 2, 3, 4, 1]);
    added.dispose();

    const deleted = new JXGRationalBezierCurve([[0, 0], [1, 2], [2, 1], [3, 0]], [5, 2, 3, 4], fakeBoard().board);
    deleted.setStandardForm(true);
    deleted.removePoint(2);
    expect(deleted.getCurve().getEffectiveWeights()).toEqual([5, 2, 4]);
    deleted.setStandardForm(false);
    expect(deleted.getCurve().getWeights()).toEqual([5, 2, 4]);
    deleted.dispose();
});

test("rational point edits preserve live Farin weights while standard form is enabled", () => {
    const {board, sliders} = fakeBoard();
    const curve = new JXGRationalBezierCurve([[0, 0], [1, 2], [2, 1], [3, 0]], [1, 2, 3, 4], board);
    curve.setStandardForm(true);
    curve.showFarinPoints(true);
    sliders[1].setValue(0.75);
    expectWeightsToBeCloseTo(curve.getCurve().getEffectiveWeights(), [1, 2, 6, 8]);

    curve.addPoint(4, 2);
    expectWeightsToBeCloseTo(curve.getCurve().getEffectiveWeights(), [1, 2, 6, 8, 1]);
    curve.removePoint(3);
    expectWeightsToBeCloseTo(curve.getCurve().getEffectiveWeights(), [1, 2, 6, 1]);
    curve.showFarinPoints(false);
    curve.setStandardForm(false);
    expectWeightsToBeCloseTo(curve.getCurve().getWeights(), [1, 2, 6, 1]);
    curve.dispose();
});

test("Farin slider endpoints follow moved control points and keep weights", () => {
    const {board, sliders} = fakeBoard();
    const curve = new JXGRationalBezierCurve([[0, 0], [1, 2], [2, 1], [3, 0]], [1, 2, 3, 4], board);
    curve.showFarinPoints(true);
    sliders[1].setValue(0.75);
    const weightsBefore = curve.getCurve().getEffectiveWeights();

    const moved = curve.jxgPoints[1] as unknown as FakePoint;
    moved.setPositionDirectly(1, [1.5, 3]);
    moved.trigger("drag");

    const endpoint = (value: any) => typeof value === "function" ? value() : value;
    expect([endpoint(sliders[0].parents[1][0]), endpoint(sliders[0].parents[1][1])]).toEqual([1.5, 3]);
    expect([endpoint(sliders[1].parents[0][0]), endpoint(sliders[1].parents[0][1])]).toEqual([1.5, 3]);
    expectWeightsToBeCloseTo(curve.getCurve().getEffectiveWeights(), weightsBefore);
    curve.dispose();
});
