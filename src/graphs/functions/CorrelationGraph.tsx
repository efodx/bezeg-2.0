import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FillCurve, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {FunctionStatus} from "./FunctionStatus";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {PointListInput} from "../../inputs/PointListInput";
import {guard} from "../base/controls/guard";
import {currentLanguage, message, renderMessage, t} from "../../localization";
import {formatLineEquation, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {CORRELATION_MIN_POINTS} from "../../analysis/correlation";
import {
    addCorrelationPoint, chooseCorrelationExample, CORRELATION_COORDINATE_LIMIT, CORRELATION_EXAMPLE_IDS, CORRELATION_POINTS_MAX,
    CORRELATION_POINTS_MIN, correlationExampleOf, CorrelationEdit, CorrelationModel, correlationView, CorrelationView,
    DEFAULT_CORRELATION_MODEL, fitCorrelationView, isCorrelationExampleId, moveCorrelationPoint, removeCorrelationPoint,
    setCorrelationResiduals, setCorrelationXOnY,
} from "../../analysis/correlationModel";
import {correlationEditMessage, correlationNumber} from "./correlationMessages";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

type ViewLine = readonly [number, number, number, number];

/** The follow box is at least this many times the width of the must marks (the director zooms out at most 2.2 times; the strip between the cards is about a third of a small board). */
const CORRELATION_FOLLOW_SPREAD = 1.5;

/**
 * The ids of the correlation declaration: the residuals and the line of x on y are switch pucks (actions); no number with a
 * range exists (the points are a multi-value list that stays in Orodja); the legend names every kind of drawn object.
 */
export type CorrelationIds = {
    param: never;
    row: "n" | "r" | "r2" | "slope" | "intercept" | "equation" | "ssres" | "identity" | "xony";
    note: "correlation"; legend: "points" | "line-y" | "line-x" | "residual"; section: never; action: "residuals" | "x-on-y";
};

/**
 * Correlation and the regression line (lesson P5): up to 20 draggable points, the y-on-x regression line, vertical residual
 * segments and an optional x-on-y line. The model is `{points, residuals, xOnY}` (`src/analysis/correlationModel`); r, both
 * lines and the residual segments all come from that model's view, nothing is derived here.
 *
 * Board objects (owned; the count does not depend on n except the point pool of CORRELATION_POINTS_MAX): the residual segments
 * (one dashed curve), the y-on-x line (solid curve), the x-on-y line (dashed curve in the comparison colour); the legend
 * names the lines, so the board writes no label; and the draggable points. A drag commits through `moveCorrelationPoint`, which snaps to tenths and refuses a
 * value outside +-CORRELATION_COORDINATE_LIMIT; a drag stops at that limit without a message.
 *
 * Keyboard: the typed point list in the inspector (as in least squares) is the keyboard path.
 *
 * View policy: the view is `fitCorrelationView(points)`; it is refitted when an example is chosen, on Reset, Preset restore and
 * the Fit button (through `exampleView`), and after an add or a typed edit only when a point would otherwise lie outside the
 * visible view. A drag never refits (the view would move under the pointer).
 */
export class CorrelationGraph extends BaseFunctionGraph<CorrelationModel> {
    protected pointObjects: JXG.Point[] = [];
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

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
            this.boardView.setIntent(fitCorrelationView(this.model.points), {keepAspectRatio: this.equalAxisUnits});
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
        if (this.generatedObjectCount > 0) this.boardView.setIntent(fitCorrelationView(next.points), {keepAspectRatio: this.equalAxisUnits});
    }

    /** The typed list's edit: refused with the localized message, applied otherwise. */
    private editPoint(index: number, value: readonly [number, number]): string | void {
        const edit = moveCorrelationPoint(this.model, index, value);
        if (!edit.ok) return renderMessage(correlationEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
        this.ensurePointsVisible();
        this.refusals.clear();
    }

    /** A drag: the point follows the pointer snapped to tenths and stops at the coordinate limit without a message (task 0 decision 3). */
    private dragPoint(index: number, x: number, y: number): void {
        const limited = (value: number) => Math.max(-CORRELATION_COORDINATE_LIMIT, Math.min(CORRELATION_COORDINATE_LIMIT, value));
        const edit = moveCorrelationPoint(this.model, index, [limited(x), limited(y)]);
        if (edit.ok) {
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
        const residualWidth = (): number => this.displayStrokeWidth() * 0.8;

        // The residuals: vertical segments from each point to the y-on-x line.
        const residuals = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.warningText, strokeWidth: residualWidth, dash: 0, fillOpacity: 0, highlight: false, fixed: true,
            visible: () => model().residuals && view().yOnXLine !== undefined,
        })) as unknown as FillCurve;
        this.drawn.set("residual", residuals as unknown as JXG.GeometryElement);
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

        // The two lines, each a two-point curve across the view; the legend names them, the board writes no label.
        const yOnX = () => view().yOnXLine;
        const xOnY = () => model().xOnY ? view().xOnYLine : undefined;
        const line = (id: "line-y" | "line-x", pick: () => ViewLine | undefined, color: string, dash: number) => {
            const curve = this.own(board.create("curve", [[], []], {
                strokeColor: color, strokeWidth: this.displayStrokeWidth, dash, fillOpacity: 0, highlight: false, fixed: true,
                visible: () => pick() !== undefined,
            })) as unknown as FillCurve;
            this.drawn.set(id, curve as unknown as JXG.GeometryElement);
            curve.updateDataArray = () => {
                const l = pick();
                curve.dataX = l ? [l[0], l[2]] : [];
                curve.dataY = l ? [l[1], l[3]] : [];
            };
        };
        line("line-y", yOnX, GraphPalette.primaryCurve, 0);
        line("line-x", xOnY, GraphPalette.comparisonCurve, 3);

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
            if (j === 0) this.drawn.set("points", point as unknown as JXG.GeometryElement);
            this.pointObjects.push(point);
        }
    }

    protected override onSceneRemoved(): void {
        this.pointObjects = [];
        this.drawn.clear();
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
            <PuckOwnedGroup params={["residuals", "x-on-y"]} className="inspector-group">
                <PuckOwned param="residuals"><OnOffSwitch checked={state.residuals} label={t("prob_correlation_residuals_label")}
                             onChange={next => this.guarded(() => this.setResiduals(next))}/></PuckOwned>
                <PuckOwned param="x-on-y"><OnOffSwitch checked={state.xOnY} label={t("prob_correlation_xony_label")} describedBy="prob-correlation-xony-help"
                             onChange={next => this.guarded(() => this.setXOnY(next))}/>
                <p id="prob-correlation-xony-help" className="inspector-help">{t("prob_correlation_xony_help")}</p></PuckOwned>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_correlation_example_label")} value={example ?? "custom"} help={t("prob_correlation_example_help")}
                              options={options} onChange={next => { if (isCorrelationExampleId(next)) this.guarded(() => this.setExample(next)); }}/>
            </div>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /**
     * What the learner watches and no card may cover: every point and the ends of the regression line (and of the line of x on
     * y while shown). A line end is kept inside the fitted view, so a near-vertical line does not stretch the marks.
     */
    private correlationMust(model: CorrelationModel): {x: number; y: number}[] {
        const [left, top, right, bottom] = fitCorrelationView(model.points);
        const view = this.viewOf(model);
        const inX = (x: number) => Math.max(left, Math.min(right, x));
        const inY = (y: number) => Math.max(bottom, Math.min(top, y));
        const must: {x: number; y: number}[] = model.points.map(([x, y]) => ({x, y}));
        const lines = [view.yOnXLine, model.xOnY ? view.xOnYLine : undefined];
        for (const line of lines) if (line) must.push({x: inX(line[0]), y: inY(line[1])}, {x: inX(line[2]), y: inY(line[3])});
        return must;
    }

    /**
     * The fitted view, widened about its centre. The director maps the follow box into the strip between the cards by shrinking
     * at most 2.2 times (`DEFAULT_MAX_OUT`) whatever the box's width, so a box that only just covers the data leaves the far
     * points under a card; the box must be wide enough that the data fit that strip.
     */
    private followBox(): BoundingBox {
        const [left, top, right, bottom] = fitCorrelationView(this.model.points);
        const must = this.correlationMust(this.model);
        const lo = Math.min(left, ...must.map(mark => mark.x)), hi = Math.max(right, ...must.map(mark => mark.x));
        const half = CORRELATION_FOLLOW_SPREAD * (hi - lo) / 2, centre = (lo + hi) / 2;
        return [centre - half, Math.max(top, ...must.map(mark => mark.y)), centre + half, Math.min(bottom, ...must.map(mark => mark.y))];
    }

    /** The common declaration plus the residuals and the line of x on y as switch pucks, and the legend. */
    protected override declaration(): GraphDeclaration {
        const {residuals, xOnY} = this.model;
        return {
            ...this.commonDeclaration(),
            // The points and the lines are what the learner watches: the frame follows the data, not the lesson scene's stored box.
            followView: this.followBox(),
            legend: [
                {id: "points", label: message("prob_correlation_legend_points"), kind: "point", object: "points"},
                {id: "line-y", label: message("prob_correlation_legend_line_y"), kind: "line", object: "line-y"},
                {id: "line-x", label: message("prob_correlation_legend_line_x"), kind: "dashed", object: "line-x"},
                {id: "residual", label: message("prob_correlation_legend_residual"), kind: "line", object: "residual"},
            ],
            actions: [
                {id: "residuals", label: message("prob_correlation_residuals_name"), help: message("prob_correlation_residuals_label"), placement: "board", enabled: true, pressed: residuals, puck: true},
                {id: "x-on-y", label: message("prob_correlation_xony_name"), help: message("prob_correlation_xony_label"), placement: "board", enabled: true, pressed: xOnY, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "residuals") runAs("learner", () => this.setResiduals(!this.model.residuals));
        else if (id === "x-on-y") runAs("learner", () => this.setXOnY(!this.model.xOnY));
        else throw new Error("Unknown action");
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "points" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base: the readout rows (the number of points and r, which the board caption gave, then the line), the note and the refusal sentences. */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const {result} = view;
        const formatted = (text: string) => ({kind: "formatted" as const, text});
        const f = (value: number | undefined, decimals = 6) => formatted(value === undefined ? NOT_A_NUMBER_TEXT : correlationNumber(value, language, decimals));
        const lineText = (line: { slope: number; intercept: number } | undefined, swap: boolean) => {
            if (!line) return formatted(NOT_A_NUMBER_TEXT);
            const text = formatLineEquation(line, language, 5);
            // The x-on-y line is x = intercept + slope y: the same text with the letters exchanged; the frame "y = ..." / "x = ..." is the catalog's.
            const right = (swap ? text.replace(/[xy]/g, c => c === "x" ? "y" : "x") : text).replace(/^[xy] = /, "");
            return message(swap ? "prob_correlation_equation_x" : "prob_correlation_equation_y", {value0: right});
        };
        const statusMessage = {
            "too-few": () => message("prob_correlation_status_too_few", {value0: CORRELATION_MIN_POINTS}),
            "zero-variance-x": () => message("prob_correlation_status_zero_x"),
            "zero-variance-y": () => message("prob_correlation_status_zero_y"),
            "zero-variance-both": () => message("prob_correlation_status_zero_both"),
        } as const;
        return {
            rows: [
                {id: "n", name: message("prob_correlation_readout_n"), value: formatted(String(result.n))},
                {id: "r", name: message("prob_correlation_readout_r"), value: f(result.r, 5)},
                {id: "r2", name: message("prob_correlation_readout_r2"), value: f(result.rSquared)},
                {id: "slope", name: message("prob_correlation_readout_slope"), value: f(result.yOnX?.slope)},
                {id: "intercept", name: message("prob_correlation_readout_intercept"), value: f(result.yOnX?.intercept)},
                {id: "equation", name: message("prob_correlation_readout_equation"), value: lineText(result.yOnX, false)},
                {id: "ssres", name: message("prob_correlation_readout_ssres"), value: f(result.yOnX?.residualSumOfSquares)},
                {id: "identity", name: message("prob_correlation_readout_identity"), value: f(result.slopeFromR)},
                ...(model.xOnY ? [{id: "xony", name: message("prob_correlation_readout_xony"), value: lineText(result.xOnY, true)}] : []),
            ],
            notes: [{id: "correlation", text: message("prob_correlation_note")}],
            ...(view.status !== "ok" ? {status: [{id: view.status, text: statusMessage[view.status](), tone: "warning" as const}]} : {}),
            must: this.correlationMust(model),
        };
    }

    protected renderReadout(): React.ReactNode {
        const status = this.functionPanel().status ?? [];
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus dataAttribute="prob-correlation-status" lines={status.map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default CorrelationGraph;
