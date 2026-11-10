import {Board} from "jsxgraph";
import {GraphSession, GraphSessionDependencies} from "./GraphSession";
import {constructOrSweep, SceneDeclaration, SceneSlot} from "./OwnedScene";

interface FakeScene {
    id: number;
    disposed: number;
}

const createBoard = () => ({
    containerObj: document.createElement("div"),
    on: vi.fn(),
    off: vi.fn(),
    fullUpdate: vi.fn(),
}) as unknown as Board;

function setup() {
    const board = createBoard();
    const events: string[] = [];
    const freeBoard = vi.fn(() => { events.push("free-board"); });
    const session = new GraphSession({initBoard: () => board, freeBoard} as GraphSessionDependencies);
    session.createBoard("box", {} as never);
    const scenes: FakeScene[] = [];
    let syncResult = true;
    const declaration = {
        create: vi.fn((_: Board) => {
            const scene = {id: scenes.length + 1, disposed: 0};
            scenes.push(scene);
            return scene;
        }),
        sync: vi.fn((_: FakeScene) => syncResult),
        dispose: vi.fn((scene: FakeScene) => { scene.disposed++; events.push(`dispose-${scene.id}`); }),
    } satisfies SceneDeclaration<FakeScene>;
    const slot = new SceneSlot(session, board, declaration);
    return {board, session, scenes, declaration, slot, events, freeBoard, syncs: (value: boolean) => { syncResult = value; }};
}

describe("constructOrSweep", () => {
    const axis = {id: "axis"};
    const point1 = {id: "point-1"};
    const point2 = {id: "point-2"};
    const fakeBoard = (existing: object[]) => {
        const objectsList = [...existing];
        return {objectsList, removeObject: vi.fn((objects: object[]) => { for (const o of objects) objectsList.splice(objectsList.indexOf(o), 1); })} as unknown as Board & {objectsList: object[]};
    };

    test("a failed construction removes only the objects created since it began, then rethrows", () => {
        const board = fakeBoard([axis]);
        expect(() => constructOrSweep(board, () => {
            board.objectsList.push(point1, point2);
            throw new Error("curve refused");
        })).toThrow("curve refused");
        expect(board.objectsList).toEqual([axis]);
    });

    test("a successful construction removes nothing", () => {
        const board = fakeBoard([axis]);
        const scene = constructOrSweep(board, () => { board.objectsList.push(point1); return "scene"; });
        expect(scene).toBe("scene");
        expect(board.objectsList).toEqual([axis, point1]);
        expect(board.removeObject).not.toHaveBeenCalled();
    });
});

describe("SceneSlot", () => {
    test("an unchanged structure is synchronized in place, never rebuilt", () => {
        const {slot, declaration, scenes} = setup();
        slot.rebuild();
        const first = slot.current;
        slot.reconcile();
        slot.reconcile();
        expect(declaration.sync).toHaveBeenCalledTimes(2);
        expect(declaration.sync).toHaveBeenCalledWith(first);
        expect(slot.current).toBe(first);
        expect(scenes).toHaveLength(1);
        expect(first?.disposed).toBe(0);
    });

    test("a structure the scene cannot synchronize is rebuilt and the old scene is released once", () => {
        const {slot, scenes, syncs} = setup();
        slot.rebuild();
        const old = slot.current!;
        syncs(false);
        slot.reconcile();
        expect(scenes).toHaveLength(2);
        expect(slot.current).toBe(scenes[1]);
        expect(slot.current).not.toBe(old);
        expect(old.disposed).toBe(1);
        expect(scenes[1].disposed).toBe(0);
    });

    test("reconcile builds nothing for an empty slot", () => {
        const {slot, declaration} = setup();
        slot.reconcile();
        expect(declaration.create).not.toHaveBeenCalled();
        expect(declaration.sync).not.toHaveBeenCalled();
    });

    test("repeated release disposes once, and the slot is already empty when disposal runs", () => {
        const {slot, session, declaration, scenes} = setup();
        slot.rebuild();
        let seenDuringDispose: FakeScene | undefined | "unset" = "unset";
        declaration.dispose.mockImplementationOnce(scene => { seenDuringDispose = slot.current; scene.disposed++; });
        slot.release();
        slot.release();
        session.dispose();
        session.dispose();
        expect(seenDuringDispose).toBeUndefined();
        expect(scenes[0].disposed).toBe(1);
        expect(declaration.dispose).toHaveBeenCalledTimes(1);
    });

    test("session disposal releases the remaining scene once, before the board is freed", () => {
        const {slot, session, scenes, events, freeBoard} = setup();
        slot.rebuild();
        session.dispose();
        session.dispose();
        expect(scenes[0].disposed).toBe(1);
        expect(slot.current).toBeUndefined();
        expect(events).toEqual(["dispose-1", "free-board"]);
        expect(freeBoard).toHaveBeenCalledTimes(1);
    });

    test("a construction failure publishes nothing and leaves the previous scene released", () => {
        const {slot, declaration, scenes} = setup();
        slot.rebuild();
        const old = scenes[0];
        declaration.create.mockImplementationOnce(() => { throw new Error("half built"); });
        expect(() => slot.rebuild()).toThrow("half built");
        expect(slot.current).toBeUndefined();
        expect(old.disposed).toBe(1);
        // Nothing was handed to dispose for the failed construction, and the slot recovers.
        expect(declaration.dispose).toHaveBeenCalledTimes(1);
        slot.rebuild();
        expect(slot.current).toBe(scenes[1]);
    });

    test("a scene finished after the session ended is disposed and never published", () => {
        const {slot, session, declaration, scenes} = setup();
        declaration.create.mockImplementationOnce(() => {
            session.dispose();
            const scene = {id: 99, disposed: 0};
            scenes.push(scene);
            return scene;
        });
        slot.rebuild();
        expect(slot.current).toBeUndefined();
        expect(scenes[0].disposed).toBe(1);
    });

    test("deferred work after the session ended creates and synchronizes nothing", async () => {
        const {slot, session, declaration, syncs} = setup();
        slot.rebuild();
        const deferred = Promise.resolve().then(() => {
            slot.reconcile();
            slot.rebuild();
        });
        syncs(false);
        session.dispose();
        await deferred;
        expect(slot.current).toBeUndefined();
        expect(declaration.create).toHaveBeenCalledTimes(1);
        expect(declaration.sync).not.toHaveBeenCalled();
        expect(declaration.dispose).toHaveBeenCalledTimes(1);
    });
});
