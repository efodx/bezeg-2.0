import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {RevealButton} from "./RevealButton";

describe("RevealButton", () => {
    it("swaps its label, reports data-revealed and has no aria-pressed", () => {
        const {rerender} = render(<RevealButton revealed={false} showLabel="Show" hideLabel="Hide" action="toggle-x" onToggle={() => {}}/>);
        const button = screen.getByRole("button", {name: "Show"});
        expect(button.getAttribute("data-revealed")).toBe("false");
        expect(button.getAttribute("data-action")).toBe("toggle-x");
        expect(button.hasAttribute("aria-pressed")).toBe(false);
        expect(button.getAttribute("type")).toBe("button");
        rerender(<RevealButton revealed showLabel="Show" hideLabel="Hide" action="toggle-x" onToggle={() => {}}/>);
        expect(screen.getByRole("button", {name: "Hide"}).getAttribute("data-revealed")).toBe("true");
    });

    it("calls onToggle on click", () => {
        const onToggle = vi.fn();
        render(<RevealButton revealed={false} showLabel="Show" hideLabel="Hide" action="toggle-x" onToggle={onToggle}/>);
        fireEvent.click(screen.getByRole("button"));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});
