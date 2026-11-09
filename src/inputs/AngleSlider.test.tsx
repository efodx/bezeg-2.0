import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import AngleSlider from "./AngleSlider";

describe("AngleSlider", () => {
    it("is a cyclic 0 to 360 degree slider with a two-decimal exact field", () => {
        const onChange = vi.fn();
        render(<AngleSlider customText="t" value={0} onChange={onChange}/>);
        const slider = screen.getByRole("slider");
        expect(slider.getAttribute("min")).toBe("0");
        expect(slider.getAttribute("max")).toBe("360");
        expect(slider.getAttribute("aria-valuetext")).toContain("°");
        fireEvent.keyDown(slider, {key: "ArrowDown"});
        expect(onChange).toHaveBeenLastCalledWith(359);
        fireEvent.keyDown(slider, {key: "PageUp"});
        expect(onChange).toHaveBeenLastCalledWith(10);
    });
});
