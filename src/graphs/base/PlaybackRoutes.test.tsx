import React from "react";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from "vitest";
import {GraphHost} from "./GraphHost";
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from "./realGraphTestHarness";
import {BisectionGraph} from "../functions/BisectionGraph";
import {EarClippingGraph} from "../compgeo/EarClippingGraph";
import {ParametricCurveGraph} from "../curves/parametric/ParametricCurveGraph";
import {setLanguage} from "../../localization";
import type BaseGraph from "./BaseGraph";

beforeAll(installBoardShims);
beforeEach(() => setLanguage("sl"));
afterEach(() => vi.unstubAllGlobals());

/** Only the graph-adjacent query matches (a phone); reduced motion and the rest stay false. */
function phone() {
    const original = window.matchMedia;
    vi.stubGlobal("matchMedia", (query: string) => ({...original(query), matches: query.includes("max-width: 700px")}));
}

const mount = (create: () => BaseGraph<any, any>) => render(<MemoryRouter><GraphHost create={create}/></MemoryRouter>);
const slot = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-playback-slot]")!;

// One route per family; every inventoried route passes the same placement="graph" prop to the same PlaybackButtons.
const families: readonly [string, () => BaseGraph<any, any>][] = [
    ["iterative function (bisection)", () => new BisectionGraph()],
    ["trace (ear clipping)", () => new EarClippingGraph()],
    ["continuous curve (parametric roll)", () => new ParametricCurveGraph()],
];

describe.each(families)("playback slot on a phone: %s", (_name, create) => {
    test("the one playback group sits in the slot under the board", () => {
        phone();
        const {container} = mount(create);
        const playButtons = container.querySelectorAll('[data-action="play-pause"]');
        expect(playButtons).toHaveLength(1);
        expect(slot(container).contains(playButtons[0])).toBe(true);
    }, REAL_GRAPH_TEST_TIMEOUT);

    test("on a wide viewport the group stays in the inspector", () => {
        const {container} = mount(create);
        const playButton = container.querySelector('[data-action="play-pause"]')!;
        expect(slot(container).childElementCount).toBe(0);
        expect(container.querySelector("#workspace-inspector")!.contains(playButton)).toBe(true);
    }, REAL_GRAPH_TEST_TIMEOUT);
});
