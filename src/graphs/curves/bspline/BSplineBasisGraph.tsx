import type {StoredGraphState} from "../../base/presets/Presets";
import React from "react";
import {currentLanguage, LocalizedError, message, messageNumber, renderMessage, t} from "../../../localization";
import {multiplicity} from "../../../bezeg/impl/curve/bspline";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutNote, ReadoutRow, ViewMarks} from "../../base/declare/graphDeclaration";
import {DomainError} from "../../functions/BaseFunctionGraph";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {runAs} from "../../base/writes/writeSource";
import {RefusalChannel, RefusalNotice} from "../../../inputs/RefusalChannel";
import Slider from "../../../inputs/Slider";
import {CountSetter} from "../../../inputs/CountSetter";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {constructOrSweep, type SceneDeclaration} from "../../base/OwnedScene";
import {LiveReadout} from "../../base/controls/LiveReadout";
import {useStatusReadout} from "../../base/controls/useStatusReadout";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import type {LessonCurveFixture} from "../../../learning/model";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {BSplineBasisScene} from "./BSplineBasisScene";
import {basisCurveDash} from "../../styles/GraphPalette";
import {KnotEditor} from "./KnotEditor";
import {
    BASIS_MAX_DEGREE, BASIS_MIN_DEGREE, basisPresetData, basisViewBox, clampToDomain, DEFAULT_BASIS_DEGREE, DEFAULT_BASIS_KNOTS,
    DEFAULT_BASIS_T, domainNote, dragKnotEdit, editedKnots, isClamped, knotProblem, lastIndexOf, parameterView, placeholderPoints, readoutAt, readoutLines, rebuiltKnots,
} from "./bsplineBasisModel";

/**
 * The ids this graph declares: the parameter t (a board range puck, on the displayed axis) and the degree (a board count puck), the clamped
 * switch (a puck) and the four lines of the old panel: one row per active value N_{i,k} and their sum as rows, the heading and the domain as notes. The knot
 * list and the display toggle stay in Orodja; knots are dragged on the board. The legend names each basis function N_{i,k} (up to 12 entries) with its colour and dash.
 */
export type BSplineBasisIds = {
    param: 'basis-t' | 'basis-degree';
    row: 'fn0' | 'fn1' | 'fn2' | 'fn3' | 'fn4' | 'fn5' | 'fn6' | 'fn7' | 'fn8' | 'fn9' | 'fn10' | 'fn11' | 'sum';
    note: 'head' | 'domain';
    legend: 'fn0' | 'fn1' | 'fn2' | 'fn3' | 'fn4' | 'fn5' | 'fn6' | 'fn7' | 'fn8' | 'fn9' | 'fn10' | 'fn11';
    section: never;
    action: 'clamped';
};

/** The visible readout lines and the graph's one announcement region; it is settled because a knot drag changes the text every frame. */
function BasisReadout({lines}: {lines: readonly string[]}) {
    const readout = useStatusReadout(lines.join(" "), true);
    return <>
        <div className="inspector-help" data-declared-panel="">{lines.map((line, i) => <p data-readout-note key={i}>{line}</p>)}</div>
        <LiveReadout readout={readout} dataAttribute="bspline-basis-live"/>
    </>;
}

export interface BSplineBasisGraphState extends BaseGraphState {
    degree: number;
    /** Raw knots (ADR 0024); the number of basis functions is knots.length - degree - 1. */
    knots: readonly number[];
    /** Display toggle only: the domain is shown on [0, 1]; stored values stay raw. */
    normalized: boolean;
    /** Raw slider parameter; it is held inside the domain wherever it is read. */
    t: number;
}

const initialData = (): Omit<BSplineBasisGraphState, 'initialized'> =>
    ({degree: DEFAULT_BASIS_DEGREE, knots: [...DEFAULT_BASIS_KNOTS], normalized: false, t: DEFAULT_BASIS_T});

/**
 * B-spline basis plot (lesson L1): all n + 1 functions N_{i,k} over the domain from the kernel's `basisAll`, a slider t with the
 * k + 1 active values and their sum, a knot editor (typed list plus draggable markers on the t axis), the degree 1-3 and a clamped
 * toggle. It extends `BaseGraph` directly, like the interpolation graph: the scene state (degree, knots, display toggle, t) is the only
 * copy of the data and the one owned {@link BSplineBasisScene} reads it lazily. Preset data is the local B-spline collection's DTO
 * (the control points are placeholders; the basis does not depend on them). Registered as the `bspline-basis` Demonstration without a lesson yet.
 */
export class BSplineBasisGraph extends BaseGraph<BSplineBasisGraphState, BSplinePresetData, BSplineBasisScene> {
    /** The reason the last refused knot drag or typed value gave; cleared by an accepted one. */
    private readonly refusals = new RefusalChannel(() => this.requestRender());

    override getInitialState(): BSplineBasisGraphState {
        return {initialized: false, ...initialData()};
    }

    override presetCollection() {
        return bsplinePresetCollection;
    }

    defaultPreset(): BSplinePresetData {
        return basisPresetData(DEFAULT_BASIS_DEGREE, DEFAULT_BASIS_KNOTS);
    }

    override exportPresetData(): BSplinePresetData {
        return basisPresetData(this.state.degree, this.state.knots);
    }

    /**
     * A lesson curve fixture: its degree (the default degree if absent) and, when given, its `knots` as they are, with placeholder points
     * counted from the fixture points so the Preset collection check rejects a vector of the wrong length or order. Without `knots` the
     * point count gives a clamped uniform vector. The fixture points are otherwise not used.
     */
    protected override lessonFixtureData(curve: LessonCurveFixture): BSplinePresetData | undefined {
        const degree = curve.degree ?? DEFAULT_BASIS_DEGREE;
        if (curve.knots) return {degree, knots: [...curve.knots], points: placeholderPoints(curve.points.length)};
        return basisPresetData(degree, rebuiltKnots(degree, curve.points.length - 1, true));
    }

    /** Runs right after `importPresetData` for a lesson fixture or default scene: the imported degree and knots survive, the rest is fresh. */
    protected override lessonDefaultState(): BSplineBasisGraphState {
        const {degree, knots} = this.state;
        return {initialized: true, ...initialData(), degree, knots};
    }

    protected override get equalAxisUnits(): boolean {
        return false;
    }

    protected override initialView(): [number, number, number, number] {
        return basisViewBox(DEFAULT_BASIS_KNOTS, DEFAULT_BASIS_DEGREE, false);
    }

    protected override fitView(): [number, number, number, number] {
        return basisViewBox(this.state.knots, this.state.degree, this.state.normalized);
    }

    /** Rejects data the plot cannot draw before touching the state, then rebuilds the scene. */
    protected override consumerRefusal(data: BSplinePresetData) {
        if (data.degree < BASIS_MIN_DEGREE || data.degree > BASIS_MAX_DEGREE) return message("bsb_degree_out_of_range", {value0: BASIS_MAX_DEGREE});
        return knotProblem(data.knots, data.degree);
    }

    override importPresetData(data: BSplinePresetData) {
        const refusal = this.consumerRefusal(data);
        if (refusal) throw new LocalizedError(refusal);
        this.setState({degree: data.degree, knots: [...data.knots]});
    }

    /**
     * A figure scene replaces the scene state after its data import. The just-imported degree and knots win over the mount-time
     * defaults and over a stale stored state, since the plot keeps them in both the data and the state.
     */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined): BSplineBasisGraphState {
        const merged = super.figurePresetGraphState(graphState);
        return {...merged, degree: this.state.degree, knots: [...this.state.knots]};
    }

    /** A Preset without a saved view is fitted to its knots (the saved view is applied before the data, so not in `importPresetData`). */
    protected override fitPresetView(data: unknown) {
        if (data) this.fit();
    }

    /** The host builds the declared scene right after this; only the view is fitted here. */
    override initialize() {
        this.fit();
    }

    /** A scene is built for one function and knot count; a degree or Preset change that alters either rebuilds it (also on import and checkpoint restore). */
    protected override sceneDeclaration(): SceneDeclaration<BSplineBasisScene> {
        return {
            create: board => constructOrSweep(board, () => new BSplineBasisScene({
                board,
                knots: () => this.state.knots,
                degree: () => this.state.degree,
                position: () => this.state.t,
                normalized: () => this.state.normalized,
                fontSize: () => this.displaySettings.fontSize,
                onKnotDrag: (index, raw) => this.dragKnot(index, raw),
            })),
            sync: scene => {
                if (!scene.fits(this.state.knots, this.state.degree)) return false;
                scene.sync();
                return true;
            },
            dispose: scene => scene.dispose(),
        };
    }

    /** Test seam: the characterization tests read the live scene through it. */
    private get scene(): BSplineBasisScene | undefined {
        return this.ownedScene;
    }

    private fit() {
        if (!this.board) return;
        this.boardView.setIntent(basisViewBox(this.state.knots, this.state.degree, this.state.normalized), {keepAspectRatio: false});
        this.board.fullUpdate();
    }

    protected override onStateChange(prevState: Readonly<BSplineBasisGraphState>) {
        if (prevState === this.state || !this.board) return;
        const problem = knotProblem(this.state.knots, this.state.degree);
        if (problem) this.refusals.refuse(() => message("bsb_invalid_notice", {value0: problem}));
        this.boardUpdate();
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /** The number of basis functions n + 1 of the current vector. */
    get functionCount(): number {
        return lastIndexOf(this.state.knots, this.state.degree) + 1;
    }

    /** Sets the degree 1-3 and rebuilds a valid vector (clamped when it is now, else uniform) for the current number of functions. */
    setDegree(degree: number) {
        if (!Number.isInteger(degree) || degree < BASIS_MIN_DEGREE || degree > BASIS_MAX_DEGREE || degree === this.state.degree) return;
        const {knots, degree: before} = this.state;
        this.setState({degree, knots: rebuiltKnots(degree, lastIndexOf(knots, before), isClamped(knots, before))});
        this.fit();
    }

    /** Replaces the vector by the clamped uniform (true) or uniform (false) one for the current degree and function count. */
    setClamped(clamped: boolean) {
        const {knots, degree} = this.state;
        this.setState({knots: rebuiltKnots(degree, lastIndexOf(knots, degree), clamped)});
        this.fit();
    }

    setNormalized(normalized: boolean) {
        if (normalized === this.state.normalized) return;
        this.setState({normalized});
        this.fit();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        // The raw slider parameter t, held inside the current domain like the slider (the domain moves with the knots and the clamped toggle).
        registry.onDiscriminated('parameter', 't', action => {
            const {knots, degree} = this.state;
            if (knotProblem(knots, degree)) throw new Error('The knot vector is invalid, so there is no parameter.');
            if (!Number.isFinite(action.value)) throw new Error('The parameter t must be a finite number.');
            this.setState({t: clampToDomain(knots, degree, action.value)});
        });
    }

    /** Sets the slider by its displayed value (rescaled when the display toggle is on); it is held inside the domain. */
    setDisplayedT(shown: number) {
        if (!Number.isFinite(shown)) return;
        const {knots, degree, normalized} = this.state;
        if (knotProblem(knots, degree)) return;
        this.setState({t: clampToDomain(knots, degree, parameterView(knots, degree, normalized).toRaw(shown))});
    }

    /**
     * A drag of knot `index` towards a raw value: snapped, clamped between its neighbours (silent); a result that is not valid is
     * ignored and its reason shown (repeated drag frames do not announce it again). Returns whether the knots changed.
     */
    dragKnot(index: number, raw: number): boolean {
        const edit = dragKnotEdit(this.state.knots, this.state.degree, index, raw);
        if (edit === undefined) return false;
        if ('rejection' in edit) {
            this.refusals.refuse(edit.rejection);
            return false;
        }
        this.refusals.clear();
        this.setState({knots: edit.knots});
        return true;
    }

    /**
     * A typed knot value, checked by the kernel for this vector's own n. Returns the localized reason when refused (the state keeps
     * the previous vector), or undefined when accepted; an accepted knot outside the view refits it.
     */
    editKnot(index: number, value: number): string | undefined {
        if (!Number.isInteger(index) || index < 0 || index >= this.state.knots.length) return undefined;
        const edit = editedKnots(this.state.knots, this.state.degree, index, value);
        if ('rejection' in edit) return renderMessage(edit.rejection);
        this.refusals.clear();
        this.setState({knots: edit.knots});
        if (this.board) {
            const [left, , right] = this.board.getBoundingBox();
            const shown = parameterView(edit.knots, this.state.degree, this.state.normalized).toDisplay(value);
            if (shown < Math.min(left, right) || shown > Math.max(left, right)) this.fit();
        }
        return undefined;
    }

    // ---- Declaration -------------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064). `basis-t`: the slider by its displayed value; `basis-degree`: the degree through its setter. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'basis-t': {
                read: () => {
                    const {knots, degree, normalized, t: position} = this.state;
                    return knotProblem(knots, degree) ? position : parameterView(knots, degree, normalized).toDisplay(clampToDomain(knots, degree, position));
                },
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value)) throw new DomainError(message('bsbd_t_not_finite'));
                    this.setDisplayedT(value);
                },
            },
            'basis-degree': {
                read: () => this.state.degree,
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isInteger(value) || value < BASIS_MIN_DEGREE || value > BASIS_MAX_DEGREE) {
                        throw new DomainError(message('bsb_degree_out_of_range', {value0: BASIS_MAX_DEGREE}));
                    }
                    this.setDegree(value);
                },
            },
        };
    }

    /** The four lines of the old panel: the heading, the k + 1 active values (a sentence per count), their sum and the domain. Empty for an invalid vector. */
    private readoutReading() {
        const {knots, degree, normalized, t: position} = this.state;
        const reading = readoutAt(knots, degree, position);
        return reading ? {knots, degree, normalized, position, reading} : undefined;
    }

    /** One row per active function N_{i,k} (k + 1 of them) and their sum: a lesson step reads them, so they are rows, not folded notes. */
    private readoutRows(): ReadoutRow<BSplineBasisIds>[] {
        const state = this.readoutReading();
        if (!state) return [];
        const {degree, reading} = state;
        const active = reading.values.slice(0, 12 - reading.first).map((value, j): ReadoutRow<BSplineBasisIds> => ({
            id: `fn${reading.first + j}` as BSplineBasisIds['row'],
            name: message('bsbd_legend_fn', {value0: reading.first + j, value1: degree}),
            value: messageNumber(value, 4),
        }));
        return [...active, {id: 'sum', name: message('bsbd_sum_name'), value: messageNumber(reading.sum, 4)}];
    }

    private readoutNotes(): ReadoutNote<BSplineBasisIds>[] {
        const state = this.readoutReading();
        if (!state) return [];
        const {knots, degree, normalized, position} = state;
        const view = parameterView(knots, degree, normalized);
        return [
            {id: 'head', text: message('bsb_readout_head', {value0: messageNumber(view.toDisplay(clampToDomain(knots, degree, position)), 3), value1: degree})},
            {id: 'domain', text: message(normalized ? 'bsb_domain_text_normalized' : 'bsb_domain_text', {value0: messageNumber(view.start, 2), value1: messageNumber(view.end, 2)})},
        ];
    }

    /**
     * Pure data from the state. Board: the parameter t (moved while the values are read), the degree (switched to compare the bumps) and the
     * clamped switch (flipped to compare the vectors); the lesson steps that ask for them are named in the notes. Orodja: the display toggle and
     * the typed knot list. Without a valid knot vector nothing is declared but the empty readouts.
     */
    protected override declaration(): GraphDeclaration<BSplineBasisIds> {
        const {knots, degree, normalized} = this.state;
        const valid = !knotProblem(knots, degree);
        const parameters: ParameterDeclaration<BSplineBasisIds['param']>[] = [
            {key: 'basis-degree', kind: 'count', label: message('bsbd_degree_name'), symbol: 'k', placement: 'board', min: BASIS_MIN_DEGREE, max: BASIS_MAX_DEGREE},
        ];
        if (valid) {
            const view = parameterView(knots, degree, normalized);
            parameters.unshift({
                key: 'basis-t', kind: 'range', label: message('bsbd_param_name'), symbol: 't', help: message('bsb_slider_help'), placement: 'board',
                min: view.toDisplay(view.start), max: view.toDisplay(view.end), step: 0.01, maxDecimals: 2,
            });
        }
        const actions: ActionDeclaration<BSplineBasisIds>[] = [
            {id: 'clamped', label: message('bsbd_clamped_short'), help: message('bsb_clamped_help'), placement: 'board', puck: true, enabled: true, pressed: isClamped(knots, degree)},
        ];
        return {parameters, notes: this.readoutNotes(), readouts: [{id: 'basis', rows: this.readoutRows()}], legend: valid ? this.legendEntries() : [], actions, marks: this.viewMarks()};
    }

    /** One entry per basis function N_{i,k} (colour and dash as drawn), at most the 12 ids the declaration names. */
    private legendEntries(): LegendEntry<BSplineBasisIds>[] {
        const {degree} = this.state;
        return Array.from({length: Math.min(12, Math.max(0, this.functionCount))}, (_, i) => ({
            id: `fn${i}` as BSplineBasisIds['legend'],
            label: message('bsbd_legend_fn', {value0: i, value1: degree}),
            kind: basisCurveDash(i) === 0 ? 'line' as const : 'dashed' as const,
            object: `fn${i}`,
        }));
    }

    /** The curve a legend entry names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const match = /^fn(\d+)$/.exec(id);
        const curve = match ? this.scene?.curveElements()[Number(match[1])] : undefined;
        if (!curve) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = curve as typeof curve & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('strokecolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    /** What the view director keeps visible: the knot axis with its markers and labels and the unit height of the functions (must). */
    private viewMarks(): ViewMarks {
        const {knots, degree, normalized} = this.state;
        if (knotProblem(knots, degree) || !knots.every(Number.isFinite)) return {must: []};
        const view = parameterView(knots, degree, normalized);
        const shown = knots.map(view.toDisplay);
        const stack = Math.max(...knots.map(knot => multiplicity(knots, knot)));
        return {must: [{kind: 'box', left: Math.min(...shown), top: 1.05, right: Math.max(...shown), bottom: -0.1 - 0.07 * (stack - 1) - 0.2}]};
    }

    override performAction(id: string): void {
        if (id === 'clamped') runAs('learner', () => this.setClamped(!isClamped(this.state.knots, this.state.degree)));
        else throw new Error('Unknown action');
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {degree, knots, normalized, t: position} = this.state;
        const problem = knotProblem(knots, degree);
        const language = currentLanguage();
        const view = problem ? undefined : parameterView(knots, degree, normalized);
        const lines = problem ? [] : readoutLines(knots, degree, position, normalized, language);
        return super.getGraphCommands().concat(
            ...(view ? [<PuckOwned key="position" param="basis-t"><div><Slider min={view.toDisplay(view.start)} max={view.toDisplay(view.end)} step={0.01}
                                                    value={view.toDisplay(clampToDomain(knots, degree, position))} customText={t("bsb_slider_t")}
                                                    help={t("bsb_slider_help")} onChange={value => this.setDisplayedT(value)}/></div></PuckOwned>] : []),
            <div key="readout"><BasisReadout lines={problem ? [] : [...lines, domainNote(knots, degree, normalized, language)]}/></div>,
            <RefusalNotice key="refusal" channel={this.refusals}/>,
            <PuckOwned key="degree" param="basis-degree"><div><CountSetter label={t("bsb_degree")} n={degree} min={BASIS_MIN_DEGREE} max={BASIS_MAX_DEGREE}
                                           onPlus={() => this.setDegree(degree + 1)} onMinus={() => this.setDegree(degree - 1)}
                                           onSet={value => this.setDegree(value)}/></div></PuckOwned>,
            <PuckOwned key="clamped" param="clamped"><div><OnOffSwitch checked={isClamped(knots, degree)} label={t("bsb_clamped")} onChange={checked => this.setClamped(checked)}/>
                <p className="inspector-help">{t("bsb_clamped_help")}</p></div></PuckOwned>,
            <div key="normalize"><OnOffSwitch checked={normalized} label={t("bsb_normalize")} onChange={checked => this.setNormalized(checked)}/>
                <p className="inspector-help">{t("bsb_normalize_help")}</p></div>,
            <div key="knots"><KnotEditor knots={knots} onEdit={(index, value) => this.editKnot(index, value)}/></div>,
        );
    }
}

export default BSplineBasisGraph;
