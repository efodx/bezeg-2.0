import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {PointListInput} from "../../inputs/PointListInput";
import {guard} from "../base/controls/guard";
import {currentLanguage, renderMessage, t} from "../../localization";
import {formatLineEquation, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {CORRELATION_MIN_POINTS} from "../../analysis/correlation";
import {
    addCorrelationPoint, chooseCorrelationExample, CORRELATION_COORDINATE_LIMIT, CORRELATION_EXAMPLE_IDS, CORRELATION_POINTS_MAX,
    CORRELATION_POINTS_MIN, correlationExampleOf, CorrelationEdit, CorrelationModel, CorrelationPoint, correlationView, CorrelationView,
    DEFAULT_CORRELATION_MODEL, fitCorrelationView, isCorrelationExampleId, moveCorrelationPoint, removeCorrelationPoint,
    setCorrelationResiduals, setCorrelationXOnY,
} from "../../analysis/correlationModel";
import {correlationEditMessage, correlationNumber} from "./correlationMessages";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

type ViewLine = readonly [number, number, number, number];

export interface LineLabelPlacement {
    x: number;
    y: number;
    anchorX: "left" | "right";
    anchorY: "top" | "bottom";
}

/** The gap kept between a line label and the view's right edge. */
const LINE_LABEL_MARGIN_PX = 12;
/** The gap kept between a line label and the edge of a point marker. */
const LINE_LABEL_POINT_GAP_PX = 3;

/** Where a label may sit along its line, as a share of the line's width from the left, in the order they are tried. */
const LINE_LABEL_ALONG = [0.85, 0.75, 0.65, 0.55, 0.45];

/** The board a line label has to fit on, in user units: the view, the label's size, and the points it keeps clear of. */
export interface LineLabelView {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
    /** The distance kept between the label and a point's centre. */
    clearX: number;
    clearY: number;
    points: readonly CorrelationPoint[];
}

function yOnLine([xa, ya, xb, yb]: ViewLine, x: number): number {
    return xb === xa ? ya : ya + (x - xa) / (xb - xa) * (yb - ya);
}

function placeAlong(along: number, ordered: ViewLine, other: ViewLine | undefined, wins: boolean, view: LineLabelView): LineLabelPlacement {
    const [xa, ya, xb, yb] = ordered;
    const x = xa + along * (xb - xa);
    const rising = yb >= ya;
    let above = rising;
    if (other) {
        const here = yOnLine(ordered, x), there = yOnLine(other, x);
        above = here === there ? wins : here > there;
    }
    const anchorY = above ? "bottom" : "top";
    if (above === rising) return {x, y: yOnLine(ordered, x), anchorX: "right", anchorY};
    const moved = Math.max(xa, Math.min(x, view.right - view.width));
    return {x: moved, y: yOnLine(ordered, moved), anchorX: "left", anchorY};
}

function labelIsClear({x, y, anchorX, anchorY}: LineLabelPlacement, view: LineLabelView): boolean {
    const left = anchorX === "right" ? x - view.width : x;
    const bottom = anchorY === "bottom" ? y : y - view.height;
    const right = left + view.width, top = bottom + view.height;
    if (left < view.left || right > view.right || bottom < view.bottom || top > view.top) return false;
    return !view.points.some(([px, py]) => px > left - view.clearX && px < right + view.clearX
        && py > bottom - view.clearY && py < top + view.clearY);
}

/**
 * Where a line's label goes: near the line's right end, on the side no line runs through. With two lines that is outside the
 * wedge they open (the upper line's label above it, the lower line's below it, `wins` deciding when they coincide); alone, the
 * side where a right-anchored label clears its line. Text that has to run to the right of its point moves back along the line
 * by its `width`, so it stays in view. A label that would leave the view or cover a point steps back along the line; if no
 * position is clear it keeps the first one. It stops before the left part of the board, which holds the caption.
 */
export function lineLabelPlacement(line: ViewLine, other: ViewLine | undefined, wins: boolean, view: LineLabelView): LineLabelPlacement {
    const ordered: ViewLine = line[0] <= line[2] ? line : [line[2], line[3], line[0], line[1]];
    const placements = LINE_LABEL_ALONG.map(along => placeAlong(along, ordered, other, wins, view));
    return placements.find(placement => labelIsClear(placement, view)) ?? placements[0];
}


/**
 * Correlation and the regression line (lesson P5): up to 20 draggable points, the y-on-x regression line, vertical residual
 * segments and an optional x-on-y line. The model is `{points, residuals, xOnY}` (`src/analysis/correlationModel`); r, both
 * lines and the residual segments all come from that model's view, nothing is derived here.
 *
 * Board objects (owned; the count does not depend on n except the point pool of CORRELATION_POINTS_MAX): the residual segments
 * (one dashed curve), the y-on-x line (solid curve), the x-on-y line (dashed curve in the comparison colour) with a text label
 * on each line, and the draggable points. A drag commits through `moveCorrelationPoint`, which snaps to tenths and refuses a
 * value outside +-CORRELATION_COORDINATE_LIMIT; a refused drag leaves the point at its previous value and shows a notice.
 *
 * Keyboard: the typed point list in the inspector (as in least squares) is the keyboard path.
 *
 * View policy: the view is `fitCorrelationView(points)`; it is refitted when an example is chosen, on Reset, Preset restore and
 * the Fit button (through `exampleView`), and after an add or a typed edit only when a point would otherwise lie outside the
 * visible view. A drag never refits (the view would move under the pointer).
 */
export class CorrelationGraph extends BaseFunctionGraph<CorrelationModel> {
    protected pointObjects: JXG.Point[] = [];

    override presetCollection() {
        return functionPresetCollections["prob-correlation"];
    }

    protected defaultModel(): CorrelationModel {
        return {...DEFAULT_CORRELATION_MODEL, points: DEFAULT_CORRELATION_MODEL.points.map(p => [p[0], p[1]] as const)};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...fitCorrelationView(DEFAULT_CORRELATION_MODEL.points)];
    }

    /** x and y have different units in a scatter plot. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    protected override exampleView() {
        return {key: JSON.stringify(this.model.points), box: [...fitCorrelationView(this.model.points)] as BoundingBox};
    }

    private viewOf(model: CorrelationModel): CorrelationView {
        return this.memoView(model, () => correlationView(model));
    }

    // ---- Model operations ----------------------------------------------------------------------------------------

    private accepted(edit: CorrelationEdit): CorrelationModel {
        if (!edit.ok) throw new DomainError(correlationEditMessage(edit.issue));
        return edit.model;
    }

    /** Runs an inspector change: a refusal is kept as the visible notice, an accepted change clears it. */
    protected guarded(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    /** Refits only when a point lies outside the visible view (after an add or a typed edit; never during a drag). */
    private ensurePointsVisible(): void {
        if (this.generatedObjectCount === 0) return;
        const [left, top, right, bottom] = this.board.getBoundingBox();
        if (this.model.points.some(([x, y]) => x < left || x > right || y < bottom || y > top)) {
            this.board.setBoundingBox([...fitCorrelationView(this.model.points)], this.equalAxisUnits);
        }
    }

    /** Appends a point: the default one, or (a lesson) at `at`, snapped and range-checked like a typed edit; one commit either way. */
    protected addPoint(at?: readonly [number, number]): void {
        const added = this.accepted(addCorrelationPoint(this.model));
        this.commitModel(at ? this.accepted(moveCorrelationPoint(added, added.points.length - 1, at)) : added);
        this.ensurePointsVisible();
    }

    protected removePoint(index?: number): void {
        this.commitModel(this.accepted(removeCorrelationPoint(this.model, index)));
    }

    /** A lesson's point edit: refused values throw a DomainError; a point outside the view refits it, as a typed edit does. */
    protected setPoint(index: number, x: number, y: number): void {
        const next = this.accepted(moveCorrelationPoint(this.model, index, [x, y]));
        if (next !== this.model) this.commitModel(next);
        this.ensurePointsVisible();
    }

    // ---- Lesson actions ------------------------------------------------------------------------------------------------

    /** Lesson steps go through the inspector's validated edits, so a refused value throws a DomainError. An example refits. */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            visibility: {
                "correlation-residuals": visible => this.setResiduals(visible),
                "correlation-x-on-y": visible => this.setXOnY(visible),
            },
            choices: {
                "correlation-example": value => this.setExample(value),
            },
        };
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("correlation", action => {
            if (action.operation === "set-point") this.setPoint(action.index, action.x, action.y);
            else if (action.operation === "add-point") {
                const {x, y} = action;
                if (x === undefined && y === undefined) this.addPoint();
                else if (typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) this.addPoint([x, y]);
                else throw new DomainError(correlationEditMessage({kind: "coordinate", index: this.model.points.length, limit: CORRELATION_COORDINATE_LIMIT}));
            }
            else if (action.operation === "remove-point") this.removePoint(action.index);
            else throw new Error("A correlation action needs the operation set-point, add-point or remove-point.");
        });
    }

    protected setResiduals(value: unknown): void {
        const next = this.accepted(setCorrelationResiduals(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setXOnY(value: unknown): void {
        const next = this.accepted(setCorrelationXOnY(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setExample(id: unknown): void {
        const next = this.accepted(chooseCorrelationExample(this.model, id));
        this.commitModel(next);
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...fitCorrelationView(next.points)], this.equalAxisUnits);
    }

    /** The typed list's edit: refused with the localized message, applied otherwise. */
    private editPoint(index: number, value: readonly [number, number]): string | void {
        const edit = moveCorrelationPoint(this.model, index, value);
        if (!edit.ok) return renderMessage(correlationEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
        this.ensurePointsVisible();
        this.refusals.clear();
    }

    /** A drag: the point follows the pointer snapped to tenths; a refused value leaves the point at its previous value. */
    private dragPoint(index: number, x: number, y: number): void {
        const edit = moveCorrelationPoint(this.model, index, [x, y]);
        if (!edit.ok) this.refusals.refuse(correlationEditMessage(edit.issue));
        else {
            this.refusals.clear();
            if (edit.model !== this.model) this.commitModel(edit.model, {syncScene: false});
        }
        this.syncSceneToModel();
    }

    override importPresetData(data: CorrelationModel): void {
        super.importPresetData(data);
        this.refusals.clear();
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** Puts every point on its coordinates (the dragged point included, so it always sits on the tenth grid). */
    protected override syncSceneToModel(): void {
        this.model.points.forEach(([x, y], index) => {
            const point = this.pointObjects[index];
            if (point && (point.X() !== x || point.Y() !== y)) point.moveTo([x, y]);
        });
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const thin = this.displayThinWidth(0.6);

        // The residuals: vertical segments from each point to the y-on-x line.
        const residuals = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.warningText, strokeWidth: thin, dash: 2, fillOpacity: 0, highlight: false, fixed: true,
            visible: () => model().residuals && view().yOnXLine !== undefined,
        })) as unknown as FillCurve;
        residuals.updateDataArray = () => {
            const xs: number[] = [];
            const ys: number[] = [];
            for (const {from, to} of view().residualSegments) {
                xs.push(from[0], to[0], NaN);
                ys.push(from[1], to[1], NaN);
            }
            residuals.dataX = xs;
            residuals.dataY = ys;
        };

        // The two lines, each a two-point curve across the view, with a label near its right end.
        const yOnX = () => view().yOnXLine;
        const xOnY = () => model().xOnY ? view().xOnYLine : undefined;
        const line = (pick: () => ViewLine | undefined, other: () => ViewLine | undefined, wins: boolean, color: string, dash: number, label: () => string) => {
            const curve = this.own(board.create("curve", [[], []], {
                strokeColor: color, strokeWidth: this.displayStrokeWidth, dash, fillOpacity: 0, highlight: false, fixed: true,
                visible: () => pick() !== undefined,
            })) as unknown as FillCurve;
            curve.updateDataArray = () => {
                const l = pick();
                curve.dataX = l ? [l[0], l[2]] : [];
                curve.dataY = l ? [l[1], l[3]] : [];
            };
            // Filled once the text exists: JSXGraph reads the placement while creating it.
            const drawn: {text?: {size?: number[]}} = {};
            const placement = (): LineLabelPlacement | undefined => {
                const l = pick();
                if (!l) return undefined;
                const [left, top, right, bottom] = board.getBoundingBox();
                const clearPx = Math.max(4, this.displaySettings.pointSize) + LINE_LABEL_POINT_GAP_PX;
                return lineLabelPlacement(l, other(), wins, {
                    left, top, right, bottom,
                    width: ((drawn.text?.size?.[0] ?? 0) + LINE_LABEL_MARGIN_PX) / board.unitX,
                    height: (drawn.text?.size?.[1] ?? 0) / board.unitY,
                    clearX: clearPx / board.unitX, clearY: clearPx / board.unitY,
                    points: model().points,
                });
            };
            drawn.text = this.own(board.create("text", [() => placement()?.x ?? 0, () => placement()?.y ?? 0, label], {
                anchorX: () => placement()?.anchorX ?? "right", anchorY: () => placement()?.anchorY ?? "bottom",
                fixed: true, highlight: false, color, fontSize: 15, visible: () => pick() !== undefined,
            })) as unknown as {size?: number[]};
        };
        line(yOnX, xOnY, true, GraphPalette.primaryCurve, 0, () => t("prob_correlation_board_line_y"));
        line(xOnY, yOnX, false, GraphPalette.comparisonCurve, 3, () => t("prob_correlation_board_line_x"));

        // The draggable points.
        this.pointObjects = [];
        for (let j = 0; j < CORRELATION_POINTS_MAX; j++) {
            const start = model().points[j] ?? [0, 0];
            const point = this.own(board.create("point", [start[0], start[1]], {
                ...this.styles.point.default, name: "", withLabel: false, fillColor: GraphPalette.controlPoint,
                highlightFillColor: GraphPalette.selectedControlPoint, strokeColor: GraphPalette.pointOutline,
                size: () => Math.max(4, this.displaySettings.pointSize), visible: () => j < model().points.length,
            })) as JXG.Point;
            bindMovablePointCursor(point, board);
            point.on("drag", () => {
                if (j >= model().points.length) return;
                this.dragPoint(j, point.X(), point.Y());
            });
            this.pointObjects.push(point);
        }

        this.caption("top-left", [
            {text: () => t("prob_correlation_board_title", {value0: model().points.length}), scale: 1.2},
            {
                text: () => {
                    const r = view().result.r;
                    return r === undefined ? t("prob_correlation_board_r_undefined") : t("prob_correlation_board_r", {value0: correlationNumber(r, currentLanguage(), 5)});
                },
                color: GraphPalette.primaryCurve,
            },
        ]);
    }

    protected override onSceneRemoved(): void {
        this.pointObjects = [];
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const example = correlationExampleOf(state);
        const exampleText = (id: typeof CORRELATION_EXAMPLE_IDS[number]) => {
            switch (id) {
                case "default": return t("prob_correlation_example_default");
                case "outlier": return t("prob_correlation_example_outlier");
                case "parabola": return t("prob_correlation_example_parabola");
                case "parabola-right": return t("prob_correlation_example_parabola_right");
                case "ring": return t("prob_correlation_example_ring");
            }
        };
        const options = [
            ...CORRELATION_EXAMPLE_IDS.map(id => ({value: id, text: exampleText(id)})),
            ...(example === undefined ? [{value: "custom", text: t("prob_correlation_example_custom")}] : []),
        ];
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_correlation_example_label")} value={example ?? "custom"} help={t("prob_correlation_example_help")}
                              options={options} onChange={next => { if (isCorrelationExampleId(next)) this.guarded(() => this.setExample(next)); }}/>
            </div>
            <div className="inspector-group">
                <CountSetter label={t("prob_correlation_count_label")} n={state.points.length} min={CORRELATION_POINTS_MIN} max={CORRELATION_POINTS_MAX}
                             onPlus={() => this.guarded(() => this.addPoint())} onMinus={() => this.guarded(() => this.removePoint())}/>
                <PointListInput title={t("prob_correlation_point_list")} points={state.points}
                                pointLabel={i => t("prob_correlation_point_name", {value0: i + 1})}
                                min={-CORRELATION_COORDINATE_LIMIT} max={CORRELATION_COORDINATE_LIMIT} decimals={1}
                                onCommit={(index, value) => this.editPoint(index, value)}/>
                <p className="inspector-help">{t("prob_correlation_points_help", {
                    value0: CORRELATION_COORDINATE_LIMIT, value1: CORRELATION_POINTS_MIN, value2: CORRELATION_POINTS_MAX,
                })}</p>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.residuals} label={t("prob_correlation_residuals_label")}
                             onChange={next => this.guarded(() => this.setResiduals(next))}/>
                <OnOffSwitch checked={state.xOnY} label={t("prob_correlation_xony_label")} describedBy="prob-correlation-xony-help"
                             onChange={next => this.guarded(() => this.setXOnY(next))}/>
                <p id="prob-correlation-xony-help" className="inspector-help">{t("prob_correlation_xony_help")}</p>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const {result} = view;
        const f = (value: number | undefined, decimals = 6) => value === undefined ? NOT_A_NUMBER_TEXT : correlationNumber(value, language, decimals);
        const lineText = (line: { slope: number; intercept: number } | undefined, swap: boolean) => {
            if (!line) return NOT_A_NUMBER_TEXT;
            const text = formatLineEquation(line, language, 5);
            // The x-on-y line is x = intercept + slope y: the same text with the letters exchanged.
            return swap ? text.replace(/[xy]/g, c => c === "x" ? "y" : "x") : text;
        };
        const rows = [
            {id: "n", label: t("prob_correlation_readout_n"), value: String(result.n)},
            {id: "r", label: t("prob_correlation_readout_r"), value: f(result.r, 5)},
            {id: "r2", label: t("prob_correlation_readout_r2"), value: f(result.rSquared)},
            {id: "slope", label: t("prob_correlation_readout_slope"), value: f(result.yOnX?.slope)},
            {id: "intercept", label: t("prob_correlation_readout_intercept"), value: f(result.yOnX?.intercept)},
            {id: "equation", label: t("prob_correlation_readout_equation"), value: lineText(result.yOnX, false)},
            {id: "ssres", label: t("prob_correlation_readout_ssres"), value: f(result.yOnX?.residualSumOfSquares)},
            {id: "identity", label: t("prob_correlation_readout_identity"), value: f(result.slopeFromR)},
            ...(model.xOnY ? [{id: "xony", label: t("prob_correlation_readout_xony"), value: lineText(result.xOnY, true)}] : []),
        ];
        const statusText = {
            "too-few": () => t("prob_correlation_status_too_few", {value0: CORRELATION_MIN_POINTS}),
            "zero-variance-x": () => t("prob_correlation_status_zero_x"),
            "zero-variance-y": () => t("prob_correlation_status_zero_y"),
            "zero-variance-both": () => t("prob_correlation_status_zero_both"),
        } as const;
        const statuses: { id: string; text: string }[] = [];
        if (view.status !== "ok") statuses.push({id: view.status, text: statusText[view.status]()});
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("prob_correlation_note")}/>
            <div className="inspector-group" role="status" aria-live="polite">
                {statuses.map(status => <p key={status.id} className="inspector-help" data-prob-correlation-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "points", color: GraphPalette.controlPoint, label: t("prob_correlation_legend_points"), kind: "dot"},
            {id: "line-y", color: GraphPalette.primaryCurve, label: t("prob_correlation_legend_line_y"), kind: "line"},
            {id: "line-x", color: GraphPalette.comparisonCurve, label: t("prob_correlation_legend_line_x"), kind: "dashed-line"},
            {id: "residual", color: GraphPalette.warningText, label: t("prob_correlation_legend_residual"), kind: "dashed-line"},
        ]}/>;
    }
}

export default CorrelationGraph;
