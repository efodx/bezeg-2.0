import React from "react";
import {PointSetGraph, PointSetGraphState} from "./PointSetGraph";
import {PointSetExtension, PointSetFieldValue} from "./pointSetPersistence";
import {GraphSession} from "../base/GraphSession";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import type {LessonAction} from "../../learning/model";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {GraphPalette} from "../styles/GraphPalette";
import {PresetCollection} from "../base/presets/PresetCollection";
import {
    CircleSpec, INVERSION_COORDINATE_MAX, INVERSION_RADIUS_MAX, InversionExampleId, inversionExample, InversionSource, isCircleSpec,
    isInversionPoint, isInversionRadius, isInversionSource, normaliseTheta, XY,
} from "../../compgeo/inversionModel";
import type {GeneralizedCircleShape} from "../../analysis/complexMobius";
import {
    INVERSION_OVERLAY_IDS, INVERSION_POINT_COUNT, InversionFocus, inversionCollection, isInversionAngle, isInversionExampleId, isInversionFocus, isInversionPower,
} from "./inversionPresetCollection";
import {
    buildInversionView, edgeMarker, InversionInputs, InversionPlace, InversionPlaceId, inversionPlaces, InversionView, matchesExample, outsidePlaces,
} from "./inversionView";
import {inversionTexts} from "./inversionText";
import {InversionFields, InversionPanel} from "./InversionPanel";

/**
 * Inversion graph (spec triangle-geometry-lessons T5, task triangle-geometry/08 F2a): a `PointSetGraph` limited to one vertex,
 * the centre C of inversion (named P and used as the power point in the focus `power`). The scene state holds the example id,
 * the `focus` (`point`, `source`, `power`, `angle`), the inversion radius and the fields of every focus (X; the source circle
 * or line; the power circle and the direction; two circles and the intersection choice). Every number and every drawn image
 * comes from the model (`inversionModel.ts`) through `buildInversionView`; this file only draws and words them.
 *
 * Ownership. The base owns the vertex and the six overlays (`inversion-circle`, `rays`, `image`, `secant`, `tangent`,
 * `angle-tangents`, which share the id list with the Preset collection). The graph itself owns three kinds of objects, all
 * recorded as they are created and removed with the board: the always-on figure (the input circle or line, the two circles of the
 * angle focus, Q), the draggable handles of the current focus (X, source and circle centres, the radius handle, the direction
 * handle), and the board chip. Handles survive overlay rebuilds during their own drag and are put back on their grid place after
 * every state change. The vertex is renamed C or P after each base sync.
 *
 * Far images: the board never receives a non-finite value. An image point or an image-circle centre that the model reports
 * beyond the draw cap, or that lies outside the current view, is reported "outside the view" and gets an edge marker (an arrow
 * at the view boundary on the ray from C). The view is never rescaled silently.
 */
export type InversionOverlayId = Exclude<typeof INVERSION_OVERLAY_IDS[number], "grid">;

export interface InversionState extends PointSetGraphState {
    exampleId: InversionExampleId | undefined;
    focus: InversionFocus;
    radius: number;
    x: GridPoint;
    source: InversionSource;
    power: {circle: CircleSpec; thetaDeg: number};
    angle: {first: CircleSpec; second: CircleSpec; which: 0 | 1};
}

function hasInversionFields(state: PointSetGraphState): state is InversionState {
    return "focus" in state || "radius" in state || "x" in state || "source" in state || "power" in state || "angle" in state || "exampleId" in state;
}

export const DEFAULT_INVERSION_MODEL: PointSetModel = {mode: "points", closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}]};

const DEFAULT_RADIUS = 2;
/** How long the view must be still after a box change with no pointer up (wheel or button zoom) before the markers settle. */
const VIEW_SETTLE_MS = 150;
const DEFAULT_X: GridPoint = {x: 3, y: 1};
const DEFAULT_SOURCE: InversionSource = {kind: "circle", centre: {x: 1, y: 0}, radius: 1};
const DEFAULT_LINE: InversionSource = {kind: "line", p: {x: -3, y: -3}, q: {x: 3, y: 3}};
const DEFAULT_POWER = {circle: {centre: {x: 5, y: 0}, radius: 3} as CircleSpec, thetaDeg: 0};
const DEFAULT_ANGLE = {first: {centre: {x: 3, y: 0}, radius: 1} as CircleSpec, second: {centre: {x: 3, y: 1}, radius: 1} as CircleSpec, which: 1 as 0 | 1};
const pointValue = (point: GridPoint): PointSetFieldValue => ({x: point.x, y: point.y});
const circleValue = (circle: CircleSpec): PointSetFieldValue => ({centre: pointValue(circle.centre), radius: circle.radius});
const sourceValue = (source: InversionSource): PointSetFieldValue => source.kind === "line"
    ? {kind: "line", p: pointValue(source.p), q: pointValue(source.q)} : {kind: "circle", centre: pointValue(source.centre), radius: source.radius};
const powerValue = (power: {readonly circle: CircleSpec; readonly thetaDeg: number}): PointSetFieldValue => ({circle: circleValue(power.circle), thetaDeg: power.thetaDeg});
const angleValue = (angle: {readonly first: CircleSpec; readonly second: CircleSpec; readonly which: 0 | 1}): PointSetFieldValue => ({first: circleValue(angle.first), second: circleValue(angle.second), which: angle.which});

/**
 * The persisted scene beyond the model and the overlays (task 08 batch 6b), each field read as the collection's `checkGraphState`
 * checks it (a value is rebuilt from its named keys, so no unknown key survives) and falling back to `getInitialState()`.
 * The fields are stored as given: `fields` validates them at read time, so there is no `settle`, and a bare data import keeps them.
 */
const INVERSION_EXTENSION: PointSetExtension = Object.freeze({
    fields: [
        {name: "exampleId", fallback: "point", parse: (value: unknown) => isInversionExampleId(value) ? value : undefined},
        {name: "focus", fallback: "point", parse: (value: unknown) => isInversionFocus(value) ? value : undefined},
        {name: "radius", fallback: DEFAULT_RADIUS, parse: (value: unknown) => isInversionRadius(value) ? value : undefined},
        {name: "x", fallback: pointValue(DEFAULT_X), parse: (value: unknown) => isInversionPoint(value) ? pointValue(value) : undefined},
        {name: "source", fallback: sourceValue(DEFAULT_SOURCE), parse: (value: unknown) => isInversionSource(value) ? sourceValue(value) : undefined},
        {name: "power", fallback: powerValue(DEFAULT_POWER), parse: (value: unknown) => isInversionPower(value) ? powerValue(value) : undefined},
        {name: "angle", fallback: angleValue(DEFAULT_ANGLE), parse: (value: unknown) => isInversionAngle(value) ? angleValue(value) : undefined},
    ],
});

/** Distance of the direction handle from P, in board units. */
const THETA_HANDLE_DISTANCE = 3;

const COLOUR = {
    source: GraphPalette.primaryCurve, circle: GraphPalette.comparisonCurve, image: GraphPalette.additionalCurves[1],
    ray: GraphPalette.label, secant: GraphPalette.additionalCurves[0], tangent: GraphPalette.additionalCurves[2], angle: GraphPalette.additionalCurves[3],
};

interface Handle {
    readonly id: string;
    readonly name: string;
    readonly colour: string;
    readonly position: XY;
    readonly apply: (x: number, y: number) => void;
}

const finite = (...values: number[]) => values.every(Number.isFinite);

export class InversionGraph extends PointSetGraph<InversionOverlayId> {
    private unsubscribeLanguage?: () => void;
    private chip?: JXG.GeometryElement;
    private figureObjects: JXG.GeometryElement[] = [];
    private figureFor?: InversionView;
    private handleObjects: {handle: Handle; object: JXG.Point}[] = [];
    private handleKey?: string;
    private vertex?: JXG.GeometryElement;
    private inSnap = false;
    private epoch = 0;
    private settleTimer: ReturnType<typeof setTimeout> | undefined;
    private outsideKey = "";
    private settledKey = "";
    private memo?: {key: unknown[]; view: InversionView};
    private token?: {view: InversionView; epoch: number};

    constructor() {
        super({pointLimit: INVERSION_POINT_COUNT, coordinateLimit: INVERSION_COORDINATE_MAX});
    }

    // ---- Reads ---------------------------------------------------------------------------------------------------

    /** The stored fields with every one validated: an unknown or invalid value reads as the default. */
    get fields(): InversionFields {
        const state = this.state;
        const stored = hasInversionFields(state) ? state : undefined;
        const first = this.model.points[0];
        return {
            hasCentre: first !== undefined && isInversionPoint(first),
            focus: stored && isInversionFocus(stored.focus) ? stored.focus : "point",
            radius: stored && isInversionRadius(stored.radius) ? stored.radius : DEFAULT_RADIUS,
            x: stored && isInversionPoint(stored.x) ? stored.x : DEFAULT_X,
            source: stored && isInversionSource(stored.source) ? stored.source : DEFAULT_SOURCE,
            power: stored && stored.power && isCircleSpec(stored.power.circle) && typeof stored.power.thetaDeg === "number" && Number.isFinite(stored.power.thetaDeg)
                ? {circle: stored.power.circle, thetaDeg: normaliseTheta(stored.power.thetaDeg)} : DEFAULT_POWER,
            angle: stored && stored.angle && isCircleSpec(stored.angle.first) && isCircleSpec(stored.angle.second)
                ? {first: stored.angle.first, second: stored.angle.second, which: stored.angle.which === 0 ? 0 : 1} : DEFAULT_ANGLE,
        };
    }

    private inputs(): InversionInputs {
        const fields = this.fields;
        return {...fields, centre: fields.hasCentre ? this.model.points[0] : undefined};
    }

    /** The example whose fields are exactly the current ones; undefined for a custom scene. */
    get exampleId(): InversionExampleId | undefined {
        const state = this.state;
        const id = hasInversionFields(state) ? state.exampleId : undefined;
        if (!isInversionExampleId(id)) return undefined;
        return matchesExample(inversionExample(id as InversionExampleId), this.inputs()) ? id as InversionExampleId : undefined;
    }

    /** The derived figure of the current inputs; the same object until one of them changes. */
    view(): InversionView {
        const inputs = this.inputs();
        const key = [inputs.centre, inputs.radius, inputs.focus, inputs.x, inputs.source, inputs.power, inputs.angle];
        const last = this.memo;
        if (!last || last.key.some((value, i) => value !== key[i])) this.memo = {key, view: buildInversionView(inputs)};
        return this.memo!.view;
    }

    private box(): readonly number[] | undefined {
        return this.hasBoard ? this.board.getBoundingBox() : undefined;
    }

    /** Places not visible in the current board view (or beyond the draw cap). */
    outsideView(view: InversionView = this.view()): ReadonlySet<InversionPlaceId> {
        return outsidePlaces(view, this.box());
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    protected patch(update: Partial<InversionState>): void {
        this.setState(update);
    }

    setFocus(focus: InversionFocus): void {
        if (!isInversionFocus(focus) || this.fields.focus === focus) return;
        this.patch({focus});
    }

    setRadius(radius: number): boolean {
        if (!isInversionRadius(radius)) return false;
        this.patch({radius});
        return true;
    }

    setX(point: GridPoint): boolean {
        if (!isInversionPoint(point)) return false;
        this.patch({x: {x: point.x, y: point.y}});
        return true;
    }

    setSourceKind(kind: InversionSource["kind"]): void {
        if (this.fields.source.kind === kind) return;
        this.patch({source: kind === "circle" ? DEFAULT_SOURCE : DEFAULT_LINE});
    }

    /** Sets the source circle or line; an invalid source (a line through two equal points) is refused (false). */
    setSource(source: InversionSource): boolean {
        if (!isInversionSource(source)) return false;
        this.patch({source: source.kind === "circle"
            ? {kind: "circle", centre: {...source.centre}, radius: source.radius}
            : {kind: "line", p: {...source.p}, q: {...source.q}}});
        return true;
    }

    setPowerCircle(circle: CircleSpec): boolean {
        if (!isCircleSpec(circle)) return false;
        this.patch({power: {circle: {centre: {...circle.centre}, radius: circle.radius}, thetaDeg: this.fields.power.thetaDeg}});
        return true;
    }

    /** Sets the secant direction in degrees, normalised to [0, 360). A non-finite value is ignored. */
    setTheta(degrees: number): void {
        if (!Number.isFinite(degrees)) return;
        this.patch({power: {circle: this.fields.power.circle, thetaDeg: normaliseTheta(degrees)}});
    }

    setAngleCircle(which: 0 | 1, circle: CircleSpec): boolean {
        if (!isCircleSpec(circle)) return false;
        const angle = this.fields.angle;
        const copy = {centre: {...circle.centre}, radius: circle.radius};
        this.patch({angle: {first: which === 0 ? copy : angle.first, second: which === 1 ? copy : angle.second, which: angle.which}});
        return true;
    }

    setWhich(which: 0 | 1): void {
        const angle = this.fields.angle;
        if ((which !== 0 && which !== 1) || angle.which === which) return;
        this.patch({angle: {...angle, which}});
    }

    /** Loads a named example in two synchronous writes, the vertex (`loadModel`) and then the id with the radius, focus and focus fields. */
    loadExample(id: InversionExampleId): void {
        const example = inversionExample(id);
        this.loadModel({...DEFAULT_INVERSION_MODEL, points: [{...example.inversion.centre}]});
        const update: Partial<InversionState> = {exampleId: id, radius: example.inversion.radius};
        if (example.point) Object.assign(update, {focus: "point", x: {...example.point}});
        else if (example.source) Object.assign(update, {focus: "source", source: structuredClone(example.source)});
        else if (example.power) Object.assign(update, {focus: "power", power: structuredClone({circle: example.power.circle, thetaDeg: example.power.thetaDeg})});
        else if (example.angle) Object.assign(update, {focus: "angle", angle: structuredClone(example.angle)});
        this.patch(update);
    }

    /**
     * Lesson scenes use the `inversion` kind for the example, the focus, X and the secant direction; the centre and the overlays go through
     * `point-set`. Values are checked strictly: a lesson-content error throws and changes nothing.
     */
    applyInversionAction(action: Extract<LessonAction, {kind: "inversion"}>): void {
        const payload = action as unknown as Record<string, unknown>;
        switch (action.operation) {
            case "load-example":
                if (!isInversionExampleId(payload.exampleId)) throw new Error("inversion load-example: exampleId must be one of the inversion examples.");
                this.loadExample(action.exampleId);
                return;
            case "set-focus":
                if (!isInversionFocus(payload.focus)) throw new Error("inversion set-focus: focus must be point, source, power or angle.");
                this.setFocus(action.focus);
                return;
            case "set-x":
                if (typeof payload.point !== "object" || payload.point === null || !this.setX(action.point as GridPoint)) throw new Error("inversion set-x: point must have whole-number coordinates from -10 to 10.");
                return;
            case "set-theta":
                if (typeof payload.degrees !== "number" || !Number.isFinite(payload.degrees)) throw new Error("inversion set-theta: degrees must be a finite number.");
                this.setTheta(action.degrees);
                return;
            default:
                throw new Error(`inversion: the inversion graph has no operation ${String(payload.operation)}.`);
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("inversion", action => this.applyInversionAction(action));
    }

    // ---- Lifecycle -----------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        this.chip = undefined;
        this.resetScene();
        this.ensureChip();
        this.ensureScene();
        // Board text is a function of the current language; a switch only has to redraw it.
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = onLanguageChange(() => {
            if (this.hasBoard) this.board.fullUpdate();
        });
        this.outsideKey = "";
        this.settledKey = "";
        this.cancelSettle();
        session.on("boundingbox", () => {
            this.refreshView(false);
            // A wheel or button zoom fires no pointer up, so the view also settles once it has been still for a moment.
            this.cancelSettle();
            this.settleTimer = setTimeout(() => {
                this.settleTimer = undefined;
                this.refreshView(true);
            }, VIEW_SETTLE_MS);
        });
        session.on("up", () => {
            this.cancelSettle();
            this.refreshView(true);
        });
    }

    private cancelSettle(): void {
        if (this.settleTimer !== undefined) clearTimeout(this.settleTimer);
        this.settleTimer = undefined;
    }

    /** The set of outside places and, for the markers' position, the view box; what the drawn scene was built for. */
    private viewKey(view: InversionView, settled: boolean): string {
        const outside = [...this.outsideView(view)].sort().join(",");
        const box = this.box();
        const scaled = view.kind === "scene" && view.focus === "angle"; // the angle tangents' length follows the view width
        return !settled || (outside === "" && !scaled) || !box ? outside : `${outside}|${box.map(v => Math.round(v * 1000)).join(",")}`;
    }

    /**
     * The edge markers and "outside the view" depend on the live view box. While the view moves, redraw only when the set of
     * outside places changes; once it settles (pointer up), also redraw so the markers sit on the final boundary.
     */
    private refreshView(settled: boolean): void {
        if (!this.hasBoard) return;
        const key = this.viewKey(this.view(), settled);
        if (key === (settled ? this.settledKey : this.outsideKey)) return;
        this.epoch++;
        this.syncScene();
        const view = this.view();
        this.outsideKey = this.viewKey(view, false);
        this.settledKey = this.viewKey(view, true);
        this.requestRender();
    }

    override unmount(): void {
        this.cancelSettle();
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = undefined;
        this.resetScene();
        this.chip = undefined;
        super.unmount();
    }

    /** Forgets the scene objects (the board removes them itself on dispose or replacement). */
    private resetScene(): void {
        this.figureObjects = [];
        this.figureFor = undefined;
        this.handleObjects = [];
        this.handleKey = undefined;
        this.vertex = undefined;
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

    override getInitialState(): InversionState {
        return {
            ...super.getInitialState(), exampleId: "point", focus: "point", radius: DEFAULT_RADIUS, x: {...DEFAULT_X},
            source: structuredClone(DEFAULT_SOURCE), power: structuredClone(DEFAULT_POWER), angle: structuredClone(DEFAULT_ANGLE),
            overlays: {"inversion-circle": true, rays: true, image: true, secant: true, tangent: true, "angle-tangents": true},
        };
    }

    /** The declared example, focus, radius and focus fields: import, figure return and lesson default read them. */
    protected override persistenceExtension(): PointSetExtension {
        return INVERSION_EXTENSION;
    }

    override defaultPreset(): PointSetModel {
        return {...DEFAULT_INVERSION_MODEL, points: DEFAULT_INVERSION_MODEL.points.map(p => ({...p}))};
    }

    /** Shows every example: the power circle reaches x = 8 and the inversion circle at most r = 8 around C in [-10, 10]. */
    protected override initialView(): [number, number, number, number] {
        return [-5, 6, 10, -6];
    }

    override presetCollection(): PresetCollection<PointSetModel> {
        return inversionCollection;
    }

    // ---- Scene objects -------------------------------------------------------------------------------------------

    protected override onStateChange(previous: Readonly<PointSetGraphState>): void {
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

    /** Removes the figure and handle objects still on the board, newest first. */
    private removeSceneObjects(): void {
        const list = this.board.objectsList as unknown[];
        const present = [...this.figureObjects, ...this.handleObjects.map(h => h.object)].filter(object => list.includes(object)).reverse();
        if (present.length) this.board.removeObject(present);
        this.figureObjects = [];
        this.figureFor = undefined;
        this.handleObjects = [];
        this.handleKey = undefined;
    }

    /** Runs `create` and returns every board object it added, helper points included. */
    private recorded(create: () => void): JXG.GeometryElement[] {
        const before = new Set<unknown>(this.board.objectsList as unknown[]);
        create();
        return (this.board.objectsList as JXG.GeometryElement[]).filter(object => !before.has(object));
    }

    private ensureScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        const list = this.board.objectsList as unknown[];
        const view = this.view();
        this.nameVertex(view);
        // The figure is rebuilt when the derived view changes or the board dropped one of its objects.
        if (this.figureFor !== view || !this.figureObjects.every(object => list.includes(object))) {
            const old = this.figureObjects.filter(object => list.includes(object)).reverse();
            if (old.length) this.board.removeObject(old);
            this.figureObjects = this.recorded(() => this.createFigure(view));
            this.figureFor = view;
        }
        const handles = this.handlesFor(view);
        const key = handles.map(handle => handle.id).join("|");
        if (key !== this.handleKey || !this.handleObjects.every(h => list.includes(h.object))) {
            const old = this.handleObjects.map(h => h.object).filter(object => list.includes(object)).reverse();
            if (old.length) this.board.removeObject(old);
            this.handleObjects = [];
            this.handleKey = key;
            for (const handle of handles) this.handleObjects.push({handle, object: this.createHandle(handle)});
        }
        this.handleObjects.forEach((entry, i) => {
            entry.handle = handles[i];
            const {position} = handles[i];
            const object = entry.object;
            if (object.X() !== position.x || object.Y() !== position.y) {
                this.inSnap = true;
                try { object.moveTo([position.x, position.y], 0); } finally { this.inSnap = false; }
            }
        });
    }

    /** The base names its vertex P1; here it is the centre C, or the power point P in the focus `power`. */
    private nameVertex(view: InversionView): void {
        const list = this.board.objectsList as JXG.GeometryElement[];
        if (!this.vertex || !list.includes(this.vertex)) this.vertex = list.find(object => object.elType === "point" && object.name === "P1");
        if (!this.vertex) return;
        const name = view.kind === "scene" && view.focus === "power" ? "P" : "C";
        if (this.vertex.name !== name) this.vertex.setAttribute({name});
    }

    private createHandle(handle: Handle): JXG.Point {
        const point = this.board.create("point", [handle.position.x, handle.position.y], {
            name: handle.name, withLabel: true, size: 5, face: "o", fillColor: handle.colour, strokeColor: GraphPalette.pointOutline, strokeWidth: 2,
            highlightFillColor: GraphPalette.selectedControlPoint, showInfobox: false, layer: 8, label: {offset: [8, 8], strokeColor: GraphPalette.label},
        }) as JXG.Point;
        point.on("drag", () => {
            if (this.inSnap || this.graphInteractionLocked) return;
            const entry = this.handleObjects.find(h => h.object === point);
            if (!entry) return;
            entry.handle.apply(point.X(), point.Y());
            this.ensureScene();
        });
        return point;
    }

    /** The draggable handles of the current focus, with their current places (all on the grid except the direction handle). */
    private handlesFor(view: InversionView): Handle[] {
        if (view.kind !== "scene") return [];
        const fields = this.fields;
        const snap = (x: number, y: number): GridPoint => ({x: Math.round(x), y: Math.round(y)});
        const handles: Handle[] = [];
        if (view.focus !== "power") {
            handles.push({
                id: "radius", name: "r", colour: COLOUR.circle, position: {x: view.centre.x + fields.radius, y: view.centre.y},
                apply: x => { this.setRadius(Math.min(INVERSION_RADIUS_MAX, Math.max(1, Math.round(x - view.centre.x)))); },
            });
        }
        if (view.focus === "point") {
            handles.push({id: "x", name: "X", colour: COLOUR.source, position: fields.x, apply: (x, y) => { this.setX(snap(x, y)); }});
        } else if (view.focus === "source") {
            const source = fields.source;
            if (source.kind === "circle") {
                handles.push({
                    id: "source-centre", name: "S", colour: COLOUR.source, position: source.centre,
                    apply: (x, y) => { this.setSource({kind: "circle", centre: snap(x, y), radius: source.radius}); },
                });
            } else {
                handles.push({
                    id: "source-p", name: "S₁", colour: COLOUR.source, position: source.p,
                    apply: (x, y) => { this.setSource({kind: "line", p: snap(x, y), q: source.q}); },
                }, {
                    id: "source-q", name: "S₂", colour: COLOUR.source, position: source.q,
                    apply: (x, y) => { this.setSource({kind: "line", p: source.p, q: snap(x, y)}); },
                });
            }
        } else if (view.focus === "power") {
            const {circle, thetaDeg} = fields.power;
            const rad = (thetaDeg * Math.PI) / 180;
            handles.push({
                id: "power-centre", name: "O", colour: COLOUR.source, position: circle.centre,
                apply: (x, y) => { this.setPowerCircle({centre: snap(x, y), radius: circle.radius}); },
            }, {
                id: "theta", name: "θ", colour: COLOUR.secant,
                position: {x: view.centre.x + THETA_HANDLE_DISTANCE * Math.cos(rad), y: view.centre.y + THETA_HANDLE_DISTANCE * Math.sin(rad)},
                apply: (x, y) => {
                    const dx = x - view.centre.x;
                    const dy = y - view.centre.y;
                    if (dx !== 0 || dy !== 0) this.setTheta((Math.atan2(dy, dx) * 180) / Math.PI);
                },
            });
        } else {
            const {first, second} = fields.angle;
            handles.push({
                id: "first", name: "O₁", colour: COLOUR.source, position: first.centre,
                apply: (x, y) => { this.setAngleCircle(0, {centre: snap(x, y), radius: first.radius}); },
            }, {
                id: "second", name: "O₂", colour: COLOUR.source, position: second.centre,
                apply: (x, y) => { this.setAngleCircle(1, {centre: snap(x, y), radius: second.radius}); },
            });
        }
        return handles;
    }

    // ---- Chip ----------------------------------------------------------------------------------------------------

    private chipText(): string {
        const view = this.view();
        return inversionTexts(view, t, currentLanguage(), this.outsideView(view), this.fields.radius).chip;
    }

    private ensureChip(): void {
        if (!this.hasBoard) return;
        if (this.chip && (this.board.objectsList as unknown[]).includes(this.chip)) return;
        this.chip = this.board.create("text", [
            () => this.board.getBoundingBox()[0] + 0.02 * (this.board.getBoundingBox()[2] - this.board.getBoundingBox()[0]),
            () => this.board.getBoundingBox()[1] - 0.04 * (this.board.getBoundingBox()[1] - this.board.getBoundingBox()[3]),
            () => this.chipText(),
        ], {
            anchorX: "left", anchorY: "top", fontSize: 14, strokeColor: GraphPalette.label, highlight: false, fixed: true,
            layer: 8, display: "html", name: "inversion-chip", cssStyle: "pointer-events:none;",
        }) as JXG.GeometryElement;
    }

    // ---- Figure (always on) --------------------------------------------------------------------------------------

    private circleObject(centre: XY, radius: number, name: string, colour: string, extra: object = {}): JXG.GeometryElement[] {
        if (!finite(centre.x, centre.y, radius) || !(radius > 0)) return [];
        return [this.board.create("circle", [[centre.x, centre.y], radius], {
            strokeColor: colour, strokeWidth: 2, fillOpacity: 0, highlight: false, fixed: true, layer: 3, withLabel: false, name, ...extra,
        }) as JXG.GeometryElement];
    }

    private lineObject(point: XY, other: XY, name: string, colour: string, extra: object = {}): JXG.GeometryElement[] {
        if (!finite(point.x, point.y, other.x, other.y) || (point.x === other.x && point.y === other.y)) return [];
        return [this.board.create("line", [[point.x, point.y], [other.x, other.y]], {
            strokeColor: colour, strokeWidth: 2, highlight: false, fixed: true, layer: 3, withLabel: false, name, ...extra,
        }) as JXG.GeometryElement];
    }

    private shapeObjects(shape: GeneralizedCircleShape, name: string, colour: string): JXG.GeometryElement[] {
        if (shape.kind === "circle") return this.circleObject({x: shape.centre.re, y: shape.centre.im}, shape.radius, name, colour);
        const point = {x: shape.point.re, y: shape.point.im};
        return this.lineObject(point, {x: point.x + shape.direction.re, y: point.y + shape.direction.im}, name, colour);
    }

    private dotObject(at: XY, name: string, colour: string, extra: object = {}): JXG.GeometryElement[] {
        if (!finite(at.x, at.y)) return [];
        return [this.board.create("point", [at.x, at.y], {
            name, withLabel: true, size: 4, face: "o", fillColor: colour, strokeColor: colour, highlight: false, fixed: true, showInfobox: false,
            layer: 6, label: {offset: [8, 8], strokeColor: GraphPalette.label}, ...extra,
        }) as JXG.GeometryElement];
    }

    private createFigure(view: InversionView): void {
        if (view.kind !== "scene") return;
        const fields = this.fields;
        if (view.focus === "source") {
            const source = fields.source;
            if (source.kind === "circle") this.circleObject(source.centre, source.radius, "source-circle", COLOUR.source);
            else this.lineObject(source.p, source.q, "source-line", COLOUR.source);
        } else if (view.focus === "power") {
            this.circleObject(fields.power.circle.centre, fields.power.circle.radius, "power-circle", COLOUR.source);
        } else if (view.focus === "angle") {
            this.circleObject(fields.angle.first.centre, fields.angle.first.radius, "angle-circle-1", COLOUR.source);
            this.circleObject(fields.angle.second.centre, fields.angle.second.radius, "angle-circle-2", COLOUR.angle);
            if (view.angle?.kind === "angle") this.dotObject(view.angle.point, "Q", COLOUR.source);
        }
    }

    // ---- Overlays ------------------------------------------------------------------------------------------------

    protected override overlayIds() {
        // One list with the Preset collection, so its overlay check cannot drift from the switches.
        return INVERSION_OVERLAY_IDS;
    }

    protected override overlayLabel(id: "grid" | InversionOverlayId): string {
        switch (id) {
            case "inversion-circle": return t("inversion_overlay_circle");
            case "rays": return t("inversion_overlay_rays");
            case "image": return t("inversion_overlay_image");
            case "secant": return t("inversion_overlay_secant");
            case "tangent": return t("inversion_overlay_tangent");
            case "angle-tangents": return t("inversion_overlay_angle_tangents");
            default: return super.overlayLabel(id);
        }
    }

    /** The figure changes without a model change, so the overlays redraw when the view or the edge-marker epoch changes. */
    protected override overlayInputs(): unknown {
        const view = this.view();
        if (!this.token || this.token.view !== view || this.token.epoch !== this.epoch) this.token = {view, epoch: this.epoch};
        return this.token;
    }

    protected override drawOverlay(id: "grid" | InversionOverlayId, model: PointSetModel): JXG.GeometryElement[] {
        if (id === "grid") return super.drawOverlay(id, model);
        const view = this.view();
        if (view.kind !== "scene") return [];
        const fields = this.fields;
        switch (id) {
            case "inversion-circle": return view.focus === "power" ? [] : this.circleObject(view.centre, fields.radius, "inversion-circle", COLOUR.circle, {dash: 2});
            case "rays": return this.drawRays(view);
            case "image": return this.drawImage(view);
            case "secant": return this.drawSecant(view);
            case "tangent": return this.drawTangents(view);
            default: return this.drawAngleTangents(view);
        }
    }

    private drawRays(view: Extract<InversionView, {kind: "scene"}>): JXG.GeometryElement[] {
        const target: XY | undefined = view.focus === "point" ? (view.point?.kind === "image" ? this.fields.x : undefined)
            : view.focus === "angle" && view.angle?.kind === "angle" ? view.angle.point : undefined;
        if (!target || !finite(target.x, target.y)) return [];
        return [this.board.create("line", [[view.centre.x, view.centre.y], [target.x, target.y]], {
            straightFirst: false, straightLast: true, strokeColor: COLOUR.ray, strokeWidth: 1, dash: 2, highlight: false, fixed: true, layer: 2,
            withLabel: false, name: "ray",
        }) as JXG.GeometryElement];
    }

    private drawMarker(view: Extract<InversionView, {kind: "scene"}>, place: InversionPlace): JXG.GeometryElement[] {
        const box = this.box();
        if (!box || !place.direction) return [];
        if (place.board !== undefined && !this.outsideView(view).has(place.id)) return [];
        const length = 0.03 * Math.abs(box[2] - box[0]);
        const marker = edgeMarker(box, view.centre, place.direction, length, place.board);
        if (!marker) return [];
        return [this.board.create("segment", [[marker.tail.x, marker.tail.y], [marker.tip.x, marker.tip.y]], {
            strokeColor: COLOUR.image, strokeWidth: 3, lastArrow: {type: 2, size: 8}, highlight: false, fixed: true, layer: 7, withLabel: false,
            name: `edge-marker-${place.id}`,
        }) as JXG.GeometryElement];
    }

    private drawImage(view: Extract<InversionView, {kind: "scene"}>): JXG.GeometryElement[] {
        this.outsideKey = this.viewKey(view, false);
        this.settledKey = this.viewKey(view, true);
        const out: JXG.GeometryElement[] = [];
        const places = inversionPlaces(view);
        const place = (id: InversionPlaceId) => places.find(p => p.id === id);
        if (view.point?.kind === "image") {
            if (view.point.board) out.push(...this.dotObject(view.point.board, "X′", COLOUR.image));
            const p = place("image");
            if (p) out.push(...this.drawMarker(view, p));
        } else if (view.source?.kind === "image") {
            if (view.source.board) out.push(...this.shapeObjects(view.source.board, "image-curve", COLOUR.image));
            const p = place("source-image");
            if (p) out.push(...this.drawMarker(view, p));
        } else if (view.angle?.kind === "angle" && view.angleImages) {
            view.angleImages.forEach((image, i) => {
                if (image.kind === "image" && image.board) out.push(...this.shapeObjects(image.board, `image-curve-${i + 1}`, i === 0 ? COLOUR.image : COLOUR.angle));
            });
            if (view.angle.imageBoard) out.push(...this.dotObject(view.angle.imageBoard, "Q′", COLOUR.image));
            const p = place("q-image");
            if (p) out.push(...this.drawMarker(view, p));
        }
        return out;
    }

    private drawSecant(view: Extract<InversionView, {kind: "scene"}>): JXG.GeometryElement[] {
        const power = view.power;
        if (view.focus !== "power" || power?.kind !== "power") return [];
        const rad = (power.thetaDeg * Math.PI) / 180;
        const out = this.lineObject(view.centre, {x: view.centre.x + Math.cos(rad), y: view.centre.y + Math.sin(rad)}, "secant", COLOUR.secant, {strokeWidth: 2.5});
        if (power.secant.kind === "two") out.push(...this.dotObject(power.secant.A, "A", COLOUR.secant), ...this.dotObject(power.secant.B, "B", COLOUR.secant));
        if (power.secant.kind === "tangent") out.push(...this.dotObject(power.secant.point, "A", COLOUR.secant));
        return out;
    }

    private drawTangents(view: Extract<InversionView, {kind: "scene"}>): JXG.GeometryElement[] {
        const power = view.power;
        if (view.focus !== "power" || power?.kind !== "power" || !power.tangent || !(power.tangent.length > 0)) return [];
        const out: JXG.GeometryElement[] = [];
        power.tangent.points.forEach((point, i) => {
            if (!finite(point.x, point.y)) return;
            out.push(this.board.create("segment", [[view.centre.x, view.centre.y], [point.x, point.y]], {
                strokeColor: COLOUR.tangent, strokeWidth: 2, dash: 2, highlight: false, fixed: true, layer: 4, withLabel: false, name: `tangent-${i + 1}`,
            }) as JXG.GeometryElement);
            out.push(...this.dotObject(point, i === 0 ? "T₁" : "T₂", COLOUR.tangent));
        });
        return out;
    }

    /** The tangent lines at Q (to the two circles) and at Q' (to their images), as short segments through the point. */
    private drawAngleTangents(view: Extract<InversionView, {kind: "scene"}>): JXG.GeometryElement[] {
        const angle = view.angle;
        if (view.focus !== "angle" || angle?.kind !== "angle" || !view.angleImages) return [];
        const out: JXG.GeometryElement[] = [];
        const box = this.box();
        const half = box ? 0.07 * Math.abs(box[2] - box[0]) : 1.4;
        const segment = (at: XY, direction: XY, name: string, colour: string) => {
            const size = Math.hypot(direction.x, direction.y);
            if (!finite(at.x, at.y, size) || size === 0) return;
            const ux = (direction.x / size) * half;
            const uy = (direction.y / size) * half;
            out.push(this.board.create("segment", [[at.x - ux, at.y - uy], [at.x + ux, at.y + uy]], {
                strokeColor: colour, strokeWidth: 2, highlight: false, fixed: true, layer: 4, withLabel: false, name,
            }) as JXG.GeometryElement);
        };
        const circles = [this.fields.angle.first, this.fields.angle.second];
        circles.forEach((circle, i) => {
            segment(angle.point, {x: -(angle.point.y - circle.centre.y), y: angle.point.x - circle.centre.x}, `angle-tangent-before-${i + 1}`, i === 0 ? COLOUR.source : COLOUR.angle);
        });
        if (angle.imageBoard) {
            view.angleImages.forEach((image, i) => {
                if (image.kind !== "image" || !image.board) return;
                const shape = image.drawn;
                const direction = shape.kind === "line" ? {x: shape.direction.re, y: shape.direction.im}
                    : {x: -(angle.image.y - shape.centre.im), y: angle.image.x - shape.centre.re};
                segment(angle.image, direction, `angle-tangent-after-${i + 1}`, i === 0 ? COLOUR.image : COLOUR.angle);
            });
        }
        return out;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override showsModeToggle(): boolean {
        return false;
    }

    protected override workspaceEdit(): React.ReactNode {
        const view = this.view();
        const outside = this.outsideView(view);
        const fields = this.fields;
        return <>
            <InversionPanel view={view} outside={outside} fields={fields} exampleId={this.exampleId}
                            onExample={id => this.loadExample(id)} onFocus={focus => this.setFocus(focus)}
                            onRadius={radius => { this.setRadius(radius); }} onX={point => { this.setX(point); }}
                            onSourceKind={kind => this.setSourceKind(kind)} onSource={source => { this.setSource(source); }}
                            onPowerCircle={circle => { this.setPowerCircle(circle); }} onTheta={degrees => this.setTheta(degrees)}
                            onAngleCircle={(which, circle) => { this.setAngleCircle(which, circle); }}
                            onWhich={which => this.setWhich(which)}/>
            {super.workspaceEdit()}
        </>;
    }
}
