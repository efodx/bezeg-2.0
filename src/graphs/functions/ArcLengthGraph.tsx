import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import Slider from "../../inputs/Slider";
import {message, messageNumber, t} from "../../localization";
import type {GraphDeclaration, ParameterDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {
    arcLength, arcValue, BOUND_MAX, BOUND_MIN, BOUND_STEP, isBound, isSegmentCount, lengthDifference, N_MAX, N_MIN, N_STEP, polylineLength, polylineVertices,
} from "../../analysis/arcLength";
import {ArcLengthModel, DEFAULT_ARC_LENGTH_MODEL} from "../../analysis/arcLengthModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {integerRangeRejected, numberRangeRejected} from "./functionSetterMessages";

/** The ids of the arc-length declaration: the endpoints and the segment count are board pucks; the drawn objects are the legend. */
export type ArcLengthIds = {
    param: "a" | "b" | "n";
    row: "a" | "b" | "n" | "polyline" | "arc" | "difference"; note: never;
    legend: "curve" | "polyline" | "point-a" | "point-b"; section: never; action: never;
};

/** Lengths show four decimals so that the lesson's 3.7242, 3.8153 and 3.8202 can be read off. */
const PRECISE = 4;

/** A JSXGraph curve whose point lists are rebuilt in `updateDataArray`. */
interface DataCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}


/**
 * The default view shows [0, pi] with the sine arch and room for the A and B labels; its aspect (4.4 : 3.5, about 1.26) is
 * that of the workspace (1.27), as JSXGraph fits a box of another aspect to its shorter side. The curve stays within
 * y = -1..1 for every x, so no drawn path ever leaves the view vertically and the preview framing needs no clipping.
 */
const DEFAULT_VIEW: BoundingBox = [-0.6, 2.2, 3.8, -1.3];

/**
 * The polyline of n equal x-steps inscribed in y = sin x between the endpoints A = (a, sin a) and B = (b, sin b), with
 * its exact length next to the arc length. A and B are dragged along the graph (the drag is projected onto it and
 * written to the model as x rounded to 0.01) or typed in the inspector. The polyline is one curve object and its
 * vertices are one more (small filled octagons separated by NaN), both rebuilt on every update, so the object count does
 * not depend on n. The model is `{a, b, n}`; the mathematics comes from `src/analysis/arcLength`.
 */
export class ArcLengthGraph extends BaseFunctionGraph<ArcLengthModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
    private readonly verticesOf = this.modelCache((model: ArcLengthModel) => polylineVertices(model.a, model.b, model.n));

    override presetCollection() {
        return functionPresetCollections["arc-length"];
    }

    protected defaultModel(): ArcLengthModel {
        return {...DEFAULT_ARC_LENGTH_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...DEFAULT_VIEW];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new DomainError(numberRangeRejected(which === "a" ? "arc_a_label" : "arc_b_label", BOUND_MIN, BOUND_MAX));
        this.commitModel({...this.model, [which]: value}, options);
    }

    protected setCount(value: number): void {
        if (!isSegmentCount(value)) throw new DomainError(integerRangeRejected("arc_n_label", N_MIN, N_MAX));
        this.commitModel({...this.model, n: value});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                a: value => this.setBound("a", value),
                b: value => this.setBound("b", value),
                n: value => this.setCount(value),
            },
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the curve, the polyline, the polyline vertices, then the endpoints.
        this.drawn.set("curve", this.own(board.create("functiongraph", [arcValue], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        })));
        const polyline = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true, strokeWidth,
        })) as unknown as DataCurve;
        this.drawn.set("polyline", polyline as unknown as JXG.GeometryElement);
        polyline.updateDataArray = () => {
            const vertices = this.verticesOf(this.model);
            polyline.dataX = vertices.map(([x]) => x);
            polyline.dataY = vertices.map(([, y]) => y);
        };

        // The vertices are small octagons of constant pixel size, in one filled curve: no point object per vertex.
        const markers = this.own(board.create("curve", [[], []], {
            fillColor: GraphPalette.constructionAccent, fillOpacity: 1, strokeColor: GraphPalette.pointOutline, strokeWidth: 1,
            highlight: false, fixed: true,
        })) as unknown as DataCurve;
        markers.updateDataArray = () => {
            const radius = Math.max(3, this.displaySettings.pointSize * 0.4);
            const rx = radius / (board.unitX || 1);
            const ry = radius / (board.unitY || 1);
            const x: number[] = [];
            const y: number[] = [];
            for (const [vx, vy] of this.verticesOf(this.model)) {
                if (x.length > 0) {
                    x.push(NaN);
                    y.push(NaN);
                }
                for (let k = 0; k <= 8; k++) {
                    const angle = (k % 8) * Math.PI / 4;
                    x.push(vx + rx * Math.cos(angle));
                    y.push(vy + ry * Math.sin(angle));
                }
            }
            markers.dataX = x;
            markers.dataY = y;
        };

        // A and B are free points whose drag is projected onto the graph; the model is written from the projected x.
        // The labels go above the arch for the endpoints on the rising part, i.e. outside the region under the polyline.
        const endpoint = (which: "a" | "b") => this.slidingPoint({
            x: model()[which], position: arcValue, min: BOUND_MIN, max: BOUND_MAX, step: BOUND_STEP,
            attributes: {...this.styles.point.default, name: `$$${which.toUpperCase()}$$`, label: this.pointLabel("above", 1.2)},
            write: x => this.setBound(which, x, {syncScene: false}),
        });
        this.pointA = endpoint("a");
        this.pointB = endpoint("b");
        this.drawn.set("point-a", this.pointA);
        this.drawn.set("point-b", this.pointB);
    }

    protected override syncSceneToModel(): void {
        const {a, b} = this.model;
        this.pointA?.moveTo([a, arcValue(a)]);
        this.pointB?.moveTo([b, arcValue(b)]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {a, b, n} = this.model;
        return <>
            <PuckOwnedGroup params={["n"]} className="inspector-group">
                <Slider customText={t("arc_n_label")} min={N_MIN} max={N_MAX} step={N_STEP} value={n}
                        onChange={next => this.ignoreOutOfDomain(() => this.setCount(Math.round(next)))}/>
            </PuckOwnedGroup>
            <PuckOwnedGroup params={["a", "b"]} className="inspector-group">
                <PuckOwned param="a"><Slider customText={t("arc_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/></PuckOwned>
                <PuckOwned param="b"><Slider customText={t("arc_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/></PuckOwned>
                <p className="inspector-help">{t("arc_bounds_help")}</p>
            </PuckOwnedGroup>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            a: {read: () => this.model.a, apply: (value: number) => this.setBound("a", value)},
            b: {read: () => this.model.b, apply: (value: number) => this.setBound("b", value)},
            n: {read: () => this.model.n, apply: (value: number) => this.setCount(value)},
        };
    }

    /** The common declaration (rows, view marks) plus the count and the endpoints as board pucks and the legend of the drawn objects. */
    protected override declaration(): GraphDeclaration {
        const bound = (key: "a" | "b"): ParameterDeclaration => ({
            key, kind: "range", label: message(key === "a" ? "arc_a_name" : "arc_b_name"), symbol: key, help: message("arc_bounds_help"),
            placement: "board", min: BOUND_MIN, max: BOUND_MAX, step: BOUND_STEP, maxDecimals: 2,
        });
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "n", kind: "count", label: message("arc_n_name"), symbol: "n", placement: "board", min: N_MIN, max: N_MAX},
                bound("a"),
                bound("b"),
            ],
            legend: [
                {id: "curve", label: message("arc_legend_curve"), kind: "line", object: "curve"},
                {id: "polyline", label: message("arc_legend_polyline"), kind: "line", object: "polyline"},
                {id: "point-a", label: message("arc_legend_point_a"), kind: "point", object: "point-a"},
                {id: "point-b", label: message("arc_legend_point_b"), kind: "point", object: "point-b"},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "point-a" || id === "point-b" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base (task 08): the readout rows, the note and the plotted curve; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {a, b, n} = this.model;
        return {
            rows: [
                {id: "a", symbol: "a", value: messageNumber(a)},
                {id: "b", symbol: "b", value: messageNumber(b)},
                {id: "n", symbol: "n", value: messageNumber(n, 0)},
                {id: "polyline", name: message("arc_polyline"), value: messageNumber(polylineLength(a, b, n), PRECISE)},
                {id: "arc", name: message("arc_exact"), value: messageNumber(arcLength(a, b), PRECISE)},
                {id: "difference", name: message("arc_difference"), value: messageNumber(lengthDifference(a, b, n), PRECISE)},
            ],
            help: message("arc_note"),
            plotted: arcValue,
            must: [{x: a, y: arcValue(a)}, {x: b, y: arcValue(b)}],
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default ArcLengthGraph;
