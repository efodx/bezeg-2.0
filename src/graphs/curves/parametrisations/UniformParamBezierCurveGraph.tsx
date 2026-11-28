import {message, t} from "../../../localization";
import BasePhBezierCurveGraph, {BasePhBezierCurveGraphStates, type PhIds} from "../ph/BasePhBezierCurveGraph";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration} from "../../base/declare/graphDeclaration";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../../base/controls/PuckOwnership";
import {DomainError} from "../../functions/BaseFunctionGraph";
import React from "react";
import Slider from "../../../inputs/Slider";
import {CountSetter} from "../../../inputs/CountSetter";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {range} from "../../../utils/Range";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {GraphPalette} from "../../styles/GraphPalette";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {uniformParameterizationPresetCollection} from "./collections";
import {
    ALPHA_PARAM_MAX_SAMPLES,
    ALPHA_PARAM_MIN_SAMPLES,
    PARAMETERIZATION_ALPHA_MAX,
    PARAMETERIZATION_ALPHA_MIN,
} from "./parametrisationLimits";

interface UniformParamBezierCurveGraphStates extends BasePhBezierCurveGraphStates {
    isAlphaParam: boolean
    numberOfPoints: number
    alpha: number
}

/**
 * The ids of the uniform comparison's declaration (the PH ids plus the method and the sample count, both board pucks and arbiter
 * keys). The weight alpha is not declared: no lesson step asks the learner to vary it here, so its slider stays in Orodja.
 */
export type UniformIds = {
    param: PhIds['param'] | 'param-mode' | 'param-count'; row: PhIds['row']; note: never; section: never;
    legend: PhIds['legend'] | 'samples'; action: PhIds['action'];
};

class UniformParamBezierCurveGraph extends BasePhBezierCurveGraph<UniformParamBezierCurveGraphStates> {
    private ts?: number[];
    /** Sample points this graph created; the only points clearPoints() may remove. */
    private sampleJxgPoints: JXG.Point[] = [];

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        // The scene disposal removes graphJXGPoints (which include the samples) from the board.
        this.ts = undefined;
        this.sampleJxgPoints = [];
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('parameterization-alpha', action => {
            if (!Number.isFinite(action.value) || action.value < PARAMETERIZATION_ALPHA_MIN || action.value > PARAMETERIZATION_ALPHA_MAX) {
                throw new Error(`The parametrization alpha must be between ${PARAMETERIZATION_ALPHA_MIN} and ${PARAMETERIZATION_ALPHA_MAX}.`);
            }
            this.setState({alpha: action.value});
        });
        registry.on('parameterization-samples', action => {
            if (!Number.isInteger(action.count) || action.count < ALPHA_PARAM_MIN_SAMPLES || action.count > ALPHA_PARAM_MAX_SAMPLES) {
                throw new Error(`The number of sample points must be an integer between ${ALPHA_PARAM_MIN_SAMPLES} and ${ALPHA_PARAM_MAX_SAMPLES}.`);
            }
            this.setState({numberOfPoints: action.count});
        });
        registry.on('parameterization-mode', action => {
            if (action.mode !== 'weighted' && action.mode !== 'uniform') {
                throw new Error('The parametrization mode must be weighted or uniform.');
            }
            this.setState({isAlphaParam: action.mode === 'weighted'});
        });
    }

    protected override workspaceDescription() {
        return t("compare_weighted_and_uniform_parametrization_of_the_ph_curve");
    }

    /** The PH workspace: legend, marks, the arc length as a row (it was board text), the offset puck while offsets are drawn. */
    protected override declaresPhWorkspace(): boolean { return true; }

    /** No lesson step flips the control polygon or the hull here; the pucks are the method and the sample count. */
    protected override curveDisplayPuck(): boolean { return false; }

    /** Construction first: the method and the sample count are board pucks (steps "Preklopi med ..." and "spremeni Število točk"), α stays here. */
    protected override workspaceEdit(): React.ReactNode {
        const params = this.state.isAlphaParam ? ['param-mode', 'param-count', 'param-alpha'] : ['param-mode', 'param-count'];
        return <>{this.state.initialized && <PuckOwnedGroup params={params} className="inspector-group"><h3>{t("construction")}</h3>{this.paramField()}</PuckOwnedGroup>}
            {super.workspaceEdit()}</>;
    }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            ...super.parameterBindings(),
            'param-mode': {
                read: () => this.state.isAlphaParam ? 'alpha' : 'uniform',
                apply: (value: unknown) => {
                    if (value !== 'alpha' && value !== 'uniform') throw new DomainError(message('param_mode_refused'));
                    this.selectParam(value);
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

    protected override declaration(): GraphDeclaration | undefined {
        const base = super.declaration();
        if (!base) return undefined;
        const mine: ParameterDeclaration<UniformIds['param']>[] = [
            {key: 'param-mode', kind: 'choice', label: message('param_mode_name'), placement: 'board', puck: true, options: [
                {value: 'alpha', label: message('weighted_parametrization'), short: message('param_mode_weighted_short')},
                {value: 'uniform', label: message('uniform_parametrization'), short: message('param_mode_uniform_short')},
            ]},
            {key: 'param-count', kind: 'count', label: message('number_of_points'), symbol: 'N', placement: 'board', min: ALPHA_PARAM_MIN_SAMPLES, max: ALPHA_PARAM_MAX_SAMPLES},
        ];
        const samples: LegendEntry<UniformIds> = {id: 'samples', label: message('param_samples_legend'), kind: 'point', object: 'samples'};
        return {...base, parameters: [...(base.parameters ?? []), ...mine], legend: [...(base.legend ?? []), samples]};
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'samples') return super.drawnObject(id);
        const element = this.sampleJxgPoints[0];
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('fillcolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    protected override onStateChange(prevState: Readonly<UniformParamBezierCurveGraphStates>) {
        if (prevState === this.state) { return; }
        super.onStateChange(prevState);
        this.syncSamplesToState();
    }

    /** The parameter values and sample markers are rebuilt on an imported curve before the host commits. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncSamplesToState();
    }

    /** Idempotent: recomputes the sample parameters and brings the markers in line with the scene state. */
    private syncSamplesToState() {
        if (!this.getFirstJxgCurve() || !this.graphSession?.isAlive) { return; }
        this.board.suspendUpdate();
        this.refreshTs();
        if (this.sampleJxgPoints.length !== this.state.numberOfPoints) {
            this.clearPoints();
            this.generateParamPoints();
        }
        this.unsuspendBoardUpdate();
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXPHBezierCurve", {
            "points": [[-3, -4]], "hodographs": [[-4.5, -4], [-1, 0], [-4.5, 4]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2,
                "showOffsetCurveControlPoints": false,
                "showOffsetCurve": false
            }
        }]];
    }

    override getInitialState(): UniformParamBezierCurveGraphStates {
        return {
            ...super.getInitialState(), isAlphaParam: true, alpha: 0.5, numberOfPoints: 10
        };
    }

    alphaParam(t: number): number {
        return (1 - this.state.alpha) * t / (this.state.alpha * (1 - t) + (1 - this.state.alpha) * t);
    }

    override getFirstCurve(): PhBezierCurve {
        return super.getFirstCurve() as PhBezierCurve;
    }

    setAlpha(alpha: number) {
        this.setState({alpha: alpha});
    }

    getUniformParamTs() {
        const curve = this.getFirstCurve();
        const curveLength = curve.s(1);
        const ds = curveLength / (this.state.numberOfPoints + 1);
        let t = 0;
        const ts = [];
        for (let i = 0; i <= this.state.numberOfPoints; i++) {
            t = curve.tk(t, ds, i + 1);
            ts.push(t);
        }
        return ts;
    }

    setNumberOfPoints(numberOfPoints: number) {
        this.setState({numberOfPoints: numberOfPoints});
    }

    paramField() {
        return <div>
            <PuckOwned param="param-mode"><div className="mb-3">
                <ChoiceSelect label={t("choose_parametrization")}
                              value={this.state.isAlphaParam ? "alpha" : "uniform"}
                              options={[{value: "alpha", text: t("weighted_parametrization")},
                                  {value: "uniform", text: t("uniform_parametrization")}]}
                              onChange={value => this.selectParam(value)}/>
            </div></PuckOwned>
            <PuckOwned param="param-count"><div><CountSetter label={t("number_of_points")} n={this.state.numberOfPoints} min={ALPHA_PARAM_MIN_SAMPLES} max={ALPHA_PARAM_MAX_SAMPLES}
                                 onPlus={() => this.setNumberOfPoints(Math.min(ALPHA_PARAM_MAX_SAMPLES, this.state.numberOfPoints + 1))}
                                 onMinus={() => this.setNumberOfPoints(Math.max(ALPHA_PARAM_MIN_SAMPLES, this.state.numberOfPoints - 1))}
                                 onSet={count => count >= ALPHA_PARAM_MIN_SAMPLES && count <= ALPHA_PARAM_MAX_SAMPLES ? (this.setNumberOfPoints(count), true) : false}/>
            </div></PuckOwned>
            {this.state.isAlphaParam ? <div>
                <Slider min={PARAMETERIZATION_ALPHA_MIN} max={PARAMETERIZATION_ALPHA_MAX} value={this.state.alpha} customText={t("parameter_alpha")}
                        onChange={(alpha) => this.setAlpha(alpha)}/>
            </div> : null}

        </div>;
    }

    clearPoints() {
        const owned = this.sampleJxgPoints;
        this.sampleJxgPoints = [];
        this.graphJXGPoints = this.graphJXGPoints.filter(point => !owned.includes(point));
        const present = owned.filter(point => this.board.objectsList.includes(point));
        if (present.length) this.board.removeObject(present);
    }

    refreshTs() {
        const dt = 1 / (this.state.numberOfPoints + 1);
        if (this.state.isAlphaParam) {
            this.ts = range(1, this.state.numberOfPoints + 1, 1).map(i => this.alphaParam(i * dt));
        } else {
            this.ts = this.getUniformParamTs();
        }
    }

    generateParamPoints() {
        for (let i = 1; i <= this.state.numberOfPoints; i++) {
            let point = this.createJSXGraphPoint(() => this.getFirstCurve().eval(this.ts?.[i - 1] ?? 0).X(), () => this.getFirstCurve().eval(this.ts?.[i - 1] ?? 0).Y(), {
                ...this.styles.point.fixed,
                size: () => this.displaySettings.pointSize * 0.7,
                fillColor: GraphPalette.parameterSample,
            });
            // Keep the outline as a post-creation override; JSXGraph merges color and strokeColor unreliably.
            point.point.setAttribute({strokeWidth: () => this.displaySettings.pointSize / 5, strokeColor: GraphPalette.pointOutline});
            this.sampleJxgPoints.push(point.point);
        }
    }

    override presetCollection() {
        return uniformParameterizationPresetCollection;
    }

    private selectParam(param: string) {
        this.setState({isAlphaParam: param === "alpha"});
    }
}

export default UniformParamBezierCurveGraph;
