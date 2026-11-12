import React, {useSyncExternalStore} from "react";
import {prefersReducedMotion, useReducedMotion} from "../base/controls/reducedMotion";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import type {TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {descentPresetCollection} from "./descentPresetCollection";
import {currentLanguage, onLanguageChange, t, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import {BooleanField} from "../../inputs/BooleanField";
import Slider from "../../inputs/Slider";
import {ReadoutHeading, ReadoutHelp, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {GraphPalette} from "../styles/GraphPalette";
import {AnimationDriver, AnimationScheduler} from "../../learning/runtime/animation";
import {fitBoundingBox} from "../base/fitBoundingBox";
import {G} from "../../mechanics/descentTime";
import type {Track, Vec2} from "../../mechanics/tracks";
import {
    beadParameter, checkField, DEFAULT_DESCENT_STATE, DESCENT_MODES, deriveDescent, DescentDerived, DescentMode, DescentState, FIELD_RANGES,
    NumericField, parseDescentState, RaceDerived, RaceTrackId, serializeDescentState, snapDrag, TautochroneDerived, ThetaField, THETA_FIELDS, ToggleField, TrackDerived,
} from "../../mechanics/trackModel";

/** The scene state: the stored fields of `DescentState`, nothing derived. The elapsed time and the playing flag are host state, never stored. */
export interface DescentGraphState extends BaseGraphState, DescentState {}

/** One frame advances the time by at most this many milliseconds, so a stalled tab does not jump. */
export const MAX_FRAME_MS = 100;
/** The grid of the time slider (seconds). */
export const TIME_STEP = 0.01;
const TIME_BIG_STEP = 0.1;
/** Float slack when a slider reaches the end of the run. */
const TIME_SLACK = 1e-9;
/** Pointer tolerance in screen pixels around a handle: JSXGraph adds a slack of 2 and tests both sides, so a touch zone is over 44 px across. */
export const HANDLE_TOUCH_RADIUS = 26;
export const HANDLE_MOUSE_RADIUS = 8;
/** Points sampled along a drawn track. */
const SAMPLES = 160;

const STORED_FIELDS = Object.keys(DEFAULT_DESCENT_STATE) as (keyof DescentState)[];

const dec = (value: number, digits = 2): string => formatNumber(value, currentLanguage(), digits);
/** A descent time: four decimals (trailing zeros dropped), so that equal times can be seen to be equal. */
const seconds = (value: number): string => `${dec(value, 4)} ${t("descent_graph_unit_s")}`;
const metres = (value: number): string => dec(value, 2);
const pointText = (x: number, y: number): string => t("descent_graph_value_point", {value0: metres(x), value1: metres(y)});
const thetaText = (theta: number): string => (theta === Math.PI ? "π" : dec(theta, 2));
const listText = (items: readonly string[]): string => items.join(t("descent_graph_list_separator"));

const MODE_KEYS = {
    race: "descent_graph_mode_race", track: "descent_graph_mode_track", tautochrone: "descent_graph_mode_tautochrone",
} as const;
const NAME_KEYS = {
    line: "descent_graph_name_line", arc: "descent_graph_name_arc", cycloid: "descent_graph_name_cycloid", track: "descent_graph_name_track",
} as const;
type TrackName = keyof typeof NAME_KEYS;

const RESIZE_SETTLE_MS = 150;
const REDUCED_REASON_ID = "descent-play-reduced-reason";

const FIELD_LABEL_KEYS = {
    radius: "descent_graph_radius_label", endX: "descent_graph_end_x_label", endY: "descent_graph_end_y_label", p1x: "descent_graph_p1x_label",
    p1y: "descent_graph_p1y_label", p2x: "descent_graph_p2x_label", p2y: "descent_graph_p2y_label", theta1: "descent_graph_theta1_label",
    theta2: "descent_graph_theta2_label", theta3: "descent_graph_theta3_label",
} as const;

/** The stored numbers each derivation reads: a change of any other field reuses the derived data. */
function derivedKey(s: DescentState): string {
    switch (s.mode) {
        case "race": return `race/${s.radius}`;
        case "track": return `track/${s.endX}/${s.endY}/${s.p1x}/${s.p1y}/${s.p2x}/${s.p2y}/${s.showCycloid}`;
        case "tautochrone": return `tautochrone/${s.radius}/${s.theta1}/${s.theta2}/${s.theta3}/${s.showArc}`;
    }
}

/** The board rectangle [left, top, right, bottom] around a content box, with a margin and room on top for the captions. */
function frameAround(x0: number, x1: number, depth0: number, depth1: number): [number, number, number, number] {
    const extent = Math.max(x1 - x0, depth1 - depth0, 1e-6);
    const margin = 0.1 * extent;
    return [x0 - margin, -depth0 + margin + 0.6 * extent, x1 + margin, -(depth1 + margin)];
}

/**
 * The frame of a mode. It depends on the radius only (the track mode has a fixed frame), so dragging a point never moves the view.
 * The board's second axis is the negative depth.
 */
export function frameFor(state: DescentState, derived: DescentDerived): [number, number, number, number] {
    switch (derived.mode) {
        case "race": return frameAround(0, derived.end[0], 0, Math.max(derived.end[1], derived.arcSweep >= Math.PI / 2 ? derived.arcCentre : 0));
        case "track": return frameAround(0, 6, -2, 4.9);
        case "tautochrone": return frameAround(Math.min(0, derived.bottom[0] - 3.5 * state.radius), derived.bottom[0], 0, derived.bottom[1]);
    }
}

/** The key of the frame of a stored state: what `applyFrame` compares to decide whether the board needs framing. */
export const frameKeyOf = (state: DescentState): string => frameFor(state, deriveDescent(state)).map(value => value.toFixed(4)).join(",");

interface BeadSpec {
    readonly key: string;
    readonly track: Track;
    readonly tStart: number;
    /** The computed total time of this bead; it rests at the end of its track from then on. */
    readonly total: number;
    readonly color: string;
    /** The number written beside the bead (tautochrone), 0 for none. */
    readonly tag: number;
}

interface HandleSpec {
    readonly key: string;
    readonly visible: () => boolean;
    readonly position: () => [number, number];
    readonly drag: (x: number, y: number) => void;
    readonly tag: () => string;
    readonly color: string;
}

const flip = (p: Vec2): [number, number] => [p[0], -p[1]];

/**
 * The descent graph (mechanical-curves spec MC1 to MC3, ADR 0056): a frictionless bead sliding down tracks in three modes, the race of a
 * line, a circular arc and a cycloid, a Bezier track with draggable points on the quarter grid against the cycloid through its end
 * points, and the equal descent times on the cycloid. Every time is a quadrature of the `src/mechanics` kernel and is labelled computed.
 * The stored state is `DescentState`; the tracks, times and statuses are derived from it (`derived`), keyed on the state object and the
 * numbers each mode reads. The elapsed time of the beads is host state, not stored.
 *
 * Ownership: every board object is created by `buildScene` and recorded in `objects`, every drag listener in `offs`; `disposeScene`
 * removes them. The playback driver is created by `play`, stopped by every edit and by disposal; the settled readout's timer is
 * cancelled with the session.
 */
export class DescentGraph extends BaseGraph<DescentGraphState, DescentState> {
    private objects: JXG.GeometryElement[] = [];
    private offs: Array<() => void> = [];
    private handles: {spec: HandleSpec; point: JXG.Point}[] = [];
    private derivedCache?: {state: DescentGraphState; key: string; value: DescentDerived};
    private beadSpecCache?: {derived: DescentDerived; value: readonly BeadSpec[]};
    private beadCache?: {specs: readonly BeadSpec[]; time: number; value: readonly (readonly [number, number])[]};
    private readonly sampleCache = new WeakMap<Track, {x: number[]; y: number[]}>();
    private drawnFrame = "";
    private shownView: number[] | undefined;
    private derivations = 0;
    private notice?: {readonly state: DescentGraphState; readonly text: () => string};
    private reconciledFor?: DescentGraphState;
    private driver?: AnimationDriver;
    /** The one announcement region of the graph. */
    readonly status = new SettledReadout();
    // ---- Host state: not in the model, not in a Preset ------------------------------------------------------------------
    private timeValue = 0;
    private playingValue = false;
    private hostVersion = 0;
    private readonly hostListeners = new Set<() => void>();

    override getInitialState(): DescentGraphState {
        return {initialized: false, ...DEFAULT_DESCENT_STATE};
    }

    protected override lessonDefaultState(): DescentGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`. Time and playing stay host state.

    override defaultPreset(): DescentState {
        return serializeDescentState(DEFAULT_DESCENT_STATE);
    }

    override presetCollection(): PresetCollection<DescentState> {
        return descentPresetCollection();
    }

    override exportPreset(): Preset<DescentState> {
        const preset = super.exportPreset();
        const {mode: _mode, radius: _radius, endX: _endX, endY: _endY, p1x: _p1x, p1y: _p1y, p2x: _p2x, p2y: _p2y, theta1: _theta1, theta2: _theta2, theta3: _theta3, showCycloid: _showCycloid, showArc: _showArc, ...graphState} = preset.graphState as DescentGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): DescentState {
        return serializeDescentState(this.state);
    }

    /** True while a Preset file with a `boardState` is applied: its stored view is kept, so the frame of the imported data is marked as drawn. */
    private keepImportedView = false;

    override importPreset(preset: Preset): void {
        this.keepImportedView = preset.boardState !== undefined;
        try {
            super.importPreset(preset);
        } finally {
            this.keepImportedView = false;
        }
    }

    override importPresetData(data: DescentState): void {
        const imported = serializeDescentState(data);
        if (this.keepImportedView) this.drawnFrame = frameKeyOf(imported);
        this.setState(imported);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): DescentGraphState {
        const parsed = parseDescentState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return frameFor(DEFAULT_DESCENT_STATE, deriveDescent(DEFAULT_DESCENT_STATE));
    }

    // ---- Host state -----------------------------------------------------------------------------------------------------

    readonly subscribeHost = (listener: () => void): (() => void) => {
        this.hostListeners.add(listener);
        return () => { this.hostListeners.delete(listener); };
    };
    readonly hostSnapshot = (): number => this.hostVersion;

    private notifyHost(): void {
        this.hostVersion++;
        this.hostListeners.forEach(listener => listener());
    }

    get time(): number { return this.timeValue; }
    get playing(): boolean { return this.playingValue; }
    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.objects.length; }
    ownedListenerCount(): number { return this.offs.length; }
    derivationCount(): number { return this.derivations; }
    handlePoints(): JXG.Point[] { return this.handles.map(handle => handle.point); }

    // ---- Derived numbers ------------------------------------------------------------------------------------------------

    /** The tracks, times and statuses of the current state: a cache keyed on the state object and on the numbers the mode reads. */
    derived(): DescentDerived {
        const state = this.state;
        if (this.derivedCache && this.derivedCache.state === state) return this.derivedCache.value;
        const key = derivedKey(state);
        if (this.derivedCache && this.derivedCache.key === key) {
            this.derivedCache = {...this.derivedCache, state};
            return this.derivedCache.value;
        }
        this.derivations++;
        const value = deriveDescent(state); // language-free: names and units are resolved at render time
        this.derivedCache = {state, key, value};
        return value;
    }

    private tEnd(): number { return this.derived().tEnd; }

    /** The beads the mode shows, with the track and the start each runs from. */
    private beadSpecs(): readonly BeadSpec[] {
        const derived = this.derived();
        if (this.beadSpecCache?.derived === derived) return this.beadSpecCache.value;
        let value: BeadSpec[] = [];
        if (derived.mode === "race") {
            const colors: Record<RaceTrackId, string> = {line: GraphPalette.comparisonCurve, arc: GraphPalette.additionalCurves[1], cycloid: GraphPalette.primaryCurve};
            value = (["line", "arc", "cycloid"] as const).map(id => ({key: id, track: derived.tracks[id], tStart: 0, total: derived.times[id], color: colors[id], tag: 0}));
        } else if (derived.mode === "track") {
            if (derived.time !== undefined) value.push({key: "track", track: derived.track, tStart: 0, total: derived.time, color: GraphPalette.controlPoint, tag: 0});
            if (this.state.showCycloid) value.push({key: "cycloid", track: derived.cycloid.track, tStart: 0, total: derived.cycloid.time, color: GraphPalette.primaryCurve, tag: 0});
        } else {
            derived.beads.forEach((bead, i) => value.push({key: `bead${i}`, track: derived.cycloid, tStart: bead.theta, total: bead.time, color: GraphPalette.primaryCurve, tag: i + 1}));
            derived.beads.forEach((bead, i) => {
                if (bead.arc) value.push({key: `arc${i}`, track: bead.arc.track, tStart: 0, total: bead.arc.time, color: GraphPalette.additionalCurves[1], tag: i + 1});
            });
        }
        this.beadSpecCache = {derived, value};
        return value;
    }

    /** The board positions of the beads at the current time: the parameter of each is found from the kernel's time integral by bisection, and cached per time. */
    private beadPositions(): readonly (readonly [number, number])[] {
        const specs = this.beadSpecs();
        const time = Math.min(Math.max(this.timeValue, 0), this.tEnd());
        if (this.beadCache && this.beadCache.specs === specs && this.beadCache.time === time) return this.beadCache.value;
        const value = specs.map(spec => {
            const parameter = time >= spec.total ? spec.track.t1 : beadParameter(spec.track, spec.tStart, time);
            return flip(spec.track.point(parameter));
        });
        this.beadCache = {specs, time, value};
        return value;
    }

    private sampled(track: Track): {x: number[]; y: number[]} {
        let data = this.sampleCache.get(track);
        if (!data) {
            data = {x: [], y: []};
            for (let i = 0; i <= SAMPLES; i++) {
                const [x, y] = flip(track.point(track.t0 + ((track.t1 - track.t0) * i) / SAMPLES));
                data.x.push(x);
                data.y.push(y);
            }
            this.sampleCache.set(track, data);
        }
        return data;
    }

    // ---- Board ----------------------------------------------------------------------------------------------------------

    /** The y axis is the negative depth: no numbers above the start A, unless the track mode shows points there. */
    protected override defaultAxesAttributes() {
        const axis = this.styles.axis;
        const labelOf = axis.defaultY.ticks?.generateLabelText as ((this: object, ...label: unknown[]) => string) | undefined;
        const belowStart = (graph: DescentGraph) => function (this: object, ...label: unknown[]): string {
            const tick = label[0] as {usrCoords?: number[]} | undefined;
            if (graph.state.mode !== "track" && tick?.usrCoords && tick.usrCoords[2] > 1e-9) return "";
            return labelOf ? labelOf.apply(this, label) : "";
        };
        return {x: axis.defaultX, y: {...axis.defaultY, ticks: {...axis.defaultY.ticks, generateLabelText: belowStart(this)}}};
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("descent_graph_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A new board (also the second mount of StrictMode) starts unframed, whatever an earlier board drew.
        this.drawnFrame = "";
        this.shownView = undefined;
        this.applyFrame();
        const session = this.graphSession;
        const container = this.board.containerObj as HTMLElement | undefined;
        if (session && container && typeof ResizeObserver !== "undefined") {
            let timer: ReturnType<typeof setTimeout> | undefined;
            const observer = new ResizeObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(() => this.reframeToSize(), RESIZE_SETTLE_MS);
            });
            observer.observe(container);
            session.registerCleanup(() => { clearTimeout(timer); observer.disconnect(); });
        }
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => {
                this.stopDriver();
                this.playingValue = false;
                this.status.cancel();
                this.hostListeners.clear();
            });
            session.registerCleanup(onLanguageChange(() => { this.boardUpdate(); this.status.replace(this.statusText()); }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(previous: Readonly<DescentGraphState>): void {
        // Every edit of the scene pauses, whoever made it (a control, a drag, a lesson action, a restore): a stored field changed.
        if (STORED_FIELDS.some(key => previous[key] !== this.state[key])) this.halt();
        this.reconcileTime(previous);
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.halt();
        // A replacement (checkpoint restore, Preset import) brings its own view: build first, then mark the frame as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (this.objects.length === 0) this.buildScene();
            this.drawnFrame = frameKeyOf(this.state);
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.halt();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.objects.length === 0) this.buildScene();
        this.placeHandles();
        this.applyFrame();
        this.board.update();
        this.status.report(this.statusText());
        this.notifyHost();
    }

    /** Frames the board once per frame key. Called by the sync that follows a build, never by `buildScene` (a replacement may bring a stored view). */
    private applyFrame(): void {
        const frame = frameFor(this.state, this.derived());
        const key = frame.map(value => value.toFixed(4)).join(",");
        if (key === this.drawnFrame) return;
        this.drawnFrame = key;
        this.showFrame(frame);
    }

    /** Shows the whole frame: the box is widened to the canvas aspect around the frame's centre (a plain keep-aspect box crops one side). */
    private showFrame(frame: readonly [number, number, number, number]): void {
        const [left, top, right, bottom] = frame;
        const box = fitBoundingBox([[left, top], [right, bottom]], this.board.canvasWidth, this.board.canvasHeight);
        this.board.setBoundingBox(box ? [...box] : [...frame], true);
        this.shownView = this.viewOf();
    }

    /** The centre of the board's box: a resize keeps the centre and changes the scale and the corners, so the centre tells whether the view is still the framed one (a pan or a zoom about a point moves it). */
    private viewOf(): number[] {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        return [(left + right) / 2, (top + bottom) / 2];
    }

    /** The board's height settles after the first frame (the layout finishes): a view still on the frame we drew is framed again for the final size. A view the user moved is left alone. */
    private reframeToSize(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive || !this.shownView) return;
        const now = this.viewOf();
        const near = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * (1 + Math.abs(b));
        if (!now.every((value, index) => near(value, this.shownView![index]))) return;
        this.showFrame(frameFor(this.state, this.derived()));
        this.board.update();
    }

    private own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    /** Pixels per board unit, with a fallback when the board has no size yet. */
    private scaleOf(): {ux: number; uy: number; left: number; top: number} {
        const [left, top] = this.board.getBoundingBox();
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy, left, top};
    }

    private mode(): DescentMode { return this.state.mode; }

    private curve(data: () => {x: number[]; y: number[]}, color: string, width: number, dash: number, visible: () => boolean): void {
        const element = this.own(this.board.create("curve", [[], []], {fixed: true, highlight: false, withLabel: false, strokeColor: color, strokeWidth: width, dash, visible}));
        element.updateDataArray = () => {
            const {x, y} = data();
            element.dataX = x;
            element.dataY = y;
        };
    }

    private text(content: () => string, x: () => number, y: () => number, color: string, visible: () => boolean,
                 options: {anchorX?: "left" | "middle" | "right"; anchorY?: "top" | "middle" | "bottom"} = {}): void {
        this.own(this.board.create("text", [x, y, content], {
            strokeColor: color, fontSize: 14, anchorX: options.anchorX ?? "left", anchorY: options.anchorY ?? "middle", fixed: true, highlight: false, withLabel: false, visible,
        }));
    }

    /** A text beside a board point, shifted by a few screen pixels. */
    private tagText(content: () => string, at: () => readonly [number, number], color: string, visible: () => boolean, dx = 9, dy = 9): void {
        this.text(content, () => at()[0] + dx / this.scaleOf().ux, () => at()[1] + dy / this.scaleOf().uy, color, visible);
    }

    private handleSpecs(): HandleSpec[] {
        const field = (x: NumericField, y: NumericField, name: string, nameKey: "descent_graph_name_b" | "descent_graph_name_p1" | "descent_graph_name_p2"): HandleSpec => ({
            key: name,
            visible: () => this.mode() === "track",
            position: () => [this.state[x], -this.state[y]],
            drag: (px, py) => this.dragPoint(x, y, px, -py),
            tag: () => t("descent_graph_cap_point", {value0: t(nameKey), value1: metres(this.state[x]), value2: metres(this.state[y])}),
            color: GraphPalette.controlPoint,
        });
        const theta = (index: number, thetaField: ThetaField): HandleSpec => ({
            key: thetaField,
            visible: () => this.mode() === "tautochrone",
            position: () => {
                const d = this.derived();
                return d.mode === "tautochrone" ? flip(d.beads[index].start) : [0, 0];
            },
            drag: (_px, py) => this.dragTheta(thetaField, -py),
            tag: () => t("descent_graph_cap_bead_tag", {value0: String(index + 1)}),
            color: GraphPalette.controlPoint,
        });
        return [
            field("endX", "endY", "end", "descent_graph_name_b"), field("p1x", "p1y", "p1", "descent_graph_name_p1"), field("p2x", "p2y", "p2", "descent_graph_name_p2"),
            ...THETA_FIELDS.map((name, index) => theta(index, name)),
        ];
    }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        const state = () => this.state;
        const race = (): RaceDerived | undefined => { const d = this.derived(); return d.mode === "race" ? d : undefined; };
        const track = (): TrackDerived | undefined => { const d = this.derived(); return d.mode === "track" ? d : undefined; };
        const taut = (): TautochroneDerived | undefined => { const d = this.derived(); return d.mode === "tautochrone" ? d : undefined; };
        const empty = {x: [] as number[], y: [] as number[]};

        // The tracks. Each differs by dash as well as colour, and is named on the board.
        const lineTrack = () => race()?.tracks.line ?? track()?.line;
        this.curve(() => (lineTrack() ? this.sampled(lineTrack()!) : empty), GraphPalette.comparisonCurve, 2, 2, () => this.mode() !== "tautochrone");
        this.curve(() => (race() ? this.sampled(race()!.tracks.arc) : empty), GraphPalette.additionalCurves[1], 2, 4, () => this.mode() === "race");
        const cycloidTrack = () => race()?.tracks.cycloid ?? track()?.cycloid.track ?? taut()?.cycloid;
        this.curve(() => (cycloidTrack() ? this.sampled(cycloidTrack()!) : empty), GraphPalette.primaryCurve, 3, 0,
            () => this.mode() !== "track" || state().showCycloid);
        this.curve(() => (track() ? this.sampled(track()!.track) : empty), GraphPalette.controlPoint, 3, 0, () => this.mode() === "track");
        this.curve(() => {
            const d = track();
            return d ? {x: d.controls.map(p => p[0]), y: d.controls.map(p => -p[1])} : empty;
        }, GraphPalette.controlPolygon, 1, 1, () => this.mode() === "track");
        this.curve(() => { const guide = taut()?.arcGuide; return guide ? this.sampled(guide) : empty; }, GraphPalette.additionalCurves[1], 2, 4,
            () => this.mode() === "tautochrone" && state().showArc);

        // The names of the tracks, on the tracks.
        const onTrack = (track: Track | undefined, fraction: number): [number, number] => (track ? flip(track.point(track.t0 + fraction * (track.t1 - track.t0))) : [0, 0]);
        this.tagText(() => t("descent_graph_name_line"), () => onTrack(lineTrack(), 0.7), GraphPalette.comparisonCurve, () => this.mode() !== "tautochrone", 6, 12);
        this.tagText(() => t("descent_graph_name_arc"), () => { const centre = race()?.arcCentre ?? 0; return [centre, -centre]; }, GraphPalette.additionalCurves[1], () => this.mode() === "race", -34, -20);
        this.tagText(() => t("descent_graph_name_arc"), () => onTrack(taut()?.arcGuide, 0.5), GraphPalette.additionalCurves[1], () => this.mode() === "tautochrone" && state().showArc, -64, -4);
        this.tagText(() => t("descent_graph_name_cycloid"), () => onTrack(cycloidTrack(), 0.45), GraphPalette.primaryCurve, () => this.mode() !== "track" || state().showCycloid, 8, -14);
        this.tagText(() => t("descent_graph_name_track"), () => onTrack(track()?.track, 0.5), GraphPalette.controlPoint, () => this.mode() === "track", 8, -14);

        // The fixed points: the start A (and in the race and tautochrone the computed end).
        this.own(board.create("point", [0, 0], {
            name: "", withLabel: false, fixed: true, highlight: false, size: 4, face: "[]", fillColor: GraphPalette.label, strokeColor: GraphPalette.pointOutline,
            visible: () => this.mode() !== "tautochrone",
        }));
        this.tagText(() => t("descent_graph_name_a"), () => [0, 0], GraphPalette.label, () => this.mode() !== "tautochrone", 8, 8);
        this.own(board.create("point", [() => (race() ? race()!.end[0] : 0), () => (race() ? -race()!.end[1] : 0)], {
            name: "", withLabel: false, fixed: true, highlight: false, size: 4, face: "[]", fillColor: GraphPalette.label, strokeColor: GraphPalette.pointOutline,
            visible: () => this.mode() === "race",
        }));
        this.tagText(() => t("descent_graph_name_b"), () => (race() ? [race()!.end[0], -race()!.end[1]] : [0, 0]), GraphPalette.label, () => this.mode() === "race", 8, 8);

        // The handles: draggable, with touch-sized hit zones; the numeric fields are the keyboard path.
        this.handles = this.handleSpecs().map(spec => {
            const [x, y] = spec.position();
            const point = this.own(board.create("point", [x, y], {
                name: "", withLabel: false, size: 7, face: "o", fillColor: spec.color, strokeColor: GraphPalette.pointOutline, highlightFillColor: GraphPalette.selectedControlPoint,
                snapToGrid: false, showInfobox: false, visible: spec.visible,
                precision: {touch: HANDLE_TOUCH_RADIUS, mouse: HANDLE_MOUSE_RADIUS, pen: HANDLE_TOUCH_RADIUS},
            }));
            const onDrag = () => spec.drag(point.X(), point.Y());
            const onOver = () => { board.containerObj.style.cursor = "pointer"; };
            const onOut = () => { board.containerObj.style.cursor = "default"; };
            point.on("drag", onDrag);
            point.on("over", onOver);
            point.on("out", onOut);
            this.offs.push(() => { point.off("drag", onDrag); point.off("over", onOver); point.off("out", onOut); });
            this.tagText(spec.tag, () => spec.position(), spec.color, spec.visible, 10, 10);
            return {spec, point};
        });

        // The beads: a pool, each reading its place at the elapsed time.
        for (let i = 0; i < 6; i++) {
            const color = () => this.beadSpecs()[i]?.color ?? GraphPalette.label;
            this.own(board.create("point", [() => this.beadPositions()[i]?.[0] ?? 0, () => this.beadPositions()[i]?.[1] ?? 0], {
                name: "", withLabel: false, fixed: true, highlight: false, size: 5, face: "o", strokeColor: GraphPalette.label, strokeWidth: 1, fillColor: () => color(),
                visible: () => this.beadSpecs()[i] !== undefined,
            }) as JXG.Point);
            this.tagText(() => String(this.beadSpecs()[i]?.tag ?? ""), () => this.beadPositions()[i] ?? [0, 0], GraphPalette.label, () => (this.beadSpecs()[i]?.tag ?? 0) > 0, 8, -12);
        }

        // The captions, stacked from the top left of the screen: only the visible ones take a row. They name every element a readout names.
        const captions: readonly {text: () => string; visible: () => boolean; color: string}[] = [
            {text: () => t("descent_graph_cap_units", {value0: dec(G, 2)}), visible: () => true, color: GraphPalette.label},
            {text: () => t("descent_graph_cap_bead", {value0: seconds(Math.min(this.timeValue, this.tEnd()))}), visible: () => true, color: GraphPalette.label},
            ...(["line", "arc", "cycloid"] as const).map(id => ({
                text: () => this.timeRow(id), visible: () => this.mode() === "race", color: this.trackColor(id),
            })),
            {text: () => t("descent_graph_cap_winner", {value0: t(NAME_KEYS[race()?.winner ?? "cycloid"])}), visible: () => this.mode() === "race", color: GraphPalette.label},
            {text: () => t("descent_graph_cap_end_computed", {value0: metres(race()?.end[0] ?? 0), value1: metres(race()?.end[1] ?? 0)}), visible: () => this.mode() === "race", color: GraphPalette.label},
            {text: () => this.timeRow("track"), visible: () => this.mode() === "track", color: this.trackColor("track")},
            {text: () => this.timeRow("cycloid"), visible: () => this.mode() === "track" && state().showCycloid, color: this.trackColor("cycloid")},
            {text: () => this.timeRow("line"), visible: () => this.mode() === "track", color: this.trackColor("line")},
            {text: () => this.differenceCaption(), visible: () => this.mode() === "track" && track()?.difference !== undefined && state().showCycloid, color: GraphPalette.label},
            {text: () => t("descent_graph_cap_closed_form", {value0: seconds(taut()?.closedForm ?? 0)}), visible: () => this.mode() === "tautochrone", color: GraphPalette.label},
            ...[0, 1, 2].map(i => ({text: () => this.beadRow(i), visible: () => this.mode() === "tautochrone", color: GraphPalette.primaryCurve})),
            ...[0, 1, 2].map(i => ({
                text: () => t("descent_graph_cap_arc_row", {value0: String(i + 1), value1: seconds(taut()?.beads[i].arc?.time ?? 0)}),
                visible: () => this.mode() === "tautochrone" && taut()?.beads[i].arc !== undefined, color: GraphPalette.additionalCurves[1],
            })),
        ];
        captions.forEach((caption, index) => {
            const row = () => captions.slice(0, index).filter(other => other.visible()).length;
            this.text(
                () => caption.text(),
                () => { const {left, ux} = this.scaleOf(); return left + 10 / ux; },
                () => { const {top, uy} = this.scaleOf(); return top - (10 + row() * 20) / uy; },
                caption.color, caption.visible, {anchorY: "top"},
            );
        });
    }

    private trackColor(id: TrackName): string {
        switch (id) {
            case "line": return GraphPalette.comparisonCurve;
            case "arc": return GraphPalette.additionalCurves[1];
            case "cycloid": return GraphPalette.primaryCurve;
            case "track": return GraphPalette.controlPoint;
        }
    }

    /** The computed time of a named track, or undefined (a track that is not timed). */
    private timeOf(id: TrackName): number | undefined {
        const d = this.derived();
        if (d.mode === "race") return id === "track" ? undefined : d.times[id];
        if (d.mode === "track") return id === "track" ? d.time : id === "line" ? d.lineTime : id === "cycloid" ? d.cycloid.time : undefined;
        return undefined;
    }

    private timeRow(id: TrackName): string {
        const time = this.timeOf(id);
        const name = t(NAME_KEYS[id]);
        return time === undefined ? t("descent_graph_cap_no_time_row", {value0: name}) : t("descent_graph_cap_time_row", {value0: name, value1: seconds(time)});
    }

    private beadRow(i: number): string {
        const d = this.derived();
        if (d.mode !== "tautochrone") return "";
        const bead = d.beads[i];
        return bead.status === "at-bottom"
            ? t("descent_graph_cap_bead_row_bottom", {value0: String(i + 1)})
            : t("descent_graph_cap_bead_row", {value0: String(i + 1), value1: thetaText(bead.theta), value2: seconds(bead.time)});
    }

    private differenceCaption(): string {
        const d = this.derived();
        if (d.mode !== "track" || d.difference === undefined || d.differencePercent === undefined) return "";
        return t("descent_graph_cap_difference", {value0: seconds(d.difference), value1: dec(d.differencePercent, 1)});
    }

    private disposeScene(): void {
        for (const off of this.offs.splice(0)) off();
        if (this.hasBoard) {
            const board = this.board;
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
        this.handles = [];
    }

    // ---- Dragging: the one place that snaps -------------------------------------------------------------------------------

    private placeHandles(): void {
        for (const {spec, point} of this.handles) {
            const [x, y] = spec.position();
            if (point.X() !== x || point.Y() !== y) point.setPosition(JXG.COORDS_BY_USER, [x, y]);
        }
    }

    /** Drag only: the point snaps to the nearest grid value inside the range; typed values are refused instead (see `editNumber`). */
    private dragPoint(xField: NumericField, yField: NumericField, x: number, depth: number): void {
        const sx = snapDrag(xField, x);
        const sy = snapDrag(yField, depth);
        if (sx !== this.state[xField] || sy !== this.state[yField]) this.edit({[xField]: sx, [yField]: sy});
        this.placeHandles();
    }

    /** The handle follows the cycloid: the parameter comes from the depth, depth = r (1 - cos θ), then snaps to its grid. */
    private dragTheta(field: ThetaField, depth: number): void {
        const ratio = Math.min(Math.max(depth / this.state.radius, 0), 2);
        const theta = snapDrag(field, Math.acos(1 - ratio));
        if (theta !== this.state[field]) this.edit({[field]: theta});
        this.placeHandles();
    }

    // ---- Playback and the time -------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private stopDriver(): void {
        this.driver?.dispose();
        this.driver = undefined;
    }

    /** Stops the frame loop; the time stays where it is. */
    private halt(): void {
        this.stopDriver();
        if (!this.playingValue) return;
        this.playingValue = false;
        this.notifyHost();
    }

    override pausePlayback(): void {
        this.halt();
        if (this.hasBoard && this.graphSession?.isAlive) this.status.report(this.statusText());
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from the current time (from 0 at the end). Under reduced motion nothing moves; the slider still sets the time. */
    play(): void {
        if (this.playingValue || this.reducedMotion() || !this.hasBoard || !this.graphSession?.isAlive || !(this.tEnd() > 0)) return;
        if (this.timeValue >= this.tEnd()) this.timeValue = 0;
        this.playingValue = true;
        this.driver = new AnimationDriver(delta => this.advance(delta), this.animationScheduler());
        this.driver.play();
        this.boardUpdate();
        this.notifyHost();
    }

    private advance(delta: number): void {
        if (!this.playingValue || !this.graphSession?.isAlive) return;
        const end = this.tEnd();
        this.timeValue = Math.min(end, this.timeValue + Math.min(Math.max(delta, 0), MAX_FRAME_MS) / 1000);
        const finished = this.timeValue >= end;
        if (finished) this.halt();
        this.boardUpdate();
        // While playing only a change of the wording is announced; the moment the run stops the full sentence is.
        this.status.report(finished ? this.statusText() : this.sentence());
        this.notifyHost();
    }

    /** The time slider and the lesson actions: a time inside the run; anything else is refused. Setting it pauses the playback. */
    setTime(value: number): boolean {
        const end = this.tEnd();
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > end + TIME_SLACK) return false;
        this.halt();
        this.timeValue = Math.min(value, end);
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.requestRender();
        return true;
    }

    resetTime(): void {
        this.halt();
        this.timeValue = 0;
        this.boardUpdate();
        this.status.report(this.statusText());
        this.notifyHost();
        this.requestRender();
    }

    /**
     * A changed mode starts again at t = 0 and a change that shortens the run shortens the time; both are said in the status text.
     * Runs after every state change, once per state object.
     */
    private reconcileTime(previous: Readonly<DescentState>): void {
        const state = this.state;
        if (this.reconciledFor === state) return;
        this.reconciledFor = state;
        if (previous.mode !== state.mode) {
            this.halt();
            this.timeValue = 0;
            this.notice = {state, text: () => t("descent_graph_notice_reset")};
        } else {
            const end = this.tEnd();
            if (this.timeValue > end) {
                this.halt();
                this.timeValue = end;
                this.notice = {state, text: () => t("descent_graph_notice_clamped", {value0: dec(end, 2)})};
            }
        }
        this.notifyHost();
    }

    /** The time of a lesson checkpoint; playback is never captured. */
    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), descentTime: this.timeValue};
    }

    /** Every scene replacement lands stopped, at the saved time when it is valid and at t = 0 otherwise. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const time = saved?.descentTime;
        this.halt();
        this.notice = undefined;
        const valid = typeof time === "number" && Number.isFinite(time) && time >= 0 && time <= this.tEnd();
        // A saved time that does not fit the run is refused, not clamped (restored values are never changed); the time is 0 and the status says so.
        this.timeValue = valid ? time : 0;
        this.reconciledFor = this.state;
        if (time !== undefined && !valid) this.notice = {state: this.state, text: () => t("descent_graph_notice_time_refused")};
        this.notifyHost();
    }

    protected override stopLessonAnimations(): void { this.halt(); }

    protected override beforeFigureCapture(): void { this.halt(); }

    // ---- Editing --------------------------------------------------------------------------------------------------------

    /** Every edit pauses the playback first, then writes the patch. */
    private edit(patch: Partial<DescentState>): void {
        this.halt();
        const before = this.state;
        this.setState(patch);
        this.reconcileTime(before);
        this.requestRender();
    }

    editMode(mode: DescentMode): void {
        if (mode !== this.state.mode) this.edit({mode});
    }

    /** Typed numbers: stored exactly as given when on the grid and inside the range, otherwise refused (false), never rounded or clamped. */
    editNumber(field: NumericField, value: number): boolean {
        const checked = checkField(field, value);
        if (!checked.ok) return false;
        if (checked.value !== this.state[field]) this.edit({[field]: checked.value});
        return true;
    }

    /** A step key on a start parameter: a step is a gesture and not typed text, so it lands on the nearest value of the grid (and π after 3,1). */
    private stepTheta(field: ThetaField, value: number): boolean {
        const next = snapDrag(field, value);
        if (next !== this.state[field]) this.edit({[field]: next});
        return true;
    }

    editToggle(field: ToggleField, on: boolean): void {
        if (this.state[field] !== on) this.edit({[field]: on});
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------

    private differenceText(d: TrackDerived): string {
        return d.difference === undefined || d.differencePercent === undefined ? ""
            : t("descent_graph_value_difference", {value0: seconds(d.difference), value1: dec(d.differencePercent, 1)});
    }

    private trackStatusText(d: TrackDerived): string {
        return t(d.status === "ok" ? "descent_graph_status_track_ok" : d.status === "above-start" ? "descent_graph_status_above_start" : "descent_graph_status_never_starts");
    }

    /** The wording of the result at the current state, with the notice; no elapsed time in it. */
    sentence(): string {
        const d = this.derived();
        const parts: string[] = [];
        if (d.mode === "race") {
            parts.push(t("descent_graph_sentence_race", {value0: t(NAME_KEYS[d.winner]), value1: seconds(d.times[d.winner]), value2: dec(d.lineSlowerPercent, 1)}));
        } else if (d.mode === "track") {
            parts.push(d.status === "ok" && d.difference !== undefined && d.differencePercent !== undefined
                ? t("descent_graph_sentence_track", {value0: seconds(d.time ?? 0), value1: seconds(d.difference), value2: dec(d.differencePercent, 1)})
                : this.trackStatusText(d));
            parts.push(t("descent_graph_sentence_points", {
                value0: metres(this.state.endX), value1: metres(this.state.endY), value2: metres(this.state.p1x), value3: metres(this.state.p1y),
                value4: metres(this.state.p2x), value5: metres(this.state.p2y),
            }));
        } else {
            const timed = d.beads.filter(bead => bead.status === "ok");
            const bottom = d.beads.flatMap((bead, i) => (bead.status === "at-bottom" ? [String(i + 1)] : []));
            if (timed.length > 0) {
                const same = new Set(timed.map(bead => dec(bead.time, 4))).size === 1;
                parts.push(same
                    ? t("descent_graph_sentence_taut_equal", {value0: seconds(timed[0].time)})
                    : t("descent_graph_sentence_taut_differ", {value0: listText(timed.map(bead => seconds(bead.time)))}));
            }
            if (bottom.length > 0) parts.push(t("descent_graph_sentence_bottom", {value0: listText(bottom)}));
            const arcs = d.beads.flatMap(bead => (bead.arc ? [seconds(bead.arc.time)] : []));
            if (arcs.length > 0) parts.push(t("descent_graph_sentence_arc", {value0: listText(arcs)}));
        }
        if (this.notice && this.notice.state === this.state) parts.push(this.notice.text());
        return parts.join(" ");
    }

    /** The status sentence: the elapsed time, the result, and that the run has ended. */
    statusText(): string {
        const time = Math.min(this.timeValue, this.tEnd());
        const ended = time >= this.tEnd() && !this.playingValue;
        return [t("descent_graph_status_time", {value0: dec(time, 2)}), this.sentence(), ended ? t("descent_graph_status_ended") : ""].filter(Boolean).join(" ");
    }

    readoutRows(): ReadoutListRow[] {
        const d = this.derived();
        const s = this.state;
        const time = Math.min(this.timeValue, d.tEnd);
        const rows: ReadoutListRow[] = [{id: "time", label: t("descent_graph_r_time"), value: `${dec(time, 2)} ${t("descent_graph_unit_s")}`}];
        const timeLabel = (id: TrackName) => t("descent_graph_r_time_of", {value0: t(NAME_KEYS[id])});
        if (d.mode === "race") {
            rows.push(
                {id: "end", label: t("descent_graph_r_end"), value: pointText(d.end[0], d.end[1])},
                {id: "time-line", label: timeLabel("line"), value: seconds(d.times.line)},
                {id: "time-arc", label: timeLabel("arc"), value: seconds(d.times.arc)},
                {id: "time-cycloid", label: timeLabel("cycloid"), value: seconds(d.times.cycloid)},
                {id: "winner", label: t("descent_graph_r_winner"), value: t(NAME_KEYS[d.winner])},
                {id: "line-slower", label: t("descent_graph_r_line_slower"), value: `${dec(d.lineSlowerPercent, 1)} %`},
                {id: "radius", label: t("descent_graph_r_radius"), value: `${dec(d.radius, 2)} ${t("descent_graph_unit_m")}`},
            );
        } else if (d.mode === "track") {
            const named = (name: "descent_graph_name_b" | "descent_graph_name_p1" | "descent_graph_name_p2", x: number, y: number, id: string) =>
                ({id, label: t("descent_graph_r_point", {value0: t(name)}), value: pointText(x, y)});
            rows.push(
                named("descent_graph_name_b", s.endX, s.endY, "point-b"), named("descent_graph_name_p1", s.p1x, s.p1y, "point-p1"),
                named("descent_graph_name_p2", s.p2x, s.p2y, "point-p2"),
                {id: "status", label: t("descent_graph_r_status"), value: this.trackStatusText(d)},
                {id: "time-track", label: timeLabel("track"), value: d.time === undefined ? t("descent_graph_not_timed") : seconds(d.time)},
                {id: "time-line", label: timeLabel("line"), value: seconds(d.lineTime)},
                {id: "time-cycloid", label: timeLabel("cycloid"), value: seconds(d.cycloid.time)},
                {id: "cycloid-theta", label: t("descent_graph_r_cycloid_theta"), value: `${dec(d.cycloid.theta, 4)} ${t("descent_graph_unit_rad")}`},
                {id: "cycloid-radius", label: t("descent_graph_r_cycloid_radius"), value: `${dec(d.cycloid.r, 4)} ${t("descent_graph_unit_m")}`},
                {id: "difference", label: t("descent_graph_r_difference"), value: d.difference === undefined ? t("descent_graph_not_timed") : this.differenceText(d)},
            );
        } else {
            rows.push({id: "radius", label: t("descent_graph_r_radius"), value: `${dec(d.radius, 2)} ${t("descent_graph_unit_m")}`});
            d.beads.forEach((bead, i) => {
                const index = String(i + 1);
                rows.push({
                    id: `bead-${index}`, label: t("descent_graph_r_bead_time", {value0: index}),
                    value: bead.status === "at-bottom" ? t("descent_graph_value_at_bottom", {value0: thetaText(bead.theta)}) : t("descent_graph_value_bead_row", {value0: thetaText(bead.theta), value1: t("descent_graph_unit_rad"), value2: seconds(bead.time)}),
                });
                if (bead.arc) rows.push({id: `arc-${index}`, label: t("descent_graph_r_arc_time", {value0: index}), value: seconds(bead.arc.time)});
            });
            rows.push({id: "closed-form", label: t("descent_graph_r_closed_form"), value: seconds(d.closedForm)});
        }
        rows.push({id: "gravity", label: t("descent_graph_r_g"), value: `${dec(G, 2)} ${t("descent_graph_unit_accel")}`});
        return rows;
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------

    private numberField(field: NumericField, helpKey: "descent_graph_radius_help" | "descent_graph_x_help" | "descent_graph_depth_help" | "descent_graph_control_depth_help"
        | "descent_graph_theta_help"): JSX.Element {
        const range = FIELD_RANGES[field];
        const theta = (THETA_FIELDS as readonly string[]).includes(field);
        const params = {value0: dec(range.min, 2), value1: dec(range.max, theta ? 1 : 2), value2: dec(range.step, 2)};
        const thetaField = theta ? field as ThetaField : undefined;
        return <NumberInput key={field} label={t(FIELD_LABEL_KEYS[field])} value={this.state[field]} step={range.step} bigStep={theta ? 0.5 : 1}
                            min={range.min} max={theta ? Math.PI : range.max} decimals={2} help={t(helpKey, params)}
                            rejectedHint={t(theta ? "descent_graph_theta_rejected" : "descent_graph_field_rejected", params)}
                            onChange={value => this.editNumber(field, value)}
                            onStepChange={thetaField ? value => this.stepTheta(thetaField, value) : undefined}/>;
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <ChoiceSelect key="mode" label={t("descent_graph_mode_label")} value={state.mode} help={t("descent_graph_mode_help")}
                          options={DESCENT_MODES.map(value => ({value, text: t(MODE_KEYS[value])}))}
                          onChange={value => { const mode = DESCENT_MODES.find(candidate => candidate === value); if (mode) this.editMode(mode); }}/>,
        ];
        if (state.mode === "race") commands.push(this.numberField("radius", "descent_graph_radius_help"));
        else if (state.mode === "track") {
            commands.push(
                this.numberField("endX", "descent_graph_x_help"), this.numberField("endY", "descent_graph_depth_help"),
                this.numberField("p1x", "descent_graph_x_help"), this.numberField("p1y", "descent_graph_control_depth_help"),
                this.numberField("p2x", "descent_graph_x_help"), this.numberField("p2y", "descent_graph_control_depth_help"),
                <BooleanField key="showCycloid" variant="switch" label={t("descent_graph_show_cycloid")} help={t("descent_graph_show_cycloid_help")}
                              checked={state.showCycloid} onChange={on => this.editToggle("showCycloid", on)}/>,
            );
        } else {
            commands.push(
                this.numberField("radius", "descent_graph_radius_help"),
                this.numberField("theta1", "descent_graph_theta_help"), this.numberField("theta2", "descent_graph_theta_help"), this.numberField("theta3", "descent_graph_theta_help"),
                <BooleanField key="showArc" variant="switch" label={t("descent_graph_show_arc")} help={t("descent_graph_show_arc_help")}
                              checked={state.showArc} onChange={on => this.editToggle("showArc", on)}/>,
            );
        }
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <DescentPlayback graph={this}/>
            <DescentReadout graph={this}/>
        </>;
    }
}

/** Play or pause, reset and the time slider: host state, so only this part re-renders on a frame. */
function DescentPlayback(props: {graph: DescentGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    useReducedMotion(); // follows a system change; the graph's own reducedMotion() is read below
    const end = graph.derived().tEnd;
    const time = Math.min(graph.time, end);
    const playing = graph.playing;
    const params = {value0: dec(end, 2), value1: dec(TIME_STEP, 2)};
    const runs = end > 0;
    const noRun = text("descent_graph_no_run");
    const blocks = playbackBlocks({ready: runs, atStart: time === 0, atEnd: false, playing});
    const playBlock = runs && !playing && graph.reducedMotion() ? "reduced-motion" : blocks.playBlock;
    return <div className="inspector-group">
        <PlaybackButtons reducedMotionReason={text("playback_block_reduced_motion_time")}
                         placement="graph" groupLabel={text("descent_graph_playback_group")} playing={playing} noRunReason={noRun}
                         onPlayPause={() => (graph.playing ? graph.pausePlayback() : graph.play())} onReset={() => graph.resetTime()}
                         {...blocks} playBlock={playBlock} describedBy={playBlock === "reduced-motion" ? {"play-pause": REDUCED_REASON_ID} : undefined}/>
        {playBlock === "reduced-motion" && <p id={REDUCED_REASON_ID} className="inspector-help">{text("playback_block_reduced_motion_time")}</p>}
        <Slider customText={text("descent_graph_time_label")} min={0} max={end} step={TIME_STEP} grid={TIME_STEP} bigStep={TIME_BIG_STEP} value={time}
                unavailableReason={runs ? undefined : noRun}
                help={text("descent_graph_time_help", params)} rejectedHint={text("descent_graph_time_rejected", {value0: params.value0})}
                valueText={value => `${dec(value, 2)} ${text("descent_graph_unit_s")}`} onChange={value => graph.setTime(value)}/>
    </div>;
}

/** The status sentence, the labelled values and the one announcement region (silent while the run plays). */
function DescentReadout(props: {graph: DescentGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    return <div className="inspector-group">
        <ReadoutHeading>{text("descent_graph_readout_title")}</ReadoutHeading>
        <p data-descent-status="">{graph.statusText()}</p>
        <ReadoutList label={text("descent_graph_readout_title")} rows={graph.readoutRows()}/>
        <ReadoutHelp hooks={{"data-descent-hint": ""}}>{text("descent_graph_depth_hint")}</ReadoutHelp>
        <LiveReadout readout={graph.status} muted={graph.playing}/>
    </div>;
}

export default DescentGraph;
