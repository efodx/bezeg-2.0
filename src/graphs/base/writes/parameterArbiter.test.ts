import {SceneStore} from "../SceneStore";
import {type LeaseEndReason, ParameterArbiter, UntaggedWriteError} from "./parameterArbiter";
import {beginLearnerGesture, runAs, writeSourcesIdle} from "./writeSource";

class FakeDomainError extends Error {
}

interface State {
    a: number;
    b: number;
}

function makeFixture(strict = true) {
    const store = new SceneStore<State>({a: 1, b: 1});
    const setA = (value: number) => {
        if (value < 0) throw new FakeDomainError("a must not be negative");
        store.setState({a: value});
    };
    const setB = (value: number) => {
        if (value < 0) throw new FakeDomainError("b must not be negative");
        store.setState({b: value});
    };
    const arbiter = new ParameterArbiter({isDomainError: e => e instanceof FakeDomainError, strict, owner: "fake"});
    arbiter.bind<number>("a", {read: () => store.getState().a, apply: setA});
    arbiter.bind<number>("b", {read: () => store.getState().b, apply: setB});
    store.subscribe(() => arbiter.observe());
    return {store, setA, setB, arbiter};
}

let fixture = makeFixture();

beforeEach(() => {
    fixture = makeFixture();
});

afterEach(() => {
    fixture.arbiter.dispose();
    expect(writeSourcesIdle()).toBe(true);
});

test("a learner write during a lease ends the lease once and wins", () => {
    const {arbiter, store} = fixture;
    const onEnd = vi.fn();
    const lease = arbiter.lease(["a"], onEnd)!;
    expect(lease.write("a", 2)).toEqual({status: "applied"});
    expect(arbiter.write("a", 7, "learner")).toEqual({status: "applied"});
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith("learner");
    expect(store.getState().a).toBe(7);
    expect(lease.write("a", 9)).toEqual({status: "refused-arbiter", reason: "lease-ended"});
    expect(store.getState().a).toBe(7);
});

test("a held key refuses leases, ends earlier leases, and refuses lesson writes", () => {
    const {arbiter, store} = fixture;
    const early = vi.fn();
    const lease = arbiter.lease(["a"], early)!;
    const release = arbiter.hold("a");
    expect(early).toHaveBeenCalledWith("learner");
    expect(lease.write("a", 3)).toEqual({status: "refused-arbiter", reason: "lease-ended"});
    expect(arbiter.lease(["a"])).toBeUndefined();
    expect(arbiter.write("a", 4, "lesson")).toEqual({status: "refused-arbiter", reason: "held"});
    expect(store.getState().a).toBe(1);
    release();
    expect(arbiter.write("a", 4, "lesson")).toEqual({status: "applied"});
    expect(arbiter.lease(["a"])).toBeDefined();
});

test("a domain refusal leaves the value and the lease unchanged", () => {
    const {arbiter, store} = fixture;
    const onEnd = vi.fn();
    const lease = arbiter.lease(["a"], onEnd)!;
    const result = arbiter.write("a", -1, "learner");
    expect(result.status).toBe("refused-domain");
    if (result.status === "refused-domain") expect(result.error).toBeInstanceOf(FakeDomainError);
    expect(store.getState().a).toBe(1);
    expect(lease.active).toBe(true);
    expect(onEnd).not.toHaveBeenCalled();
});

test("endAllLeases ends every lease with the frame reason", () => {
    const {arbiter} = fixture;
    const endA = vi.fn();
    const endB = vi.fn();
    const leaseA = arbiter.lease(["a"], endA)!;
    const leaseB = arbiter.lease(["b"], endB)!;
    arbiter.endAllLeases();
    expect(endA).toHaveBeenCalledOnce();
    expect(endA).toHaveBeenCalledWith("frame");
    expect(endB).toHaveBeenCalledOnce();
    expect(endB).toHaveBeenCalledWith("frame");
    expect(leaseA.active).toBe(false);
    expect(leaseB.active).toBe(false);
    expect(arbiter.activeLeases()).toHaveLength(0);
});

test("a read right after an applied write returns the written value", () => {
    const {arbiter, store} = fixture;
    expect(arbiter.write("a", 5, "lesson")).toEqual({status: "applied"});
    expect(arbiter.read("a")).toBe(5);
    expect(store.getState().a).toBe(5);
    const lease = arbiter.lease(["b"])!;
    expect(lease.write("b", 6)).toEqual({status: "applied"});
    expect(arbiter.read("b")).toBe(6);
    expect(store.getState().b).toBe(6);
});

test("a lease started in the gesture that changed its key is granted; one requested by a lesson in that gesture is refused", () => {
    const {arbiter, setA} = fixture;
    const endGesture = beginLearnerGesture();
    try {
        setA(5);
        expect(arbiter.isHeld("a")).toBe(true);
        expect(runAs("lesson", () => arbiter.lease(["a"]))).toBeUndefined();
        const lease = arbiter.lease(["a"]);
        expect(lease).toBeDefined();
        expect(lease!.active).toBe(true);
    } finally {
        endGesture();
    }
});

test("inside a learner gesture an unscoped setter call is the learner's and holds the key", () => {
    const {arbiter, store, setA} = fixture;
    const onEnd = vi.fn();
    const lease = arbiter.lease(["a"], onEnd)!;
    const endGesture = beginLearnerGesture();
    try {
        expect(() => setA(5)).not.toThrow();
        expect(onEnd).toHaveBeenCalledOnce();
        expect(onEnd).toHaveBeenCalledWith("learner");
        expect(lease.active).toBe(false);
        expect(arbiter.isHeld("a")).toBe(true);
        expect(arbiter.write("a", 8, "lesson")).toEqual({status: "refused-arbiter", reason: "held"});
        expect(store.getState().a).toBe(5);
    } finally {
        endGesture();
    }
    expect(arbiter.isHeld("a")).toBe(false);
    expect(arbiter.write("a", 8, "lesson")).toEqual({status: "applied"});
    expect(store.getState().a).toBe(8);
});

test("an untagged write throws in strict mode, naming the key, and not otherwise", () => {
    const {setA, store} = fixture;
    expect(() => setA(3)).toThrow(UntaggedWriteError);
    expect(() => setA(4)).toThrow(/"a"/);
    expect(store.getState().a).toBe(4);

    expect(() => runAs("lesson", () => setA(6))).not.toThrow();
    expect(store.getState().a).toBe(6);

    fixture.arbiter.dispose();
    fixture = makeFixture(false);
    expect(() => fixture.setA(3)).not.toThrow();
    expect(fixture.store.getState().a).toBe(3);
});

test("an animation scope changing a key it does not lease throws; run on an ended lease does not run", () => {
    const {arbiter, setB} = fixture;
    const lease = arbiter.lease(["a"])!;
    expect(() => lease.run(() => setB(2))).toThrow(UntaggedWriteError);
    const work = vi.fn();
    expect(lease.run(work)).toBe(true);
    expect(work).toHaveBeenCalledOnce();
    lease.release();
    work.mockClear();
    expect(lease.run(work)).toBe(false);
    expect(work).not.toHaveBeenCalled();
});

test("lease end reasons: replaced, released, and never twice", () => {
    const {arbiter} = fixture;
    const first = vi.fn();
    const second = vi.fn();
    arbiter.lease(["a", "b"], first);
    const newer = arbiter.lease(["b"], second)!;
    expect(first).toHaveBeenCalledOnce();
    expect(first).toHaveBeenCalledWith("replaced");
    newer.release();
    newer.release();
    expect(second).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledWith("released");
    arbiter.endAllLeases();
    arbiter.write("b", 3, "learner");
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
});

test("an onEnd that writes another bound key settles and is observed", () => {
    const {arbiter, store} = fixture;
    const reasons: LeaseEndReason[] = [];
    arbiter.lease(["a"], reason => {
        reasons.push(reason);
        runAs("lesson", () => store.setState({b: 42}));
    });
    expect(() => arbiter.write("a", 2, "learner")).not.toThrow();
    expect(reasons).toEqual(["learner"]);
    expect(store.getState().b).toBe(42);
    // `last` for b was updated, so a no-op observe sees no untagged change.
    expect(() => arbiter.observe()).not.toThrow();
});
