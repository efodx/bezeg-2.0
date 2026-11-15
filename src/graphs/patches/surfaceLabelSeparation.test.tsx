/**
 * Label separation of the `patch-subdivision` and `patch-joins` default scenes (site walkthrough B10): every symbol is
 * drawn and no two label boxes meet, at the capture size and at the desktop graph size.
 */
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {GraphHost} from "../base/GraphHost";
import {installBoardShims} from "../base/realGraphTestHarness";
import {appStorage} from "../../storage/appStorage";
import {FakeSurfaceView} from "./FakeSurfaceView";
import TensorSubdivisionGraph from "./TensorSubdivisionGraph";
import TensorJoinGraph from "./TensorJoinGraph";
import {computeLabelLayout} from "./surface-view/jsxLabels";
import {SURFACE_LABEL_FONT_PX, SURFACE_LABEL_OFFSET_X_PX} from "./SurfaceLabelOverlay";
import type {SurfaceScene} from "./surface-view/surfaceScene";

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

const SIZES = [{width: 720, height: 440}, {width: 1000, height: 640}];
/** Estimated glyph advance as a fraction of the font size; a formula's visible glyphs are its text without markup. */
const GLYPH_EM = 0.6;
const glyphs = (latex: string) => latex.replace(/[\{}_^,]/g, "").length;

/** The screen box of a laid out label: the overlay puts its left edge `OFFSET_X` right of the anchor, centred vertically. */
function box(label: {text: string; x: number; y: number}) {
    const left = label.x + SURFACE_LABEL_OFFSET_X_PX, width = glyphs(label.text) * GLYPH_EM * SURFACE_LABEL_FONT_PX;
    return {left, right: left + width, top: label.y - SURFACE_LABEL_FONT_PX / 2, bottom: label.y + SURFACE_LABEL_FONT_PX / 2};
}
const meets = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

function sceneOf(make: (view: FakeSurfaceView) => TensorSubdivisionGraph | TensorJoinGraph): SurfaceScene {
    const view = new FakeSurfaceView();
    render(<MemoryRouter><GraphHost create={() => make(view)}/></MemoryRouter>);
    return view.last;
}

const WORKSPACES: ReadonlyArray<readonly [string, (view: FakeSurfaceView) => TensorSubdivisionGraph | TensorJoinGraph, string[]]> = [
    ["patch-subdivision", view => new TensorSubdivisionGraph({viewFactory: () => view}), ["surface-point", "piece-l-label", "piece-r-label"]],
    ["patch-joins", view => new TensorJoinGraph({viewFactory: () => view}), ["surface-point", "join-su-a-label", "join-su-b-label"]],
];

describe.each(WORKSPACES)("%s default scene labels", (_name, make, ids) => {
    it.each(SIZES)("draws every symbol and keeps the label boxes apart at $width x $height", viewport => {
        const layout = computeLabelLayout(sceneOf(make), viewport);
        expect(layout.map(l => l.id)).toEqual(ids);
        for (const label of layout) expect(label.visible, `${label.id} is drawn`).toBe(true);
        for (let i = 0; i < layout.length; i++) for (let j = i + 1; j < layout.length; j++)
            expect(meets(box(layout[i]), box(layout[j])), `${layout[i].id} meets ${layout[j].id}`).toBe(false);
    });
});

describe("label attachment", () => {
    it("a piece symbol stays within a few label heights of its piece centre", () => {
        const scene = sceneOf(view => new TensorSubdivisionGraph({viewFactory: () => view}));
        const layout = computeLabelLayout(scene, SIZES[0]);
        const bare = computeLabelLayout({...scene, labels: scene.labels.map(({screenOffset, ...rest}) => rest)}, SIZES[0]);
        for (const id of ["piece-l-label", "piece-r-label"]) {
            const placed = layout.find(l => l.id === id)!, centre = bare.find(l => l.id === id)!;
            expect(Math.hypot(placed.x - centre.x, placed.y - centre.y)).toBeLessThanOrEqual(2 * SURFACE_LABEL_FONT_PX + 4);
        }
    });
});
