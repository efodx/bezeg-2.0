import React from "react";
import BaseFunctionGraph, {DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {NumberInput} from "../../inputs/NumberInput";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {
    arcLength, arcValue, BOUND_MAX, BOUND_MIN, BOUND_STEP, isBound, isSegmentCount, lengthDifference, N_MAX, N_MIN, N_STEP, polylineLength, polylineVertices,
} from "../../analysis/arcLength";
import {ArcLengthModel, DEFAULT_ARC_LENGTH_MODEL, parseArcLengthModel} from "../../analysis/arcLengthModel";
import {GraphPalette} from "../styles/GraphPalette";

/** Lengths show four decimals so that the lesson's 3.7242, 3.8153 and 3.8202 can be read off. */
const PRECISE = 4;

/** A JSXGraph curve whose point lists are rebuilt in `updateDataArray`. */
interface DataCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}

type BoundingBox = [left: number, top: number, right: number, bottom: number];

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
    private verticesCache?: { model: ArcLengthModel; vertices: [number, number][] };

    override presets(): string {
        return "arc-length";
    }

    protected defaultModel(): ArcLengthModel {
        return {...DEFAULT_ARC_LENGTH_MODEL};
    }

    protected parseModel(data: unknown): ArcLengthModel | undefined {
        return parseArcLengthModel(data);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...DEFAULT_VIEW];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new DomainError(`The endpoint ${which} must be a finite number between ${BOUND_MIN} and ${BOUND_MAX}.`);
        this.commitModel({...this.model, [which]: value}, options);
    }

    protected setCount(value: number): void {
        if (!isSegmentCount(value)) throw new DomainError(`The number of segments n must be an integer from ${N_MIN} to ${N_MAX}.`);
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

    /** The polyline vertices of the current model, computed once per model however many curves read them. */
    private currentVertices(): [number, number][] {
        const model = this.model;
        if (this.verticesCache?.model !== model) this.verticesCache = {model, vertices: polylineVertices(model.a, model.b, model.n)};
        return this.verticesCache.vertices;
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the curve, the polyline, the polyline vertices, then the endpoints.
        this.own(board.create("functiongraph", [arcValue], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        }));
        const polyline = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.constructionAccent, highlight: false, fixed: true, strokeWidth,
        })) as unknown as DataCurve;
        polyline.updateDataArray = () => {
            const vertices = this.currentVertices();
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
            for (const [vx, vy] of this.currentVertices()) {
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

        // The function and the two lengths, the most important readouts, stay on the board, top right: the arch never rises above y = 1.
        this.caption("top-right", [
            {text: () => "f(x) = sin x", scale: 1.2, math: true},
            {text: () => t("arc_board_lengths", {
                value0: formatNumber(polylineLength(model().a, model().b, model().n), language(), PRECISE),
                value1: formatNumber(arcLength(model().a, model().b), language(), PRECISE),
            })},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {a, b} = this.model;
        this.pointA?.moveTo([a, arcValue(a)]);
        this.pointB?.moveTo([b, arcValue(b)]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.verticesCache = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {a, b, n} = this.state;
        return <>
            <div className="inspector-group">
                <NumberInput label={t("arc_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/>
                <NumberInput label={t("arc_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/>
                <p className="inspector-help">{t("arc_bounds_help")}</p>
            </div>
            <div className="inspector-group">
                <Slider customText={t("arc_n_label")} min={N_MIN} max={N_MAX} step={N_STEP} value={n}
                        help={t("arc_n_help")}
                        onChange={next => this.ignoreOutOfDomain(() => this.setCount(Math.round(next)))}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const {a, b, n} = this.state;
        const language = currentLanguage();
        const number = (value: number, decimals = 2) => formatNumber(value, language, decimals);
        const rows = [
            {id: "a", label: "a", value: number(a)},
            {id: "b", label: "b", value: number(b)},
            {id: "n", label: "n", value: number(n, 0)},
            {id: "polyline", label: t("arc_polyline"), value: number(polylineLength(a, b, n), PRECISE)},
            {id: "arc", label: t("arc_exact"), value: number(arcLength(a, b), PRECISE)},
            {id: "difference", label: t("arc_difference"), value: number(lengthDifference(a, b, n), PRECISE)},
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("arc_note")}/>;
    }
}

export default ArcLengthGraph;
