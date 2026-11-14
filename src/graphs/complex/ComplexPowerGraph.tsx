import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {SceneStateUpdate} from "../base/SceneStore";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {Preset, StoredGraphState} from "../base/presets/Presets";
import {DomainError} from "../functions/BaseFunctionGraph";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {formatComplex} from "../../analysis/complexFormat";
import {COMPLEX_POWER_MAX} from "../../analysis/complexPower";
import {PointListInput} from "../../inputs/PointListInput";
import {CountSetter} from "../../inputs/CountSetter";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {prefersReducedMotion, ReducedMotion} from "../base/controls/reducedMotion";
import {GraphPalette} from "../styles/GraphPalette";
import {SceneObjects} from "../recursion/SceneObjects";
import {legendStackOffsetPx} from "../legend/legendStack";
import {keepOpeningView} from "./openingView";
import {AnimationScheduler} from "../../learning/runtime/animation";
import {IterationController} from "../../learning/runtime/iterationController";
import {
    applyComplexPowerAction, arrowToward, ComplexPowerAction, ComplexPowerDerived, ComplexPowerState, coordinateOf, DEFAULT_COMPLEX_POWER_STATE,
    deriveComplexPower, ExactFraction, ExactRadical, insideView, N_RANGE, snapDragCoordinate, superscript, typedCoordinate, typedExponent,
    Z_RANGE, Z_SCALE, zOf,
} from "../../complex/complexPowerModel";
import {complexPowerPresetCollection, complexPowerPresetData, ComplexPowerPresetData} from "./complexPowerPresetCollection";

/** The scene state: the stored fields of `ComplexPowerState`, nothing derived and no playback. */
export interface ComplexPowerGraphState extends BaseGraphState, ComplexPowerState {}

/** Time between two playback steps. A playback setting, not stored: a reopened Preset is paused. */
export const STEP_INTERVAL_MS = 700;
export const HANDLE_SIZE = 6;
/** The board: the powers are drawn in [-VIEW_LIMIT, VIEW_LIMIT]; the rows below hold the legend. */
export const VIEW_BOX: readonly [number, number, number, number] = [-2.6, 2.6, 2.6, -3.9];
/** The four legend rows are always shown (no gaps); 8 + 3 * 16 + 14 px fit below the powers' frame on a board 400 px high. */
export const ROW_PX = 16;
const UNIT_CIRCLE_DASH = 3;
const UNIT_CIRCLE_SAMPLES = 128;

const dec = (value: number, digits = 6): string => formatNumber(value, currentLanguage(), digits);

const sameContent = (a: ComplexPowerState, b: ComplexPowerState): boolean => a.A === b.A && a.B === b.B && a.n === b.n;
/** The same fields except the exponent: what a playing run may not have changed under it. */
const sameParameters = (a: ComplexPowerState, b: ComplexPowerState): boolean => a.A === b.A && a.B === b.B;

interface Poly {
    readonly x: number[];
    readonly y: number[];
}

/**
 * The complex-power graph (complex-maps spec M6, de Moivre, ADR 0058): z on the 0.05 grid in [-2, 2] and the exponent n from 1 to 8;
 * the powers z, z^2, ..., z^n lie on a circle (|z| = 1) or a spiral and are joined by a path. The stored state is `ComplexPowerState`
 * (z = (A + B i) / 20 and n); everything else is derived (`derived()`), keyed on the stored content.
 *
 * Statements decided in integer grid units (z^n real, on the unit circle, equal to 1, the real and imaginary parts and the modulus
 * of z^n as fractions and radicals) are labelled exact; the unwrapped angle, the principal argument and every rounded decimal are
 * computed and labelled so. A power beyond the view is drawn as an arrow toward it with its modulus as text.
 *
 * Ownership: every board object goes through `scene`, which removes the objects and the drag listeners with the scene. The playback
 * is an `IterationController` created on demand and disposed with the scene and on unmount; it is not stored.
 */
export class ComplexPowerGraph extends BaseGraph<ComplexPowerGraphState, ComplexPowerPresetData> {
    private readonly scene = new SceneObjects();
    private handle?: JXG.Point;
    private built = false;
    private cache?: {state: ComplexPowerGraphState; value: ComplexPowerDerived};
    private controller?: IterationController;
    private derivations = 0;
    private readonly status = new SettledReadout();

    override getInitialState(): ComplexPowerGraphState {
        return {initialized: false, ...DEFAULT_COMPLEX_POWER_STATE};
    }

    protected override lessonDefaultState(): ComplexPowerGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    override presetCollection(): PresetCollection<ComplexPowerPresetData> {
        return complexPowerPresetCollection;
    }

    override defaultPreset(): ComplexPowerPresetData {
        return complexPowerPresetData(DEFAULT_COMPLEX_POWER_STATE);
    }

    /** A Preset keeps the whole state in `data`; its `graphState` only marks it initialized (the collection refuses any other field). */
    override exportPreset(): Preset<ComplexPowerPresetData> {
        return {...super.exportPreset(), graphState: {initialized: true}};
    }

    /** A figure scene, Preset selection and Reset take the state from the data just imported, not from the stored `graphState`. */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined, data?: unknown): ComplexPowerGraphState {
        const {A, B, n} = this.state;
        return {...super.figurePresetGraphState(graphState, data), A, B, n, initialized: true};
    }

    override exportPresetData(): ComplexPowerPresetData {
        return complexPowerPresetData(this.state);
    }

    override importPresetData(data: ComplexPowerPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "ComplexPower") return;
        const A = typedCoordinate(entry[1].re, "re");
        const B = typedCoordinate(entry[1].im, "im");
        const n = typedExponent(entry[1].n, "n");
        if (A.ok && B.ok && n.ok) this.setState({A: A.value, B: B.value, n: n.value});
    }

    protected override initialView(): [number, number, number, number] {
        return [...VIEW_BOX];
    }

    // ---- Derived numbers: a cache keyed by the stored content ----------------------------------------------------------------

    derived(): ComplexPowerDerived {
        const state = this.state;
        if (this.cache && this.cache.state === state) return this.cache.value;
        if (this.cache && sameContent(this.cache.state, state)) {
            this.cache = {state, value: this.cache.value};
            return this.cache.value;
        }
        this.derivations++;
        this.cache = {state, value: deriveComplexPower(state)};
        return this.cache.value;
    }

    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    derivationCount(): number { return this.derivations; }
    dragHandle(): JXG.Point | undefined { return this.handle; }
    isPlaying(): boolean { return this.controller?.isPlaying() ?? false; }

    // ---- Board ----------------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("complex_power_graph_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // The still unit circle is skipped by regular updates and has no data yet on the first build: one full update draws it.
        this.board.fullUpdate();
        const session = this.graphSession;
        if (this.hasBoard) keepOpeningView(this.board, session, () => this.showInitialView());
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => { this.disposeController(); this.status.cancel(); });
            session.registerCleanup(onLanguageChange(() => {
                this.status.replace(this.statusText());
                if (this.hasBoard && session.isAlive) this.board.update();
            }));
        }
        this.status.replace(this.statusText());
    }

    /** True while the playback's own tick writes the exponent; a write at any other time while playing came from outside. */
    private ticking = false;
    private outsideWrite = false;

    override setState(update: SceneStateUpdate<ComplexPowerGraphState>, callback?: () => void): void {
        if (!this.ticking && this.isPlaying()) this.outsideWrite = true;
        super.setState(update, callback);
    }

    protected override onStateChange(previous: Readonly<ComplexPowerGraphState>): void {
        // A playing run raises n by exactly one and nothing else, written by its own tick; any other write (a lesson action, a restore), even of n + 1, pauses it.
        // A write that changes no stored field (the host's `initialized`) leaves a playing run alone.
        const outside = this.outsideWrite;
        this.outsideWrite = false;
        const changed = !sameContent(previous, this.state);
        if (this.isPlaying() && changed && (outside || !(sameParameters(previous, this.state) && this.state.n === previous.n + 1))) this.pausePlayback();
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.pausePlayback();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.pausePlayback();
        this.disposeScene();
    }

    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (!this.built) this.buildScene();
        this.placeHandle();
        this.board.update();
        this.status.report(this.statusText());
    }

    private placeHandle(): void {
        const z = zOf(this.state);
        if (this.handle && (this.handle.X() !== z.re || this.handle.Y() !== z.im)) this.handle.setPosition(JXG.COORDS_BY_USER, [z.re, z.im]);
    }

    /** Pixels per board unit, with a fallback when the board has no size yet. */
    private scaleOf(): {ux: number; uy: number} {
        const ux = Number.isFinite(this.board.unitX) && this.board.unitX > 0 ? this.board.unitX : 1;
        const uy = Number.isFinite(this.board.unitY) && this.board.unitY > 0 ? this.board.unitY : 1;
        return {ux, uy};
    }

    private curve(data: () => Poly, color: string, width: number, dash: number, options: {still?: boolean; visible?: () => boolean} = {}): JXG.Curve {
        const still = options.still ?? false;
        const element = this.scene.own(this.board.create("curve", [[], []], {
            highlight: false, fixed: true, withLabel: false, strokeColor: color, strokeWidth: width, dash, needsRegularUpdate: !still,
            visible: options.visible ?? true,
        }));
        element.updateDataArray = () => {
            const {x, y} = data();
            element.dataX = x;
            element.dataY = y;
        };
        // A still curve is skipped by every board update: draw it once now (otherwise it stays empty).
        if (still) {
            element.needsUpdate = true;
            element.update().updateRenderer();
        }
        return element;
    }

    /** A caption at a board point plus a pixel offset (up is positive); `dy` below the point is negative. */
    private caption(x: () => number, y: () => number, dx: number | (() => number), dy: number | (() => number), text: () => string, color: string, options: {
        visible?: () => boolean; anchorX?: "left" | "right"; anchorY?: "top" | "bottom";
        /** A legend row: it gets the board's own background, so the axis and its tick labels do not run through its text. */
        legend?: boolean;
    } = {}): void {
        this.scene.own(this.board.create("text", [
            () => x() + (typeof dx === "number" ? dx : dx()) / this.scaleOf().ux,
            () => y() + (typeof dy === "number" ? dy : dy()) / this.scaleOf().uy, text,
        ], {
            strokeColor: color, fontSize: 14, anchorX: options.anchorX ?? "left", anchorY: options.anchorY ?? "bottom", fixed: true, highlight: false, withLabel: false,
            ...(options.legend ? {cssStyle: "background: rgba(255, 253, 245, 0.88); padding: 0 2px; border-radius: 2px;"} : {}),
            visible: options.visible ?? (() => true),
        }));
    }

    /** The k-th power of z (k from 1), or the origin for a power beyond n. */
    private power(k: number): {re: number; im: number} {
        return this.derived().powers[k - 1] ?? {re: 0, im: 0};
    }

    /** Whether the k-th power is drawn (k from 2 to n) and whether it is inside the view. */
    private drawn(k: number): boolean { return k <= this.state.n; }
    private drawnInside(k: number): boolean { return this.drawn(k) && insideView(this.power(k)); }
    private drawnOutside(k: number): boolean { return this.drawn(k) && !insideView(this.power(k)); }

    private buildScene(): void {
        this.disposeScene();
        const board = this.board;
        this.built = true;
        const ks = Array.from({length: COMPLEX_POWER_MAX - 1}, (_unused, i) => i + 2);

        // The unit circle (dashed), the path through the powers (solid; it breaks where a power is beyond the view), the arrows to the powers beyond the view, then the powers.
        this.curve(() => {
            const x: number[] = [];
            const y: number[] = [];
            for (let i = 0; i <= UNIT_CIRCLE_SAMPLES; i++) {
                const angle = (2 * Math.PI * i) / UNIT_CIRCLE_SAMPLES;
                x.push(Math.cos(angle));
                y.push(Math.sin(angle));
            }
            return {x, y};
        }, GraphPalette.referenceCurve, 2, UNIT_CIRCLE_DASH, {still: true});
        this.curve(() => {
            const x: number[] = [];
            const y: number[] = [];
            const {powers} = this.derived();
            powers.forEach((p, i) => {
                const previous = powers[i - 1];
                if (!insideView(p) || (previous !== undefined && !insideView(previous))) { x.push(NaN); y.push(NaN); }
                if (insideView(p)) { x.push(p.re); y.push(p.im); }
            });
            return {x, y};
        }, GraphPalette.comparisonCurve, 2, 0);
        for (const k of ks) {
            // An arrow from the origin side toward the power beyond the view; the ends follow the derived power.
            const arrow = this.scene.own(board.create("arrow", [
                [() => arrowToward(this.power(k)).tail.re, () => arrowToward(this.power(k)).tail.im],
                [() => arrowToward(this.power(k)).tip.re, () => arrowToward(this.power(k)).tip.im],
            ], {
                strokeColor: GraphPalette.additionalCurves[1], strokeWidth: 2, highlight: false, fixed: true, withLabel: false, visible: () => this.drawnOutside(k),
            }));
            // The arrow creates its two end points from the coordinate functions: they are owned too, or they would outlive the scene.
            this.scene.own(arrow.point1);
            this.scene.own(arrow.point2);
        }
        for (const k of ks) {
            this.scene.own(board.create("point", [() => this.power(k).re, () => this.power(k).im], {
                fixed: true, highlight: false, withLabel: false, name: "", face: "diamond", size: 5, fillColor: GraphPalette.additionalCurves[1],
                strokeColor: GraphPalette.pointOutline, showInfobox: false, visible: () => this.drawnInside(k),
            }));
        }
        const z = zOf(this.state);
        const handle = this.scene.own(board.create("point", [z.re, z.im], {
            withLabel: false, name: "", face: "circle", size: HANDLE_SIZE, fillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.pointOutline,
            highlightFillColor: GraphPalette.selectedControlPoint, snapToGrid: false, showInfobox: false,
        }));
        this.handle = handle;
        this.wireDrag(handle);

        // A caption for every element a readout names: z, each power, the powers beyond the view, z = 0, and the legend of the styles.
        this.caption(() => zOf(this.state).re, () => zOf(this.state).im, 8, 8, () => t("complex_power_graph_cap_z", {value0: formatComplex(zOf(this.state), currentLanguage())}),
            GraphPalette.constructionAccent);
        for (const k of ks) {
            this.caption(() => this.power(k).re, () => this.power(k).im, 8, -6, () => t("complex_power_graph_cap_power", {value0: superscript(k)}),
                GraphPalette.additionalCurves[1], {visible: () => this.drawnInside(k), anchorY: "top"});
            this.caption(() => arrowToward(this.power(k)).tip.re, () => arrowToward(this.power(k)).tip.im, 6, 0,
                () => t("complex_power_graph_cap_out", {value0: superscript(k), value1: dec(Math.hypot(this.power(k).re, this.power(k).im), 2)}),
                GraphPalette.additionalCurves[1], {visible: () => this.drawnOutside(k)});
        }
        this.caption(() => 0, () => 0, 8, 8, () => t("complex_power_graph_cap_zero"), GraphPalette.label, {visible: () => this.derived().zero});
        // The legend: anchored at the live bottom-left corner of the board (pixel offsets, so a pan or zoom keeps it there); the rows stack by wrapped line count.
        const legend: readonly {text: () => string; color: string}[] = [
            {text: () => t("complex_power_graph_cap_unit", {value0: t("complex_power_graph_style_dashed")}), color: GraphPalette.referenceCurve},
            {text: () => t("complex_power_graph_cap_path", {value0: superscript(this.state.n), value1: t("complex_power_graph_style_solid")}), color: GraphPalette.comparisonCurve},
            {text: () => t("complex_power_graph_cap_points", {value0: t("complex_power_graph_style_diamonds")}), color: GraphPalette.additionalCurves[1]},
            {text: () => t("complex_power_graph_cap_handle", {value0: t("complex_power_graph_style_circle")}), color: GraphPalette.constructionAccent},
        ];
        legend.forEach((row, index) => {
            // Pixels above the live bottom edge: the rows below this one stack under it, so a pan or zoom keeps the legend at the edge.
            const offset = () => {
                const rows = legend.map(r => ({text: r.text(), visible: true}));
                return 8 + legendStackOffsetPx(rows, rows.length, board.canvasWidth, ROW_PX) - legendStackOffsetPx(rows, index, board.canvasWidth, ROW_PX);
            };
            this.caption(() => board.getBoundingBox()[0], () => board.getBoundingBox()[3], 10, offset, row.text, row.color, {anchorY: "top", legend: true});
        });
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.handle = undefined;
        this.built = false;
    }

    // ---- Dragging: z snaps to the 0.05 grid in [-2, 2] -------------------------------------------------------------------------

    private wireDrag(point: JXG.Point): void {
        const onDrag = () => this.dragTo(point);
        const board = this.board;
        const releaseCursor = bindMovablePointCursor(point, board);
        point.on("drag", onDrag);
        this.scene.listen(() => { point.off("drag", onDrag); releaseCursor(); });
    }

    /** Drag only: z snaps to the nearest grid point inside [-2, 2] (typed values are refused instead). */
    private dragTo(point: JXG.Point): void {
        const A = snapDragCoordinate(point.X());
        const B = snapDragCoordinate(point.Y());
        if (A === undefined || B === undefined) {
            this.placeHandle();
            return;
        }
        this.pausePlayback();
        if (A !== this.state.A || B !== this.state.B) this.setState({A, B});
        point.setPosition(JXG.COORDS_BY_USER, [coordinateOf(A), coordinateOf(B)]);
    }

    // ---- Playback -------------------------------------------------------------------------------------------------------------

    /** The scheduler of the frame loop; tests replace it with a fake clock. */
    protected animationScheduler(): AnimationScheduler | undefined { return undefined; }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    private disposeController(): void {
        this.controller?.dispose();
        this.controller = undefined;
    }

    /** The controller counts the steps from n = 1; it is kept in step with the stored n (a write from outside moved it). */
    private syncedController(): IterationController {
        this.controller ??= new IterationController({
            transition: () => {
                const n = this.state.n + 1;
                this.ticking = true;
                try { this.setState({n}); } finally { this.ticking = false; }
                this.requestRender();
                return n >= N_RANGE.max ? "complete" : "continue";
            },
            stepIntervalMs: STEP_INTERVAL_MS,
            maxIterations: N_RANGE.max - N_RANGE.min,
            onComplete: () => this.requestRender(),
            scheduler: this.animationScheduler(),
        });
        if (this.controller.iteration !== this.state.n - N_RANGE.min) this.controller.reset(this.state.n - N_RANGE.min);
        return this.controller;
    }

    /** A figure export captures the paused power, not a frame of a running playback. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    /** Stops the playback; n stays where it is. */
    override pausePlayback(): void {
        if (!this.controller?.isPlaying()) return;
        this.controller.pause();
        if (this.graphSession?.isAlive) this.requestRender();
    }

    /** Plays from n on; at n = 8 there is nothing to play (Reset goes back). Under reduced motion nothing plays: the Play button says so and Next step stays available. */
    play(): void {
        if (this.isPlaying() || !this.hasBoard || !this.graphSession?.isAlive || this.state.n >= N_RANGE.max) return;
        if (this.reducedMotion()) return;
        this.syncedController().play();
        this.requestRender();
    }

    stepOnce(): void {
        this.pausePlayback();
        if (this.state.n >= N_RANGE.max) return;
        this.syncedController().nextStep();
        this.requestRender();
    }

    /** Back to n = 1; z stays. */
    resetRun(): void {
        this.pausePlayback();
        this.setState({n: N_RANGE.min});
        this.controller?.reset(0);
        this.requestRender();
    }

    // ---- Editing from the panel and scene actions: typed values are refused when invalid; only the drag snaps -----------------

    /** Every edit pauses the playback first, then writes the patch. */
    private edit(patch: Partial<ComplexPowerState>): void {
        this.pausePlayback();
        this.setState(patch);
        this.requestRender();
    }

    /** A typed z: both parts on the 0.05 grid in [-2, 2], otherwise refused (false) and nothing changes. */
    editPoint(re: number, im: number): boolean {
        const A = typedCoordinate(re, "re");
        const B = typedCoordinate(im, "im");
        if (!A.ok || !B.ok) return false;
        if (A.value !== this.state.A || B.value !== this.state.B) this.edit({A: A.value, B: B.value});
        return true;
    }

    /** A typed exponent: an integer from 1 to 8, otherwise refused. */
    editExponent(value: number): boolean {
        const checked = typedExponent(value);
        if (!checked.ok) return false;
        if (checked.value !== this.state.n) this.edit({n: checked.value});
        return true;
    }

    /**
     * Applies one scene action (`set-z`, `set-n`, `step`) synchronously: the state is written before the call returns, so the next
     * action reads it from `this.state`. An invalid payload is a lesson-content error and throws a `DomainError` naming the field.
     */
    act(action: ComplexPowerAction): void {
        const result = applyComplexPowerAction(this.state, action);
        if (!result.ok) throw new DomainError(`${result.error.field}: ${result.error.reason}`);
        this.edit({A: result.value.A, B: result.value.B, n: result.value.n});
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------------

    private join(items: string[]): string {
        return items.reduce((all, item) => t("complex_power_graph_join", {value0: all, value1: item}));
    }

    /** An exact value with its decimal beside it in significant digits (a tiny power never reads "≈ 0"); a whole number stands alone. */
    private exactWithDecimal(exact: string, whole: boolean, decimal: number): string {
        return whole ? exact : t("complex_power_graph_value_with_decimal", {value0: exact, value1: formatSignificant(decimal, currentLanguage(), 7)});
    }

    /** z^n as "a + bi" in significant digits, for the status sentence of a power that is not a pair of whole numbers. */
    private significantComplex(z: {re: number; im: number}): string {
        const lang = currentLanguage();
        const re = formatSignificant(z.re, lang, 4);
        const im = formatSignificant(z.im, lang, 4);
        if (im === "0") return re;
        const magnitude = im.startsWith("−") ? im.slice(1) : im;
        const part = `${magnitude === "1" ? "" : magnitude}i`;
        if (re === "0") return im.startsWith("−") ? `−${part}` : part;
        return `${re} ${im.startsWith("−") ? "−" : "+"} ${part}`;
    }

    private fractionText(fraction: ExactFraction): string {
        const exact = fraction.denominator === 1 ? dec(fraction.numerator, 0)
            : t("complex_power_graph_value_fraction", {value0: dec(fraction.numerator, 0), value1: dec(fraction.denominator, 0)});
        return this.exactWithDecimal(exact, fraction.denominator === 1, fraction.numerator / fraction.denominator);
    }

    private radicalText(radical: ExactRadical, decimal: number): string {
        const top = radical.radicand === 1 ? dec(radical.coefficient, 0)
            : radical.coefficient === 1 ? t("complex_power_graph_value_root", {value0: dec(radical.radicand, 0)})
                : t("complex_power_graph_value_radical", {value0: dec(radical.coefficient, 0), value1: dec(radical.radicand, 0)});
        const exact = radical.denominator === 1 ? top : t("complex_power_graph_value_fraction", {value0: top, value1: dec(radical.denominator, 0)});
        return this.exactWithDecimal(exact, radical.radicand === 1 && radical.denominator === 1, decimal);
    }

    private degrees(value: number | undefined): string {
        return value === undefined ? t("complex_power_graph_value_none") : t("complex_power_graph_value_degrees", {value0: dec(value, 4)});
    }

    private yesNo(value: boolean): string {
        return t(value ? "complex_power_graph_value_yes" : "complex_power_graph_value_no");
    }

    /** The out-of-view powers as one list: each with its modulus. */
    private outOfView(): string[] {
        const {powers} = this.derived();
        return powers.flatMap((p, i) => insideView(p) ? [] : [t("complex_power_graph_out_item", {value0: superscript(i + 1), value1: dec(Math.hypot(p.re, p.im), 2)})]);
    }

    /** The status sentence: where z and n are, the last power, and the notes for z = 0 and for powers beyond the view. */
    statusText(): string {
        const d = this.derived();
        const {n} = this.state;
        const out = this.outOfView();
        // z^n is written with "=" only when both parts are whole numbers (exact); otherwise "≈" with significant digits, so z = 0,05 + 0,05i, n = 8 does not read "= 0".
        const whole = d.exactRe.denominator === 1 && d.exactIm.denominator === 1;
        const args = {value0: formatComplex(d.z, currentLanguage()), value1: String(n), value2: superscript(n),
            value3: whole ? formatComplex(d.powers[n - 1], currentLanguage()) : this.significantComplex(d.powers[n - 1])};
        return [t(whole ? "complex_power_graph_status" : "complex_power_graph_status_approx", args),
            d.zero ? t("complex_power_graph_status_zero") : "",
            out.length > 0 ? t("complex_power_graph_status_out", {value0: this.join(out)}) : ""].filter(Boolean).join(" ");
    }

    readoutRows(): ReadoutListRow[] {
        const d = this.derived();
        const {n} = this.state;
        const sup = superscript(n);
        return [
            {id: "z", label: t("complex_power_graph_r_z"), value: formatComplex(d.z, currentLanguage())},
            {id: "n", label: t("complex_power_graph_r_n"), value: String(n)},
            {id: "re", label: t("complex_power_graph_r_re", {value0: sup}), value: this.fractionText(d.exactRe)},
            {id: "im", label: t("complex_power_graph_r_im", {value0: sup}), value: this.fractionText(d.exactIm)},
            {id: "modulus", label: t("complex_power_graph_r_modulus", {value0: sup}), value: this.radicalText(d.exactModulus, d.modulus)},
            {id: "angle", label: t("complex_power_graph_r_angle", {value0: String(n)}), value: this.degrees(d.unwrappedDegrees)},
            {id: "principal", label: t("complex_power_graph_r_principal", {value0: sup}), value: this.degrees(d.principalDegrees)},
            {id: "real", label: t("complex_power_graph_r_real", {value0: sup}), value: this.yesNo(d.isReal)},
            {id: "unit", label: t("complex_power_graph_r_unit", {value0: sup}), value: this.yesNo(d.onUnitCircle)},
            {id: "one", label: t("complex_power_graph_r_one", {value0: sup}), value: this.yesNo(d.isOne)},
        ];
    }

    // ---- Controls -------------------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        const zArgs = {value0: dec(Z_RANGE.min / Z_SCALE, 2), value1: dec(Z_RANGE.max / Z_SCALE, 2), value2: dec(1 / Z_SCALE, 2)};
        const nArgs = {value0: dec(N_RANGE.min, 0), value1: dec(N_RANGE.max, 0)};
        return [
            <PointListInput key="z" title={t("complex_power_graph_z_title")} points={[[coordinateOf(this.state.A), coordinateOf(this.state.B)]]}
                            pointLabel={() => "z"} axisLabels={["Re", "Im"]} min={Z_RANGE.min / Z_SCALE} max={Z_RANGE.max / Z_SCALE} step={1 / Z_SCALE} bigStep={0.5} decimals={2}
                            onCommit={(_index, [re, im]) => this.editPoint(re, im) ? undefined : t("complex_power_graph_z_rejected", zArgs)}/>,
            <CountSetter key="n" label={t("complex_power_graph_n_label")} n={this.state.n} min={N_RANGE.min} max={N_RANGE.max} help={t("complex_power_graph_n_help")}
                         rejectedHint={t("complex_power_graph_n_rejected", nArgs)}
                         onPlus={() => this.editExponent(this.state.n + 1)} onMinus={() => this.editExponent(this.state.n - 1)}
                         onSet={value => this.editExponent(value)}/>,
        ];
    }

    protected override workspaceEdit(): React.ReactNode {
        const {n} = this.state;
        const playing = this.isPlaying();
        const blocks = playbackBlocks({atStart: n === N_RANGE.min, atEnd: n >= N_RANGE.max, playing});
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReducedMotion>{() =>
                    <PlaybackButtons placement="graph" groupLabel={t("complex_power_graph_playback_group")} nextLabel={t("next_step")} resetLabel={t("reset")}
                                     playing={playing} onNext={() => this.stepOnce()} onPlayPause={() => { if (playing) this.pausePlayback(); else this.play(); }}
                                     onReset={() => this.resetRun()} {...blocks} playBlock={blocks.playBlock ?? (!playing && this.reducedMotion() ? "reduced-motion" : undefined)}
                                     reducedMotionReason={t("playback_block_reduced_motion_next_step")}/>}
                </ReducedMotion>
                <p data-step-counter="">{t("step_counter", {value0: n, value1: N_RANGE.max})}</p>
                <ReadoutHeading>{t("complex_power_graph_readout_title")}</ReadoutHeading>
                <p data-complex-power-status="">{this.statusText()}</p>
                <ReadoutList label={t("complex_power_graph_readout_title")} rows={this.readoutRows()}/>
                <LiveReadout readout={this.status} muted={playing}/>
            </div>
        </>;
    }
}

export default ComplexPowerGraph;
