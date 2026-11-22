// @vitest-environment jsdom
import {installLearnerInputTagging} from "./learnerInputTagging";
import {activeGesture, currentWrite, writeSourcesIdle} from "./writeSource";

// Fake timers: "the next task" is `vi.runAllTimers()`.
let element: HTMLElement;

function pointer(type: string, pointerId = 1): Event {
    const event = new Event(type, {bubbles: true});
    Object.defineProperty(event, "pointerId", {value: pointerId});
    return event;
}

function key(type: "keydown" | "keyup", code: string): KeyboardEvent {
    return new KeyboardEvent(type, {code, bubbles: true});
}

beforeAll(() => {
    installLearnerInputTagging(window, {holdSyntheticInput: true});
});

beforeEach(() => {
    vi.useFakeTimers();
    element = document.createElement("div");
    document.body.appendChild(element);
});

afterEach(() => {
    element.remove();
    window.dispatchEvent(new Event("blur"));
    vi.runAllTimers();
    vi.useRealTimers();
    expect(writeSourcesIdle()).toBe(true);
});

test("a pointer gesture stays open until pointerup and closes on the next tick", () => {
    let seen: ReturnType<typeof currentWrite>;
    element.addEventListener("pointerdown", () => { seen = currentWrite(); });
    element.dispatchEvent(pointer("pointerdown"));
    expect(seen?.source).toBe("learner");
    expect(seen?.gesture).toBeTypeOf("number");
    expect(currentWrite()?.source).toBe("learner");

    vi.runAllTimers();
    expect(currentWrite()?.source).toBe("learner");

    element.dispatchEvent(pointer("pointerup"));
    expect(currentWrite()?.source).toBe("learner");
    vi.runAllTimers();
    expect(currentWrite()).toBeUndefined();
});

test("a click or input handler sees learner and the gesture closes when the event bubbles to window", () => {
    const seen: Array<string | undefined> = [];
    element.addEventListener("click", () => seen.push(currentWrite()?.source));
    element.addEventListener("input", () => seen.push(currentWrite()?.source));
    element.dispatchEvent(new Event("click", {bubbles: true}));
    expect(writeSourcesIdle()).toBe(true);
    element.dispatchEvent(new Event("input", {bubbles: true}));
    expect(writeSourcesIdle()).toBe(true);
    expect(seen).toEqual(["learner", "learner"]);
});

test("stopPropagation in an inner handler still closes the gesture on the next tick", () => {
    let seen: string | undefined;
    element.addEventListener("click", event => {
        seen = currentWrite()?.source;
        event.stopPropagation();
    });
    element.dispatchEvent(new Event("click", {bubbles: true}));
    expect(seen).toBe("learner");
    expect(activeGesture()).toBeDefined();
    vi.runAllTimers();
    expect(activeGesture()).toBeUndefined();
});

test("keydown opens a gesture that the keyup of the same code closes", () => {
    element.dispatchEvent(key("keydown", "ArrowLeft"));
    vi.runAllTimers();
    expect(currentWrite()?.source).toBe("learner");
    element.dispatchEvent(key("keydown", "ArrowLeft"));
    element.dispatchEvent(key("keyup", "KeyA"));
    vi.runAllTimers();
    expect(currentWrite()?.source).toBe("learner");
    element.dispatchEvent(key("keyup", "ArrowLeft"));
    vi.runAllTimers();
    expect(currentWrite()).toBeUndefined();
});

test("window blur closes every open gesture", () => {
    element.dispatchEvent(pointer("pointerdown", 1));
    element.dispatchEvent(pointer("pointerdown", 2));
    element.dispatchEvent(key("keydown", "ArrowUp"));
    expect(currentWrite()?.source).toBe("learner");
    window.dispatchEvent(new Event("blur"));
    expect(currentWrite()).toBeUndefined();
    vi.runAllTimers();
    expect(writeSourcesIdle()).toBe(true);
});

test("installing twice adds no second listener set", () => {
    installLearnerInputTagging(window);
    element.dispatchEvent(pointer("pointerdown"));
    const first = activeGesture();
    element.dispatchEvent(pointer("pointerup"));
    vi.runAllTimers();
    element.dispatchEvent(pointer("pointerdown"));
    // One listener set: ids advance by one per gesture, and one pointerup ends it.
    expect(activeGesture()).toBe(first! + 1);
    element.dispatchEvent(pointer("pointerup"));
    vi.runAllTimers();
    expect(currentWrite()).toBeUndefined();
});
