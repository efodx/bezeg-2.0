import {Board} from "jsxgraph";
import {GraphSession, GraphSessionDependencies} from "./GraphSession";

function createBoard(inUpdate = false) {
    return Object.assign({
        inUpdate,
        on: jest.fn(),
        off: jest.fn(),
        fullUpdate: jest.fn(),
        resizeContainer: jest.fn(),
    }, {}) as unknown as Board & {inUpdate: boolean};
}

function createDependencies(board: Board) {
    const initBoard = jest.fn(() => board);
    const freeBoard = jest.fn();
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
    const listener = jest.fn();
    const originalResizeObserver = globalThis.ResizeObserver;
    let resizeCallback: ResizeObserverCallback | undefined;
    const disconnect = jest.fn();
    class ResizeObserverStub {
        constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
        observe = jest.fn();
        unobserve = jest.fn();
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
    jest.useFakeTimers();
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
        jest.runOnlyPendingTimers();
        await settled;

        expect((board as any).fullUpdate).toHaveBeenCalledTimes(1);
        expect(session.isSettled).toBe(true);
        expect(didSettle).toBe(true);
    } finally {
        session.dispose();
        jest.useRealTimers();
    }
});

test('disposal cancels deferred updates and releases readiness waiters', async () => {
    jest.useFakeTimers();
    const board = createBoard(true);
    const {dependencies, freeBoard} = createDependencies(board);
    const session = new GraphSession(dependencies);
    session.createBoard('jgbox', {} as any);
    session.markReady();
    session.requestFullUpdate();
    const settled = session.waitUntilReady();

    session.dispose();
    await settled;
    jest.runOnlyPendingTimers();
    session.dispose();
    jest.useRealTimers();

    expect((board as any).fullUpdate).not.toHaveBeenCalled();
    expect(freeBoard).toHaveBeenCalledTimes(1);
    expect(session.isSettled).toBe(false);
});
