// @vitest-environment jsdom
import {installLearnerInputTagging} from "./learnerInputTagging";
import {currentWrite, writeSourcesIdle} from "./writeSource";

// Fake timers: "the next task" is `vi.runAllTimers()`. Separate file: the install is once per window.
test("without holdSyntheticInput a synthetic keydown with no keyup leaves no gesture open after its dispatch", () => {
    vi.useFakeTimers();
    installLearnerInputTagging(window);
    const element = document.createElement("div");
    document.body.appendChild(element);
    let seen: string | undefined;
    element.addEventListener("keydown", () => { seen = currentWrite()?.source; });
    element.dispatchEvent(new KeyboardEvent("keydown", {code: "ArrowLeft", bubbles: true}));
    expect(seen).toBe("learner");
    expect(currentWrite()).toBeUndefined();
    vi.runAllTimers();
    expect(writeSourcesIdle()).toBe(true);
    element.remove();
    vi.useRealTimers();
});
