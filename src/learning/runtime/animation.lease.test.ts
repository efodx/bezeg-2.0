import {SceneStore} from "../../graphs/base/SceneStore";
import {ParameterArbiter} from "../../graphs/base/writes/parameterArbiter";
import {currentWrite, writeSourcesIdle} from "../../graphs/base/writes/writeSource";
import {AnimationDriver, type AnimationScheduler} from "./animation";

interface State {
    a: number;
    b: number;
}

class ManualScheduler implements AnimationScheduler {
    private next = 1;
    private callbacks = new Map<number, FrameRequestCallback>();

    request(callback: FrameRequestCallback) {
        const handle = this.next++;
        this.callbacks.set(handle, callback);
        return handle;
    }

    cancel(handle: number) {
        this.callbacks.delete(handle);
    }

    get pending() {
        return this.callbacks.size;
    }

    tick(time: number) {
        const callbacks = [...this.callbacks.values()];
        this.callbacks.clear();
        for (const callback of callbacks) callback(time);
    }
}

function makeFixture() {
    const store = new SceneStore<State>({a: 1, b: 1});
    const arbiter = new ParameterArbiter({isDomainError: () => false, strict: true, owner: "fake"});
    arbiter.bind<number>("a", {read: () => store.getState().a, apply: v => store.setState({a: v})});
    arbiter.bind<number>("b", {read: () => store.getState().b, apply: v => store.setState({b: v})});
    store.subscribe(() => arbiter.observe());
    const scheduler = new ManualScheduler();
    const sources: Array<string | undefined> = [];
    const onInterrupted = vi.fn();
    const driver = new AnimationDriver((delta, time) => {
        sources.push(currentWrite()?.source);
        store.setState({a: time});
    }, scheduler);
    driver.useLease({arbiter: () => arbiter, keys: ["a"], onInterrupted});
    return {store, arbiter, scheduler, sources, onInterrupted, driver};
}

afterEach(() => expect(writeSourcesIdle()).toBe(true));

test("a leased key the graph never bound is a development error naming the key", () => {
    const {arbiter, scheduler} = makeFixture();
    const driver = new AnimationDriver(() => undefined, scheduler);
    driver.useLease({arbiter: () => arbiter, keys: ["a", "missing"]});
    expect(() => driver.play()).toThrow(/missing/);
    expect(driver.isRunning()).toBe(false);
});

test("frames run as animation and may change the leased key", () => {
    const {driver, scheduler, sources, store} = makeFixture();
    driver.play();
    scheduler.tick(10);
    scheduler.tick(20);
    expect(sources).toEqual(["animation", "animation"]);
    expect(store.getState().a).toBe(20);
    expect(driver.isRunning()).toBe(true);
    driver.stop();
});

test("a learner write to the leased key stops the driver, calls onInterrupted once and runs no further frame", () => {
    const {driver, scheduler, sources, arbiter, store, onInterrupted} = makeFixture();
    driver.play();
    scheduler.tick(10);
    expect(arbiter.write("a", 7, "learner")).toEqual({status: "applied"});
    expect(onInterrupted).toHaveBeenCalledTimes(1);
    expect(onInterrupted).toHaveBeenCalledWith("learner");
    expect(driver.isRunning()).toBe(false);
    expect(scheduler.pending).toBe(0);
    scheduler.tick(20);
    expect(sources).toEqual(["animation"]);
    expect(store.getState().a).toBe(7);
    expect(onInterrupted).toHaveBeenCalledTimes(1);
});

test("endAllLeases ends the playback with reason frame", () => {
    const {driver, scheduler, arbiter, onInterrupted} = makeFixture();
    driver.play();
    scheduler.tick(10);
    arbiter.endAllLeases();
    expect(onInterrupted).toHaveBeenCalledTimes(1);
    expect(onInterrupted).toHaveBeenCalledWith("frame");
    expect(driver.isRunning()).toBe(false);
});

test("play does not start while the learner holds the key", () => {
    const {driver, scheduler, arbiter, sources} = makeFixture();
    const release = arbiter.hold("a");
    driver.play();
    expect(driver.isRunning()).toBe(false);
    expect(scheduler.pending).toBe(0);
    release();
    driver.play();
    expect(driver.isRunning()).toBe(true);
    scheduler.tick(5);
    expect(sources).toEqual(["animation"]);
    driver.stop();
});

test("pause and stop release the lease without calling onInterrupted", () => {
    const {driver, scheduler, arbiter, onInterrupted} = makeFixture();
    driver.play();
    scheduler.tick(10);
    driver.pause();
    expect(arbiter.lease(["a"])).toBeDefined();
    arbiter.endAllLeases();
    driver.play();
    scheduler.tick(20);
    driver.stop();
    // The lease is free again after stop.
    const free = arbiter.lease(["a"]);
    expect(free).toBeDefined();
    free!.release();
    expect(onInterrupted).not.toHaveBeenCalled();
});

test("without a spec or arbiter the frames run untagged", () => {
    const scheduler = new ManualScheduler();
    const sources: Array<string | undefined> = [];
    const plain = new AnimationDriver(() => { sources.push(currentWrite()?.source); }, scheduler);
    plain.play();
    scheduler.tick(1);
    plain.stop();

    const noArbiter = new AnimationDriver(() => { sources.push(currentWrite()?.source); }, scheduler);
    noArbiter.useLease({arbiter: () => undefined, keys: ["a"]});
    noArbiter.play();
    scheduler.tick(2);
    noArbiter.stop();
    expect(sources).toEqual([undefined, undefined]);
});
