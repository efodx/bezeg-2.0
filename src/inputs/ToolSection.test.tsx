import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {setPicks} from "../uxPicks/picks";
import {ToolSection} from "./ToolSection";

beforeEach(() => { act(() => setPicks([])); localStorage.clear(); });
afterEach(() => { act(() => setPicks([])); localStorage.clear(); });

describe("ToolSection", () => {
    it("renders the plain group, heading and visible help with the pick off", () => {
        const {container} = render(<ToolSection id="a" title="Naslov" help="Pomoč"><span>telo</span></ToolSection>);
        expect(container.innerHTML).toBe('<div class="inspector-group"><h3>Naslov</h3><span>telo</span><p class="inspector-help">Pomoč</p></div>');
    });

    it("folds, remembers the fold per id and opens the help with the pick on", () => {
        act(() => setPicks(["toolsCard"]));
        const {container, unmount} = render(<ToolSection id="a" title="Naslov" help="Pomoč"><span>telo</span></ToolSection>);
        const fold = screen.getByRole("button", {name: "Skrij razdelek: Naslov"});
        expect(fold.getAttribute("aria-expanded")).toBe("true");
        fireEvent.click(fold);
        expect(screen.getByRole("button", {name: "Pokaži razdelek: Naslov"}).getAttribute("aria-expanded")).toBe("false");
        expect(container.firstElementChild?.hasAttribute("data-ux-folded")).toBe(true);
        expect(localStorage.getItem("ux-tools-fold:a")).toBe("1");
        unmount();
        render(<ToolSection id="a" title="Naslov"><span>telo</span></ToolSection>);
        expect(screen.getByRole("button", {name: "Pokaži razdelek: Naslov"})).toBeTruthy();
    });

    it("opens the help behind the question mark", () => {
        act(() => setPicks(["toolsCard"]));
        const {container} = render(<ToolSection id="b" title="Naslov" help="Pomoč"/>);
        const help = screen.getByRole("button", {name: "Pomoč: Naslov"});
        expect(help.getAttribute("aria-expanded")).toBe("false");
        fireEvent.click(help);
        expect(help.getAttribute("aria-expanded")).toBe("true");
        expect(container.firstElementChild?.hasAttribute("data-ux-help-open")).toBe(true);
    });

    it("a section without a title is a plain group even with the pick on", () => {
        act(() => setPicks(["toolsCard"]));
        const {container} = render(<ToolSection id="c"><span>telo</span></ToolSection>);
        expect(container.innerHTML).toBe('<div class="inspector-group"><span>telo</span></div>');
    });
});
