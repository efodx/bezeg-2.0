import type {StoredGraphState} from "../../base/presets/Presets";
import React from "react";
import {currentLanguage, t} from "../../../localization";
import {formatNumber, formatScientific} from "../../../analysis/format";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {CountSetter} from "../../../inputs/CountSetter";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {LessonAction, LessonCurveFixture} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {constructOrSweep, type SceneDeclaration} from "../../base/OwnedScene";
import {BSplineBlossomScene} from "./BSplineBlossomScene";
import {BSplinePointList} from "./BSplinePointList";
import {isClamped, rebuiltKnots} from "./bsplineBasisModel";
import {ControlPoint, knotsForCount} from "./bsplineDeBoorModel";
import {
    assertBlossomCurve, blossomRejection, BLOSSOM_ARG_STEP, BLOSSOM_DEFAULT_ARGS, BLOSSOM_DEGREES, BlossomSnapshot, blossomDomain, blossomPresetData, blossomSegments,
    blossomSnapshot, CurveCheck, curveCheck, defaultBlossomData, snapArgument,
    blossomArgumentText,
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
export class BSplineBlossomGraph extends BaseGraph<BSplineBlossomState, BSplinePresetData, BSplineBlossomScene> {
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

    protected override consumerRefusal(data: BSplinePresetData) {
        return blossomRejection(data);
    }

    /** Refuses data the graph cannot show (degree other than 2 or 3 included) before touching the state. */
    override importPresetData(data: BSplinePresetData) {
        assertBlossomCurve(data);
        const points = data.points.map(point => [point[0], point[1]] as const);
        this.setState(this.freshChoice(data.degree, [...data.knots], points));
        this.rebuildOwnedScene();
    }

    /**
     * The just-imported curve wins over the mount-time defaults and over a stale stored curve; the stored segment, arguments
     * and Bezier switch stay, as loading the Preset keeps them.
     */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined): BSplineBlossomState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points} = this.state;
        return {...merged, degree, knots: [...knots], points: points.map(point => [point[0], point[1]] as const)};
    }

    protected override initialView(): [number, number, number, number] {
        return [-1.5, 3.5, 5.5, -1.5];
    }

    /** The host builds the declared scene right after this; nothing else is initialized. */
    override initialize() {
    }

    /** The scene reads the state lazily; its knots and points are synchronized, a changed degree or point count rebuilds it. */
    protected override sceneDeclaration(): SceneDeclaration<BSplineBlossomScene> {
        return {
            create: board => constructOrSweep(board, () => new BSplineBlossomScene({
                board,
                degree: () => this.state.degree,
                knots: () => this.state.knots,
                points: () => this.state.points,
                segment: () => this.state.segment,
                args: () => this.state.args,
                showBezier: () => this.state.showBezier,
                fontSize: () => this.displaySettings.fontSize,
                onPointsDrag: points => this.setState({points}),
            })),
            sync: scene => {
                const {degree, points} = this.state;
                if (!scene.fits(degree, points.length)) return false;
                scene.sync();
                return true;
            },
            dispose: scene => scene.dispose(),
        };
    }

    /** Test seam: the characterization tests read the live scene through it. */
    private get scene(): BSplineBlossomScene | undefined {
        return this.ownedScene;
    }

    protected override onStateChange(prevState: Readonly<BSplineBlossomState>) {
        if (prevState === this.state || !this.board) return;
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

    /** A typed control point (the same path as a board drag); the caller keeps coordinates inside the curve limit. */
    editPoint(index: number, value: ControlPoint) {
        const {points} = this.state;
        if (!Number.isInteger(index) || index < 0 || index >= points.length) return;
        this.setState({points: points.map((point, i) => i === index ? value : point)});
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
        this.rebuildOwnedScene();
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('blossom', action => this.applyBlossomAction(action));
    }

    /** Applies one `blossom` scene action through the setters the controls use; invalid input throws (the lesson content is wrong). */
    private applyBlossomAction(action: Extract<LessonAction, {kind: 'blossom'}>): void {
        switch (action.operation) {
            case 'set-degree':
                if (!BLOSSOM_DEGREES.includes(action.degree)) throw new Error(`The blossom is offered for degree 2 and 3, not ${String(action.degree)}.`);
                this.setDegree(action.degree);
                if (this.state.degree !== action.degree) throw new Error(`The curve cannot have degree ${action.degree}.`);
                break;
            case 'set-segment':
                if (!blossomSegments(this.state.knots, this.state.degree).includes(action.segment)) throw new Error(`There is no segment ${String(action.segment)}.`);
                this.setSegment(action.segment);
                break;
            case 'set-args': {
                const {knots, degree} = this.state;
                if (action.args.length !== degree) throw new Error(`The blossom of degree ${degree} takes ${degree} arguments.`);
                const [start, end] = blossomDomain(knots, degree);
                if (!action.args.every(a => Number.isFinite(a) && a >= start && a <= end)) throw new Error(`The arguments must lie in [${start}, ${end}].`);
                action.args.forEach((value, index) => this.setArgument(index, value));
                break;
            }
            case 'set-bezier':
                if (typeof action.visible !== 'boolean') throw new Error('The Bezier points must be shown or hidden with a boolean.');
                this.setShowBezier(action.visible);
                break;
            default:
                this.resetToDefaults();
        }
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
        const used = args.slice(0, degree);
        const snap = this.snapshot();
        if (!snap) return [];
        const lines: JSX.Element[] = [
            <p key="value" data-blossom-readout="value">{t("bsl_value", {value0: blossomArgumentText(used), value1: num(snap.value[0]), value2: num(snap.value[1])})}</p>,
            <p key="reversed" data-blossom-readout="reversed">{t("bsl_reversed", {value0: blossomArgumentText([...used].reverse()), value1: num(snap.reversed[0]), value2: num(snap.reversed[1])})}</p>,
            <p key="symmetry" data-blossom-readout="symmetry">{t("bsl_symmetry", {value0: formatScientific(snap.deviation, language, 3)})}</p>,
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
        const maxDegree = Math.min(BLOSSOM_DEGREES[BLOSSOM_DEGREES.length - 1], points.length - 1);
        return super.getGraphCommands().concat(
            <div key="degree"><CountSetter label={t("bsb_degree")} n={degree} min={BLOSSOM_DEGREES[0]} max={maxDegree}
                                           maxReason={maxDegree < BLOSSOM_DEGREES[BLOSSOM_DEGREES.length - 1] ? t("bsp_degree_needs_points", {value0: points.length, value1: maxDegree}) : undefined}
                                           onPlus={() => this.setDegree(degree + 1)} onMinus={() => this.setDegree(degree - 1)}
                                           onSet={value => this.setDegree(value)}/></div>,
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
            <div key="points"><BSplinePointList points={points} onEdit={(index, value) => this.editPoint(index, value)}/></div>,
        );
    }
}

export default BSplineBlossomGraph;
