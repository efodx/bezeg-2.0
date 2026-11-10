import React from "react";
import {currentLanguage, LocalizedError, message, renderMessage, t} from "../../../localization";
import {RefusalChannel, RefusalNotice} from "../../../inputs/RefusalChannel";
import Slider from "../../../inputs/Slider";
import {CountSetter} from "../../../inputs/CountSetter";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {LiveReadout} from "../../base/controls/LiveReadout";
import {useStatusReadout} from "../../base/controls/useStatusReadout";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import type {LessonCurveFixture} from "../../../learning/model";
import {Preset} from "../../base/presets/Presets";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {BSplineBasisScene} from "./BSplineBasisScene";
import {KnotEditor} from "./KnotEditor";
import {
    BASIS_MAX_DEGREE, BASIS_MIN_DEGREE, basisPresetData, basisViewBox, clampToDomain, DEFAULT_BASIS_DEGREE, DEFAULT_BASIS_KNOTS,
    DEFAULT_BASIS_T, domainNote, dragKnotEdit, editedKnots, isClamped, knotProblem, lastIndexOf, parameterView, placeholderPoints, readoutLines, rebuiltKnots,
} from "./bsplineBasisModel";

/** The visible readout lines and the graph's one announcement region; it is settled because a knot drag changes the text every frame. */
function BasisReadout({lines}: {lines: readonly string[]}) {
    const readout = useStatusReadout(lines.join(" "), true);
    return <>
        <div className="inspector-help">{lines.map((line, i) => <p key={i}>{line}</p>)}</div>
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
export class BSplineBasisGraph extends BaseGraph<BSplineBasisGraphState, BSplinePresetData> {
    private scene?: BSplineBasisScene;
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
        this.ensureScene();
    }

    /**
     * A figure scene replaces the scene state after its data import. The just-imported degree and knots win over the mount-time
     * defaults and over a stale stored state, since the plot keeps them in both the data and the state.
     */
    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): BSplineBasisGraphState {
        const merged = super.figurePresetGraphState(graphState);
        return {...merged, degree: this.state.degree, knots: [...this.state.knots]};
    }

    /** A Preset without a saved view is fitted to its knots (the saved view is applied before the data, so not in `importPresetData`). */
    override importPreset(preset: Preset) {
        super.importPreset(preset);
        if (!preset.boardState && preset.data) this.fit();
    }

    override initialize() {
        this.ensureScene();
        this.fit();
    }

    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new BSplineBasisScene({
            board: this.board,
            knots: () => this.state.knots,
            degree: () => this.state.degree,
            position: () => this.state.t,
            normalized: () => this.state.normalized,
            fontSize: () => this.displaySettings.fontSize,
            onKnotDrag: (index, raw) => this.dragKnot(index, raw),
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    private fit() {
        if (!this.board) return;
        this.board.setBoundingBox(basisViewBox(this.state.knots, this.state.degree, this.state.normalized), false);
        this.board.fullUpdate();
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

    protected override onStateChange(prevState: Readonly<BSplineBasisGraphState>) {
        if (prevState === this.state || !this.board) return;
        // A scene is built for one function and knot count; a degree or Preset change that alters either builds a new one.
        if (this.scene && !this.scene.fits(this.state.knots, this.state.degree)) this.ensureScene();
        else this.scene?.sync();
        const problem = knotProblem(this.state.knots, this.state.degree);
        if (problem) this.refusals.refuse(message("bsb_invalid_notice", {value0: renderMessage(problem)}));
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

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {degree, knots, normalized, t: position} = this.state;
        const problem = knotProblem(knots, degree);
        const language = currentLanguage();
        const view = problem ? undefined : parameterView(knots, degree, normalized);
        const lines = problem ? [] : readoutLines(knots, degree, position, normalized, language);
        return super.getGraphCommands().concat(
            <div key="degree"><CountSetter label={t("bsb_degree")} n={degree} min={BASIS_MIN_DEGREE} max={BASIS_MAX_DEGREE}
                                           onPlus={() => this.setDegree(degree + 1)} onMinus={() => this.setDegree(degree - 1)}
                                           onSet={value => this.setDegree(value)}/></div>,
            <div key="clamped"><OnOffSwitch checked={isClamped(knots, degree)} label={t("bsb_clamped")} onChange={checked => this.setClamped(checked)}/>
                <p className="inspector-help">{t("bsb_clamped_help")}</p></div>,
            <div key="normalize"><OnOffSwitch checked={normalized} label={t("bsb_normalize")} onChange={checked => this.setNormalized(checked)}/>
                <p className="inspector-help">{t("bsb_normalize_help")}</p></div>,
            ...(view ? [<div key="position"><Slider min={view.toDisplay(view.start)} max={view.toDisplay(view.end)} step={0.01}
                                                    value={view.toDisplay(clampToDomain(knots, degree, position))} customText={t("bsb_slider_t")}
                                                    help={t("bsb_slider_help")} onChange={value => this.setDisplayedT(value)}/></div>] : []),
            <div key="readout"><BasisReadout lines={problem ? [] : [...lines, domainNote(knots, degree, normalized, language)]}/></div>,
            <RefusalNotice key="refusal" channel={this.refusals}/>,
            <div key="knots"><KnotEditor knots={knots} onEdit={(index, value) => this.editKnot(index, value)}/></div>,
        );
    }
}

export default BSplineBasisGraph;
