import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import React from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {finiteNumberField, PointSetExtension} from "./pointSetPersistence";
import {GraphSession} from "../base/GraphSession";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import type {LessonAction} from "../../learning/model";
import {onLanguageChange, t} from "../../localization";
import {GridPoint, isGridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {GraphPalette} from "../styles/GraphPalette";
import {PresetCollection} from "../base/presets/PresetCollection";
import {inBox} from "../../compgeo/notablePointsModel";
import {normaliseDegrees} from "../../compgeo/inscribedAngleModel";
import {
    activeSimsonExampleId, analyseSimson, DEFAULT_SIMSON_SETTINGS, FOOT_NAMES, isSimsonExampleId, isSimsonMode, isSimsonOffset, resolveOffset, SimsonAnalysis,
    SimsonExampleId, simsonExample, SimsonMode, SimsonSettings, simsonTFromBoard,
} from "../../compgeo/simsonLineModel";
import {SIMSON_LINE_OVERLAY_IDS, SIMSON_POINT_COUNT, simsonLineCollection} from "./simsonLinePresetCollection";
import {SimsonLinePanel} from "./SimsonLinePanel";
import {SIMSON_PLACE_IDS, SimsonPlaceId, simsonChip} from "./simsonLineText";

/**
 * Simson line (spec triangle-geometry-lessons T4, task triangle-geometry/07 F2a): a `PointSetGraph` limited to three points in
 * points mode at grid step 1. A, B, C (grid points) define the circumcircle. Two modes (`state.mode`): `glider`, where P lies
 * on the circle at the angle `state.t` (degrees) and the offset `state.epsilon` from it, and `exact`, where P' is the grid point
 * `state.pPrime`. Overlays (independent switches): `triangle`, `sidelines` (full lines, since a foot may lie on an extension),
 * `circumcircle` (with O), `perpendiculars` (P to each foot), `simson` (the line through the distinct feet, only when
 * collinear by the rule of the mode) and `pedal` (the foot triangle, only when not collinear). The numbers come from
 * `analyseSimson` (the Simson kernel); this file only draws and words them. ADR 0030 section 2: the glider is the only
 * inexact input.
 *
 * Ownership. P (P' in exact mode), the feet D, E, F and the chip are scene objects of this graph, not overlays: P must survive
 * overlay rebuilds during its own drag. The feet are function-valued from the memoised analysis; `ensureScene` rebuilds the
 * objects when the triangle appears, disappears or the board dropped them, and puts P back on its place after every state
 * change (the circle at the angle `t`, or the snapped grid point). The base owns the vertices and the overlays. Degenerate or
 * missing vertices: no P, no feet, a text message.
 *
 * Far objects follow the notable-points rule: a point beyond `BOARD_COORDINATE_CAP` is never sent to the board; a point
 * merely outside the view is reported "outside the view" in the inspector; the view is never rescaled silently.
 *
 * The example id is part of the scene state and names the example only while the vertices, the mode and (exact mode) P'
 * still equal it.
 */
export type SimsonOverlayId = Exclude<typeof SIMSON_LINE_OVERLAY_IDS[number], "grid">;

export interface SimsonLineState extends PointSetGraphState {
    exampleId: SimsonExampleId | undefined;
    mode: SimsonMode;
    /** Glider angle in degrees as stored; the effective value is normalised to [0, 360). */
    t: number;
    /** Glider offset from the circle, a member of `SIMSON_OFFSETS`. */
    epsilon: number;
    /** The exact grid point of exact mode. */
    pPrime: GridPoint;
}

function hasSimsonFields(state: PointSetGraphState): state is SimsonLineState {
    return "mode" in state || "t" in state || "epsilon" in state || "pPrime" in state || "exampleId" in state;
}

export const DEFAULT_SIMSON_MODEL: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0, points: simsonExample("default").points.map(p => ({...p})),
};

type Triangle = Extract<SimsonAnalysis, {kind: "triangle"}>;

const COLOUR = {
    triangle: GraphPalette.primaryCurve, circle: GraphPalette.comparisonCurve, side: GraphPalette.label,
    perpendicular: GraphPalette.additionalCurves[0], simson: GraphPalette.additionalCurves[1], pedal: GraphPalette.additionalCurves[1],
};
const SIDE_NAMES = ["BC", "CA", "AB"] as const;

/**
 * The persisted scene beyond the model and the overlays (task 08 batch 6b), each field read as the collection's `checkGraphState`
 * checks it and falling back to `getInitialState()` (the default example). `t` is stored as given (any finite number; `settings`
 * normalises it at read time) and `mode`, `epsilon` and `pPrime` are never coupled to the vertices: no `settle`. Bare data
 * imports keep every field, as the legacy path wrote the model only.
 */
const SIMSON_DEFAULT = simsonExample("default");
const SIMSON_EXTENSION: PointSetExtension = Object.freeze({
    fields: [
        {name: "exampleId", fallback: "default", parse: (value: unknown) => isSimsonExampleId(value) ? value : undefined},
        {name: "mode", fallback: SIMSON_DEFAULT.mode, parse: (value: unknown) => isSimsonMode(value) ? value : undefined},
        finiteNumberField("t", SIMSON_DEFAULT.t),
        {name: "epsilon", fallback: SIMSON_DEFAULT.epsilon, parse: (value: unknown) => isSimsonOffset(value) ? value : undefined},
        {
            name: "pPrime", fallback: Object.freeze({x: SIMSON_DEFAULT.pPrime.x, y: SIMSON_DEFAULT.pPrime.y}),
            parse: (value: unknown) => isGridPoint(value) ? {x: value.x, y: value.y} : undefined,
        },
    ],
});

export class SimsonLineGraph extends PointSetGraph<SimsonOverlayId> {
    private unsubscribeLanguage?: () => void;
    private outsideKey = "";
    private chip?: JXG.GeometryElement;
    private sceneObjects: JXG.GeometryElement[] = [];
    private pointObject?: JXG.Point;
    private footObjects: JXG.Point[] = [];
    private sceneKind: "triangle" | "none" | undefined;
    private inSnap = false;
    private memo?: {points: unknown; settings: SimsonSettings; value: SimsonAnalysis};

    constructor() {
        super({pointLimit: SIMSON_POINT_COUNT});
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The stored settings with every field validated: an unknown mode, offset or point reads as the default. */
    get settings(): SimsonSettings {
        const state = this.state;
        if (!hasSimsonFields(state)) return DEFAULT_SIMSON_SETTINGS;
        return {
            mode: isSimsonMode(state.mode) ? state.mode : DEFAULT_SIMSON_SETTINGS.mode,
            t: typeof state.t === "number" && Number.isFinite(state.t) ? normaliseDegrees(state.t) : DEFAULT_SIMSON_SETTINGS.t,
            epsilon: resolveOffset(state.epsilon),
            pPrime: isGridPoint(state.pPrime) ? state.pPrime : DEFAULT_SIMSON_SETTINGS.pPrime,
        };
    }

    get exampleId(): SimsonExampleId | undefined {
        const state = this.state;
        return activeSimsonExampleId(hasSimsonFields(state) ? state.exampleId : undefined, state.model.points, this.settings);
    }

    /** The analysis of the current vertices and settings; the same object until one of them changes. */
    analysis(): SimsonAnalysis {
        const points = this.model.points;
        const settings = this.settings;
        const last = this.memo;
        const same = last !== undefined && last.points === points && last.settings.mode === settings.mode && last.settings.t === settings.t
            && last.settings.epsilon === settings.epsilon && last.settings.pPrime.x === settings.pPrime.x && last.settings.pPrime.y === settings.pPrime.y;
        if (!same) this.memo = {points, settings, value: analyseSimson(points, settings)};
        return this.memo!.value;
    }

    private triangleView(): Triangle | undefined {
        const analysis = this.analysis();
        return analysis.kind === "triangle" ? analysis : undefined;
    }

    /** Places not visible in the current board view (or too far to draw). Empty before a board exists. */
    outsideView(analysis: SimsonAnalysis = this.analysis()): ReadonlySet<SimsonPlaceId> {
        const outside = new Set<SimsonPlaceId>();
        if (analysis.kind !== "triangle" || !this.hasBoard) return outside;
        const box = this.board.getBoundingBox();
        const boards = [analysis.p.board, ...analysis.feet.map(f => f.board)];
        SIMSON_PLACE_IDS.forEach((id, i) => {
            const place = boards[i];
            if (place && !inBox(box, place)) outside.add(id);
        });
        return outside;
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    protected patch(update: Partial<SimsonLineState>): void {
        this.setState(update);
    }

    setMode(mode: SimsonMode): void {
        if (!isSimsonMode(mode) || this.settings.mode === mode) return;
        this.patch({mode});
    }

    /** Sets the glider angle in degrees, normalised to [0, 360). A non-finite value is ignored. */
    setT(value: number): void {
        if (!Number.isFinite(value)) return;
        this.patch({t: normaliseDegrees(value)});
    }

    /** Sets the glider offset; a value outside `SIMSON_OFFSETS` is refused (false). */
    setEpsilon(value: number): boolean {
        if (!isSimsonOffset(value)) return false;
        this.patch({epsilon: value});
        return true;
    }

    /** Sets P' to a grid point; a point outside the grid range is refused (false). */
    setPPrime(point: GridPoint): boolean {
        if (!isGridPoint(point)) return false;
        this.patch({pPrime: {x: point.x, y: point.y}});
        return true;
    }

    /** Loads a named example in two synchronous writes, the vertices (`loadModel`) and then the id with its mode and point fields. */
    loadExample(id: SimsonExampleId): void {
        const example = simsonExample(id);
        this.loadModel({...DEFAULT_SIMSON_MODEL, points: example.points.map(p => ({...p}))});
        this.patch({exampleId: id, mode: example.mode, t: example.t, epsilon: example.epsilon, pPrime: {...example.pPrime}});
    }

    /**
     * Lesson scenes set the glider with the `parameter` action named `t` (degrees) and use the `simson` kind for the example and the offset;
     * the vertices and overlays go through `point-set`. Values are checked strictly: a lesson-content error throws and changes nothing.
     */
    applySimsonAction(action: Extract<LessonAction, {kind: "simson"}>): void {
        const payload = action as unknown as Record<string, unknown>;
        if (action.operation === "load-example") {
            if (!isSimsonExampleId(payload.exampleId)) throw new Error("simson load-example: exampleId must be one of the Simson line examples.");
            this.loadExample(action.exampleId);
            return;
        }
        if (action.operation === "set-offset") {
            if (!this.setEpsilon(action.epsilon)) throw new Error("simson set-offset: epsilon must be one of the offsets of the slider.");
            return;
        }
        throw new Error(`simson: the Simson line graph has no operation ${String(payload.operation)}.`);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated("parameter", "t", action => {
            if (!Number.isFinite(action.value)) throw new Error("The glider parameter t must be a finite number of degrees.");
            this.setT(action.value);
        });
        registry.on("simson", action => this.applySimsonAction(action));
    }

    // ---- Lifecycle -----------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        this.chip = undefined;
        this.resetScene();
        this.ensureChip();
        this.ensureScene();
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
        this.resetScene();
        this.chip = undefined;
        super.unmount();
    }

    /** Forgets the scene objects (the board removes them itself on dispose or replacement). */
    private resetScene(): void {
        this.sceneObjects = [];
        this.pointObject = undefined;
        this.footObjects = [];
        this.sceneKind = undefined;
    }

    protected override disposeFigureScene(): void {
        super.disposeFigureScene();
        if (this.hasBoard) {
            this.removeSceneObjects();
            if (this.chip && (this.board.objectsList as unknown[]).includes(this.chip)) this.board.removeObject(this.chip);
        }
        this.chip = undefined;
        this.resetScene();
    }

    override getInitialState(): SimsonLineState {
        const example = simsonExample("default");
        return {
            ...super.getInitialState(), exampleId: "default", mode: example.mode, t: example.t, epsilon: example.epsilon, pPrime: {...example.pPrime},
            overlays: {triangle: true, sidelines: true, circumcircle: true, perpendiculars: true, simson: true, pedal: true},
        };
    }

    /** The declared example, mode, glider and exact point: import, figure return and lesson default read them. */
    protected override persistenceExtension(): PointSetExtension {
        return SIMSON_EXTENSION;
    }

    override defaultPreset(): PointSetModel {
        return {...DEFAULT_SIMSON_MODEL, points: DEFAULT_SIMSON_MODEL.points.map(p => ({...p}))};
    }

    /** The default triangle (0,0), (7,0), (2,5) with its circumcircle (centre (7/2,3/2), R about 3.81) and a margin. */
    protected override initialView(): [number, number, number, number] {
        return [-3, 7, 10, -4];
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return simsonLineCollection;
    }

    // ---- Scene objects -------------------------------------------------------------------------------------------

    protected override onStateChange(previous: Readonly<PointSetGraphState>): void {
        // First, so the objects of a vanished triangle are gone before the base updates the board.
        this.ensureScene();
        super.onStateChange(previous);
        this.ensureChip();
        this.ensureScene();
    }

    protected override syncReplacedScene(): void {
        // A replaced scene drops the references, so remove this graph's board objects first (a Preset load would duplicate them).
        if (this.hasBoard) this.removeSceneObjects();
        this.resetScene();
        super.syncReplacedScene();
        this.ensureChip();
        this.ensureScene();
    }

    /** A finite board number; a stale function evaluated while the triangle is going away reads 0, never NaN. */
    private read(pick: (view: Triangle) => number | undefined): number {
        const view = this.triangleView();
        const value = view ? pick(view) : 0;
        return value !== undefined && Number.isFinite(value) ? value : 0;
    }

    /** Removes the scene objects still on the board, newest first. */
    private removeSceneObjects(): void {
        const list = this.board.objectsList as unknown[];
        const present = this.sceneObjects.filter(object => list.includes(object)).reverse();
        if (present.length) this.board.removeObject(present);
    }

    private ensureScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        const view = this.triangleView();
        const kind = view ? "triangle" : "none";
        const list = this.board.objectsList as unknown[];
        if (kind !== this.sceneKind || !this.sceneObjects.every(object => list.includes(object))) {
            this.removeSceneObjects();
            this.resetScene();
            this.sceneKind = kind;
            if (view) this.createScene(view);
        }
        if (!view || !this.pointObject) return;
        const point = this.pointObject;
        const name = view.mode === "exact" ? "P′" : "P";
        if (point.name !== name) point.setAttribute({name});
        const place = view.p.board;
        point.setAttribute({visible: place !== undefined});
        if (place && (point.X() !== place.x || point.Y() !== place.y)) {
            this.inSnap = true;
            try { point.moveTo([place.x, place.y], 0); } finally { this.inSnap = false; }
        }
        this.footObjects.forEach((foot, i) => foot.setAttribute({visible: view.feet[i].board !== undefined}));
    }

    private createScene(view: Triangle): void {
        const board = this.board;
        // JSXGraph may add hidden helper points; the graph owns whatever a build added.
        const before = new Set<unknown>(board.objectsList as unknown[]);
        this.footObjects = FOOT_NAMES.map((name, i) => board.create("point", [
            () => this.read(v => v.feet[i].board?.x), () => this.read(v => v.feet[i].board?.y),
        ], {
            name, withLabel: true, size: 4, face: "square", fillColor: COLOUR.perpendicular, strokeColor: COLOUR.perpendicular,
            highlight: false, fixed: true, showInfobox: false, layer: 7, label: {offset: [8, 8], strokeColor: GraphPalette.label},
        }) as JXG.Point);
        const start = view.p.board ?? {x: 0, y: 0};
        const point = board.create("point", [start.x, start.y], {
            name: view.mode === "exact" ? "P′" : "P", withLabel: true, size: 6, face: "o", fillColor: GraphPalette.additionalCurves[0],
            strokeColor: GraphPalette.pointOutline, strokeWidth: 2, highlightFillColor: GraphPalette.selectedControlPoint,
            showInfobox: false, layer: 8, label: {offset: [8, 8], strokeColor: GraphPalette.label},
        }) as JXG.Point;
        bindMovablePointCursor(point, this.board);
        point.on("drag", () => this.dragMoving(point));
        this.pointObject = point;
        this.sceneObjects = (board.objectsList as JXG.GeometryElement[]).filter(object => !before.has(object));
    }

    /** Dragging P: the angle comes from atan2 about O (glider mode) or the position is snapped to the grid (exact mode); P is put back on its place. */
    private dragMoving(point: JXG.Point): void {
        if (this.inSnap || this.graphInteractionLocked) return;
        if (this.settings.mode === "glider") {
            const next = simsonTFromBoard(this.model.points, point.X(), point.Y());
            if (next === undefined) return;
            this.patch({t: next});
        } else {
            const snapped = {x: Math.round(point.X()), y: Math.round(point.Y())};
            if (!isGridPoint(snapped)) return;
            this.patch({pPrime: snapped});
        }
        this.ensureScene();
    }

    // ---- Chip ----------------------------------------------------------------------------------------------------

    private ensureChip(): void {
        if (!this.hasBoard) return;
        if (this.chip && (this.board.objectsList as unknown[]).includes(this.chip)) return;
        this.chip = this.board.create("text", [
            () => this.board.getBoundingBox()[0] + 0.02 * (this.board.getBoundingBox()[2] - this.board.getBoundingBox()[0]),
            () => this.board.getBoundingBox()[1] - 0.04 * (this.board.getBoundingBox()[1] - this.board.getBoundingBox()[3]),
            () => simsonChip(this.analysis(), t),
        ], {
            anchorX: "left", anchorY: "top", fontSize: 14, strokeColor: GraphPalette.label, highlight: false, fixed: true,
            layer: 8, display: "html", name: "simson-chip", cssStyle: "pointer-events:none;",
        }) as JXG.GeometryElement;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        // One list with the Preset collection, so its overlay check cannot drift from the switches.
        return SIMSON_LINE_OVERLAY_IDS;
    }

    protected override overlayLabel(id: "grid" | SimsonOverlayId): string {
        switch (id) {
            case "triangle": return t("notable_overlay_triangle");
            case "sidelines": return t("simson_overlay_sidelines");
            case "circumcircle": return t("simson_overlay_circumcircle");
            case "perpendiculars": return t("simson_overlay_perpendiculars");
            case "simson": return t("simson_overlay_simson");
            case "pedal": return t("simson_overlay_pedal");
            default: return super.overlayLabel(id);
        }
    }

    /** P moves without a model change, so the overlays that depend on it redraw when the analysis object changes. */
    protected override overlayInputs(): unknown {
        return this.analysis();
    }

    protected override drawOverlay(id: "grid" | SimsonOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const analysis = this.analysis();
        if (analysis.kind === "missing") return [];
        if (id === "triangle") return this.drawTriangle(analysis.vertices);
        if (analysis.kind !== "triangle") return [];
        switch (id) {
            case "sidelines": return this.drawSideLines(analysis);
            case "circumcircle": return this.drawCircumcircle(analysis);
            case "perpendiculars": return this.drawPerpendiculars(analysis);
            case "simson": return this.drawSimson(analysis);
            default: return this.drawPedal(analysis);
        }
    }

    private drawTriangle(vertices: readonly {x: number; y: number}[]): JXG.GeometryElement[] {
        const [a, b, c] = vertices;
        const sides: [typeof a, typeof a, string][] = [[a, b, "AB"], [b, c, "BC"], [c, a, "CA"]];
        return sides.map(([p, q, name]) => this.board.create("segment", [[p.x, p.y], [q.x, q.y]], {
            strokeColor: COLOUR.triangle, strokeWidth: 2, highlight: false, fixed: true, layer: 5, withLabel: false,
            name: `triangle-side-${name}`,
        }) as JXG.GeometryElement);
    }

    /** The full lines through the sides (the board clips them to the view): a foot may lie on an extension. */
    private drawSideLines(view: Triangle): JXG.GeometryElement[] {
        const [a, b, c] = view.vertices;
        const sides = [[b, c], [c, a], [a, b]] as const;
        return sides.map(([p, q], i) => this.board.create("line", [[p.x, p.y], [q.x, q.y]], {
            strokeColor: COLOUR.side, strokeWidth: 1, dash: 2, highlight: false, fixed: true, layer: 2, withLabel: false,
            name: `sideline-${SIDE_NAMES[i]}`,
        }) as JXG.GeometryElement);
    }

    private drawCircumcircle(view: Triangle): JXG.GeometryElement[] {
        const centre = view.centreBoard;
        if (!centre || !Number.isFinite(view.radius)) return [];
        return [
            this.board.create("circle", [[centre.x, centre.y], view.radius], {
                strokeColor: COLOUR.circle, strokeWidth: 2, fillOpacity: 0, highlight: false, fixed: true, layer: 3, withLabel: false,
                name: "circumcircle",
            }) as JXG.GeometryElement,
            this.board.create("point", [centre.x, centre.y], {
                name: "O", withLabel: true, size: 4, face: "cross", fillColor: COLOUR.circle, strokeColor: COLOUR.circle,
                highlight: false, fixed: true, showInfobox: false, layer: 6, label: {offset: [8, 8], strokeColor: GraphPalette.label},
            }) as JXG.GeometryElement,
        ];
    }

    private drawPerpendiculars(view: Triangle): JXG.GeometryElement[] {
        const from = view.p.board;
        if (!from) return [];
        return view.feet.flatMap((foot, i) => foot.board
            ? [this.board.create("segment", [[from.x, from.y], [foot.board.x, foot.board.y]], {
                strokeColor: COLOUR.perpendicular, strokeWidth: 1.5, dash: 2, highlight: false, fixed: true, layer: 4, withLabel: false,
                name: `perpendicular-${FOOT_NAMES[i]}`,
            }) as JXG.GeometryElement]
            : []);
    }

    /** The line through the two farthest distinct feet; drawn only when collinear by the rule of the mode. */
    private drawSimson(view: Triangle): JXG.GeometryElement[] {
        if (!view.collinear || !view.line) return [];
        const {from, to} = view.line;
        return [this.board.create("line", [[from.x, from.y], [to.x, to.y]], {
            strokeColor: COLOUR.simson, strokeWidth: 2.5, highlight: false, fixed: true, layer: 4, withLabel: false, name: "simson-line",
        }) as JXG.GeometryElement];
    }

    /** The foot triangle, lightly filled; drawn only when the feet are not collinear. */
    private drawPedal(view: Triangle): JXG.GeometryElement[] {
        if (view.collinear) return [];
        const corners = view.feet.map(f => f.board);
        if (!corners.every(corner => corner !== undefined)) return [];
        return [this.board.create("polygon", corners.map(corner => [corner.x, corner.y]), {
            fillColor: COLOUR.pedal, fillOpacity: 0.18, highlight: false, fixed: true, layer: 1, withLabel: false, name: "pedal-triangle",
            borders: {strokeColor: COLOUR.pedal, strokeWidth: 2, highlight: false, fixed: true, name: "pedal-side"},
            vertices: {visible: false, fixed: true, highlight: false, withLabel: false},
        }) as JXG.GeometryElement];
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
            <SimsonLinePanel analysis={analysis} settings={this.settings} exampleId={this.exampleId} outsideView={outside}
                             onExample={id => this.loadExample(id)} onMode={mode => this.setMode(mode)} onT={value => this.setT(value)}
                             onEpsilon={value => { this.setEpsilon(value); }}
                             onPPrime={point => { this.setPPrime(point); }}/>
            {super.workspaceEdit()}
        </>;
    }
}
