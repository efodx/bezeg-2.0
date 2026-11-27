import React from "react";
import BaseFunctionGraph, {DomainError, localizedSliderValue, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import Slider from "../../inputs/Slider";
import {message, messageNumber, t} from "../../localization";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {formatNumber} from "../../analysis/format";
import {
    CONTINUITY_A_MAX, CONTINUITY_A_MIN, CONTINUITY_A_STEP, isContinuous, JOIN_X, jump, leftLimit, leftSlope, rightLimit, rightSlope, sampleLeftPiece,
    sampleRightPiece, SampledPiece, valueAtJoin,
} from "../../analysis/continuity";
import {ContinuityModel, DEFAULT_CONTINUITY_MODEL, isContinuityParameter} from "../../analysis/continuityModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {numberRangeRejected} from "./functionSetterMessages";
import {cleanNumber} from "../../analysis/numbers";

/** The ids of the continuity declaration: the parameter is a board puck; the drawn objects are the legend. */
export type ContinuityIds = {
    param: "a";
    row: "a" | "value" | "left-limit" | "right-limit" | "jump" | "status" | "left-slope" | "right-slope"; note: "corner";
    legend: "curve" | "value" | "right"; section: never; action: never;
};

/** The jump's decimals for `messageNumber`: more while the function is not continuous, same rule as `formatJump`. */
const jumpDecimals = (a: number) => !isContinuous(a) && formatNumber(jump(a), "en") === "0" ? 12 : undefined;

/** The one-sided values match: the palette's green; they do not: the palette's terracotta. The status text repeats the meaning, colour is never the only cue. */
const MATCH_COLOR = GraphPalette.primaryCurve;
const MISMATCH_COLOR = GraphPalette.constructionLevels[5];

/**
 * Piecewise function `f(x) = a*x^2` for `x <= 1` and `-a*x + 3` for `x > 1` with a slider `a`. Each piece is drawn only on
 * its own domain; the filled point `(1, a)` is the value and the left limit, the hollow point `(1, 3 - a)` is the right
 * limit. Both are green when they agree within the tolerance and terracotta otherwise, and a status text says which.
 * The model is `{a}`; the mathematics comes from `src/analysis/continuity`.
 */
export class ContinuityGraph extends BaseFunctionGraph<ContinuityModel> {
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return functionPresetCollections.continuity;
    }

    protected defaultModel(): ContinuityModel {
        return {...DEFAULT_CONTINUITY_MODEL};
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-2, 5, 4, -2];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    /** Sets the parameter; throws when it is outside [0, 3]. */
    protected setParameter(value: number): void {
        if (!isContinuityParameter(value)) {
            throw new DomainError(numberRangeRejected("continuity_param_label", CONTINUITY_A_MIN, CONTINUITY_A_MAX));
        }
        this.commitModel({a: cleanNumber(value)});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {parameters: {a: value => this.setParameter(value)}};
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** A curve drawn from sample arrays recomputed on every board update (so each piece is clipped to its own domain). */
    private pieceCurve(piece: (left: number, right: number) => SampledPiece, attributes: object) {
        const board = this.board;
        const curve: any = board.create("curve", [[0], [0]], attributes);
        curve.updateDataArray = function (this: any) {
            const [left, , right] = board.getBoundingBox();
            const {x, y} = piece(left, right);
            this.dataX = x;
            this.dataY = y;
        };
        return this.own(curve);
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const matches = () => isContinuous(model().a);
        const statusColor = () => matches() ? MATCH_COLOR : MISMATCH_COLOR;
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const pieceStyle = {strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth};

        // The left piece ends at x = 1 (included); the right piece starts just right of 1 (excluded).
        this.drawn.set("curve", this.pieceCurve((left, right) => sampleLeftPiece(model().a, left, right), pieceStyle));
        this.pieceCurve((left, right) => sampleRightPiece(model().a, left, right), pieceStyle);

        // Hollow point first, filled point over it: when the limits agree the filled dot sits inside the ring.
        this.drawn.set("right", this.own(board.create("point", [JOIN_X, () => rightLimit(model().a)], {
            ...this.styles.point.fixed, name: "$$(1,3-a)$$", highlight: false, size: () => this.displaySettings.pointSize, label: this.pointLabel("above-right"),
            fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface,
            strokeColor: statusColor, highlightStrokeColor: statusColor, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
        })));
        this.drawn.set("value", this.own(board.create("point", [JOIN_X, () => valueAtJoin(model().a)], {
            ...this.styles.point.fixed, name: "$$(1,a)$$", highlight: false, size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
            // The right piece leaves (1, 3 - a) down to the right and the left piece arrives from the left: below-right is free of both and of the ring label.
            label: this.pointLabel("below-right"),
            fillColor: statusColor, highlightFillColor: statusColor,
        })));
    }

    protected override onSceneRemoved(): void {
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {a} = this.model;
        return <PuckOwnedGroup params={["a"]} className="inspector-group">
            <PuckOwned param="a"><Slider customText={t("continuity_param_label")} min={CONTINUITY_A_MIN} max={CONTINUITY_A_MAX} step={CONTINUITY_A_STEP} value={a}
                    help={t("continuity_param_help")} formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setParameter(next))}/></PuckOwned>
        </PuckOwnedGroup>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson name is the key. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {a: {read: () => this.model.a, apply: (value: number) => this.setParameter(value)}};
    }

    /** The common declaration (rows, notes, view marks) plus the parameter as a board puck and the legend of the drawn objects. */
    protected override declaration(): GraphDeclaration {
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "a", kind: "range", label: message("continuity_param_name"), symbol: "a", help: message("continuity_param_help"), placement: "board",
                    min: CONTINUITY_A_MIN, max: CONTINUITY_A_MAX, step: CONTINUITY_A_STEP, maxDecimals: 2},
            ],
            legend: [
                {id: "curve", label: message("continuity_legend_curve"), kind: "line", object: "curve"},
                {id: "value", label: message("continuity_legend_value"), kind: "point", object: "value"},
                {id: "right", label: message("continuity_legend_right"), kind: "ring", object: "right"},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "value" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base (task 08): the readout rows, the corner note and the plotted function; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {a} = this.model;
        const continuous = isContinuous(a);
        const jumpValue = messageNumber(jump(a), jumpDecimals(a));
        return {
            rows: [
                {id: "a", symbol: "a", value: messageNumber(a)},
                {id: "value", symbol: "f(1)", value: messageNumber(valueAtJoin(a))},
                {id: "left-limit", name: message("continuity_left_limit"), value: messageNumber(leftLimit(a))},
                {id: "right-limit", name: message("continuity_right_limit"), value: messageNumber(rightLimit(a))},
                {id: "jump", name: message("continuity_jump"), value: jumpValue},
                {
                    id: "status", name: message("continuity_status_label"),
                    value: continuous ? message("continuity_board_continuous") : message("continuity_board_jump", {value0: jumpValue}),
                },
                {id: "left-slope", name: message("continuity_left_slope"), value: messageNumber(leftSlope(a))},
                {id: "right-slope", name: message("continuity_right_slope"), value: messageNumber(rightSlope(a))},
            ],
            notes: continuous
                ? [{id: "corner", text: message("continuity_corner_note", {value0: messageNumber(leftSlope(a)), value1: messageNumber(rightSlope(a))})}]
                : [],
            plotted: (x: number) => x <= JOIN_X ? a * x * x : -a * x + 3,
            must: [{x: JOIN_X, y: valueAtJoin(a)}, {x: JOIN_X, y: rightLimit(a)}],
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default ContinuityGraph;
