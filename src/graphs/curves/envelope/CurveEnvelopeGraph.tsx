import React, {useSyncExternalStore} from "react";
import {t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {curveEnvelopePresetCollection} from "../geometry/collections";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {
    ENVELOPE_LINES_DEFAULT, ENVELOPE_LINES_MAX, ENVELOPE_LINES_MIN, ENVELOPE_T_DEFAULT,
} from "./curveEnvelope";
import {EnvelopeOverlay} from "./EnvelopeOverlay";

export {ENVELOPE_LINES_DEFAULT, ENVELOPE_LINES_MAX, ENVELOPE_LINES_MIN, ENVELOPE_T_DEFAULT};

/** The default curve: with it the lines are x/(1-t) + y/t = 1 and the envelope is sqrt(x) + sqrt(y) = 1. */
export const ENVELOPE_DEFAULT_POINTS: number[][] = [[1, 0], [0, 0], [0, 1]];

/** Low on the board, as a lesson panel covers the upper half. */
const ENVELOPE_VIEW: [number, number, number, number] = [-1.4, 2.2, 2.4, -0.4];

export interface CurveEnvelopeStates extends BaseGraphStates {
    /** The parameter of the highlighted line and its touching point. */
    envelopeT: number;
    /** The number of lines of the family (an integer, at most {@link ENVELOPE_LINES_MAX}). */
    envelopeLineCount: number;
    /** The family of lines is drawn. */
    envelopeLinesShown: boolean;
    /** The Bezier curve itself is drawn; hidden, a learner can predict what the lines form. The control polygon stays. */
    envelopeCurveShown: boolean;
    /** The highlighted line at t and its touching point. */
    envelopeTouchShown: boolean;
}

/** The collinear note in the inspector, following the live readout: a drag changes no React state, so the note cannot read the points at render. */
function CollinearNote({readout}: { readout: SettledReadout }) {
    const text = useSyncExternalStore(readout.subscribe, readout.getSnapshot);
    return text.includes(t("envelope_readout_collinear")) ? <p className="inspector-help">{t("envelope_readout_collinear")}</p> : null;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/**
 * Envelope Demonstration (lesson L6): the Bezier graph plus one owned {@link EnvelopeOverlay}, the lines joining the last
 * de Casteljau points. The overlay is recreated after every scene import and disposed with the scene and on unmount.
 */
class CurveEnvelopeGraph extends BaseBezierCurveGraph<CurveEnvelopeStates> {
    private overlay?: EnvelopeOverlay;
    /** What the overlay last read: a lesson scene resets the state and sets it back within one batch, so comparing only with the previous state would miss a redraw. */
    private drawn?: { t: number, count: number, lines: boolean, touch: boolean };
    /** The Bezier curve's last applied visibility, for the same reason as {@link drawn}. */
    private curveApplied?: boolean;
    /** Owned by the graph so it survives overlay recreation on scene import. */
    private readonly liveReadout = new SettledReadout();

    protected override workspaceUsesStructuredEditing() { return true; }

    override getInitialState(): CurveEnvelopeStates {
        return {
            ...super.getInitialState(),
            envelopeT: ENVELOPE_T_DEFAULT,
            envelopeLineCount: ENVELOPE_LINES_DEFAULT,
            envelopeLinesShown: true,
            envelopeCurveShown: true,
            envelopeTouchShown: true,
        };
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            points: ENVELOPE_DEFAULT_POINTS.map(point => [...point]),
            state: {
                showingJxgPoints: true, showingControlPolygon: true, showingConvexHull: false, showingDecasteljauScheme: false,
                subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2,
            },
        }]];
    }

    override presetCollection() {
        return curveEnvelopePresetCollection;
    }

    protected override initialView(): [number, number, number, number] {
        return [...ENVELOPE_VIEW];
    }

    override initialize() {
        super.initialize();
        this.ensureOverlay();
        this.applyCurveVisibility();
    }

    /** Scene imports dispose the overlay with the scene, so it is recreated here. */
    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        this.ensureOverlay();
        this.applyCurveVisibility();
    }

    /** The values the board draws: a restored Preset may hold anything, so they are bounded here. */
    private effectiveT() { return clampNumber(this.state.envelopeT, 0, 1, ENVELOPE_T_DEFAULT); }
    private effectiveCount() { return Math.round(clampNumber(this.state.envelopeLineCount, ENVELOPE_LINES_MIN, ENVELOPE_LINES_MAX, ENVELOPE_LINES_DEFAULT)); }
    private effectiveCurveShown() { return this.state.envelopeCurveShown !== false; }

    /** The polynomial control rows of the live curve, read at the time of the call. */
    controlRows(): number[][] | undefined {
        const curve = this.getFirstCurve();
        return curve ? curve.getPoints().map(point => [point.X(), point.Y()]) : undefined;
    }

    /** The live overlay, for the lesson and tests. */
    envelope(): EnvelopeOverlay | undefined {
        return this.overlay;
    }

    /** Shows or hides the board curve of the Bezier curve; the control polygon and points stay. */
    private applyCurveVisibility() {
        const jxg = this.getFirstJxgCurve()?.getJxgCurve();
        if (!jxg || !this.board) return;
        this.curveApplied = this.effectiveCurveShown();
        jxg.setAttribute({visible: this.curveApplied});
    }

    /** Idempotent: removes any earlier overlay and creates one reading the current first curve lazily. */
    private ensureOverlay() {
        this.removeOverlay();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.overlay = new EnvelopeOverlay({
            board: this.board,
            rows: () => this.controlRows(),
            t: () => {
                this.noteDrawn();
                return this.effectiveT();
            },
            count: () => this.effectiveCount(),
            linesShown: () => this.state.envelopeLinesShown !== false,
            touchShown: () => this.state.envelopeTouchShown !== false,
            fontSize: () => this.displaySettings.fontSize,
            onReadout: text => this.liveReadout.report(text),
            onLanguageReadout: text => this.liveReadout.replace(text),
        });
    }

    private noteDrawn() {
        this.drawn = {
            t: this.effectiveT(), count: this.effectiveCount(),
            lines: this.state.envelopeLinesShown !== false, touch: this.state.envelopeTouchShown !== false,
        };
    }

    private removeOverlay() {
        this.overlay?.dispose();
        this.overlay = undefined;
    }

    /** A restored scene must not leave the edited scene's readout in the live region until the quiet period ends. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.applyCurveVisibility();
        this.boardUpdate();
        if (this.overlay) this.liveReadout.replace(this.overlay.readoutText());
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

    protected override onStateChange(prevState: Readonly<CurveEnvelopeStates>) {
        super.onStateChange(prevState);
        if (prevState === this.state) return;
        const drawn = this.drawn;
        const stale = drawn !== undefined && (drawn.t !== this.effectiveT() || drawn.count !== this.effectiveCount()
            || drawn.lines !== (this.state.envelopeLinesShown !== false) || drawn.touch !== (this.state.envelopeTouchShown !== false));
        const curveChanged = this.curveApplied !== this.effectiveCurveShown();
        if (curveChanged) this.applyCurveVisibility();
        if (stale || curveChanged || prevState.envelopeT !== this.state.envelopeT || prevState.envelopeLineCount !== this.state.envelopeLineCount
            || prevState.envelopeLinesShown !== this.state.envelopeLinesShown || prevState.envelopeTouchShown !== this.state.envelopeTouchShown) {
            this.boardUpdate();
        }
    }

    // ---- Operations ------------------------------------------------------------------------------------------------

    setEnvelopeT(value: number) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error('The envelope parameter must be a number from 0 to 1.');
        this.setState({envelopeT: value});
    }

    setEnvelopeLineCount(value: number) {
        if (!Number.isInteger(value) || value < ENVELOPE_LINES_MIN || value > ENVELOPE_LINES_MAX) {
            throw new Error(`The number of lines must be an integer from ${ENVELOPE_LINES_MIN} to ${ENVELOPE_LINES_MAX}.`);
        }
        this.setState({envelopeLineCount: value});
    }

    setEnvelopeLinesShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The lines must be switched on or off.');
        this.setState({envelopeLinesShown: visible});
    }

    setEnvelopeCurveShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The curve must be switched on or off.');
        this.setState({envelopeCurveShown: visible});
    }

    setEnvelopeTouchShown(visible: boolean) {
        if (typeof visible !== 'boolean') throw new Error('The touching point must be switched on or off.');
        this.setState({envelopeTouchShown: visible});
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'envelope-lines', action => this.setEnvelopeLinesShown(action.visible));
        registry.onDiscriminated('curve-visibility', 'envelope-curve', action => this.setEnvelopeCurveShown(action.visible));
        registry.onDiscriminated('curve-visibility', 'envelope-touch', action => this.setEnvelopeTouchShown(action.visible));
        registry.on('envelope-t', action => this.setEnvelopeT(action.value));
        registry.on('envelope-lines', action => this.setEnvelopeLineCount(action.value));
    }

    // ---- Controls --------------------------------------------------------------------------------------------------

    /** Structured editing does not render `getGraphCommands`, so the envelope has its own Edit group, first. */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.envelopeControls()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    private envelopeControls() {
        return <div className="inspector-group">
            <OnOffSwitch label={t("envelope_lines_shown")} checked={this.state.envelopeLinesShown !== false}
                         onChange={checked => this.setEnvelopeLinesShown(checked)}/>
            <Slider min={ENVELOPE_LINES_MIN} max={ENVELOPE_LINES_MAX} step={1} value={this.effectiveCount()} customText={t("envelope_line_count")}
                    onChange={value => this.setEnvelopeLineCount(Math.round(value))}/>
            <OnOffSwitch label={t("envelope_curve_shown")} checked={this.effectiveCurveShown()} onChange={checked => this.setEnvelopeCurveShown(checked)}/>
            <OnOffSwitch label={t("envelope_touch_shown")} checked={this.state.envelopeTouchShown !== false}
                         onChange={checked => this.setEnvelopeTouchShown(checked)}/>
            <Slider min={0} max={1} step={0.01} value={this.effectiveT()} customText={t("envelope_parameter_t")}
                    onChange={value => this.setEnvelopeT(value)}/>
            <p className="inspector-help">{t("envelope_help")}</p>
            <p className="inspector-help">{t("envelope_measurement_note", {value0: String(ENVELOPE_LINES_MAX)})}</p>
            <CollinearNote readout={this.liveReadout}/>
        </div>;
    }
}

export default CurveEnvelopeGraph;
