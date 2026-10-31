import React from "react";
import BaseFunctionGraph, {COMPACT_BOARD_WIDTH, DomainError, FunctionLessonActions, LABEL_STYLE, LabelPlacement} from "../functions/BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "../functions/FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {
    Complex, COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_STEP, complexArgument, complexModulus, isComplexCoordinate, isZero, snapComplexCoordinate,
} from "../../analysis/complex";
import {COMPLEX_ROOT_DEGREE_MAX, COMPLEX_ROOT_DEGREE_MIN, isComplexRootDegree, nthRoots, NthRootsResult} from "../../analysis/complexRoots";
import {
    COMPLEX_ROOTS_EXAMPLE_IDS, COMPLEX_ROOTS_EXAMPLE_MODELS, ComplexRootsExampleId, ComplexRootsModel, complexIntegerPower, DEFAULT_COMPLEX_ROOTS_MODEL,
    isComplexRootsExampleId, rootsModelPoints, solvesRootEquation,
} from "../../analysis/complexRootsModel";
import {formatArgument, formatComplex} from "../../analysis/complexFormat";
import {GraphPalette} from "../styles/GraphPalette";
import {complexRootsPresetCollection} from "./complexRootsPresets";

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/** w and the test point z lie within 2*sqrt(2) of the origin and the roots within 2^(3/4) of it; a square of half-width 3.4 shows them all. */
const VIEW_HALF_WIDTH = 3.4;
const BOARD_VIEW: BoundingBox = [-VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, -VIEW_HALF_WIDTH];
const W_DASH = 2;
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇";
const ROOT_SLOTS = COMPLEX_ROOT_DEGREE_MAX;
const ORIGIN: Complex = {re: 0, im: 0};

type StatusKind = "predict" | "zero" | "on-cut" | "test-solves" | "test-fails";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    w: Complex;
    z: Complex;
    result: NthRootsResult;
    wModulus: number;
    wArgument: number | undefined;
    /** z^n of the test point. */
    power: Complex;
    /** |z^n - w| */
    gap: number;
    solves: boolean;
    /** w lies on the negative real axis, where the labelling of the roots jumps. */
    onCut: boolean;
}

const rootName = (index: number): string => `z${SUBSCRIPTS[index] ?? index}`;

const exampleLabel = (id: ComplexRootsExampleId): string => {
    switch (id) {
        case "two-i": return t("complex_roots_example_two_i");
        case "one-plus-i": return t("complex_roots_example_one_plus_i");
        case "negative-real": return t("complex_roots_example_negative_real");
        case "unity": return t("complex_roots_example_unity");
        case "zero": return t("complex_roots_example_zero");
    }
};

/** The label side that points away from the origin; a point at the origin gets the lower left. */
function outwardPlacement({re, im}: Complex): LabelPlacement {
    if (re === 0 && im === 0) return "below-left";
    if (re > 0) return im >= 0 ? "above-right" : "below-right";
    return im >= 0 ? "above-left" : "below-left";
}

/**
 * The solutions of z^n = w on the complex plane (complex maps lesson M2). The model is `ComplexRootsModel`
 * (`src/analysis/complexRootsModel`); the roots, the polygon radius, moduli, arguments, z^n and the verdict are recomputed from it with
 * the kernel `nthRoots` and never stored. `BaseFunctionGraph` provides the synchronous model, presets, lesson capture and restore, the
 * caption and owned objects. No state lives outside the model, so Reset, preset import and restore need no extra reset.
 *
 * Rules (reject, never clamp): w and the test point z are multiples of 0.05 in [-2, 2], the degree n is an integer in [2, 8]; values
 * within arithmetic noise of the grid are snapped, a real off-grid or out-of-range value is refused with a `DomainError` and the model
 * stays unchanged. Dragging projects the pointer onto the grid and limits it to the square (a pointer position, not an entered value).
 * Root k is |w|^(1/n) e^{i (Arg w + 2 pi k)/n} (see `complexRoots`). w = 0 has the one root 0 with multiplicity n: no polygon is
 * drawn and the status says so. No text or coordinate is ever NaN or Infinity.
 */
export class ComplexRootsGraph extends BaseFunctionGraph<ComplexRootsModel> {
    private pointW?: JXG.Point;
    private pointZ?: JXG.Point;

    override presetCollection() {
        return complexRootsPresetCollection;
    }

    protected defaultModel(): ComplexRootsModel {
        return {...DEFAULT_COMPLEX_ROOTS_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEW];
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    private viewOf(model: ComplexRootsModel): View {
        return this.memoView(model, () => {
            const {w, z} = rootsModelPoints(model);
            const power = complexIntegerPower(z, model.degree);
            return {
                w, z, result: nthRoots(w, model.degree), wModulus: complexModulus(w), wArgument: complexArgument(w),
                power, gap: complexModulus({re: power.re - w.re, im: power.im - w.im}), solves: solvesRootEquation(z, w, model.degree),
                onCut: w.im === 0 && w.re < 0,
            };
        });
    }

    /** The point of root `index` that is drawn: a root of w != 0, or the single root 0 (index 0) of w = 0; undefined for an unused slot. */
    private rootPoint(view: View, index: number): Complex | undefined {
        if (view.result.kind === "roots") return view.result.roots[index]?.point;
        return view.result.kind === "zero" && index === 0 ? view.result.root : undefined;
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    private coordinate(value: number): number {
        if (!isComplexCoordinate(value)) {
            throw new DomainError(`The coordinate must be a multiple of ${COMPLEX_COORDINATE_STEP} between ${-COMPLEX_COORDINATE_MAX} and ${COMPLEX_COORDINATE_MAX}.`);
        }
        return snapComplexCoordinate(value);
    }

    private write(patch: Partial<ComplexRootsModel>, options: { syncScene?: boolean } = {}): void {
        const model = this.model;
        const next: ComplexRootsModel = {...model, ...patch};
        if ((Object.keys(next) as (keyof ComplexRootsModel)[]).some(key => next[key] !== model[key])) this.commitModel(next, options);
    }

    protected setExample(value: unknown): void {
        if (!isComplexRootsExampleId(value)) throw new DomainError(`The example must be one of ${COMPLEX_ROOTS_EXAMPLE_IDS.join(", ")}.`);
        this.commitModel({...COMPLEX_ROOTS_EXAMPLE_MODELS[value]});
    }

    /** Both coordinates of w in one commit (a drag moves both). */
    protected setW(re: number, im: number, options: { syncScene?: boolean } = {}): void {
        this.write({wRe: this.coordinate(re), wIm: this.coordinate(im)}, options);
    }

    /** Both coordinates of the test point z in one commit. */
    protected setTest(re: number, im: number, options: { syncScene?: boolean } = {}): void {
        this.write({zRe: this.coordinate(re), zIm: this.coordinate(im)}, options);
    }

    protected setDegree(value: number): void {
        if (!isComplexRootDegree(value)) {
            throw new DomainError(`The degree must be an integer between ${COMPLEX_ROOT_DEGREE_MIN} and ${COMPLEX_ROOT_DEGREE_MAX}.`);
        }
        this.write({degree: value});
    }

    protected setRootsVisible(visible: boolean): void { this.write({rootsVisible: visible}); }

    protected setPolygonVisible(visible: boolean): void { this.write({polygonVisible: visible}); }

    protected setTestVisible(visible: boolean): void { this.write({testVisible: visible}); }

    /**
     * Lesson actions: the coordinates of w and of the test point z and the degree n. The reveals and the examples are set through the
     * inspector until the lesson task adds their names to the closed action-name sets of `src/learning/model.ts`.
     */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "complex-w-re": value => this.setW(value, this.model.wIm), "complex-w-im": value => this.setW(this.model.wRe, value),
                "complex-z-re": value => this.setTest(value, this.model.zIm), "complex-z-im": value => this.setTest(this.model.zRe, value),
                n: value => this.setDegree(value),
            },
        };
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private language(): NumberLanguage {
        return currentLanguage();
    }

    private modulusText(value: number): string {
        return formatNumber(value, this.language(), 4);
    }

    private argumentText(value: number | undefined): string {
        return formatArgument(value, this.language(), t("complex_undefined"));
    }

    /** "a + bi; |z| = r, arg z = angle" for root `index`, or "0, multiplicity n" for the root of w = 0. */
    private rootValue(view: View, index: number): string {
        if (view.result.kind === "zero") return t("complex_roots_zero_value", {value0: String(view.result.multiplicity)});
        if (view.result.kind !== "roots") return t("complex_undefined");
        const root = view.result.roots[index];
        if (root === undefined) return t("complex_undefined");
        return t("complex_roots_root_value", {
            value0: formatComplex(root.point, this.language()), value1: this.modulusText(view.result.radius), value2: this.argumentText(root.argument),
        });
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    private complexPointLabel(placement: () => LabelPlacement, pointVisible?: () => boolean): object {
        return {...this.pointLabel(placement, 0.8, pointVisible), cssClass: "complex-point-label"};
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.7);
        const colors = {w: GraphPalette.comparisonCurve, root: GraphPalette.primaryCurve, test: GraphPalette.additionalCurves[0]};
        const polygonShown = () => model().polygonVisible && view().result.kind === "roots";
        const polygonRadius = () => {
            const result = view().result;
            return result.kind === "roots" ? result.radius : 0;
        };

        // Layers, lowest first: the circle of the roots, the polygon edges, the arrow of w, the root markers, the draggable test z and w, the axis names.
        this.own(board.create("curve", [
            (angle: number) => polygonRadius() * Math.cos(angle), (angle: number) => polygonRadius() * Math.sin(angle), 0, 2 * Math.PI,
        ], {strokeColor: colors.root, strokeWidth: thin, dash: 3, highlight: false, fixed: true, withLabel: false, visible: polygonShown}));
        // One straight edge per slot; slot k joins root k to root k + 1 (mod n) and is used only for k < n.
        for (let k = 0; k < ROOT_SLOTS; k++) {
            const from = () => this.rootPoint(view(), k) ?? ORIGIN;
            const to = () => this.rootPoint(view(), (k + 1) % model().degree) ?? ORIGIN;
            this.own(board.create("curve", [(s: number) => from().re + s * (to().re - from().re), (s: number) => from().im + s * (to().im - from().im), 0, 1], {
                strokeColor: colors.root, strokeWidth, highlight: false, fixed: true, withLabel: false, doAdvancedPlot: false, numberPoints: 2,
                visible: () => polygonShown() && k < model().degree,
            }));
        }
        this.own(board.create("curve", [(s: number) => s * model().wRe, (s: number) => s * model().wIm, 0, 1], {
            strokeColor: colors.w, strokeWidth, dash: W_DASH, lastArrow: {type: 2, size: 6}, doAdvancedPlot: false, numberPoints: 2,
            highlight: false, fixed: true, withLabel: false, visible: () => !isZero(view().w),
        }));

        const markerSize = () => Math.max(5, this.displaySettings.pointSize * 1.1);
        // A root marker is fixed; an unused slot sits at the origin, hidden, never at NaN or Infinity.
        for (let k = 0; k < ROOT_SLOTS; k++) {
            const shown = () => model().rootsVisible && this.rootPoint(view(), k) !== undefined && k < model().degree;
            this.own(board.create("point", [() => this.rootPoint(view(), k)?.re ?? 0, () => this.rootPoint(view(), k)?.im ?? 0], {
                ...this.styles.point.fixed, name: `$$z_{${k}}$$`, face: "o", size: markerSize, fixed: true, visible: shown,
                label: this.complexPointLabel(() => outwardPlacement(this.rootPoint(view(), k) ?? ORIGIN), shown),
                fillColor: colors.root, highlightFillColor: colors.root, strokeColor: colors.root,
            }));
        }

        // The operands are dragged on the grid inside the square; the model is written once per drag event.
        const clamp = (value: number) => Math.min(COMPLEX_COORDINATE_MAX, Math.max(-COMPLEX_COORDINATE_MAX, value));
        const draggable = (name: string, face: string, color: string, start: Complex, shown: () => boolean, onDrag: (point: JXG.Point) => void) => {
            const point = this.own(board.create("point", [start.re, start.im], {
                ...this.styles.point.default, name, face, size: markerSize, visible: shown,
                label: this.complexPointLabel(() => outwardPlacement({re: point.X(), im: point.Y()}), shown),
                fillColor: color, highlightFillColor: color, strokeColor: GraphPalette.pointOutline,
            })) as JXG.Point;
            point.on("drag", () => {
                if (!Number.isFinite(point.X()) || !Number.isFinite(point.Y())) return;
                onDrag(point);
            });
            return point;
        };
        this.pointZ = draggable("$$z$$", "<>", colors.test, {re: model().zRe, im: model().zIm}, () => model().testVisible, point => {
            this.ignoreOutOfDomain(() => this.setTest(snapComplexCoordinate(clamp(point.X())), snapComplexCoordinate(clamp(point.Y())), {syncScene: false}));
            point.moveTo([model().zRe, model().zIm]);
        });
        this.pointW = draggable("$$w$$", "[]", colors.w, {re: model().wRe, im: model().wIm}, () => true, point => {
            this.ignoreOutOfDomain(() => this.setW(snapComplexCoordinate(clamp(point.X())), snapComplexCoordinate(clamp(point.Y())), {syncScene: false}));
            point.moveTo([model().wRe, model().wIm]);
        });

        const axisName = (text: string, x: () => number, y: () => number, anchorX: "left" | "right", anchorY: "top" | "bottom") =>
            this.own(board.create("text", [x, y, text], {
                anchorX, anchorY, fixed: true, highlight: false, parse: false, fontSize: () => this.displaySettings.fontSize, strokeColor: GraphPalette.label,
                cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE,
            }));
        const extent = () => board.getBoundingBox();
        axisName("Re", () => extent()[2] - 0.02 * (extent()[2] - extent()[0]), () => 0.01 * (extent()[1] - extent()[3]), "right", "bottom");
        axisName("Im", () => 0.015 * (extent()[2] - extent()[0]), () => extent()[1] - 0.02 * (extent()[1] - extent()[3]), "left", "top");

        // w and n, the indexed roots (or the word hidden, or the w = 0 line), the test point with z^n, and the key.
        const rootLines = Array.from({length: ROOT_SLOTS}, (_, k) => ({
            text: () => t("complex_roots_board_root", {value0: rootName(k), value1: formatComplex(this.rootPoint(view(), k) ?? ORIGIN, this.language())}),
            visible: () => model().rootsVisible && view().result.kind === "roots" && k < model().degree, minBoardWidth: COMPACT_BOARD_WIDTH, math: true,
        }));
        this.caption("bottom-left", [
            {text: () => t("complex_roots_board_operands", {value0: formatComplex(view().w, this.language()), value1: String(model().degree)}), scale: 1.15, math: true},
            {text: () => t("complex_roots_board_roots_hidden"), visible: () => !model().rootsVisible},
            {
                text: () => t("complex_roots_board_zero", {value0: String(model().degree)}),
                visible: () => model().rootsVisible && view().result.kind === "zero", math: true,
            },
            ...rootLines,
            {
                text: () => t("complex_roots_board_test", {value0: formatComplex(view().z, this.language()), value1: formatComplex(view().power, this.language())}),
                visible: () => model().testVisible, math: true,
            },
            {text: () => t("complex_roots_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {w, z} = rootsModelPoints(this.model);
        this.pointW?.moveTo([w.re, w.im]);
        this.pointZ?.moveTo([z.re, z.im]);
    }

    protected override onSceneRemoved(): void {
        this.pointW = undefined;
        this.pointZ = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const coordinate = (label: string, value: number, apply: (value: number) => void) => (
            <NumberInput label={label} value={value} min={-COMPLEX_COORDINATE_MAX} max={COMPLEX_COORDINATE_MAX} step={COMPLEX_COORDINATE_STEP} decimals={2}
                         rejectedHint={t("complex_coordinate_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => apply(next))}/>
        );
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("complex_roots_example_label")} value={state.example} help={t("complex_roots_example_help")}
                              options={COMPLEX_ROOTS_EXAMPLE_IDS.map(id => ({value: id, text: exampleLabel(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <div className="function-points-grid">
                    {coordinate(t("complex_w_re_label"), state.wRe, value => this.setW(value, this.model.wIm))}
                    {coordinate(t("complex_w_im_label"), state.wIm, value => this.setW(this.model.wRe, value))}
                    <NumberInput label={t("complex_roots_degree_label")} value={state.degree} min={COMPLEX_ROOT_DEGREE_MIN} max={COMPLEX_ROOT_DEGREE_MAX} step={1} decimals={0}
                                 rejectedHint={t("complex_roots_degree_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setDegree(next))}/>
                </div>
                <p className="inspector-help">{t("complex_roots_fields_help")}</p>
            </div>
            <div className="inspector-group" data-complex-test-fields={state.testVisible ? "shown" : "hidden"}>
                <div className="function-points-grid">
                    {coordinate(t("complex_z_re_label"), state.zRe, value => this.setTest(value, this.model.zIm))}
                    {coordinate(t("complex_z_im_label"), state.zIm, value => this.setTest(this.model.zRe, value))}
                </div>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const state = this.stateSnapshot();
        const toggle = (action: string, shown: boolean, show: string, hide: string, set: (visible: boolean) => void) => (
            <button type="button" data-action={action} data-revealed={shown} onClick={() => set(!shown)}>{shown ? hide : show}</button>
        );
        return <>
            <div className="demo-actions" role="group" aria-label={t("complex_roots_actions_label")}>
                {toggle("toggle-complex-roots", state.rootsVisible, t("complex_roots_show_roots"), t("complex_roots_hide_roots"), v => this.setRootsVisible(v))}
                {toggle("toggle-complex-polygon", state.polygonVisible, t("complex_roots_show_polygon"), t("complex_roots_hide_polygon"), v => this.setPolygonVisible(v))}
                {toggle("toggle-complex-test", state.testVisible, t("complex_roots_show_test"), t("complex_roots_hide_test"), v => this.setTestVisible(v))}
            </div>
            <p className="inspector-help">{t("complex_roots_reveal_help")}</p>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "w", color: GraphPalette.comparisonCurve, label: t("complex_legend_w"), kind: "dashed-line"},
            {id: "roots", color: GraphPalette.primaryCurve, label: t("complex_roots_legend_roots"), kind: "dot"},
            {id: "polygon", color: GraphPalette.primaryCurve, label: t("complex_roots_legend_polygon"), kind: "line"},
            {id: "test", color: GraphPalette.additionalCurves[0], label: t("complex_roots_legend_test"), kind: "ring"},
        ]}/>;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: ComplexRootsModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (!model.rootsVisible) result.push({id: "predict", text: t("complex_roots_status_predict")});
        if (view.result.kind === "zero") result.push({id: "zero", text: t("complex_roots_status_zero")});
        if (view.onCut) result.push({id: "on-cut", text: t("complex_roots_status_on_cut")});
        if (model.testVisible) {
            result.push(view.solves ? {id: "test-solves", text: t("complex_roots_status_test_solves")} : {id: "test-fails", text: t("complex_roots_status_test_fails")});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const language = this.language();
        const view = this.viewOf(model);
        const hidden = t("complex_hidden");
        const radius = view.result.kind === "roots" ? view.result.radius : 0;
        const rootRows = !model.rootsVisible
            ? [{id: "roots", label: t("complex_roots_readout_roots"), value: hidden}]
            : Array.from({length: view.result.kind === "zero" ? 1 : model.degree}, (_, k) => (
                {id: `root-${k}`, label: t("complex_roots_readout_root", {value0: rootName(k)}), value: this.rootValue(view, k)}
            ));
        const rows = [
            {id: "w", label: t("complex_readout_w"), value: formatComplex(view.w, language)},
            {id: "w-modulus", label: t("complex_readout_w_modulus"), value: this.modulusText(view.wModulus)},
            {id: "w-argument", label: t("complex_readout_w_argument"), value: this.argumentText(view.wArgument)},
            {id: "degree", label: t("complex_roots_readout_degree"), value: String(model.degree)},
            {id: "radius", label: t("complex_roots_readout_radius"), value: model.polygonVisible ? this.modulusText(radius) : hidden},
            ...rootRows,
            {id: "test", label: t("complex_roots_readout_test"), value: model.testVisible ? formatComplex(view.z, language) : hidden},
            {id: "test-power", label: t("complex_roots_readout_test_power"), value: model.testVisible ? formatComplex(view.power, language) : hidden},
            {id: "test-gap", label: t("complex_roots_readout_test_gap"), value: model.testVisible ? this.modulusText(view.gap) : hidden},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("complex_roots_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-complex-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default ComplexRootsGraph;
