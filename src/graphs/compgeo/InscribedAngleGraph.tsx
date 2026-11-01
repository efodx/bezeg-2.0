import React from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {GraphPalette} from "../styles/GraphPalette";
import {PresetCollection} from "../base/presets/PresetCollection";
import {
    activeInscribedExampleId, analyseInscribedAngle, BoardXY, gliderTFromBoard, InscribedAnalysis, InscribedCircleAnalysis,
    InscribedExampleId, inscribedExample, normaliseDegrees, resolveGliderT, stepGliderT,
} from "../../compgeo/inscribedAngleModel";
import {INSCRIBED_ANGLE_OVERLAY_IDS, INSCRIBED_ANGLE_VERTEX_COUNT, inscribedAngleCollection} from "./inscribedAnglePresetCollection";
import {InscribedAnglePanel} from "./InscribedAnglePanel";
import {inscribedTexts} from "./inscribedAngleText";

/**
 * Inscribed angle on a circle (spec triangle-geometry-lessons T2, task triangle-geometry/04): a `PointSetGraph` limited to
 * three points in points mode at grid step 1. A, B, C (grid points) define the circle; AB is the chord; the glider P moves
 * on the circle by its parameter `t` in degrees (`state.t`, saved in a Preset's graphState). Overlays: `radii` (OA, OB)
 * and `angles` (the sides CA, CB, PA, PB and the three angle marks). The numbers come from `analyseInscribedAngle`; this
 * file draws and words them. ADR 0030 section 2: the glider is the only inexact input.
 *
 * Ownership. The circle, centre O, chord AB and the glider P are scene objects of this graph (not overlays: P must survive
 * overlay rebuilds during its own drag). Their coordinates are functions of the memoised analysis, so a vertex edit moves
 * them with the board update; `ensureScene` rebuilds them when the circle appears, disappears or the board dropped them,
 * and moves P back onto the circle after every state change. The base owns the vertices and the overlays; the chip is
 * owned here like the chip of the notable-points graph. Degenerate or missing vertices: no circle, no P, a text message.
 *
 * The example id is part of the scene state and names the example only while the vertices still equal it.
 * No route, catalog entry or Demonstration registration yet (task 05).
 */
export type InscribedOverlayId = "radii" | "angles";

export interface InscribedAngleState extends PointSetGraphState {
    exampleId: InscribedExampleId | undefined;
    /** Glider parameter in degrees as stored; the effective value is normalised and outside the exclusion gaps. */
    t: number;
}

function hasInscribedFields(state: PointSetGraphState): state is InscribedAngleState {
    return "exampleId" in state || "t" in state;
}

export const DEFAULT_INSCRIBED_MODEL: PointSetModel = {
    mode: "points", closed: false, gridStepExponent: 0, points: inscribedExample("default").points.map(p => ({...p})),
};

const TAU = 2 * Math.PI;

function normaliseRadians(angle: number): number {
    return normaliseDegrees(angle * 180 / Math.PI) * Math.PI / 180;
}

export class InscribedAngleGraph extends PointSetGraph<InscribedOverlayId> {
    private unsubscribeLanguage?: () => void;
    private chip?: JXG.GeometryElement;
    private sceneObjects: JXG.GeometryElement[] = [];
    private glider?: JXG.Point;
    private sceneKind: "circle" | "none" | undefined;
    private inGliderSnap = false;
    private memo?: {points: unknown; t: unknown; value: InscribedAnalysis};

    constructor() {
        super({pointLimit: INSCRIBED_ANGLE_VERTEX_COUNT});
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    get exampleId(): InscribedExampleId | undefined {
        const state = this.state;
        return activeInscribedExampleId(hasInscribedFields(state) ? state.exampleId : undefined, state.model.points);
    }

    /** The stored parameter in degrees (the default example's when a saved scene has none). */
    private get storedT(): number {
        const state = this.state;
        const stored = hasInscribedFields(state) ? state.t : undefined;
        return typeof stored === "number" && Number.isFinite(stored) ? stored : inscribedExample("default").t;
    }

    /** The glider parameter in effect: normalised to [0, 360) and outside the exclusion gaps. */
    get t(): number {
        return resolveGliderT(this.model.points, this.storedT);
    }

    /** The analysis of the current vertices and glider; the same object until the points or `t` change. */
    analysis(): InscribedAnalysis {
        const points = this.model.points;
        const t = this.storedT;
        if (this.memo?.points !== points || this.memo.t !== t) this.memo = {points, t, value: analyseInscribedAngle(points, t)};
        return this.memo.value;
    }

    private circleView(): InscribedCircleAnalysis | undefined {
        const analysis = this.analysis();
        return analysis.kind === "circle" && analysis.board ? analysis : undefined;
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    protected patch(update: Partial<InscribedAngleState>): void {
        this.setState(update);
    }

    /** Sets the glider parameter, moved out of the exclusion gaps in the direction of motion (none: the nearer edge). */
    setT(value: number, direction?: number): void {
        if (!Number.isFinite(value)) return;
        this.patch({t: resolveGliderT(this.model.points, value, direction)});
    }

    /** An arrow-key step: 1 degree, or 10 with Shift (signed); a step across a gap skips it. */
    stepT(deltaDeg: number): void {
        this.patch({t: stepGliderT(this.model.points, this.t, deltaDeg)});
    }

    /** Loads a named example in two synchronous writes, the vertices (`loadModel`) and then the id and glider parameter. */
    loadExample(id: InscribedExampleId): void {
        const example = inscribedExample(id);
        this.loadModel({...DEFAULT_INSCRIBED_MODEL, points: example.points.map(p => ({...p}))});
        this.patch({exampleId: id, t: resolveGliderT(example.points, example.t)});
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
        this.glider = undefined;
        this.sceneKind = undefined;
    }

    protected override disposeFigureScene(): void {
        super.disposeFigureScene();
        this.resetScene();
    }

    override getInitialState(): InscribedAngleState {
        return {
            ...super.getInitialState(), exampleId: "default", t: inscribedExample("default").t,
            overlays: {radii: false, angles: true},
        };
    }

    override defaultPreset(): PointSetModel {
        return {...DEFAULT_INSCRIBED_MODEL, points: DEFAULT_INSCRIBED_MODEL.points.map(p => ({...p}))};
    }

    /**
     * The default triangle (0,0), (7,0), (2,5) and its whole circumcircle (centre (7/2,3/2), R about 3.81) with a margin; the app
     * default box would put the vertex C on the frame.
     */
    protected override initialView(): [number, number, number, number] {
        return [-1, 6, 8, -3];
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return inscribedAngleCollection;
    }

    // ---- Scene objects -------------------------------------------------------------------------------------------

    protected override onStateChange(previous: Readonly<PointSetGraphState>): void {
        // First, so the objects of a vanished circle are gone before the base updates the board.
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

    /** A finite board number; a stale function evaluated while the circle is going away reads 0, never NaN. */
    private read(pick: (circle: InscribedCircleAnalysis) => number): number {
        const circle = this.circleView();
        const value = circle ? pick(circle) : 0;
        return Number.isFinite(value) ? value : 0;
    }

    /** Removes the scene objects still on the board, newest first. */
    private removeSceneObjects(): void {
        const list = this.board.objectsList as unknown[];
        const present = this.sceneObjects.filter(object => list.includes(object)).reverse();
        if (present.length) this.board.removeObject(present);
    }

    private ensureScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        const circle = this.circleView();
        const kind = circle ? "circle" : "none";
        const list = this.board.objectsList as unknown[];
        if (kind !== this.sceneKind || !this.sceneObjects.every(object => list.includes(object))) {
            this.removeSceneObjects();
            this.resetScene();
            this.sceneKind = kind;
            if (circle) this.createScene(circle);
        }
        if (this.glider && circle?.board) {
            const place = circle.glider?.board ?? circle.board.centre;
            this.glider.setAttribute({visible: circle.glider !== undefined});
            if (this.glider.X() !== place.x || this.glider.Y() !== place.y) {
                this.inGliderSnap = true;
                try { this.glider.moveTo([place.x, place.y], 0); } finally { this.inGliderSnap = false; }
            }
        }
    }

    private createScene(circle: InscribedCircleAnalysis): void {
        const board = this.board;
        // JSXGraph adds hidden helper points for circles and segments built from coordinate functions; the graph owns them too.
        const before = new Set<unknown>(board.objectsList as unknown[]);
        const vertex = (i: 0 | 1 | 2): [() => number, () => number] => [() => this.read(c => c.vertices[i].x), () => this.read(c => c.vertices[i].y)];
        const centre: [() => number, () => number] = [() => this.read(c => c.board?.centre.x ?? 0), () => this.read(c => c.board?.centre.y ?? 0)];
        this.sceneObjects.push(
            board.create("circle", [centre, () => this.read(c => c.board?.radius ?? 0)], {
                strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, fillOpacity: 0, highlight: false, fixed: true, layer: 4,
                withLabel: false, name: "inscribed-circle",
            }) as JXG.GeometryElement,
            board.create("segment", [vertex(0), vertex(1)], {
                strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5, highlight: false, fixed: true, layer: 5, withLabel: false,
                name: "inscribed-chord",
            }) as JXG.GeometryElement,
            board.create("point", centre, {
                name: "O", withLabel: true, size: 4, face: "cross", fillColor: GraphPalette.comparisonCurve, strokeColor: GraphPalette.comparisonCurve,
                highlight: false, fixed: true, showInfobox: false, layer: 6, label: {offset: [8, 8], strokeColor: GraphPalette.label},
            }) as JXG.GeometryElement,
        );
        const start = circle.glider?.board ?? circle.board?.centre ?? {x: 0, y: 0};
        const glider = board.create("point", [start.x, start.y], {
            name: "P", withLabel: true, size: 6, face: "o", fillColor: GraphPalette.additionalCurves[0], strokeColor: GraphPalette.pointOutline,
            strokeWidth: 2, highlightFillColor: GraphPalette.selectedControlPoint, showInfobox: false, layer: 8,
            label: {offset: [8, 8], strokeColor: GraphPalette.label},
        }) as JXG.Point;
        glider.on("drag", () => this.dragGlider(glider));
        this.glider = glider;
        const created = (board.objectsList as JXG.GeometryElement[]).filter(object => !before.has(object));
        this.sceneObjects = created;
    }

    /** Dragging P: the parameter comes from atan2 about O, the exclusion applies, and P is put back on the circle. */
    private dragGlider(point: JXG.Point): void {
        if (this.inGliderSnap || this.graphInteractionLocked) return;
        const next = gliderTFromBoard(this.model.points, point.X(), point.Y(), this.t);
        if (next === undefined) return;
        this.patch({t: next});
        this.ensureScene();
    }

    // ---- Chip ----------------------------------------------------------------------------------------------------

    private ensureChip(): void {
        if (!this.hasBoard) return;
        if (this.chip && (this.board.objectsList as unknown[]).includes(this.chip)) return;
        this.chip = this.board.create("text", [
            () => this.board.getBoundingBox()[0] + 0.02 * (this.board.getBoundingBox()[2] - this.board.getBoundingBox()[0]),
            () => this.board.getBoundingBox()[1] - 0.04 * (this.board.getBoundingBox()[1] - this.board.getBoundingBox()[3]),
            () => inscribedTexts(this.analysis(), t, currentLanguage()).chip,
        ], {
            anchorX: "left", anchorY: "top", fontSize: 14, strokeColor: GraphPalette.label, highlight: false, fixed: true,
            layer: 8, display: "html", name: "inscribed-chip", cssStyle: "pointer-events:none;",
        }) as JXG.GeometryElement;
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        // One list with the Preset collection, so its overlay check cannot drift from the switches.
        return INSCRIBED_ANGLE_OVERLAY_IDS;
    }

    protected override overlayLabel(id: "grid" | InscribedOverlayId): string {
        switch (id) {
            case "radii": return t("inscribed_overlay_radii");
            case "angles": return t("inscribed_overlay_angles");
            default: return super.overlayLabel(id);
        }
    }

    /** The glider moves without a model change, so the overlays that depend on P redraw when the analysis object changes. */
    protected override overlayInputs(): unknown {
        return this.analysis();
    }

    protected override drawOverlay(id: "grid" | InscribedOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const circle = this.circleView();
        if (!circle?.board) return [];
        return id === "radii" ? this.drawRadii(circle, circle.board.centre) : this.drawAngles(circle, circle.board);
    }

    private segment(name: string, from: BoardXY, to: BoardXY, colour: string, dash: number): JXG.GeometryElement {
        return this.board.create("segment", [[from.x, from.y], [to.x, to.y]], {
            strokeColor: colour, strokeWidth: 1.5, dash, highlight: false, fixed: true, layer: 3, withLabel: false, name,
        }) as JXG.GeometryElement;
    }

    private drawRadii(circle: InscribedCircleAnalysis, o: BoardXY): JXG.GeometryElement[] {
        return [
            this.segment("inscribed-radius-OA", o, circle.vertices[0], GraphPalette.comparisonCurve, 3),
            this.segment("inscribed-radius-OB", o, circle.vertices[1], GraphPalette.comparisonCurve, 3),
        ];
    }

    /** The angle mark at `vertex` between the rays to `from` and `to` (the unsigned angle of at most 180 degrees). */
    private markAt(name: string, vertex: BoardXY, from: BoardXY, to: BoardXY, colour: string, dash: number): JXG.GeometryElement[] {
        const r = 0.2 * Math.min(Math.hypot(from.x - vertex.x, from.y - vertex.y), Math.hypot(to.x - vertex.x, to.y - vertex.y));
        const start = Math.atan2(from.y - vertex.y, from.x - vertex.x);
        const delta = normaliseRadians(Math.atan2(to.y - vertex.y, to.x - vertex.x) - start + Math.PI) - Math.PI;
        return this.arc(name, vertex, r, Math.min(start, start + delta), Math.max(start, start + delta), colour, dash);
    }

    private arc(name: string, centre: BoardXY, radius: number, from: number, to: number, colour: string, dash: number): JXG.GeometryElement[] {
        if (!(radius > 0) || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
        return [this.board.create("curve", [(u: number) => centre.x + radius * Math.cos(u), (u: number) => centre.y + radius * Math.sin(u), from, to], {
            strokeColor: colour, strokeWidth: 3, dash, highlight: false, fixed: true, layer: 3, name,
        }) as JXG.GeometryElement];
    }

    private drawAngles(circle: InscribedCircleAnalysis, board: {readonly centre: BoardXY; readonly radius: number}): JXG.GeometryElement[] {
        const [a, b, c] = circle.vertices;
        const o = board.centre;
        const objects: JXG.GeometryElement[] = [
            this.segment("inscribed-side-CA", c, a, GraphPalette.additionalCurves[1], 0),
            this.segment("inscribed-side-CB", c, b, GraphPalette.additionalCurves[1], 0),
            ...this.markAt("inscribed-mark-C", c, a, b, GraphPalette.additionalCurves[1], 0),
        ];
        const glider = circle.glider;
        if (glider) {
            objects.push(
                this.segment("inscribed-side-PA", glider.board, a, GraphPalette.additionalCurves[0], 2),
                this.segment("inscribed-side-PB", glider.board, b, GraphPalette.additionalCurves[0], 2),
                ...this.markAt("inscribed-mark-P", glider.board, a, b, GraphPalette.additionalCurves[0], 2),
            );
        }
        // The central angle subtends the arc AB that does not contain C: sweep from A towards B, or from B towards A, away from C.
        const polar = (p: BoardXY) => Math.atan2(p.y - o.y, p.x - o.x);
        const toB = normaliseRadians(polar(b) - polar(a));
        const toC = normaliseRadians(polar(c) - polar(a));
        const [from, sweep] = toC < toB ? [polar(b), TAU - toB] : [polar(a), toB];
        objects.push(...this.arc("inscribed-mark-O", o, 0.3 * board.radius, from, from + sweep, GraphPalette.comparisonCurve, 3));
        return objects;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            <InscribedAnglePanel analysis={this.analysis()} exampleId={this.exampleId}
                                 onExample={id => this.loadExample(id)} onT={value => this.setT(value)} onStep={delta => this.stepT(delta)}/>
            {super.workspaceEdit()}
        </>;
    }
}
