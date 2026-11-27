import React from "react";
import {message, t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {COMB_MAX_COUNT, COMB_MIN_COUNT} from "../../../bezeg/impl/curve/curvature";
import {COMB_GAIN_MAX, COMB_GAIN_MIN} from "./curveComb";
import {BezierSpline} from "../../../bezeg/impl/curve/bezier-spline";
import BaseCurveGraph, {BaseCurveIds, BaseGraphStates} from "../../base/BaseCurveGraph";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration, ViewMarks} from "../../base/declare/graphDeclaration";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {runAs} from "../../base/writes/writeSource";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {DomainError} from "../../functions/BaseFunctionGraph";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {curveCombPresetCollection} from "../geometry/collections";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {ClassMapper} from "../object/ClassMapper";
import {AbstractJXGSplineCurve} from "../object/AbstractJXGSplineCurve";
import type {CurveTypeName} from "../object/curveTypeNames";
import {c1SplineDefaultPreset} from "../spline/C1SplineGraph";
import {c2SplineDefaultPreset} from "../spline/C2SplineGraph";
import {g1SplineDefaultPreset, G1_BETA_MAX, G1_BETA_MIN} from "../spline/G1SplineGraph";
import {validateSplineBeta} from "../spline/splineBetaAction";
import {CombOverlay} from "./CombOverlay";
import type {SpanRows} from "./curveComb";

export type CombCurveKind = 'cubic' | 'c1' | 'c2' | 'g1';
export const COMB_CURVE_KINDS: readonly CombCurveKind[] = ['cubic', 'c1', 'c2', 'g1'];

/** The adapter (stored curve type) of each kind: the kind is derived from the live curve through this table. */
const KIND_CURVE_TYPE: Readonly<Record<CombCurveKind, CurveTypeName>> = {
    cubic: 'JSXBezierCurve', c1: 'JSXQuadraticC1SplineCurve', c2: 'JSXQubicC2SplineCurve', g1: 'JSXQuadraticG1SplineCurve',
};

export const COMB_COUNT_DEFAULT = 64;
/**
 * Tooth length is gain * |kappa| in graph units. Measured max |kappa| of the four default curves: cubic 0.67, C1 1.46,
 * C2 1.03, G1 0.98 (views about 10 units wide); at 1.4 the longest tooth is 0.93, 2.04, 1.44 and 1.37 and none is clipped.
 */
export const COMB_GAIN_DEFAULT = 1.4;
export {COMB_MIN_COUNT, COMB_MAX_COUNT};

/** The cubic of lesson L2 (`CURVATURE_CUBIC`): non-symmetric, kappa(0) = 2/3 falling to 0.0596 at t = 1. */
export const COMB_CUBIC_POINTS: number[][] = [[0, 0], [1, 0], [2, 1], [3, 3]];

function cubicDefaultPreset(): CurveCollectionPresetData {
    return [["JSXBezierCurve", {
        points: COMB_CUBIC_POINTS.map(point => [...point]),
        state: {
            showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false,
            subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2,
        },
    }]];
}

/** The default scene of each curve kind. */
export function combPresetFor(kind: CombCurveKind): CurveCollectionPresetData {
    switch (kind) {
        case 'cubic': return cubicDefaultPreset();
        case 'c1': return c1SplineDefaultPreset();
        case 'c2': return c2SplineDefaultPreset();
        case 'g1': return g1SplineDefaultPreset();
    }
}

export function isCombCurveKind(value: unknown): value is CombCurveKind {
    return typeof value === 'string' && (COMB_CURVE_KINDS as readonly string[]).includes(value);
}

/**
 * The ids this graph declares: the gain (a range puck, bound in the arbiter), the comb switch (a switch puck), the sentences of the
 * join readout as notes, and the legend of the curve, its control points and the comb. The count, the curve choice and the G1
 * parameters stay in Orodja (setup and vector parameters).
 */
export type CombIds = {
    param: 'comb-gain'; row: never; note: 'join' | 'singular'; section: never;
    legend: BaseCurveIds['legend'] | 'comb';
    action: BaseCurveIds['action'] | 'comb-shown';
};

export interface CurveCombStates extends BaseGraphStates {
    /** The comb is drawn. Off by default (ADR 0041); lessons switch it on. */
    combShown: boolean;
    combGain: number;
    combCount: number;
    /** Bumped when lesson actions change b; part of the saved scene state. The sliders read the model values while rendering. */
    betaRevision?: number;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function curveLabel(kind: CombCurveKind): string {
    switch (kind) {
        case 'cubic': return t("comb_curve_cubic");
        case 'c1': return t("comb_curve_c1");
        case 'c2': return t("comb_curve_c2");
        case 'g1': return t("comb_curve_g1");
    }
}

/**
 * Curvature comb Demonstration (lesson L3, ADR 0022 and 0041): one graph for the cubic Bezier curve and the C1, C2 and G1
 * splines, plus one owned {@link CombOverlay}. The kind is read from the live curve, never stored, so a restored Preset
 * cannot disagree with it. Changing the kind replaces the scene through the lesson replacement path (the same disposal and
 * import a Preset load runs), which disposes the old comb and recreates it.
 */
class CurveCombGraph extends BaseCurveGraph<CurveCombStates> {
    private overlay?: CombOverlay;
    /** What the overlay last read: a lesson scene resets the state and sets it back within one batch, so comparing only with the previous state would miss a redraw. */
    private drawn?: { shown: boolean, gain: number, count: number };

    /** The kind of the live curve; the cubic before a curve exists. */
    curveKind(): CombCurveKind {
        const live: unknown = this.getFirstJxgCurve();
        const name = live ? ClassMapper.getClassName((live as object).constructor) : undefined;
        return COMB_CURVE_KINDS.find(kind => KIND_CURVE_TYPE[kind] === name) ?? 'cubic';
    }

    /**
     * Structured editing renders the Bezier-only subdivision and extrapolation tools for a selected curve, which a spline
     * does not have, so only the cubic uses it; a spline keeps the spline routes' selected-curve commands.
     */
    protected override declaresCurveWorkspace() { return true; }

    protected override workspaceUsesStructuredEditing() { return this.curveKind() === 'cubic'; }

    override getInitialState(): CurveCombStates {
        return {
            ...super.getInitialState(),
            combShown: false,
            combGain: COMB_GAIN_DEFAULT,
            combCount: COMB_COUNT_DEFAULT,
        };
    }

    defaultPreset(): CurveCollectionPresetData {
        return cubicDefaultPreset();
    }

    /** Owned by the graph so it survives overlay recreation on scene import. */
    private readonly liveReadout = new SettledReadout();

    override presetCollection() {
        return curveCombPresetCollection;
    }

    override initialize() {
        super.initialize();
        this.ensureOverlay();
    }

    /** Scene imports dispose the overlay with the scene, so it is recreated here. */
    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        const curve = this.getFirstJxgCurve();
        if (curve instanceof AbstractJXGSplineCurve) curve.setAttributes({allowShowPoints: true});
        this.ensureOverlay();
    }

    /** The values the board draws: a restored Preset may hold anything, so they are bounded here. */
    private effectiveGain() { return clampNumber(this.state.combGain, COMB_GAIN_MIN, COMB_GAIN_MAX, COMB_GAIN_DEFAULT); }
    private effectiveCount() { return Math.round(clampNumber(this.state.combCount, COMB_MIN_COUNT, COMB_MAX_COUNT, COMB_COUNT_DEFAULT)); }

    /** The control rows of every Bezier span of the live curve, read at the time of the call. */
    spanRows(): SpanRows | undefined {
        const curve = this.getFirstCurve();
        if (!curve) return undefined;
        const rows = (points: ReadonlyArray<{ X(): number, Y(): number }>) => points.map(point => [point.X(), point.Y()]);
        return curve instanceof BezierSpline ? curve.getUnderlyingCurves().map(span => rows(span.getPoints())) : [rows(curve.getPoints())];
    }

    /** A restored scene must not leave the edited scene's readout in the live region until the quiet period ends. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        if (this.overlay) this.liveReadout.replace(this.overlay.readoutText());
    }

    /** The live overlay, for the lesson and tests. */
    comb(): CombOverlay | undefined {
        return this.overlay;
    }

    /** Idempotent: removes any earlier overlay and creates one reading the current first curve lazily. */
    private ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new CombOverlay({
            board: this.board,
            spans: () => this.spanRows(),
            shown: () => this.state.combShown,
            // Only a board draw counts as drawn: the declaration and its notes read the geometry too, without redrawing the board.
            onDraw: () => { this.drawn = {shown: this.state.combShown, gain: this.effectiveGain(), count: this.effectiveCount()}; },
            gain: () => this.effectiveGain(),
            count: () => this.effectiveCount(),
            fontSize: () => this.displaySettings.fontSize,
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

    protected override onStateChange(prevState: Readonly<CurveCombStates>) {
        super.onStateChange(prevState);
        const drawn = this.drawn;
        const stale = drawn !== undefined && (drawn.shown !== this.state.combShown
            || drawn.gain !== this.effectiveGain() || drawn.count !== this.effectiveCount());
        if (prevState !== this.state && (stale || prevState.combShown !== this.state.combShown
            || prevState.combGain !== this.state.combGain || prevState.combCount !== this.state.combCount)) this.boardUpdate();
    }

    // ---- Operations ------------------------------------------------------------------------------------------------

    setCombShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The comb must be switched on or off.');
        this.setState({combShown: visible});
    }

    setCombGain(value: number) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < COMB_GAIN_MIN || value > COMB_GAIN_MAX) {
            throw new Error(`The comb gain must be a number from ${COMB_GAIN_MIN} to ${COMB_GAIN_MAX}.`);
        }
        this.setState({combGain: value});
    }

    setCombCount(value: number) {
        if (!Number.isInteger(value) || value < COMB_MIN_COUNT || value > COMB_MAX_COUNT) {
            throw new Error(`The number of comb teeth must be an integer from ${COMB_MIN_COUNT} to ${COMB_MAX_COUNT}.`);
        }
        this.setState({combCount: value});
    }

    /** Replaces the scene with the default of `kind`, keeping the comb state. The old comb is disposed and a new one created by the import. */
    setCurveKind(kind: CombCurveKind) {
        if (!isCombCurveKind(kind)) throw new Error('The comb curve must be cubic, c1, c2 or g1.');
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        const keep = {combShown: this.state.combShown, combGain: this.state.combGain, combCount: this.state.combCount};
        this.runLessonReplacement({
            importData: () => this.importPresetData(combPresetFor(kind)),
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState(), ...keep}),
            transientState: undefined,
        });
    }

    private setBeta(index: number, value: number) {
        const curve = this.getFirstCurve();
        const spline = curve instanceof BezierSpline ? curve : undefined;
        validateSplineBeta(index, value, spline ? spline.getNumOfBs() : 0, G1_BETA_MIN, G1_BETA_MAX);
        spline?.setB(index, value);
        this.setState(state => ({betaRevision: (state.betaRevision ?? 0) + 1}));
        this.boardUpdate();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'curvature-comb', action => this.setCombShown(action.visible));
        registry.on('comb-curve', action => this.setCurveKind(action.curve));
        registry.on('comb-gain', action => this.setCombGain(action.value));
        registry.on('comb-count', action => this.setCombCount(action.value));
        registry.on('spline-beta', action => {
            if (this.curveKind() !== 'g1') throw new Error('Only the G1 spline has junction parameters.');
            this.setBeta(action.index, action.value);
        });
    }

    // ---- Declaration -----------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the key `comb-gain` reads and writes the gain through the validated setter. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'comb-gain': {
                read: () => this.effectiveGain(),
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < COMB_GAIN_MIN || value > COMB_GAIN_MAX) {
                        throw new DomainError(message('comb_gain_refused', {value0: String(COMB_GAIN_MIN), value1: String(COMB_GAIN_MAX)}));
                    }
                    this.setCombGain(value);
                },
            },
        };
    }

    /**
     * The common curve declaration plus the gain puck, the comb switch puck, the join sentences as notes and the comb in the legend
     * while it is shown (a declared entry must be drawn). The old board caption of the join is the note.
     */
    protected override declaration(): GraphDeclaration<CombIds> {
        const common = this.commonCurveDeclaration();
        const parameters: ParameterDeclaration<CombIds['param']>[] = [
            {key: 'comb-gain', kind: 'range', label: message('comb_gain_name'), symbol: 'g', placement: 'board', min: COMB_GAIN_MIN, max: COMB_GAIN_MAX, step: 0.05, maxDecimals: 2},
        ];
        const legend: LegendEntry<CombIds>[] = [
            ...(common.legend ?? []),
            ...(this.state.combShown ? [{id: 'comb' as const, label: message('comb_legend_teeth'), kind: 'line' as const, object: 'comb'}] : []),
        ];
        return {
            ...common, parameters, legend,
            actions: [...(common.actions ?? []), {id: 'comb-shown', label: message('comb_shown_puck'), enabled: true, pressed: this.state.combShown, placement: 'board', puck: true}],
            notes: (this.overlay?.readoutMessages() ?? []).map(line => ({id: line.id, text: line.text})),
            marks: this.curveViewMarks(),
        };
    }

    private combMarksCache: {base: ViewMarks; tip: object; marks: ViewMarks} | undefined;

    /** The control points and curve samples of the base, and the line through the tooth tips (nice) while the comb is shown. Memoized on both. */
    protected override curveViewMarks(): ViewMarks {
        const base = super.curveViewMarks();
        const geometry = this.overlay?.geometry();
        if (!geometry || geometry.tipX.length === 0) return base;
        const cached = this.combMarksCache;
        if (cached && cached.base === base && cached.tip === geometry) return cached.marks;
        const tips: {kind: 'point'; x: number; y: number}[] = [];
        const stride = Math.max(1, Math.ceil(geometry.tipX.length / 40));
        for (let i = 0; i < geometry.tipX.length; i += stride) {
            const x = geometry.tipX[i], y = geometry.tipY[i];
            if (Number.isFinite(x) && Number.isFinite(y)) tips.push({kind: 'point', x, y});
        }
        const marks: ViewMarks = {...base, nice: [...(base.nice ?? []), ...tips]};
        this.combMarksCache = {base, tip: geometry, marks};
        return marks;
    }

    /** The first owned curve of the overlay (the teeth) stands for the comb; the base owns the curve and its control points. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'comb') return super.drawnObject(id);
        const element = this.overlay?.ownedElements()[0];
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('strokecolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    override performAction(id: string): void {
        if (id === 'comb-shown') runAs('learner', () => this.setCombShown(!this.state.combShown));
        else super.performAction(id);
    }

    // ---- Controls --------------------------------------------------------------------------------------------------

    /** Structured editing does not render `getGraphCommands`, and the spline path renders only the selected-curve tools, so the comb has its own Edit group, first. */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.combControls()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    private combControls() {
        const kind = this.curveKind();
        const curve = this.getFirstCurve();
        const bs = kind === 'g1' && curve instanceof BezierSpline ? curve.getBs() : [];
        return <div className="inspector-group">
            <PuckOwned param="comb-shown"><OnOffSwitch label={t("comb_shown")} checked={this.state.combShown} onChange={checked => this.setCombShown(checked)}/></PuckOwned>
            <PuckOwned param="comb-gain"><Slider min={COMB_GAIN_MIN} max={COMB_GAIN_MAX} step={0.05} value={this.effectiveGain()} customText={t("comb_gain")}
                    onChange={value => this.setCombGain(value)}/></PuckOwned>
            <Slider min={COMB_MIN_COUNT} max={COMB_MAX_COUNT} step={1} value={this.effectiveCount()} customText={t("comb_count")}
                    onChange={value => this.setCombCount(Math.round(value))}/>
            <ChoiceSelect label={t("parametric_curve_label")} value={kind}
                          options={COMB_CURVE_KINDS.map(value => ({value, text: curveLabel(value)}))}
                          onChange={value => { if (isCombCurveKind(value) && value !== kind) this.setCurveKind(value); }}/>
            {bs.map((b, i) => <div key={i}><Slider customText={`${t('spline_parameter_b')} ${i + 1}`} value={b}
                                                  min={G1_BETA_MIN} max={G1_BETA_MAX}
                                                  onChange={value => this.setBeta(i, value)}/></div>)}
        </div>;
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        const curve = this.getFirstJxgCurve();
        if (!(curve instanceof AbstractJXGSplineCurve)) return super.workspaceGraphDisplay();
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("point_visibility")}</h3>
            <OnOffSwitch onChange={checked => { curve.setLabelAll(checked); this.boardUpdate(); this.store.notify(); }}
                         label={t("label_all_points")} checked={curve.getLabelAll()}/>
            <OnOffSwitch onChange={checked => { curve.setHideFixed(checked); this.store.notify(); }}
                         label={t("hide_fixed_points")} checked={curve.getHideFixed()}/></div></>;
    }
}

export default CurveCombGraph;
