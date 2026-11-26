import type {StoredGraphState} from "../../base/presets/Presets";
import React from "react";
import {currentLanguage, LocalizedError, message, renderMessage, t} from "../../../localization";
import {formatNumber, formatScientific} from "../../../analysis/format";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {ResetExampleButton} from "../../../inputs/ResetExampleButton";
import {NumberInput} from "../../../inputs/NumberInput";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import {domain} from "../../../bezeg/impl/curve/bspline";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutNote, ViewMark, ViewMarks} from "../../base/declare/graphDeclaration";
import {DomainError} from "../../functions/BaseFunctionGraph";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {runAs} from "../../base/writes/writeSource";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {LessonAction, LessonCurveFixture} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {BSplinePresetData, bsplinePresetCollection, weightsRejection} from "./bsplinePresetCollection";
import {constructOrSweep, type SceneDeclaration} from "../../base/OwnedScene";
import {BSplineNurbsScene} from "./BSplineNurbsScene";
import {BSplinePointList} from "./BSplinePointList";
import {assertDrawableCurve, drawableRejection, ControlPoint, knotsForCount} from "./bsplineDeBoorModel";
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

/**
 * The ids this graph declares: the two sentences of the old panel (the radial error and the point C(t) with its angle), the
 * legend, the unit-circle switch (a puck) and the parameter t (a board range puck, bound by `parameterBindings`). The weights are a
 * vector of typed values and the points are dragged on the board.
 */
export type BSplineNurbsIds = {
    param: 'nurbs-t';
    row: never;
    note: 'error' | 'point';
    legend: 'curve' | 'control' | 'marker' | 'circle';
    section: never;
    action: 'circle';
};

const VIEW_MARK_SAMPLES = 24;

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
export class BSplineNurbsGraph extends BaseGraph<BSplineNurbsState, BSplinePresetData, BSplineNurbsScene> {
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

    /** A persisted Preset without data starts from the circle whatever example is chosen; only Reset follows the chosen example. */
    protected override persistedDefaultData(): BSplinePresetData {
        return presetOf(nurbsExample('circle'));
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

    /** Refuses persisted data this graph cannot show, before anything changes; same limits as importPresetData. */
    protected override consumerRefusal(data: BSplinePresetData) {
        return drawableRejection(data, NURBS_MAX_POINTS) ?? (data.weights ? weightsRejection(data.weights, data.points.length) : undefined);
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
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined): BSplineNurbsState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points, weights, origin, example} = this.state;
        // The parameter is the Preset's (or the initial one) held in the new domain, not the preceding scene's.
        const [start, end] = domain(knots, degree, points.length - 1);
        return {...merged, ...copyNurbs({degree, knots, points, weights}), origin, example, t: Math.min(end, Math.max(start, merged.t)), refusal: null};
    }

    protected override initialView(): [number, number, number, number] {
        return [-2, 2, 2, -2];
    }

    /** The host builds the declared scene right after this; nothing else is initialized. */
    override initialize() {
    }

    /** `sync` takes points and weights only: another degree, knots or point count rebuilds the scene (also on import and checkpoint restore). */
    protected override sceneDeclaration(): SceneDeclaration<BSplineNurbsScene> {
        return {
            create: board => constructOrSweep(board, () => new BSplineNurbsScene({
                board,
                degree: () => this.state.degree,
                knots: () => this.state.knots,
                points: () => this.state.points,
                weights: () => this.state.weights,
                showCircle: () => this.state.showCircle,
                marker: () => this.markerPoint(),
                onPointsDrag: points => this.setState({points}),
            })),
            sync: scene => {
                const {degree, knots, points} = this.state;
                if (!scene.fits(degree, knots, points.length)) return false;
                scene.sync();
                return true;
            },
            dispose: scene => scene.dispose(),
        };
    }

    /** Test seam: the characterization tests read the live scene through it. */
    private get scene(): BSplineNurbsScene | undefined {
        return this.ownedScene;
    }

    protected override onStateChange(prevState: Readonly<BSplineNurbsState>) {
        if (prevState === this.state || !this.board) return;
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

    /** Whether the scene already equals what Reset restores: the origin's curve and weights, the starting parameter and no refusal. */
    private atOrigin(): boolean {
        const {origin, degree, knots, points, weights} = this.state;
        const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((value, index) => value === b[index]);
        return degree === origin.degree && same(knots, origin.knots) && same(weights, origin.weights) && points.length === origin.points.length
            && points.every((point, index) => point[0] === origin.points[index][0] && point[1] === origin.points[index][1])
            && this.state.t === NURBS_DEFAULT_T && this.state.refusal === null;
    }

    /** Loads an example as the new Reset target. */
    selectExample(id: NurbsExampleId) {
        if (!NURBS_EXAMPLE_IDS.includes(id)) return;
        const origin = nurbsExample(id);
        this.setState({...copyNurbs(origin), origin, example: id, refusal: null});
    }

    // ---- Declaration -------------------------------------------------------------------------------------------------

    /** The two sentences of the old panel: the maximum radial error and the point C(t) with its angle (none while it cannot be evaluated). */
    private readoutNotes(): ReadoutNote<BSplineNurbsIds>[] {
        const language = currentLanguage();
        const notes: ReadoutNote<BSplineNurbsIds>[] = [{id: 'error', text: message('bsn_radial_error', {value0: errorText(this.radialError())})}];
        const point = this.markerPoint();
        if (point) {
            notes.push({id: 'point', text: message('bsn_point', {
                value0: formatNumber(point[0], language, 5), value1: formatNumber(point[1], language, 5),
                value2: formatNumber(angleDegrees(point), language, 3),
            })});
        }
        return notes;
    }

    /** Parameter writes (ADR 0064). Key `nurbs-t`: the slider parameter, through the setter the slider calls (held inside the domain). */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'nurbs-t': {
                read: () => this.state.t,
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value)) throw new DomainError(message('bsn_t_not_finite'));
                    this.setT(value);
                },
            },
        };
    }

    /**
     * Pure data from the state: the unit circle as a switch puck (flipped to compare the curve with it), the radial error and the
     * point as notes, the help line and the legend. The slider t, the weights (a vector of typed values), the example, Reset and the
     * point list stay in Orodja; the control points are dragged on the board.
     */
    protected override declaration(): GraphDeclaration<BSplineNurbsIds> {
        const {showCircle, knots, degree, points} = this.state;
        const [start, end] = domain(knots, degree, points.length - 1);
        const parameters: ParameterDeclaration<BSplineNurbsIds['param']>[] = [{
            key: 'nurbs-t', kind: 'range', label: message('bsn_param_name'), symbol: 't', placement: 'board', min: start, max: end, step: 0.001, maxDecimals: 3,
        }];
        const actions: ActionDeclaration<BSplineNurbsIds>[] = [
            {id: 'circle', label: message('bsn_circle'), placement: 'board', puck: true, enabled: true, pressed: showCircle},
        ];
        const legend: LegendEntry<BSplineNurbsIds>[] = [
            {id: 'curve', label: message('curve'), kind: 'line', object: 'curve'},
            {id: 'control', label: message('control_points'), kind: 'point', object: 'control'},
            ...(this.markerPoint() ? [{id: 'marker' as const, label: message('bsn_legend_marker'), kind: 'point' as const, object: 'marker'}] : []),
            ...(showCircle ? [{id: 'circle' as const, label: message('bsn_circle'), kind: 'dashed' as const, object: 'circle'}] : []),
        ];
        return {parameters, notes: this.readoutNotes(), readoutHelp: message('bsn_radial_error_help'), legend, actions, marks: this.viewMarks()};
    }

    private viewMarksCache: {key: string; marks: ViewMarks} | undefined;

    /** What the view director keeps visible: the control points and C(t) (must), samples of the curve over its domain (nice); memoized on the state's data. */
    private viewMarks(): ViewMarks {
        const {degree, knots, points, weights, t} = this.state;
        const key = `${degree}|${knots.join(',')}|${points.map(p => p.join(',')).join(';')}|${weights.join(',')}|${t}`;
        if (this.viewMarksCache?.key === key) return this.viewMarksCache.marks;
        const finite = (p: readonly number[]) => Number.isFinite(p[0]) && Number.isFinite(p[1]);
        const marker = this.markerPoint();
        const must: ViewMark[] = [...points, ...(marker ? [marker] : [])].filter(finite).map(([x, y]): ViewMark => ({kind: 'point', x, y}));
        const [start, end] = domain(knots, degree, points.length - 1);
        const samples: (readonly [number, number])[] = [];
        for (let i = 0; i < VIEW_MARK_SAMPLES; i++) {
            try {
                const p = nurbsPointAt(this.state, start + (end - start) * i / (VIEW_MARK_SAMPLES - 1));
                if (finite(p)) samples.push([p[0], p[1]]);
            } catch {
                // a sample the kernel refuses is left out
            }
        }
        const marks: ViewMarks = {must, nice: samples.length > 1 ? [{kind: 'polyline', points: samples}] : []};
        this.viewMarksCache = {key, marks};
        return marks;
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const scene = this.scene;
        if (!scene) return undefined;
        const read = (element: JXG.GeometryElement | undefined, colorProperty: 'strokecolor' | 'fillcolor') => {
            if (!element) return undefined;
            // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
            const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
            return {color: String(drawn.evalVisProp(colorProperty)), visible: Boolean(drawn.evalVisProp('visible'))};
        };
        switch (id) {
            case 'curve': return read(scene.curve.getJxgCurve(), 'strokecolor');
            case 'control': return read(scene.curve.getJxgPoints()[0], 'fillcolor');
            case 'marker': return read(scene.markerElement(), 'fillcolor');
            case 'circle': return read(scene.circleElement(), 'strokecolor');
            default: return undefined;
        }
    }

    override performAction(id: string): void {
        if (id === 'circle') runAs('learner', () => this.setShowCircle(!this.state.showCircle));
        else throw new Error('Unknown action');
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
        const notes = this.readoutNotes();
        const options: { value: string, text: string }[] = NURBS_EXAMPLE_IDS.map(id => ({value: id, text: t(id === 'circle' ? "bsn_example_circle" : "bsn_example_unit")}));
        if (example === 'custom') options.push({value: 'custom', text: t("bsn_example_custom")});
        return super.getGraphCommands().concat(
            <div key="example"><ChoiceSelect label={t("bsn_example")} value={example} options={options}
                                             onChange={value => this.selectExample(value as NurbsExampleId)}/>
                <ResetExampleButton action="reset" atExample={this.atOrigin()} onReset={() => this.resetToOrigin()}/></div>,
            // The old panel's sentences, rendered from the declared notes: the board cards show them, so the panel is hidden when declared
            // (`data-declared-panel`) and stays the parity recorder's and the tests' reading of the same text.
            <div key="error" className="inspector-group" data-declared-panel="">
                {notes.filter(note => note.id === 'error').map(note => <p key={note.id} data-readout-note data-nurbs-readout="radial-error">{renderMessage(note.text)}</p>)}
                <p className="inspector-help">{t("bsn_radial_error_help")}</p>
            </div>,
            <PuckOwned key="circle" param="circle"><div><OnOffSwitch checked={showCircle} label={t("bsn_circle")} onChange={show => this.setShowCircle(show)}/></div></PuckOwned>,
            <PuckOwned key="position" param="nurbs-t"><div>
                <Slider min={start} max={end} step={0.001} decimals={3} value={Math.min(end, Math.max(start, param))}
                        customText={t("bsb_slider_t")} help={t("bsn_slider_help")} onChange={value => this.setT(value)}/>
            </div></PuckOwned>,
            <div key="point" data-declared-panel="">
                {notes.filter(note => note.id === 'point').map(note => <p key={note.id} data-readout-note data-nurbs-readout="point">{renderMessage(note.text)}</p>)}
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
        );
    }
}

export default BSplineNurbsGraph;
