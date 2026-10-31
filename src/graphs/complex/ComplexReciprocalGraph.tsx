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
import {circleInversion, circlePosition, CirclePosition} from "../../analysis/complexMobius";
import {complexConjugate, complexDivide, complexReciprocal} from "../../analysis/complexReciprocal";
import {
    COMPLEX_RECIPROCAL_EXAMPLE_IDS, COMPLEX_RECIPROCAL_EXAMPLE_MODELS, ComplexReciprocalExampleId, ComplexReciprocalModel, DEFAULT_COMPLEX_RECIPROCAL_MODEL,
    INVERSION_RADIUS_MAX, INVERSION_RADIUS_MIN, isComplexReciprocalExampleId, isInversionRadius, reciprocalModelPoints, snapInversionRadius,
} from "../../analysis/complexReciprocalModel";
import {formatArgument, formatComplex} from "../../analysis/complexFormat";
import {GraphPalette} from "../styles/GraphPalette";
import {complexReciprocalPresetCollection} from "./complexReciprocalPresets";

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/** Operands and the whole inversion circle (centre and radius up to 2) lie within 4 of the origin; a square of half-width 4.5 shows them. */
const VIEW_HALF_WIDTH = 4.5;
const BOARD_VIEW: BoundingBox = [-VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, -VIEW_HALF_WIDTH];
const W_DASH = 2;
const INVERSION_DASH = 3;
const LABEL_CROWDING = 0.45;

type OperandName = "z" | "w";
type StatusKind = "predict" | "z-zero" | "inside" | "outside" | "on-circle" | "centre-pole" | "off-view";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    z: Complex;
    w: Complex;
    centre: Complex;
    conjugate: Complex;
    /** undefined at z = 0 */
    reciprocal: Complex | undefined;
    quotient: Complex | undefined;
    /** The image of z in the inversion circle; undefined at the centre (the pole). */
    inversion: Complex | undefined;
    zModulus: number;
    wModulus: number;
    zArgument: number | undefined;
    wArgument: number | undefined;
    reciprocalArgument: number | undefined;
    quotientArgument: number | undefined;
    /** Where z lies with respect to the unit circle, decided exactly in grid units; undefined at z = 0. */
    position: CirclePosition | undefined;
    /** The names of the shown results (1/z, w/z, inversion image) that lie outside the default view. */
    outsideDefaultView: string[];
}

const exampleLabel = (id: ComplexReciprocalExampleId): string => {
    switch (id) {
        case "outside": return t("complex_recip_example_outside");
        case "inside": return t("complex_recip_example_inside");
        case "unit-circle": return t("complex_recip_example_unit_circle");
        case "division": return t("complex_recip_example_division");
        case "zero": return t("complex_recip_example_zero");
    }
};

/** The label side that points away from the origin; a point at the origin gets the lower left. */
function outwardPlacement({re, im}: Complex): LabelPlacement {
    if (re === 0 && im === 0) return "below-left";
    if (re > 0) return im >= 0 ? "above-right" : "below-right";
    return im >= 0 ? "above-left" : "below-left";
}

const OTHER_PLACEMENT: Readonly<Record<string, LabelPlacement>> = {
    "above-right": "below-right", "below-right": "above-right", "above-left": "below-left", "below-left": "above-left",
};

const outsideBox = (point: Complex, [left, top, right, bottom]: BoundingBox | number[]): boolean =>
    point.re < left || point.re > right || point.im < bottom || point.im > top;

/**
 * Conjugate, reciprocal and division on the complex plane (complex maps lesson M1). The model is `ComplexReciprocalModel`
 * (`src/analysis/complexReciprocalModel`); the conjugate, 1/z, w/z, moduli, arguments and the circle inversion are recomputed from it
 * with the kernels in `src/analysis` and never stored. `BaseFunctionGraph` provides the synchronous model, presets, lesson capture and
 * restore, the caption and owned objects.
 *
 * Rules (reject, never clamp): every operand and centre coordinate is a multiple of 0.05 in [-2, 2], the radius a multiple of 0.05 in
 * [0.05, 2]; values within arithmetic noise of the grid are snapped, a real off-grid or out-of-range value is refused with a
 * `DomainError` and the model stays unchanged. Dragging projects the pointer onto the grid and limits it to the square (a pointer
 * position, not an entered value). z = 0 has no reciprocal: 1/z and w/z are "undefined" in every text and are not drawn, and the
 * status says so. The circle inversion has no image at its centre. No text or coordinate is ever NaN or Infinity.
 */
export class ComplexReciprocalGraph extends BaseFunctionGraph<ComplexReciprocalModel> {
    private pointZ?: JXG.Point;
    private pointW?: JXG.Point;
    private pointCentre?: JXG.Point;
    private pointRadius?: JXG.Point;
    /** The direction (radians) in which the radius handle sits on the circle; it follows the drag and is 0 after anything else. */
    private handleAngle = 0;

    override presetCollection() {
        return complexReciprocalPresetCollection;
    }

    protected defaultModel(): ComplexReciprocalModel {
        return {...DEFAULT_COMPLEX_RECIPROCAL_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEW];
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    private viewOf(model: ComplexReciprocalModel): View {
        return this.memoView(model, () => {
            const {z, w, centre} = reciprocalModelPoints(model);
            const reciprocal = complexReciprocal(z);
            const quotient = complexDivide(w, z);
            // circleInversion throws on a bad radius; the model guarantees a grid radius, and the guard keeps a corrupt model from throwing here.
            const inverted = isInversionRadius(model.radius) ? circleInversion(z, centre, model.radius) : undefined;
            const inversion = inverted?.kind === "point" ? inverted.point : undefined;
            const outside: string[] = [];
            if (model.reciprocalVisible && reciprocal && outsideBox(reciprocal, BOARD_VIEW)) outside.push("1/z");
            if (model.quotientVisible && quotient && outsideBox(quotient, BOARD_VIEW)) outside.push("w/z");
            if (model.circleVisible && inversion && outsideBox(inversion, BOARD_VIEW)) outside.push("z'");
            return {
                z, w, centre, conjugate: complexConjugate(z), reciprocal, quotient, inversion,
                zModulus: complexModulus(z), wModulus: complexModulus(w),
                zArgument: complexArgument(z), wArgument: complexArgument(w),
                reciprocalArgument: reciprocal && complexArgument(reciprocal), quotientArgument: quotient && complexArgument(quotient),
                position: isZero(z) ? undefined : circlePosition(z, {re: 0, im: 0}, 1),
                outsideDefaultView: outside,
            };
        });
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    private coordinate(value: number): number {
        if (!isComplexCoordinate(value)) {
            throw new DomainError(`The coordinate must be a multiple of ${COMPLEX_COORDINATE_STEP} between ${-COMPLEX_COORDINATE_MAX} and ${COMPLEX_COORDINATE_MAX}.`);
        }
        return snapComplexCoordinate(value);
    }

    private write(patch: Partial<ComplexReciprocalModel>, options: { syncScene?: boolean } = {}): void {
        const model = this.model;
        const next: ComplexReciprocalModel = {...model, ...patch};
        if ((Object.keys(next) as (keyof ComplexReciprocalModel)[]).some(key => next[key] !== model[key])) this.commitModel(next, options);
    }

    protected setExample(value: unknown): void {
        if (!isComplexReciprocalExampleId(value)) throw new DomainError(`The example must be one of ${COMPLEX_RECIPROCAL_EXAMPLE_IDS.join(", ")}.`);
        this.handleAngle = 0;
        this.commitModel({...COMPLEX_RECIPROCAL_EXAMPLE_MODELS[value]});
    }

    /** Both coordinates of one operand in one commit (a drag moves both). */
    protected setOperand(which: OperandName, re: number, im: number, options: { syncScene?: boolean } = {}): void {
        const nextRe = this.coordinate(re);
        const nextIm = this.coordinate(im);
        this.write(which === "z" ? {zRe: nextRe, zIm: nextIm} : {wRe: nextRe, wIm: nextIm}, options);
    }

    protected setZRe(value: number): void { this.setOperand("z", value, this.model.zIm); }

    protected setZIm(value: number): void { this.setOperand("z", this.model.zRe, value); }

    protected setWRe(value: number): void { this.setOperand("w", value, this.model.wIm); }

    protected setWIm(value: number): void { this.setOperand("w", this.model.wRe, value); }

    protected setCentre(re: number, im: number, options: { syncScene?: boolean } = {}): void {
        this.write({centreRe: this.coordinate(re), centreIm: this.coordinate(im)}, options);
    }

    protected setRadius(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isInversionRadius(value)) {
            throw new DomainError(`The radius must be a multiple of ${COMPLEX_COORDINATE_STEP} between ${INVERSION_RADIUS_MIN} and ${INVERSION_RADIUS_MAX}.`);
        }
        this.write({radius: snapInversionRadius(value)}, options);
    }

    protected setReciprocalVisible(visible: boolean): void { this.write({reciprocalVisible: visible}); }

    protected setQuotientVisible(visible: boolean): void { this.write({quotientVisible: visible}); }

    protected setCircleVisible(visible: boolean): void { this.write({circleVisible: visible}); }

    /**
     * Lesson actions. The closed action-name sets of `src/learning/model.ts` hold only the operand names of complex multiplication, so
     * only z and w are reachable by a lesson now; the reveals, the circle and the examples are set through the inspector until the
     * lesson task adds their names.
     */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "complex-z-re": value => this.setZRe(value), "complex-z-im": value => this.setZIm(value),
                "complex-w-re": value => this.setWRe(value), "complex-w-im": value => this.setWIm(value),
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

    private numberText(value: Complex | undefined): string {
        return value === undefined ? t("complex_undefined") : formatComplex(value, this.language());
    }

    /** A result that exists only after its Show button: "hidden" before, "undefined" where the number does not exist. */
    private shownNumber(visible: boolean, value: Complex | undefined): string {
        return visible ? this.numberText(value) : t("complex_hidden");
    }

    private shownModulus(visible: boolean, value: Complex | undefined): string {
        if (!visible) return t("complex_hidden");
        return value === undefined ? t("complex_undefined") : this.modulusText(complexModulus(value));
    }

    private shownArgument(visible: boolean, argument: number | undefined): string {
        return visible ? this.argumentText(argument) : t("complex_hidden");
    }

    /** A board line "name = value", "name: hidden" or "name: undefined". */
    private boardValue(name: string, visible: boolean, value: Complex | undefined): string {
        if (!visible) return t("complex_recip_board_hidden", {value0: name});
        if (value === undefined) return t("complex_recip_board_undefined", {value0: name});
        return t("complex_recip_board_value", {value0: name, value1: formatComplex(value, this.language())});
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    private labelPlacement(tip: Complex, others: Complex[]): LabelPlacement {
        const placement = outwardPlacement(tip);
        const crowded = others.some(other => Math.hypot(other.re - tip.re, other.im - tip.im) < LABEL_CROWDING);
        return crowded ? OTHER_PLACEMENT[placement] : placement;
    }

    private complexPointLabel(placement: () => LabelPlacement, pointVisible?: () => boolean): object {
        return {...this.pointLabel(placement, 0.8, pointVisible), cssClass: "complex-point-label"};
    }

    /** The names of the shown results that lie outside the board as it is now (zoomed or panned). */
    private resultsOutsideBoard(): string[] {
        const box = this.board.getBoundingBox();
        const view = this.viewOf(this.model);
        const outside: string[] = [];
        if (this.model.reciprocalVisible && view.reciprocal && outsideBox(view.reciprocal, box)) outside.push("1/z");
        if (this.model.quotientVisible && view.quotient && outsideBox(view.quotient, box)) outside.push("w/z");
        if (this.model.circleVisible && view.inversion && outsideBox(view.inversion, box)) outside.push("z'");
        return outside;
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.7);
        const colors = {
            z: GraphPalette.primaryCurve, w: GraphPalette.comparisonCurve, conjugate: GraphPalette.additionalCurves[0],
            reciprocal: GraphPalette.additionalCurves[1], quotient: GraphPalette.additionalCurves[2], inversion: GraphPalette.additionalCurves[3],
        };
        const origin: Complex = {re: 0, im: 0};

        // Layers, lowest first: the circles, the arrows, the derived markers, the handles, the draggable z and w, the axis names.
        const circle = (centreX: () => number, centreY: () => number, radius: () => number, color: string, dash: number, shown: () => boolean) =>
            this.own(board.create("curve", [
                (angle: number) => centreX() + radius() * Math.cos(angle), (angle: number) => centreY() + radius() * Math.sin(angle), 0, 2 * Math.PI,
            ], {strokeColor: color, strokeWidth: thin, dash, highlight: false, fixed: true, withLabel: false, visible: shown}));
        circle(() => 0, () => 0, () => 1, GraphPalette.label, 0, () => true);
        circle(() => model().centreRe, () => model().centreIm, () => model().radius, colors.inversion, INVERSION_DASH, () => model().circleVisible);

        const arrow = (re: () => number, im: () => number, color: string, dash: number, shown: () => boolean) =>
            this.own(board.create("curve", [(t: number) => t * re(), (t: number) => t * im(), 0, 1], {
                strokeColor: color, strokeWidth, dash, lastArrow: {type: 2, size: 6}, doAdvancedPlot: false, numberPoints: 2,
                highlight: false, fixed: true, withLabel: false, visible: shown,
            }));
        arrow(() => model().zRe, () => model().zIm, colors.z, 0, () => !isZero(view().z));
        arrow(() => model().wRe, () => model().wIm, colors.w, W_DASH, () => !isZero(view().w));

        const markerSize = () => Math.max(5, this.displaySettings.pointSize * 1.1);
        // A derived marker is fixed; a result that does not exist (z = 0) sits at the origin, hidden, never at NaN or Infinity.
        const marker = (name: string, face: string, color: string, value: () => Complex | undefined, shown: () => boolean, others: () => Complex[]) =>
            this.own(board.create("point", [() => value()?.re ?? 0, () => value()?.im ?? 0], {
                ...this.styles.point.fixed, name, face, size: markerSize, fixed: true, visible: () => shown() && value() !== undefined,
                label: this.complexPointLabel(() => this.labelPlacement(value() ?? origin, others()), () => shown() && value() !== undefined),
                fillColor: color, highlightFillColor: color, strokeColor: color,
            }));
        marker("$$\\bar z$$", "+", colors.conjugate, () => view().conjugate, () => true, () => [view().z]);
        marker("$$1/z$$", "<>", colors.reciprocal, () => view().reciprocal, () => model().reciprocalVisible, () => [view().z, view().conjugate]);
        marker("$$w/z$$", "^", colors.quotient, () => view().quotient, () => model().quotientVisible, () => [view().z, view().w, view().conjugate, view().reciprocal ?? origin]);
        marker("$$z'$$", "x", colors.inversion, () => view().inversion, () => model().circleVisible, () => [view().z, view().conjugate]);

        // The handles and the operands are dragged on the grid inside the square; the model is written once per drag event.
        const clamp = (value: number) => Math.min(COMPLEX_COORDINATE_MAX, Math.max(-COMPLEX_COORDINATE_MAX, value));
        const draggable = (name: string, face: string, color: string, start: Complex, label: boolean, shown: () => boolean, onDrag: (point: JXG.Point) => void) => {
            const point = this.own(board.create("point", [start.re, start.im], {
                ...this.styles.point.default, name, face, size: markerSize, visible: shown,
                ...(label ? {label: this.complexPointLabel(() => this.labelPlacement({re: point.X(), im: point.Y()}, []), shown)} : {withLabel: false}),
                fillColor: color, highlightFillColor: color, strokeColor: GraphPalette.pointOutline,
            })) as JXG.Point;
            point.on("drag", () => {
                if (!Number.isFinite(point.X()) || !Number.isFinite(point.Y())) return;
                onDrag(point);
            });
            return point;
        };
        const operandDrag = (which: OperandName) => (point: JXG.Point) => {
            this.ignoreOutOfDomain(() => this.setOperand(which, snapComplexCoordinate(clamp(point.X())), snapComplexCoordinate(clamp(point.Y())), {syncScene: false}));
            const current = which === "z" ? view().z : view().w;
            point.moveTo([current.re, current.im]);
        };
        this.pointCentre = draggable("$$c$$", "v", colors.inversion, {re: model().centreRe, im: model().centreIm}, true, () => model().circleVisible, point => {
            this.ignoreOutOfDomain(() => this.setCentre(snapComplexCoordinate(clamp(point.X())), snapComplexCoordinate(clamp(point.Y())), {syncScene: false}));
            point.moveTo([model().centreRe, model().centreIm]);
            this.syncRadiusHandle();
        });
        this.pointRadius = draggable("$$r$$", ">", colors.inversion, this.radiusHandlePosition(), false, () => model().circleVisible, point => {
            const dx = point.X() - model().centreRe;
            const dy = point.Y() - model().centreIm;
            const distance = Math.hypot(dx, dy);
            if (distance > 0) this.handleAngle = Math.atan2(dy, dx);
            const radius = Math.min(INVERSION_RADIUS_MAX, Math.max(INVERSION_RADIUS_MIN, snapInversionRadius(distance)));
            this.ignoreOutOfDomain(() => this.setRadius(radius, {syncScene: false}));
            this.syncRadiusHandle();
        });
        this.pointZ = draggable("$$z$$", "o", colors.z, {re: model().zRe, im: model().zIm}, true, () => true, operandDrag("z"));
        this.pointW = draggable("$$w$$", "[]", colors.w, {re: model().wRe, im: model().wIm}, true, () => true, operandDrag("w"));

        const axisName = (text: string, x: () => number, y: () => number, anchorX: "left" | "right", anchorY: "top" | "bottom") =>
            this.own(board.create("text", [x, y, text], {
                anchorX, anchorY, fixed: true, highlight: false, parse: false, fontSize: () => this.displaySettings.fontSize, strokeColor: GraphPalette.label,
                cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE,
            }));
        const extent = () => board.getBoundingBox();
        axisName("Re", () => extent()[2] - 0.02 * (extent()[2] - extent()[0]), () => 0.01 * (extent()[1] - extent()[3]), "right", "bottom");
        axisName("Im", () => 0.015 * (extent()[2] - extent()[0]), () => extent()[1] - 0.02 * (extent()[1] - extent()[3]), "left", "top");

        // The operands, z-bar, 1/z (or the word hidden), w/z and the circle inversion once shown, the warning and the key.
        this.caption("bottom-left", [
            {
                text: () => t("complex_board_operands", {value0: formatComplex(view().z, this.language()), value1: formatComplex(view().w, this.language())}),
                scale: 1.15, math: true,
            },
            {text: () => this.boardValue("z̄", true, view().conjugate), math: true},
            {text: () => this.boardValue("1/z", model().reciprocalVisible, view().reciprocal), math: true},
            {text: () => this.boardValue("w/z", true, view().quotient), visible: () => model().quotientVisible, math: true},
            {
                text: () => model().circleVisible && view().inversion === undefined
                    ? t("complex_recip_board_inversion_pole") : this.boardValue("z'", true, view().inversion),
                visible: () => model().circleVisible, minBoardWidth: COMPACT_BOARD_WIDTH, math: true,
            },
            {
                text: () => t("complex_recip_board_off_view", {value0: this.resultsOutsideBoard().join(", ")}), color: GraphPalette.warningText,
                visible: () => this.resultsOutsideBoard().length > 0,
            },
            {text: () => t("complex_recip_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    private radiusHandlePosition(): Complex {
        const {centreRe, centreIm, radius} = this.model;
        return {re: centreRe + radius * Math.cos(this.handleAngle), im: centreIm + radius * Math.sin(this.handleAngle)};
    }

    private syncRadiusHandle(): void {
        const position = this.radiusHandlePosition();
        this.pointRadius?.moveTo([position.re, position.im]);
    }

    protected override syncSceneToModel(): void {
        const {z, w, centre} = reciprocalModelPoints(this.model);
        this.pointZ?.moveTo([z.re, z.im]);
        this.pointW?.moveTo([w.re, w.im]);
        this.pointCentre?.moveTo([centre.re, centre.im]);
        this.syncRadiusHandle();
    }

    protected override onSceneRemoved(): void {
        this.pointZ = undefined;
        this.pointW = undefined;
        this.pointCentre = undefined;
        this.pointRadius = undefined;
        this.handleAngle = 0;
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
                <ChoiceSelect label={t("complex_recip_example_label")} value={state.example} help={t("complex_recip_example_help")}
                              options={COMPLEX_RECIPROCAL_EXAMPLE_IDS.map(id => ({value: id, text: exampleLabel(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <div className="function-points-grid">
                    {coordinate(t("complex_z_re_label"), state.zRe, value => this.setZRe(value))}
                    {coordinate(t("complex_z_im_label"), state.zIm, value => this.setZIm(value))}
                    {coordinate(t("complex_w_re_label"), state.wRe, value => this.setWRe(value))}
                    {coordinate(t("complex_w_im_label"), state.wIm, value => this.setWIm(value))}
                </div>
                <p className="inspector-help">{t("complex_fields_help")}</p>
            </div>
            <div className="inspector-group" data-complex-circle-fields={state.circleVisible ? "shown" : "hidden"}>
                <div className="function-points-grid">
                    {coordinate(t("complex_recip_centre_re_label"), state.centreRe, value => this.setCentre(value, this.model.centreIm))}
                    {coordinate(t("complex_recip_centre_im_label"), state.centreIm, value => this.setCentre(this.model.centreRe, value))}
                    <NumberInput label={t("complex_recip_radius_label")} value={state.radius} min={INVERSION_RADIUS_MIN} max={INVERSION_RADIUS_MAX} step={COMPLEX_COORDINATE_STEP} decimals={2}
                                 rejectedHint={t("complex_recip_radius_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setRadius(next))}/>
                </div>
                <p className="inspector-help">{t("complex_recip_circle_help")}</p>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const state = this.stateSnapshot();
        const toggle = (action: string, shown: boolean, show: string, hide: string, set: (visible: boolean) => void) => (
            <button type="button" data-action={action} data-revealed={shown} onClick={() => set(!shown)}>{shown ? hide : show}</button>
        );
        return <>
            <div className="demo-actions" role="group" aria-label={t("complex_recip_actions_label")}>
                {toggle("toggle-complex-reciprocal", state.reciprocalVisible, t("complex_recip_show_reciprocal"), t("complex_recip_hide_reciprocal"), v => this.setReciprocalVisible(v))}
                {toggle("toggle-complex-quotient", state.quotientVisible, t("complex_recip_show_quotient"), t("complex_recip_hide_quotient"), v => this.setQuotientVisible(v))}
                {toggle("toggle-complex-circle", state.circleVisible, t("complex_recip_show_circle"), t("complex_recip_hide_circle"), v => this.setCircleVisible(v))}
            </div>
            <p className="inspector-help">{t("complex_recip_reveal_help")}</p>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "z", color: GraphPalette.primaryCurve, label: t("complex_legend_z"), kind: "line"},
            {id: "w", color: GraphPalette.comparisonCurve, label: t("complex_legend_w"), kind: "dashed-line"},
            {id: "unit-circle", color: GraphPalette.label, label: t("complex_recip_legend_unit_circle"), kind: "line"},
            {id: "conjugate", color: GraphPalette.additionalCurves[0], label: t("complex_recip_legend_conjugate"), kind: "cross"},
            {id: "reciprocal", color: GraphPalette.additionalCurves[1], label: t("complex_recip_legend_reciprocal"), kind: "ring"},
            {id: "quotient", color: GraphPalette.additionalCurves[2], label: t("complex_recip_legend_quotient"), kind: "dot"},
            {id: "inversion", color: GraphPalette.additionalCurves[3], label: t("complex_recip_legend_inversion"), kind: "dashed"},
        ]}/>;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: ComplexReciprocalModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (!model.reciprocalVisible) result.push({id: "predict", text: t("complex_recip_status_predict")});
        if (isZero(view.z)) result.push({id: "z-zero", text: t("complex_recip_status_z_zero")});
        else if (model.reciprocalVisible) {
            if (view.position === "outside") result.push({id: "outside", text: t("complex_recip_status_outside")});
            else if (view.position === "inside") result.push({id: "inside", text: t("complex_recip_status_inside")});
            else if (view.position === "on") result.push({id: "on-circle", text: t("complex_recip_status_on_circle")});
        }
        if (model.circleVisible && view.inversion === undefined) result.push({id: "centre-pole", text: t("complex_recip_status_centre_pole")});
        if (view.outsideDefaultView.length > 0) result.push({id: "off-view", text: t("complex_recip_status_off_view", {value0: view.outsideDefaultView.join(", ")})});
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const language = this.language();
        const view = this.viewOf(model);
        const {reciprocalVisible: recip, quotientVisible: quot, circleVisible: circle} = model;
        const position = view.position === undefined ? t("complex_undefined")
            : !recip ? t("complex_hidden")
                : view.position === "inside" ? t("complex_recip_position_inside") : view.position === "outside" ? t("complex_recip_position_outside") : t("complex_recip_position_on");
        const rows = [
            {id: "z", label: t("complex_readout_z"), value: formatComplex(view.z, language)},
            {id: "z-modulus", label: t("complex_readout_z_modulus"), value: this.modulusText(view.zModulus)},
            {id: "z-argument", label: t("complex_readout_z_argument"), value: this.argumentText(view.zArgument)},
            {id: "position", label: t("complex_recip_readout_position"), value: position},
            {id: "conjugate", label: t("complex_recip_readout_conjugate"), value: formatComplex(view.conjugate, language)},
            {id: "reciprocal", label: t("complex_recip_readout_reciprocal"), value: this.shownNumber(recip, view.reciprocal)},
            {id: "reciprocal-modulus", label: t("complex_recip_readout_reciprocal_modulus"), value: this.shownModulus(recip, view.reciprocal)},
            {id: "reciprocal-argument", label: t("complex_recip_readout_reciprocal_argument"), value: this.shownArgument(recip, view.reciprocalArgument)},
            {id: "w", label: t("complex_readout_w"), value: formatComplex(view.w, language)},
            {id: "w-modulus", label: t("complex_readout_w_modulus"), value: this.modulusText(view.wModulus)},
            {id: "w-argument", label: t("complex_readout_w_argument"), value: this.argumentText(view.wArgument)},
            {id: "quotient", label: t("complex_recip_readout_quotient"), value: this.shownNumber(quot, view.quotient)},
            {id: "quotient-modulus", label: t("complex_recip_readout_quotient_modulus"), value: this.shownModulus(quot, view.quotient)},
            {id: "quotient-argument", label: t("complex_recip_readout_quotient_argument"), value: this.shownArgument(quot, view.quotientArgument)},
            {id: "circle-centre", label: t("complex_recip_readout_circle_centre"), value: circle ? formatComplex(view.centre, language) : t("complex_hidden")},
            {id: "circle-radius", label: t("complex_recip_readout_circle_radius"), value: circle ? formatNumber(model.radius, language, 2) : t("complex_hidden")},
            {id: "inversion", label: t("complex_recip_readout_inversion"), value: this.shownNumber(circle, view.inversion)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("complex_recip_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-complex-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default ComplexReciprocalGraph;
