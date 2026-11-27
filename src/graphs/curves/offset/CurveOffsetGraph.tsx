import React from "react";
import {message, messageNumber, t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import BaseCurveGraph, {BaseCurveIds, BaseGraphStates} from "../../base/BaseCurveGraph";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutNote, ReadoutRow, ViewMark, ViewMarks} from "../../base/declare/graphDeclaration";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {runAs} from "../../base/writes/writeSource";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {DomainError} from "../../functions/BaseFunctionGraph";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {fitBoundingBox} from "../../base/fitBoundingBox";
import {curveOffsetPresetCollection} from "../geometry/collections";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {JXGPHBezierCurve, OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from "../object/JXGPHBezierCurve";
import {OFFSET_SAMPLES_DEFAULT, OFFSET_SAMPLES_MAX, OFFSET_SAMPLES_MIN} from "./curveOffset";
import {OFFSET_CUSP_MARKERS, OffsetCurveKind, OffsetOverlay} from "./OffsetOverlay";
import {SpeedFactorPlot, SpeedFactorPlotController} from "./SpeedFactorPlot";

export type {OffsetCurveKind};
export const OFFSET_CURVE_KINDS: readonly OffsetCurveKind[] = ['bezier', 'ph'];
export {OFFSET_SAMPLES_DEFAULT, OFFSET_SAMPLES_MAX, OFFSET_SAMPLES_MIN, OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN};

/** The default distance: negative, so the first cusp of the parabola appears at d = -0.5 (the radius of curvature at its vertex). */
export const OFFSET_DISTANCE_DEFAULT = -0.25;

/** The parabola y = x^2 as a quadratic Bezier curve. */
export const OFFSET_PARABOLA_POINTS: number[][] = [[-1, 1], [0, -1], [1, 1]];

/** The view of each kind: the parabola with its control point, and the cubic PH curve of the PH route with room for its offsets. */
const KIND_VIEW: Readonly<Record<OffsetCurveKind, [number, number, number, number]>> = {
    bezier: [-2.6, 2.2, 2.6, -1.6],
    ph: [-6, 5, 6, -5],
};

function bezierDefaultPreset(): CurveCollectionPresetData {
    return [["JSXBezierCurve", {
        points: OFFSET_PARABOLA_POINTS.map(point => [...point]),
        state: {
            showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false,
            subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2,
        },
    }]];
}

/** The cubic PH preset of the PH route; the exact offset is shown at the distance of the graph state. */
function phDefaultPreset(): CurveCollectionPresetData {
    return [["JSXPHBezierCurve", {
        points: [[-4.2, -2]], hodographs: [[-3.5, -1.7], [-2.6, 1.7]],
        state: {
            showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false,
            subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2,
            showOffsetCurveControlPoints: false, showOffsetCurve: true, offsetCurveNumber: 1,
        },
    }]];
}

/** The default scene of each curve kind. */
export function offsetPresetFor(kind: OffsetCurveKind): CurveCollectionPresetData {
    return kind === 'ph' ? phDefaultPreset() : bezierDefaultPreset();
}

export function isOffsetCurveKind(value: unknown): value is OffsetCurveKind {
    return typeof value === 'string' && (OFFSET_CURVE_KINDS as readonly string[]).includes(value);
}

export interface CurveOffsetStates extends BaseGraphStates {
    /** The signed distance of the offset along the right normal. */
    offsetD: number;
    offsetSamples: number;
    /** The sampled offset is drawn (for a PH curve, also its exact rational offset). */
    offsetShown: boolean;
    offsetCuspsShown: boolean;
    /** The inspector plot of 1 + d*kappa. */
    offsetSpeedPlotShown: boolean;
}

/**
 * The ids this graph declares: the distance d (a puck parameter, bound in the arbiter), the switch of the sampled offset (a switch
 * puck), the distance and the cusp count as rows, the approximation and exactness sentences as notes, and the legend of the curve,
 * its control points, the dashed offset and the cusp markers. The cusp switch, the sample count, the curve kind and the speed
 * factor plot stay in Orodja.
 */
export type OffsetIds = {
    param: 'offset-d'; row: 'distance' | 'cusps'; note: 'approx' | 'exact'; section: never;
    legend: BaseCurveIds['legend'] | 'offset' | 'cusps';
    action: BaseCurveIds['action'] | 'offset-shown';
};

/** A trace sample counts for the view while it lies within this many extents of the curve's own samples. */
const OFFSET_WATCH_EXTENTS = 1.6;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function curveLabel(kind: OffsetCurveKind): string {
    return kind === 'ph' ? t("offset_curve_ph") : t("offset_curve_bezier");
}

/**
 * Offset curve Demonstration (lesson L5): the sampled right-normal offset of a Bezier curve or a cubic PH curve, with its
 * cusps and the speed factor 1 + d*kappa. The kind is read from the live curve, never stored. For a PH curve the graph state
 * `offsetD` is the single source of truth: the adapter's exact offset (one curve, at distance d) is set from it after every
 * import and change, so the sampled trace and the exact rational offset are the same curve at the same d.
 * Known limit: the hodograph auxiliary board of the PH route is not here, so the PH curve is fixed here: its board points do not drag, on this route or the PH routes.
 */
class CurveOffsetGraph extends BaseCurveGraph<CurveOffsetStates> {
    private overlay?: OffsetOverlay;
    /** What the overlay last read: a lesson scene resets the state and sets it back within one batch, so comparing only with the previous state would miss a redraw. */
    private drawn?: { d: number, samples: number, trace: boolean, cusps: boolean };
    /** What was last written to the PH adapter, so a drag does not rewrite it; reset by every import. */
    private phApplied?: { d: number, shown: boolean };
    /** Owned by the graph so they survive overlay recreation on scene import. */
    private readonly liveReadout = new SettledReadout();
    private readonly plot = new SpeedFactorPlotController();

    /** The kind of the live curve; the Bezier curve before a curve exists. */
    curveKind(): OffsetCurveKind {
        return this.phCurve() ? 'ph' : 'bezier';
    }

    private phCurve(): JXGPHBezierCurve | undefined {
        const live: unknown = this.getFirstJxgCurve();
        return live instanceof JXGPHBezierCurve ? live : undefined;
    }

    /** Structured editing renders the Bezier tools (add or delete a point), which the fixed-degree PH curve does not have. */
    protected override workspaceUsesStructuredEditing() { return this.curveKind() === 'bezier'; }

    protected override declaresCurveWorkspace() { return true; }

    override getInitialState(): CurveOffsetStates {
        return {
            ...super.getInitialState(),
            offsetD: OFFSET_DISTANCE_DEFAULT,
            offsetSamples: OFFSET_SAMPLES_DEFAULT,
            offsetShown: true,
            offsetCuspsShown: false,
            offsetSpeedPlotShown: false,
        };
    }

    defaultPreset(): CurveCollectionPresetData {
        return bezierDefaultPreset();
    }

    override presetCollection() {
        return curveOffsetPresetCollection;
    }

    protected override initialView(): [number, number, number, number] {
        return [...KIND_VIEW.bezier];
    }

    override initialize() {
        super.initialize();
        this.ensureOverlay();
    }

    /** Scene imports dispose the overlay with the scene, so it is recreated here. */
    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        this.phApplied = undefined;
        this.syncPhOffset();
        this.ensureOverlay();
    }

    /** The values the board draws: a restored Preset may hold anything, so they are bounded here. */
    private effectiveD() { return clampNumber(this.state.offsetD, OFFSET_DISTANCE_MIN, OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_DEFAULT); }
    private effectiveSamples() { return Math.round(clampNumber(this.state.offsetSamples, OFFSET_SAMPLES_MIN, OFFSET_SAMPLES_MAX, OFFSET_SAMPLES_DEFAULT)); }
    private effectiveShown() { return this.state.offsetShown !== false; }

    /** The polynomial control rows of the live curve (for a PH curve, its underlying Bezier points), read at the time of the call. */
    controlRows(): number[][] | undefined {
        const curve = this.getFirstCurve();
        return curve ? curve.getPoints().map(point => [point.X(), point.Y()]) : undefined;
    }

    /** Makes the PH adapter's exact offset exactly one curve at the distance of the graph state, shown with the sampled one. */
    private syncPhOffset() {
        const ph = this.phCurve();
        if (!ph || !this.board) return;
        const d = this.effectiveD(), shown = this.effectiveShown();
        const applied = this.phApplied;
        if (applied && applied.d === d && applied.shown === shown && ph.getNumberOfOffsetCurves() === 1) return;
        while (ph.getNumberOfOffsetCurves() > 1) ph.removeOffsetCurve();
        while (ph.getNumberOfOffsetCurves() < 1) ph.addOffsetCurve();
        ph.setOffsetCurveDistance(d);
        ph.setShowOffsetCurve(shown);
        this.phApplied = {d, shown};
    }

    /** A restored scene must not leave the edited scene's readout in the live region until the quiet period ends. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncPhOffset();
        this.boardUpdate();
        if (this.overlay) this.liveReadout.replace(this.overlay.readoutText());
    }

    /** The live overlay, for the lesson and tests. */
    offset(): OffsetOverlay | undefined {
        return this.overlay;
    }

    /** The plot controller, for tests. */
    speedPlot(): SpeedFactorPlotController {
        return this.plot;
    }

    /** Idempotent: removes any earlier overlay and creates one reading the current first curve lazily. */
    private ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new OffsetOverlay({
            board: this.board,
            rows: () => this.controlRows(),
            kind: () => this.curveKind(),
            distance: () => this.effectiveD(),
            samples: () => this.effectiveSamples(),
            traceShown: () => {
                this.drawn = {
                    d: this.effectiveD(), samples: this.effectiveSamples(), trace: this.effectiveShown(), cusps: this.state.offsetCuspsShown,
                };
                return this.effectiveShown();
            },
            cuspsShown: () => this.state.offsetCuspsShown,
            plot: this.plot,
            onReadout: text => this.liveReadout.report(text),
        });
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

    protected override onStateChange(prevState: Readonly<CurveOffsetStates>) {
        super.onStateChange(prevState);
        const drawn = this.drawn;
        const stale = drawn !== undefined && (drawn.d !== this.effectiveD() || drawn.samples !== this.effectiveSamples()
            || drawn.trace !== this.effectiveShown() || drawn.cusps !== this.state.offsetCuspsShown);
        if (prevState === this.state) return;
        const changed = stale || prevState.offsetD !== this.state.offsetD || prevState.offsetSamples !== this.state.offsetSamples
            || prevState.offsetShown !== this.state.offsetShown || prevState.offsetCuspsShown !== this.state.offsetCuspsShown;
        if (!changed) return;
        this.syncPhOffset();
        this.boardUpdate();
    }

    // ---- Operations ------------------------------------------------------------------------------------------------

    setOffsetShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The offset curve must be switched on or off.');
        this.setState({offsetShown: visible});
    }

    setOffsetCuspsShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The cusp markers must be switched on or off.');
        this.setState({offsetCuspsShown: visible});
    }

    setOffsetSpeedPlotShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The speed factor graph must be switched on or off.');
        this.setState({offsetSpeedPlotShown: visible});
    }

    setOffsetDistance(value: number) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < OFFSET_DISTANCE_MIN || value > OFFSET_DISTANCE_MAX) {
            throw new Error(`The offset distance must be a number from ${OFFSET_DISTANCE_MIN} to ${OFFSET_DISTANCE_MAX}.`);
        }
        this.setState({offsetD: value});
    }

    setOffsetSamples(value: number) {
        if (!Number.isInteger(value) || value < OFFSET_SAMPLES_MIN || value > OFFSET_SAMPLES_MAX) {
            throw new Error(`The number of offset samples must be an integer from ${OFFSET_SAMPLES_MIN} to ${OFFSET_SAMPLES_MAX}.`);
        }
        this.setState({offsetSamples: value});
    }

    private showKindView(kind: OffsetCurveKind) {
        if (!this.board) return;
        const [left, top, right, bottom] = KIND_VIEW[kind];
        const box = fitBoundingBox([[left, top], [right, bottom]], this.board.canvasWidth, this.board.canvasHeight);
        this.boardView.setIntent(box ?? [left, top, right, bottom], {keepAspectRatio: this.equalAxisUnits});
    }

    /** Replaces the scene with the default of `kind` and its view, keeping the offset state. The old overlay is disposed and a new one created by the import. */
    setCurveKind(kind: OffsetCurveKind) {
        if (!isOffsetCurveKind(kind)) throw new Error('The offset curve must be bezier or ph.');
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        const keep = {
            offsetD: this.state.offsetD, offsetSamples: this.state.offsetSamples, offsetShown: this.state.offsetShown,
            offsetCuspsShown: this.state.offsetCuspsShown, offsetSpeedPlotShown: this.state.offsetSpeedPlotShown,
        };
        this.runLessonReplacement({
            importData: () => this.importPresetData(offsetPresetFor(kind)),
            afterImport: () => this.showKindView(kind),
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState(), ...keep}),
            transientState: undefined,
        });
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'offset-trace', action => this.setOffsetShown(action.visible));
        registry.onDiscriminated('curve-visibility', 'offset-cusps', action => this.setOffsetCuspsShown(action.visible));
        registry.onDiscriminated('curve-visibility', 'offset-speed-plot', action => this.setOffsetSpeedPlotShown(action.visible));
        registry.on('offset-curve', action => this.setCurveKind(action.curve));
        registry.on('offset-distance', action => this.setOffsetDistance(action.value));
        registry.on('offset-samples', action => this.setOffsetSamples(action.value));
    }

    // ---- Declaration -----------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the key reads and writes d through the validated setter. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'offset-d': {
                read: () => this.effectiveD(),
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < OFFSET_DISTANCE_MIN || value > OFFSET_DISTANCE_MAX) {
                        throw new DomainError(message('offset_d_refused', {value0: String(OFFSET_DISTANCE_MIN), value1: String(OFFSET_DISTANCE_MAX)}));
                    }
                    this.setOffsetDistance(value);
                },
            },
        };
    }

    private readoutRows(): ReadoutRow<OffsetIds>[] {
        if (!this.overlay || !this.getFirstCurve()) return [];
        return [
            {id: 'distance', name: message('offset_d_name'), symbol: 'd', value: messageNumber(this.effectiveD(), 4)},
            {id: 'cusps', name: message('offset_cusps_name'), value: messageNumber(this.overlay.cuspCount(), 0)},
        ];
    }

    /** The sentences the board caption carried while the offset is drawn: it is sampled, and for a PH curve the solid line is exact. */
    private readoutNotes(): ReadoutNote<OffsetIds>[] {
        if (!this.getFirstCurve() || !this.effectiveShown()) return [];
        const notes: ReadoutNote<OffsetIds>[] = [{id: 'approx', text: message('offset_readout_approx')}];
        if (this.curveKind() === 'ph') notes.push({id: 'exact', text: message('offset_readout_exact_ph')});
        return notes;
    }

    private offsetMarksCache: {key: string; base: ViewMarks; marks: ViewMarks} | undefined;

    /**
     * The curve's marks plus what the learner watches of the offset: its cusps and the samples of the dashed trace, as polylines broken
     * where a sample is far from the curve or not a number. Memoized on d, the samples and the switches.
     */
    protected override curveViewMarks(): ViewMarks {
        const base = super.curveViewMarks();
        const overlay = this.overlay;
        if (!overlay || !this.effectiveShown()) return base;
        const key = [this.effectiveD(), this.effectiveSamples(), this.state.offsetCuspsShown].join('|');
        const cached = this.offsetMarksCache;
        if (cached && cached.key === key && cached.base === base) return cached.marks;
        const own = base.nice?.find(mark => mark.kind === 'polyline');
        const reference = own?.kind === 'polyline' ? own.points.map(p => [p[0], p[1]]) : (this.controlRows() ?? []);
        if (reference.length === 0) return base;
        const xs = reference.map(p => p[0]), ys = reference.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const reach = OFFSET_WATCH_EXTENTS * Math.max(right - left, top - bottom, 1e-9);
        const near = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && x >= left - reach && x <= right + reach && y >= bottom - reach && y <= top + reach;
        const {trace, cusps} = overlay.geometry();
        const must: ViewMark[] = [...base.must];
        let piece: [number, number][] = [];
        const flush = () => { if (piece.length >= 2) must.push({kind: 'polyline', points: piece}); piece = []; };
        trace.x.forEach((x, i) => { if (near(x, trace.y[i])) piece.push([x, trace.y[i]]); else flush(); });
        flush();
        if (this.state.offsetCuspsShown) for (const cusp of cusps.slice(0, OFFSET_CUSP_MARKERS)) if (near(cusp.point[0], cusp.point[1])) must.push({kind: 'point', x: cusp.point[0], y: cusp.point[1]});
        const marks: ViewMarks = {...base, must};
        this.offsetMarksCache = {key, base, marks};
        return marks;
    }

    /**
     * The common curve declaration plus the d puck, the switch puck of the sampled offset, the distance and the cusp count as rows, the
     * approximation and exactness sentences as notes, and the dashed offset and the cusps in the legend while they are drawn (a declared
     * entry must be drawn). The old board caption lines are the rows and notes (owner, 2026-11-27).
     */
    protected override declaration(): GraphDeclaration<OffsetIds> {
        const common = this.commonCurveDeclaration();
        const parameters: ParameterDeclaration<OffsetIds['param']>[] = [
            {key: 'offset-d', kind: 'range', label: message('offset_d_name'), symbol: 'd', placement: 'board', min: OFFSET_DISTANCE_MIN, max: OFFSET_DISTANCE_MAX, step: 0.01, maxDecimals: 2},
        ];
        const cuspsDrawn = this.state.offsetCuspsShown && (this.overlay?.cuspCount() ?? 0) > 0;
        const legend: LegendEntry<OffsetIds>[] = [
            ...(common.legend ?? []),
            ...(this.effectiveShown() ? [{id: 'offset' as const, label: message('offset_shown'), kind: 'dashed' as const, object: 'offset'}] : []),
            ...(this.effectiveShown() && cuspsDrawn ? [{id: 'cusps' as const, label: message('offset_cusps_shown'), kind: 'point' as const, object: 'cusps'}] : []),
        ];
        const marks = this.curveViewMarks();
        return {
            ...common, parameters, legend,
            actions: [...(common.actions ?? []), {id: 'offset-shown', label: message('offset_shown_puck'), enabled: true, pressed: this.effectiveShown(), placement: 'board', puck: true}],
            readouts: [{id: 'offset', rows: this.readoutRows()}],
            notes: this.readoutNotes(),
            marks, followView: this.watchedBox(marks),
        };
    }

    /**
     * The box around what the learner watches: the control points, the offset's samples and its cusps, grown by a fifth, with room above
     * for the point labels. Without it the view director frames the lesson scene's box, widened to the canvas aspect, inside the narrow
     * card-free strip, and the curve shrinks.
     */
    private watchedBox(marks: ViewMarks): [number, number, number, number] | undefined {
        const points = marks.must.flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : mark.kind === 'polyline' ? mark.points.map(p => [p[0], p[1]]) : []);
        if (points.length === 0) return undefined;
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.3);
        return [left - pad, top + 2 * pad, right + pad, bottom - pad];
    }

    /** The dashed trace stands for the offset and the first cusp marker for the pool of markers; the base owns the curve and its control points. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'offset' && id !== 'cusps') return super.drawnObject(id);
        const element = id === 'offset' ? this.overlay?.traceElement() : this.overlay?.cuspElement();
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('strokecolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    override performAction(id: string): void {
        if (id === 'offset-shown') runAs('learner', () => this.setOffsetShown(!this.effectiveShown()));
        else super.performAction(id);
    }

    // ---- Controls --------------------------------------------------------------------------------------------------

    /** Structured editing does not render `getGraphCommands`, so the offset has its own Edit group, first. */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.offsetControls()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    private offsetControls() {
        const kind = this.curveKind();
        return <div className="inspector-group">
            <PuckOwned param="offset-d"><Slider min={OFFSET_DISTANCE_MIN} max={OFFSET_DISTANCE_MAX} step={0.01} value={this.effectiveD()} customText={t("offset_distance")}
                    onChange={value => this.setOffsetDistance(value)}/></PuckOwned>
            <PuckOwned param="offset-shown"><OnOffSwitch label={t("offset_shown")} checked={this.effectiveShown()} onChange={checked => this.setOffsetShown(checked)}/></PuckOwned>
            <ChoiceSelect label={t("parametric_curve_label")} value={kind}
                          options={OFFSET_CURVE_KINDS.map(value => ({value, text: curveLabel(value)}))}
                          onChange={value => { if (isOffsetCurveKind(value) && value !== kind) this.setCurveKind(value); }}/>
            <p className="inspector-help">{t("offset_help")}</p>
            <p className="inspector-help">{t("offset_local_note")}</p>
            <OnOffSwitch label={t("offset_cusps_shown")} checked={this.state.offsetCuspsShown} onChange={checked => this.setOffsetCuspsShown(checked)}/>
            <Slider min={OFFSET_SAMPLES_MIN} max={OFFSET_SAMPLES_MAX} step={1} value={this.effectiveSamples()} customText={t("offset_samples")}
                    onChange={value => this.setOffsetSamples(Math.round(value))}/>
            <OnOffSwitch label={t("offset_speed_plot_shown")} checked={this.state.offsetSpeedPlotShown}
                         onChange={checked => this.setOffsetSpeedPlotShown(checked)}/>
            {this.state.offsetSpeedPlotShown && <SpeedFactorPlot controller={this.plot} fontSize={this.displaySettings.fontSize}/>}
        </div>;
    }
}

export default CurveOffsetGraph;
