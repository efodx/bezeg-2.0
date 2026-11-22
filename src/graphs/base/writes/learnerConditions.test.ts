// @vitest-environment jsdom
import {SceneStore} from "../SceneStore";
import {installLearnerInputTagging} from "./learnerInputTagging";
import {ParameterArbiter, UntaggedWriteError} from "./parameterArbiter";
import {activeGesture, beginLearnerGesture, currentWrite, runAs, writeSourcesIdle} from "./writeSource";

interface State {
    a: number;
    b: number;
}

function makeFixture() {
    const store = new SceneStore<State>({a: 1, b: 1});
    const setA = (value: number) => store.setState({a: value});
    const setB = (value: number) => store.setState({b: value});
    const arbiter = new ParameterArbiter({isDomainError: () => false, strict: true, owner: "fake"});
    arbiter.bind<number>("a", {read: () => store.getState().a, apply: setA});
    arbiter.bind<number>("b", {read: () => store.getState().b, apply: setB});
    store.subscribe(() => arbiter.observe());
    return {store, setA, setB, arbiter};
}

let fixture = makeFixture();
let element: HTMLElement;

function pointer(type: string, pointerId = 1): Event {
    const event = new Event(type, {bubbles: true});
    Object.defineProperty(event, "pointerId", {value: pointerId});
    return event;
}

beforeAll(() => {
    installLearnerInputTagging(window, {holdSyntheticInput: true});
});

beforeEach(() => {
    vi.useFakeTimers();
    fixture = makeFixture();
    element = document.createElement("div");
    document.body.appendChild(element);
});

afterEach(() => {
    element.remove();
    window.dispatchEvent(new Event("blur"));
    vi.runAllTimers();
    vi.useRealTimers();
    fixture.arbiter.dispose();
    expect(writeSourcesIdle()).toBe(true);
});

test("beginLearnerGesture opens source and span together", () => {
    const end = beginLearnerGesture();
    expect(currentWrite()?.source).toBe("learner");
    expect(activeGesture()).toBeDefined();
    fixture.setA(2);
    end();
    expect(currentWrite()).toBeUndefined();
    expect(activeGesture()).toBeUndefined();
});

test("a: an explicit animation scope overrides the ambient learner source inside a pointer span", () => {
    const {arbiter, setA, setB} = fixture;
    const lease = arbiter.lease(["b"])!;
    let attributed: string | undefined;
    let held: ReturnType<ParameterArbiter["write"]> | undefined;
    element.addEventListener("pointerdown", () => undefined);
    element.addEventListener("pointermove", () => {
        runAs("animation", () => {
            attributed = currentWrite()?.source;
            setB(5);
        }, lease);
    });
    element.dispatchEvent(pointer("pointerdown"));
    element.dispatchEvent(pointer("pointermove"));
    expect(attributed).toBe("animation");
    // A learner attribution would have ended the lease.
    expect(lease.active).toBe(true);

    // A learner change to `a` holds it; an animation write is refused while the span is open.
    const own = arbiter.lease(["a"])!;
    element.addEventListener("pointermove", () => {
        if (!held) {
            setA(9);
            held = arbiter.write("a", 3, "animation", own);
        }
    });
    element.dispatchEvent(pointer("pointermove"));
    expect(held?.status).toBe("refused-arbiter");
});

test("b: a click handler's lesson scope writes as lesson; a plain setter in the same handler writes as learner", () => {
    const {arbiter, setA, setB} = fixture;
    const onEndA = vi.fn();
    const onEndB = vi.fn();
    arbiter.lease(["a"], onEndA);
    arbiter.lease(["b"], onEndB);
    element.addEventListener("click", () => {
        runAs("lesson", () => setA(2));
        setB(3);
    });
    element.dispatchEvent(new Event("click", {bubbles: true}));
    expect(onEndA).toHaveBeenCalledWith("lesson");
    expect(onEndB).toHaveBeenCalledWith("learner");
});

describe("c: work after the gesture has no ambient source", () => {
    test("a timer during an open pointer span throws; the same change in a pointermove does not", () => {
        const {setA} = fixture;
        element.addEventListener("pointermove", () => setA(3));
        element.dispatchEvent(pointer("pointerdown"));
        expect(activeGesture()).toBeDefined();
        let error: unknown;
        setTimeout(() => {
            try {
                setA(4);
            } catch (caught) {
                error = caught;
            }
        }, 0);
        vi.runAllTimers();
        expect(error).toBeInstanceOf(UntaggedWriteError);
        expect(activeGesture()).toBeDefined();
        expect(() => element.dispatchEvent(pointer("pointermove"))).not.toThrow();
    });

    test("a promise continuation during an open pointer span throws", async () => {
        const {setA} = fixture;
        element.dispatchEvent(pointer("pointerdown"));
        let error: unknown;
        await Promise.resolve().then(() => {
            try {
                setA(4);
            } catch (caught) {
                error = caught;
            }
        });
        expect(error).toBeInstanceOf(UntaggedWriteError);
        window.dispatchEvent(new Event("blur"));
    });
});

describe("d: holds are per key", () => {
    test("a span in which no key changed holds nothing", () => {
        const {arbiter} = fixture;
        element.dispatchEvent(pointer("pointerdown"));
        expect(activeGesture()).toBeDefined();
        expect(arbiter.write("a", 2, "lesson")).toEqual({status: "applied"});
        expect(arbiter.lease(["a", "b"])).toBeDefined();
    });

    test("a span in which a handler changed `a` holds `a` only, until pointerup and the next tick", () => {
        const {arbiter, setA} = fixture;
        element.addEventListener("pointermove", () => setA(5));
        element.dispatchEvent(pointer("pointerdown"));
        element.dispatchEvent(pointer("pointermove"));
        expect(arbiter.write("a", 6, "lesson")).toEqual({status: "refused-arbiter", reason: "held"});
        expect(arbiter.write("b", 6, "lesson")).toEqual({status: "applied"});
        element.dispatchEvent(pointer("pointerup"));
        expect(arbiter.write("a", 7, "lesson")).toEqual({status: "refused-arbiter", reason: "held"});
        vi.runAllTimers();
        expect(arbiter.write("a", 7, "lesson")).toEqual({status: "applied"});
    });
});
