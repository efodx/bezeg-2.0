import React from "react";
import {message, messageNumber, t} from "../../../localization";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {EVOLUTE_TRACE_MODES, EvoluteTraceMode} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {evolutePoint, type Vec2} from "../../../bezeg/impl/curve/curvature";
import {evoluteCurvePresetCollection} from "../geometry/collections";
import {
    CurvatureGraphStates,
    CurvatureIds,
    CurvatureOverlayGraph,
} from "./CurvatureBezierCurveGraph";
import {EvoluteOverlay, evoluteTrace} from "./EvoluteOverlay";
import type {GraphDeclaration, LegendEntry, ReadoutNote, ReadoutRow, ViewMark, ViewMarks} from "../../base/declare/graphDeclaration";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";

export interface EvoluteGraphStates extends CurvatureGraphStates {
    /** How much of the evolute is traced; saved with Presets like the curvature flags. */
    evoluteTrace: EvoluteTraceMode;
    /** The normal line at the parameter is drawn. */
    evoluteNormalShown: boolean;
}

export function isEvoluteTraceMode(value: unknown): value is EvoluteTraceMode {
    return EVOLUTE_TRACE_MODES.some(mode => mode === value);
}

/**
 * Evolute Demonstration (lesson L4): the curvature Demonstration plus an owned {@link EvoluteOverlay}, created right after the
 * curvature overlay and removed before it. The parabola's evolute spans x in [-4, 4], y in [0.5, 3.5].
 */
/** The opening parameter. At t = 0.5 the evolute point is the cusp, where the labels of E, T and N fall on top of each other. */
export const EVOLUTE_T_DEFAULT = 0.75;

/**
 * The ids the evolute graph declares: the curvature graph's (the t puck, kappa, R and the angle, the line and singular notes, the
 * circle) plus the evolute point E as a row, the two "no point" sentences as notes, and the trace and the normal in the legend.
 */
export type EvoluteIds = {
    param: CurvatureIds['param']; row: CurvatureIds['row'] | 'point'; note: CurvatureIds['note'] | 'noEvolute' | 'undefinedEvolute'; section: never;
    legend: CurvatureIds['legend'] | 'evolute' | 'normal';
    action: CurvatureIds['action'];
};

/** Evolute samples farther than this many curve extents from the curve's control box are left out of the watched box: next to an inflection they run off. */
const EVOLUTE_WATCH_EXTENTS = 1.6;
/** The same for an evolute that runs off to infinity: only its part next to the curve (the cusps) is watched. */
const EVOLUTE_RUNS_OFF_EXTENTS = 0.5;

class CurveEvoluteGraph extends CurvatureOverlayGraph<EvoluteGraphStates> {
    private evolute?: EvoluteOverlay;
    /** What the evolute overlay last read; see the same guard in the curvature graph. */
    private evoluteDrawn?: { t: number, mode: EvoluteTraceMode, normal: boolean };

    override getInitialState(): EvoluteGraphStates {
        return {
            ...super.getInitialState(),
            curvatureT: EVOLUTE_T_DEFAULT,
            curvatureFrameShown: true,
            curvatureCircleShown: true,
            evoluteTrace: 'full',
            evoluteNormalShown: true,
        };
    }

    protected override writeCurvatureState(update: Partial<CurvatureGraphStates>): void {
        this.setState(update);
    }

    override presetCollection() {
        return evoluteCurvePresetCollection;
    }

    protected override initialView(): [number, number, number, number] {
        // Leaves room above the trace's ends at y = 3.5 for the four-line readout, and below for the control point at y = -1.
        return [-5.2, 5, 5.2, -1.2];
    }

    /** The evolute overlay's owned elements (empty when there is none). */
    evoluteElements() {
        return this.evolute?.ownedElements() ?? [];
    }

    protected override declaresCurveWorkspace() { return true; }

    /** The readout is the declared rows and notes of the Odčitki card (E included), so no board text repeats it; the tags T, N and E stay. */
    protected override overlayReadoutOnBoard(): boolean { return false; }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return this.curvatureParameterBindings();
    }

    /** The evolute point at the state's parameter, from the curve's points (not through the overlay, whose draw would count as drawn). */
    private currentEvolutePoint(): Vec2 | undefined {
        const frame = this.currentFrame();
        if (!frame || frame.status === 'singular') return undefined;
        return evolutePoint(frame.point, frame.normal, frame.kappa, frame.scale);
    }

    private evoluteRows(): ReadoutRow<EvoluteIds>[] {
        const rows: ReadoutRow<EvoluteIds>[] = this.curvatureReadoutRows();
        const point = this.currentEvolutePoint();
        if (point) rows.push({id: 'point', name: message('evolute_row_point'), symbol: 'E', value: message('evolute_point_pair', {value0: messageNumber(point[0], 4), value1: messageNumber(point[1], 4)})});
        return rows;
    }

    private evoluteNotes(): ReadoutNote<EvoluteIds>[] {
        const notes: ReadoutNote<EvoluteIds>[] = this.curvatureReadoutNotes();
        const frame = this.currentFrame();
        if (frame?.status === 'singular') notes.push({id: 'undefinedEvolute', text: message('evolute_status_undefined'), tone: 'warning'});
        else if (frame && !this.currentEvolutePoint()) notes.push({id: 'noEvolute', text: message('evolute_status_none'), tone: 'warning'});
        return notes;
    }

    private evoluteMarksCache: {key: string; base: ViewMarks; marks: ViewMarks} | undefined;

    /**
     * The curvature marks plus the evolute where it stays near the curve: the point E and the drawn trace's samples, as polylines
     * broken where a sample is dropped. A sample counts when it lies within {@link EVOLUTE_WATCH_EXTENTS} extents of the curve's
     * own samples ({@link EVOLUTE_RUNS_OFF_EXTENTS} when the trace breaks, an evolute running off towards an inflection). Memoized.
     */
    protected override curveViewMarks(): ViewMarks {
        const base = super.curveViewMarks();
        const points = this.getFirstCurve()?.getPoints().map(point => [point.X(), point.Y()]);
        if (!points) return base;
        const mode = this.state.evoluteTrace, t = this.state.curvatureT;
        const key = [mode, mode === 'to-parameter' ? t : '', this.currentEvolutePoint()?.join(',') ?? ''].join('|');
        const cached = this.evoluteMarksCache;
        if (cached && cached.key === key && cached.base === base) return cached.marks;
        const samples = base.nice?.find(mark => mark.kind === 'polyline');
        const own = samples?.kind === 'polyline' ? samples.points.map(p => [p[0], p[1]]) : points;
        const xs = own.map(p => p[0]), ys = own.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const extent = Math.max(right - left, top - bottom, 1e-9);
        const pieces = (extents: number): [number, number][][] => {
            const reach = extents * extent;
            const near = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y)
                && x >= left - reach && x <= right + reach && y >= bottom - reach && y <= top + reach;
            const result: [number, number][][] = [];
            if (mode === 'hidden') return result;
            const trace = evoluteTrace(points, mode === 'to-parameter' ? t : 1, 48);
            let piece: [number, number][] = [];
            const flush = () => { if (piece.length >= 2) result.push(piece); piece = []; };
            trace.x.forEach((x, i) => { if (near(x, trace.y[i])) piece.push([x, trace.y[i]]); else flush(); });
            flush();
            return result;
        };
        // An evolute that breaks (it runs off to infinity at an inflection or a flat point) is clipped to the curve's neighbourhood.
        const runsOff = evoluteTrace(points, 1, 48).x.some(Number.isNaN);
        const kept = pieces(runsOff ? EVOLUTE_RUNS_OFF_EXTENTS : EVOLUTE_WATCH_EXTENTS);
        const must: ViewMark[] = [...base.must, ...kept.map(piece => ({kind: 'polyline' as const, points: piece}))];
        const point = this.currentEvolutePoint();
        if (point && Math.abs(point[0] - (left + right) / 2) <= (EVOLUTE_WATCH_EXTENTS + 0.5) * extent && Math.abs(point[1] - (bottom + top) / 2) <= (EVOLUTE_WATCH_EXTENTS + 0.5) * extent) must.push({kind: 'point', x: point[0], y: point[1]});
        const marks: ViewMarks = {...base, must};
        this.evoluteMarksCache = {key, base, marks};
        return marks;
    }

    /**
     * The common curve declaration plus the t puck, the read-offs and E as rows, and the circle, the evolute and the normal in the
     * legend while they are drawn. The old board text of the readout is the rows and notes (owner, 2026-11-27); T, N and E stay.
     */
    protected override declaration(): GraphDeclaration<EvoluteIds> {
        const common = this.commonCurveDeclaration();
        const legend: LegendEntry<EvoluteIds>[] = [
            ...(common.legend ?? []),
            ...(this.state.curvatureCircleShown ? [{id: 'circle' as const, label: message('curvature_legend_circle'), kind: 'line' as const, object: 'circle'}] : []),
            ...(this.state.evoluteTrace !== 'hidden' ? [{id: 'evolute' as const, label: message('evolute_legend_trace'), kind: 'line' as const, object: 'evolute'}] : []),
            ...(this.state.evoluteNormalShown ? [{id: 'normal' as const, label: message('evolute_legend_normal'), kind: 'dashed' as const, object: 'normal'}] : []),
        ];
        const marks = this.curveViewMarks();
        return {
            ...common, parameters: [this.curvatureParameterDeclaration()], legend,
            readouts: [{id: 'evolute', rows: this.evoluteRows()}],
            notes: this.evoluteNotes(),
            marks,
            followView: this.watchedBox(marks),
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id === 'evolute') return this.drawnStyle(this.evolute?.traceElement());
        if (id === 'normal') return this.drawnStyle(this.evolute?.normalElement());
        return super.drawnObject(id);
    }

    /** The evolute and the point E are the subject here; the circle only shows where E comes from. */
    protected override overlayCircleRole(): 'subject' | 'context' { return 'context'; }

    protected override overlayExtraReadout() {
        return () => this.evolute?.readoutText() ?? "";
    }

    protected override createExtraOverlays(): void {
        if (!this.board || !this.graphSession?.isAlive) return;
        this.evolute = new EvoluteOverlay({
            board: this.board,
            controlPoints: () => this.getFirstCurve()?.getPoints().map(point => [point.X(), point.Y()]),
            parameter: () => this.state.curvatureT,
            traceMode: () => {
                this.evoluteDrawn = {t: this.state.curvatureT, mode: this.state.evoluteTrace, normal: this.state.evoluteNormalShown};
                return this.state.evoluteTrace;
            },
            normalShown: () => this.state.evoluteNormalShown,
            fontSize: () => this.displaySettings.fontSize,
        });
        // The readout was first computed before this overlay existed, and the trace's visibility is a function: without this
        // update a newly mounted graph shows neither until the next board update.
        this.boardUpdate();
    }

    protected override removeExtraOverlays(): void {
        this.evolute?.dispose();
        this.evolute = undefined;
    }

    protected override extraStateChanged(prevState: Readonly<EvoluteGraphStates>): boolean {
        const drawn = this.evoluteDrawn;
        const stale = drawn !== undefined && (drawn.t !== this.state.curvatureT || drawn.mode !== this.state.evoluteTrace
            || drawn.normal !== this.state.evoluteNormalShown);
        return stale || prevState.evoluteTrace !== this.state.evoluteTrace || prevState.evoluteNormalShown !== this.state.evoluteNormalShown;
    }

    protected override workspaceCurvatureExtras(): React.ReactNode {
        const labels: Record<EvoluteTraceMode, string> = {
            'hidden': t("evolute_trace_hidden"),
            'to-parameter': t("evolute_trace_to_parameter"),
            'full': t("evolute_trace_full"),
        };
        return <div className="inspector-group">
            <ChoiceSelect label={t("evolute_trace_label")} value={this.state.evoluteTrace}
                          options={EVOLUTE_TRACE_MODES.map(mode => ({value: mode, text: labels[mode]}))}
                          onChange={value => { if (isEvoluteTraceMode(value)) this.setEvoluteTrace(value); }}/>
            <OnOffSwitch checked={this.state.evoluteNormalShown} label={t("evolute_normal_label")}
                         onChange={checked => this.setEvoluteNormalShown(checked)}/>
        </div>;
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'evolute-normal', action => {
            if (typeof action.visible !== 'boolean') throw new Error('The evolute normal visibility must be true or false.');
            this.setEvoluteNormalShown(action.visible);
        });
        registry.on('evolute-trace', action => {
            if (!isEvoluteTraceMode(action.mode)) throw new Error(`The evolute trace must be one of ${EVOLUTE_TRACE_MODES.join(', ')}.`);
            this.setEvoluteTrace(action.mode);
        });
    }

    setEvoluteTrace(mode: EvoluteTraceMode) {
        this.setState({evoluteTrace: mode});
    }

    setEvoluteNormalShown(shown: boolean) {
        this.setState({evoluteNormalShown: shown});
    }
}

export default CurveEvoluteGraph;
