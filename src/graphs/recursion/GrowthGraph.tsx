import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
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

const PANEL_NAMES: Readonly<Record<GrowthPanel, () => string>> = {
    sequence: () => t("recursion_graph_growth_panel_sequence"),
    interest: () => t("recursion_graph_growth_panel_interest"),
    log: () => t("recursion_graph_growth_panel_log"),
};
const KIND_NAMES: Readonly<Record<SequenceKind, () => string>> = {
    arithmetic: () => t("recursion_graph_growth_kind_arithmetic"),
    geometric: () => t("recursion_graph_growth_kind_geometric"),
};
const MODEL_NAMES: Readonly<Record<LogModel, () => string>> = {
    exponential: () => t("recursion_graph_growth_model_exponential"),
    power: () => t("recursion_graph_growth_model_power"),
};
const PARTS_NAMES: Readonly<Record<number, () => string>> = {
    1: () => t("recursion_graph_growth_parts_1"),
    2: () => t("recursion_graph_growth_parts_2"),
    4: () => t("recursion_graph_growth_parts_4"),
    12: () => t("recursion_graph_growth_parts_12"),
    365: () => t("recursion_graph_growth_parts_365"),
};

type Style = {readonly color: string; readonly width: number; readonly dash: number};
/** The four interest curves differ in width and dash as well as colour, and the legend draws a sample of each. */
const INTEREST_STYLES: readonly Style[] = [
    {color: GraphPalette.referenceCurve, width: 2, dash: 2},
    {color: GraphPalette.primaryCurve, width: 4, dash: 0},
    {color: GraphPalette.constructionAccent, width: 2, dash: 0},
    {color: GraphPalette.comparisonCurve, width: 2, dash: 3},
];
/** Fractions of the window: the axis caption at the top, caption rows below it, text starting right of the vertical axis. */
const ROW_Y = 0.97;
const ROW_STEP = 0.06;
const rowY = (row: number): number => ROW_Y - ROW_STEP * (row + 1);
const TEXT_X = 0.12;

interface Cache {
    readonly state: GrowthGraphState;
    readonly derived: GrowthDerived;
    readonly box: Box;
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
        if (this.keepImportedView) this.drawnBox = boxOf(imported, deriveGrowth(imported));
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
        this.board.setBoundingBox([...this.initialView()], false);
    }

    protected override initialView(): [number, number, number, number] {
        return [...boxOf(DEFAULT_GROWTH_STATE, deriveGrowth(DEFAULT_GROWTH_STATE))];
    }

    // ---- Derived numbers: a cache keyed by the state object ---------------------------------------------------------------

    private current(): Cache {
        if (!this.cache || this.cache.state !== this.state) {
            const derived = deriveGrowth(this.state);
            this.cache = {state: this.state, derived, box: boxOf(this.state, derived)};
        }
        return this.cache;
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
        this.board.setBoundingBox([...box], false);
    }

    private curve(data: () => Polyline, style: Style, visible: () => boolean): JXG.Curve {
        const curve = this.scene.own(this.board.create("curve", [[], []], {
            highlight: false, fixed: true, withLabel: false, strokeColor: style.color, strokeWidth: style.width, dash: style.dash, visible,
        }));
        curve.updateDataArray = () => {
            const {x, y} = data();
            curve.dataX = x;
            curve.dataY = y;
        };
        return curve;
    }

    private caption(text: () => string, place: () => {x: number; y: number}, visible: () => boolean, anchorX: "left" | "right" = "left"): JXG.Text {
        return this.scene.own(this.board.create("text", [() => place().x, () => place().y, text], {
            strokeColor: GraphPalette.label, fontSize: 14, anchorX, anchorY: "middle", fixed: true, highlight: false, withLabel: false, visible,
        }));
    }

    /** The vertical axis title starts a few pixels right of the axis, where no tick label stands (they are left of it). */
    private axisTitleX(): number {
        const [xmin, , xmax] = this.current().box;
        const {unitX} = this.board;
        return (xmin < 0 && xmax > 0 ? 0 : xmin) + 6 / (unitX > 0 ? unitX : 1);
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
        const box = () => this.current().box;
        const on = (panel: GrowthPanel) => () => this.state.panel === panel;
        const place = (fx: number, fy: number) => () => at(box(), fx, fy);

        // Sequence panel: the bars of the terms, the limit line, the n-th term marked.
        this.curve(() => barsPath(derived().sequence.terms.map(Number)), {color: GraphPalette.primaryCurve, width: 2, dash: 0}, on("sequence"));
        this.curve(() => {
            const limit = derived().sequence.limit ?? 0;
            return {x: [box()[0], box()[2]], y: [limit, limit]};
        }, {color: GraphPalette.comparisonCurve, width: 2, dash: 2}, () => state().panel === "sequence" && derived().sequence.limit !== null);
        this.marker(() => state().n, () => Number(derived().sequence.nth), on("sequence"), "diamond", GraphPalette.constructionAccent);
        this.caption(() => t("recursion_graph_growth_cap_bars", {value0: state().n}), place(TEXT_X, rowY(0)), on("sequence"));
        this.caption(() => t("recursion_graph_growth_cap_nth", {value0: subscript(state().n), value1: seq(derived().sequence.nth)}),
            place(TEXT_X, rowY(1)), on("sequence"));
        this.caption(() => t("recursion_graph_growth_cap_limit", {value0: num(derived().sequence.limit ?? NaN)}), place(TEXT_X, rowY(2)),
            () => state().panel === "sequence" && derived().sequence.limit !== null);

        // Interest panel: four curves in the window of the years, each with a legend line of the same style and a caption.
        const values = (): number[] => {
            const d = derived().interest;
            return [d.simple, d.compound, d.relative, d.continuous];
        };
        const capital = () => state().capital;
        const p = () => derived().interest.p;
        const parts = () => state().parts;
        const models: Array<(time: number) => number> = [
            time => capital() * (1 + p() * time),
            time => capital() * Math.pow(1 + p(), time),
            time => capital() * Math.pow(1 + p() / parts(), parts() * time),
            time => capital() * Math.exp(p() * time),
        ];
        const captions: Array<() => string> = [
            () => t("recursion_graph_growth_cap_simple", {value0: money(values()[0])}),
            () => t("recursion_graph_growth_cap_compound", {value0: money(values()[1])}),
            () => t("recursion_graph_growth_cap_relative", {value0: parts(), value1: money(values()[2])}),
            () => t("recursion_graph_growth_cap_continuous", {value0: money(values()[3])}),
        ];
        models.forEach((model, index) => {
            this.curve(() => sampleCurve(model, 0, state().years), INTEREST_STYLES[index], on("interest"));
        });
        INTEREST_STYLES.forEach((style, index) => {
            this.curve(() => {
                const from = at(box(), TEXT_X, rowY(index));
                return {x: [from.x, at(box(), TEXT_X + 0.06, rowY(index)).x], y: [from.y, from.y]};
            }, style, on("interest"));
            this.caption(captions[index], place(TEXT_X + 0.08, rowY(index)), on("interest"));
        });

        // Logarithm panel: the points (n, ln y), the chord through the first and the last point, one marker per point.
        this.curve(() => ({x: [...derived().log.ns], y: [...derived().log.lnY]}), {color: GraphPalette.primaryCurve, width: 2, dash: 0}, on("log"));
        this.curve(() => chord(derived().log.ns, derived().log.lnY), {color: GraphPalette.constructionAccent, width: 2, dash: 2}, on("log"));
        for (let index = 0; index < LOG_POINTS; index++) {
            this.marker(() => derived().log.ns[index] ?? 0, () => derived().log.lnY[index] ?? 0,
                () => state().panel === "log" && index < derived().log.ns.length, "circle", GraphPalette.primaryCurve);
        }
        this.caption(() => t(state().logModel === "exponential" ? "recursion_graph_growth_cap_points_exponential" : "recursion_graph_growth_cap_points_power"),
            place(TEXT_X, rowY(0)), on("log"));
        this.caption(() => t("recursion_graph_growth_cap_chord", {value0: num(derived().log.slope)}), place(TEXT_X, rowY(1)), on("log"));

        // Axis captions of every panel: what the horizontal and the vertical axis show, and the unit.
        this.caption(() => t(state().panel === "sequence" ? "recursion_graph_growth_cap_x_sequence" : state().panel === "interest"
            ? "recursion_graph_growth_cap_x_interest" : "recursion_graph_growth_cap_x_log"), place(0.99, 0.035), () => true, "right");
        this.caption(() => t(state().panel === "sequence" ? "recursion_graph_growth_cap_y_sequence" : state().panel === "interest"
            ? "recursion_graph_growth_cap_y_interest" : "recursion_graph_growth_cap_y_log"), () => ({x: this.axisTitleX(), y: at(box(), 0, ROW_Y).y}), () => true);
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
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
                this.editStored("set-map", {...rest, ...(sequence !== undefined ? {kind: sequence} : {})}, ["panel", "kind"]);
                return;
            }
            case "set-params": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-params", patch, ["a1", "d", "q", "n"]);
                return;
            }
            case "set-interest": {
                const {kind: _kind, operation: _operation, ...patch} = action;
                this.editStored("set-interest", patch, ["capital", "rate", "years", "parts"]);
                return;
            }
            default: {
                const unsupported: never = action;
                throw new Error(`recursion: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
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

    private statusText(): string {
        const state = this.state;
        const d = this.derived();
        if (state.panel === "sequence") {
            const n = subscript(state.n);
            const seqd = d.sequence;
            const base = state.kind === "arithmetic"
                ? t("recursion_graph_growth_status_arithmetic", {value0: n, value1: seq(seqd.nth), value2: seq(seqd.sum)})
                : t(seqd.exact ? "recursion_graph_growth_status_geometric_exact" : "recursion_graph_growth_status_geometric_computed",
                    {value0: n, value1: seq(seqd.nth), value2: seq(seqd.sum)});
            return seqd.limit === null ? base : `${base} ${t("recursion_graph_growth_status_limit", {value0: num(seqd.limit)})}`;
        }
        if (state.panel === "interest") {
            const i = d.interest;
            return t("recursion_graph_growth_status_interest", {
                value0: state.years, value1: money(i.simple), value2: money(i.compound), value3: state.parts, value4: money(i.relative), value5: money(i.continuous),
            });
        }
        const l = d.log;
        return l.straight
            ? t("recursion_graph_growth_status_log_line", {value0: num(l.slope), value1: num(l.lnQ), value2: num(Math.exp(l.slope))})
            : t("recursion_graph_growth_status_log_curve", {value0: num(l.slopeFirst), value1: num(l.slopeLast)});
    }

    private sequenceRows(): ReadoutListRow[] {
        const state = this.state;
        const s = this.derived().sequence;
        const n = subscript(state.n);
        const shown = s.terms.slice(0, FIRST_TERMS).map(seq);
        const rows: ReadoutListRow[] = [
            {id: "kind", label: t("recursion_graph_growth_r_kind"), value: KIND_NAMES[state.kind]()},
            {id: "first", label: t("recursion_graph_growth_r_first"), value: seq(BigInt(state.a1))},
            state.kind === "arithmetic"
                ? {id: "difference", label: t("recursion_graph_growth_r_difference"), value: seq(BigInt(state.d))}
                : {id: "ratio", label: t("recursion_graph_growth_r_ratio"), value: num(state.q / Q_SCALE)},
            {id: "terms", label: t("recursion_graph_growth_r_terms"), value: shown.join(LIST_SEPARATOR) + (s.terms.length > FIRST_TERMS ? `${LIST_SEPARATOR}…` : "")},
            {id: "nth", label: t("recursion_graph_growth_r_nth", {value0: n}), value: seq(s.nth)},
            {id: "sum", label: t("recursion_graph_growth_r_sum", {value0: n}), value: seq(s.sum)},
            {id: "precision", label: t("recursion_graph_growth_r_precision"),
                value: t(s.exact ? "recursion_graph_growth_precision_exact" : "recursion_graph_growth_precision_computed")},
        ];
        if (state.kind === "geometric") {
            rows.push({id: "limit", label: t("recursion_graph_growth_r_limit"),
                value: s.limit === null ? t("recursion_graph_growth_limit_none") : t("recursion_graph_growth_limit_value", {value0: num(s.limit)})});
        }
        return rows;
    }

    private interestRows(): ReadoutListRow[] {
        const state = this.state;
        const i = this.derived().interest;
        return [
            {id: "capital", label: t("recursion_graph_growth_r_capital"), value: money(state.capital)},
            {id: "rate", label: t("recursion_graph_growth_r_rate"), value: percent(i.p, 2)},
            {id: "years", label: t("recursion_graph_growth_r_years"), value: String(state.years)},
            {id: "parts", label: t("recursion_graph_growth_r_parts"), value: PARTS_NAMES[state.parts]()},
            {id: "simple", label: t("recursion_graph_growth_r_simple"), value: money(i.simple)},
            {id: "compound", label: t("recursion_graph_growth_r_compound"), value: money(i.compound)},
            {id: "relative", label: t("recursion_graph_growth_r_relative", {value0: state.parts}), value: money(i.relative)},
            {id: "continuous", label: t("recursion_graph_growth_r_continuous"), value: money(i.continuous)},
            {id: "conformal", label: t("recursion_graph_growth_r_conformal", {value0: state.parts}), value: percent(i.conformal)},
            {id: "conformal-value", label: t("recursion_graph_growth_r_conformal_value", {value0: state.parts * state.years}), value: money(i.conformalValue)},
            {id: "doubling", label: t("recursion_graph_growth_r_doubling"), value: t("recursion_graph_growth_years_value", {value0: dec(i.doubling, 4)})},
            {id: "rule72", label: t("recursion_graph_growth_r_rule72"), value: t("recursion_graph_growth_years_value", {value0: dec(i.ruleOf72, 1)})},
        ];
    }

    private eRows(): ReadoutListRow[] {
        const rows: ReadoutListRow[] = this.derived().interest.eTable.map(row => ({
            id: `e-${row.n}`, label: t("recursion_graph_growth_r_e_n", {value0: dec(row.n, 0)}), value: dec(row.value),
        }));
        rows.push({id: "e", label: t("recursion_graph_growth_r_e"), value: dec(Math.E)});
        return rows;
    }

    private logRows(): ReadoutListRow[] {
        const state = this.state;
        const l = this.derived().log;
        const last = l.ns.length - 1;
        const rows: ReadoutListRow[] = [
            {id: "model", label: t("recursion_graph_growth_r_model"), value: MODEL_NAMES[state.logModel]()},
            {id: "start", label: t("recursion_graph_growth_r_y0"), value: dec(state.y0, 0)},
        ];
        if (state.logModel === "exponential") rows.push({id: "factor", label: t("recursion_graph_growth_r_factor"), value: num(l.q)});
        rows.push(
            {id: "last-y", label: t("recursion_graph_growth_r_last_y", {value0: subscript(l.ns[last])}), value: num(l.ys[last])},
            {id: "last-ln", label: t("recursion_graph_growth_r_last_ln", {value0: subscript(l.ns[last])}), value: num(l.lnY[last])},
            {id: "slope", label: t("recursion_graph_growth_r_slope"), value: num(l.slope)},
            {id: "slope-first", label: t("recursion_graph_growth_r_slope_first"), value: num(l.slopeFirst)},
            {id: "slope-last", label: t("recursion_graph_growth_r_slope_last"), value: num(l.slopeLast)},
        );
        if (state.logModel === "exponential") {
            rows.push(
                {id: "ln-q", label: t("recursion_graph_growth_r_ln_q"), value: t("recursion_graph_growth_computed_value", {value0: num(l.lnQ)})},
                {id: "q-from-slope", label: t("recursion_graph_growth_r_q_from_slope"), value: t("recursion_graph_growth_computed_value", {value0: num(Math.exp(l.slope))})},
            );
        }
        rows.push({id: "line", label: t("recursion_graph_growth_r_line"),
            value: t(l.straight ? "recursion_graph_growth_line_yes" : "recursion_graph_growth_line_no")});
        return rows;
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
            <ChoiceSelect key="panel" label={t("recursion_graph_growth_panel_label")} value={state.panel} help={t("recursion_graph_growth_panel_help")}
                          options={GROWTH_PANELS.map(value => ({value, text: PANEL_NAMES[value]()}))}
                          onChange={value => { const panel = GROWTH_PANELS.find(candidate => candidate === value); if (panel) this.editPanel(panel); }}/>,
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
                    <Slider key="d" customText={t("recursion_graph_growth_d_label")} value={state.d} step={1} bigStep={5} min={D_RANGE.min} max={D_RANGE.max}
                            grid={1} rejectedHint={this.rejected(t("recursion_graph_growth_d_label"), D_RANGE, 1)} onChange={value => this.editDifference(value)}/>,
                );
            } else {
                commands.push(
                    <Slider key="q" customText={t("recursion_graph_growth_q_label")} value={state.q / Q_SCALE} step={1 / Q_SCALE} bigStep={1} min={Q_RANGE.min / Q_SCALE}
                            max={Q_RANGE.max / Q_SCALE} grid={1 / Q_SCALE} decimals={1} help={t("recursion_graph_growth_q_help")}
                            rejectedHint={this.rejected(t("recursion_graph_growth_q_label"), Q_RANGE, Q_SCALE)} onChange={value => this.editRatio(value)}/>,
                );
            }
            commands.push(
                <CountSetter key="n" label={t("recursion_graph_growth_n_label")} n={state.n} min={TERMS_RANGE.min} max={TERMS_RANGE.max} bigStep={5}
                             onPlus={() => this.editTerms(state.n + 1)} onMinus={() => this.editTerms(state.n - 1)} onSet={value => this.editTerms(value)}/>,
            );
        } else if (state.panel === "interest") {
            commands.push(
                <NumberInput key="capital" label={t("recursion_graph_growth_capital_label")} value={state.capital} step={1} bigStep={100} min={CAPITAL_RANGE.min}
                             max={CAPITAL_RANGE.max} grid={1} decimals={0}
                             rejectedHint={this.rejected(t("recursion_graph_growth_capital_label"), CAPITAL_RANGE, 1)} onChange={value => this.editCapital(value)}/>,
                <Slider key="rate" customText={t("recursion_graph_growth_rate_label")} value={state.rate / PERCENT_SCALE} step={1 / PERCENT_SCALE} bigStep={1}
                        min={RATE_RANGE.min / PERCENT_SCALE} max={RATE_RANGE.max / PERCENT_SCALE} grid={1 / PERCENT_SCALE} decimals={1}
                        rejectedHint={this.rejected(t("recursion_graph_growth_rate_label"), RATE_RANGE, PERCENT_SCALE)} onChange={value => this.editRate(value)}/>,
                <CountSetter key="years" label={t("recursion_graph_growth_years_label")} n={state.years} min={YEARS_RANGE.min} max={YEARS_RANGE.max} bigStep={5}
                             onPlus={() => this.editYears(state.years + 1)} onMinus={() => this.editYears(state.years - 1)} onSet={value => this.editYears(value)}/>,
                <ChoiceSelect key="parts" label={t("recursion_graph_growth_parts_label")} value={String(state.parts)} help={t("recursion_graph_growth_parts_help")}
                              options={INTEREST_PARTS.map(value => ({value: String(value), text: PARTS_NAMES[value]()}))}
                              onChange={value => { this.editParts(Number(value)); }}/>,
            );
        } else {
            commands.push(
                <ChoiceSelect key="model" label={t("recursion_graph_growth_model_label")} value={state.logModel} help={t("recursion_graph_growth_model_help")}
                              options={LOG_MODELS.map(value => ({value, text: MODEL_NAMES[value]()}))}
                              onChange={value => { const model = LOG_MODELS.find(candidate => candidate === value); if (model) this.editModel(model); }}/>,
                <Slider key="y0" customText={t("recursion_graph_growth_y0_label")} value={state.y0} step={1} bigStep={100} min={Y0_RANGE.min} max={Y0_RANGE.max}
                        grid={1} rejectedHint={this.rejected(t("recursion_graph_growth_y0_label"), Y0_RANGE, 1)} onChange={value => this.editStartValue(value)}/>,
            );
            if (state.logModel === "exponential") {
                commands.push(
                    <Slider key="logq" customText={t("recursion_graph_growth_logq_label")} value={state.logQ / LOG_Q_SCALE} step={1 / LOG_Q_SCALE} bigStep={0.1}
                            min={LOG_Q_RANGE.min / LOG_Q_SCALE} max={LOG_Q_RANGE.max / LOG_Q_SCALE} grid={1 / LOG_Q_SCALE} decimals={2}
                            rejectedHint={this.rejected(t("recursion_graph_growth_logq_label"), LOG_Q_RANGE, LOG_Q_SCALE)} onChange={value => this.editGrowthFactor(value)}/>,
                );
            }
            commands.push(
                <CountSetter key="steps" label={t("recursion_graph_growth_steps_label")} n={state.n} min={TERMS_RANGE.min} max={TERMS_RANGE.max} bigStep={5}
                             help={t("recursion_graph_growth_steps_help")}
                             onPlus={() => this.editTerms(state.n + 1)} onMinus={() => this.editTerms(state.n - 1)} onSet={value => this.editTerms(value)}/>,
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
        const panel = this.state.panel;
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("recursion_graph_growth_readout_title")}</ReadoutHeading>
                <p data-recursion-status="">{this.statusText()}</p>
                <ReadoutList label={t("recursion_graph_growth_readout_title")} rows={panel === "sequence" ? this.sequenceRows() : panel === "interest" ? this.interestRows() : this.logRows()}/>
                {panel === "interest" && <ReadoutList label={t("recursion_graph_growth_e_title")} rows={this.eRows()}/>}
                <ReadoutHelp><span data-recursion-note="">{t(this.noteKey())}</span></ReadoutHelp>
                <LiveReadout readout={this.status} muted={false}/>
            </div>
        </>;
    }
}

export default GrowthGraph;
