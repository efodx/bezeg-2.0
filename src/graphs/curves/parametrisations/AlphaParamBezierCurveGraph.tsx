import {message, t} from "../../../localization";
import {BaseCurveIds, BaseGraphStates} from "../../base/BaseCurveGraph";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration} from "../../base/declare/graphDeclaration";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../../base/controls/PuckOwnership";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import React from "react";
import Slider from "../../../inputs/Slider";
import {CountSetter} from "../../../inputs/CountSetter";
import {GraphPalette} from "../../styles/GraphPalette";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {weightedParameterizationPresetCollection} from "./collections";

import {
    ALPHA_PARAM_MAX_SAMPLES,
    ALPHA_PARAM_MIN_SAMPLES,
    PARAMETERIZATION_ALPHA_MAX,
    PARAMETERIZATION_ALPHA_MIN,
} from "./parametrisationLimits";

interface AlphaParamGraphStates extends BaseGraphStates {
    numberOfPoints: number;
    alpha: number;
}

/** The ids of the weighted comparison's declaration: the weight α and the sample count (board pucks, arbiter keys), the sample points in the legend. */
export type WeightedIds = {
    param: 'param-alpha' | 'param-count'; row: never; note: never; section: never;
    legend: BaseCurveIds['legend'] | 'samples'; action: BaseCurveIds['action'];
};

/** phi_alpha(t) = (1-alpha) t / (alpha (1-t) + (1-alpha) t); alpha = 1/2 is the identity. */
export function alphaParameterization(alpha: number, t: number): number {
    return (1 - alpha) * t / (alpha * (1 - t) + (1 - alpha) * t);
}

class AlphaParamBezierCurveGraph extends BaseBezierCurveGraph<AlphaParamGraphStates> {

    /** The control points also have a typed path (the shared edit-only list), next to dragging. */
    protected override workspaceTypedPoints() { return true; }

    override getInitialState() {
        return {
            ...super.getInitialState(),
            numberOfPoints: 10,
            alpha: 0.5,
        };
    }

    /** Sample markers owned by this graph; control points belong to the curve objects and are never listed here. */
    private sampleMarkers: JXG.Point[] = [];

    protected override onStateChange(prevState: Readonly<AlphaParamGraphStates>) {
        if (prevState === this.state) { return; }
        this.syncSamplesToState();
    }

    /** The sample markers are rebuilt on an imported curve before the host commits. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncSamplesToState();
    }

    /** Idempotent: brings the sample markers in line with the scene state. */
    private syncSamplesToState() {
        if (!this.board || !this.graphSession?.isAlive || !this.getFirstJxgCurve()) { return; }
        if (this.samplesAreCurrent(this.state.numberOfPoints)) {
            // Alpha is read lazily by the marker coordinates, so markers only need a refresh.
            this.boardUpdate();
            return;
        }
        this.board.suspendUpdate();
        this.clearPoints();
        this.generateParamPoints();
        this.unsuspendBoardUpdate();
    }

    private samplesAreCurrent(count: number): boolean {
        return this.sampleMarkers.length === count
            && this.sampleMarkers.every(point => this.board.objectsList.includes(point));
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('parameterization-alpha', action => {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < PARAMETERIZATION_ALPHA_MIN || value > PARAMETERIZATION_ALPHA_MAX) {
                throw new Error(`The parameter α must be a number from ${PARAMETERIZATION_ALPHA_MIN} to ${PARAMETERIZATION_ALPHA_MAX}.`);
            }
            this.setState({alpha: value});
            this.boardUpdate();
        });
        registry.on('parameterization-samples', action => {
            const count = action.count;
            if (!Number.isInteger(count) || count < ALPHA_PARAM_MIN_SAMPLES || count > ALPHA_PARAM_MAX_SAMPLES) {
                throw new Error(`The number of sample points must be an integer from ${ALPHA_PARAM_MIN_SAMPLES} to ${ALPHA_PARAM_MAX_SAMPLES}.`);
            }
            this.setState({numberOfPoints: count});
            this.board.suspendUpdate();
            try {
                this.clearPoints();
                this.generateParamPoints(count);
            } finally {
                this.unsuspendBoardUpdate();
            }
        });
        // 'parameterization-mode' belongs to the weighted/uniform comparison graph; it is not registered here.
    }

    protected override disposeFigureScene(): void {
        super.disposeFigureScene();
        this.sampleMarkers = [];
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            "points": [[-4, -3], [-3, 2], [2, 2], [3, -2]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2
            }
        }]];
    }

    alphaParam: (t: number) => number = (t: number) => alphaParameterization(this.state.alpha, t);

    protected override declaresCurveWorkspace(): boolean { return true; }
    /** No lesson step flips the control polygon or the hull here; the pucks are α and the sample count. */
    protected override curveDisplayPuck(): boolean { return false; }

    /** Construction first: α leads, the sample count follows; both are board pucks (steps "Premikaj drsnik α" and "poskusi še Število točk"). */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && <PuckOwnedGroup params={['param-alpha', 'param-count']} className="inspector-group"><h3>{t("construction")}</h3>
            <PuckOwned param="param-alpha">{this.alphaParamSlider()}</PuckOwned>
            <PuckOwned param="param-count">{this.numberOfPointsSlider()}</PuckOwned></PuckOwnedGroup>}
            {super.workspaceEdit()}</>;
    }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            ...super.parameterBindings(),
            'param-alpha': {
                read: () => this.state.alpha,
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < PARAMETERIZATION_ALPHA_MIN || value > PARAMETERIZATION_ALPHA_MAX) {
                        throw new DomainError(message('param_alpha_refused', {value0: String(PARAMETERIZATION_ALPHA_MIN), value1: String(PARAMETERIZATION_ALPHA_MAX)}));
                    }
                    this.setAlpha(value);
                },
            },
            'param-count': {
                read: () => this.state.numberOfPoints,
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isInteger(value) || value < ALPHA_PARAM_MIN_SAMPLES || value > ALPHA_PARAM_MAX_SAMPLES) {
                        throw new DomainError(message('param_samples_refused', {value0: String(ALPHA_PARAM_MIN_SAMPLES), value1: String(ALPHA_PARAM_MAX_SAMPLES)}));
                    }
                    this.setNumberOfPoints(value);
                },
            },
        };
    }

    /** The common curve declaration, the weight α and the sample count as board pucks, and the sample points in the legend. Shows no values. */
    protected override declaration(): GraphDeclaration<WeightedIds> {
        const common = this.commonCurveDeclaration();
        const parameters: ParameterDeclaration<WeightedIds['param']>[] = [
            {key: 'param-alpha', kind: 'range', label: message('param_alpha_name'), symbol: '\\alpha', placement: 'board', min: PARAMETERIZATION_ALPHA_MIN, max: PARAMETERIZATION_ALPHA_MAX, step: 0.01, maxDecimals: 2},
            {key: 'param-count', kind: 'count', label: message('number_of_points'), symbol: 'N', placement: 'board', min: ALPHA_PARAM_MIN_SAMPLES, max: ALPHA_PARAM_MAX_SAMPLES},
        ];
        const legend: LegendEntry<WeightedIds>[] = [...(common.legend ?? []), {id: 'samples', label: message('param_samples_legend'), kind: 'point', object: 'samples'}];
        return {...common, parameters, legend};
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'samples') return super.drawnObject(id);
        const element = this.sampleMarkers[0];
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('fillcolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    setAlpha(alpha: number) {
        this.setState({alpha: alpha});
    }

    setNumberOfPoints(numberOfPoints: number) {
        this.setState({numberOfPoints: numberOfPoints});
    }

    alphaParamSlider() {
        return <div><Slider min={PARAMETERIZATION_ALPHA_MIN} max={PARAMETERIZATION_ALPHA_MAX} value={this.state.alpha} customText={t("parameter_alpha")} help={t("parameter_alpha_point_spacing_help")}
                            onChange={(alpha) => this.setAlpha(alpha)}/></div>;
    }

    numberOfPointsSlider() {
        return <div><CountSetter label={t("number_of_points")} n={this.state.numberOfPoints} min={ALPHA_PARAM_MIN_SAMPLES} max={ALPHA_PARAM_MAX_SAMPLES}
                                 onPlus={() => this.setNumberOfPoints(Math.min(ALPHA_PARAM_MAX_SAMPLES, this.state.numberOfPoints + 1))}
                                 onMinus={() => this.setNumberOfPoints(Math.max(ALPHA_PARAM_MIN_SAMPLES, this.state.numberOfPoints - 1))}
                                 onSet={count => count >= ALPHA_PARAM_MIN_SAMPLES && count <= ALPHA_PARAM_MAX_SAMPLES ? (this.setNumberOfPoints(count), true) : false}/>
        </div>;
    }

    clearPoints() {
        const owned = new Set<JXG.Point>(this.sampleMarkers);
        const present = this.sampleMarkers.filter(point => this.board.objectsList.includes(point)).reverse();
        if (present.length) this.board.removeObject(present);
        this.graphJXGPoints = this.graphJXGPoints.filter(point => !owned.has(point));
        this.sampleMarkers = [];
    }

    generateParamPoints(count: number = this.state.numberOfPoints) {
        const dt = 1 / (count + 1);
        for (let i = 1; i <= count; i++) {
            const point = this.createJSXGraphPoint(() => this.getFirstCurve()!.eval(this.alphaParam(i * dt)).X(), () => this.getFirstCurve()!.eval(this.alphaParam(i * dt)).Y(), {
                ...this.styles.point.fixed,
                size: () => this.displaySettings.pointSize * 0.7,
                fillColor: GraphPalette.parameterSample,
            });
            this.sampleMarkers.push(point.point);
            // Keep the outline as a post-creation override; JSXGraph merges color and strokeColor unreliably.
            point.point.setAttribute({strokeWidth: () => this.displaySettings.pointSize / 5, strokeColor: GraphPalette.pointOutline});
        }
    }

    override presetCollection() {
        return weightedParameterizationPresetCollection;
    }
}

export default AlphaParamBezierCurveGraph;
