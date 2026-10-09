import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {ModelPointBinding} from "../object/ModelPointBinding";

class FakePoint {
    private x: number;
    private y: number;
    private handlers = new Map<string, Set<() => void>>();
    readonly setPositionDirectly = jest.fn((_mode: number, coordinates: [number, number]) => {
        this.x = coordinates[0];
        this.y = coordinates[1];
    });

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    X() { return this.x; }
    Y() { return this.y; }
    on(event: string, handler: () => void) {
        const handlers = this.handlers.get(event) ?? new Set();
        handlers.add(handler);
        this.handlers.set(event, handlers);
    }
    off(event: string, handler: () => void) { this.handlers.get(event)?.delete(handler); }
}

const previousJXG = (globalThis as any).JXG;
beforeAll(() => { (globalThis as any).JXG = {...previousJXG, COORDS_BY_USER: 1}; });
afterAll(() => {
    if (previousJXG === undefined) delete (globalThis as any).JXG;
    else (globalThis as any).JXG = previousJXG;
});

test("PH generating point rotation and scaling sync to its auxiliary board point until disposed", () => {
    const hodographPoint = new PointImpl(2, 1);
    const curve = new PhBezierCurve([new PointImpl(0, 0)], [hodographPoint]);
    const boardPoint = new FakePoint(hodographPoint.X(), hodographPoint.Y());
    const binding = new ModelPointBinding(hodographPoint, boardPoint as unknown as JXG.Point);

    curve.rotate(Math.PI / 3);
    expect([boardPoint.X(), boardPoint.Y()]).toEqual([hodographPoint.X(), hodographPoint.Y()]);
    expect([boardPoint.X(), boardPoint.Y()]).not.toEqual([2, 1]);

    curve.scale(4);
    expect([boardPoint.X(), boardPoint.Y()]).toEqual([hodographPoint.X(), hodographPoint.Y()]);
    const positionAtDisposal = [boardPoint.X(), boardPoint.Y()];
    const syncCallsAtDisposal = boardPoint.setPositionDirectly.mock.calls.length;
    binding.dispose();

    curve.rotate(Math.PI / 5);
    expect([boardPoint.X(), boardPoint.Y()]).toEqual(positionAtDisposal);
    expect(boardPoint.setPositionDirectly).toHaveBeenCalledTimes(syncCallsAtDisposal);
});
