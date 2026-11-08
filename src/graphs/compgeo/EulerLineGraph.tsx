import React from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {GraphSession} from "../base/GraphSession";
import {onLanguageChange, t} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {GraphPalette} from "../styles/GraphPalette";
import {PresetCollection} from "../base/presets/PresetCollection";
import {BOARD_COORDINATE_CAP, BoardXY, inBox} from "../../compgeo/notablePointsModel";
import {
    activeEulerExampleId, analyseEulerLine, EulerAnalysis, EulerExampleId, eulerExample, NinePointKind,
} from "../../compgeo/eulerLineModel";
import {EULER_LINE_OVERLAY_IDS, EULER_POINT_COUNT, eulerLineCollection} from "./eulerLinePresetCollection";
import {EulerLinePanel} from "./EulerLinePanel";
import {EULER_PLACE_IDS, EULER_PLACE_SYMBOL, EulerPlaceId, eulerChip} from "./eulerLineText";

/**
 * Euler line and nine-point circle (spec triangle-geometry-lessons T3, task triangle-geometry/06): a `PointSetGraph`
 * limited to three points in points mode at grid step 1, a sibling of the notable-points graph. Overlays (independent
 * switches): `triangle`, `centres` (markers O, G, H), `line` (the Euler line, clipped to the view by the board),
 * `circle` (nine-point circle and its centre N), `ninepoints` (the nine markers, three kinds by shape and colour) and
 * `circumcircle`. The numbers come from `analyseEulerLine` (the exact triangle kernel); this file only draws and words them.
 *
 * Far objects follow the notable-points rule: a point beyond `BOARD_COORDINATE_CAP` is never sent to the board; a point
 * merely outside the view is reported "outside the view" in the inspector and the board chip; the host Fit frames the
 * vertices and the shown points. The view is never rescaled silently. When H = O (equilateral) the Euler line is not
 * drawn and the chip and inspector say so.
 *
 * The example id is part of the scene state (`state.exampleId`); it names the example only while the vertices still equal it.
 * No route, catalog entry or Demonstration registration yet.
 */
export type EulerOverlayId = Exclude<typeof EULER_LINE_OVERLAY_IDS[number], "grid">;

export interface EulerLineState extends PointSetGraphState {
    exampleId: EulerExampleId | undefined;
}

function hasExampleField(state: PointSetGraphState): state is EulerLineState {
    return "exampleId" in state;
}

export const DEFAULT_EULER_MODEL: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0, points: eulerExample("default").points.map(p => ({...p})),
};

type Triangle = Extract<EulerAnalysis, {kind: "triangle"}>;

const COLOUR = {
    h: GraphPalette.additionalCurves[1], g: GraphPalette.additionalCurves[0], o: GraphPalette.comparisonCurve,
    n: GraphPalette.primaryCurve, line: GraphPalette.additionalCurves[1],
};
const NINE_FACE: Readonly<Record<NinePointKind, string>> = {midpoint: "o", foot: "square", vertexMidpoint: "diamond"};
const NINE_COLOUR: Readonly<Record<NinePointKind, string>> = {
    midpoint: GraphPalette.comparisonCurve, foot: GraphPalette.additionalCurves[0], vertexMidpoint: GraphPalette.additionalCurves[1],
};
const NINE_NAME: Readonly<Record<NinePointKind, string>> = {midpoint: "nine-midpoint-", foot: "nine-foot-", vertexMidpoint: "nine-vertex-midpoint-"};

export class EulerLineGraph extends PointSetGraph<EulerOverlayId> {
    private unsubscribeLanguage?: () => void;
    private outsideKey = "";
    private chip?: JXG.GeometryElement;

    constructor() {
        super({pointLimit: EULER_POINT_COUNT});
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    get exampleId(): EulerExampleId | undefined {
        const state = this.state;
        return activeEulerExampleId(hasExampleField(state) ? state.exampleId : undefined, state.model.points, state.model.gridStepExponent);
    }

    analysis(): EulerAnalysis {
        return analyseEulerLine(this.model.points, this.model.gridStepExponent);
    }

    /** Points not visible in the current board view (or too far to draw). Empty before a board exists. */
    outsideView(analysis: EulerAnalysis = this.analysis()): ReadonlySet<EulerPlaceId> {
        const outside = new Set<EulerPlaceId>();
        if (analysis.kind !== "triangle" || !this.hasBoard) return outside;
        const box = this.board.getBoundingBox();
        for (const id of EULER_PLACE_IDS) {
            const place = analysis[id].board;
            if (place && !inBox(box, place)) outside.add(id);
        }
        return outside;
    }

    /** Whether the board currently asks for the point: H, G, O with the centres or the line, N with the circle. */
    private placeShown(id: EulerPlaceId): boolean {
        return id === "n" ? this.overlayShown("circle") : this.overlayShown("centres") || this.overlayShown("line");
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    /** Loads a named example in two synchronous writes, the vertices and then the id; `activeEulerExampleId` checks the id against the vertices. */
    loadExample(id: EulerExampleId): void {
        const example = eulerExample(id);
        this.loadModel({...DEFAULT_EULER_MODEL, points: example.points.map(p => ({...p}))});
        const patch: Partial<EulerLineState> = {exampleId: id};
        this.setState(patch);
    }

    // ---- Lifecycle -----------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        this.chip = undefined;
        this.ensureChip();
        // The board text is a function of the current language; a switch only has to redraw it.
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = onLanguageChange(() => {
            if (this.hasBoard) this.board.fullUpdate();
        });
        // The inspector says "outside the view" from the live view box; re-render it only when that answer changes.
        this.outsideKey = "";
        session.on("boundingbox", () => this.refreshOutside());
        session.on("up", () => this.refreshOutside());
    }

    private refreshOutside(): void {
        if (!this.hasBoard) return;
        const key = [...this.outsideView()].join(",");
        if (key === this.outsideKey) return;
        this.outsideKey = key;
        this.requestRender();
    }

    override unmount(): void {
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = undefined;
        super.unmount();
    }

    override getInitialState(): EulerLineState {
        return {
            ...super.getInitialState(), exampleId: "default",
            overlays: {triangle: true, centres: true, line: true, circle: true, ninepoints: false, circumcircle: false},
        };
    }

    override defaultPreset(): PointSetModel {
        return {...DEFAULT_EULER_MODEL, points: DEFAULT_EULER_MODEL.points.map(p => ({...p}))};
    }

    /** The default triangle (0,0), (7,0), (2,5) with its circumcircle (centre (7/2,3/2), R about 3.81) and a margin. */
    protected override initialView(): [number, number, number, number] {
        return [-1, 6, 8, -3];
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return eulerLineCollection;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        // One list with the Preset collection, so its overlay check cannot drift from the switches.
        return EULER_LINE_OVERLAY_IDS;
    }

    protected override overlayLabel(id: "grid" | EulerOverlayId): string {
        switch (id) {
            case "triangle": return t("notable_overlay_triangle");
            case "centres": return t("euler_overlay_centres");
            case "line": return t("euler_overlay_line");
            case "circle": return t("euler_overlay_circle");
            case "ninepoints": return t("euler_overlay_ninepoints");
            case "circumcircle": return t("euler_overlay_circumcircle");
            default: return super.overlayLabel(id);
        }
    }

    protected override drawOverlay(id: "grid" | EulerOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const analysis = analyseEulerLine(model.points, model.gridStepExponent);
        if (analysis.kind === "missing") return [];
        if (id === "triangle") return this.drawTriangle(analysis.vertices);
        if (analysis.kind !== "triangle") return [];
        switch (id) {
            case "centres": return EULER_PLACE_IDS.filter(p => p !== "n").flatMap(p => this.marker(p, analysis));
            case "line": return this.drawLine(analysis);
            case "circle": return this.drawCircle("nine-point-circle", analysis.n.board, analysis.halfCircumradius, COLOUR.n, 2, this.marker("n", analysis));
            case "circumcircle": return this.drawCircle("circumcircle", analysis.o.board, analysis.circumradius, COLOUR.o, 3, []);
            default: return this.drawNinePoints(analysis);
        }
    }

    private drawTriangle(vertices: readonly {x: number; y: number}[]): JXG.GeometryElement[] {
        const [a, b, c] = vertices;
        const sides: [typeof a, typeof a, string][] = [[a, b, "AB"], [b, c, "BC"], [c, a, "CA"]];
        return sides.map(([p, q, name]) => this.board.create("segment", [[p.x, p.y], [q.x, q.y]], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth: 2, highlight: false, fixed: true, layer: 5, withLabel: false,
            name: `triangle-side-${name}`,
        }) as JXG.GeometryElement);
    }

    /** The marker of H, G, O or N with its letter; nothing when the point is beyond the cap. */
    private marker(id: EulerPlaceId, analysis: Triangle): JXG.GeometryElement[] {
        const place = analysis[id].board;
        if (!place) return [];
        const faces: Record<EulerPlaceId, string> = {h: "square", g: "x", o: "+", n: "cross"};
        return [this.board.create("point", [place.x, place.y], {
            name: EULER_PLACE_SYMBOL[id], withLabel: true, size: 5, face: faces[id], fillColor: COLOUR[id], strokeColor: COLOUR[id],
            highlight: false, fixed: true, showInfobox: false, layer: 6, label: {offset: [8, 8], strokeColor: GraphPalette.label},
        }) as JXG.GeometryElement];
    }

    /** The infinite line through O with the exact direction H - O; the board clips it to the view. Nothing when H = O or O is too far. */
    private drawLine(analysis: Triangle): JXG.GeometryElement[] {
        // Anchored on G, which lies inside the vertex box and so always has a board place, unlike a far O or H.
        const o = analysis.g.board;
        if (!analysis.line || !o) return [];
        const dx = analysis.line.direction.x.toNumber();
        const dy = analysis.line.direction.y.toNumber();
        const length = Math.hypot(dx, dy);
        if (!Number.isFinite(length) || length === 0) return [];
        return [this.board.create("line", [[o.x, o.y], [o.x + dx / length, o.y + dy / length]], {
            strokeColor: COLOUR.line, strokeWidth: 2, dash: 0, highlight: false, fixed: true, layer: 4, withLabel: false, name: "euler-line",
        }) as JXG.GeometryElement];
    }

    private drawCircle(name: string, centre: BoardXY | undefined, radius: number, colour: string, dash: number,
                       extra: JXG.GeometryElement[]): JXG.GeometryElement[] {
        const objects = [...extra];
        if (centre && Number.isFinite(radius) && radius <= BOARD_COORDINATE_CAP) {
            objects.push(this.board.create("circle", [[centre.x, centre.y], radius], {
                strokeColor: colour, strokeWidth: 1.5, dash, fillOpacity: 0, highlight: false, fixed: true, layer: 3, withLabel: false, name,
            }) as JXG.GeometryElement);
        }
        return objects;
    }

    private drawNinePoints(analysis: Triangle): JXG.GeometryElement[] {
        const objects: JXG.GeometryElement[] = [];
        for (const p of analysis.ninePoints) {
            if (!p.board) continue;
            objects.push(this.board.create("point", [p.board.x, p.board.y], {
                name: `${NINE_NAME[p.kind]}${p.index + 1}`, withLabel: false, size: 4, face: NINE_FACE[p.kind],
                fillColor: NINE_COLOUR[p.kind], strokeColor: NINE_COLOUR[p.kind], highlight: false, fixed: true, showInfobox: false, layer: 6,
            }) as JXG.GeometryElement);
        }
        return objects;
    }

    protected override disposeFigureScene(): void {
        super.disposeFigureScene();
        if (this.chip && this.hasBoard && (this.board.objectsList as unknown[]).includes(this.chip)) this.board.removeObject(this.chip);
        this.chip = undefined;
    }

    /** The chip belongs to no overlay: it states the Euler line state and stays whatever the overlay switches say. */
    private ensureChip(): void {
        if (!this.hasBoard) return;
        if (this.chip && (this.board.objectsList as unknown[]).includes(this.chip)) return;
        this.chip = this.board.create("text", [
            () => this.board.getBoundingBox()[0] + 0.02 * (this.board.getBoundingBox()[2] - this.board.getBoundingBox()[0]),
            () => this.board.getBoundingBox()[1] - 0.04 * (this.board.getBoundingBox()[1] - this.board.getBoundingBox()[3]),
            () => this.boardChipText(),
        ], {
            anchorX: "left", anchorY: "top", fontSize: 14, strokeColor: GraphPalette.label, highlight: false, fixed: true,
            layer: 8, display: "html", name: "euler-chip", cssStyle: "pointer-events:none;",
        }) as JXG.GeometryElement;
    }

    protected override onStateChange(previous: Readonly<PointSetGraphState>): void {
        super.onStateChange(previous);
        this.ensureChip();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.ensureChip();
    }

    private boardChipText(): string {
        const analysis = this.analysis();
        if (analysis.kind === "missing") return "";
        const chip = eulerChip(analysis, t);
        if (analysis.kind !== "triangle") return chip;
        const outside = this.outsideView(analysis);
        const far = EULER_PLACE_IDS.filter(id => this.placeShown(id) && (outside.has(id) || analysis[id].board === undefined))
            .map(id => `${EULER_PLACE_SYMBOL[id]}: ${t("notable_outside_view")}`);
        return [chip, ...far].join("; ");
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override workspaceEdit(): React.ReactNode {
        const analysis = this.analysis();
        const outside = this.outsideView(analysis);
        // What the inspector shows is what a later view change is compared with.
        this.outsideKey = [...outside].join(",");
        return <>
            <EulerLinePanel analysis={analysis} exampleId={this.exampleId} outsideView={outside}
                            onExample={id => this.loadExample(id)}/>
            {super.workspaceEdit()}
        </>;
    }
}
