import React from "react";
import {currentLanguage, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {LessonCurveFixture} from "../../../learning/model";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {BSplineBlossomScene} from "./BSplineBlossomScene";
import {isClamped, rebuiltKnots} from "./bsplineBasisModel";
import {ControlPoint, knotsForCount} from "./bsplineDeBoorModel";
import {
    assertBlossomCurve, BLOSSOM_ARG_STEP, BLOSSOM_DEFAULT_ARGS, BLOSSOM_DEGREES, BlossomSnapshot, blossomDomain, blossomPresetData, blossomSegments,
    blossomSnapshot, CurveCheck, curveCheck, defaultBlossomData, snapArgument,
} from "./bsplineBlossomModel";

export interface BSplineBlossomState extends BaseGraphState {
    degree: number;
    /** Raw knots (ADR 0024). */
    knots: readonly number[];
    points: readonly ControlPoint[];
    /** The chosen segment [u_j, u_{j+1}), by its index j. */
    segment: number;
    /** The arguments a, b, c of f; only the first `degree` are used. */
    args: readonly number[];
    showBezier: boolean;
}

const ARGUMENT_NAMES = ['a', 'b', 'c'] as const;

const initialData = (): Omit<BSplineBlossomState, 'initialized'> => {
    const {degree, knots, points} = defaultBlossomData();
    return {degree, knots, points, segment: blossomSegments(knots, degree)[0], args: [...BLOSSOM_DEFAULT_ARGS], showBezier: true};
};

/**
 * Blossom graph (lesson L6): draggable control points, the B-spline curve, the blossom f of one chosen segment evaluated at the
 * arguments a, b (and c for degree 3) by the kernel's triangle, and optionally the segment's Bezier points. The scene state (degree,
 * knots, points, segment, arguments) is the only copy of the data; the owned {@link BSplineBlossomScene} reads it lazily. It offers
 * degree 2 and 3 only. Its Preset collection is `bsplinePresetCollection`; a degree other than 2 or 3 is refused on import.
 */
export class BSplineBlossomGraph extends BaseGraph<BSplineBlossomState, BSplinePresetData> {
    private scene?: BSplineBlossomScene;

    override getInitialState(): BSplineBlossomState {
        return {initialized: false, ...initialData()};
    }

    override presetCollection() {
        return bsplinePresetCollection;
    }

    defaultPreset(): BSplinePresetData {
        return blossomPresetData(defaultBlossomData());
    }

    override exportPresetData(): BSplinePresetData {
        return blossomPresetData(this.state);
    }

    /** A lesson curve fixture: its points and degree (2 or 3; the default degree if absent) on the given knots, else on the clamped uniform vector. */
    protected override lessonFixtureData(curve: LessonCurveFixture): BSplinePresetData | undefined {
        const degree = curve.degree ?? this.defaultPreset().degree;
        return {degree, knots: curve.knots ? [...curve.knots] : knotsForCount(degree, true, curve.points.length), points: curve.points.map(point => [point[0], point[1]] as const)};
    }

    /** Runs right after `importPresetData` for a lesson fixture or default scene: the imported curve survives, the rest is fresh. */
    protected override lessonDefaultState(): BSplineBlossomState {
        const {degree, knots, points} = this.state;
        return {initialized: true, ...initialData(), ...this.freshChoice(degree, knots, points)};
    }

    /** The first segment, the default arguments held in the domain, the Bezier points shown. */
    private freshChoice(degree: number, knots: readonly number[], points: readonly ControlPoint[]) {
        const [start, end] = blossomDomain(knots, degree);
        return {degree, knots, points, segment: blossomSegments(knots, degree)[0],
            args: BLOSSOM_DEFAULT_ARGS.map(a => Math.min(end, Math.max(start, a))), showBezier: true};
    }

    /** Refuses data the graph cannot show (degree other than 2 or 3 included) before touching the state. */
    override importPresetData(data: BSplinePresetData) {
        assertBlossomCurve(data);
        const points = data.points.map(point => [point[0], point[1]] as const);
        this.setState(this.freshChoice(data.degree, [...data.knots], points));
        this.ensureScene();
    }

    /**
     * The just-imported curve wins over the mount-time defaults and over a stale stored curve; the stored segment, arguments
     * and Bezier switch stay, as loading the Preset keeps them.
     */
    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): BSplineBlossomState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points} = this.state;
        return {...merged, degree, knots: [...knots], points: points.map(point => [point[0], point[1]] as const)};
    }

    protected override initialView(): [number, number, number, number] {
        return [-1.5, 3.5, 5.5, -1.5];
    }

    override initialize() {
        this.ensureScene();
    }

    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new BSplineBlossomScene({
            board: this.board,
            degree: () => this.state.degree,
            knots: () => this.state.knots,
            points: () => this.state.points,
            segment: () => this.state.segment,
            args: () => this.state.args,
            showBezier: () => this.state.showBezier,
            fontSize: () => this.displaySettings.fontSize,
            onPointsDrag: points => this.setState({points}),
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
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

    protected override onStateChange(prevState: Readonly<BSplineBlossomState>) {
        if (prevState === this.state || !this.board) return;
        const {state} = this;
        if (this.scene && !this.scene.fits(state.degree, state.points.length)) this.ensureScene();
        else this.scene?.sync();
        this.boardUpdate();
    }

    // ---- Readouts ----------------------------------------------------------------------------------------------------

    /** f(args) with its triangle, Bezier points and symmetry data from the state, or undefined when it cannot be computed. */
    snapshot(): BlossomSnapshot | undefined {
        const {knots, degree, points, segment, args} = this.state;
        return blossomSnapshot(knots, degree, points, segment, args);
    }

    /** The curve-point comparison when all arguments are equal, else undefined. */
    curveCheck(): CurveCheck | undefined {
        const {knots, degree, points, segment, args} = this.state;
        return curveCheck(knots, degree, points, segment, args);
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /** Sets the degree (2 or 3) and rebuilds a valid vector of the same kind for the current points; the segment and arguments are held in the new domain. */
    setDegree(degree: number) {
        const {points, knots, args} = this.state;
        if (!BLOSSOM_DEGREES.includes(degree) || degree === this.state.degree || points.length < degree + 1) return;
        const rebuilt = rebuiltKnots(degree, points.length - 1, isClamped(knots, this.state.degree));
        const [start, end] = blossomDomain(rebuilt, degree);
        this.setState({degree, knots: rebuilt, segment: blossomSegments(rebuilt, degree)[0], args: args.map(a => Math.min(end, Math.max(start, a)))});
    }

    /** Chooses the segment [u_j, u_{j+1}) by its index; an empty or unknown span is ignored. */
    setSegment(segment: number) {
        const {knots, degree} = this.state;
        if (!blossomSegments(knots, degree).includes(segment) || segment === this.state.segment) return;
        this.setState({segment});
    }

    /** Sets argument `index` (0 = a); it is rounded to 1e-10 and held in the domain. */
    setArgument(index: number, value: number) {
        const {knots, degree, args} = this.state;
        if (!Number.isInteger(index) || index < 0 || index >= degree) return;
        const snapped = snapArgument(knots, degree, value);
        if (snapped === undefined || snapped === args[index]) return;
        this.setState({args: args.map((a, i) => i === index ? snapped : a)});
    }

    setShowBezier(show: boolean) {
        this.setState({showBezier: show});
    }

    /** Back to the default curve, segment, arguments and Bezier points. */
    resetToDefaults() {
        this.setState(initialData());
        this.ensureScene();
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    private pointText(point: readonly number[]): string {
        const language = currentLanguage();
        return `(${formatNumber(point[0], language, 3)}; ${formatNumber(point[1], language, 3)})`;
    }

    private readoutLines(): JSX.Element[] {
        const {degree, knots, segment, args} = this.state;
        const language = currentLanguage();
        const num = (v: number) => formatNumber(v, language, 3);
        const list = (values: readonly number[]) => values.map(num).join(', ');
        const used = args.slice(0, degree);
        const snap = this.snapshot();
        if (!snap) return [];
        const lines: JSX.Element[] = [
            <p key="value" data-blossom-readout="value">{t("bsl_value", {value0: list(used), value1: num(snap.value[0]), value2: num(snap.value[1])})}</p>,
            <p key="reversed" data-blossom-readout="reversed">{t("bsl_reversed", {value0: list([...used].reverse()), value1: num(snap.reversed[0]), value2: num(snap.reversed[1])})}</p>,
            <p key="symmetry" data-blossom-readout="symmetry">{t("bsl_symmetry", {value0: snap.deviation === 0 ? '0' : snap.deviation.toExponential(2)})}</p>,
            <p key="bezier" data-blossom-readout="bezier">{t("bsl_bezier_points", {value0: snap.bezier.map(p => this.pointText(p)).join("   ")})}</p>,
        ];
        const check = this.curveCheck();
        if (check) {
            const [value0, value1, value2] = [num(check.t), num(check.curve[0]), num(check.curve[1])];
            const text = check.relation === 'equal' ? t("bsl_curve_equal", {value0, value1, value2})
                : check.relation === 'break' ? t("bsl_curve_break", {value0, value1, value2})
                    : check.relation === 'coincides' ? t("bsl_curve_coincides", {value0, value1, value2, value3: num(knots[segment]), value4: num(knots[segment + 1])})
                        : t("bsl_curve_extended", {value0, value1, value2, value3: num(knots[segment]), value4: num(knots[segment + 1])});
            lines.push(<p key="curve" data-blossom-readout="curve" data-blossom-relation={check.relation}>{text}</p>);
        }
        return lines;
    }

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {degree, knots, points, segment, args, showBezier} = this.state;
        const [start, end] = blossomDomain(knots, degree);
        const language = currentLanguage();
        const num = (v: number) => formatNumber(v, language, 3);
        return super.getGraphCommands().concat(
            <div key="degree"><ChoiceSelect label={t("bsb_degree")} value={String(degree)}
                                            options={BLOSSOM_DEGREES.filter(d => points.length >= d + 1).map(d => ({value: String(d), text: String(d)}))}
                                            onChange={value => this.setDegree(Number(value))}/></div>,
            <div key="segment"><ChoiceSelect label={t("bsl_segment")} value={String(segment)}
                                             options={blossomSegments(knots, degree).map(j => ({
                                                 value: String(j), text: t("bsl_segment_option", {value0: num(knots[j]), value1: num(knots[j + 1])}),
                                             }))}
                                             onChange={value => this.setSegment(Number(value))}/></div>,
            <div key="args" className="inspector-group" role="group" aria-labelledby="bsl-title">
                <h3 id="bsl-title">{t("bsl_title")}</h3>
                {args.slice(0, degree).map((value, i) =>
                    <Slider key={`${degree}-${i}`} min={start} max={end} step={BLOSSOM_ARG_STEP} decimals={2} value={Math.min(end, Math.max(start, value))}
                            customText={t("bsl_arg", {value0: ARGUMENT_NAMES[i]})} onChange={v => this.setArgument(i, v)}/>)}
                <p className="inspector-help">{t("bsl_arg_help")}</p>
                {this.readoutLines()}
            </div>,
            <div key="bezier"><OnOffSwitch checked={showBezier} label={t("bsl_bezier")} onChange={show => this.setShowBezier(show)}/></div>,
            <div key="reset" className="inspector-playback">
                <button type="button" data-action="reset" onClick={() => this.resetToDefaults()}>{t("bsl_reset")}</button>
            </div>,
        );
    }
}

export default BSplineBlossomGraph;
