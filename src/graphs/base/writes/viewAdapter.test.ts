import {ParameterArbiter, UntaggedWriteError, type Lease} from "./parameterArbiter";
import {type ViewBoard, ViewAdapter, viewBoxesEqual, type ViewIntent} from "./viewAdapter";
import {beginLearnerGesture, runAs, writeSourcesIdle} from "./writeSource";

const ASPECT = 2;

class FakeBoard implements ViewBoard {
    box: number[] = [-5, 5, 5, -5];
    lastKeep: boolean | undefined;
    private handlers = new Set<() => void>();

    getBoundingBox(): number[] {
        return [...this.box];
    }

    setBoundingBox(box: number[], keep = false): void {
        this.lastKeep = keep;
        this.box = keep ? this.widen(box, ASPECT) : [...box];
        this.fire();
    }

    zoomIn(): void {
        this.scale(1 / 1.25);
    }

    zoomOut(): void {
        this.scale(1.25);
    }

    on(_event: "boundingbox", handler: () => void): void {
        this.handlers.add(handler);
    }

    off(_event: "boundingbox", handler: () => void): void {
        this.handlers.delete(handler);
    }

    handlerCount(): number {
        return this.handlers.size;
    }

    /** The library reacting to learner input. */
    pan(dx: number, dy: number): void {
        const [l, t, r, b] = this.box;
        this.box = [l + dx, t + dy, r + dx, b + dy];
        this.fire();
    }

    /** The library reacting to a container resize. */
    resize(aspect: number): void {
        this.box = this.widen(this.box, aspect);
        this.fire();
    }

    private widen(box: number[], aspect: number): number[] {
        const [l, t, r, b] = box;
        const width = (t - b) * aspect;
        const centre = (l + r) / 2;
        return [centre - width / 2, t, centre + width / 2, b];
    }

    private scale(factor: number): void {
        const [l, t, r, b] = this.box;
        const cx = (l + r) / 2;
        const cy = (t + b) / 2;
        this.box = [cx + (l - cx) * factor, cy + (t - cy) * factor, cx + (r - cx) * factor, cy + (b - cy) * factor];
        this.fire();
    }

    private fire(): void {
        for (const handler of [...this.handlers]) handler();
    }
}

const boxF = [-2, 2, 2, -2];
const boxR = [-8, 4, 8, -4];
const boxL = [0, 3, 6, -3];

let board: FakeBoard;
let arbiter: ParameterArbiter;
let adapter: ViewAdapter;
let unbind: () => void;

beforeEach(() => {
    board = new FakeBoard();
    arbiter = new ParameterArbiter({isDomainError: () => false, strict: true});
    adapter = new ViewAdapter(board);
    unbind = adapter.bindTo(arbiter);
});

afterEach(() => {
    adapter.dispose();
    arbiter.dispose();
    expect(writeSourcesIdle()).toBe(true);
});

function lease(onEnd = vi.fn()): { lease: Lease; onEnd: ReturnType<typeof vi.fn> } {
    const made = arbiter.lease(["view"], onEnd)!;
    expect(made).toBeDefined();
    return {lease: made, onEnd};
}

test("a learner gesture ends a fitted-view lease and its box becomes the intent", () => {
    const {lease: l, onEnd} = lease();
    expect(adapter.setFitted(boxF, l)).toBe(true);
    expect(board.box).toEqual(boxF);
    const end = beginLearnerGesture();
    try {
        board.pan(1, 1);
    } finally {
        end();
    }
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith("learner");
    expect(adapter.intent().box).toEqual([-1, 3, 3, -1]);
    expect(adapter.fitted()).toBeUndefined();
    const shown = [...board.box];
    expect(adapter.setFitted(boxR, l)).toBe(false);
    expect(board.box).toEqual(shown);
});

test("a fit never changes the intent", () => {
    const before = adapter.intent();
    const readBefore = arbiter.read("view");
    const {lease: l} = lease();
    adapter.setFitted(boxF, l);
    expect(adapter.intent()).toBe(before);
    expect(arbiter.read("view")).toBe(readBefore);
    expect(adapter.fitted()).toEqual(boxF);
});

test("fitting an unchanged state twice gives the same box", () => {
    const before = adapter.intent();
    const {lease: l} = lease();
    expect(adapter.setFitted(boxF, l)).toBe(true);
    expect(() => adapter.setFitted(boxF, l)).not.toThrow();
    expect(board.box).toEqual(boxF);
    expect(adapter.intent()).toBe(before);
});

test("reset and preset restore win over a running glide, also with an unchanged box", () => {
    for (const unchanged of [false, true]) {
        const restore = unchanged ? adapter.intent().box : boxR;
        const {lease: l, onEnd} = lease();
        adapter.setFitted(boxF, l);
        expect(board.box).toEqual(boxF);
        const result = runAs("learner", () => adapter.setIntent(restore));
        expect(result).toEqual({status: "applied"});
        expect(onEnd).toHaveBeenCalledTimes(1);
        expect(onEnd).toHaveBeenCalledWith("learner");
        expect(board.box).toEqual([...restore]);
        expect(adapter.fitted()).toBeUndefined();
    }
});

test("a lesson cannot move a view the learner holds, and can after the gesture", () => {
    const end = beginLearnerGesture();
    try {
        board.pan(1, 0);
        const held = [...board.box];
        const result = runAs("lesson", () => adapter.setIntent(boxL));
        expect(result).toEqual({status: "refused-arbiter", reason: "held"});
        expect(board.box).toEqual(held);
    } finally {
        end();
    }
    expect(runAs("lesson", () => adapter.setIntent(boxL))).toEqual({status: "applied"});
    expect(board.box).toEqual(boxL);
    expect(adapter.intent().box).toEqual(boxL);
});

test("untagged view changes throw, naming the view", () => {
    expect(() => board.pan(1, 0)).toThrow(UntaggedWriteError);
    expect(() => board.pan(1, 0)).toThrow(/"view"/);
});

test("an untagged setIntent throws", () => {
    expect(() => adapter.setIntent(boxR)).toThrow(UntaggedWriteError);
});

test("a resize is not a write", () => {
    expect(() => adapter.resizing(() => {
        board.resize(3);
        adapter.setIntent(boxL);
    })).not.toThrow();
    expect(adapter.intent().box).toEqual(boxL);
    expect(() => arbiter.observe()).not.toThrow();
});

test("a resize without setIntent leaves the intent unchanged", () => {
    const before = adapter.intent();
    expect(() => adapter.resizing(() => board.resize(3))).not.toThrow();
    expect(adapter.intent()).toBe(before);
    expect(() => arbiter.observe()).not.toThrow();
});

test("before bindTo nothing is attributed, and bindTo takes the intent as the baseline", () => {
    unbind();
    expect(() => adapter.setIntent(boxR)).not.toThrow();
    const other = new ParameterArbiter({isDomainError: () => false, strict: true});
    try {
        adapter.bindTo(other);
        expect(() => other.observe()).not.toThrow();
        expect(other.read("view")).toBe(adapter.intent());
    } finally {
        other.dispose();
    }
});

test("zoom makes the zoomed box the intent once, without keeping the aspect ratio", () => {
    const {onEnd} = lease();
    runAs("learner", () => adapter.zoom("in"));
    expect(adapter.intent().box).toEqual(board.box);
    expect(adapter.intent().box).toEqual([-4, 4, 4, -4]);
    expect(adapter.intent().keepAspectRatio).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith("learner");
    runAs("learner", () => adapter.zoom("out"));
    expect(adapter.intent().box).toEqual([-5, 5, 5, -5]);
});

test("keepAspectRatio is stored and passed to the board", () => {
    runAs("learner", () => adapter.setIntent(boxF, {keepAspectRatio: true}));
    expect(adapter.intent()).toEqual({box: boxF, keepAspectRatio: true});
    expect(board.lastKeep).toBe(true);
    expect(board.box).toEqual([-4, 2, 4, -2]);
    expect(() => arbiter.observe()).not.toThrow();
});

test("setFitted refuses a foreign or ended lease; an animation write applies through the arbiter", () => {
    arbiter.bind<number>("other", {read: () => 0, apply: () => undefined});
    const foreign = arbiter.lease(["other"])!;
    const shown = [...board.box];
    expect(adapter.setFitted(boxF, foreign)).toBe(false);
    expect(board.box).toEqual(shown);

    const {lease: l} = lease();
    l.release();
    expect(adapter.setFitted(boxF, l)).toBe(false);
    expect(board.box).toEqual(shown);

    const {lease: live} = lease();
    const target: ViewIntent = {box: boxR as [number, number, number, number], keepAspectRatio: false};
    expect(live.write("view", target)).toEqual({status: "applied"});
    expect(board.box).toEqual(boxR);
    expect(adapter.intent().box).toEqual(boxR);
});

test("dispose removes the board listener; a second bindTo throws until unbound", () => {
    expect(() => adapter.bindTo(arbiter)).toThrow(/already bound/);
    unbind();
    const again = adapter.bindTo(arbiter);
    again();
    expect(board.handlerCount()).toBe(1);
    adapter.dispose();
    expect(board.handlerCount()).toBe(0);
    const before = adapter.intent();
    expect(() => board.pan(2, 2)).not.toThrow();
    expect(adapter.intent()).toBe(before);
});

test("viewBoxesEqual compares within 1e-9 of the box size", () => {
    expect(viewBoxesEqual([0, 10, 10, 0], [1e-10, 10, 10, 0])).toBe(true);
    expect(viewBoxesEqual([0, 10, 10, 0], [1e-6, 10, 10, 0])).toBe(false);
    expect(viewBoxesEqual([0, 10, 10, 0], [0, 10, 10])).toBe(false);
});
