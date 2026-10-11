import React from "react";
import BaseFunctionGraph, {FunctionParameterAction} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {
    CONTINUITY_A_MAX, CONTINUITY_A_MIN, CONTINUITY_A_STEP, isContinuous, JOIN_X, jump, leftLimit, leftSlope, rightLimit, rightSlope, sampleLeftPiece,
    sampleRightPiece, SampledPiece, valueAtJoin,
} from "../../analysis/continuity";
import {ContinuityModel, DEFAULT_CONTINUITY_MODEL, isContinuityParameter, parseContinuityModel} from "../../analysis/continuityModel";
import {UnsupportedLessonActionError} from "../../learning/model";
import {SizeContext} from "../context/SizeContext";
import {PointStyles} from "../styles/PointStyles";
import {GraphPalette} from "../styles/GraphPalette";

/** Removes floating-point noise left by slider arithmetic (30 * 0.05) without changing meaningful digits. */
const clean = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

/** The jump, never shown as "0" while the function is not continuous (an imported a can lie between slider steps). */
const formatJump = (a: number, language: "sl" | "en") => {
    const text = formatNumber(jump(a), language);
    return text === "0" && !isContinuous(a) ? formatNumber(jump(a), language, 12) : text;
};

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
    override presets(): string {
        return "piecewise-continuity";
    }

    protected defaultModel(): ContinuityModel {
        return {...DEFAULT_CONTINUITY_MODEL};
    }

    protected parseModel(data: unknown): ContinuityModel | undefined {
        return parseContinuityModel(data);
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-2, 5, 4, -2];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    /** Sets the parameter; throws when it is outside [0, 3]. */
    protected setParameter(value: number): void {
        if (!isContinuityParameter(value)) {
            throw new Error(`The parameter a must be a finite number between ${CONTINUITY_A_MIN} and ${CONTINUITY_A_MAX}.`);
        }
        this.commitModel({a: clean(value)});
    }

    protected override applyFunctionParameter(action: FunctionParameterAction): void {
        if (action.name === "a") {
            this.setParameter(action.value);
            return;
        }
        throw new UnsupportedLessonActionError(action);
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
        const language = () => currentLanguage();
        const matches = () => isContinuous(model().a);
        const statusColor = () => matches() ? MATCH_COLOR : MISMATCH_COLOR;
        const fontSize = (scale: number) => () => SizeContext.fontSize * scale;
        const topLeft = (row: number) => [
            () => {
                const [left, , right] = board.getBoundingBox();
                return left + 0.04 * (right - left);
            },
            () => {
                const [, top, , bottom] = board.getBoundingBox();
                return top - (0.06 + 0.07 * row) * (top - bottom);
            },
        ];
        const strokeWidth = () => SizeContext.strokeWidth;
        const pieceStyle = {strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth};

        // The left piece ends at x = 1 (included); the right piece starts just right of 1 (excluded).
        this.pieceCurve((left, right) => sampleLeftPiece(model().a, left, right), pieceStyle);
        this.pieceCurve((left, right) => sampleRightPiece(model().a, left, right), pieceStyle);

        // Hollow point first, filled point over it: when the limits agree the filled dot sits inside the ring.
        this.own(board.create("point", [JOIN_X, () => rightLimit(model().a)], {
            ...PointStyles.fixed, name: "$$(1,3-a)$$", highlight: false, size: () => SizeContext.pointSize,
            fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface,
            strokeColor: statusColor, highlightStrokeColor: statusColor, strokeWidth: () => Math.max(2, SizeContext.strokeWidth * 0.9),
        }));
        this.own(board.create("point", [JOIN_X, () => valueAtJoin(model().a)], {
            ...PointStyles.fixed, name: "$$(1,a)$$", highlight: false, size: () => Math.max(3, SizeContext.pointSize * 0.7),
            fillColor: statusColor, highlightFillColor: statusColor,
        }));

        // The status, the most important readout, stays on the board in text as well as colour.
        this.own(board.create("text", [...topLeft(0), () => this.statusText(language())], {
            anchorX: "left", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1.2), strokeColor: statusColor,
        }));
        this.own(board.create("text", [...topLeft(1), () => t("continuity_board_limits", {
            value0: formatNumber(leftLimit(model().a), language()), value1: formatNumber(rightLimit(model().a), language()),
        })], {
            anchorX: "left", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1), strokeColor: GraphPalette.label,
        }));
    }

    private statusText(language: "sl" | "en"): string {
        const {a} = this.model;
        return isContinuous(a) ? t("continuity_board_continuous") : t("continuity_board_jump", {value0: formatJump(a, language)});
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {a} = this.state;
        return <div className="inspector-group">
            <Slider customText={t("continuity_param_label")} min={CONTINUITY_A_MIN} max={CONTINUITY_A_MAX} step={CONTINUITY_A_STEP} fixedValue={a}
                    help={t("continuity_param_help")} formatValue={value => formatNumber(value, currentLanguage())} onChange={next => this.ignoreOutOfDomain(() => this.setParameter(next))}/>
        </div>;
    }

    private ignoreOutOfDomain(action: () => void) {
        try {
            action();
        } catch {
            // The slider only offers values inside the domain.
        }
    }

    protected renderReadout(): React.ReactNode {
        const {a} = this.state;
        const language = currentLanguage();
        const number = (value: number) => formatNumber(value, language);
        const continuous = isContinuous(a);
        const rows = [
            {id: "value", label: "f(1)", value: number(valueAtJoin(a))},
            {id: "left-limit", label: t("continuity_left_limit"), value: number(leftLimit(a))},
            {id: "right-limit", label: t("continuity_right_limit"), value: number(rightLimit(a))},
            {id: "jump", label: t("continuity_jump"), value: formatJump(a, language)},
            {
                id: "status", label: t("continuity_status_label"),
                value: continuous ? t("continuity_board_continuous") : t("continuity_board_jump", {value0: formatJump(a, language)}),
            },
            {id: "left-slope", label: t("continuity_left_slope"), value: number(leftSlope(a))},
            {id: "right-slope", label: t("continuity_right_slope"), value: number(rightSlope(a))},
        ];
        const note = continuous
            ? t("continuity_corner_note", {value0: number(leftSlope(a)), value1: number(rightSlope(a))})
            : undefined;
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={note}/>;
    }
}

export default ContinuityGraph;
