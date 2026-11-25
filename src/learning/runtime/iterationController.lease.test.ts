import {SceneStore} from "../../graphs/base/SceneStore";
import {ParameterArbiter} from "../../graphs/base/writes/parameterArbiter";
import {currentWrite, writeSourcesIdle} from "../../graphs/base/writes/writeSource";
import type {AnimationScheduler} from "./animation";
import {IterationController} from "./iterationController";

const INTERVAL = 100;

function makeFixture(options: {maxIterations?: number} = {}) {
    const store = new SceneStore<{step: number}>({step: 0});
    const arbiter = new ParameterArbiter({isDomainError: () => false, strict: true, owner: "fake"});
    arbiter.bind<number>("step", {read: () => store.getState().step, apply: v => store.setState({step: v})});
    store.subscribe(() => arbiter.observe());
    let handle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {handle += 1; callbacks.set(handle, callback); return handle;},
        cancel: id => {callbacks.delete(id);},
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    const sources: Array<string | undefined> = [];
    const onInterrupted = vi.fn();
    const controller = new IterationController({
        transition: () => {
            sources.push(currentWrite()?.source);
            store.setState({step: store.getState().step + 1});
        },
        stepIntervalMs: INTERVAL,
        maxIterations: options.maxIterations ?? 20,
        scheduler,
    }).useLease({arbiter: () => arbiter, keys: ["step"], onInterrupted});
    /** Whether a fresh lease on the key can be taken, which it cannot while another lease is active. */
    const keyIsFree = () => {
        const probe = arbiter.lease(["step"]);
        probe?.release();
        return probe !== undefined;
    };
    const leaseCount = () => (arbiter as unknown as {leases: Set<unknown>}).leases.size;
    return {store, arbiter, controller, frame, sources, onInterrupted, keyIsFree, leaseCount};
}

afterEach(() => expect(writeSourcesIdle()).toBe(true));

test("play takes a lease and the frame's transition runs as an animation write", () => {
    const {controller, frame, sources, store, leaseCount} = makeFixture();
    expect(leaseCount()).toBe(0);
    controller.play();
    expect(leaseCount()).toBe(1);
    frame(0);
    frame(INTERVAL);
    expect(sources).toEqual(["animation"]);
    expect(store.getState().step).toBe(1);
});

test("pause releases the lease so a new lease on the same keys succeeds", () => {
    const {controller, leaseCount, keyIsFree, onInterrupted} = makeFixture();
    controller.play();
    expect(leaseCount()).toBe(1);
    controller.pause();
    expect(leaseCount()).toBe(0);
    expect(keyIsFree()).toBe(true);
    expect(controller.status).toBe("paused");
    expect(onInterrupted).not.toHaveBeenCalled();
});

test("completion releases the lease", () => {
    const {controller, frame, leaseCount, keyIsFree} = makeFixture({maxIterations: 2});
    controller.play();
    frame(0);
    frame(INTERVAL);
    frame(INTERVAL);
    expect(controller.isComplete()).toBe(true);
    expect(leaseCount()).toBe(0);
    expect(keyIsFree()).toBe(true);
});

test("dispose releases the lease", () => {
    const {controller, leaseCount, keyIsFree} = makeFixture();
    controller.play();
    expect(leaseCount()).toBe(1);
    controller.dispose();
    expect(leaseCount()).toBe(0);
    expect(keyIsFree()).toBe(true);
});

test("a learner write of a leased key pauses the controller and reports the interruption", () => {
    const {controller, frame, arbiter, onInterrupted, store, leaseCount} = makeFixture();
    controller.play();
    frame(0);
    frame(INTERVAL);
    expect(arbiter.write("step", 7, "learner")).toEqual({status: "applied"});
    expect(onInterrupted).toHaveBeenCalledWith("learner");
    expect(controller.isPlaying()).toBe(false);
    expect(controller.status).toBe("paused");
    expect(leaseCount()).toBe(0);
    expect(frame(INTERVAL)).toBe(false);
    expect(store.getState().step).toBe(7);
});

test("playing again after an interruption takes a fresh lease", () => {
    const {controller, arbiter, leaseCount} = makeFixture();
    controller.play();
    arbiter.write("step", 3, "learner");
    controller.play();
    expect(controller.isPlaying()).toBe(true);
    expect(leaseCount()).toBe(1);
});

test("a refused play while the learner holds the key keeps the status paused", () => {
    const {controller, arbiter} = makeFixture();
    controller.play();
    arbiter.write("step", 3, "learner");
    expect(controller.status).toBe("paused");
    const release = arbiter.hold("step");
    controller.play();
    expect(controller.isPlaying()).toBe(false);
    expect(controller.status).toBe("paused");
    release();
    controller.play();
    expect(controller.status).toBe("playing");
});
