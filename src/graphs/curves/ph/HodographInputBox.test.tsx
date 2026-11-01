import React from "react";
import {act, render} from "@testing-library/react";
import {HodographInputbox} from "./HodographInputBox";
import {GraphSession} from "../../base/GraphSession";
import {AuxiliaryBoardLifetime} from "./AuxiliaryBoardLifetime";

const jsxgraph = {initBoard: vi.fn(), freeBoard: vi.fn()};

/** The hodograph host and its board lifetime, with a session whose JSXGraph is a stub. */
function renderHost(callbacks: {onBoard?: (board: JXG.Board) => void, onResize?: (board: JXG.Board) => void, onRelease?: () => void}) {
    const session = new GraphSession(jsxgraph as any);
    session.adoptMainView(() => undefined);
    const parent = {renderer: {}, addChild: vi.fn(), removeChild: vi.fn()} as unknown as JXG.Board;
    const lifetimes: AuxiliaryBoardLifetime[] = [];
    const view = render(<HodographInputbox attach={host => {
        const lifetime = new AuxiliaryBoardLifetime({
            session, parent, host, boardOptions: {},
            onBoard: board => callbacks.onBoard?.(board),
            onResize: board => callbacks.onResize?.(board),
            onRelease: () => callbacks.onRelease?.(),
        });
        lifetimes.push(lifetime);
        return lifetime;
    }}/>);
    return {...view, session, parent, lifetimes};
}

function installResizeObserver() {
    let callback: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    class ResizeObserverStub {
        constructor(nextCallback: ResizeObserverCallback) { callback = nextCallback; }
        observe = vi.fn();
        disconnect = disconnect;
    }
    const original = globalThis.ResizeObserver;
    Object.defineProperty(globalThis, "ResizeObserver", {configurable: true, value: ResizeObserverStub});
    return {
        disconnect,
        notify(width: number, height: number) {
            act(() => callback?.([{contentRect: {width, height}} as ResizeObserverEntry], {} as ResizeObserver));
        },
        restore() {
            if (original) Object.defineProperty(globalThis, "ResizeObserver", {configurable: true, value: original});
            else delete (globalThis as any).ResizeObserver;
        },
    };
}

function createBoard() {
    let boundingBox: [number, number, number, number] = [-5, 5, 5, -5];
    const board = {
        containerObj: document.createElement('div'),
        resizeContainer: vi.fn((_width: number, _height: number, _dontSetCss: boolean, dontSetBoundingBox: boolean) => {
            boundingBox = dontSetBoundingBox
                ? [-10, 10, 10, -10]
                : [Number.NaN, Number.NaN, Number.NaN, Number.NaN];
        }),
        getBoundingBox: vi.fn(() => boundingBox),
        setBoundingBox: vi.fn((next: number[]) => { boundingBox = next as [number, number, number, number]; }),
    } as unknown as JXG.Board;
    return board;
}

beforeEach(() => {
    jsxgraph.initBoard.mockReset();
    jsxgraph.freeBoard.mockReset();
});

test("defers creation until visible size, then preserves the saved viewport through resize and disposes once", () => {
    const resize = installResizeObserver();
    const board = createBoard();
    jsxgraph.initBoard.mockReturnValue(board);
    const setRef = vi.fn();
    let pendingBoundingBox: [number, number, number, number] | undefined = [-2, 3, 3, -2];
    const onResize = vi.fn((resizedBoard: JXG.Board) => {
        if (pendingBoundingBox) {
            resizedBoard.setBoundingBox(pendingBoundingBox, true);
            pendingBoundingBox = undefined;
        }
    });
    const onDispose = vi.fn();
    const {unmount} = renderHost({onBoard: setRef, onResize, onRelease: onDispose});

    expect(jsxgraph.initBoard).not.toHaveBeenCalled();
    resize.notify(0, 0);
    expect(jsxgraph.initBoard).not.toHaveBeenCalled();

    resize.notify(240, 240);
    expect(jsxgraph.initBoard).toHaveBeenCalledTimes(1);
    expect(board.resizeContainer).toHaveBeenCalledWith(240, 240, true, true);
    expect(setRef).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(board.getBoundingBox()).toEqual([-2, 3, 3, -2]);

    resize.notify(320, 180);
    expect(jsxgraph.initBoard).toHaveBeenCalledTimes(1);
    expect(board.resizeContainer).toHaveBeenLastCalledWith(320, 180, true, true);
    expect(board.getBoundingBox()).toEqual([-2, 3, 3, -2]);

    unmount();
    resize.notify(400, 400);
    expect(resize.disconnect).toHaveBeenCalledTimes(1);
    expect(onDispose).toHaveBeenCalledTimes(1);
    expect(jsxgraph.freeBoard).toHaveBeenCalledTimes(1);
    expect(board.resizeContainer).toHaveBeenCalledTimes(2);
});

test("a queued resize after hidden unmount cannot create the auxiliary board", () => {
    const resize = installResizeObserver();
    const {unmount} = renderHost({});
    expect(jsxgraph.initBoard).not.toHaveBeenCalled();
    unmount();

    resize.notify(240, 240);

    expect(resize.disconnect).toHaveBeenCalledTimes(1);
    expect(jsxgraph.initBoard).not.toHaveBeenCalled();
    expect(jsxgraph.freeBoard).not.toHaveBeenCalled();
});

test("release is idempotent and ends adopted resources, the parent link, the observer and the board once, latest first", () => {
    const resize = installResizeObserver();
    const board = createBoard();
    jsxgraph.initBoard.mockReturnValue(board);
    const order: string[] = [];
    const onRelease = vi.fn();
    const {lifetimes, parent, unmount} = renderHost({onRelease});
    resize.notify(240, 240);
    const [lifetime] = lifetimes;
    lifetime.adopt(() => order.push("first"));
    lifetime.adopt(() => order.push("second"));
    lifetime.linkToParent();
    lifetime.linkToParent();
    expect(parent.addChild).toHaveBeenCalledTimes(1);

    lifetime.release();
    lifetime.release();
    unmount();

    expect(order).toEqual(["second", "first"]);
    expect(parent.removeChild).toHaveBeenCalledTimes(1);
    expect(resize.disconnect).toHaveBeenCalledTimes(1);
    expect(jsxgraph.freeBoard).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
    lifetime.adopt(() => order.push("late"));
    expect(order).toEqual(["second", "first", "late"]);
});

test("ending the session releases the lifetime, and the view's later unmount changes nothing", () => {
    const resize = installResizeObserver();
    jsxgraph.initBoard.mockReturnValue(createBoard());
    const onRelease = vi.fn();
    const {lifetimes, session, parent, unmount} = renderHost({onRelease});
    resize.notify(240, 240);
    lifetimes[0].linkToParent();

    session.dispose();
    unmount();

    expect(lifetimes[0].isReleased).toBe(true);
    expect(jsxgraph.freeBoard).toHaveBeenCalledTimes(1);
    expect(parent.removeChild).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
});
