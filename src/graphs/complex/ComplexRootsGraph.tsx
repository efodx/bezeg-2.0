import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel, LABEL_STYLE, LabelPlacement} from "../functions/BaseFunctionGraph";
import {FunctionStatus} from "../functions/FunctionStatus";
import {CountSetter} from "../../inputs/CountSetter";
import {PointListInput} from "../../inputs/PointListInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, messageNumber, renderMessage, t, type Message, type MessageNumber} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import type {FormattedValue, GraphDeclaration, ParameterDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {argumentValue, complexValueMessage} from "./complexValueMessage";
import {
    Complex, COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_STEP, complexArgument, complexModulus, isZero, snapComplexCoordinate,
} from "../../analysis/complex";
import {COMPLEX_ROOT_DEGREE_MAX, COMPLEX_ROOT_DEGREE_MIN, nthRoots, NthRootsResult} from "../../analysis/complexRoots";
import {
    COMPLEX_ROOTS_EXAMPLE_IDS, ComplexRootsExampleId, ComplexRootsModel, complexIntegerPower, DEFAULT_COMPLEX_ROOTS_MODEL,
    chooseComplexRootsExample, ComplexRootsEdit, moveRootsPoint, rootsModelPoints, RootsVisibilityField, setRootsDegree, setRootsVisibility, solvesRootEquation,
} from "../../analysis/complexRootsModel";
import {complexRootsEditMessage} from "./complexMessages";
import {formatArgument, formatComplex} from "../../analysis/complexFormat";
import {GraphPalette} from "../styles/GraphPalette";
import {complexRootsPresetCollection} from "./complexRootsPresets";
import {RevealButton} from "../../inputs/RevealButton";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";


const TEST_HIDDEN_HELP_ID = "complex-roots-test-hidden-help";

/** w and the test point z lie within 2*sqrt(2) of the origin and the roots within 2^(3/4) of it; a square of half-width 3.4 shows them all. */
const VIEW_HALF_WIDTH = 3.4;
const BOARD_VIEW: BoundingBox = [-VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, -VIEW_HALF_WIDTH];
const W_DASH = 2;
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇";
const ROOT_SLOTS = COMPLEX_ROOT_DEGREE_MAX;
const ORIGIN: Complex = {re: 0, im: 0};

type StatusKind = "predict" | "zero" | "on-cut" | "test-solves" | "test-fails";

/** The ids of the roots declaration: the degree is the one bound parameter; the three reveals are board switch pucks. */
export type ComplexRootsIds = {
    param: "n";
    row: "w" | "w-modulus" | "w-argument" | "degree" | "radius" | "roots" | `root-${number}` | "test" | "test-power" | "test-gap";
    note: never;
    legend: "w" | "roots" | "polygon" | "test";
    section: never;
    action: "roots" | "polygon" | "test";
};

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
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

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

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    /** Commits the next model of an edit, or throws the localized reason the model refused it. */
    private applyEdit(edit: ComplexRootsEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) throw new DomainError(complexRootsEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setExample(value: unknown): void {
        const edit = chooseComplexRootsExample(value);
        if (!edit.ok) throw new DomainError(complexRootsEditMessage(edit.issue));
        this.commitModel(edit.model);
    }

    /** Both coordinates of w in one commit (a drag moves both). */
    protected setW(re: number, im: number, options: { syncScene?: boolean } = {}): void {
        this.applyEdit(moveRootsPoint(this.model, "w", re, im), options);
    }

    /** Both coordinates of the test point z in one commit. */
    protected setTest(re: number, im: number, options: { syncScene?: boolean } = {}): void {
        this.applyEdit(moveRootsPoint(this.model, "z", re, im), options);
    }

    protected setDegree(value: number): void { this.applyEdit(setRootsDegree(this.model, value)); }

    protected setRootsVisible(visible: boolean): void { this.setVisibility("rootsVisible", visible); }

    protected setPolygonVisible(visible: boolean): void { this.setVisibility("polygonVisible", visible); }

    protected setTestVisible(visible: boolean): void { this.setVisibility("testVisible", visible); }

    private setVisibility(field: RootsVisibilityField, visible: boolean): void {
        const next = setRootsVisibility(this.model, field, visible);
        if (next !== this.model) this.commitModel(next);
    }

    /**
     * Lesson actions: the coordinates of w and of the test point z, the degree n, the three reveals and the named examples.
     */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "complex-w-re": value => this.setW(value, this.model.wIm), "complex-w-im": value => this.setW(this.model.wRe, value),
                "complex-z-re": value => this.setTest(value, this.model.zIm), "complex-z-im": value => this.setTest(this.model.zRe, value),
                n: value => this.setDegree(value),
            },
            visibility: {
                "complex-roots": visible => this.setRootsVisible(visible), "complex-polygon": visible => this.setPolygonVisible(visible),
                "complex-test": visible => this.setTestVisible(visible),
            },
            choices: {"complex-roots-example": value => this.setExample(value)},
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
        this.drawn.set("polygon", this.own(board.create("curve", [
            (angle: number) => polygonRadius() * Math.cos(angle), (angle: number) => polygonRadius() * Math.sin(angle), 0, 2 * Math.PI,
        ], {strokeColor: colors.root, strokeWidth: thin, dash: 3, highlight: false, fixed: true, withLabel: false, visible: polygonShown})));
        // One straight edge per slot; slot k joins root k to root k + 1 (mod n) and is used only for k < n.
        for (let k = 0; k < ROOT_SLOTS; k++) {
            const from = () => this.rootPoint(view(), k) ?? ORIGIN;
            const to = () => this.rootPoint(view(), (k + 1) % model().degree) ?? ORIGIN;
            this.own(board.create("curve", [(s: number) => from().re + s * (to().re - from().re), (s: number) => from().im + s * (to().im - from().im), 0, 1], {
                strokeColor: colors.root, strokeWidth, highlight: false, fixed: true, withLabel: false, doAdvancedPlot: false, numberPoints: 2,
                visible: () => polygonShown() && k < model().degree,
            }));
        }
        this.drawn.set("w", this.own(board.create("curve", [(s: number) => s * model().wRe, (s: number) => s * model().wIm, 0, 1], {
            strokeColor: colors.w, strokeWidth, dash: W_DASH, lastArrow: {type: 2, size: 6}, doAdvancedPlot: false, numberPoints: 2,
            highlight: false, fixed: true, withLabel: false, visible: () => !isZero(view().w),
        })));

        const markerSize = () => Math.max(5, this.displaySettings.pointSize * 1.1);
        // A root marker is fixed; an unused slot sits at the origin, hidden, never at NaN or Infinity.
        for (let k = 0; k < ROOT_SLOTS; k++) {
            const shown = () => model().rootsVisible && this.rootPoint(view(), k) !== undefined && k < model().degree;
            const marker = this.own(board.create("point", [() => this.rootPoint(view(), k)?.re ?? 0, () => this.rootPoint(view(), k)?.im ?? 0], {
                ...this.styles.point.fixed, name: `$$z_{${k}}$$`, face: "o", size: markerSize, fixed: true, visible: shown,
                label: this.complexPointLabel(() => outwardPlacement(this.rootPoint(view(), k) ?? ORIGIN), shown),
                fillColor: colors.root, highlightFillColor: colors.root, strokeColor: colors.root,
            }));
            if (k === 0) this.drawn.set("roots", marker as JXG.GeometryElement);
        }

        // The operands are dragged on the grid inside the square; the model is written once per drag event.
        const clamp = (value: number) => Math.min(COMPLEX_COORDINATE_MAX, Math.max(-COMPLEX_COORDINATE_MAX, value));
        const draggable = (name: string, face: string, color: string, start: Complex, shown: () => boolean, onDrag: (point: JXG.Point) => void) => {
            // The label placement is first evaluated while the point is being created, before `point` exists.
            const created: {point?: JXG.Point} = {};
            const position = (): Complex => created.point ? {re: created.point.X(), im: created.point.Y()} : start;
            const point = this.own(board.create("point", [start.re, start.im], {
                ...this.styles.point.default, name, face, size: markerSize, visible: shown,
                label: this.complexPointLabel(() => outwardPlacement(position()), shown),
                fillColor: color, highlightFillColor: color, strokeColor: GraphPalette.pointOutline,
            })) as JXG.Point;
            created.point = point;
            bindMovablePointCursor(point, this.board);
            point.on("drag", () => {
                if (!Number.isFinite(point.X()) || !Number.isFinite(point.Y())) return;
                onDrag(point);
            });
            return point;
        };
        this.pointZ = draggable("$$z$$", "<>", colors.test, {re: model().zRe, im: model().zIm}, () => model().testVisible, point => {
            runAs("learner", () => this.ignoreOutOfDomain(() => this.setTest(snapComplexCoordinate(clamp(point.X())), snapComplexCoordinate(clamp(point.Y())), {syncScene: false})));
            point.moveTo([model().zRe, model().zIm]);
        });
        this.drawn.set("test", this.pointZ);
        this.pointW = draggable("$$w$$", "[]", colors.w, {re: model().wRe, im: model().wIm}, () => true, point => {
            runAs("learner", () => this.ignoreOutOfDomain(() => this.setW(snapComplexCoordinate(clamp(point.X())), snapComplexCoordinate(clamp(point.Y())), {syncScene: false})));
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

        // w, n, the roots, the w = 0 case and the test point are declared rows and statuses; the board draws no caption.
    }

    protected override syncSceneToModel(): void {
        const {w, z} = rootsModelPoints(this.model);
        this.pointW?.moveTo([w.re, w.im]);
        this.pointZ?.moveTo([z.re, z.im]);
    }

    protected override onSceneRemoved(): void {
        this.pointW = undefined;
        this.pointZ = undefined;
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        return <>
            <div className="inspector-group">
                <PointListInput title={t("complex_roots_w_title")} points={[[state.wRe, state.wIm]]}
                                pointLabel={() => "w"} axisLabels={["Re", "Im"]}
                                min={-COMPLEX_COORDINATE_MAX} max={COMPLEX_COORDINATE_MAX} step={COMPLEX_COORDINATE_STEP} decimals={2}
                                onCommit={(_index, [re, im]) => this.ignoreOutOfDomain(() => this.setW(re, im))
                                    ? undefined : t("complex_coordinate_rejected_hint")}/>
            </div>
            <div className="inspector-group">
                <PuckOwned param="n">
                    <CountSetter label={t("complex_roots_degree_label")} n={state.degree} min={COMPLEX_ROOT_DEGREE_MIN} max={COMPLEX_ROOT_DEGREE_MAX}
                                 rejectedHint={t("complex_roots_degree_rejected_hint")}
                                 onPlus={() => this.ignoreOutOfDomain(() => this.setDegree(state.degree + 1))}
                                 onMinus={() => this.ignoreOutOfDomain(() => this.setDegree(state.degree - 1))}
                                 onSet={next => this.ignoreOutOfDomain(() => this.setDegree(next))}/>
                </PuckOwned>
                <p className="inspector-help">{t("complex_roots_fields_help")}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("complex_roots_example_label")} value={state.example} help={t("complex_roots_example_help")}
                              options={COMPLEX_ROOTS_EXAMPLE_IDS.map(id => ({value: id, text: exampleLabel(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group" data-complex-test-fields={state.testVisible ? "shown" : "hidden"}>
                <PointListInput title={t("complex_roots_test_title")} points={[[state.zRe, state.zIm]]}
                                pointLabel={() => "z"} axisLabels={["Re", "Im"]} describedBy={state.testVisible ? undefined : TEST_HIDDEN_HELP_ID}
                                min={-COMPLEX_COORDINATE_MAX} max={COMPLEX_COORDINATE_MAX} step={COMPLEX_COORDINATE_STEP} decimals={2}
                                onCommit={(_index, [re, im]) => this.ignoreOutOfDomain(() => this.setTest(re, im))
                                    ? undefined : t("complex_coordinate_rejected_hint")}/>
                {!state.testVisible && <p className="inspector-help" id={TEST_HIDDEN_HELP_ID}>{t("complex_roots_test_hidden_puck_help")}</p>}
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const state = this.model;
        const toggle = (action: string, param: string, shown: boolean, show: string, hide: string, set: (visible: boolean) => void) => (
            <PuckOwned param={param}>
                <RevealButton action={action} revealed={shown} showLabel={show} hideLabel={hide} onToggle={() => set(!shown)}/>
            </PuckOwned>
        );
        return <PuckOwnedGroup params={["roots", "polygon", "test"]}>
            <div className={CONTROL_ROW_FILL} role="group" aria-label={t("complex_roots_actions_label")}>
                {toggle("toggle-complex-roots", "roots", state.rootsVisible, t("complex_roots_show_roots"), t("complex_roots_hide_roots"), v => this.setRootsVisible(v))}
                {toggle("toggle-complex-polygon", "polygon", state.polygonVisible, t("complex_roots_show_polygon"), t("complex_roots_hide_polygon"), v => this.setPolygonVisible(v))}
                {toggle("toggle-complex-test", "test", state.testVisible, t("complex_roots_show_test"), t("complex_roots_hide_test"), v => this.setTestVisible(v))}
            </div>
            <p className="inspector-help">{t("complex_roots_reveal_help")}</p>
        </PuckOwnedGroup>;
    }

    /** A declared legend replaces the graph's own legend panel. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: ComplexRootsModel, view: View): { id: StatusKind; text: Message }[] {
        const result: { id: StatusKind; text: Message }[] = [];
        if (!model.rootsVisible) result.push({id: "predict", text: message("complex_roots_status_predict_puck")});
        if (view.result.kind === "zero") result.push({id: "zero", text: message("complex_roots_status_zero")});
        if (view.onCut) result.push({id: "on-cut", text: message("complex_roots_status_on_cut")});
        if (model.testVisible) {
            result.push(view.solves ? {id: "test-solves", text: message("complex_roots_status_test_solves")} : {id: "test-fails", text: message("complex_roots_status_test_fails")});
        }
        return result;
    }

    /** "a + bi; |z| = r, arg z = angle" for root `index`, or "0, multiplicity n" for the root of w = 0, as a message. */
    private rootValueMessage(view: View, index: number): Message {
        if (view.result.kind === "zero") return message("complex_roots_zero_value", {value0: String(view.result.multiplicity)});
        const root = view.result.kind === "roots" ? view.result.roots[index] : undefined;
        if (view.result.kind !== "roots" || root === undefined) return message("complex_undefined");
        return message("complex_roots_root_value", {
            value0: complexValueMessage(root.point), value1: messageNumber(view.result.radius, 4),
            value2: root.argument === undefined ? message("complex_undefined") : formatArgument(root.argument, this.language(), ""),
        });
    }

    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const hidden = message("complex_hidden");
        const radius = view.result.kind === "roots" ? view.result.radius : 0;
        const row = <Id extends ComplexRootsIds["row"]>(id: Id, name: Message, value: Message | MessageNumber | FormattedValue) => ({id, name, value});
        const rootRows = !model.rootsVisible
            ? [row("roots", message("complex_roots_readout_roots"), hidden)]
            : Array.from({length: view.result.kind === "zero" ? 1 : model.degree}, (_, k) =>
                row(`root-${k}` as const, message("complex_roots_readout_root", {value0: rootName(k)}), this.rootValueMessage(view, k)));
        const shownTest = (value: Message | MessageNumber) => model.testVisible ? value : hidden;
        return {
            rows: [
                row("w", message("complex_readout_w"), complexValueMessage(view.w)),
                row("w-modulus", message("complex_readout_w_modulus"), messageNumber(view.wModulus, 4)),
                row("w-argument", message("complex_readout_w_argument"), argumentValue(view.wArgument)),
                row("degree", message("complex_roots_readout_degree"), messageNumber(model.degree)),
                row("radius", message("complex_roots_readout_radius"), model.polygonVisible ? messageNumber(radius, 4) : hidden),
                ...rootRows,
                row("test", message("complex_roots_readout_test"), shownTest(complexValueMessage(view.z))),
                row("test-power", message("complex_roots_readout_test_power"), shownTest(complexValueMessage(view.power))),
                row("test-gap", message("complex_roots_readout_test_gap"), shownTest(messageNumber(view.gap, 4))),
            ],
            help: message("complex_roots_note"),
            status: this.statuses(model, view),
            // Everything the learner watches: w, the shown roots (within 2^(3/4) of the origin, inside the default square) and the test point while shown.
            must: [view.w, ...(model.rootsVisible ? Array.from({length: model.degree}, (_, k) => this.rootPoint(view, k)).flatMap(point => point ? [point] : []) : []),
                ...(model.testVisible ? [view.z] : [])].map(({re, im}) => ({x: re, y: im})),
        };
    }

    /** Parameter writes (ADR 0064): the lesson name is the key. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {n: {read: () => this.model.degree, apply: (value: number) => this.setDegree(value)}};
    }

    protected override declaration(): GraphDeclaration {
        const model = this.model;
        const view = this.viewOf(model);
        const parameters: ParameterDeclaration[] = [
            {key: "n", kind: "count", label: message("complex_roots_degree_name"), symbol: "n", placement: "board", min: COMPLEX_ROOT_DEGREE_MIN, max: COMPLEX_ROOT_DEGREE_MAX},
        ];
        const entry = <Id extends ComplexRootsIds["legend"]>(id: Id, label: Message, kind: "line" | "dashed" | "point") => ({id, label, kind, object: id});
        return {
            ...this.commonDeclaration(),
            parameters,
            legend: [
                ...(isZero(view.w) ? [] : [entry("w", message("complex_roots_key_w"), "dashed")]),
                ...(model.rootsVisible ? [entry("roots", message("complex_roots_key_roots"), "point")] : []),
                ...(model.polygonVisible && view.result.kind === "roots" ? [entry("polygon", message("complex_roots_key_polygon"), "line")] : []),
                ...(model.testVisible ? [entry("test", message("complex_roots_key_test"), "point")] : []),
            ],
            actions: [
                {id: "roots", label: message("complex_roots_puck_roots"), placement: "board", enabled: true, pressed: model.rootsVisible, puck: true},
                {id: "polygon", label: message("complex_roots_puck_polygon"), placement: "board", enabled: true, pressed: model.polygonVisible, puck: true},
                {id: "test", label: message("complex_roots_puck_test"), placement: "board", enabled: true, pressed: model.testVisible, puck: true},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "roots" || id === "test" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        const model = this.model;
        if (id === "roots") runAs("learner", () => this.setRootsVisible(!model.rootsVisible));
        else if (id === "polygon") runAs("learner", () => this.setPolygonVisible(!model.polygonVisible));
        else if (id === "test") runAs("learner", () => this.setTestVisible(!model.testVisible));
        else throw new Error("Unknown action");
    }

    protected renderReadout(): React.ReactNode {
        const panel = this.functionPanel();
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="demo-status" dataAttribute="complex-status" lines={(panel.status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default ComplexRootsGraph;
