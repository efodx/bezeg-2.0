import React from 'react';

import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import {CurveOperation} from "../../base/controls/BezierCurveControls";
import {usePuckOwns} from "../../base/controls/PuckOwnership";
import {message} from "../../../localization";
import {GraphPalette} from "../../styles/GraphPalette";
import {BezierCurveAttributes, EXTRAPOLATION_T_MAX, EXTRAPOLATION_T_MIN} from "../object/AbstractJXGBezierCurve";
import {BaseGraphStates, type BaseCurveIds} from "../../base/BaseCurveGraph";
import type {GraphDeclaration, LegendEntry, ViewMark, ViewMarks} from "../../base/declare/graphDeclaration";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {watchedBox} from "../bezier/watchedBox";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {extrapolationActions} from "../../base/lesson/curveLessonActions";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {rationalExtrapolationPresetCollection} from "./collections";

/** Samples of the extended arc kept as a view mark. */
const EXTENSION_SAMPLES = 12;

/** The ids of the rational extrapolation declaration: the common curve ids plus the extrapolation parameter and the point beyond the curve. */
export type RationalExtrapolationIds = Omit<BaseCurveIds, "param" | "legend"> & {
    param: "extrapolation-t";
    legend: BaseCurveIds["legend"] | "extrapolation-point";
};

/** The extrapolation operation of the Construction card: its t slider is left out once the board's puck owns it. */
function ExtrapolationOperation(props: React.ComponentProps<typeof CurveOperation>) {
    return <CurveOperation {...props} parameter={usePuckOwns("extrapolation-t") ? null : props.parameter}/>;
}

class GraphExtrapolation extends BaseRationalCurveGraph<BaseGraphStates> {
    protected override workspaceConstructionFirst() { return true; }
    /** Task 08 (lane L41): the board workspace (legend with the point beyond the curve, view marks over the arc, the extrapolation puck). */
    protected override declaresRationalWorkspace() { return true; }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "extrapolation-t": {
                read: () => this.getFirstJxgCurve()?.getExtrapolationT() ?? EXTRAPOLATION_T_MIN,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !Number.isFinite(value) || value < EXTRAPOLATION_T_MIN || value > EXTRAPOLATION_T_MAX) throw new DomainError(message("extrapolation_t_refused"));
                    this.getFirstJxgCurve().setExtrapolationT(value);
                    this.refreshWorkspace();
                },
            },
        };
    }

    /** Samples of the curve beyond t = 1, up to `end`, as a view mark (empty while the extension has no length). */
    private extensionMark(end: number): ViewMark[] {
        const model = this.getFirstJxgCurve()?.getCurve();
        if (!model || !(end > 1)) return [];
        const points: (readonly [number, number])[] = [];
        for (let i = 0; i <= EXTENSION_SAMPLES; i++) {
            const p = model.eval(1 + (end - 1) * i / EXTENSION_SAMPLES);
            if (Number.isFinite(p.X()) && Number.isFinite(p.Y())) points.push([p.X(), p.Y()]);
        }
        return points.length > 1 ? [{kind: "polyline", points}] : [];
    }

    /** The common marks plus the extended arc up to the parameter and the point beyond the curve. */
    protected override curveViewMarks(): ViewMarks {
        const base = super.curveViewMarks();
        const end = this.getFirstJxgCurve()?.getExtrapolationT() ?? 1;
        // Memoized on the base marks and the parameter, so an unchanged scene returns the same object.
        if (this.extendedMarks?.base === base && this.extendedMarks.end === end) return this.extendedMarks.marks;
        const point = this.getFirstJxgCurve()?.getCurve().eval(end);
        const marks: ViewMarks = {must: [...base.must, ...(point && Number.isFinite(point.X()) && Number.isFinite(point.Y()) ? [{kind: "point" as const, x: point.X(), y: point.Y()}] : [])],
            nice: [...(base.nice ?? []), ...this.extensionMark(end)]};
        this.extendedMarks = {base, end, marks};
        return marks;
    }
    private extendedMarks: {base: ViewMarks; end: number; marks: ViewMarks} | undefined;

    protected override declaration(): GraphDeclaration<RationalExtrapolationIds> | undefined {
        const common = this.commonCurveDeclaration();
        const legend: LegendEntry<RationalExtrapolationIds>[] = [...(common.legend ?? []),
            {id: "extrapolation-point", label: message("extrapolation_legend_point"), kind: "point", object: "extrapolation-point"}];
        // The view frames the extension to the largest offered parameter, so it does not move while the puck is dragged.
        const own = super.curveViewMarks();
        const reach = {must: own.must, nice: [...(own.nice ?? []), ...this.extensionMark(EXTRAPOLATION_T_MAX)]};
        return {...common, legend, followView: watchedBox(reach),
            parameters: [{key: "extrapolation-t", kind: "range", label: message("extrapolation_t_name"), symbol: "t", placement: "board", min: EXTRAPOLATION_T_MIN, max: EXTRAPOLATION_T_MAX, step: 0.01, maxDecimals: 2}]};
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== "extrapolation-point") return super.drawnObject(id);
        const point: JXG.GeometryElement | null | undefined = this.getFirstJxgCurve()?.extrapolationPoint;
        // While the curve is selected its extrapolation point is gone (recreated on deselect), so the entry reads as not drawn.
        if (!point) return {color: super.drawnObject("control-points-0")?.color ?? GraphPalette.comparisonCurve, visible: false};
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = point as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp("fillcolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    override initialize() {
        super.initialize();
        this.prepareExtrapolationCurve();
        this.boardUpdate();
    }

    /** Extrapolation point state lives on the curve object, so every newly imported curve needs it again. */
    private prepareExtrapolationCurve() {
        const curve = this.getFirstJxgCurve();
        if (!curve) return;
        curve.createExtrapolationPoint();
        curve.showExtrapolationPoint();
        curve.setAttributes({
            allowShrink: false,
            allowExtrapolation: false,
            allowElevation: false,
            allowDecasteljau: false,
            allowSubdivision: false
        } as BezierCurveAttributes);
    }

    override importPresetData(str: CurveCollectionPresetData) {
        super.importPresetData(str);
        this.prepareExtrapolationCurve();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(extrapolationActions({
            setParameter: value => {
                this.getFirstJxgCurve().setExtrapolationT(value);
                this.refreshWorkspace();
            },
            extrapolate: () => this.extrapolate(),
        }));
    }

    override getGraphCommands(): JSX.Element[] {
        // The extrapolated point stays on the board, so the operation offers no Preview toggle.
        return this.state.initialized ? super.getGraphCommands().concat([<div key="extrapolation">
            <ExtrapolationOperation curve={this.getFirstJxgCurve()} tool="extrapolation" permanentPreview onChanged={() => this.store.notify()}
                            onApply={() => this.extrapolate()}/>
        </div>]) : [];
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXRationalBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -1]], "weights": [1, 2, 1, 1], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "subdivisionT": 0.5,
                "extrapolationT": 1.2,
                "showingWeights": false,
                "weightNumber": 1,
                "showingFarinPoints": false
            }
        }]];
    }

    override presetCollection() {
        return rationalExtrapolationPresetCollection;
    }

    override deselectSelectedCurve() {
        super.deselectSelectedCurve();
        this.getFirstJxgCurve().createExtrapolationPoint();
        this.getFirstJxgCurve().showExtrapolationPoint();
    }

    private extrapolate() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().extrapolate(this.getFirstJxgCurve().getExtrapolationT());
        this.unsuspendBoardUpdate();
    }

}

export default GraphExtrapolation;
