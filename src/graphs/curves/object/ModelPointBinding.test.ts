import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {ModelPointBinding} from "./ModelPointBinding";

const previousJXG = (globalThis as any).JXG;
beforeAll(() => { (globalThis as any).JXG = {...previousJXG, COORDS_BY_USER: 1}; });
afterAll(() => {
    if (previousJXG === undefined) delete (globalThis as any).JXG;
    else (globalThis as any).JXG = previousJXG;
});

function mockPoint(x: number, y: number) {
    let coordinates: [number, number] = [x, y];
    const handlers = new Map<string, Set<(event?: Event) => void>>();
    const point = {
        setPositionDirectly: vi.fn((_mode: number, next: [number, number]) => { coordinates = [...next]; }),
        on: vi.fn((event: string, handler: (event?: Event) => void) => {
            const eventHandlers = handlers.get(event) ?? new Set();
            eventHandlers.add(handler);
            handlers.set(event, eventHandlers);
        }),
        off: vi.fn((event: string, handler: (event?: Event) => void) => handlers.get(event)?.delete(handler)),
        X: () => coordinates[0],
        Y: () => coordinates[1],
        moveTo(next: [number, number]) { coordinates = next; },
        emit(event: string) { handlers.get(event)?.forEach(handler => handler()); },
    };
    return point;
}

test("model and board edits synchronize without making board coordinates the model", () => {
    const modelPoint = new PointImpl(1, 2);
    const boardPoint = mockPoint(1, 2);
    const afterDrag = vi.fn();
    const binding = new ModelPointBinding(modelPoint, boardPoint as unknown as JXG.Point, afterDrag);

    boardPoint.moveTo([3, 4]);
    expect([modelPoint.X(), modelPoint.Y()]).toEqual([1, 2]);
    boardPoint.emit("drag");
    expect([modelPoint.X(), modelPoint.Y()]).toEqual([3, 4]);
    expect(afterDrag).toHaveBeenCalledTimes(1);

    modelPoint.setCoordinates(-2, 5);
    expect([boardPoint.X(), boardPoint.Y()]).toEqual([-2, 5]);
    expect(boardPoint.setPositionDirectly).toHaveBeenCalledWith(JXG.COORDS_BY_USER, [-2, 5]);

    binding.dispose();
    const syncCalls = boardPoint.setPositionDirectly.mock.calls.length;
    modelPoint.setCoordinates(7, 8);
    boardPoint.moveTo([9, 10]);
    boardPoint.emit("drag");
    expect(boardPoint.setPositionDirectly).toHaveBeenCalledTimes(syncCalls);
    expect([modelPoint.X(), modelPoint.Y()]).toEqual([7, 8]);
    expect(boardPoint.off).toHaveBeenCalledWith("drag", expect.any(Function));
});
