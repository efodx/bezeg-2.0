import React from "react";
import BaseFunctionGraph, {FunctionParameterAction} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {COINCIDENCE_TOLERANCE, lineEquation, lineThroughPoints, moveAlongLine, slopeTriangle} from "../../analysis/linear";
import {DEFAULT_LINEAR_MODEL, isLinearCoordinate, LINEAR_COORDINATE_LIMIT, LinearModel, parseLinearModel} from "../../analysis/linearModel";
import {UnsupportedLessonActionError} from "../../learning/model";
import {SizeContext} from "../context/SizeContext";
import {PointStyles} from "../styles/PointStyles";
import {VisibilityContext} from "../context/VisibilityContext";
import {GraphPalette} from "../styles/GraphPalette";

/** Points snap to this grid while dragged; k and n can place them anywhere. */
export const LINEAR_SNAP_SIZE = 0.1;

type CoordinateName = keyof LinearModel;

/** Removes floating-point noise left by k and n arithmetic (and the sign of zero) without changing meaningful digits. */
const clean = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

/**
 * Linear function `y = kx + n` through two draggable points. The model is the two points; `k`, `n`, the equation and the
 * slope triangle are derived from it by `src/analysis/linear`. A vertical line (equal x) has no k and n.
 */
export class LinearFunctionGraph extends BaseFunctionGraph<LinearModel> {
    private p1?: JXG.Point;
    private p2?: JXG.Point;

    override presets(): string {
        return "linear-function";
    }

    protected defaultModel(): LinearModel {
        return {...DEFAULT_LINEAR_MODEL};
    }

    protected parseModel(data: unknown): LinearModel | undefined {
        return parseLinearModel(data);
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-6, 8, 6, -4];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    private currentLine() {
        const {x1, y1, x2, y2} = this.model;
        return lineThroughPoints({x: x1, y: y1}, {x: x2, y: y2});
    }

    /** Sets one point coordinate; throws when the value is outside the model domain. */
    protected setCoordinate(name: CoordinateName, value: number): void {
        if (!isLinearCoordinate(value)) {
            throw new Error(`The coordinate ${name} must be a finite number between -${LINEAR_COORDINATE_LIMIT} and ${LINEAR_COORDINATE_LIMIT}.`);
        }
        this.commitModel({...this.model, [name]: clean(value)});
    }

    /** Moves both points along the line with the new slope and/or intercept, keeping their x-coordinates. */
    protected setLineParameter(change: { k?: number; n?: number }): void {
        const {x1, y1, x2, y2} = this.model;
        const moved = moveAlongLine({x: x1, y: y1}, {x: x2, y: y2}, change);
        if (!moved) throw new Error("The slope k and the intercept n are undefined for a vertical line or coincident points.");
        const next = parseLinearModel({x1: moved[0].x, y1: clean(moved[0].y), x2: moved[1].x, y2: clean(moved[1].y)});
        if (!next || Object.values(change).some(value => !Number.isFinite(value))) {
            throw new Error(`The slope and intercept must keep both points within ${LINEAR_COORDINATE_LIMIT} of the origin.`);
        }
        this.commitModel(next);
    }

    protected override applyFunctionParameter(action: FunctionParameterAction): void {
        switch (action.name) {
            case "x1":
            case "y1":
            case "x2":
            case "y2":
                this.setCoordinate(action.name, action.value);
                return;
            case "k":
                this.setLineParameter({k: action.value});
                return;
            case "n":
                this.setLineParameter({n: action.value});
                return;
            default:
                throw new UnsupportedLessonActionError(action);
        }
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const hasLine = () => this.currentLine().kind !== "degenerate";
        const hasLeg = (leg: "dx" | "dy") => hasLine() && Math.abs(leg === "dx" ? model().x2 - model().x1 : model().y2 - model().y1) > COINCIDENCE_TOLERANCE;
        const fontSize = (scale: number) => () => SizeContext.fontSize * scale;
        const pointOptions = (name: string) => ({
            ...PointStyles.default, name, snapToGrid: true, snapSizeX: LINEAR_SNAP_SIZE, snapSizeY: LINEAR_SNAP_SIZE,
        });

        // The y-intercept (0, n), only while the line has one. It sits on a lower layer so it never hides or steals a draggable
        // point (P1 starts on the y-axis), and its label goes below the point so it does not overlap the label of P1.
        this.own(board.create("point", [0, () => {
            const line = this.currentLine();
            return line.kind === "line" ? line.n : 0;
        }], {
            ...PointStyles.fixed, name: "$$(0,n)$$", layer: 7, highlight: false, visible: () => this.currentLine().kind === "line",
            // A label does not follow its point's `visible`, so it repeats the condition.
            label: {
                ...PointStyles.fixed.label, anchorX: "left", anchorY: "top", offset: [8, -4],
                visible: () => VisibilityContext.pointsVisible() && this.currentLine().kind === "line",
            },
        }));

        const p1 = this.p1 = this.own(board.create("point", [model().x1, model().y1], pointOptions("$$P_1$$")) as JXG.Point);
        const p2 = this.p2 = this.own(board.create("point", [model().x2, model().y2], pointOptions("$$P_2$$")) as JXG.Point);
        const readPoints = () => {
            const next = parseLinearModel({x1: clean(p1.X()), y1: clean(p1.Y()), x2: clean(p2.X()), y2: clean(p2.Y())});
            if (next) this.commitModel(next, {syncScene: false});
        };
        p1.on("drag", readPoints);
        p2.on("drag", readPoints);

        // The line is drawn through the two points; coincident points hide it.
        this.own(board.create("line", [p1, p2], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true,
            strokeWidth: () => SizeContext.strokeWidth, visible: hasLine,
        }));

        // Slope triangle: horizontal leg (dx) from P1, vertical leg (dy) up to P2.
        const corner = this.own(board.create("point", [() => model().x2, () => model().y1], {
            visible: false, fixed: true, withLabel: false, name: "",
        }) as JXG.Point);
        const legStyle = (leg: "dx" | "dy") => ({
            dash: 2, strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true,
            strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.68), visible: () => hasLeg(leg),
        });
        this.own(board.create("segment", [p1, corner], legStyle("dx")));
        this.own(board.create("segment", [corner, p2], legStyle("dy")));
        const label = (text: () => string, x: () => number, y: () => number, anchorX: () => string, anchorY: () => string, leg: "dx" | "dy") =>
            this.own(board.create("text", [x, y, text], {
                anchorX, anchorY, fixed: true, highlight: false, fontSize: fontSize(0.85), strokeColor: GraphPalette.label, visible: () => hasLeg(leg),
            }));
        label(() => ` Δx = ${formatNumber(slopeTriangle({x: model().x1, y: model().y1}, {x: model().x2, y: model().y2}).dx, language())} `,
            () => (model().x1 + model().x2) / 2, () => model().y1, () => "middle", () => (model().y2 >= model().y1 ? "top" : "bottom"), "dx");
        label(() => ` Δy = ${formatNumber(slopeTriangle({x: model().x1, y: model().y1}, {x: model().x2, y: model().y2}).dy, language())} `,
            () => model().x2, () => (model().y1 + model().y2) / 2, () => (model().x1 <= model().x2 ? "left" : "right"), () => "middle", "dy");

        // The equation, the most important readout, stays on the board.
        this.own(board.create("text", [
            () => {
                const [left, , right] = board.getBoundingBox();
                return left + 0.04 * (right - left);
            },
            () => {
                const [, top, , bottom] = board.getBoundingBox();
                return top - 0.06 * (top - bottom);
            },
            () => lineEquation(this.currentLine(), language()),
        ], {anchorX: "left", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1.2), strokeColor: GraphPalette.label}));
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
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private ignoreOutOfDomain(action: () => void) {
        try {
            action();
        } catch {
            // The input stays as typed until it is inside the domain (NumberInput also bounds the value).
        }
    }

    protected renderControls(): React.ReactNode {
        const {x1, y1, x2, y2} = this.state;
        const line = lineThroughPoints({x: x1, y: y1}, {x: x2, y: y2});
        const coordinate = (name: CoordinateName, label: string, value: number) =>
            <NumberInput label={label} value={value} min={-LINEAR_COORDINATE_LIMIT} max={LINEAR_COORDINATE_LIMIT} step={LINEAR_SNAP_SIZE}
                         onChange={next => this.ignoreOutOfDomain(() => this.setCoordinate(name, next))}/>;
        const hasKn = line.kind === "line";
        return <>
            <div className="inspector-group">
                <h3>{t("function_points")}</h3>
                <div className="function-points-grid">
                    {coordinate("x1", "x₁", x1)}{coordinate("y1", "y₁", y1)}
                    {coordinate("x2", "x₂", x2)}{coordinate("y2", "y₂", y2)}
                </div>
            </div>
            <div className="inspector-group">
                <div className="function-points-grid">
                    <NumberInput label={t("slope_k_label")} value={hasKn ? line.k : undefined} disabled={!hasKn} step={LINEAR_SNAP_SIZE}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setLineParameter({k: next}))}/>
                    <NumberInput label={t("intercept_n_label")} value={hasKn ? line.n : undefined} disabled={!hasKn} step={LINEAR_SNAP_SIZE}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setLineParameter({n: next}))}/>
                </div>
                <p className="inspector-help">{t("linear_kn_help")}</p>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const {x1, y1, x2, y2} = this.state;
        const language = currentLanguage();
        const line = lineThroughPoints({x: x1, y: y1}, {x: x2, y: y2});
        const triangle = slopeTriangle({x: x1, y: y1}, {x: x2, y: y2});
        const number = (value: number) => formatNumber(value, language);
        const rows = [
            {id: "equation", label: t("line_equation"), value: line.kind === "degenerate" ? number(NaN) : lineEquation(line, language)},
            {id: "k", label: "k", value: line.kind === "line" ? number(line.k) : t("slope_undefined")},
            {id: "n", label: "n", value: line.kind === "line" ? number(line.n) : t("slope_undefined")},
            {id: "dx", label: "Δx", value: number(triangle.dx)},
            {id: "dy", label: "Δy", value: number(triangle.dy)},
        ];
        const note = line.kind === "vertical" ? t("linear_vertical_note") : line.kind === "degenerate" ? t("linear_degenerate_note") : undefined;
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={note}/>;
    }
}

export default LinearFunctionGraph;
