import React from "react";
import {currentLanguage, renderMessage, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {ResetExampleButton} from "../../../inputs/ResetExampleButton";
import {NumberInput} from "../../../inputs/NumberInput";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {RefusalChannel, RefusalNotice} from "../../../inputs/RefusalChannel";
import type {LessonAction, LessonCurveFixture} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {InvalidKnotVectorError} from "../../../bezeg/impl/curve/bspline-curve";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {knotRejectionMessage} from "./bsplineKnotMessages";
import {BSplineInsertionScene} from "./BSplineInsertionScene";
import {BSplinePointList} from "./BSplinePointList";
import {KnotEditor} from "./KnotEditor";
import {KNOT_LIMIT, lastIndexOf} from "./bsplineBasisModel";
import {assertDrawableCurve, ControlPoint, deBoorPresetData, knotsForCount} from "./bsplineDeBoorModel";
import {
    INSERTION_DEFAULT_VALUE, INSERTION_EXAMPLE_IDS, INSERTION_MAX_POINTS, InsertionData, InsertionExampleId, InsertionRefusal,
    insertionExample, insertionRefusalMessage, joinReports, jumpReadoutLines, multiplicityRows, planInsertion,
} from "./bsplineInsertionModel";

export interface BSplineInsertionState extends BaseGraphState {
    degree: number;
    /** Raw knots (ADR 0024). */
    knots: readonly number[];
    points: readonly ControlPoint[];
    /** The curve Reset returns to: the chosen example or the imported Preset. */
    origin: InsertionData;
    example: InsertionExampleId | 'custom';
    /** The control polygon before the latest insertion; empty when none (until the next insertion or Reset). */
    ghost: readonly ControlPoint[];
    showComb: boolean;
    /** The raw value in the insertion field. */
    insertValue: number;
    /** The latest refused insertion; shown as text in the current language. */
    refusal: InsertionRefusal | null;
}

const sameNumbers = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((value, index) => value === b[index]);

const copyData = (data: InsertionData): InsertionData =>
    ({degree: data.degree, knots: [...data.knots], points: data.points.map(point => [point[0], point[1]] as const)});

const initialData = (): Omit<BSplineInsertionState, 'initialized'> => {
    const origin = insertionExample('quadratic');
    return {...copyData(origin), origin, example: 'quadratic', ghost: [], showComb: true, insertValue: INSERTION_DEFAULT_VALUE, refusal: null};
};

/**
 * Knot insertion graph (lesson L3): the B-spline curve with draggable control points, a knot field on the domain with an Insert
 * button (Boehm, the kernel's `insertKnot`), the previous control polygon as a faded ghost after an insertion, a multiplicity
 * readout per distinct interior knot and a curvature comb drawn per knot span with the kappa jump reported at each interior knot.
 * The scene state is the only copy of the data; the owned {@link BSplineInsertionScene} reads it lazily. Its Preset collection is
 * `bsplinePresetCollection`; optional NURBS `weights` are ignored on import and omitted on export. Route `bspline-insertion`; lesson
 * L3 drives it through `knot-insertion` scene actions.
 */
export class BSplineInsertionGraph extends BaseGraph<BSplineInsertionState, BSplinePresetData> {
    private scene?: BSplineInsertionScene;
    /** The reason the last refused insertion gave; cleared once the state holds no refusal (any accepted edit, Reset or Preset). */
    private readonly refusals = new RefusalChannel(() => this.requestRender());

    override getInitialState(): BSplineInsertionState {
        return {initialized: false, ...initialData()};
    }

    override presetCollection() {
        return bsplinePresetCollection;
    }

    /** The chosen example, so the host Reset (which reloads the default scene) returns to it; an imported curve falls back to the quadratic. */
    defaultPreset(): BSplinePresetData {
        const example = this.state?.example;
        return deBoorPresetData(insertionExample(example && example !== 'custom' ? example : 'quadratic'));
    }

    override exportPresetData(): BSplinePresetData {
        return deBoorPresetData(this.state);
    }

    /** A lesson curve fixture: its points and degree (the default degree if absent) on the given `knots` as they are, else on the clamped uniform knot vector for that count. */
    protected override lessonFixtureData(curve: LessonCurveFixture): BSplinePresetData | undefined {
        const degree = curve.degree ?? this.defaultPreset().degree;
        return {degree, knots: curve.knots ? [...curve.knots] : knotsForCount(degree, true, curve.points.length), points: curve.points.map(point => [point[0], point[1]] as const)};
    }

    /** Runs right after `importPresetData` for a lesson fixture or default scene: the imported curve and its Reset target survive, the rest is fresh. */
    protected override lessonDefaultState(): BSplineInsertionState {
        const {degree, knots, points, origin, example} = this.state;
        return {initialized: true, ...initialData(), ...copyData({degree, knots, points}), origin, example};
    }

    /** The imported curve becomes the state and the Reset target; the ghost is cleared. */
    override importPresetData(data: BSplinePresetData) {
        assertDrawableCurve(data, INSERTION_MAX_POINTS);
        const origin = copyData(data);
        // Data equal to a shipped example is that example again (the host Reset and the lesson default import it).
        const same = INSERTION_EXAMPLE_IDS.find(id => JSON.stringify(deBoorPresetData(insertionExample(id))) === JSON.stringify(deBoorPresetData(origin)));
        this.setState({...copyData(origin), origin, example: same ?? 'custom', ghost: [], refusal: null});
        this.ensureScene();
    }

    /** The just-imported data wins over the mount-time defaults and over a stale stored state. */
    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): BSplineInsertionState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points, origin, example} = this.state;
        return {...merged, ...copyData({degree, knots, points}), origin, example, ghost: [], refusal: null};
    }

    protected override initialView(): [number, number, number, number] {
        return [-1.5, 3.5, 6.5, -1.5];
    }

    override initialize() {
        this.ensureScene();
    }

    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new BSplineInsertionScene({
            board: this.board,
            degree: () => this.state.degree,
            knots: () => this.state.knots,
            points: () => this.state.points,
            ghost: () => this.state.ghost,
            showComb: () => this.state.showComb,
            onPointsDrag: points => this.setState({points}),
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.scene?.sync();
    }

    protected override disposeFigureScene(): void {
        this.removeScene();
    }

    override unmount() {
        this.removeScene();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<BSplineInsertionState>) {
        if (prevState === this.state) return;
        if (!this.state.refusal) this.refusals.clear();
        if (!this.board) return;
        const {state} = this;
        if (this.scene && !this.scene.fits(state.degree, state.points.length, state.ghost.length)) this.ensureScene();
        else this.scene?.sync();
        this.boardUpdate();
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /** A typed control point (the same path as a board drag); the ghost stays. */
    editPoint(index: number, value: ControlPoint) {
        const {points} = this.state;
        if (!Number.isInteger(index) || index < 0 || index >= points.length) return;
        this.setState({points: points.map((point, i) => i === index ? value : point)});
    }

    /** Sets the value in the insertion field; a finite value only. */
    setInsertValue(value: number) {
        if (!Number.isFinite(value)) return;
        this.setState({insertValue: value, refusal: null});
    }

    /**
     * Inserts the knot `x` (default: the field value) with the kernel's Boehm step. The previous polygon becomes the ghost. A refused
     * insertion (outside the domain, multiplicity above k + 1, not finite, too many points) changes nothing but the shown reason;
     * returns whether the knot was inserted.
     */
    insert(x: number = this.state.insertValue): boolean {
        const {knots, degree, points} = this.state;
        const plan = planInsertion(knots, degree, points, x);
        if (!plan.ok) {
            const refusal = {reason: plan.reason, value: x};
            this.refusals.refuse(insertionRefusalMessage(refusal, knots, degree, points.length), true);
            this.setState({refusal});
            return false;
        }
        this.setState({knots: plan.knots, points: plan.points, ghost: points, refusal: null});
        return true;
    }

    /** Back to the example's (or imported Preset's) original knots and points; the ghost is cleared. */
    resetToOrigin() {
        this.setState({...copyData(this.state.origin), ghost: [], refusal: null});
    }

    /** Whether the scene already equals what Reset restores: the origin's curve and nothing left over from edits. */
    private atOrigin(): boolean {
        const {origin, degree, knots, points} = this.state;
        return degree === origin.degree && sameNumbers(knots, origin.knots) && points.length === origin.points.length
            && points.every((point, index) => point[0] === origin.points[index][0] && point[1] === origin.points[index][1]) && this.state.ghost.length === 0 && this.state.refusal === null;
    }

    /** Loads an example as the new Reset target. */
    selectExample(id: InsertionExampleId) {
        if (!INSERTION_EXAMPLE_IDS.includes(id)) return;
        const origin = insertionExample(id);
        this.setState({...copyData(origin), origin, example: id, ghost: [], refusal: null});
    }

    setShowComb(show: boolean) {
        this.setState({showComb: show});
    }

    /**
     * A typed knot value, applied through the model curve's `setKnots`. Returns the localized reason when refused (the state keeps
     * the previous vector), or undefined when accepted.
     */
    editKnot(index: number, value: number): string | undefined {
        const {knots, degree} = this.state;
        if (!this.scene || !Number.isInteger(index) || index < 0 || index >= knots.length) return undefined;
        const candidate = knots.map((knot, i) => i === index ? value : knot);
        const n = lastIndexOf(knots, degree);
        try {
            if (!Number.isFinite(value) || Math.abs(value) > KNOT_LIMIT) throw new InvalidKnotVectorError("not_finite");
            this.scene.curve.getCurve().setKnots(candidate);
        } catch (error) {
            if (error instanceof InvalidKnotVectorError) return renderMessage(knotRejectionMessage(error.reason, candidate, degree, n));
            throw error;
        }
        this.setState({knots: candidate, refusal: null});
        return undefined;
    }

    /** The kappa jump lines, one per interior knot, in the current language (none when the curve cannot be evaluated). */
    jumpLines(): string[] {
        const {knots, degree, points} = this.state;
        try {
            return jumpReadoutLines(joinReports(knots, degree, points), currentLanguage());
        } catch {
            return [];
        }
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('knot-insertion', action => this.applyKnotInsertionAction(action));
    }

    /** Applies one `knot-insertion` scene action; an invalid value or a refused insertion throws (the lesson content is wrong). */
    private applyKnotInsertionAction(action: Extract<LessonAction, {kind: 'knot-insertion'}>): void {
        if (action.operation === 'insert') {
            if (!Number.isFinite(action.value)) throw new Error('The knot to insert must be a finite number.');
            if (!this.insert(action.value)) throw new Error(`The insertion of the knot ${action.value} was refused: ${this.state.refusal?.reason}.`);
        } else if (action.operation === 'set-example') {
            if (!INSERTION_EXAMPLE_IDS.includes(action.exampleId)) throw new Error(`Unknown insertion example “${String(action.exampleId)}”.`);
            this.selectExample(action.exampleId);
        } else if (action.operation === 'set-comb') {
            this.setShowComb(action.visible);
        } else {
            this.resetToOrigin();
        }
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {degree, knots, points, example, ghost, showComb, insertValue} = this.state;
        const rows = multiplicityRows(knots, degree);
        const jumps = this.jumpLines();
        const options: { value: string, text: string }[] = INSERTION_EXAMPLE_IDS.map(id => ({value: id, text: t(id === 'quadratic' ? "bsi_example_quadratic" : "bsi_example_cubic")}));
        if (example === 'custom') options.push({value: 'custom', text: t("bsi_example_custom")});
        return super.getGraphCommands().concat(
            <div key="example"><ChoiceSelect label={t("bsi_example")} value={example} options={options}
                                             onChange={value => this.selectExample(value as InsertionExampleId)}/>
                <ResetExampleButton action="reset" atExample={this.atOrigin()} onReset={() => this.resetToOrigin()}/></div>,
            <div key="insert" className="inspector-group">
                <NumberInput label={t("bsi_insert_value")} value={insertValue} step={0.01} decimals={4} min={-KNOT_LIMIT} max={KNOT_LIMIT}
                             onChange={value => { this.setInsertValue(value); }}/>
                <div className="inspector-playback">
                    <button type="button" data-action="insert-knot" onClick={() => { this.insert(); }}>{t("bsi_insert")}</button>
                </div>
                <p className="inspector-help">{t("bsi_insert_help")}</p>
                <RefusalNotice channel={this.refusals}/>
                {ghost.length ? <p className="inspector-help" data-insertion-status="ghost">{t("bsi_ghost_note")}</p> : null}
            </div>,
            <div key="points"><BSplinePointList points={points} onEdit={(index, value) => this.editPoint(index, value)}/></div>,
            <div key="multiplicity" className="inspector-group" role="group" aria-labelledby="bsi-multiplicity-title">
                <h3 id="bsi-multiplicity-title">{t("bsi_multiplicity_title")}</h3>
                {rows.length
                    ? <ul data-insertion-readout="multiplicity">{rows.map(row =>
                        <li key={row.knot}>{t("bsi_multiplicity_row", {
                            value0: formatNumber(row.knot, currentLanguage(), 4), value1: row.multiplicity,
                            value2: row.continuity >= 0 ? `C${row.continuity}` : t("bsi_multiplicity_break"),
                        })}</li>)}</ul>
                    : <p className="inspector-help">{t("bsi_no_interior")}</p>}
            </div>,
            <div key="comb" className="inspector-group"><OnOffSwitch checked={showComb} label={t("bsi_comb")} onChange={show => this.setShowComb(show)}/>
                <p className="inspector-help">{t("bsi_comb_help")}</p>
                {showComb && jumps.length ? <div role="group" aria-labelledby="bsi-jumps-title">
                    <h3 id="bsi-jumps-title">{t("bsi_join_title")}</h3>
                    <ul data-insertion-readout="jumps">{jumps.map(line => <li key={line}>{line}</li>)}</ul>
                </div> : null}</div>,
            <div key="knots"><KnotEditor knots={knots} onEdit={(index, value) => this.editKnot(index, value)}/></div>,
        );
    }
}

export default BSplineInsertionGraph;
