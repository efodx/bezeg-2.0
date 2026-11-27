import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, message, onLanguageChange, renderMessage, t, type Message} from "../../localization";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned} from "../base/controls/PuckOwnership";
import {DomainError} from "../functions/BaseFunctionGraph";
import type {FormattedValue, GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutGroup, ReadoutRow, ViewMarks} from "../base/declare/graphDeclaration";
import {formatNumber, formatScientific} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import Slider from "../../inputs/Slider";
import {CountSetter} from "../../inputs/CountSetter";
import {ReadoutHeading, ReadoutHelp, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {GraphPalette} from "../styles/GraphPalette";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {growthPresetCollection} from "./recursionPresetCollection";
import {
    A1_RANGE, CAPITAL_RANGE, D_RANGE, DEFAULT_GROWTH_STATE, deriveGrowth, GROWTH_PANELS, GrowthDerived, GrowthPanel, GrowthState, INTEREST_PARTS,
    IntegerRange, LOG_MODELS, LOG_Q_RANGE, LOG_Q_SCALE, LogModel, Q_RANGE, Q_SCALE, RATE_RANGE, RATE_SCALE, SEQUENCE_KINDS, SequenceKind, SeqValue,
    parseGrowthState, serializeGrowthState, TERMS_RANGE, typedInteger, Y0_RANGE, YEARS_RANGE,
} from "../../recursion/recursionModel";
import {subscript, Polyline} from "./cobwebScene";
import {at, Box, barsPath, chord, interestBox, logBox, sameBox, sampleCurve, sequenceBox} from "./growthScene";
import {SceneObjects} from "./SceneObjects";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** The keys of `S` that hold numbers: the only fields an integer edit may write. */
type NumericKeys<S> = {[K in keyof S & string]: S[K] extends number ? K : never}[keyof S & string];

/** The scene state: the stored growth fields (`GrowthState`), nothing derived. There is no playback; the number of terms n is a stepper. */
export interface GrowthGraphState extends BaseGraphState, GrowthState {}

/** The largest number of plotted points of the logarithm panel (n = 0, ..., 30). */
export const LOG_POINTS = TERMS_RANGE.max + 1;
/** The rate field shows a percent in steps of 0,5: the stored integer is twice the percent. */
export const PERCENT_SCALE = RATE_SCALE / 100;
const FIRST_TERMS = 6;
const LIST_SEPARATOR = "; ";

const dec = (value: number, digits = 6): string => formatNumber(value, currentLanguage(), digits);
/** A number of the model: decimal comma, up to 6 decimals, scientific from a million on (never an overflowing string). */
const num = (value: number): string => (Math.abs(value) >= 1e6 ? formatScientific(value, currentLanguage(), 4) : dec(value));
const money = (value: number): string => dec(value, 2);
const percent = (fraction: number, digits = 6): string => `${dec(fraction * 100, digits)} %`;
/** A term or a sum: a whole number is written out in full with the true minus, a double as a number. */
const seq = (value: SeqValue): string => (typeof value === "bigint" ? `${value < 0n ? "−" : ""}${(value < 0n ? -value : value).toString()}` : num(value));

const PANEL_KEYS = {
    sequence: "recursion_graph_growth_panel_sequence", interest: "recursion_graph_growth_panel_interest", log: "recursion_graph_growth_panel_log",
} as const satisfies Record<GrowthPanel, string>;
const KIND_KEYS = {
    arithmetic: "recursion_graph_growth_kind_arithmetic", geometric: "recursion_graph_growth_kind_geometric",
} as const satisfies Record<SequenceKind, string>;
const MODEL_KEYS = {
    exponential: "recursion_graph_growth_model_exponential", power: "recursion_graph_growth_model_power",
} as const satisfies Record<LogModel, string>;
const MODEL_SHORT_KEYS = {exponential: "growth_model_exponential_short", power: "growth_model_power_short"} as const satisfies Record<LogModel, string>;
const PARTS_KEYS: Readonly<Record<number, "recursion_graph_growth_parts_1" | "recursion_graph_growth_parts_2" | "recursion_graph_growth_parts_4" | "recursion_graph_growth_parts_12" | "recursion_graph_growth_parts_365">> = {
    1: "recursion_graph_growth_parts_1", 2: "recursion_graph_growth_parts_2", 4: "recursion_graph_growth_parts_4",
    12: "recursion_graph_growth_parts_12", 365: "recursion_graph_growth_parts_365",
};
const PANEL_NAMES: Readonly<Record<GrowthPanel, () => string>> = {
    sequence: () => t(PANEL_KEYS.sequence), interest: () => t(PANEL_KEYS.interest), log: () => t(PANEL_KEYS.log),
};
const KIND_NAMES: Readonly<Record<SequenceKind, () => string>> = {arithmetic: () => t(KIND_KEYS.arithmetic), geometric: () => t(KIND_KEYS.geometric)};
const MODEL_NAMES: Readonly<Record<LogModel, () => string>> = {exponential: () => t(MODEL_KEYS.exponential), power: () => t(MODEL_KEYS.power)};
const PARTS_NAMES: Readonly<Record<number, () => string>> = {
    1: () => t("recursion_graph_growth_parts_1"), 2: () => t("recursion_graph_growth_parts_2"), 4: () => t("recursion_graph_growth_parts_4"),
    12: () => t("recursion_graph_growth_parts_12"), 365: () => t("recursion_graph_growth_parts_365"),
};

/**
 * Ids of the declaration (task 08 lane L19). Bound: the panel (a choice puck), per panel the terms n and the difference d or ratio q (sequence), the time t
 * and the rate p (interest), the model, the growth factor q and the steps n (logarithm). Setup (first term, kind, capital, periods per year, start value)
 * stays in Orodja. Declared: the readout rows, the status sentence and the explanatory sentence as notes, and the legend of the curves of the panel (the bars and the limit,
 * the four interest curves with their values at the last year, the points and the line through the first and the last). The board keeps the axis titles.
 */
export type GrowthIds = {
    param: "growth-panel" | "growth-n" | "growth-d" | "growth-q" | "growth-rate" | "growth-years" | "growth-model" | "growth-logq";
    row: "kind" | "first" | "difference" | "ratio" | "terms" | "nth" | "sum" | "precision" | "limit"
        | "capital" | "rate" | "years" | "parts" | "simple" | "compound" | "relative" | "continuous" | "conformal" | "conformal-value" | "doubling" | "rule72" | `e-${number}` | "e"
        | "model" | "start" | "factor" | "last-y" | "last-ln" | "slope" | "slope-first" | "slope-last" | "ln-q" | "q-from-slope" | "line";
    note: "status" | "help";
    legend: "bars" | "limit" | "simple" | "compound" | "relative" | "continuous" | "points" | "chord";
    section: never;
    action: never;
};
type GrowthRow = ReadoutRow<GrowthIds>;
const formatted = (text: string): FormattedValue => ({kind: "formatted", text});

type Style = {readonly color: string; readonly width: number; readonly dash: number};
/** The four interest curves differ in width and dash as well as colour, and the legend draws a sample of each. */
const INTEREST_STYLES: readonly Style[] = [
    {color: GraphPalette.referenceCurve, width: 2, dash: 2},
    {color: GraphPalette.primaryCurve, width: 4, dash: 0},
    {color: GraphPalette.constructionAccent, width: 2, dash: 0},
    {color: GraphPalette.comparisonCurve, width: 2, dash: 3},
];
/** Fraction of the window: the axis caption at the top, text starting right of the vertical axis. */
const ROW_Y = 0.97;
/** Pixels: the gap of every text right of the vertical axis; the room under the horizontal axis for the tick numbers (22) and the axis title (18) and their gaps. */
const AXIS_GAP_PX = 16;
const BAND_PX = 48;
/** Pixels between the axis title and the bottom edge of the board. */
const TITLE_GAP_PX = 5;

interface Cache {
    readonly state: GrowthGraphState;
    readonly derived: GrowthDerived;
    readonly box: Box;
    readonly height: number;
}

/** The box with at least `BAND_PX` pixels of a board `height` px tall under the horizontal axis (y = 0): the tick numbers and the axis title stand there. */
function withBand(box: Box, height: number): Box {
    const [left, top, right, bottom] = box;
    if (!(height > 2 * BAND_PX) || !(top > 0) || bottom * 0 !== 0) return box;
    if (-bottom * height / (top - bottom) >= BAND_PX) return box;
    return [left, top, right, -BAND_PX * top / (height - BAND_PX)];
}

function boxOf(state: GrowthState, derived: GrowthDerived): Box {
    if (state.panel === "sequence") return sequenceBox(derived.sequence.terms.map(Number), derived.sequence.limit);
    if (state.panel === "interest") {
        const {simple, compound, relative, continuous} = derived.interest;
        return interestBox([simple, compound, relative, continuous], state.years);
    }
    return logBox(derived.log.ns, derived.log.lnY);
}

/**
 * The growth graph (recursion spec RG1, RG3 and RG5): three panels on one board. The sequence panel draws the terms of an arithmetic or
 * geometric sequence as bars, the interest panel the value of a capital under four models, and the logarithm panel the points (n, ln y)
 * on an ordinary axis (ADR 0052, section 3: the axis is labelled as the logarithm, it is not a true logarithmic axis).
 *
 * The stored state is `GrowthState` (whole numbers and names); every drawn or read value is derived from it by `derived()`, keyed on the
 * state object. All board objects are created once and shown or hidden by the panel, so a panel change rebuilds nothing; they go through
 * `scene`, which removes them with the scene. The graph owns no timer and no playback.
 */
export class GrowthGraph extends BaseGraph<GrowthGraphState, GrowthState> {
    private readonly scene = new SceneObjects();
    private built = false;
    private drawnBox?: Box;
    private cache?: Cache;
    private container?: HTMLElement;
    private readonly status = new SettledReadout();

    override getInitialState(): GrowthGraphState {
        return {initialized: false, ...DEFAULT_GROWTH_STATE};
    }

    protected override lessonDefaultState(): GrowthGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): GrowthState {
        return serializeGrowthState(DEFAULT_GROWTH_STATE);
    }

    override presetCollection(): PresetCollection<GrowthState> {
        return growthPresetCollection();
    }

    override exportPreset(): Preset<GrowthState> {
        const preset = super.exportPreset();
        const {panel: _panel, kind: _kind, a1: _a1, d: _d, q: _q, n: _n, capital: _capital, rate: _rate, years: _years, parts: _parts, y0: _y0, logQ: _logQ, logModel: _logModel, ...graphState} = preset.graphState as GrowthGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): GrowthState {
        return serializeGrowthState(this.state);
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

    override importPresetData(data: GrowthState): void {
        const imported = serializeGrowthState(data);
        if (this.keepImportedView) this.drawnBox = withBand(boxOf(imported, deriveGrowth(imported)), this.boardHeight());
        this.setState(imported);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): GrowthGraphState {
        const parsed = parseGrowthState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    /** The axes mean different things (index or time against value) and every panel frames its own box, so a stored or reset view is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** A reset shows the exact opening window: the base passes `keepaspect` to `setBoundingBox`, which would widen a window the graph frames exactly. */
    protected override showInitialView(): void {
        this.boardView.setIntent(this.initialView(), {keepAspectRatio: false});
    }

    protected override initialView(): [number, number, number, number] {
        return [...withBand(boxOf(DEFAULT_GROWTH_STATE, deriveGrowth(DEFAULT_GROWTH_STATE)), this.boardHeight())];
    }

    // ---- Derived numbers: a cache keyed by the state object ---------------------------------------------------------------

    private current(): Cache {
        const height = this.boardHeight();
        if (!this.cache || this.cache.state !== this.state || this.cache.height !== height) {
            const derived = this.cache?.state === this.state ? this.cache.derived : deriveGrowth(this.state);
            this.cache = {state: this.state, derived, box: withBand(boxOf(this.state, derived), height), height};
        }
        return this.cache;
    }

    /** The height of the board in pixels, or 0 before there is a board. */
    private boardHeight(): number {
        return this.hasBoard && this.board.canvasHeight > 0 ? this.board.canvasHeight : 0;
    }

    derived(): GrowthDerived { return this.current().derived; }

    /** Diagnostics for tests. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }

    // ---- Board --------------------------------------------------------------------------------------------------------------

    private boardLabel(): string {
        const panel = this.state.panel;
        return t(panel === "sequence" ? "recursion_graph_growth_board_sequence" : panel === "interest" ? "recursion_graph_growth_board_interest"
            : "recursion_graph_growth_board_log");
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        this.container = container;
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", this.boardLabel());
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            this.container = undefined;
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        // A mount frames the scene once; a rebuild or a replacement (checkpoint restore, Preset import) never frames over the stored view.
        if (this.hasBoard) this.applyFrame();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => this.status.cancel());
            session.registerCleanup(onLanguageChange(() => {
                this.status.replace(this.statusText());
                if (this.hasBoard && session.isAlive) this.board.update();
            }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        // A replacement brings its own view: build first, then mark the frame as drawn so it is kept.
        if (this.hasBoard && this.graphSession?.isAlive) {
            if (!this.built) this.buildScene();
            this.drawnBox = this.current().box;
        }
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    /** Rebuilds the scene after a disposal, sets the window of the panel, redraws; reports the status. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (!this.built) this.buildScene();
        this.container?.setAttribute("aria-label", this.boardLabel());
        this.applyFrame();
        this.board.update();
        this.status.report(this.statusText());
    }

    private applyFrame(): void {
        const box = this.current().box;
        if (sameBox(this.drawnBox, box)) return;
        this.drawnBox = box;
        this.boardView.following(() => this.boardView.setIntent(box, {keepAspectRatio: false}));
    }

    /** The curves the legend names, by the `object` id of their entry (`drawnObject`); rebuilt with the scene. */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    private curve(data: () => Polyline, style: Style, visible: () => boolean, legendId?: GrowthIds["legend"]): JXG.Curve {
        const curve = this.scene.own(this.board.create("curve", [[], []], {
            highlight: false, fixed: true, withLabel: false, strokeColor: style.color, strokeWidth: style.width, dash: style.dash, visible,
        }));
        curve.updateDataArray = () => {
            const {x, y} = data();
            curve.dataX = x;
            curve.dataY = y;
        };
        if (legendId) this.drawn.set(legendId, curve);
        return curve;
    }

    private caption(text: () => string, place: () => {x: number; y: number}, visible: () => boolean, anchorX: "left" | "right" = "left", anchorY: "middle" | "bottom" = "middle"): JXG.Text {
        return this.scene.own(this.board.create("text", [() => place().x, () => place().y, text], {
            strokeColor: GraphPalette.label, fontSize: 14, anchorX, anchorY, fixed: true, highlight: false, withLabel: false, visible,
        }));
    }

    /** The x of the texts right of the vertical axis (its title, the legend, the caption rows): `AXIS_GAP_PX` right of the axis, where no tick number stands (they are left of it). */
    private textLeft(): number {
        const [xmin, , xmax] = this.view();
        return (xmin < 0 && xmax > 0 ? 0 : xmin) + this.pixels(AXIS_GAP_PX);
    }

    /** The window the board shows (the panel's own box until the user pans or zooms, a capture sets its own): the texts are placed in it, in pixels from its edges and the axes. */
    private view(): Box {
        const [left, top, right, bottom] = this.hasBoard ? this.board.getBoundingBox() : this.current().box;
        return [left, top, right, bottom];
    }

    /** A length in pixels as a width in board units. */
    private pixels(px: number): number {
        const {unitX} = this.board;
        return px / (unitX > 0 ? unitX : 1);
    }

    /** The x tick numbers of negative x are not written: the quantities start at 0 and 1, and a number there is cut at the left edge. */
    protected override defaultAxesAttributes() {
        const axis = this.styles.axis;
        const labelOf = axis.defaultX.ticks?.generateLabelText as ((this: object, ...label: unknown[]) => string) | undefined;
        const nonNegative = function (this: object, ...label: unknown[]): string {
            const tick = label[0] as {usrCoords?: number[]} | undefined;
            if (tick?.usrCoords && tick.usrCoords[1] < 0) return "";
            return labelOf ? labelOf.apply(this, label) : "";
        };
        return {x: {...axis.defaultX, ticks: {...axis.defaultX.ticks, generateLabelText: nonNegative}}, y: axis.defaultY};
    }

    private marker(x: () => number, y: () => number, visible: () => boolean, face: string, color: string): JXG.Point {
        return this.scene.own(this.board.create("point", [x, y], {
            fixed: true, highlight: false, withLabel: false, name: "", face, size: 4, fillColor: color, strokeColor: GraphPalette.pointOutline, visible,
        }));
    }

    private buildScene(): void {
        this.disposeScene();
        this.built = true;
        const state = () => this.state;
        const derived = () => this.derived();
        const box = () => this.view();
        const on = (panel: GrowthPanel) => () => this.state.panel === panel;

        // Sequence panel: the bars of the terms, the limit line, the n-th term marked.
        this.curve(() => barsPath(derived().sequence.terms.map(Number)), {color: GraphPalette.primaryCurve, width: 2, dash: 0}, on("sequence"), "bars");
        this.curve(() => {
            const limit = derived().sequence.limit ?? 0;
            return {x: [box()[0], box()[2]], y: [limit, limit]};
        }, {color: GraphPalette.comparisonCurve, width: 2, dash: 2}, () => state().panel === "sequence" && derived().sequence.limit !== null, "limit");
        this.marker(() => state().n, () => Number(derived().sequence.nth), on("sequence"), "diamond", GraphPalette.constructionAccent);
        // The bars and the limit line are legend entries; the n-th term is the row "Term aₙ".

        // Interest panel: four curves in the window of the years (legend entries, with their values at the last year).
        const capital = () => state().capital;
        const p = () => derived().interest.p;
        const parts = () => state().parts;
        const models: Array<(time: number) => number> = [
            time => capital() * (1 + p() * time),
            time => capital() * Math.pow(1 + p(), time),
            time => capital() * Math.pow(1 + p() / parts(), parts() * time),
            time => capital() * Math.exp(p() * time),
        ];
        const INTEREST_IDS = ["simple", "compound", "relative", "continuous"] as const;
        models.forEach((model, index) => {
            this.curve(() => sampleCurve(model, 0, state().years), INTEREST_STYLES[index], on("interest"), INTEREST_IDS[index]);
        });

        // Logarithm panel: the points (n, ln y), the chord through the first and the last point, one marker per point.
        this.curve(() => ({x: [...derived().log.ns], y: [...derived().log.lnY]}), {color: GraphPalette.primaryCurve, width: 2, dash: 0}, on("log"), "points");
        this.curve(() => chord(derived().log.ns, derived().log.lnY), {color: GraphPalette.constructionAccent, width: 2, dash: 2}, on("log"), "chord");
        for (let index = 0; index < LOG_POINTS; index++) {
            this.marker(() => derived().log.ns[index] ?? 0, () => derived().log.lnY[index] ?? 0,
                () => state().panel === "log" && index < derived().log.ns.length, "circle", GraphPalette.primaryCurve);
        }
        // Axis captions of every panel: what the horizontal and the vertical axis show, and the unit.
        this.caption(() => t(state().panel === "sequence" ? "recursion_graph_growth_cap_x_sequence" : state().panel === "interest"
            ? "recursion_graph_growth_cap_x_interest" : "recursion_graph_growth_cap_x_log"), () => ({x: box()[2] - this.pixels(6), y: box()[3] + TITLE_GAP_PX / (this.board.unitY > 0 ? this.board.unitY : 1)}), () => true, "right", "bottom");
        this.caption(() => t(state().panel === "sequence" ? "recursion_graph_growth_cap_y_sequence" : state().panel === "interest"
            ? "recursion_graph_growth_cap_y_interest" : "recursion_graph_growth_cap_y_log"), () => ({x: this.textLeft(), y: at(box(), 0, ROW_Y).y}), () => true);
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.drawn.clear();
        this.built = false;
    }

    // ---- Editing from the panel: typed values are refused when invalid, never clamped ----------------------------------------

    private edit(patch: Partial<GrowthState>): void {
        this.setState(patch);
        this.requestRender();
    }

    private editInteger(field: NumericKeys<GrowthState>, value: number, scale: number, range: IntegerRange): boolean {
        const checked = typedInteger(value, scale, range, field);
        if (!checked.ok) return false;
        this.edit({[field]: checked.value});
        return true;
    }

    editPanel(panel: GrowthPanel): void { this.edit({panel}); }
    editKind(kind: SequenceKind): void { this.edit({kind}); }
    editModel(logModel: LogModel): void { this.edit({logModel}); }
    editParts(parts: number): boolean {
        const found = INTEREST_PARTS.find(candidate => candidate === parts);
        if (found === undefined) return false;
        this.edit({parts: found});
        return true;
    }
    editFirstTerm(value: number): boolean { return this.editInteger("a1", value, 1, A1_RANGE); }
    editDifference(value: number): boolean { return this.editInteger("d", value, 1, D_RANGE); }
    editRatio(value: number): boolean { return this.editInteger("q", value, Q_SCALE, Q_RANGE); }
    editTerms(value: number): boolean { return this.editInteger("n", value, 1, TERMS_RANGE); }
    editCapital(value: number): boolean { return this.editInteger("capital", value, 1, CAPITAL_RANGE); }
    editRate(percentValue: number): boolean { return this.editInteger("rate", percentValue, PERCENT_SCALE, RATE_RANGE); }
    editYears(value: number): boolean { return this.editInteger("years", value, 1, YEARS_RANGE); }
    editStartValue(value: number): boolean { return this.editInteger("y0", value, 1, Y0_RANGE); }
    editGrowthFactor(value: number): boolean { return this.editInteger("logQ", value, LOG_Q_SCALE, LOG_Q_RANGE); }

    // ---- Lesson actions -----------------------------------------------------------------------------------------------------

    /**
     * Lesson actions (`recursion`): `set-map` picks the panel and the sequence kind, `set-params` and `set-interest` set stored fields (the ratio q is stored times 10,
     * the rate twice the percent). The merged state goes through `parseGrowthState` (strict: nothing is snapped or clamped) before the first write, so an off-grid or
     * off-range value is a lesson-content error and nothing is written. Each write is one `edit`, so a later action of the scene reads the state of the earlier ones.
     */
    applyRecursionAction(action: Extract<LessonAction, {kind: "recursion"}>): void {
        switch (action.operation) {
            case "set-map": {
                const {kind: _kind, operation: _operation, sequence, ...rest} = action;
                this.refuseCobwebFields("set-map", rest);
                this.editStored("set-map", {...rest, ...(sequence !== undefined ? {kind: sequence} : {})}, ["panel", "kind"]);
                return;
            }
            case "set-params": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.refuseCobwebFields("set-params", patch);
                this.editStored("set-params", patch, ["a1", "d", "q", "n"]);
                return;
            }
            case "set-start":
            case "set-step":
                throw new Error(`recursion ${action.operation}: this operation belongs to the cobweb graph.`);
            case "set-interest": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-interest", patch, ["capital", "rate", "years", "parts"]);
                return;
            }
            case "set-log": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-log", patch, ["y0", "logQ", "logModel"]);
                return;
            }
            default: {
                const unsupported: never = action;
                throw new Error(`recursion: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    /** The fields of the cobweb graph (`map`, `M`, `C`, `R`) are the other graph's: refused by name before anything is merged. */
    private refuseCobwebFields(operation: string, patch: Readonly<Record<string, unknown>>): void {
        const foreign = ["map", "M", "C", "R"].filter(key => patch[key] !== undefined);
        if (foreign.length) throw new Error(`recursion ${operation}: ${foreign.join(", ")} belongs to the cobweb graph.`);
    }

    /** Validates the merged state first, then writes only the fields that change; unknown fields are refused. */
    private editStored(operation: string, patch: Readonly<Record<string, unknown>>, allowed: readonly (keyof GrowthState)[]): void {
        const unknown = Object.keys(patch).filter(key => !allowed.some(field => field === key));
        if (unknown.length) throw new Error(`recursion ${operation}: no such field ${unknown.join(", ")}.`);
        const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
        const parsed = parseGrowthState({...serializeGrowthState(this.state), ...defined});
        if (!parsed.ok) throw new Error(`recursion ${operation}: ${parsed.error.message}`);
        const changed = allowed.filter(key => parsed.value[key] !== this.state[key]);
        if (changed.length) this.edit(Object.fromEntries(changed.map(key => [key, parsed.value[key]])));
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("recursion", action => this.applyRecursionAction(action));
    }

    // ---- Text -----------------------------------------------------------------------------------------------------------------

    /** The status sentence of the panel, as a catalog message (the same words in the panel and in the declared note). */
    private statusMessage(): Message {
        const state = this.state;
        const d = this.derived();
        if (state.panel === "sequence") {
            const n = subscript(state.n);
            const seqd = d.sequence;
            const [first, nth, sum] = [n, seq(seqd.nth), seq(seqd.sum)];
            if (state.kind === "arithmetic") return message("recursion_graph_growth_status_arithmetic", {value0: first, value1: nth, value2: sum});
            if (seqd.limit === null) {
                return message(seqd.exact ? "recursion_graph_growth_status_geometric_exact" : "recursion_graph_growth_status_geometric_computed", {value0: first, value1: nth, value2: sum});
            }
            return message(seqd.exact ? "growth_status_geometric_exact_limit" : "growth_status_geometric_computed_limit",
                {value0: first, value1: nth, value2: sum, value3: num(seqd.limit)});
        }
        if (state.panel === "interest") {
            const i = d.interest;
            return message("recursion_graph_growth_status_interest", {
                value0: state.years, value1: money(i.simple), value2: money(i.compound), value3: state.parts, value4: money(i.relative), value5: money(i.continuous),
            });
        }
        const l = d.log;
        return l.straight
            ? message("recursion_graph_growth_status_log_line", {value0: num(l.slope), value1: num(l.lnQ), value2: num(Math.exp(l.slope))})
            : message("recursion_graph_growth_status_log_curve", {value0: num(l.slopeFirst), value1: num(l.slopeLast)});
    }

    statusText(): string { return renderMessage(this.statusMessage()); }

    private sequenceRows(): GrowthRow[] {
        const state = this.state;
        const s = this.derived().sequence;
        const n = subscript(state.n);
        const shown = s.terms.slice(0, FIRST_TERMS).map(seq);
        const rows: GrowthRow[] = [
            {id: "kind", name: message("recursion_graph_growth_r_kind"), value: message(KIND_KEYS[state.kind])},
            {id: "first", name: message("recursion_graph_growth_r_first"), value: formatted(seq(BigInt(state.a1)))},
            state.kind === "arithmetic"
                ? {id: "difference", name: message("recursion_graph_growth_r_difference"), value: formatted(seq(BigInt(state.d)))}
                : {id: "ratio", name: message("recursion_graph_growth_r_ratio"), value: formatted(num(state.q / Q_SCALE))},
            {id: "terms", name: message("recursion_graph_growth_r_terms"), value: formatted(shown.join(LIST_SEPARATOR) + (s.terms.length > FIRST_TERMS ? `${LIST_SEPARATOR}…` : ""))},
            {id: "nth", name: message("recursion_graph_growth_r_nth", {value0: n}), value: formatted(seq(s.nth))},
            {id: "sum", name: message("recursion_graph_growth_r_sum", {value0: n}), value: formatted(seq(s.sum))},
            {id: "precision", name: message("recursion_graph_growth_r_precision"),
                value: message(s.exact ? "recursion_graph_growth_precision_exact" : "recursion_graph_growth_precision_computed")},
        ];
        if (state.kind === "geometric") {
            rows.push({id: "limit", name: message("recursion_graph_growth_r_limit"),
                value: s.limit === null ? message("recursion_graph_growth_limit_none") : message("recursion_graph_growth_limit_value", {value0: num(s.limit)})});
        }
        return rows;
    }

    private interestRows(): GrowthRow[] {
        const state = this.state;
        const i = this.derived().interest;
        return [
            {id: "capital", name: message("recursion_graph_growth_r_capital"), value: formatted(money(state.capital))},
            {id: "rate", name: message("recursion_graph_growth_r_rate"), value: formatted(percent(i.p, 2))},
            {id: "years", name: message("recursion_graph_growth_r_years"), value: formatted(String(state.years))},
            {id: "parts", name: message("recursion_graph_growth_r_parts"), value: message(PARTS_KEYS[state.parts])},
            {id: "simple", name: message("recursion_graph_growth_r_simple"), value: formatted(money(i.simple))},
            {id: "compound", name: message("recursion_graph_growth_r_compound"), value: formatted(money(i.compound))},
            {id: "relative", name: message("recursion_graph_growth_r_relative", {value0: state.parts}), value: formatted(money(i.relative))},
            {id: "continuous", name: message("recursion_graph_growth_r_continuous"), value: formatted(money(i.continuous))},
            {id: "conformal", name: message("recursion_graph_growth_r_conformal", {value0: state.parts}), value: formatted(percent(i.conformal))},
            {id: "conformal-value", name: message("recursion_graph_growth_r_conformal_value", {value0: state.parts * state.years}), value: formatted(money(i.conformalValue))},
            {id: "doubling", name: message("recursion_graph_growth_r_doubling"), value: message("recursion_graph_growth_years_value", {value0: dec(i.doubling, 4)})},
            {id: "rule72", name: message("recursion_graph_growth_r_rule72"), value: message("recursion_graph_growth_years_value", {value0: dec(i.ruleOf72, 1)})},
        ];
    }

    private eRows(): GrowthRow[] {
        const rows: GrowthRow[] = this.derived().interest.eTable.map(row => ({
            id: `e-${row.n}` as const, name: message("recursion_graph_growth_r_e_n", {value0: dec(row.n, 0)}), value: formatted(dec(row.value)),
        }));
        rows.push({id: "e", name: message("recursion_graph_growth_r_e"), value: formatted(dec(Math.E))});
        return rows;
    }

    private logRows(): GrowthRow[] {
        const state = this.state;
        const l = this.derived().log;
        const last = l.ns.length - 1;
        const rows: GrowthRow[] = [
            {id: "model", name: message("recursion_graph_growth_r_model"), value: message(MODEL_KEYS[state.logModel])},
            {id: "start", name: message("recursion_graph_growth_r_y0"), value: formatted(dec(state.y0, 0))},
        ];
        if (state.logModel === "exponential") rows.push({id: "factor", name: message("recursion_graph_growth_r_factor"), value: formatted(num(l.q))});
        rows.push(
            {id: "last-y", name: message("recursion_graph_growth_r_last_y", {value0: subscript(l.ns[last])}), value: formatted(num(l.ys[last]))},
            {id: "last-ln", name: message("recursion_graph_growth_r_last_ln", {value0: subscript(l.ns[last])}), value: formatted(num(l.lnY[last]))},
            {id: "slope", name: message("recursion_graph_growth_r_slope"), value: formatted(num(l.slope))},
            {id: "slope-first", name: message("recursion_graph_growth_r_slope_first"), value: formatted(num(l.slopeFirst))},
            {id: "slope-last", name: message("recursion_graph_growth_r_slope_last"), value: formatted(num(l.slopeLast))},
        );
        if (state.logModel === "exponential") {
            rows.push(
                {id: "ln-q", name: message("recursion_graph_growth_r_ln_q"), value: message("recursion_graph_growth_computed_value", {value0: num(l.lnQ)})},
                {id: "q-from-slope", name: message("recursion_graph_growth_r_q_from_slope"), value: message("recursion_graph_growth_computed_value", {value0: num(Math.exp(l.slope))})},
            );
        }
        rows.push({id: "line", name: message("recursion_graph_growth_r_line"), value: message(l.straight ? "recursion_graph_growth_line_yes" : "recursion_graph_growth_line_no")});
        return rows;
    }

    /** The rows of the panel as declared (the panel shows their text). */
    readoutRows(): GrowthRow[] {
        const panel = this.state.panel;
        return panel === "sequence" ? this.sequenceRows() : panel === "interest" ? this.interestRows() : this.logRows();
    }

    // ---- Declaration ------------------------------------------------------------------------------------------------------

    /** What the view director keeps visible: the bars, the four interest values at the last year, or the points (n, ln y). */
    private viewMarks(): ViewMarks {
        const state = this.state;
        const d = this.derived();
        const finite = (points: readonly (readonly [number, number])[]) => points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
        if (state.panel === "sequence") {
            const terms = d.sequence.terms.map(Number);
            return {must: [{kind: "polyline", points: finite([[0, 0], ...terms.map((term, index): [number, number] => [index + 1, term])])}]};
        }
        if (state.panel === "interest") {
            const {simple, compound, relative, continuous} = d.interest;
            return {must: [{kind: "polyline", points: finite([[0, state.capital], [state.years, simple], [state.years, compound], [state.years, relative], [state.years, continuous]])}]};
        }
        return {must: [{kind: "polyline", points: finite(d.log.ns.map((n, index): [number, number] => [n, d.log.lnY[index]]))}]};
    }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const refused = (name: string, range: IntegerRange, scale: number): DomainError =>
            new DomainError(message("recursion_graph_growth_rejected", {value0: name, value1: dec(range.min / scale), value2: dec(range.max / scale), value3: dec(1 / scale)}));
        const integer = (edit: (value: number) => boolean, name: () => string, range: IntegerRange, scale: number): ParameterBinding["apply"] =>
            (value: unknown) => { if (typeof value !== "number" || !edit(value)) throw refused(name(), range, scale); };
        return {
            "growth-panel": {
                read: () => this.state.panel,
                apply: (value: unknown) => {
                    const panel = GROWTH_PANELS.find(candidate => candidate === value);
                    if (!panel) throw new DomainError(`The panel ${String(value)} is unknown.`);
                    this.editPanel(panel);
                },
            },
            "growth-model": {
                read: () => this.state.logModel,
                apply: (value: unknown) => {
                    const model = LOG_MODELS.find(candidate => candidate === value);
                    if (!model) throw new DomainError(`The model ${String(value)} is unknown.`);
                    this.editModel(model);
                },
            },
            "growth-n": {read: () => this.state.n, apply: integer(value => this.editTerms(value), () => t("recursion_graph_growth_n_label"), TERMS_RANGE, 1)},
            "growth-d": {read: () => this.state.d, apply: integer(value => this.editDifference(value), () => t("recursion_graph_growth_d_label"), D_RANGE, 1)},
            "growth-q": {read: () => this.state.q / Q_SCALE, apply: integer(value => this.editRatio(value), () => t("recursion_graph_growth_q_label"), Q_RANGE, Q_SCALE)},
            "growth-rate": {read: () => this.state.rate / PERCENT_SCALE, apply: integer(value => this.editRate(value), () => t("recursion_graph_growth_rate_label"), RATE_RANGE, PERCENT_SCALE)},
            "growth-years": {read: () => this.state.years, apply: integer(value => this.editYears(value), () => t("recursion_graph_growth_years_label"), YEARS_RANGE, 1)},
            "growth-logq": {read: () => this.state.logQ / LOG_Q_SCALE, apply: integer(value => this.editGrowthFactor(value), () => t("recursion_graph_growth_logq_label"), LOG_Q_RANGE, LOG_Q_SCALE)},
        };
    }

    /**
     * Pure data from the state: the panel choice always; per panel the controls watched while changing (the sequence: the terms n and the difference d or the
     * ratio q; the interest: the time t and the rate p; the logarithm: the model, the growth factor q and the steps n). The first term, the capital, the
     * periods per year, the start value and the kind of sequence are set once and stay in Orodja. A parameter that does not apply is omitted.
     */
    protected override declaration(): GraphDeclaration<GrowthIds> {
        const state = this.state;
        const range = (key: GrowthIds["param"], name: Message, symbol: string, r: IntegerRange, scale: number, step: number, bigStep: number, maxDecimals: number, unit?: Message):
            ParameterDeclaration<GrowthIds["param"]> => ({
            key, kind: "range", label: name, symbol, placement: "board", min: r.min / scale, max: r.max / scale, step, bigStep, maxDecimals, ...(unit ? {unit} : {}),
        });
        const count = (name: Message, key: GrowthIds["param"], r: IntegerRange): ParameterDeclaration<GrowthIds["param"]> =>
            ({key, kind: "count", label: name, symbol: key === "growth-years" ? "t" : "n", placement: "board", min: r.min, max: r.max});
        const parameters: ParameterDeclaration<GrowthIds["param"]>[] = [{
            key: "growth-panel", kind: "choice", label: message("recursion_graph_growth_panel_label"), help: message("recursion_graph_growth_panel_help"), placement: "board", puck: true,
            options: GROWTH_PANELS.map(value => ({value, label: message(PANEL_KEYS[value])})),
        }];
        if (state.panel === "sequence") {
            parameters.push(count(message("growth_n_terms_name"), "growth-n", TERMS_RANGE));
            parameters.push(state.kind === "arithmetic"
                ? range("growth-d", message("growth_d_name"), "d", D_RANGE, 1, 1, 5, 0)
                : range("growth-q", message("growth_q_name"), "q", Q_RANGE, Q_SCALE, 1 / Q_SCALE, 1, 1));
        } else if (state.panel === "interest") {
            parameters.push(
                range("growth-rate", message("growth_rate_name"), "p", RATE_RANGE, PERCENT_SCALE, 1 / PERCENT_SCALE, 1, 1, message("growth_percent_unit")),
                count(message("growth_years_name"), "growth-years", YEARS_RANGE),
            );
        } else {
            parameters.push({
                key: "growth-model", kind: "choice", label: message("recursion_graph_growth_model_label"), help: message("recursion_graph_growth_model_help"), placement: "board", puck: true,
                options: LOG_MODELS.map(value => ({value, label: message(MODEL_KEYS[value]), short: message(MODEL_SHORT_KEYS[value])})),
            });
            if (state.logModel === "exponential") parameters.push(range("growth-logq", message("growth_logq_name"), "q", LOG_Q_RANGE, LOG_Q_SCALE, 1 / LOG_Q_SCALE, 0.1, 2));
            parameters.push(count(message("growth_steps_name"), "growth-n", TERMS_RANGE));
        }
        const groups: ReadoutGroup<GrowthIds>[] = [{id: "values", rows: this.readoutRows()}];
        if (state.panel === "interest") groups.push({id: "e-table", title: message("recursion_graph_growth_e_title"), rows: this.eRows()});
        return {
            parameters, readouts: groups,
            notes: [{id: "status", text: this.statusMessage()}, {id: "help", text: message(this.noteKey())}],
            legend: this.legendEntries(),
            marks: this.viewMarks(),
        };
    }

    /** The legend of the panel: its curves, named by what they show (the values at the last year included). */
    private legendEntries(): LegendEntry<GrowthIds>[] {
        const state = this.state;
        const d = this.derived();
        if (state.panel === "sequence") {
            return [
                {id: "bars", label: message("recursion_graph_growth_cap_bars", {value0: state.n}), kind: "line", object: "bars"},
                ...(d.sequence.limit !== null
                    ? [{id: "limit" as const, label: message("recursion_graph_growth_cap_limit", {value0: num(d.sequence.limit)}), kind: "dashed" as const, object: "limit"}] : []),
            ];
        }
        if (state.panel === "interest") {
            return [
                {id: "simple", label: message("recursion_graph_growth_cap_simple", {value0: money(d.interest.simple)}), kind: "dashed", object: "simple"},
                {id: "compound", label: message("recursion_graph_growth_cap_compound", {value0: money(d.interest.compound)}), kind: "line", object: "compound"},
                {id: "relative", label: message("recursion_graph_growth_cap_relative", {value0: state.parts, value1: money(d.interest.relative)}), kind: "line", object: "relative"},
                {id: "continuous", label: message("recursion_graph_growth_cap_continuous", {value0: money(d.interest.continuous)}), kind: "dashed", object: "continuous"},
            ];
        }
        return [
            {id: "points", label: message(state.logModel === "exponential" ? "recursion_graph_growth_cap_points_exponential" : "recursion_graph_growth_cap_points_power"), kind: "line", object: "points"},
            {id: "chord", label: message("recursion_graph_growth_cap_chord", {value0: num(d.log.slope)}), kind: "dashed", object: "chord"},
        ];
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const element = this.drawn.get(id);
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp("strokecolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    /** The panel's text of the declared rows of one group. */
    private listRows(rows: readonly GrowthRow[]): ReadoutListRow[] {
        return rows.map(({id, name, value}): ReadoutListRow => ({
            id, label: name ? renderMessage(name) : "", value: "kind" in value && value.kind === "formatted" ? value.text : renderMessage(value as Message),
        }));
    }

    // ---- Controls -----------------------------------------------------------------------------------------------------------------

    private range(range: IntegerRange, scale: number) {
        return {value0: dec(range.min / scale), value1: dec(range.max / scale), value2: dec(1 / scale)};
    }

    private rejected(name: string, range: IntegerRange, scale: number) {
        return t("recursion_graph_growth_rejected", {value0: name, value1: dec(range.min / scale), value2: dec(range.max / scale), value3: dec(1 / scale)});
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const commands: JSX.Element[] = [
            <PuckOwned key="panel" param="growth-panel"><ChoiceSelect label={t("recursion_graph_growth_panel_label")} value={state.panel} help={t("recursion_graph_growth_panel_help")}
                          options={GROWTH_PANELS.map(value => ({value, text: PANEL_NAMES[value]()}))}
                          onChange={value => { const panel = GROWTH_PANELS.find(candidate => candidate === value); if (panel) this.editPanel(panel); }}/></PuckOwned>,
        ];
        if (state.panel === "sequence") {
            commands.push(
                <ChoiceSelect key="kind" label={t("recursion_graph_growth_kind_label")} value={state.kind} help={t("recursion_graph_growth_kind_help")}
                              options={SEQUENCE_KINDS.map(value => ({value, text: KIND_NAMES[value]()}))}
                              onChange={value => { const kind = SEQUENCE_KINDS.find(candidate => candidate === value); if (kind) this.editKind(kind); }}/>,
                <Slider key="a1" customText={t("recursion_graph_growth_a1_label")} value={state.a1} step={1} bigStep={10} min={A1_RANGE.min} max={A1_RANGE.max}
                        grid={1} rejectedHint={this.rejected(t("recursion_graph_growth_a1_label"), A1_RANGE, 1)} onChange={value => this.editFirstTerm(value)}/>,
            );
            if (state.kind === "arithmetic") {
                commands.push(
                    <PuckOwned key="d" param="growth-d"><Slider customText={t("recursion_graph_growth_d_label")} value={state.d} step={1} bigStep={5} min={D_RANGE.min} max={D_RANGE.max}
                            grid={1} rejectedHint={this.rejected(t("recursion_graph_growth_d_label"), D_RANGE, 1)} onChange={value => this.editDifference(value)}/></PuckOwned>,
                );
            } else {
                commands.push(
                    <PuckOwned key="q" param="growth-q"><Slider customText={t("recursion_graph_growth_q_label")} value={state.q / Q_SCALE} step={1 / Q_SCALE} bigStep={1} min={Q_RANGE.min / Q_SCALE}
                            max={Q_RANGE.max / Q_SCALE} grid={1 / Q_SCALE} decimals={1} help={t("recursion_graph_growth_q_help")}
                            rejectedHint={this.rejected(t("recursion_graph_growth_q_label"), Q_RANGE, Q_SCALE)} onChange={value => this.editRatio(value)}/></PuckOwned>,
                );
            }
            commands.push(
                <PuckOwned key="n" param="growth-n"><CountSetter label={t("recursion_graph_growth_n_label")} n={state.n} min={TERMS_RANGE.min} max={TERMS_RANGE.max} bigStep={5}
                             onPlus={() => this.editTerms(state.n + 1)} onMinus={() => this.editTerms(state.n - 1)} onSet={value => this.editTerms(value)}/></PuckOwned>,
            );
        } else if (state.panel === "interest") {
            commands.push(
                <NumberInput key="capital" label={t("recursion_graph_growth_capital_label")} value={state.capital} step={1} bigStep={100} min={CAPITAL_RANGE.min}
                             max={CAPITAL_RANGE.max} grid={1} decimals={0}
                             rejectedHint={this.rejected(t("recursion_graph_growth_capital_label"), CAPITAL_RANGE, 1)} onChange={value => this.editCapital(value)}/>,
                <PuckOwned key="rate" param="growth-rate"><Slider customText={t("recursion_graph_growth_rate_label")} value={state.rate / PERCENT_SCALE} step={1 / PERCENT_SCALE} bigStep={1}
                        min={RATE_RANGE.min / PERCENT_SCALE} max={RATE_RANGE.max / PERCENT_SCALE} grid={1 / PERCENT_SCALE} decimals={1}
                        rejectedHint={this.rejected(t("recursion_graph_growth_rate_label"), RATE_RANGE, PERCENT_SCALE)} onChange={value => this.editRate(value)}/></PuckOwned>,
                <PuckOwned key="years" param="growth-years"><CountSetter label={t("recursion_graph_growth_years_label")} n={state.years} min={YEARS_RANGE.min} max={YEARS_RANGE.max} bigStep={5}
                             onPlus={() => this.editYears(state.years + 1)} onMinus={() => this.editYears(state.years - 1)} onSet={value => this.editYears(value)}/></PuckOwned>,
                <ChoiceSelect key="parts" label={t("recursion_graph_growth_parts_label")} value={String(state.parts)} help={t("recursion_graph_growth_parts_help")}
                              options={INTEREST_PARTS.map(value => ({value: String(value), text: PARTS_NAMES[value]()}))}
                              onChange={value => { this.editParts(Number(value)); }}/>,
            );
        } else {
            commands.push(
                <PuckOwned key="model" param="growth-model"><ChoiceSelect label={t("recursion_graph_growth_model_label")} value={state.logModel} help={t("recursion_graph_growth_model_help")}
                              options={LOG_MODELS.map(value => ({value, text: MODEL_NAMES[value]()}))}
                              onChange={value => { const model = LOG_MODELS.find(candidate => candidate === value); if (model) this.editModel(model); }}/></PuckOwned>,
                <Slider key="y0" customText={t("recursion_graph_growth_y0_label")} value={state.y0} step={1} bigStep={100} min={Y0_RANGE.min} max={Y0_RANGE.max}
                        grid={1} rejectedHint={this.rejected(t("recursion_graph_growth_y0_label"), Y0_RANGE, 1)} onChange={value => this.editStartValue(value)}/>,
            );
            if (state.logModel === "exponential") {
                commands.push(
                    <PuckOwned key="logq" param="growth-logq"><Slider customText={t("recursion_graph_growth_logq_label")} value={state.logQ / LOG_Q_SCALE} step={1 / LOG_Q_SCALE} bigStep={0.1}
                            min={LOG_Q_RANGE.min / LOG_Q_SCALE} max={LOG_Q_RANGE.max / LOG_Q_SCALE} grid={1 / LOG_Q_SCALE} decimals={2}
                            rejectedHint={this.rejected(t("recursion_graph_growth_logq_label"), LOG_Q_RANGE, LOG_Q_SCALE)} onChange={value => this.editGrowthFactor(value)}/></PuckOwned>,
                );
            }
            commands.push(
                <PuckOwned key="steps" param="growth-n"><CountSetter label={t("recursion_graph_growth_steps_label")} n={state.n} min={TERMS_RANGE.min} max={TERMS_RANGE.max} bigStep={5}
                             help={t("recursion_graph_growth_steps_help")}
                             onPlus={() => this.editTerms(state.n + 1)} onMinus={() => this.editTerms(state.n - 1)} onSet={value => this.editTerms(value)}/></PuckOwned>,
            );
        }
        return commands;
    }

    private noteKey() {
        const panel = this.state.panel;
        return panel === "sequence" ? "recursion_graph_growth_note_sequence" as const
            : panel === "interest" ? "recursion_graph_growth_note_interest" as const : "recursion_graph_growth_note_log" as const;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group" data-declared-panel="">
                <ReadoutHeading>{t("recursion_graph_growth_readout_title")}</ReadoutHeading>
                <p data-recursion-status="" data-readout-note="">{this.statusText()}</p>
                <ReadoutList label={t("recursion_graph_growth_readout_title")} rows={this.listRows(this.readoutRows())}/>
                {this.state.panel === "interest" && <ReadoutList label={t("recursion_graph_growth_e_title")} rows={this.listRows(this.eRows())}/>}
                <ReadoutHelp hooks={{"data-readout-note": ""}}><span data-recursion-note="">{t(this.noteKey())}</span></ReadoutHelp>
                <LiveReadout readout={this.status} muted={false}/>
            </div>
        </>;
    }
}

export default GrowthGraph;
