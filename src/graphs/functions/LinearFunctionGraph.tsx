import React from "react";
import BaseFunctionGraph, {BOARD_TEXT_STYLE, DomainError, mathTextHtml, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import {NumberInput} from "../../inputs/NumberInput";
import {PointListInput} from "../../inputs/PointListInput";
import {currentLanguage, message, messageNumber, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {COINCIDENCE_TOLERANCE, lineEquation, lineThroughPoints, moveAlongLine, slopeTriangle} from "../../analysis/linear";
import {DEFAULT_LINEAR_MODEL, isLinearCoordinate, LINEAR_COORDINATE_LIMIT, LinearModel, parseLinearModel} from "../../analysis/linearModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {cleanNumber} from "../../analysis/numbers";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";

/** Points snap to this grid while dragged; k and n can place them anywhere. */
export const LINEAR_SNAP_SIZE = 0.1;

type CoordinateName = keyof LinearModel;

/** The ids of the linear function declaration: slope and intercept are board pucks (while the line has them); the points stay board-dragged and in Orodja. */
export type LinearFunctionIds = {
    param: "k" | "n"; row: "equation" | "k" | "n" | "dx" | "dy"; note: never;
    legend: "line" | "triangle" | "intercept" | "point-p1" | "point-p2"; section: never; action: never;
};

/** The puck range of the slope and the intercept: a little wider than the default view; a value beyond it is still valid in the model. */
const KN_PUCK_LIMIT = 10;

/**
 * Linear function `y = kx + n` through two draggable points. The model is the two points; `k`, `n`, the equation and the
 * slope triangle are derived from it by `src/analysis/linear`. A vertical line (equal x) has no k and n.
 */
const KN_REASON_ID = "linear-kn-reason";

export class LinearFunctionGraph extends BaseFunctionGraph<LinearModel> {
    private p1?: JXG.Point;
    private p2?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return functionPresetCollections["linear-function"];
    }

    protected defaultModel(): LinearModel {
        return {...DEFAULT_LINEAR_MODEL};
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-6, 8, 6, -4];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    private currentLine() {
        const {x1, y1, x2, y2} = this.model;
        return lineThroughPoints({x: x1, y: y1}, {x: x2, y: y2});
    }

    /** Sets one point coordinate; throws when the value is outside the model domain. */
    protected setCoordinate(name: CoordinateName, value: number): void {
        this.assertCoordinate(name, value);
        this.commitModel({...this.model, [name]: cleanNumber(value)});
    }

    /** Sets both coordinates of one point in one commit; throws, and changes nothing, when either is outside the model domain. */
    protected setPoint(index: 0 | 1, x: number, y: number): void {
        const [xName, yName]: [CoordinateName, CoordinateName] = index === 0 ? ["x1", "y1"] : ["x2", "y2"];
        this.assertCoordinate(xName, x);
        this.assertCoordinate(yName, y);
        this.commitModel({...this.model, [xName]: cleanNumber(x), [yName]: cleanNumber(y)});
    }

    private assertCoordinate(name: CoordinateName, value: number): void {
        if (!isLinearCoordinate(value)) {
            throw new DomainError(message("linear_coordinate_rejected", {
                value0: name === "x1" ? "x₁" : name === "y1" ? "y₁" : name === "x2" ? "x₂" : "y₂",
                value1: formatNumber(-LINEAR_COORDINATE_LIMIT, currentLanguage()), value2: formatNumber(LINEAR_COORDINATE_LIMIT, currentLanguage()),
            }));
        }
    }

    /** Moves both points along the line with the new slope and/or intercept, keeping their x-coordinates. */
    protected setLineParameter(change: { k?: number; n?: number }): void {
        const {x1, y1, x2, y2} = this.model;
        const moved = moveAlongLine({x: x1, y: y1}, {x: x2, y: y2}, change);
        if (!moved) throw new DomainError(message("linear_vertical_rejected"));
        const next = parseLinearModel({x1: moved[0].x, y1: cleanNumber(moved[0].y), x2: moved[1].x, y2: cleanNumber(moved[1].y)});
        if (!next || Object.values(change).some(value => !Number.isFinite(value))) {
            throw new DomainError(message("linear_limit_rejected", {value0: formatNumber(LINEAR_COORDINATE_LIMIT, currentLanguage())}));
        }
        this.commitModel(next);
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                x1: value => this.setCoordinate("x1", value),
                y1: value => this.setCoordinate("y1", value),
                x2: value => this.setCoordinate("x2", value),
                y2: value => this.setCoordinate("y2", value),
                k: value => this.setLineParameter({k: value}),
                n: value => this.setLineParameter({n: value}),
            },
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const hasLine = () => this.currentLine().kind !== "degenerate";
        const hasLeg = (leg: "dx" | "dy") => hasLine() && Math.abs(leg === "dx" ? model().x2 - model().x1 : model().y2 - model().y1) > COINCIDENCE_TOLERANCE;
        const fontSize = (scale: number) => () => this.displaySettings.fontSize * scale;
        const pointOptions = (name: string) => ({
            ...this.styles.point.default, name, snapToGrid: true, snapSizeX: LINEAR_SNAP_SIZE, snapSizeY: LINEAR_SNAP_SIZE,
        });

        // The y-intercept (0, n), only while the line has one. It sits on a lower layer so it never hides or steals a draggable
        // point (P1 starts on the y-axis), and its label goes below the point so it does not overlap the label of P1.
        this.drawn.set("intercept", this.own(board.create("point", [0, () => {
            const line = this.currentLine();
            return line.kind === "line" ? line.n : 0;
        }], {
            ...this.styles.point.fixed, name: "$$(0,n)$$", layer: 7, highlight: false, visible: () => this.currentLine().kind === "line",
            // A label does not follow its point's `visible`, so it repeats the condition.
            label: {
                ...this.styles.point.fixed.label, anchorX: "left", anchorY: "top", offset: [8, -4],
                visible: () => this.displaySettings.pointLabelsVisible && this.currentLine().kind === "line",
            },
        })));

        const p1 = this.p1 = this.own(board.create("point", [model().x1, model().y1], pointOptions("$$P_1$$")) as JXG.Point);
        const p2 = this.p2 = this.own(board.create("point", [model().x2, model().y2], pointOptions("$$P_2$$")) as JXG.Point);
        const readPoints = () => {
            const next = parseLinearModel({x1: cleanNumber(p1.X()), y1: cleanNumber(p1.Y()), x2: cleanNumber(p2.X()), y2: cleanNumber(p2.Y())});
            if (next) runAs("learner", () => this.commitModel(next, {syncScene: false}));
        };
        this.drawn.set("point-p1", p1);
        this.drawn.set("point-p2", p2);
        bindMovablePointCursor(p1, board);
        bindMovablePointCursor(p2, board);
        p1.on("drag", readPoints);
        p2.on("drag", readPoints);

        // The line is drawn through the two points; coincident points hide it.
        this.drawn.set("line", this.own(board.create("line", [p1, p2], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true,
            strokeWidth: () => this.displaySettings.strokeWidth, visible: hasLine,
        })));

        // Slope triangle: horizontal leg (dx) from P1, vertical leg (dy) up to P2.
        const corner = this.own(board.create("point", [() => model().x2, () => model().y1], {
            visible: false, fixed: true, withLabel: false, name: "",
        }) as JXG.Point);
        const legStyle = (leg: "dx" | "dy") => ({
            dash: 2, strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true,
            strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.68), visible: () => hasLeg(leg),
        });
        this.drawn.set("leg-dx", this.own(board.create("segment", [p1, corner], legStyle("dx"))));
        this.drawn.set("leg-dy", this.own(board.create("segment", [corner, p2], legStyle("dy"))));
        const label = (text: () => string, x: () => number, y: () => number, anchorX: () => string, anchorY: () => string, leg: "dx" | "dy") =>
            this.own(board.create("text", [x, y, () => mathTextHtml(text())], {
                anchorX, anchorY, fixed: true, highlight: false, parse: false, fontSize: fontSize(0.85), strokeColor: GraphPalette.label, visible: () => hasLeg(leg),
                cssStyle: BOARD_TEXT_STYLE, highlightCssStyle: BOARD_TEXT_STYLE,
            }));
        label(() => ` Δx = ${formatNumber(slopeTriangle({x: model().x1, y: model().y1}, {x: model().x2, y: model().y2}).dx, language())} `,
            () => (model().x1 + model().x2) / 2, () => model().y1, () => "middle", () => (model().y2 >= model().y1 ? "top" : "bottom"), "dx");
        label(() => ` Δy = ${formatNumber(slopeTriangle({x: model().x1, y: model().y1}, {x: model().x2, y: model().y2}).dy, language())} `,
            () => model().x2, () => (model().y1 + model().y2) / 2, () => (model().x1 <= model().x2 ? "left" : "right"), () => "middle", "dy");

        // The equation, the most important readout, stays on the board.
        this.caption("top-left", [{text: () => lineEquation(this.currentLine(), language()), scale: 1.2, math: true}]);
    }

    protected override syncSceneToModel(): void {
        const {x1, y1, x2, y2} = this.model;
        // moveTo snaps to the grid like a drag does; k and n place points off the grid, so snapping is paused.
        for (const [point, x, y] of [[this.p1, x1, y1], [this.p2, x2, y2]] as const) {
            if (!point) continue;
            point.setAttribute({snapToGrid: false});
            try {
                point.moveTo([x, y]);
            } finally {
                point.setAttribute({snapToGrid: true});
            }
        }
    }

    protected override onSceneRemoved(): void {
        this.p1 = undefined;
        this.p2 = undefined;
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {x1, y1, x2, y2} = this.model;
        const line = lineThroughPoints({x: x1, y: y1}, {x: x2, y: y2});
        const hasKn = line.kind === "line";
        const knReason = hasKn ? undefined : t(line.kind === "vertical" ? "linear_vertical_note" : "linear_degenerate_note");
        return <>
            <div className="inspector-group">
                <PointListInput title={t("function_points")} points={[[x1, y1], [x2, y2]]} pointLabel={index => `P${index + 1}`}
                                min={-LINEAR_COORDINATE_LIMIT} max={LINEAR_COORDINATE_LIMIT} step={LINEAR_SNAP_SIZE} decimals={2}
                                onCommit={(index, [x, y]) => {
                                    try {
                                        this.setPoint(index === 0 ? 0 : 1, x, y);
                                    } catch (error) {
                                        if (error instanceof DomainError) return error.message;
                                        throw error;
                                    }
                                }}/>
            </div>
            <PuckOwnedGroup params={["k", "n"]} className="inspector-group">
                <div className="function-points-grid">
                    <NumberInput label={t("slope_k_label")} value={hasKn ? line.k : undefined} unavailableReason={knReason} reasonShownElsewhere describedBy={knReason && KN_REASON_ID} step={LINEAR_SNAP_SIZE}
                                 min={-LINEAR_COORDINATE_LIMIT} max={LINEAR_COORDINATE_LIMIT}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setLineParameter({k: next}))}/>
                    <NumberInput label={t("intercept_n_label")} value={hasKn ? line.n : undefined} unavailableReason={knReason} reasonShownElsewhere describedBy={knReason && KN_REASON_ID} step={LINEAR_SNAP_SIZE}
                                 min={-LINEAR_COORDINATE_LIMIT} max={LINEAR_COORDINATE_LIMIT}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setLineParameter({n: next}))}/>
                </div>
                {knReason && <p className="inspector-help" id={KN_REASON_ID}>{knReason}</p>}
                <p className="inspector-help">{t("linear_kn_help")}</p>
            </PuckOwnedGroup>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): slope and intercept move both points along the new line; a vertical or degenerate line refuses them. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const kn = (name: "k" | "n") => () => {
            const line = this.currentLine();
            // Rounded to 1e-6: rewriting the points (rounded to 1e-9) must not make the other of k and n drift on its puck.
            return line.kind === "line" ? Math.round(line[name] * 1e6) / 1e6 + 0 : Number.NaN;
        };
        return {
            k: {read: kn("k"), apply: (value: number) => this.setLineParameter({k: value})},
            n: {read: kn("n"), apply: (value: number) => this.setLineParameter({n: value})},
        };
    }

    /** The slope triangle is drawn while one of its legs is; both legs share one legend entry. */
    private triangleLeg(): "leg-dx" | "leg-dy" | undefined {
        const {x1, y1, x2, y2} = this.model;
        if (this.currentLine().kind === "degenerate") return undefined;
        if (Math.abs(x2 - x1) > COINCIDENCE_TOLERANCE) return "leg-dx";
        return Math.abs(y2 - y1) > COINCIDENCE_TOLERANCE ? "leg-dy" : undefined;
    }

    /**
     * The common declaration (rows, view marks) plus slope and intercept as board pucks, only while the line has them (a vertical or
     * coincident line omits them, and Orodja shows the two fields with the reason), and the legend of what is drawn.
     */
    protected override declaration(): GraphDeclaration {
        const kind = this.currentLine().kind;
        const hasKn = kind === "line";
        const leg = this.triangleLeg();
        return {
            ...this.commonDeclaration(),
            ...(hasKn ? {parameters: [
                {key: "k", kind: "range", label: message("linear_k_name"), symbol: "k", help: message("linear_kn_help"), placement: "board",
                    min: -KN_PUCK_LIMIT, max: KN_PUCK_LIMIT, step: LINEAR_SNAP_SIZE, maxDecimals: 2},
                {key: "n", kind: "range", label: message("linear_n_name"), symbol: "n", placement: "board",
                    min: -KN_PUCK_LIMIT, max: KN_PUCK_LIMIT, step: LINEAR_SNAP_SIZE, maxDecimals: 2},
            ] as const} : {}),
            legend: [
                ...(kind === "degenerate" ? [] : [{id: "line" as const, label: message("linear_legend_line"), kind: "line" as const, object: "line"}]),
                ...(leg ? [{id: "triangle" as const, label: message("linear_legend_triangle"), kind: "dashed" as const, object: leg}] : []),
                ...(hasKn ? [{id: "intercept" as const, label: message("linear_legend_intercept"), kind: "point" as const, object: "intercept"}] : []),
                {id: "point-p1", label: message("linear_legend_p1"), kind: "point", object: "point-p1"},
                {id: "point-p2", label: message("linear_legend_p2"), kind: "point", object: "point-p2"},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id.startsWith("point-") || id === "intercept" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base (task 08): the readout rows and the plotted line; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {x1, y1, x2, y2} = this.model;
        const language = currentLanguage();
        const line = this.currentLine();
        const triangle = slopeTriangle({x: x1, y: y1}, {x: x2, y: y2});
        const equation = line.kind === "degenerate" ? formatNumber(NaN, language) : lineEquation(line, language);
        const undefinedText = message("slope_undefined");
        return {
            rows: [
                {id: "equation", name: message("line_equation"), value: message("linear_equation_value", {value0: equation})},
                {id: "k", symbol: "k", value: line.kind === "line" ? messageNumber(line.k) : undefinedText},
                {id: "n", symbol: "n", value: line.kind === "line" ? messageNumber(line.n) : undefinedText},
                {id: "dx", symbol: "Δx", value: messageNumber(triangle.dx)},
                {id: "dy", symbol: "Δy", value: messageNumber(triangle.dy)},
            ],
            ...(line.kind === "line" ? {plotted: (x: number) => line.k * x + line.n} : {}),
            must: [{x: x1, y: y1}, {x: x2, y: y2}, ...(line.kind === "line" ? [{x: 0, y: line.n}] : []),
                ...(this.triangleLeg() ? [triangle.corner] : [])],
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default LinearFunctionGraph;
