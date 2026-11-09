import React from "react";
import {t} from "../../../localization";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {reductionPresetCollection, CurveCollectionPresetData} from "../curvePresetCollections";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {ReadoutDetails, ReadoutDetailsController} from "../ReadoutDetails";
import type {ReductionMode} from "../../../bezeg/impl/kernels/degree-reduction";
import {ReductionOverlay} from "./ReductionOverlay";

export const REDUCTION_MODES: readonly ReductionMode[] = ['fixed', 'free'];

/** The elevated quadratic (0,0), (2,4), (4,0): the default cubic, which reduces back exactly (spec D1, round trip). */
export const REDUCTION_ELEVATED_POINTS: number[][] = [[0, 0], [4 / 3, 8 / 3], [8 / 3, 8 / 3], [4, 0]];
/** The spec's default example P: not reducible; third difference (-2, 0). */
export const REDUCTION_P_POINTS: number[][] = [[0, 0], [1, 3], [3, 3], [4, 0]];
/** The spec's second example P2. */
export const REDUCTION_P2_POINTS: number[][] = [[0, 0], [1, 4], [3, 1], [4, 3]];

/** Room for the three cubics, the free-endpoint quadratics (x from -0.1 to 4.1) and the readout caption on top. */
const REDUCTION_VIEW: [number, number, number, number] = [-1.2, 6.6, 5.2, -1.2];

export interface DegreeReductionStates extends BaseGraphStates {
    /** `fixed`: end points kept; `free`: all three quadratic control points optimised (L2 in both). */
    reductionMode: ReductionMode;
    /** The reduced quadratic and its three control points. */
    reductionShown: boolean;
    /** The four-point elevated net of the quadratic: dashed polygon with small points. */
    reductionElevationShown: boolean;
}

export function isReductionMode(value: unknown): value is ReductionMode {
    return typeof value === 'string' && (REDUCTION_MODES as readonly string[]).includes(value);
}

function cubicPreset(points: number[][]): CurveCollectionPresetData {
    return [["JSXBezierCurve", {
        points: points.map(point => [...point]),
        state: {
            showingJxgPoints: true, showingControlPolygon: true, showingConvexHull: false, showingDecasteljauScheme: false,
            subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2,
        },
    }]];
}

/**
 * Degree reduction Demonstration (advanced Bezier lesson D1): a cubic that stays a cubic, with the L2-best quadratic overlaid
 * (end points fixed, or all control points free), the elevated net of that quadratic and readouts from the reduction kernel.
 * The reduced objects are not draggable. Reduction is an approximation: the quadratic is the optimum of one norm and one
 * constraint set, never an exact reduction unless the third difference vanishes within the stated tolerance.
 */
class DegreeReductionGraph extends BaseBezierCurveGraph<DegreeReductionStates> {
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    private overlay?: ReductionOverlay;
    /** What the overlay last read: a lesson scene resets the state and sets it back within one batch, so comparing only with the previous state would miss a redraw. */
    private drawn?: { mode: ReductionMode, shown: boolean, elevation: boolean };
    /** Owned by the graph so it survives overlay recreation on scene import. */
    private readonly liveReadout = new SettledReadout();
    private readonly details = new ReadoutDetailsController();

    override getInitialState(): DegreeReductionStates {
        return {...super.getInitialState(), reductionMode: 'fixed', reductionShown: true, reductionElevationShown: false};
    }

    defaultPreset(): CurveCollectionPresetData {
        return cubicPreset(REDUCTION_ELEVATED_POINTS);
    }

    override presetCollection() {
        return reductionPresetCollection;
    }

    protected override initialView(): [number, number, number, number] {
        return [...REDUCTION_VIEW];
    }

    /** The cubic stays a cubic: no add or delete point tools. */
    protected override workspaceUsesStructuredEditing() { return false; }

    override initialize() {
        super.initialize();
        this.disableCurveOperations();
        this.ensureOverlay();
    }

    /** Scene imports dispose the overlay with the scene, so it is recreated here. */
    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        this.disableCurveOperations();
        this.ensureOverlay();
    }

    private disableCurveOperations() {
        this.getFirstJxgCurve()?.setAttributes(Attributes.bezierDisabled);
    }

    /** The mode, bounded: a restored Preset may hold anything. */
    private effectiveMode(): ReductionMode { return isReductionMode(this.state.reductionMode) ? this.state.reductionMode : 'fixed'; }
    private effectiveShown() { return this.state.reductionShown !== false; }
    private effectiveElevationShown() { return this.state.reductionElevationShown === true; }

    /** The control rows of the live curve, read at the time of the call. */
    controlRows(): number[][] | undefined {
        const curve = this.getFirstCurve();
        return curve ? curve.getPoints().map(point => [point.X(), point.Y()]) : undefined;
    }

    /** The live overlay, for the lesson and tests. */
    reduction(): ReductionOverlay | undefined {
        return this.overlay;
    }

    /** A restored scene must not leave the edited scene's readout in the live region until the quiet period ends. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.disableCurveOperations();
        this.boardUpdate();
        if (this.overlay) this.liveReadout.replace(this.overlay.readoutText());
    }

    /** Idempotent: removes any earlier overlay and creates one reading the current first curve lazily. */
    private ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new ReductionOverlay({
            board: this.board,
            rows: () => this.controlRows(),
            mode: () => {
                this.markDrawn();
                return this.effectiveMode();
            },
            reducedShown: () => this.effectiveShown(),
            elevationShown: () => this.effectiveElevationShown(),
            fontSize: () => this.displaySettings.fontSize,
            onReadout: text => this.liveReadout.report(text),
            details: this.details,
        });
    }

    private markDrawn() {
        this.drawn = {mode: this.effectiveMode(), shown: this.effectiveShown(), elevation: this.effectiveElevationShown()};
    }

    private removeOverlay() {
        this.overlay?.dispose();
        this.overlay = undefined;
    }

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        this.removeOverlay();
    }

    override unmount() {
        this.removeOverlay();
        this.liveReadout.cancel();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<DegreeReductionStates>) {
        super.onStateChange(prevState);
        const drawn = this.drawn;
        const stale = drawn !== undefined && (drawn.mode !== this.effectiveMode() || drawn.shown !== this.effectiveShown()
            || drawn.elevation !== this.effectiveElevationShown());
        if (prevState === this.state) return;
        const changed = stale || prevState.reductionMode !== this.state.reductionMode || prevState.reductionShown !== this.state.reductionShown
            || prevState.reductionElevationShown !== this.state.reductionElevationShown;
        if (changed) this.boardUpdate();
    }

    // ---- Operations ------------------------------------------------------------------------------------------------

    setReductionMode(mode: ReductionMode) {
        if (!isReductionMode(mode)) throw new Error('The reduction mode must be fixed or free.');
        this.setState({reductionMode: mode});
    }

    setReductionShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The reduced curve must be switched on or off.');
        this.setState({reductionShown: visible});
    }

    setReductionElevationShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The elevated net must be switched on or off.');
        this.setState({reductionElevationShown: visible});
    }

    /** Moves the four control points of the cubic at once (one board update). */
    setControlPoints(points: ReadonlyArray<readonly [number, number]>) {
        const modelPoints = this.getFirstCurve()?.getPoints();
        if (!modelPoints || modelPoints.length !== 4) throw new Error('The graph is still preparing. Try again in a moment.');
        if (!Array.isArray(points) || points.length !== 4 || !points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) {
            throw new Error('The cubic needs exactly four control points, each two finite numbers.');
        }
        // The model points drive the board points (ModelPointBinding), so the curve and the overlay read the new net.
        points.forEach((p, i) => { modelPoints[i].setX(p[0]); modelPoints[i].setY(p[1]); });
        this.boardUpdate();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'reduction-quadratic', action => this.setReductionShown(action.visible));
        registry.onDiscriminated('curve-visibility', 'reduction-elevation', action => this.setReductionElevationShown(action.visible));
        registry.on('reduction-mode', action => this.setReductionMode(action.mode));
        registry.on('reduction-points', action => this.setControlPoints(action.points));
    }

    // ---- Controls --------------------------------------------------------------------------------------------------

    /** The reduction controls come first in the Edit group, as on the offset route. */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.reductionControls()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    private reductionControls() {
        return <div className="inspector-group">
            <ChoiceSelect label={t("reduction_mode")} value={this.effectiveMode()}
                          options={[{value: 'fixed', text: t("reduction_mode_fixed")}, {value: 'free', text: t("reduction_mode_free")}]}
                          onChange={value => { if (isReductionMode(value)) this.setReductionMode(value); }}/>
            <p className="inspector-help">{this.effectiveMode() === 'fixed' ? t("reduction_help_fixed") : t("reduction_help_free")}</p>
            <OnOffSwitch label={t("reduction_shown")} checked={this.effectiveShown()} onChange={checked => this.setReductionShown(checked)}/>
            <OnOffSwitch label={t("reduction_elevation_shown")} checked={this.effectiveElevationShown()}
                         onChange={checked => this.setReductionElevationShown(checked)}/>
            <ReadoutDetails controller={this.details} label={t("reduction_details_aria")} testId="reduction-details"/>
            <p className="inspector-help">{t("reduction_help_approximation")}</p>
            <p className="inspector-help">{t("reduction_help_tolerance")}</p>
        </div>;
    }
}

export default DegreeReductionGraph;
