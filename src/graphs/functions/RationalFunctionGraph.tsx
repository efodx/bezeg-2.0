import React from "react";
import {guard, guardField} from "../base/controls/guard";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel, LABEL_STYLE, mathTextHtml} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned} from "../base/controls/PuckOwnership";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, messageNumber, t, useT} from "../../localization";
import {formulaMessage, joinedMessage} from "./formulaMessage";
import {formatNumber, MINUS_SIGN} from "../../analysis/format";
import {PlotPoint, plotPieces, POLY_BOUNDS} from "../../analysis/schoolFunctions";
import {MAX_POLY_DEGREE, polyValue} from "../../analysis/polynomial";
import {
    addRationalZero, chooseRationalExample, DEFAULT_RATIONAL_FUNCTION_MODEL, exampleOfRational, moveRationalZero, PROBE_BOUNDS, RATIONAL_EXAMPLE_IDS,
    RationalExampleId, rationalExampleModel, RationalFacts, rationalFacts, RationalFunctionEdit, RationalFunctionModel, RationalPart, rationalSpecsOf,
    removeRationalZero, setRationalK, setRationalMultiplicity, setRationalProbe,
} from "../../analysis/rationalFunctionModel";
import {ZERO_GRID_DECIMALS} from "../../analysis/zeroListModel";
import {
    asymptoteEquationText, coefficientsText, fractionText, productText, rationalFunctionEditMessage, rationalRuleText,
} from "./rationalFunctionMessages";
import {noticeOfEvent, ZeroListEditor, ZeroListNotice, ZeroListNoticeStore, ZeroListNoticeView, zeroListNoticeText} from "./ZeroListEditor";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {TransientState} from "../base/BaseGraph";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";

/**
 * The ids of the rational function declaration: the probe x is a board puck (the remainder step moves it); the zeros are board gliders and
 * two row editors in Orodja, k and the example stay in Orodja (setup). The legend names what is drawn.
 */
export type RationalFunctionIds = {
    param: "probe";
    row: "rule" | "reduced" | "zeros" | "holes" | "poles" | "pole-0" | "pole-1" | "pole-2" | "pole-3" | "pole-4" | "asymptote" | "division" | "remainder";
    note: "asymptote-crossing"; legend: "curve" | "numerator-zero" | "denominator-zero" | "hole" | "asymptote"; section: never; action: never;
};

/** Step of the arrow keys in the k field and of the probe slider. */
const K_STEP = 0.5;
const PROBE_STEP = 0.5;

/** Dash style (JSXGraph numbering) of the asymptotes: they differ from the curve by pattern and not only by colour. */
const ASYMPTOTE_DASH = 2;

/** At most this many distinct holes or poles: the zero lists have total degree at most 5. */
const MAX_FEATURES = MAX_POLY_DEGREE;

/** What the live text says besides the zero list's own notices: a numerator zero made a hole, or left one (the pole is back). */
export type RationalNotice = ZeroListNotice | { readonly kind: "hole"; readonly x: number; readonly y: number } | { readonly kind: "pole"; readonly x: number };

const describeNotice = (notice: RationalNotice, translate: ReturnType<typeof useT>): string => {
    const number = (value: number) => formatNumber(value, currentLanguage(), 4);
    if (notice.kind === "hole") return translate("rational_function_notice_hole", {value0: number(notice.x), value1: number(notice.y)});
    if (notice.kind === "pole") return translate("rational_function_notice_pole", {value0: number(notice.x)});
    return zeroListNoticeText(notice, translate);
};

/**
 * Rational functions (school function lesson S4). The model is `{k, numerator: [{z, m}], denominator: [{z, m}], probe}`
 * (`src/analysis/rationalFunctionModel`, which owns validity and the issues; the zero list rules are shared with the
 * polynomial-zeros graph in `zeroListModel`): f = p/q with p = k prod (x - a)^m, q = prod (x - b)^n, each list of total degree at most 5.
 * Every zero is a glider on the x-axis (dragged on a grid of 0.1, or typed in a field). A numerator zero dragged onto a denominator zero
 * is a common factor: it makes a hole (open circle), never a pole, and the live text says so; dragging it off restores the pole.
 * The curve is sampled by `plotPieces`, which splits it at poles and holes, so no segment crosses a pole. The remainder term r(x)/q(x) of
 * the division p/q = quotient + r/q is read at a probe x, drawn as the gap between the curve and its horizontal or oblique asymptote.
 */
export class RationalFunctionGraph extends BaseFunctionGraph<RationalFunctionModel> {
    private readonly notices = new ZeroListNoticeStore<RationalNotice>();
    private readonly factsOf = this.modelCache((model: RationalFunctionModel) => rationalFacts(model));
    private gliders: Record<RationalPart, JXG.Point[]> = {numerator: [], denominator: []};
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
    /** Set when a drag merged its zero away: the rest of that drag is ignored, as the dragged glider no longer stands for a zero. */
    private dragMerged = false;

    override presetCollection() {
        return functionPresetCollections["rational-function"];
    }

    protected defaultModel(): RationalFunctionModel {
        return DEFAULT_RATIONAL_FUNCTION_MODEL;
    }

    protected defaultBoundingBox(): BoundingBox {
        return [-11, 9, 11, -9];
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    /** What the edit changed about holes and poles, or a merge it reported. */
    private noticeOf(before: RationalFacts, after: RationalFacts, event: Extract<RationalFunctionEdit, { ok: true }>["event"]): RationalNotice | undefined {
        const holesBefore = new Set(before.analysis.holes.map(hole => hole.x));
        const holesAfter = new Set(after.analysis.holes.map(hole => hole.x));
        const made = after.analysis.holes.find(hole => !holesBefore.has(hole.x));
        if (made) return {kind: "hole", x: made.x, y: made.y};
        const left = before.analysis.holes.find(hole => !holesAfter.has(hole.x) && after.analysis.poles.some(pole => pole.x === hole.x));
        if (left) return {kind: "pole", x: left.x};
        return event ? noticeOfEvent(event) : undefined;
    }

    /** Applies an edit: the notice follows the outcome (a hole made or removed, a merge, a refused rule) and a refusal throws. */
    private applyEdit(edit: RationalFunctionEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) {
            this.notices.set(undefined); // a refusal is shown alone, through the refusal channel
            throw new DomainError(rationalFunctionEditMessage(edit.issue));
        }
        if (edit.model === this.model) return;
        this.notices.set(this.noticeOf(this.factsOf(this.model), this.factsOf(edit.model), edit.event));
        this.commitModel(edit.model, options);
    }

    /** A drag frame's edit: a refusal is shown (an equal one on the next frame is not announced again), an accepted frame clears it. */
    private dragEdit(action: () => void): void {
        try {
            action();
        } catch (error) {
            if (!(error instanceof DomainError)) throw error;
            this.refusals.refuse(error.reason ?? error.message);
            return;
        }
        this.refusals.clear();
    }

    protected setK(value: number): void {
        this.applyEdit(setRationalK(this.model, value));
    }

    protected setProbe(value: number): void {
        this.applyEdit(setRationalProbe(this.model, value));
    }

    /** Moves the zero at `index` (0-based) of a list; a zero landing on another of its list merges, one landing on the other list's makes a hole. */
    protected setZeroPosition(part: RationalPart, index: number, value: number, options: { syncScene?: boolean } = {}): void {
        this.applyEdit(moveRationalZero(this.model, part, index, value), options);
    }

    protected setMultiplicity(part: RationalPart, index: number, value: number): void {
        this.applyEdit(setRationalMultiplicity(this.model, part, index, value));
    }

    protected addZero(part: RationalPart): void {
        this.applyEdit(addRationalZero(this.model, part));
    }

    protected removeZero(part: RationalPart, index: number): void {
        this.applyEdit(removeRationalZero(this.model, part, index));
    }

    protected setExample(id: unknown): void {
        this.applyEdit(chooseRationalExample(this.model, id));
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                k: value => this.setK(value),
                "rational-numerator-1": value => this.setZeroPosition("numerator", 0, value),
                "rational-numerator-2": value => this.setZeroPosition("numerator", 1, value),
                "rational-denominator-1": value => this.setZeroPosition("denominator", 0, value),
                "rational-denominator-2": value => this.setZeroPosition("denominator", 1, value),
                "rational-probe": value => this.setProbe(value),
            },
            choices: {"rational-example": value => this.setExample(value)},
        };
    }

    /** A freshly loaded scene starts without a notice; the notice is transient and never part of a captured scene. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.notices.set(undefined);
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The polyline of f over the view, pieces joined with NaN gaps (the sampler splits at every pole and hole, so no segment crosses one). */
    private plotted(): { x: number[]; y: number[] } {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const x: number[] = [];
        const y: number[] = [];
        plotPieces({kind: "rational", ...rationalSpecsOf(this.model)}, left, right, bottom, top).forEach((piece: PlotPoint[], index) => {
            if (index > 0) {
                x.push(NaN);
                y.push(NaN);
            }
            for (const point of piece) {
                x.push(point.x);
                y.push(point.y);
            }
        });
        return {x, y};
    }

    private curve(samples: () => { x: number[]; y: number[] }, attributes: object): JXG.GeometryElement {
        const curve = this.own(this.board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as {
            updateDataArray: () => void; dataX: number[]; dataY: number[];
        };
        curve.updateDataArray = () => {
            const {x, y} = samples();
            curve.dataX = x;
            curve.dataY = y;
        };
        return curve as unknown as JXG.GeometryElement;
    }

    /** The asymptote as slope and intercept (horizontal: slope 0), or undefined when there is none. */
    private asymptoteLine(): { slope: number; intercept: number } | undefined {
        const asymptote = this.factsOf(this.model).analysis.asymptote;
        if (asymptote.kind === "horizontal") return {slope: 0, intercept: asymptote.y};
        if (asymptote.kind === "oblique") return {slope: asymptote.slope, intercept: asymptote.intercept};
        return undefined;
    }

    /** A board label: HTML text with a light background, hidden with `visible`. */
    private label(position: () => [number, number], content: () => string, visible: () => boolean,
                  anchorX: "left" | "right" | "middle" | (() => "left" | "right") = "left", anchorY: "top" | "bottom" | "middle" = "top"): void {
        this.own(this.board.create("text", [() => position()[0], () => position()[1], () => mathTextHtml(content())], {
            anchorX, anchorY, fixed: true, highlight: false, parse: false, visible, strokeColor: GraphPalette.label,
            fontSize: () => Math.max(10, this.displaySettings.fontSize * 0.9), cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE,
        }));
    }

    /** A dashed straight line through two points given as functions. */
    private dashedLine(from: () => [number, number], to: () => [number, number], visible: () => boolean): JXG.GeometryElement {
        return this.own(this.board.create("line", [[() => from()[0], () => from()[1]], [() => to()[0], () => to()[1]]], {
            straightFirst: true, straightLast: true, dash: ASYMPTOTE_DASH, strokeColor: GraphPalette.comparisonCurve, strokeWidth: this.displayStrokeWidth,
            highlight: false, fixed: true, visible,
        }));
    }

    /** f(x), NaN at a pole. */
    private valueAt(x: number): number {
        const {numerator, denominator} = rationalSpecsOf(this.model);
        return polyValue(numerator, x) / polyValue(denominator, x);
    }

    /**
     * Whether the label x = a sits left of the pole: the label is at the top of the view, so it goes left when f rises to +infinity on the
     * right of a and falls on the left; otherwise the branch near the top is on the left (or on both sides) and the label stays right.
     */
    private poleLabelLeft(a: number): boolean {
        const step = 1 / this.board.unitX;
        return this.valueAt(a + step) > 0 && this.valueAt(a - step) < 0;
    }

    /** The vertical asymptote and the label x = a of the `index`-th pole. */
    private poleObjects(index: number): void {
        const pole = () => this.factsOf(this.model).poles[index];
        const present = () => pole() !== undefined;
        const left = () => this.poleLabelLeft(pole()?.x ?? 0);
        this.drawn.set(`pole-${index}`, this.dashedLine(() => [pole()?.x ?? 0, 0], () => [pole()?.x ?? 0, 1], present));
        this.label(() => {
            const [, top, , bottom] = this.board.getBoundingBox();
            return [(pole()?.x ?? 0) + (left() ? -5 : 5) / this.board.unitX, top - (0.05 + 0.06 * index) * (top - bottom)];
        }, () => `x = ${formatNumber(pole()?.x ?? 0, currentLanguage(), ZERO_GRID_DECIMALS)}`, present, () => left() ? "right" : "left");
    }

    /** The open circle and the point label of the `index`-th hole. */
    private holeObjects(index: number): void {
        const hole = () => this.factsOf(this.model).analysis.holes[index];
        const present = () => hole() !== undefined;
        const strokeWidth = () => Math.max(2, this.displaySettings.strokeWidth * 0.9);
        const ring = this.own(this.board.create("point", [() => hole()?.x ?? 0, () => hole()?.y ?? 0], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size: () => Math.max(4, this.displaySettings.pointSize),
            fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface, strokeColor: GraphPalette.primaryCurve,
            highlightStrokeColor: GraphPalette.primaryCurve, strokeWidth, visible: present,
        }));
        this.drawn.set(`hole-${index}`, ring as JXG.GeometryElement);
        this.label(() => [(hole()?.x ?? 0) + 8 / this.board.unitX, (hole()?.y ?? 0) + 8 / this.board.unitY], () => {
            const language = currentLanguage();
            return t("rational_function_board_point", {value0: formatNumber(hole()?.x ?? 0, language, 4), value1: formatNumber(hole()?.y ?? 0, language, 4)});
        }, present, "left", "bottom");
    }

    /**
     * Where the label of the horizontal or oblique asymptote sits: at the rightmost x where the line is inside the view inset from its
     * edges. A steep line leaves a wide view through the top or bottom edge, so the spot is found by clipping the line, not at the side edges.
     * The label sits above the line and ends at the spot, so it is clear of the line whatever its slope; the spot is the rightmost one where the
     * curve runs below the line, at least 12 px from every pole, so the label does not cover the curve (the plain rightmost spot otherwise).
     */
    private asymptoteLabelSpot(): [number, number] | undefined {
        const line = this.asymptoteLine();
        if (!line) return undefined;
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const inset = 0.04 * (right - left);
        const rise = 0.1 * (top - bottom);
        let low = left + inset;
        let high = right - inset;
        if (line.slope === 0) {
            if (!(line.intercept > bottom + rise && line.intercept < top - rise)) return undefined;
        } else {
            const [a, b] = [(bottom + rise - line.intercept) / line.slope, (top - rise - line.intercept) / line.slope];
            low = Math.max(low, Math.min(a, b));
            high = Math.min(high, Math.max(a, b));
            if (!(low < high)) return undefined;
        }
        const poles = this.factsOf(this.model).poles.map(pole => pole.x);
        const clear = (x: number) => poles.every(pole => Math.abs(x - pole) * this.board.unitX >= 12) && !(this.valueAt(x) >= line.slope * x + line.intercept);
        const samples = 64;
        let spot = high;
        for (let index = 0; index <= samples; index++) {
            const x = high - (high - low) * index / samples;
            if (clear(x)) {
                spot = x;
                break;
            }
        }
        return [spot, line.slope * spot + line.intercept + 6 / this.board.unitY];
    }

    /** The probe: the gap between the curve and its asymptote at x (this is r(x)/q(x)), a point on the curve and its value. */
    private probeObjects(): void {
        const shown = () => this.factsOf(this.model).probe.defined && this.asymptoteLine() !== undefined;
        const onAsymptote = () => {
            const line = this.asymptoteLine();
            return line ? line.slope * this.model.probe + line.intercept : 0;
        };
        const onCurve = () => {
            const {numerator, denominator} = rationalSpecsOf(this.model);
            const y = polyValue(numerator, this.model.probe) / polyValue(denominator, this.model.probe);
            return Number.isFinite(y) ? y : 0;
        };
        this.own(this.board.create("segment", [[() => this.model.probe, onAsymptote], [() => this.model.probe, onCurve]], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth), highlight: false, fixed: true, visible: shown,
        }));
        this.own(this.board.create("point", [() => this.model.probe, onCurve], {
            ...this.styles.point.fixed, name: "rational-probe", withLabel: false, highlight: false, size: () => Math.max(3, this.displaySettings.pointSize * 0.8),
            fillColor: GraphPalette.constructionAccent, highlightFillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.constructionAccent, visible: shown,
        }));
        // In the right part of the view the label goes left of the probe, so it never slides under the readouts card.
        const flipped = () => {
            const [left, , right] = this.board.getBoundingBox();
            return this.model.probe > left + 0.6 * (right - left);
        };
        this.label(() => [this.model.probe + (flipped() ? -6 : 6) / this.board.unitX, (onAsymptote() + onCurve()) / 2 - (flipped() ? 16 : 0) / this.board.unitY], () => {
            const term = this.factsOf(this.model).probe.remainderTerm;
            return t("rational_function_board_remainder", {value0: formatNumber(term ?? 0, currentLanguage(), 4)});
        }, shown, () => flipped() ? "right" : "left", "middle");
    }

    /**
     * The glider of the zero at `index` of a list. Dragging projects the abscissa onto the grid and writes it through the model (so a
     * collision with its own list merges and a refused merge puts the glider back; one on the other list's zero makes a hole). After a
     * merge the rest of that drag is ignored, because the dragged glider no longer stands for a zero of its own.
     */
    private glider(part: RationalPart, index: number): JXG.Point {
        const list = () => this.model[part];
        const present = () => index < list().length;
        const numerator = part === "numerator";
        const color = numerator ? GraphPalette.constructionAccent : GraphPalette.comparisonCurve;
        const point = this.own(this.board.create("point", [0, 0], {
            ...this.styles.point.default, name: "", withLabel: false, fillColor: color, strokeColor: color, highlightFillColor: color, highlightStrokeColor: color,
            face: numerator ? "o" : "x", visible: present, size: () => Math.max(numerator ? 4 : 5, this.displaySettings.pointSize),
        })) as JXG.Point;
        bindMovablePointCursor(point, this.board);
        point.on("down", () => { this.dragMerged = false; });
        point.on("up", () => {
            this.dragMerged = false;
            this.syncSceneToModel();
        });
        point.on("drag", () => {
            if (!present() || this.dragMerged) {
                this.syncSceneToModel();
                return;
            }
            const x = Math.min(POLY_BOUNDS.z[1], Math.max(POLY_BOUNDS.z[0], point.X()));
            const before = list().length;
            this.dragEdit(() => this.setZeroPosition(part, index, x));
            if (list().length < before) this.dragMerged = true;
            this.syncSceneToModel();
        });
        // The multiplicity beside the glider (above the axis for the numerator, below for the denominator), only for a multiple zero.
        this.own(this.board.create("text", [
            () => list()[index]?.z ?? 0, () => (numerator ? 18 : -18) / this.board.unitY, () => `×${list()[index]?.m ?? 1}`,
        ], {
            anchorX: "middle", anchorY: numerator ? "bottom" : "top", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
            visible: () => (list()[index]?.m ?? 1) > 1, fontSize: () => this.displaySettings.fontSize,
        }));
        return point;
    }

    protected createScene(): void {
        for (let index = 0; index < MAX_FEATURES; index++) this.poleObjects(index);
        this.drawn.set("asymptote", this.dashedLine(() => [0, this.asymptoteLine()?.intercept ?? 0], () => [1, (this.asymptoteLine()?.slope ?? 0) + (this.asymptoteLine()?.intercept ?? 0)],
            () => this.asymptoteLine() !== undefined));
        this.label(() => this.asymptoteLabelSpot() ?? [0, 0], () => {
            const line = this.asymptoteLine();
            return line ? asymptoteEquationText(line.slope, line.intercept, currentLanguage()) : "";
        }, () => this.asymptoteLabelSpot() !== undefined, "right", "bottom");

        this.drawn.set("curve", this.curve(() => this.plotted(), {strokeColor: GraphPalette.primaryCurve, strokeWidth: this.displayStrokeWidth}));
        this.probeObjects();
        for (let index = 0; index < MAX_FEATURES; index++) this.holeObjects(index);
        // The denominator's gliders first, so a numerator zero sitting on one (a hole) stays the one that can be grabbed.
        this.gliders = {
            denominator: Array.from({length: MAX_POLY_DEGREE}, (_, index) => this.glider("denominator", index)),
            numerator: Array.from({length: MAX_POLY_DEGREE}, (_, index) => this.glider("numerator", index)),
        };
        this.drawn.set("numerator-zero", this.gliders.numerator[0]);
        this.drawn.set("denominator-zero", this.gliders.denominator[0]);
        this.syncSceneToModel();
    }

    protected override syncSceneToModel(): void {
        for (const part of ["numerator", "denominator"] as const) {
            this.gliders[part].forEach((glider, index) => {
                const zero = this.model[part][index];
                if (zero) glider.moveTo([zero.z, 0]);
            });
        }
    }

    protected override onSceneRemoved(): void {
        this.gliders = {numerator: [], denominator: []};
        this.drawn.clear();
        this.dragMerged = false;
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number) {
        return messageNumber(value, 4);
    }

    private position(value: number) {
        return messageNumber(value, ZERO_GRID_DECIMALS);
    }

    private infinity(direction: "up" | "down"): string {
        return direction === "up" ? "+∞" : `${MINUS_SIGN}∞`;
    }

    private zerosMessage(facts: RationalFacts): Message {
        if (facts.zeros.length === 0) return message("rational_function_zeros_none");
        return joinedMessage(facts.zeros.map(zero => zero.m === 1
            ? message("function_formula_join", {value0: "x = ", value1: this.position(zero.z)})
            : message("rational_function_zero_item_multiple", {value0: this.position(zero.z), value1: zero.m})), ", ");
    }

    private holesMessage(facts: RationalFacts): Message {
        if (facts.analysis.holes.length === 0) return message("rational_function_holes_none");
        return joinedMessage(facts.analysis.holes.map(hole => message("rational_function_hole_value", {
            value0: this.position(hole.x), value1: this.number(hole.y), value2: this.number(hole.y),
        })), "; ");
    }

    private poleMessage(pole: RationalFacts["poles"][number]): Message {
        const params = {value0: this.position(pole.x), value1: pole.multiplicity};
        if (pole.signChanges) {
            return message("rational_function_pole_odd", {...params, value2: this.infinity(pole.left), value3: this.infinity(pole.right)});
        }
        return message("rational_function_pole_even", {...params, value2: this.infinity(pole.left)});
    }

    private asymptoteMessage(facts: RationalFacts): Message {
        const degrees = {value0: facts.degreeNumerator, value1: facts.degreeDenominator};
        const asymptote = facts.analysis.asymptote;
        if (asymptote.kind === "oblique") {
            return message("rational_function_asymptote_oblique", {...degrees, value2: formulaMessage(asymptoteEquationText(asymptote.slope, asymptote.intercept, "en"))});
        }
        if (asymptote.kind === "horizontal") {
            return facts.degreeNumerator === facts.degreeDenominator
                ? message("rational_function_asymptote_horizontal_equal", {...degrees, value2: formulaMessage(asymptoteEquationText(0, asymptote.y, "en"))})
                : message("rational_function_asymptote_horizontal_zero", degrees);
        }
        return message("rational_function_asymptote_none", degrees);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private exampleText(id: RationalExampleId): string {
        const {numerator, denominator} = rationalSpecsOf(rationalExampleModel(id));
        return `f(x) = ${fractionText(numerator, denominator, currentLanguage())}`;
    }

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const current = exampleOfRational(state);
        const options = [
            ...(current === undefined ? [{value: "custom", text: t("rational_function_example_custom")}] : []),
            ...RATIONAL_EXAMPLE_IDS.map(id => ({value: id, text: this.exampleText(id)})),
        ];
        const kRange = {value0: formatNumber(POLY_BOUNDS.k[0], currentLanguage()), value1: formatNumber(POLY_BOUNDS.k[1], currentLanguage())};
        const probeRange = {value0: formatNumber(PROBE_BOUNDS[0], currentLanguage()), value1: formatNumber(PROBE_BOUNDS[1], currentLanguage())};
        const lists = (["numerator", "denominator"] as const).map(part => <ZeroListEditor key={part}
            scope={part === "numerator" ? t("rational_function_numerator") : t("rational_function_denominator")}
            zeros={state[part]} maxDegree={MAX_POLY_DEGREE}
            onMove={(index, next) => guardField(this.refusals, () => this.setZeroPosition(part, index, next))}
            onMultiplicity={(index, next) => { guard(this.refusals, () => this.setMultiplicity(part, index, next)); }}
            onAdd={() => { guard(this.refusals, () => this.addZero(part)); }}
            onRemove={index => { guard(this.refusals, () => this.removeZero(part, index)); }}
            onBlocked={reason => this.refusals.refuse(reason, true)}/>);
        return <>
            {lists}
            <ZeroListNoticeView store={this.notices} describe={describeNotice}/>
            <div className="inspector-group">
                <ChoiceSelect label={t("rational_function_example_label")} value={current ?? "custom"} help={t("rational_function_example_help")}
                              options={options} onChange={next => { if (next !== "custom") guard(this.refusals, () => this.setExample(next)); }}/>
                <Slider customText={t("rational_function_k_label")} value={state.k} min={POLY_BOUNDS.k[0]} max={POLY_BOUNDS.k[1]} step={K_STEP} decimals={4}
                             rejectedHint={t("rational_function_k_hint", kRange)} onChange={next => guardField(this.refusals, () => this.setK(next))}/>
                <PuckOwned param="probe"><Slider customText={t("rational_function_probe_label")} min={PROBE_BOUNDS[0]} max={PROBE_BOUNDS[1]} step={PROBE_STEP} value={state.probe}
                        help={t("rational_function_probe_help")} rejectedHint={t("rational_function_probe_hint", probeRange)}
                        onChange={next => guardField(this.refusals, () => this.setProbe(next))}/></PuckOwned>
            </div>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** The probe x is the one declared parameter (ADR 0064): the existing validated setter, so a value outside the bounds is refused. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {probe: {read: () => this.model.probe, apply: (value: number) => this.setProbe(value)}};
    }

    /**
     * The common declaration (rows, the note, view marks), the probe x as a board puck (the remainder step moves it), and the legend of what
     * is drawn: the entries of the zero gliders, the holes and the asymptotes exist only while the board shows them.
     */
    protected override declaration(): GraphDeclaration {
        const facts = this.factsOf(this.model);
        const drawnAsymptote = this.asymptoteLine() !== undefined || facts.poles.length > 0;
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "probe", kind: "range", label: message("rational_function_probe_name"), symbol: "x", help: message("rational_function_probe_help"), placement: "board",
                    min: PROBE_BOUNDS[0], max: PROBE_BOUNDS[1], step: PROBE_STEP, maxDecimals: 1},
            ],
            legend: [
                {id: "curve", label: message("rational_function_legend_curve"), kind: "line", object: "curve"},
                ...(this.model.numerator.length > 0 ? [{id: "numerator-zero" as const, label: message("rational_function_legend_numerator_zero"), kind: "point" as const, object: "numerator-zero"}] : []),
                ...(this.model.denominator.length > 0 ? [{id: "denominator-zero" as const, label: message("rational_function_legend_denominator_zero"), kind: "cross" as const, object: "denominator-zero"}] : []),
                ...(facts.analysis.holes.length > 0 ? [{id: "hole" as const, label: message("rational_function_legend_hole"), kind: "ring" as const, object: "hole-0"}] : []),
                ...(drawnAsymptote ? [{id: "asymptote" as const, label: message("rational_function_legend_asymptote"), kind: "dashed" as const, object: "asymptote"}] : []),
            ],
        };
    }

    /** The asymptote entry names the horizontal or oblique line, or the first vertical asymptote when there is only that. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id === "asymptote" && this.asymptoteLine() === undefined ? "pole-0" : id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const property = id.endsWith("-zero") ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(property)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base (task 08): the readout rows, the note and the plotted function; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const facts = this.factsOf(model);
        const {numerator, denominator} = rationalSpecsOf(model);
        const {analysis} = facts;
        const rows: FunctionPanel["rows"][number][] = [
            {id: "rule", name: message("rational_function_readout_rule"), value: formulaMessage(rationalRuleText(numerator, denominator, "en"))},
            ...(facts.cancelled ? [{
                id: "reduced", name: message("rational_function_readout_reduced"),
                value: formulaMessage(rationalRuleText(analysis.reducedNumerator, analysis.reducedDenominator, "en")),
            }] : []),
            {id: "zeros", name: message("rational_function_readout_zeros"), value: this.zerosMessage(facts)},
            {id: "holes", name: message("rational_function_readout_holes"), value: this.holesMessage(facts)},
            ...(facts.poles.length === 0
                ? [{id: "poles", name: message("rational_function_readout_poles"), value: message("rational_function_poles_none")}]
                : facts.poles.map((pole, index) => ({id: `pole-${index}`, name: message("rational_function_readout_pole", {value0: index + 1}), value: this.poleMessage(pole)}))),
            {id: "asymptote", name: message("rational_function_readout_asymptote"), value: this.asymptoteMessage(facts)},
        ];
        if (analysis.asymptote.kind !== "none") {
            rows.push({
                id: "division", name: message("rational_function_readout_division"),
                value: message("rational_function_division_value", {
                    value0: formulaMessage(coefficientsText(analysis.quotient, "en")), value1: formulaMessage(coefficientsText(analysis.remainder, "en")),
                    value2: formulaMessage(productText(analysis.reducedDenominator, "en")),
                }),
            }, {
                id: "remainder", name: message("rational_function_readout_remainder", {value0: messageNumber(model.probe, 4)}),
                value: facts.probe.remainderTerm === undefined
                    ? message("rational_function_remainder_undefined", {value0: messageNumber(model.probe, 4)})
                    : message("rational_function_remainder_value", {value0: messageNumber(model.probe, 4), value1: messageNumber(facts.probe.remainderTerm, 4)}),
            });
        }
        return {
            rows,
            notes: [{id: "asymptote-crossing", text: message("rational_function_note")}],
            plotted: x => this.valueAt(x),
            must: [...model.numerator, ...model.denominator].map(zero => ({x: zero.z, y: 0})).concat(analysis.holes.map(hole => ({x: hole.x, y: hole.y}))),
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default RationalFunctionGraph;
