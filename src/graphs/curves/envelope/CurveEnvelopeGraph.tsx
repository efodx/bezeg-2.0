import React from "react";
import {message, messageNumber, t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseCurveIds, BaseGraphStates} from "../../base/BaseCurveGraph";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutNote, ReadoutRow, ViewMarks} from "../../base/declare/graphDeclaration";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {runAs} from "../../base/writes/writeSource";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {DomainError} from "../../functions/BaseFunctionGraph";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {curveEnvelopePresetCollection} from "../geometry/collections";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {
    ENVELOPE_LINES_DEFAULT, ENVELOPE_LINES_MAX, ENVELOPE_LINES_MIN, ENVELOPE_T_DEFAULT,
} from "./curveEnvelope";
import {EnvelopeOverlay, FAMILY_BANDS} from "./EnvelopeOverlay";

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

/**
 * The ids this graph declares: the parameter t and the line count (puck parameters, bound in the arbiter), the curve switch (a switch
 * puck), the two read-offs as rows, the collinear sentence as a note, and the legend of the curve, its control points, the family
 * and the highlighted line. The switches of the family and of the highlighted line stay in Orodja.
 */
export type EnvelopeIds = {
    param: 'envelope-t' | 'envelope-lines'; row: 'lines' | 't'; note: 'collinear'; section: never;
    legend: BaseCurveIds['legend'] | 'family' | 'touch';
    action: BaseCurveIds['action'] | 'envelope-curve';
};

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

    protected override declaresCurveWorkspace() { return true; }

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

    // ---- Declaration -----------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the keys read and write t and the line count through the validated setters. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'envelope-t': {
                read: () => this.effectiveT(),
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new DomainError(message('envelope_t_refused'));
                    this.setEnvelopeT(value);
                },
            },
            'envelope-lines': {
                read: () => this.effectiveCount(),
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isInteger(value) || value < ENVELOPE_LINES_MIN || value > ENVELOPE_LINES_MAX) {
                        throw new DomainError(message('envelope_lines_refused', {value0: String(ENVELOPE_LINES_MIN), value1: String(ENVELOPE_LINES_MAX)}));
                    }
                    this.setEnvelopeLineCount(value);
                },
            },
        };
    }

    private readoutRows(): ReadoutRow<EnvelopeIds>[] {
        if (!this.getFirstCurve()) return [];
        return [
            {id: 'lines', name: message('envelope_line_count'), value: messageNumber(this.effectiveCount(), 0)},
            {id: 't', name: message('envelope_t_name'), symbol: 't', value: messageNumber(this.effectiveT(), 2)},
        ];
    }

    private readoutNotes(): ReadoutNote<EnvelopeIds>[] {
        return this.overlay?.collinear() ? [{id: 'collinear', text: message('envelope_readout_collinear'), tone: 'warning'}] : [];
    }

    /**
     * The common curve declaration plus the t and line-count pucks, the curve switch puck, the two read-offs as rows, the collinear
     * sentence as a note, and the family and the highlighted line in the legend while they are switched on (a declared entry must be
     * drawn). The old board caption of the count, t and the note is the rows and the note.
     */
    protected override declaration(): GraphDeclaration<EnvelopeIds> {
        const common = this.commonCurveDeclaration();
        const parameters: ParameterDeclaration<EnvelopeIds['param']>[] = [
            {key: 'envelope-t', kind: 'range', label: message('envelope_t_name'), symbol: 't', placement: 'board', min: 0, max: 1, step: 0.01, maxDecimals: 2},
            {key: 'envelope-lines', kind: 'count', label: message('envelope_line_count'), placement: 'board', min: ENVELOPE_LINES_MIN, max: ENVELOPE_LINES_MAX},
        ];
        const legend: LegendEntry<EnvelopeIds>[] = [
            ...(common.legend ?? []),
            ...(this.state.envelopeLinesShown !== false ? [{id: 'family' as const, label: message('envelope_lines_shown'), kind: 'line' as const, object: 'family'}] : []),
            ...(this.state.envelopeTouchShown !== false ? [{id: 'touch' as const, label: message('envelope_touch_shown'), kind: 'line' as const, object: 'touch'}] : []),
        ];
        const marks = this.curveViewMarks();
        return {
            ...common, parameters, legend,
            actions: [...(common.actions ?? []), {id: 'envelope-curve', label: message('envelope_curve_shown'), enabled: true, pressed: this.effectiveCurveShown(), placement: 'board', puck: true}],
            readouts: [{id: 'envelope', rows: this.readoutRows()}],
            notes: this.readoutNotes(),
            marks, followView: this.watchedBox(marks),
        };
    }

    /**
     * The box around what the learner watches: the control points (the family, the highlighted line and the touching point lie inside
     * their hull), grown by a fifth, with room above for the point labels. Without it the view director frames the lesson scene's box,
     * widened to the canvas aspect, inside the narrow card-free strip, and the curve shrinks to a speck.
     */
    private watchedBox(marks: ViewMarks): [number, number, number, number] | undefined {
        const points = marks.must.flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : []);
        if (points.length === 0) return undefined;
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.3);
        return [left - pad, top + 2 * pad, right + pad, bottom - pad];
    }

    /** The first family band stands for the family and the highlighted line for the touching line; the base owns the curve and its control points. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'family' && id !== 'touch') return super.drawnObject(id);
        const element = this.overlay?.ownedElements()[id === 'family' ? 0 : FAMILY_BANDS];
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('strokecolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    override performAction(id: string): void {
        if (id === 'envelope-curve') runAs('learner', () => this.setEnvelopeCurveShown(!this.effectiveCurveShown()));
        else super.performAction(id);
    }

    // ---- Controls --------------------------------------------------------------------------------------------------

    /** Structured editing does not render `getGraphCommands`, so the envelope has its own Edit group, first. */
    protected override workspaceEdit(): React.ReactNode {
        return <>{this.state.initialized && this.envelopeControls()}{super.workspaceEdit()}<LiveReadout readout={this.liveReadout}/></>;
    }

    private envelopeControls() {
        return <div className="inspector-group">
            <PuckOwned param="envelope-lines"><Slider min={ENVELOPE_LINES_MIN} max={ENVELOPE_LINES_MAX} step={1} value={this.effectiveCount()} customText={t("envelope_line_count")}
                    onChange={value => this.setEnvelopeLineCount(Math.round(value))}/></PuckOwned>
            <OnOffSwitch label={t("envelope_lines_shown")} checked={this.state.envelopeLinesShown !== false}
                         onChange={checked => this.setEnvelopeLinesShown(checked)}/>
            <PuckOwned param="envelope-curve"><OnOffSwitch label={t("envelope_curve_shown")} checked={this.effectiveCurveShown()}
                         onChange={checked => this.setEnvelopeCurveShown(checked)}/></PuckOwned>
            <OnOffSwitch label={t("envelope_touch_shown")} checked={this.state.envelopeTouchShown !== false}
                         onChange={checked => this.setEnvelopeTouchShown(checked)}/>
            <PuckOwned param="envelope-t"><Slider min={0} max={1} step={0.01} value={this.effectiveT()} customText={t("envelope_parameter_t")}
                    onChange={value => this.setEnvelopeT(value)}/></PuckOwned>
            <p className="inspector-help">{t("envelope_help")}</p>
            <p className="inspector-help">{t("envelope_measurement_note", {value0: String(ENVELOPE_LINES_MAX)})}</p>
        </div>;
    }
}

export default CurveEnvelopeGraph;
