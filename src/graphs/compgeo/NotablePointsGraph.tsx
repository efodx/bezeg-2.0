import React from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {PointSetExtension} from "./pointSetPersistence";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {GraphPalette} from "../styles/GraphPalette";
import {pointLabelMath} from "../styles/pointLabelMath";
import {PresetCollection} from "../base/presets/PresetCollection";
import {
    activeExampleId, analyseNotablePoints, BOARD_COORDINATE_CAP, BoardXY, CENTRE_IDS, CentreId, inBox, NotableAnalysis,
    isNotableExampleId, NotableExampleId, notableExample,
} from "../../compgeo/notablePointsModel";
import {NOTABLE_POINT_COUNT, NOTABLE_POINTS_OVERLAY_IDS, notablePointsCollection} from "./notablePointsPresetCollection";
import {NotablePointsPanel} from "./NotablePointsPanel";
import {CENTRE_SYMBOL, notableTexts} from "./notablePointsText";

/**
 * Notable points of a triangle (spec triangle-geometry-lessons T1, task triangle-geometry/04): a `PointSetGraph` limited
 * to three points in points mode at grid step 1. Overlays: `triangle` (sides and the board chip) and one per centre
 * (`centroid`, `circumcentre`, `incentre`, `orthocentre`), each with its construction lines and circle. The numbers come
 * from `analyseNotablePoints` (the exact triangle kernel); this file only draws and words them.
 *
 * Far centres: a centre whose board coordinates exceed `BOARD_COORDINATE_CAP` is never sent to the board; a centre that
 * is merely outside the current view is reported "outside the view" in the inspector and the board chip, and the host Fit
 * frames the vertices and the shown centres. The view is never rescaled silently.
 *
 * The example id is part of the scene state (`state.exampleId`, saved in a Preset's graphState); it names the example only
 * while the vertices still equal it, so editing a vertex makes the triangle custom with no extra bookkeeping.
 * No route, catalog entry or Demonstration registration yet (task 05).
 */
export type NotableOverlayId = "triangle" | CentreId;

export interface NotablePointsState extends PointSetGraphState {
    exampleId: NotableExampleId | undefined;
}

function hasExampleField(state: PointSetGraphState): state is NotablePointsState {
    return "exampleId" in state;
}

export const DEFAULT_NOTABLE_MODEL: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0, points: notableExample("default").points.map(p => ({...p})),
};

const CENTRE_COLOUR: Readonly<Record<CentreId, string>> = {
    centroid: GraphPalette.additionalCurves[0], circumcentre: GraphPalette.comparisonCurve,
    incentre: GraphPalette.primaryCurve, orthocentre: GraphPalette.additionalCurves[1],
};
const CENTRE_DASH: Readonly<Record<CentreId, number>> = {centroid: 2, circumcentre: 3, incentre: 0, orthocentre: 4};
const CENTRE_FACE: Readonly<Record<CentreId, string>> = {centroid: "x", circumcentre: "+", incentre: "diamond", orthocentre: "square"};

/** The drawn label of a named point is typeset; the element keeps its plain name. */
function mathLabelled<T extends JXG.GeometryElement>(point: T, name: string): T {
    (point as unknown as JXG.Point).label?.setText(pointLabelMath(name));
    return point;
}

/**
 * The declared scene fields (`pointSetPersistence`): the example id, checked as the Preset collection checks it, fallback `"default"`
 * (the graph's initial value); it names the example only while the vertices still equal it (read-time `active...ExampleId`), so
 * `settle` has nothing to reconcile. Bare data imports keep it.
 */
const NOTABLE_EXTENSION: PointSetExtension = Object.freeze({
    fields: [{name: "exampleId", fallback: "default", parse: (value: unknown) => isNotableExampleId(value) ? value : undefined}],
});

export class NotablePointsGraph extends PointSetGraph<NotableOverlayId> {
    private unsubscribeLanguage?: () => void;
    private outsideKey = "";
    private chip?: JXG.GeometryElement;

    constructor() {
        super({pointLimit: NOTABLE_POINT_COUNT});
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    get exampleId(): NotableExampleId | undefined {
        const state = this.state;
        return activeExampleId(hasExampleField(state) ? state.exampleId : undefined, state.model.points, state.model.gridStepExponent);
    }

    analysis(): NotableAnalysis {
        return analyseNotablePoints(this.model.points, this.model.gridStepExponent);
    }

    /** Centres not visible in the current board view (or too far to draw). Empty before a board exists. */
    outsideView(analysis: NotableAnalysis = this.analysis()): ReadonlySet<CentreId> {
        const outside = new Set<CentreId>();
        if (analysis.kind !== "triangle" || !this.hasBoard) return outside;
        const box = this.board.getBoundingBox();
        const places: Partial<Record<CentreId, BoardXY | undefined>> = {
            centroid: analysis.centroid.board, circumcentre: analysis.circumcentre?.board, orthocentre: analysis.orthocentre?.board,
            incentre: analysis.incentre,
        };
        for (const id of CENTRE_IDS) {
            const place = places[id];
            if (place && !inBox(box, place)) outside.add(id);
        }
        return outside;
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    /**
     * Loads a named example in two synchronous writes, the vertices (`loadModel`) and then the id (`setState`). Between them
     * the old id may name the new vertices for one write; `activeExampleId` checks the id against the vertices, so it does no harm.
     */
    loadExample(id: NotableExampleId): void {
        const example = notableExample(id);
        this.loadModel({...DEFAULT_NOTABLE_MODEL, points: example.points.map(p => ({...p}))});
        const patch: Partial<NotablePointsState> = {exampleId: id};
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
        // A pan or zoom may not announce itself on every input path; the end of a gesture is checked as well.
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

    override getInitialState(): NotablePointsState {
        return {
            ...super.getInitialState(), exampleId: "default",
            overlays: {triangle: true, centroid: true, circumcentre: false, incentre: false, orthocentre: false},
        };
    }

    /** The declared example id: import, figure return and lesson default read them. */
    protected override persistenceExtension(): PointSetExtension {
        return NOTABLE_EXTENSION;
    }

    override defaultPreset(): PointSetModel {
        return {...DEFAULT_NOTABLE_MODEL, points: DEFAULT_NOTABLE_MODEL.points.map(p => ({...p}))};
    }

    /**
     * The default triangle (0,0), (7,0), (2,5) and its whole circumcircle (centre (7/2,3/2), R about 3.81) with a margin; the app
     * default box would put the vertex C on the frame.
     */
    protected override initialView(): [number, number, number, number] {
        return [-1, 6, 8, -3];
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return notablePointsCollection;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        // One list with the Preset collection, so its overlay check cannot drift from the switches.
        return NOTABLE_POINTS_OVERLAY_IDS;
    }

    protected override overlayLabel(id: "grid" | NotableOverlayId): string {
        switch (id) {
            case "triangle": return t("notable_overlay_triangle");
            case "centroid": return t("notable_overlay_centroid");
            case "circumcentre": return t("notable_overlay_circumcentre");
            case "incentre": return t("notable_overlay_incentre");
            case "orthocentre": return t("notable_overlay_orthocentre");
            default: return super.overlayLabel(id);
        }
    }

    protected override drawOverlay(id: "grid" | NotableOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const analysis = analyseNotablePoints(model.points, model.gridStepExponent);
        if (analysis.kind !== "triangle") return [];
        return id === "triangle" ? this.drawTriangle(analysis) : this.drawCentre(id, analysis);
    }

    private drawTriangle(analysis: Extract<NotableAnalysis, {kind: "triangle"}>): JXG.GeometryElement[] {
        const [a, b, c] = analysis.vertices;
        const objects: JXG.GeometryElement[] = [];
        const sides: [typeof a, typeof a, string][] = [[a, b, "AB"], [b, c, "BC"], [c, a, "CA"]];
        sides.forEach(([p, q, name]) => {
            objects.push(this.board.create("segment", [[p.x, p.y], [q.x, q.y]], {
                strokeColor: GraphPalette.primaryCurve, strokeWidth: 2, highlight: false, fixed: true, layer: 5, withLabel: false,
                name: `triangle-side-${name}`,
            }) as JXG.GeometryElement);
        });
        return objects;
    }

    protected override disposeFigureScene(): void {
        super.disposeFigureScene();
        if (this.chip && this.hasBoard && (this.board.objectsList as unknown[]).includes(this.chip)) this.board.removeObject(this.chip);
        this.chip = undefined;
    }

    /** The chip belongs to no overlay: it states the triangle type and stays whatever the overlay switches say. */
    private ensureChip(): void {
        if (!this.hasBoard) return;
        if (this.chip && (this.board.objectsList as unknown[]).includes(this.chip)) return;
        // The chip on the board: type of triangle and which shown centres are outside the view; recomputed on every update.
        this.chip = this.board.create("text", [
            () => this.board.getBoundingBox()[0] + 0.02 * (this.board.getBoundingBox()[2] - this.board.getBoundingBox()[0]),
            () => this.board.getBoundingBox()[1] - 0.04 * (this.board.getBoundingBox()[1] - this.board.getBoundingBox()[3]),
            () => this.boardChipText(),
        ], {
            anchorX: "left", anchorY: "top", fontSize: 14, strokeColor: GraphPalette.label, highlight: false, fixed: true,
            layer: 8, display: "html", name: "notable-chip", cssStyle: "pointer-events:none;",
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
        if (analysis.kind !== "triangle") return "";
        const language = currentLanguage();
        const outside = this.outsideView(analysis);
        const texts = notableTexts(analysis, t, language, outside);
        const far = [...CENTRE_IDS].filter(id => this.overlayShown(id) && texts.rows.find(row => row.id === id)?.outsideView)
            .map(id => `${CENTRE_SYMBOL[id]}: ${t("notable_outside_view")}`);
        return [texts.chip, ...far].join("; ");
    }

    private drawCentre(id: CentreId, analysis: Extract<NotableAnalysis, {kind: "triangle"}>): JXG.GeometryElement[] {
        const [a, b, c] = analysis.vertices;
        const vertices = [a, b, c];
        const objects: JXG.GeometryElement[] = [];
        const colour = CENTRE_COLOUR[id];
        const line = (kind: "segment" | "line", name: string, from: BoardXY, to: BoardXY) => {
            objects.push(this.board.create(kind, [[from.x, from.y], [to.x, to.y]], {
                strokeColor: colour, strokeWidth: 1.5, dash: CENTRE_DASH[id], highlight: false, fixed: true, layer: 3, withLabel: false, name,
            }) as JXG.GeometryElement);
        };
        const circle = (name: string, centre: BoardXY, radius: number) => {
            if (!Number.isFinite(radius) || radius > BOARD_COORDINATE_CAP) return;
            objects.push(this.board.create("circle", [[centre.x, centre.y], radius], {
                strokeColor: colour, strokeWidth: 1.5, dash: CENTRE_DASH[id], fillOpacity: 0, highlight: false, fixed: true, layer: 3,
                withLabel: false, name,
            }) as JXG.GeometryElement);
        };
        const point = (place: BoardXY | undefined) => {
            if (!place) return;
            objects.push(mathLabelled(this.board.create("point", [place.x, place.y], {
                name: CENTRE_SYMBOL[id], withLabel: true, size: 5, face: CENTRE_FACE[id], fillColor: colour, strokeColor: colour,
                highlight: false, fixed: true, showInfobox: false, layer: 6, label: {...(this.styles.point.namedLabel as object), offset: [8, 8], strokeColor: GraphPalette.label},
            }) as JXG.GeometryElement, CENTRE_SYMBOL[id]));
        };
        if (id === "centroid") {
            if (analysis.classification.kind !== "degenerate") {
                vertices.forEach((v, i) => line("segment", `centroid-median-${i + 1}`, v, analysis.midpoints[i]));
            }
            point(analysis.centroid.board);
        } else if (analysis.classification.kind === "degenerate") {
            return objects;
        } else if (id === "circumcentre") {
            const o = analysis.circumcentre?.board;
            const sides: [typeof a, typeof a][] = [[b, c], [c, a], [a, b]];
            sides.forEach(([p, q], i) => {
                const m = analysis.midpoints[i];
                line("line", `circumcentre-bisector-${i + 1}`, m, {x: m.x - (q.y - p.y), y: m.y + (q.x - p.x)});
            });
            if (o && analysis.circumradius !== undefined) circle("circumcentre-circle", o, analysis.circumradius);
            point(o);
        } else if (id === "incentre") {
            const i = analysis.incentre;
            if (i) {
                vertices.forEach((v, k) => line("segment", `incentre-bisector-${k + 1}`, v, i));
                if (analysis.inradius !== undefined) circle("incentre-circle", i, analysis.inradius);
                point(i);
            }
        } else {
            const feet = analysis.feet;
            if (feet) vertices.forEach((v, k) => line("line", `orthocentre-altitude-${k + 1}`, v, feet[k]));
            point(analysis.orthocentre?.board);
        }
        return objects;
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
            <NotablePointsPanel analysis={analysis} exampleId={this.exampleId} outsideView={outside}
                                onExample={id => this.loadExample(id)}/>
            {super.workspaceEdit()}
        </>;
    }
}
