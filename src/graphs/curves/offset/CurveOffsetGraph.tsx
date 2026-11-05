import React from "react";
import {t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import BaseCurveGraph, {BaseGraphStates} from "../../base/BaseCurveGraph";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {fitBoundingBox} from "../../base/fitBoundingBox";
import {curveOffsetPresetCollection, CurveCollectionPresetData} from "../curvePresetCollections";
import {LiveReadout, SettledReadout} from "../LiveReadout";
import {JXGPHBezierCurve, OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from "../object/JXGPHBezierCurve";
import {OFFSET_SAMPLES_DEFAULT, OFFSET_SAMPLES_MAX, OFFSET_SAMPLES_MIN} from "./curveOffset";
import {OffsetCurveKind, OffsetOverlay} from "./OffsetOverlay";
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
 * Known limit: the hodograph auxiliary board of the PH route is not here, so the PH shape is fixed (the base point drags).
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
            fontSize: () => this.displaySettings.fontSize,
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
        this.board.setBoundingBox(box ?? [left, top, right, bottom], this.equalAxisUnits);
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

    // ---- Controls --------------------------------------------------------------------------------------------------

    /** Structured editing does not render `getGraphCommands`, so the offset has its own Edit group, first. */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.offsetControls()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    private offsetControls() {
        const kind = this.curveKind();
        return <div className="inspector-group">
            <ChoiceSelect label={t("parametric_curve_label")} value={kind}
                          options={OFFSET_CURVE_KINDS.map(value => ({value, text: curveLabel(value)}))}
                          onChange={value => { if (isOffsetCurveKind(value) && value !== kind) this.setCurveKind(value); }}/>
            <OnOffSwitch label={t("offset_shown")} checked={this.effectiveShown()} onChange={checked => this.setOffsetShown(checked)}/>
            <Slider min={OFFSET_DISTANCE_MIN} max={OFFSET_DISTANCE_MAX} step={0.01} value={this.effectiveD()} customText={t("offset_distance")}
                    onChange={value => this.setOffsetDistance(value)}/>
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
