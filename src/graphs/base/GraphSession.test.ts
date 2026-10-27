import {Board} from "jsxgraph";
import {GraphSession, GraphSessionDependencies} from "./GraphSession";

function createBoard(inUpdate = false) {
    return Object.assign({
        inUpdate,
        containerObj: document.createElement("div"),
        cPos: [20, 30],
        on: vi.fn(),
        off: vi.fn(),
        fullUpdate: vi.fn(),
        resizeContainer: vi.fn(),
    }, {}) as unknown as Board & {inUpdate: boolean};
}

function createDependencies(board: Board) {
    const initBoard = vi.fn(() => board);
    const freeBoard = vi.fn();
    return {
        dependencies: {initBoard, freeBoard} as GraphSessionDependencies,
        initBoard,
        freeBoard,
    };
}

test('owns board subscriptions and resize observation through idempotent disposal', () => {
    const board = createBoard();
    const {dependencies, initBoard, freeBoard} = createDependencies(board);
    const session = new GraphSession(dependencies);
    const listener = vi.fn();
    const originalResizeObserver = globalThis.ResizeObserver;
    let resizeCallback: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    class ResizeObserverStub {
        constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = disconnect;
    }
    Object.defineProperty(globalThis, 'ResizeObserver', {configurable: true, value: ResizeObserverStub});

    try {
        session.createBoard('jgbox', {} as any);
        session.on('down', listener);
        session.observeResize(document.createElement('div'));
        session.markReady();

        expect(initBoard).toHaveBeenCalledTimes(1);
        expect(session.isAlive).toBe(true);
        expect(session.isReady).toBe(true);
        expect(session.isSettled).toBe(true);

        session.dispose();
        session.dispose();
        resizeCallback?.([{contentRect: {width: 100, height: 100}} as ResizeObserverEntry], {} as ResizeObserver);

        expect(session.isAlive).toBe(false);
        expect(session.signal.aborted).toBe(true);
        expect((board as any).off).toHaveBeenCalledWith('down', listener);
        expect(disconnect).toHaveBeenCalledTimes(1);
        expect((board as any).resizeContainer).not.toHaveBeenCalled();
        expect(freeBoard).toHaveBeenCalledTimes(1);
    } finally {
        if (originalResizeObserver) {
            Object.defineProperty(globalThis, 'ResizeObserver', {configurable: true, value: originalResizeObserver});
        } else {
            delete (globalThis as any).ResizeObserver;
        }
    }
});

test('coalesces deferred refreshes and settles after the update runs', async () => {
    vi.useFakeTimers();
    const board = createBoard(true);
    const {dependencies} = createDependencies(board);
    const session = new GraphSession(dependencies);

    try {
        session.createBoard('jgbox', {} as any);
        session.markReady();
        session.requestFullUpdate();
        session.requestFullUpdate();
        const settled = session.waitUntilReady();
        let didSettle = false;
        void settled.then(() => { didSettle = true; });
        await Promise.resolve();

        expect((board as any).fullUpdate).not.toHaveBeenCalled();
        expect(session.isSettled).toBe(false);
        expect(didSettle).toBe(false);

        board.inUpdate = false;
        vi.runOnlyPendingTimers();
        await settled;

        expect((board as any).fullUpdate).toHaveBeenCalledTimes(1);
        expect(session.isSettled).toBe(true);
        expect(didSettle).toBe(true);
    } finally {
        session.dispose();
        vi.useRealTimers();
    }
});

test('disposal cancels deferred updates and releases readiness waiters', async () => {
    vi.useFakeTimers();
    const board = createBoard(true);
    const {dependencies, freeBoard} = createDependencies(board);
    const session = new GraphSession(dependencies);
    session.createBoard('jgbox', {} as any);
    session.markReady();
    session.requestFullUpdate();
    const settled = session.waitUntilReady();

    session.dispose();
    await settled;
    vi.runOnlyPendingTimers();
    session.dispose();
    vi.useRealTimers();

    expect((board as any).fullUpdate).not.toHaveBeenCalled();
    expect(freeBoard).toHaveBeenCalledTimes(1);
    expect(session.isSettled).toBe(false);
});


test('refreshes pointer origin before native handlers and removes the capture listener on disposal', () => {
    const board = createBoard();
    // JSXGraph installs its target-phase listener while initBoard runs, before the session hook.
    const origins: unknown[][] = [];
    board.containerObj.addEventListener('pointerdown', () => origins.push([...board.cPos]));
    const {dependencies} = createDependencies(board);
    const session = new GraphSession(dependencies);
    session.createBoard(board.containerObj, {});

    board.containerObj.dispatchEvent(new Event('pointerdown', {bubbles: true}));
    expect(origins).toEqual([[]]);
    board.cPos = [50, 60];
    session.dispose();
    board.containerObj.dispatchEvent(new Event('pointerdown', {bubbles: true}));
    expect(origins).toEqual([[], [50, 60]]);
});

test('a board-less main view keeps the session alive and is disposed exactly once', () => {
    const {dependencies, initBoard, freeBoard} = createDependencies(createBoard());
    const session = new GraphSession(dependencies);
    const dispose = vi.fn();

    expect(session.isAlive).toBe(false);
    session.adoptMainView(dispose);
    session.markReady();

    expect(session.isAlive).toBe(true);
    expect(session.isReady).toBe(true);
    expect(dispose).not.toHaveBeenCalled();
    expect(() => session.adoptMainView(vi.fn())).toThrow();

    session.dispose();
    session.dispose();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(session.isAlive).toBe(false);
    expect(initBoard).not.toHaveBeenCalled();
    expect(freeBoard).not.toHaveBeenCalled();
});

test('adopting a main view after disposal disposes it immediately and stays dead', () => {
    const session = new GraphSession(createDependencies(createBoard()).dependencies);
    const dispose = vi.fn();
    session.dispose();

    session.adoptMainView(dispose);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(session.isAlive).toBe(false);
    session.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
});

test('a throwing main-view disposer does not stop the rest of the disposal', () => {
    const session = new GraphSession(createDependencies(createBoard()).dependencies);
    const later = vi.fn();
    session.adoptMainView(() => { throw new Error('boom'); });
    session.registerCleanup(later);

    expect(() => session.dispose()).not.toThrow();
    expect(later).toHaveBeenCalledTimes(1);
});

describe('auxiliary boards', () => {
    function sessionWithAuxiliaries() {
        const main = createBoard();
        const first = createBoard();
        const second = createBoard();
        const boards = [main, first, second];
        const initBoard = vi.fn(() => boards.shift() as Board);
        const freeBoard = vi.fn();
        const session = new GraphSession({initBoard, freeBoard} as GraphSessionDependencies);
        return {session, main, first, second, freeBoard};
    }

    test('frees each auxiliary board exactly once on release or disposal, before the main board', () => {
        const {session, main, first, second, freeBoard} = sessionWithAuxiliaries();
        session.createBoard('jgbox', {} as any);
        const one = session.createAuxiliaryBoard(document.createElement('div'), {} as any);
        const two = session.createAuxiliaryBoard(document.createElement('div'), {} as any);
        expect(one.board).toBe(first);

        one.release();
        one.release();
        expect(freeBoard).toHaveBeenCalledTimes(1);
        expect(freeBoard).toHaveBeenLastCalledWith(first);

        session.dispose();
        session.dispose();
        two.release();
        expect(freeBoard.mock.calls.map(call => call[0])).toEqual([first, second, main]);
    });

    test('removes the pointer-origin refresh with the board and refreshes it while the board lives', () => {
        const {session, first} = sessionWithAuxiliaries();
        session.createBoard('jgbox', {} as any);
        const aux = session.createAuxiliaryBoard(document.createElement('div'), {} as any);
        first.cPos = [1, 2];
        first.containerObj.dispatchEvent(new Event('pointerdown'));
        expect(first.cPos).toEqual([]);
        aux.release();
        first.cPos = [1, 2];
        first.containerObj.dispatchEvent(new Event('pointerdown'));
        expect(first.cPos).toEqual([1, 2]);
        session.dispose();
    });

    test('is refused on a session without a main view and on a disposed session', () => {
        const {session} = sessionWithAuxiliaries();
        expect(() => session.createAuxiliaryBoard(document.createElement('div'), {} as any)).toThrow();
        session.adoptMainView(() => undefined);
        const aux = session.createAuxiliaryBoard(document.createElement('div'), {} as any);
        session.dispose();
        expect(() => session.createAuxiliaryBoard(document.createElement('div'), {} as any)).toThrow();
        aux.release();
    });
});
