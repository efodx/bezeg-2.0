import type {StoredGraphState} from "../../base/presets/Presets";
import React from "react";
import {currentLanguage, renderMessage, t} from "../../../localization";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {ResetExampleButton} from "../../../inputs/ResetExampleButton";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {LessonAction, LessonCurveFixture} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {InvalidKnotVectorError} from "../../../bezeg/impl/curve/bspline-curve";
import type {BezierPiece} from "../../../bezeg/impl/curve/bspline";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {knotRejectionMessage} from "./bsplineKnotMessages";
import {BSplineExtractionScene} from "./BSplineExtractionScene";
import {BSplinePointList} from "./BSplinePointList";
import {KnotEditor} from "./KnotEditor";
import {KNOT_LIMIT, lastIndexOf} from "./bsplineBasisModel";
import {assertDrawableCurve, drawableRejection, ControlPoint, deBoorPresetData, knotsForCount} from "./bsplineDeBoorModel";
import {INSERTION_EXAMPLE_IDS, INSERTION_MAX_POINTS, InsertionData, InsertionExampleId, insertionExample} from "./bsplineInsertionModel";
import {affectedPieces, movedIndices, pieceColor, pieceReadoutLines, piecesOf} from "./bsplineExtractionModel";

export interface BSplineExtractionState extends BaseGraphState {
    degree: number;
    /** Raw knots (ADR 0024). */
    knots: readonly number[];
    points: readonly ControlPoint[];
    /** The curve Reset returns to: the chosen example or the imported Preset. */
    origin: InsertionData;
    example: InsertionExampleId | 'custom';
    /** Indices of the control points the last drag moved; empty when none (until the next drag, edit or Reset). */
    moved: readonly number[];
}

const sameNumbers = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((value, index) => value === b[index]);

const copyData = (data: InsertionData): InsertionData =>
    ({degree: data.degree, knots: [...data.knots], points: data.points.map(point => [point[0], point[1]] as const)});

const initialData = (): Omit<BSplineExtractionState, 'initialized'> => {
    const origin = insertionExample('quadratic');
    return {...copyData(origin), origin, example: 'quadratic', moved: []};
};

/**
 * Bezier extraction graph (lesson L4): the same B-spline curve with draggable control points, drawn as its Bezier pieces (the kernel's
 * `bezierPieces`), each piece in its own colour with its Bezier control polygon. The inspector lists every piece's interval and
 * control points and the piece count (distinct interior knots + 1). After a drag the pieces whose interval lies in the support of the
 * moved point are emphasized and marked in the readout. The scene state is the only copy of the data; the owned
 * {@link BSplineExtractionScene} reads it lazily. Its Preset collection is `bsplinePresetCollection`; optional NURBS `weights` are
 * ignored on import and omitted on export. Registered at `/bezeg-2.0/bspline/extraction` (`bspline-extraction`); lesson L4 drives it through `bezier-extraction` scene actions; {@link pieceControlPoints} is the seam for "open as Bezier".
 */
export class BSplineExtractionGraph extends BaseGraph<BSplineExtractionState, BSplinePresetData> {
    private scene?: BSplineExtractionScene;

    override getInitialState(): BSplineExtractionState {
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

    /** A persisted Preset without data starts from the quadratic whatever example is chosen; only Reset follows the chosen example. */
    protected override persistedDefaultData(): BSplinePresetData {
        return deBoorPresetData(insertionExample('quadratic'));
    }

    override exportPresetData(): BSplinePresetData {
        return deBoorPresetData(this.state);
    }

    /** A lesson curve fixture: its points and degree (the default degree if absent) on the given `knots` as they are, else on the clamped uniform knot vector for that count. */
    protected override lessonFixtureData(curve: LessonCurveFixture): BSplinePresetData | undefined {
        const degree = curve.degree ?? this.defaultPreset().degree;
        return {degree, knots: curve.knots ? [...curve.knots] : knotsForCount(degree, true, curve.points.length), points: curve.points.map(point => [point[0], point[1]] as const)};
    }

    /** Refuses persisted data this graph cannot show, before anything changes; same limits as importPresetData. */
    protected override consumerRefusal(data: BSplinePresetData) {
        return drawableRejection(data, INSERTION_MAX_POINTS);
    }

    /** The imported curve becomes the state and the Reset target. */
    override importPresetData(data: BSplinePresetData) {
        assertDrawableCurve(data, INSERTION_MAX_POINTS);
        const origin = copyData(data);
        const same = INSERTION_EXAMPLE_IDS.find(id => JSON.stringify(deBoorPresetData(insertionExample(id))) === JSON.stringify(deBoorPresetData(origin)));
        this.setState({...copyData(origin), origin, example: same ?? 'custom', moved: []});
        this.ensureScene();
    }

    /** The just-imported data wins over the mount-time defaults and over a stale stored state. */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined): BSplineExtractionState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points, origin, example} = this.state;
        return {...merged, ...copyData({degree, knots, points}), origin, example, moved: []};
    }

    protected override initialView(): [number, number, number, number] {
        return [-1.5, 3.5, 6.5, -1.5];
    }

    /** Runs right after `importPresetData` for a lesson fixture or default scene: the imported curve and its Reset target survive, the rest is fresh. */
    protected override lessonDefaultState(): BSplineExtractionState {
        const {degree, knots, points, origin, example} = this.state;
        return {initialized: true, ...initialData(), ...copyData({degree, knots, points}), origin, example};
    }

    override initialize() {
        this.ensureScene();
    }

    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new BSplineExtractionScene({
            board: this.board,
            degree: () => this.state.degree,
            knots: () => this.state.knots,
            points: () => this.state.points,
            highlighted: () => this.affected(),
            pieceCount: () => this.pieces().length,
            onPointsDrag: points => this.setState({points, moved: this.dragMoved(points)}),
        });
    }

    /** The control points a drag event moved relative to the state; the previous set stays when nothing moved. */
    private dragMoved(points: readonly ControlPoint[]): readonly number[] {
        const moved = movedIndices(this.state.points, points);
        return moved.length ? moved : this.state.moved;
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

    protected override onStateChange(prevState: Readonly<BSplineExtractionState>) {
        if (prevState === this.state || !this.board) return;
        const {state} = this;
        if (this.scene && !this.scene.fits(state.degree, state.points.length, this.pieces().length)) this.ensureScene();
        else this.scene?.sync();
        this.boardUpdate();
    }

    // ---- Queries -----------------------------------------------------------------------------------------------------

    /** The Bezier pieces of the state's curve (none when it cannot be evaluated). */
    pieces(): BezierPiece[] {
        const {knots, degree, points} = this.state;
        return piecesOf(knots, degree, points);
    }

    /** The k + 1 Bezier control points of piece `index` (0-based): the seam for opening one piece in the ordinary Bezier graph. */
    pieceControlPoints(index: number): ControlPoint[] | undefined {
        const piece = this.pieces()[index];
        return piece?.points.map(p => [p[0], p[1]] as const);
    }

    /** Hands piece `index` to the host, which opens it in the Bezier Demonstration (ADR 0038). No-op without a host or piece. */
    openAsBezier(index: number): void {
        const points = this.pieceControlPoints(index);
        if (points) this.hostBridge.openAsBezier?.(points);
    }

    /** Indices of the pieces whose interval lies in the support of a point moved by the last drag. */
    affected(): number[] {
        const {knots, degree, moved} = this.state;
        return affectedPieces(knots, degree, this.pieces(), moved);
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /** Back to the example's (or imported Preset's) original knots and points. */
    resetToOrigin() {
        this.setState({...copyData(this.state.origin), moved: []});
    }

    /** Whether the scene already equals what Reset restores: the origin's curve and nothing left over from edits. */
    private atOrigin(): boolean {
        const {origin, degree, knots, points} = this.state;
        return degree === origin.degree && sameNumbers(knots, origin.knots) && points.length === origin.points.length
            && points.every((point, index) => point[0] === origin.points[index][0] && point[1] === origin.points[index][1]) && this.state.moved.length === 0;
    }

    /** Loads an example as the new Reset target. */
    selectExample(id: InsertionExampleId) {
        if (!INSERTION_EXAMPLE_IDS.includes(id)) return;
        const origin = insertionExample(id);
        this.setState({...copyData(origin), origin, example: id, moved: []});
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
        this.setState({knots: candidate, moved: []});
        return undefined;
    }

    /** A typed control point: the same path as a board drag (the moved point is emphasized). */
    editPoint(index: number, value: ControlPoint) {
        if (!Number.isInteger(index) || index < 0 || index >= this.state.points.length) return;
        const points = this.state.points.map((point, i) => i === index ? value : point);
        this.setState({points, moved: this.dragMoved(points)});
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('bezier-extraction', action => this.applyExtractionAction(action));
    }

    /** Applies one `bezier-extraction` scene action; an invalid index, value or example throws (the lesson content is wrong). */
    private applyExtractionAction(action: Extract<LessonAction, {kind: 'bezier-extraction'}>): void {
        if (action.operation === 'move-point') {
            const {index, to} = action;
            if (!Number.isInteger(index) || index < 0 || index >= this.state.points.length) throw new Error(`There is no control point ${String(index)}.`);
            if (!Array.isArray(to) || to.length !== 2 || !to.every(Number.isFinite)) throw new Error('The new position of the control point must be two finite numbers.');
            const points = this.state.points.map((point, i) => i === index ? [to[0], to[1]] as const : point);
            this.setState({points, moved: this.dragMoved(points)});
        } else if (action.operation === 'set-example') {
            if (!INSERTION_EXAMPLE_IDS.includes(action.exampleId)) throw new Error(`Unknown extraction example “${String(action.exampleId)}”.`);
            this.selectExample(action.exampleId);
        } else {
            this.resetToOrigin();
        }
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {knots, example, moved} = this.state;
        const pieces = this.pieces();
        const affected = this.affected();
        const lines = pieceReadoutLines(pieces, affected, currentLanguage());
        const options: { value: string, text: string }[] = INSERTION_EXAMPLE_IDS.map(id => ({value: id, text: t(id === 'quadratic' ? "bse_example_quadratic" : "bse_example_cubic")}));
        if (example === 'custom') options.push({value: 'custom', text: t("bse_example_custom")});
        return super.getGraphCommands().concat(
            <div key="example"><ChoiceSelect label={t("bse_example")} value={example} options={options}
                                             onChange={value => this.selectExample(value as InsertionExampleId)}/>
                <ResetExampleButton action="reset" atExample={this.atOrigin()} onReset={() => this.resetToOrigin()}/></div>,
            <div key="reset" className="inspector-group">
                <p className="inspector-help">{t("bse_help")}</p>
            </div>,
            <div key="points"><BSplinePointList points={this.state.points} onEdit={(index, value) => this.editPoint(index, value)}/></div>,
            <div key="pieces" className="inspector-group" role="group" aria-labelledby="bse-pieces-title">
                <h3 id="bse-pieces-title">{t("bse_pieces_title")}</h3>
                <p data-extraction-readout="count">{t("bse_count", {value0: pieces.length})}</p>
                {moved.length ? <p className="inspector-help" data-extraction-readout="affected">{t("bse_affected_note", {value0: affected.length})}</p> : null}
                {pieces.length
                    ? <ul data-extraction-readout="pieces">{lines.map((line, index) =>
                        <li key={index} data-affected={affected.includes(index) ? 'true' : 'false'}
                            style={{borderLeft: `4px solid ${pieceColor(index)}`, paddingLeft: '0.4em'}}>{line}
                            {this.hostBridge.openAsBezier
                                ? <> <button type="button" className="btn" data-action="open-as-bezier" data-piece={index}
                                             aria-label={t("bse_open_as_bezier_piece", {value0: index + 1})}
                                             onClick={() => this.openAsBezier(index)}>{t("bse_open_as_bezier")}</button></>
                                : null}</li>)}</ul>
                    : <p className="inspector-help">{t("bse_no_pieces")}</p>}
            </div>,
            <div key="knots"><KnotEditor knots={knots} onEdit={(index, value) => this.editKnot(index, value)}/></div>,
        );
    }
}

export default BSplineExtractionGraph;
