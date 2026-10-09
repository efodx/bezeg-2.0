import React from "react";
import {act, render} from "@testing-library/react";
import {JSXGraph} from "jsxgraph";
import {HodographInputbox} from "./HodographInputBox";

jest.mock("jsxgraph", () => ({JSXGraph: {initBoard: jest.fn(), freeBoard: jest.fn()}}));

const jsxgraph = JSXGraph as unknown as {initBoard: jest.Mock, freeBoard: jest.Mock};

function installResizeObserver() {
    let callback: ResizeObserverCallback | undefined;
    const disconnect = jest.fn();
    class ResizeObserverStub {
        constructor(nextCallback: ResizeObserverCallback) { callback = nextCallback; }
        observe = jest.fn();
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
        resizeContainer: jest.fn((_width: number, _height: number, _dontSetCss: boolean, dontSetBoundingBox: boolean) => {
            boundingBox = dontSetBoundingBox
                ? [-10, 10, 10, -10]
                : [Number.NaN, Number.NaN, Number.NaN, Number.NaN];
        }),
        getBoundingBox: jest.fn(() => boundingBox),
        setBoundingBox: jest.fn((next: number[]) => { boundingBox = next as [number, number, number, number]; }),
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
    const setRef = jest.fn();
    let pendingBoundingBox: [number, number, number, number] | undefined = [-2, 3, 3, -2];
    const onResize = jest.fn((resizedBoard: JXG.Board) => {
        if (pendingBoundingBox) {
            resizedBoard.setBoundingBox(pendingBoundingBox, true);
            pendingBoundingBox = undefined;
        }
    });
    const onDispose = jest.fn();
    const {unmount} = render(<HodographInputbox setRef={setRef} onResize={onResize} onDispose={onDispose}/>);

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
    const {unmount} = render(<HodographInputbox setRef={jest.fn()}/>);
    expect(jsxgraph.initBoard).not.toHaveBeenCalled();
    unmount();

    resize.notify(240, 240);

    expect(resize.disconnect).toHaveBeenCalledTimes(1);
    expect(jsxgraph.initBoard).not.toHaveBeenCalled();
    expect(jsxgraph.freeBoard).not.toHaveBeenCalled();
});
