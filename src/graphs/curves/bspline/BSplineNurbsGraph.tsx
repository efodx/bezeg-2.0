import React from "react";
import {currentLanguage, LocalizedError, message, renderMessage, t} from "../../../localization";
import {formatNumber, formatScientific} from "../../../analysis/format";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {NumberInput} from "../../../inputs/NumberInput";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import {domain} from "../../../bezeg/impl/curve/bspline";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {LessonAction, LessonCurveFixture} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {BSplinePresetData, bsplinePresetCollection, weightsRejection} from "./bsplinePresetCollection";
import {BSplineNurbsScene} from "./BSplineNurbsScene";
import {BSplinePointList} from "./BSplinePointList";
import {assertDrawableCurve, ControlPoint, knotsForCount} from "./bsplineDeBoorModel";
import {
    angleDegrees, copyNurbs, maxRadialError, NURBS_EXAMPLE_IDS, NURBS_MAX_POINTS, NurbsData, NurbsExampleId, nurbsExample, nurbsPointAt,
    planWeight, WeightRefusal,
} from "./bsplineNurbsModel";

export interface BSplineNurbsState extends BaseGraphState {
    degree: number;
    /** Raw knots (ADR 0024). */
    knots: readonly number[];
    points: readonly ControlPoint[];
    weights: readonly number[];
    /** The curve Reset returns to: the chosen example or the imported Preset. */
    origin: NurbsData;
    example: NurbsExampleId | 'custom';
    showCircle: boolean;
    /** The slider parameter t, on the domain. */
    t: number;
    /** The latest refused weight; shown as text in the current language. */
    refusal: WeightRefusal | null;
}

/** The first parameter shown: the spec's t = 1/16, where the point is not at 22.5 degrees. */
export const NURBS_DEFAULT_T = 1 / 16;

const initialData = (): Omit<BSplineNurbsState, 'initialized'> => {
    const origin = nurbsExample('circle');
    return {...copyNurbs(origin), origin, example: 'circle', showCircle: true, t: NURBS_DEFAULT_T, refusal: null};
};

const onesFor = (count: number): number[] => Array.from({length: count}, () => 1);

const presetOf = (data: NurbsData): BSplinePresetData =>
    ({degree: data.degree, knots: [...data.knots], points: data.points.map(p => [p[0], p[1]] as const), weights: [...data.weights]});

/** The localized reason a weight was refused. */
export const weightRefusalText = (refusal: WeightRefusal): string => renderMessage(message(
    refusal.reason === 'nonpositive' ? "bspline_weight_nonpositive" : "bspline_weight_not_finite", {value0: refusal.index + 1}));

/** The radial error as text in exponent notation (it is near rounding or clearly large), with the language's decimal separator. */
export const errorText = (value: number): string => formatScientific(value, currentLanguage(), 3);

/**
 * NURBS circle graph (lesson L5): a quadratic B-spline on nine points with editable positive weights, a maximum radial error
 * readout over 1001 samples, an optional unit-circle overlay and a parameter slider t with the point C(t) and its angle in the
 * inspector. The scene state is the only copy of the data; the owned {@link BSplineNurbsScene} reads it lazily. Lesson L5 drives it through `nurbs-circle` scene actions. Its Preset
 * collection is `bsplinePresetCollection` (weights round-trip; a stored curve without weights loads with unit weights).
 */
export class BSplineNurbsGraph extends BaseGraph<BSplineNurbsState, BSplinePresetData> {
    private scene?: BSplineNurbsScene;

    override getInitialState(): BSplineNurbsState {
        return {initialized: false, ...initialData()};
    }

    override presetCollection() {
        return bsplinePresetCollection;
    }

    /** The chosen example, so the host Reset (which reloads the default scene) returns to it; an imported curve falls back to the circle. */
    defaultPreset(): BSplinePresetData {
        const example = this.state?.example;
        return presetOf(nurbsExample(example && example !== 'custom' ? example : 'circle'));
    }

    override exportPresetData(): BSplinePresetData {
        return presetOf(this.state);
    }

    /** A lesson curve fixture: its points, weights (unit if absent) and degree on the given knots, else on the clamped uniform vector. */
    protected override lessonFixtureData(curve: LessonCurveFixture): BSplinePresetData | undefined {
        const degree = curve.degree ?? this.defaultPreset().degree;
        const problem = curve.weights ? weightsRejection(curve.weights, curve.points.length) : undefined;
        if (problem) throw new LocalizedError(problem);
        return {
            degree, knots: curve.knots ? [...curve.knots] : knotsForCount(degree, true, curve.points.length),
            points: curve.points.map(point => [point[0], point[1]] as const), weights: curve.weights ? [...curve.weights] : onesFor(curve.points.length),
        };
    }

    /** Runs right after `importPresetData` for a lesson fixture or default scene: the imported curve and its Reset target survive, the rest is fresh. */
    protected override lessonDefaultState(): BSplineNurbsState {
        const {degree, knots, points, weights, origin, example} = this.state;
        return {initialized: true, ...initialData(), ...copyNurbs({degree, knots, points, weights}), origin, example};
    }

    /** The imported curve becomes the state and the Reset target; a Preset without weights has unit weights. */
    override importPresetData(data: BSplinePresetData) {
        assertDrawableCurve(data, NURBS_MAX_POINTS);
        const problem = data.weights ? weightsRejection(data.weights, data.points.length) : undefined;
        if (problem) throw new LocalizedError(problem);
        const origin = copyNurbs({...data, points: data.points, weights: data.weights ?? onesFor(data.points.length)});
        // Data equal to a shipped example is that example again (the host Reset and the lesson default import it).
        const same = NURBS_EXAMPLE_IDS.find(id => JSON.stringify(presetOf(nurbsExample(id))) === JSON.stringify(presetOf(origin)));
        const [start, end] = domain(origin.knots, origin.degree, origin.points.length - 1);
        this.setState({...copyNurbs(origin), origin, example: same ?? 'custom', refusal: null, t: Math.min(end, Math.max(start, this.state.t))});
    }

    /** The just-imported data wins over the mount-time defaults and over a stale stored state. */
    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): BSplineNurbsState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points, weights, origin, example, t} = this.state;
        return {...merged, ...copyNurbs({degree, knots, points, weights}), origin, example, t, refusal: null};
    }

    protected override initialView(): [number, number, number, number] {
        return [-2, 2, 2, -2];
    }

    override initialize() {
        this.ensureScene();
    }

    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new BSplineNurbsScene({
            board: this.board,
            degree: () => this.state.degree,
            knots: () => this.state.knots,
            points: () => this.state.points,
            weights: () => this.state.weights,
            showCircle: () => this.state.showCircle,
            marker: () => this.markerPoint(),
            onPointsDrag: points => this.setState({points}),
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncScene();
    }

    /** Shows the state on the board: a scene that cannot show it by `sync` (other degree, knots or point count) is rebuilt. */
    private syncScene() {
        const {degree, knots, points} = this.state;
        if (this.scene && !this.scene.fits(degree, knots, points.length)) this.ensureScene();
        else this.scene?.sync();
    }

    protected override disposeFigureScene(): void {
        this.removeScene();
    }

    override unmount() {
        this.removeScene();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<BSplineNurbsState>) {
        if (prevState === this.state || !this.board) return;
        this.syncScene();
        this.boardUpdate();
    }

    // ---- Readouts ----------------------------------------------------------------------------------------------------

    /** C(t) for the slider parameter, or undefined when the curve cannot be evaluated. */
    markerPoint(): ControlPoint | undefined {
        try {
            return nurbsPointAt(this.state, this.state.t);
        } catch {
            return undefined;
        }
    }

    /** max |‖C(t)‖ − 1| over 1001 samples; NaN when the curve cannot be evaluated. */
    radialError(): number {
        try {
            return maxRadialError(this.state);
        } catch {
            return NaN;
        }
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /**
     * A typed weight (zero-based index). A nonpositive or non-finite value is refused: the state keeps the previous weights and shows
     * the reason. Returns the localized reason, or undefined when accepted.
     */
    setWeight(index: number, value: number): string | undefined {
        const {weights} = this.state;
        if (!Number.isInteger(index) || index < 0 || index >= weights.length) return undefined;
        const plan = planWeight(weights, index, value);
        if (!plan.ok) {
            this.setState({refusal: plan.refusal});
            return weightRefusalText(plan.refusal);
        }
        this.setState({weights: plan.weights, refusal: null});
        return undefined;
    }

    /** A typed control point (the same path as a board drag); the weights stay. */
    editPoint(index: number, value: ControlPoint) {
        const {points} = this.state;
        if (!Number.isInteger(index) || index < 0 || index >= points.length) return;
        this.setState({points: points.map((point, i) => i === index ? value : point)});
    }

    setT(t: number) {
        if (!Number.isFinite(t)) return;
        const [start, end] = domain(this.state.knots, this.state.degree, this.state.points.length - 1);
        this.setState({t: Math.min(end, Math.max(start, t))});
    }

    setShowCircle(show: boolean) {
        this.setState({showCircle: show});
    }

    /** Back to the example's (or imported Preset's) original points and weights. */
    resetToOrigin() {
        this.setState({...copyNurbs(this.state.origin), t: NURBS_DEFAULT_T, refusal: null});
    }

    /** Loads an example as the new Reset target. */
    selectExample(id: NurbsExampleId) {
        if (!NURBS_EXAMPLE_IDS.includes(id)) return;
        const origin = nurbsExample(id);
        this.setState({...copyNurbs(origin), origin, example: id, refusal: null});
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('nurbs-circle', action => this.applyNurbsAction(action));
    }

    /** Applies one `nurbs-circle` scene action through the setters the controls use; invalid input throws (the lesson content is wrong). */
    private applyNurbsAction(action: Extract<LessonAction, {kind: 'nurbs-circle'}>): void {
        switch (action.operation) {
            case 'set-example':
                if (!NURBS_EXAMPLE_IDS.includes(action.exampleId)) throw new Error(`Unknown NURBS example “${String(action.exampleId)}”.`);
                this.selectExample(action.exampleId);
                break;
            case 'set-t': {
                const [start, end] = domain(this.state.knots, this.state.degree, this.state.points.length - 1);
                if (!Number.isFinite(action.value) || action.value < start || action.value > end) throw new Error(`The parameter must lie in [${start}, ${end}].`);
                this.setT(action.value);
                break;
            }
            case 'set-weight': {
                if (!Number.isInteger(action.index) || action.index < 0 || action.index >= this.state.weights.length) throw new Error(`There is no weight ${String(action.index)}.`);
                const refused = this.setWeight(action.index, action.value);
                if (refused !== undefined) throw new Error(refused);
                break;
            }
            case 'set-circle':
                if (typeof action.visible !== 'boolean') throw new Error('The circle overlay must be shown or hidden with a boolean.');
                this.setShowCircle(action.visible);
                break;
            default:
                this.resetToOrigin();
        }
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {knots, degree, points, weights, example, showCircle, t: param, refusal} = this.state;
        const [start, end] = domain(knots, degree, points.length - 1);
        const point = this.markerPoint();
        const language = currentLanguage();
        const num = (v: number) => formatNumber(v, language, 5);
        const options: { value: string, text: string }[] = NURBS_EXAMPLE_IDS.map(id => ({value: id, text: t(id === 'circle' ? "bsn_example_circle" : "bsn_example_unit")}));
        if (example === 'custom') options.push({value: 'custom', text: t("bsn_example_custom")});
        return super.getGraphCommands().concat(
            <div key="example"><ChoiceSelect label={t("bsn_example")} value={example} options={options}
                                             onChange={value => this.selectExample(value as NurbsExampleId)}/></div>,
            <div key="error" className="inspector-group">
                <p data-nurbs-readout="radial-error">{t("bsn_radial_error", {value0: errorText(this.radialError())})}</p>
                <p className="inspector-help">{t("bsn_radial_error_help")}</p>
            </div>,
            <div key="circle"><OnOffSwitch checked={showCircle} label={t("bsn_circle")} onChange={show => this.setShowCircle(show)}/></div>,
            <div key="position">
                <Slider min={start} max={end} step={0.001} decimals={3} value={Math.min(end, Math.max(start, param))}
                        customText={t("bsb_slider_t")} help={t("bsn_slider_help")} onChange={value => this.setT(value)}/>
                {point ? <p data-nurbs-readout="point">{t("bsn_point", {value0: num(point[0]), value1: num(point[1]), value2: formatNumber(angleDegrees(point), language, 3)})}</p> : null}
            </div>,
            <div key="points"><BSplinePointList points={points} onEdit={(index, value) => this.editPoint(index, value)}/></div>,
            <div key="weights" className="inspector-group" role="group" aria-labelledby="bsn-weights-title">
                <h3 id="bsn-weights-title">{t("bsn_weights_title")}</h3>
                {weights.map((weight, index) =>
                    <NumberInput key={index} label={t("bsn_weight", {value0: index + 1})} value={weight} step={0.05} decimals={5}
                                 rejectedHint={refusal?.index === index ? weightRefusalText(refusal) : undefined}
                                 onChange={value => this.setWeight(index, value) === undefined}/>)}
                <p className="inspector-help">{t("bsn_weights_help")}</p>
            </div>,
            <div key="reset" className="inspector-playback">
                <button type="button" data-action="reset" onClick={() => this.resetToOrigin()}>{t("bsp_example_reset")}</button>
            </div>,
        );
    }
}

export default BSplineNurbsGraph;
