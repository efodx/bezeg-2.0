import {
    activeGesture,
    beginLearnerGesture,
    currentWrite,
    onLearnerGestureEnd,
    outranks,
    runAs,
    writeSourcesIdle,
} from "./writeSource";

afterEach(() => {
    expect(writeSourcesIdle()).toBe(true);
});

test("priority is learner over lesson over animation", () => {
    expect(outranks("learner", "lesson")).toBe(true);
    expect(outranks("lesson", "animation")).toBe(true);
    expect(outranks("animation", "lesson")).toBe(false);
    expect(outranks("lesson", "lesson")).toBe(false);
});

test("runAs nests, the innermost wins, and the scope is restored after a throw", () => {
    expect(currentWrite()).toBeUndefined();
    runAs("lesson", () => {
        expect(currentWrite()?.source).toBe("lesson");
        runAs("learner", () => expect(currentWrite()?.source).toBe("learner"));
        expect(currentWrite()?.source).toBe("lesson");
        expect(() => runAs("learner", () => {
            throw new Error("boom");
        })).toThrow("boom");
        expect(currentWrite()?.source).toBe("lesson");
    });
    expect(currentWrite()).toBeUndefined();
});

test("an animation scope without a lease throws and opens nothing", () => {
    expect(() => runAs("animation", () => undefined)).toThrow();
    expect(currentWrite()).toBeUndefined();
});

test("an open gesture is the learner source when no scope is open, and scopes win over it", () => {
    const end = beginLearnerGesture();
    try {
        expect(currentWrite()?.source).toBe("learner");
        expect(currentWrite()?.gesture).toBe(activeGesture());
        runAs("lesson", () => expect(currentWrite()?.source).toBe("lesson"));
    } finally {
        end();
    }
    expect(currentWrite()).toBeUndefined();
    expect(activeGesture()).toBeUndefined();
});

test("overlapping gestures keep one id until both end, and end functions are idempotent", () => {
    const ended: number[] = [];
    const stop = onLearnerGestureEnd(id => ended.push(id));
    const first = beginLearnerGesture();
    const id = activeGesture();
    const second = beginLearnerGesture();
    expect(activeGesture()).toBe(id);
    first();
    first();
    expect(activeGesture()).toBe(id);
    expect(ended).toEqual([]);
    second();
    second();
    expect(activeGesture()).toBeUndefined();
    expect(ended).toEqual([id]);
    stop();
    const third = beginLearnerGesture();
    expect(activeGesture()).not.toBe(id);
    third();
    expect(ended).toEqual([id]);
});
