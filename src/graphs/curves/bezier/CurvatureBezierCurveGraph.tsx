import React from "react";
import {message, messageNumber, t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {curvatureCurvePresetCollection} from "../geometry/collections";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {CurvatureOverlay, curvatureFrame, tangentAngleDegrees} from "./CurvatureOverlay";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutNote, ReadoutRow, ViewMark, ViewMarks} from "../../base/declare/graphDeclaration";
import type {BaseCurveIds} from "../../base/BaseCurveGraph";
import type {GeometryElement} from "jsxgraph";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {PuckOwnedGroup} from "../../base/controls/PuckOwnership";

export interface CurvatureGraphStates extends BaseGraphStates {
    /** The Bezier parameter at which the frame and osculating circle are drawn. */
    curvatureT: number;
    /** The T and N frame is drawn; a lesson step hides it before the reveal. Saved with Presets like `curvatureT`. */
    curvatureFrameShown: boolean;
    /** The osculating circle (or its tangent line) is drawn; saved with Presets like the frame flag. */
    curvatureCircleShown: boolean;
}

export const CURVATURE_T_DEFAULT = 0.5;

/** y = x^2 for x in [-1, 1] as a quadratic Bezier: x = 2t - 1, y = (2t - 1)^2. */
export const PARABOLA_CONTROL_POINTS: number[][] = [[-1, 1], [0, -1], [1, 1]];

/**
 * Curvature Demonstration (ADR 0022): the Bezier graph plus one owned {@link CurvatureOverlay}. The overlay is
 * created after the curve exists, recreated after every scene import, and disposed with the scene and on unmount.
 */
export abstract class CurvatureOverlayGraph<S extends CurvatureGraphStates> extends BaseBezierCurveGraph<S> {
    protected overlay?: CurvatureOverlay;
    /** What the overlay last read. A lesson scene resets the state and sets it back within one batch, so comparing only with the previous state would miss a redraw. */
    private drawn?: { t: number, frame: boolean, circle: boolean };

    // Same structured editing as BezierCurveGraph; that class fixes its state type, so it cannot be subclassed here.
    protected override workspaceUsesStructuredEditing() { return true; }

    // The state type is fixed by each concrete class, so generic code cannot write a partial update to `S` without a cast.
    protected abstract writeCurvatureState(update: Partial<CurvatureGraphStates>): void;

    /** Text appended to the overlay's readout (a subclass adds its own quantity); undefined adds nothing. */
    protected overlayExtraReadout(): (() => string) | undefined { return undefined; }
    /** Whether the osculating circle is this graph's subject or only context (see `OverlaySettings.circleRole`). */
    protected overlayCircleRole(): 'subject' | 'context' { return 'subject'; }
    /** Whether the readout is board text; a graph that declares its values as readout rows draws none (the evolute keeps it). */
    protected overlayReadoutOnBoard(): boolean { return true; }
    /** The overlay's osculating circle, for a subclass that lists it in a legend. */
    protected osculatingCircleElement() { return this.overlay?.circleElement(); }

    /** Parameter writes (ADR 0064): the key `curvature-t` reads and writes t through the validated setter. */
    protected curvatureParameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'curvature-t': {
                read: () => this.state.curvatureT,
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new DomainError(message('curvature_t_refused'));
                    this.setCurvatureT(value);
                },
            },
        };
    }

    /** The t puck of a declaring subclass. */
    protected curvatureParameterDeclaration(): ParameterDeclaration<'curvature-t'> {
        return {key: 'curvature-t', kind: 'range', label: message('curvature_t_name'), symbol: 't', placement: 'board', min: 0, max: 1, step: 0.01, maxDecimals: 2};
    }

    /** The frame at the state's parameter, computed from the curve's points (not through the overlay, whose draw would count as drawn). */
    protected currentFrame() {
        const points = this.getFirstCurve()?.getPoints().map(point => [point.X(), point.Y()]);
        return points ? curvatureFrame(points, this.state.curvatureT) : undefined;
    }

    /** The three read-offs of a curvature graph: kappa, R (not on a line) and the direction angle of the tangent. */
    protected curvatureReadoutRows(): ReadoutRow<CurvatureIds>[] {
        const frame = this.currentFrame();
        if (!frame || frame.status === 'singular') return [];
        const rows: ReadoutRow<CurvatureIds>[] = [{id: 'kappa', name: message('curvature_row_kappa'), symbol: '\\kappa', value: messageNumber(frame.status === 'line' ? 0 : frame.kappa, 4)}];
        if (frame.status === 'circle') rows.push({id: 'radius', name: message('curvature_row_radius'), symbol: 'R', value: messageNumber(frame.radius, 4)});
        rows.push({id: 'angle', name: message('curvature_row_angle'), symbol: '\\varphi', value: messageNumber(tangentAngleDegrees(frame.tangent), 4), unit: message('curvature_unit_degrees')});
        return rows;
    }

    protected curvatureReadoutNotes(): ReadoutNote<CurvatureIds>[] {
        const frame = this.currentFrame();
        if (frame?.status === 'singular') return [{id: 'singular', text: message('curvature_status_singular'), tone: 'warning'}];
        if (frame?.status === 'line') return [{id: 'line', text: message('curvature_status_line'), tone: 'warning'}];
        return [];
    }

    /**
     * The box around what the learner watches: every point and polyline of the marks, grown by a fifth. Without it the view director
     * frames the lesson scene's box, widened to the canvas aspect, inside the narrow card-free strip, and the curve shrinks to a speck.
     */
    protected watchedBox(marks: ViewMarks): [number, number, number, number] | undefined {
        const points = [...marks.must, ...(marks.nice ?? [])].flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : mark.kind === 'polyline' ? mark.points.map(p => [p[0], p[1]]) : []);
        if (points.length === 0) return undefined;
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.5);
        return [left - pad, top + 2 * pad, right + pad, bottom - pad]; // the tags and labels stand above the points
    }

    private curvatureMarksCache: {key: string; base: ViewMarks; marks: ViewMarks} | undefined;

    /** The control points and curve samples of the base, the point at t (must) and, while the circle is drawn, the circle's four extreme points (nice) when its radius is at most the control points' extent. Memoized. */
    protected override curveViewMarks(): ViewMarks {
        const base = super.curveViewMarks();
        const frame = this.currentFrame();
        if (!frame || frame.status === 'singular') return base;
        const circle = frame.status === 'circle' && this.state.curvatureCircleShown ? frame : undefined;
        const key = [frame.point.join(','), circle ? `${circle.centre.join(',')}/${circle.radius}` : ''].join('|');
        const cached = this.curvatureMarksCache;
        if (cached && cached.key === key && cached.base === base) return cached.marks;
        const must: ViewMark[] = [...base.must, {kind: 'point', x: frame.point[0], y: frame.point[1]}];
        const nice: ViewMark[] = [...(base.nice ?? [])];
        // A circle much larger than the curve would shrink the curve to a speck: it may leave the view, the curve and the point stay.
        const xs = base.must.flatMap(mark => mark.kind === 'point' ? [mark.x] : []), ys = base.must.flatMap(mark => mark.kind === 'point' ? [mark.y] : []);
        const extent = xs.length ? Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) : 0;
        if (circle && circle.radius <= extent) {
            const [cx, cy] = circle.centre, r = circle.radius;
            for (const [x, y] of [[cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r]]) if (Number.isFinite(x) && Number.isFinite(y)) nice.push({kind: 'point', x, y});
        }
        const marks: ViewMarks = {...base, must, nice};
        this.curvatureMarksCache = {key, base, marks};
        return marks;
    }

    /** The osculating circle element stands for the circle entry; the base owns the curve and its control points. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'circle') return super.drawnObject(id);
        return this.drawnStyle(this.osculatingCircleElement());
    }

    /** The colour and visibility a legend swatch reproduces from a board element. */
    protected drawnStyle(element: GeometryElement | undefined): {color: string; visible: boolean} | undefined {
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('strokecolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    /** Extra Edit controls, placed between the parameter slider and the structured editing. */
    protected workspaceCurvatureExtras(): React.ReactNode { return null; }

    /** Creates the subclass's own overlays right after the curvature overlay (later elements draw above it). */
    protected createExtraOverlays(): void {}

    /** Removes the subclass's overlays; idempotent. Runs before the curvature overlay is removed. */
    protected removeExtraOverlays(): void {}

    /** Whether a state change other than the shared flags needs a board redraw. `prevState` is the state before the commit. */
    protected extraStateChanged(_prevState: Readonly<S>): boolean { return false; }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            points: PARABOLA_CONTROL_POINTS.map(point => [...point]),
            state: {
                showingJxgPoints: true,
                showingControlPolygon: false,
                showingConvexHull: false,
                showingDecasteljauScheme: false,
                subdivisionT: 0.5,
                decasteljauT: 0.5,
                extrapolationT: 1.2,
            },
        }]];
    }

    /** Owned by the graph so it survives overlay recreation on scene import. */
    private readonly liveReadout = new SettledReadout();

    override presetCollection() {
        return curvatureCurvePresetCollection;
    }

    override initialize() {
        super.initialize();
        this.ensureOverlay();
    }

    /** Scene imports dispose the overlay with the scene, so it is recreated here. */
    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        this.ensureOverlay();
    }

    /** Idempotent: removes any earlier overlay and creates one reading the current first curve lazily. */
    protected ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new CurvatureOverlay({
            board: this.board,
            controlPoints: () => this.getFirstCurve()?.getPoints().map(point => [point.X(), point.Y()]),
            parameter: () => {
                this.drawn = {t: this.state.curvatureT, frame: this.state.curvatureFrameShown, circle: this.state.curvatureCircleShown};
                return this.state.curvatureT;
            },
            showFrame: () => this.state.curvatureFrameShown,
            showCircle: () => this.state.curvatureCircleShown,
            fontSize: () => this.displaySettings.fontSize,
            extraReadout: this.overlayExtraReadout(),
            circleRole: this.overlayCircleRole(),
            readoutOnBoard: this.overlayReadoutOnBoard(),
            onReadout: text => this.liveReadout.report(text),
        });
        this.createExtraOverlays();
    }

    /** A replaced scene is complete only here: the first board text predates the extra overlays and the restored state. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        if (this.overlay) this.liveReadout.replace(this.overlay.readoutText());
    }

    private removeOverlay() {
        this.removeExtraOverlays();
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

    protected override onStateChange(prevState: Readonly<S>) {
        super.onStateChange(prevState);
        const drawn = this.drawn;
        const stale = drawn !== undefined && (drawn.t !== this.state.curvatureT
            || drawn.frame !== this.state.curvatureFrameShown || drawn.circle !== this.state.curvatureCircleShown);
        if (prevState !== this.state && (stale || prevState.curvatureT !== this.state.curvatureT
            || prevState.curvatureFrameShown !== this.state.curvatureFrameShown
            || prevState.curvatureCircleShown !== this.state.curvatureCircleShown
            || this.extraStateChanged(prevState))) this.boardUpdate();
    }

    /**
     * Structured editing does not render `getGraphCommands`, so the parameter slider is its own Edit group, first
     * because the Demonstration is about moving t.
     */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.parameterSlider()}{this.state.initialized && this.workspaceCurvatureExtras()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('parameter', 't', action => {
            if (!Number.isFinite(action.value) || action.value < 0 || action.value > 1) throw new Error('The curvature parameter must be between 0 and 1.');
            this.setCurvatureT(action.value);
        });
        registry.onDiscriminated('curve-visibility', 'curvature-frame', action => this.writeCurvatureState({curvatureFrameShown: action.visible}));
        registry.onDiscriminated('curve-visibility', 'curvature-circle', action => this.writeCurvatureState({curvatureCircleShown: action.visible}));
    }

    setCurvatureT(value: number) {
        this.writeCurvatureState({curvatureT: value});
    }

    private parameterSlider() {
        return <PuckOwnedGroup params={['curvature-t']} className="inspector-group"><Slider min={0} max={1} step={0.01} value={this.state.curvatureT}
                            customText={t("curvature_parameter_t")}
                            onChange={value => this.setCurvatureT(value)}/></PuckOwnedGroup>;
    }
}

/**
 * The ids the curvature graph declares: the parameter t (a range puck), the three read-offs as rows, the two states of a straight or
 * singular point as notes, and the legend of the curve, its control points and the osculating circle. The T and N tags on the
 * board name the two drawn arrows and stay.
 */
export type CurvatureIds = {
    param: 'curvature-t'; row: 'kappa' | 'radius' | 'angle'; note: 'line' | 'singular'; section: never;
    legend: BaseCurveIds['legend'] | 'circle';
    action: BaseCurveIds['action'];
};

/** Curvature Demonstration (lesson L2). */
class CurvatureBezierCurveGraph extends CurvatureOverlayGraph<CurvatureGraphStates> {
    override getInitialState(): CurvatureGraphStates {
        return {
            ...super.getInitialState(),
            curvatureT: CURVATURE_T_DEFAULT,
            curvatureFrameShown: true,
            curvatureCircleShown: true,
        };
    }

    protected override writeCurvatureState(update: Partial<CurvatureGraphStates>): void {
        this.setState(update);
    }

    protected override declaresCurveWorkspace() { return true; }

    /** The readout is the declared rows and notes of the Odčitki card, so no board text repeats it. */
    protected override overlayReadoutOnBoard(): boolean { return false; }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return this.curvatureParameterBindings();
    }

    /**
     * The common curve declaration plus the t puck, the three read-offs as rows and the osculating circle in the legend while it is
     * switched on. The old board text of the readout is the rows (owner, 2026-11-27); the T and N tags stay.
     */
    protected override declaration(): GraphDeclaration<CurvatureIds> {
        const common = this.commonCurveDeclaration();
        const legend: LegendEntry<CurvatureIds>[] = [
            ...(common.legend ?? []),
            ...(this.state.curvatureCircleShown ? [{id: 'circle' as const, label: message('curvature_legend_circle'), kind: 'line' as const, object: 'circle'}] : []),
        ];
        const marks = this.curveViewMarks();
        return {
            ...common, parameters: [this.curvatureParameterDeclaration()], legend,
            readouts: [{id: 'curvature', rows: this.curvatureReadoutRows()}],
            notes: this.curvatureReadoutNotes(),
            marks,
            followView: this.watchedBox(marks),
        };
    }
}

export default CurvatureBezierCurveGraph;
