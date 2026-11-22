import {Board} from "jsxgraph";
import {GraphSession, GraphSessionDependencies} from "./GraphSession";

type Handler = (...args: unknown[]) => void;

/** A board whose `trigger` mimics JSXGraph's loop, which caches the handler count before dispatching. */
function createBoard() {
    const handlers = new Map<string, Array<{handler: Handler}>>();
    return {
        inUpdate: false,
        containerObj: document.createElement("div"),
        cPos: [],
        on(event: string, handler: Handler) {
            handlers.set(event, [...(handlers.get(event) ?? []), {handler}]);
        },
        off(event: string, handler: Handler) {
            const list = handlers.get(event) ?? [];
            const index = list.findIndex(entry => entry.handler === handler);
            if (index >= 0) list.splice(index, 1);
        },
        trigger(event: string, ...args: unknown[]) {
            const list = handlers.get(event) ?? [];
            for (let i = 0, len = list.length; i < len; i++) list[i].handler(...args);
        },
        count: (event: string) => handlers.get(event)?.length ?? 0,
        fullUpdate: () => undefined,
        resizeContainer: () => undefined,
    };
}

function createSession() {
    const board = createBoard();
    const dependencies = {initBoard: () => board as unknown as Board, freeBoard: () => undefined} as GraphSessionDependencies;
    const session = new GraphSession(dependencies);
    session.createBoard("jgbox", {} as never);
    return {board, session};
}

const flush = () => new Promise<void>(resolve => queueMicrotask(resolve));

test("a listener that unsubscribes itself inside the event does not throw and does not run again", async () => {
    const {board, session} = createSession();
    const calls: string[] = [];
    const unsubscribe: () => void = session.on("up", () => {
        calls.push("self");
        unsubscribe();
    });
    session.on("up", () => calls.push("other"));
    expect(() => board.trigger("up")).not.toThrow();
    expect(calls).toEqual(["self", "other"]);
    board.trigger("up");
    expect(calls).toEqual(["self", "other", "other"]);
    await flush();
    expect(board.count("up")).toBe(1);
});

test("once runs exactly once even if the event fires twice in one dispatch chain", async () => {
    const {board, session} = createSession();
    const listener = vi.fn();
    session.once("up", () => {
        listener();
        board.trigger("up");
    });
    board.trigger("up");
    board.trigger("up");
    expect(listener).toHaveBeenCalledTimes(1);
    await flush();
    expect(board.count("up")).toBe(0);
});

test("removal outside a dispatch is immediate and idempotent", () => {
    const {board, session} = createSession();
    const listener = vi.fn();
    const unsubscribe = session.on("up", listener);
    expect(board.count("up")).toBe(1);
    unsubscribe();
    unsubscribe();
    expect(board.count("up")).toBe(0);
    board.trigger("up");
    expect(listener).not.toHaveBeenCalled();
});
