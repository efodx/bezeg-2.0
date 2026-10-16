import React from "react";
import BaseFunctionGraph, {COMPACT_BOARD_WIDTH, DomainError, FunctionLessonActions, LABEL_STYLE, LabelPlacement} from "../functions/BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "../functions/FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {
    ArgumentSum, argumentSum, Complex, COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_STEP, COMPLEX_EXAMPLE_IDS, COMPLEX_MAX_OPERAND_MODULUS, complexArgument, ComplexExampleId,
    complexModulus, complexMultiply, isComplexCoordinate, isComplexExampleId, isZero, snapComplexCoordinate, snapPolarToGrid,
} from "../../analysis/complex";
import {COMPLEX_EXAMPLE_MODELS, ComplexModel, complexModelOperands, DEFAULT_COMPLEX_MODEL, parseComplexModel} from "../../analysis/complexModel";
import {formatArgument, formatComplex, piMultiple} from "../../analysis/complexFormat";
import {GraphPalette} from "../styles/GraphPalette";

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Both operands lie in [-2, 2]^2, so a square of half-width 4.5 shows them large and keeps the usual products (|zw| up to 4.5 along an
 * axis) in view. The largest products (|zw| up to 8, `COMPLEX_MAX_PRODUCT_MODULUS`) can leave this default view: the board then says so
 * and the inspector explains how to zoom out. The units of the two axes are equal (the default), so rotations look like rotations.
 */
const VIEW_HALF_WIDTH = 4.5;
const BOARD_VIEW: BoundingBox = [-VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, VIEW_HALF_WIDTH, -VIEW_HALF_WIDTH];

/** Dash styles (JSXGraph numbering): z solid, w dashed, zw solid and thicker (it also has a diamond marker). */
const W_DASH = 2;
/** Arc radii in pixels (so they stay readable at any zoom); an arc never exceeds 80 % of its arrow. */
const ARC_RADIUS_PX = {z: 30, w: 44, product: 58} as const;
const ARC_STEPS = 32;
/** Two arrow tips closer than this many units count as the same place when placing labels. */
const LABEL_CROWDING = 0.45;
/** The largest |argument| a typed polar input accepts: any angle within a full turn either way. */
const MAX_TYPED_ARGUMENT = 2 * Math.PI;

type OperandName = "z" | "w";
type StatusKind = "hidden" | "z-zero" | "w-zero" | "product-zero" | "reduced" | "not-reduced" | "off-view";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    z: Complex;
    w: Complex;
    product: Complex;
    zModulus: number;
    wModulus: number;
    productModulus: number;
    zArgument: number | undefined;
    wArgument: number | undefined;
    productArgument: number | undefined;
    /** arg z + arg w and its reduction; undefined unless both operands are nonzero. */
    sum: ArgumentSum | undefined;
    productZero: boolean;
    /** The product lies outside the default view. */
    outsideDefaultView: boolean;
}

const exampleLabel = (id: ComplexExampleId): string => {
    switch (id) {
        case "rotation-i": return t("complex_example_rotation_i");
        case "identity": return t("complex_example_identity");
        case "negation": return t("complex_example_negation");
        case "scaling": return t("complex_example_scaling");
        case "general": return t("complex_example_general");
        case "zero": return t("complex_example_zero");
    }
};

/** The label side that points away from the origin, never onto an axis; a point at the origin gets the quadrant nobody else uses. */
function outwardPlacement({re, im}: Complex): LabelPlacement {
    const horizontal = Math.abs(re);
    const vertical = Math.abs(im);
    if (horizontal === 0 && vertical === 0) return "below-left";
    if (vertical <= 0.2 * horizontal) return re > 0 ? "above-right" : "above-left";
    if (horizontal <= 0.2 * vertical) return im > 0 ? "above-right" : "below-right";
    if (re > 0) return im > 0 ? "above-right" : "below-right";
    return im > 0 ? "above-left" : "below-left";
}

const MIRRORED_PLACEMENT: Readonly<Record<string, LabelPlacement>> = {
    "above-right": "above-left", "above-left": "above-right", "below-right": "below-left", "below-left": "below-right",
};
const FLIPPED_PLACEMENT: Readonly<Record<string, LabelPlacement>> = {
    "above-right": "below-right", "below-right": "above-right", "above-left": "below-left", "below-left": "above-left",
};
const OPPOSITE_PLACEMENT: Readonly<Record<string, LabelPlacement>> = {
    "above-right": "below-left", "below-left": "above-right", "above-left": "below-right", "below-right": "above-left",
};

/**
 * Complex multiplication on the complex plane (Foundations). The model is `{example, zRe, zIm, wRe, wIm, productVisible, anglesVisible}`
 * (`src/analysis/complexModel`); the product, moduli and arguments are recomputed from it with `src/analysis/complex` (products of grid
 * operands are exact) and never stored. The plane is a flat coordinate board: `BaseFunctionGraph` provides the synchronous model,
 * presets, lesson capture and restore, the caption and owned objects; nothing here is a function graph.
 *
 * Rules (reject, never clamp): each operand coordinate is a multiple of 0.05 in [-2, 2]; values within arithmetic noise of the grid
 * are snapped, a real off-grid or out-of-range value is refused. Polar input for w goes through `snapPolarToGrid`: the modulus keeps
 * the argument of the current w (the positive real axis when w is 0) and the argument keeps the current modulus; the result is the
 * nearest grid point, a result outside the square or at the origin is refused, and the polar fields then show the polar form of the
 * snapped w. The argument of 0 is undefined: with w = 0 the argument field is disabled with a visible explanation. A setter that
 * would break a rule throws a `DomainError` and leaves the model unchanged. Number fields, dragging z and w (the drag position is
 * limited to the square and snapped to the grid), polar fields and lesson actions use the same setters. Choosing an example loads
 * both operands and hides the product and the arcs; editing the numbers afterwards keeps the stored example as the last chosen label.
 */
export class ComplexMultiplicationGraph extends BaseFunctionGraph<ComplexModel> {
    private pointZ?: JXG.Point;
    private pointW?: JXG.Point;

    override presets(): string {
        return "complex-multiplication";
    }

    protected defaultModel(): ComplexModel {
        return {...DEFAULT_COMPLEX_MODEL};
    }

    protected parseModel(data: unknown): ComplexModel | undefined {
        return parseComplexModel(data);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEW];
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: ComplexModel): View {
        return this.memoView(model, () => {
            const {z, w} = complexModelOperands(model);
            const product = complexMultiply(z, w);
            return {
                z, w, product,
                zModulus: complexModulus(z), wModulus: complexModulus(w), productModulus: complexModulus(product),
                zArgument: complexArgument(z), wArgument: complexArgument(w), productArgument: complexArgument(product),
                sum: argumentSum(z, w),
                productZero: isZero(product),
                outsideDefaultView: Math.max(Math.abs(product.re), Math.abs(product.im)) > VIEW_HALF_WIDTH,
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

    protected setExample(value: unknown): void {
        if (!isComplexExampleId(value)) throw new DomainError(`The example must be one of ${COMPLEX_EXAMPLE_IDS.join(", ")}.`);
        this.commitModel({...COMPLEX_EXAMPLE_MODELS[value]});
    }

    /** Both coordinates of one operand in one commit (a drag moves both). */
    protected setOperand(which: OperandName, re: number, im: number, options: { syncScene?: boolean } = {}): void {
        const nextRe = this.coordinate(re);
        const nextIm = this.coordinate(im);
        const model = this.model;
        const next: ComplexModel = which === "z" ? {...model, zRe: nextRe, zIm: nextIm} : {...model, wRe: nextRe, wIm: nextIm};
        if (next.zRe !== model.zRe || next.zIm !== model.zIm || next.wRe !== model.wRe || next.wIm !== model.wIm) this.commitModel(next, options);
    }

    protected setZRe(value: number): void { this.setOperand("z", value, this.model.zIm); }

    protected setZIm(value: number): void { this.setOperand("z", this.model.zRe, value); }

    protected setWRe(value: number): void { this.setOperand("w", value, this.model.wIm); }

    protected setWIm(value: number): void { this.setOperand("w", this.model.wRe, value); }

    /** w with the given modulus and the argument of the current w (the positive real axis when w is 0); a modulus of 0 gives w = 0. */
    protected setWModulus(value: number): void {
        if (!Number.isFinite(value) || value < 0 || value > COMPLEX_MAX_OPERAND_MODULUS + 1e-9) {
            throw new DomainError(`The modulus must be a number between 0 and ${COMPLEX_MAX_OPERAND_MODULUS}.`);
        }
        if (value === 0) {
            this.setOperand("w", 0, 0);
            return;
        }
        const {w} = complexModelOperands(this.model);
        const snapped = snapPolarToGrid(value, complexArgument(w) ?? 0);
        if (!snapped) throw new DomainError("The modulus does not give a point of the grid inside the square [-2, 2].");
        this.setOperand("w", snapped.re, snapped.im);
    }

    /** w with the given argument and the modulus of the current w; refused when w is 0, whose argument is undefined. */
    protected setWArgument(value: number): void {
        if (!Number.isFinite(value) || Math.abs(value) > MAX_TYPED_ARGUMENT + 1e-9) {
            throw new DomainError("The argument must be a number between -2 pi and 2 pi.");
        }
        const {w} = complexModelOperands(this.model);
        if (isZero(w)) throw new DomainError("The argument of 0 is undefined.");
        const snapped = snapPolarToGrid(complexModulus(w), value);
        if (!snapped) throw new DomainError("The argument does not give a point of the grid inside the square [-2, 2].");
        this.setOperand("w", snapped.re, snapped.im);
    }

    protected setProductVisible(visible: boolean): void {
        if (visible !== this.model.productVisible) this.commitModel({...this.model, productVisible: visible});
    }

    protected setAnglesVisible(visible: boolean): void {
        if (visible !== this.model.anglesVisible) this.commitModel({...this.model, anglesVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "complex-z-re": value => this.setZRe(value), "complex-z-im": value => this.setZIm(value),
                "complex-w-re": value => this.setWRe(value), "complex-w-im": value => this.setWIm(value),
                "complex-w-modulus": value => this.setWModulus(value), "complex-w-argument": value => this.setWArgument(value),
            },
            visibility: {
                "complex-product": visible => this.setProductVisible(visible), "complex-arguments": visible => this.setAnglesVisible(visible),
            },
            choices: {"complex-example": value => this.setExample(value)},
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

    /** "= 3π/2 ≈ 4,712", or just "≈ 2,402" when the argument has no pi-multiple form (so "= ≈" never appears). */
    private argumentEquation(value: number | undefined): string {
        const text = this.argumentText(value);
        return text.startsWith("≈") ? text : `= ${text}`;
    }

    /** An angle for the narrow board: the multiple of pi where there is one, else two decimals. */
    private compactAngle(value: number): string {
        return piMultiple(value) ?? formatNumber(value, this.language(), 2);
    }

    /** "|z| · |w| = |zw|" with the rounded values; "≈" instead of "=" when the rounded factors do not multiply to the rounded product. */
    private modulusRule(view: View): string {
        const round = (value: number) => Number(value.toFixed(4));
        const sign = Math.abs(round(view.zModulus) * round(view.wModulus) - round(view.productModulus)) < 1e-9 ? "=" : "≈";
        return `${this.modulusText(view.zModulus)} · ${this.modulusText(view.wModulus)} ${sign} ${this.modulusText(view.productModulus)}`;
    }

    private argumentRule(view: View): string {
        if (!view.sum) return t("complex_undefined");
        const sum = this.argumentText(view.sum.sum);
        return view.sum.wasReduced ? `${sum} → ${this.argumentText(view.sum.reduced)}` : sum;
    }

    private boardArguments(view: View): string {
        if (!view.sum || view.zArgument === undefined || view.wArgument === undefined) return t("complex_board_arguments_undefined");
        const first = this.compactAngle(view.zArgument);
        const second = this.compactAngle(view.wArgument);
        const sum = this.compactAngle(view.sum.sum);
        return view.sum.wasReduced
            ? t("complex_board_arguments_reduced", {value0: first, value1: second, value2: sum, value3: this.compactAngle(view.sum.reduced)})
            : t("complex_board_arguments", {value0: first, value1: second, value2: sum});
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /**
     * Where the label of a tip goes: away from the origin. Each earlier tip in the same place takes a side: the next label goes to the
     * other horizontal side (staying outside the argument arcs), then below instead of above, then to the opposite corner.
     */
    private labelPlacement(name: OperandName | "product"): LabelPlacement {
        const view = this.viewOf(this.model);
        const tips: Record<OperandName | "product", Complex> = {z: view.z, w: view.w, product: view.product};
        const own = tips[name];
        const earlier = name === "z" ? [] : name === "w" ? [tips.z] : [tips.z, tips.w];
        const placement = outwardPlacement(own);
        const crowded = earlier.filter(other => Math.hypot(other.re - own.re, other.im - own.im) < LABEL_CROWDING).length;
        return [placement, MIRRORED_PLACEMENT[placement], FLIPPED_PLACEMENT[placement], OPPOSITE_PLACEMENT[placement]][Math.min(crowded, 3)];
    }

    /**
     * A tip's label: the shared point label, with its MathJax block margins removed (see `complex-point-label` in FunctionReadout.css)
     * so that the glyph sits next to its marker rather than a line-height above it.
     */
    private complexPointLabel(placement: () => LabelPlacement, pointVisible?: () => boolean): object {
        return {...this.pointLabel(placement, 0.8, pointVisible), cssClass: "complex-point-label"};
    }

    private productOutsideBoard(): boolean {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const {product} = this.viewOf(this.model);
        return product.re < left || product.re > right || product.im < bottom || product.im > top;
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.7);
        const productShown = () => model().productVisible;
        const colors = {z: GraphPalette.primaryCurve, w: GraphPalette.comparisonCurve, product: GraphPalette.additionalCurves[1]};

        // Layers, lowest first: the argument arcs, the arrows, the product marker, the draggable z and w, the axis names.
        const arc = (
            argument: () => number | undefined, modulus: () => number, radiusPx: number, color: string, shown: () => boolean,
        ) => {
            const curve = this.own(board.create("curve", [[], []], {
                strokeColor: color, strokeWidth: thin, highlight: false, fixed: true, withLabel: false, visible: shown,
            })) as unknown as { updateDataArray: () => void; dataX: number[]; dataY: number[] };
            curve.updateDataArray = () => {
                const end = argument();
                if (end === undefined || !shown()) {
                    curve.dataX = [];
                    curve.dataY = [];
                    return;
                }
                const radius = Math.min(radiusPx / (board.unitX || 50), 0.8 * modulus());
                curve.dataX = Array.from({length: ARC_STEPS + 1}, (_, index) => radius * Math.cos(end * index / ARC_STEPS));
                curve.dataY = Array.from({length: ARC_STEPS + 1}, (_, index) => radius * Math.sin(end * index / ARC_STEPS));
            };
        };
        arc(() => view().zArgument, () => view().zModulus, ARC_RADIUS_PX.z, colors.z, () => model().anglesVisible);
        arc(() => view().wArgument, () => view().wModulus, ARC_RADIUS_PX.w, colors.w, () => model().anglesVisible);
        arc(() => view().productArgument, () => view().productModulus, ARC_RADIUS_PX.product, colors.product, () => model().anglesVisible && productShown());

        // An arrow is the straight parametric curve t -> t (re, im) on [0, 1] with an arrowhead at its end (a curve, so that it is a rendered path of the board).
        const arrow = (re: () => number, im: () => number, color: string, width: () => number, dash: number, shown: () => boolean) =>
            this.own(board.create("curve", [(t: number) => t * re(), (t: number) => t * im(), 0, 1], {
                strokeColor: color, strokeWidth: width, dash, lastArrow: {type: 2, size: 6}, doAdvancedPlot: false, numberPoints: 2,
                highlight: false, fixed: true, withLabel: false, visible: shown,
            }));
        arrow(() => model().zRe, () => model().zIm, colors.z, strokeWidth, 0, () => !isZero(view().z));
        arrow(() => model().wRe, () => model().wIm, colors.w, strokeWidth, W_DASH, () => !isZero(view().w));
        arrow(() => view().product.re, () => view().product.im, colors.product, () => Math.max(2, this.displaySettings.strokeWidth * 1.6), 0,
            () => productShown() && !view().productZero);

        const markerSize = () => Math.max(5, this.displaySettings.pointSize * 1.1);
        // The product is a fixed diamond; it exists only after Show product (its label follows it).
        this.own(board.create("point", [() => view().product.re, () => view().product.im], {
            ...this.styles.point.fixed, name: "$$zw$$", label: this.complexPointLabel(() => this.labelPlacement("product"), productShown), face: "<>", size: markerSize,
            fillColor: colors.product, highlightFillColor: colors.product, strokeColor: colors.product, fixed: true, visible: productShown,
        }));
        // z (circle) and w (square) are dragged on the grid inside the square; the model is written once per drag event with both coordinates.
        const operandPoint = (which: OperandName, face: string, color: string) => {
            const point = this.own(board.create("point", [which === "z" ? model().zRe : model().wRe, which === "z" ? model().zIm : model().wIm], {
                ...this.styles.point.default, name: which === "z" ? "$$z$$" : "$$w$$", label: this.complexPointLabel(() => this.labelPlacement(which)), face, size: markerSize,
                fillColor: color, highlightFillColor: color, strokeColor: GraphPalette.pointOutline,
            })) as JXG.Point;
            point.on("drag", () => {
                const clamp = (value: number) => Math.min(COMPLEX_COORDINATE_MAX, Math.max(-COMPLEX_COORDINATE_MAX, value));
                if (!Number.isFinite(point.X()) || !Number.isFinite(point.Y())) return;
                const re = snapComplexCoordinate(clamp(point.X()));
                const im = snapComplexCoordinate(clamp(point.Y()));
                this.ignoreOutOfDomain(() => this.setOperand(which, re, im, {syncScene: false}));
                const operands = complexModelOperands(this.model);
                const current = which === "z" ? operands.z : operands.w;
                point.moveTo([current.re, current.im]);
            });
            return point;
        };
        this.pointZ = operandPoint("z", "o", colors.z);
        this.pointW = operandPoint("w", "[]", colors.w);

        // The axis names Re and Im sit at the positive ends of the axes, on the side that clears the tick labels.
        const axisName = (text: string, x: () => number, y: () => number, anchorX: "left" | "right", anchorY: "top" | "bottom") =>
            this.own(board.create("text", [x, y, text], {
                anchorX, anchorY, fixed: true, highlight: false, parse: false, fontSize: () => this.displaySettings.fontSize, strokeColor: GraphPalette.label,
                cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE,
            }));
        const extent = () => board.getBoundingBox();
        axisName("Re", () => extent()[2] - 0.02 * (extent()[2] - extent()[0]), () => 0.01 * (extent()[1] - extent()[3]), "right", "bottom");
        axisName("Im", () => 0.015 * (extent()[2] - extent()[0]), () => extent()[1] - 0.02 * (extent()[1] - extent()[3]), "left", "top");

        // The operands, the product (or the word hidden), the argument sum and the key stay on the board; the narrow board drops the last two.
        this.caption("bottom-left", [
            {
                text: () => t("complex_board_operands", {value0: formatComplex(view().z, this.language()), value1: formatComplex(view().w, this.language())}),
                scale: 1.15, math: true,
            },
            {
                text: () => productShown() ? t("complex_board_product", {value0: formatComplex(view().product, this.language())}) : t("complex_board_product_hidden"),
                math: true,
            },
            {text: () => this.boardArguments(view()), visible: () => model().anglesVisible && productShown(), minBoardWidth: COMPACT_BOARD_WIDTH, math: true},
            {text: () => t("complex_board_off_view"), color: GraphPalette.warningText, visible: () => productShown() && this.productOutsideBoard()},
            {text: () => t("complex_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {z, w} = complexModelOperands(this.model);
        this.pointZ?.moveTo([z.re, z.im]);
        this.pointW?.moveTo([w.re, w.im]);
    }

    protected override onSceneRemoved(): void {
        this.pointZ = undefined;
        this.pointW = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const language = this.language();
        const view = this.viewOf(state);
        const wZero = isZero(view.w);
        const coordinate = (label: string, value: number, apply: (value: number) => void) => (
            <NumberInput label={label} value={value} min={-COMPLEX_COORDINATE_MAX} max={COMPLEX_COORDINATE_MAX} step={COMPLEX_COORDINATE_STEP} decimals={2}
                         rejectedHint={t("complex_coordinate_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => apply(next))}/>
        );
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("complex_example_label")} value={state.example} help={t("complex_example_help")}
                              options={COMPLEX_EXAMPLE_IDS.map(id => ({value: id, text: exampleLabel(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <div className="demo-actions" role="group" aria-label={t("complex_actions_label")}>
                    <button type="button" data-action="toggle-complex-product" data-revealed={state.productVisible}
                            onClick={() => this.setProductVisible(!this.model.productVisible)}>
                        {state.productVisible ? t("complex_hide_product") : t("complex_show_product")}
                    </button>
                    <button type="button" data-action="toggle-complex-arguments" data-revealed={state.anglesVisible}
                            onClick={() => this.setAnglesVisible(!this.model.anglesVisible)}>
                        {state.anglesVisible ? t("complex_hide_arguments") : t("complex_show_arguments")}
                    </button>
                </div>
                <p className="inspector-help">{t("complex_product_help")}</p>
                <p className="inspector-help">{t("complex_arguments_help")}</p>
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
            <div className="inspector-group">
                <div className="function-points-grid complex-w-grid">
                    <NumberInput label={t("complex_w_modulus_label")} value={view.wModulus} min={0} max={COMPLEX_MAX_OPERAND_MODULUS} step={0.05} decimals={4} applyOn="confirm"
                                 rejectedHint={t("complex_modulus_rejected_hint", {value0: formatNumber(COMPLEX_MAX_OPERAND_MODULUS, language, 2)})}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setWModulus(next))}/>
                    <NumberInput label={t("complex_w_argument_label")} value={view.wArgument} min={-MAX_TYPED_ARGUMENT} max={MAX_TYPED_ARGUMENT} step={0.1} decimals={4} applyOn="confirm"
                                 disabled={wZero} describedBy="complex-w-argument-help"
                                 rejectedHint={t("complex_argument_rejected_hint", {
                                     value0: formatNumber(-MAX_TYPED_ARGUMENT, language, 2), value1: formatNumber(MAX_TYPED_ARGUMENT, language, 2),
                                 })}
                                 onChange={next => this.ignoreOutOfDomain(() => this.setWArgument(next))}/>
                </div>
                <p id="complex-w-argument-help" className="inspector-help" data-complex-argument-help={wZero ? "zero" : "polar"}>
                    {wZero ? t("complex_w_argument_zero") : t("complex_polar_help")}
                </p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "z", color: GraphPalette.primaryCurve, label: t("complex_legend_z"), kind: "line"},
            {id: "w", color: GraphPalette.comparisonCurve, label: t("complex_legend_w"), kind: "dashed-line"},
            {id: "product", color: GraphPalette.additionalCurves[1], label: t("complex_legend_product"), kind: "line"},
            {id: "arcs", color: GraphPalette.label, label: t("complex_legend_arcs"), kind: "dotted-line"},
        ]}/>;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: ComplexModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (!model.productVisible) result.push({id: "hidden", text: t("complex_status_hidden")});
        if (isZero(view.z)) result.push({id: "z-zero", text: t("complex_status_z_zero")});
        if (isZero(view.w)) result.push({id: "w-zero", text: t("complex_status_w_zero")});
        if (model.productVisible) {
            if (view.productZero) result.push({id: "product-zero", text: t("complex_status_product_zero")});
            else if (view.sum?.wasReduced) result.push({id: "reduced", text: t("complex_status_reduced", {value0: this.argumentEquation(view.sum.sum), value1: this.argumentEquation(view.sum.reduced)})});
            else if (view.sum) result.push({id: "not-reduced", text: t("complex_status_not_reduced", {value0: this.argumentEquation(view.sum.sum)})});
            if (view.outsideDefaultView) result.push({id: "off-view", text: t("complex_status_off_view", {value0: this.modulusText(view.productModulus)})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const language = this.language();
        const view = this.viewOf(model);
        const shown = model.productVisible;
        const hidden = t("complex_hidden");
        const rows = [
            {id: "z", label: t("complex_readout_z"), value: formatComplex(view.z, language)},
            {id: "z-modulus", label: t("complex_readout_z_modulus"), value: this.modulusText(view.zModulus)},
            {id: "z-argument", label: t("complex_readout_z_argument"), value: this.argumentText(view.zArgument)},
            {id: "w", label: t("complex_readout_w"), value: formatComplex(view.w, language)},
            {id: "w-modulus", label: t("complex_readout_w_modulus"), value: this.modulusText(view.wModulus)},
            {id: "w-argument", label: t("complex_readout_w_argument"), value: this.argumentText(view.wArgument)},
            {id: "product", label: t("complex_readout_product"), value: shown ? formatComplex(view.product, language) : hidden},
            {id: "product-modulus", label: t("complex_readout_product_modulus"), value: shown ? this.modulusText(view.productModulus) : hidden},
            {id: "product-argument", label: t("complex_readout_product_argument"), value: shown ? this.argumentText(view.productArgument) : hidden},
            {id: "modulus-rule", label: t("complex_readout_modulus_rule"), value: shown ? this.modulusRule(view) : hidden},
            {id: "argument-rule", label: t("complex_readout_argument_rule"), value: shown ? this.argumentRule(view) : hidden},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("complex_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-complex-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default ComplexMultiplicationGraph;
