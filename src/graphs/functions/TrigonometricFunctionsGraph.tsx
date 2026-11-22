import React from "react";
import BaseFunctionGraph, {DomainError, localizedSliderValue, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, t} from "../../localization";
import {formatNumber, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {
    AMPLITUDE_MAX, AMPLITUDE_MIN, AMPLITUDE_STEP, amplitude, basicValue, equationText, formatPhase, formatWithPi, GraphPiece, joinPieces, MIDLINE_MAX,
    MIDLINE_MIN, MIDLINE_STEP, OMEGA_MAX, OMEGA_MIN, OMEGA_STEP, period, PHASE_MAX, PHASE_MIN, PHASE_STEP, phaseShift, snapPhase, tangentAsymptotes,
    tangentBranches, TRIG_FUNCTIONS, trigValue, valueRange,
} from "../../analysis/trigonometric";
import {
    DEFAULT_TRIGONOMETRIC_MODEL, isAmplitude, isMidline, isOmega, isPhase, isTrigFunction, TrigonometricModel,
} from "../../analysis/trigonometricModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {choiceRejected, numberRangeRejected} from "./functionSetterMessages";
import {cleanNumber} from "../../analysis/numbers";
import {ToolSection} from "../../inputs/ToolSection";
import {pickOn} from "../../uxPicks/picks";
import type {GraphUx, LegendEntry} from "../../uxPicks/declare/graphUx";

/** The reference graph is the plain basic function: A = 1, omega = 1, phi = 0, B = 0. */
/** TeX of a `formatWithPi` text such as "1,57 (π/2)": the number, then the exact multiple of pi as a fraction. Undefined when the text is not of that shape. */
function withPiTex(text: string): string | undefined {
    const plain = text.replace(/\u2212/g, "-");
    const match = /^(-?[0-9.,]+)(?: [(](-?)([0-9]*)π(?:[/]([0-9]+))?[)])?$/.exec(plain);
    if (!match) return undefined;
    const number = match[1].replace(/,/g, "{,}");
    if (match[3] === undefined && match[2] === undefined) return number;
    const top = `${match[2]}${match[3]}\\pi`;
    return `${number}\\ (${match[4] === undefined ? top : `\\frac{${top}}{${match[4]}}`})`;
}

const REFERENCE = {A: 1, omega: 1, phi: 0, B: 0} as const;

/**
 * Trigonometric functions `f(x) = A * g(omega * x + phi) + B` with `g` one of sin, cos, tan, four parameter sliders, an
 * optional dashed reference graph of the plain `g(x)` and the dashed midline `y = B`. Tangent is drawn branch by branch
 * (one run of points between consecutive asymptotes) so that it is never joined across an asymptote. The model is
 * `{fn, A, omega, phi, B, reference}`; the mathematics comes from `src/analysis/trigonometric`.
 */
export class TrigonometricFunctionsGraph extends BaseFunctionGraph<TrigonometricModel> {
    override presetCollection() {
        return functionPresetCollections["trigonometric-functions"];
    }

    protected defaultModel(): TrigonometricModel {
        return {...DEFAULT_TRIGONOMETRIC_MODEL};
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-7, 4, 7, -4];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    protected setFunction(value: unknown): void {
        if (!isTrigFunction(value)) throw new DomainError(choiceRejected("trig_function_label", ["sin", "cos", "tan"]));
        this.commitModel({...this.model, fn: value});
    }

    protected setAmplitude(value: number): void {
        if (!isAmplitude(value)) throw new DomainError(numberRangeRejected("trig_amplitude_label", AMPLITUDE_MIN, AMPLITUDE_MAX));
        this.commitModel({...this.model, A: cleanNumber(value)});
    }

    protected setOmega(value: number): void {
        if (!isOmega(value)) throw new DomainError(numberRangeRejected("trig_omega_label", OMEGA_MIN, OMEGA_MAX));
        this.commitModel({...this.model, omega: cleanNumber(value)});
    }

    protected setPhase(value: number): void {
        if (!isPhase(value)) throw new DomainError(message("trig_phase_rejected"));
        this.commitModel({...this.model, phi: Math.min(PHASE_MAX, Math.max(PHASE_MIN, snapPhase(value)))});
    }

    protected setMidline(value: number): void {
        if (!isMidline(value)) throw new DomainError(numberRangeRejected("trig_midline_label", MIDLINE_MIN, MIDLINE_MAX));
        this.commitModel({...this.model, B: cleanNumber(value)});
    }

    protected setReferenceVisible(visible: boolean): void {
        this.commitModel({...this.model, reference: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                A: value => this.setAmplitude(value),
                omega: value => this.setOmega(value),
                phi: value => this.setPhase(value),
                B: value => this.setMidline(value),
            },
            visibility: {reference: visible => this.setReferenceVisible(visible)},
            choices: {"trig-function": value => this.setFunction(value)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /**
     * Creates a curve drawn from point arrays that are recomputed on every board update; the arrays may contain NaN
     * between pieces (JSXGraph lifts the pen there), which is how the tangent branches stay unconnected.
     */
    private dataCurve(pieces: () => GraphPiece[], attributes: object) {
        const curve: any = this.board.create("curve", [[0], [0]], attributes);
        curve.updateDataArray = function (this: any) {
            const {x, y} = joinPieces(pieces());
            this.dataX = x;
            this.dataY = y;
        };
        return this.own(curve);
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const isTangent = () => model().fn === "tan";
        const view = () => {
            const [left, top, right, bottom] = board.getBoundingBox();
            return {left, top, right, bottom};
        };
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const referenceStrokeWidth = () => Math.max(1, this.displaySettings.strokeWidth * 0.72);
        const branches = (parameters: Omit<TrigonometricModel, "fn" | "reference">) => () => {
            const {left, right} = view();
            return tangentBranches(parameters, left, right);
        };

        // Layers, lowest first: midline, reference graph, asymptotes, then the main graph over them.
        this.own(board.create("functiongraph", [() => model().B], {
            strokeColor: GraphPalette.referenceCurve, dash: 3, highlight: false, fixed: true, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.6),
        }));

        const referenceVisible = () => model().reference;
        this.own(board.create("functiongraph", [(x: number) => basicValue(model().fn, x)], {
            strokeColor: GraphPalette.constructionAccent, dash: 2, strokeOpacity: 0.88, highlight: false, fixed: true, strokeWidth: referenceStrokeWidth, visible: () => referenceVisible() && !isTangent(),
        }));
        this.dataCurve(() => referenceVisible() && isTangent() ? branches(REFERENCE)() : [], {
            strokeColor: GraphPalette.constructionAccent, dash: 2, strokeOpacity: 0.88, highlight: false, fixed: true, strokeWidth: referenceStrokeWidth, visible: () => referenceVisible() && isTangent(),
        });

        this.dataCurve(() => {
            if (!isTangent()) return [];
            const {omega, phi} = model();
            const {left, right, top, bottom} = view();
            return tangentAsymptotes(omega, phi, left, right).map(x => ({x: [x, x], y: [bottom, top]}));
        }, {strokeColor: GraphPalette.referenceCurve, dash: 3, strokeOpacity: 0.7, highlight: false, fixed: true, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.6), visible: isTangent});

        this.own(board.create("functiongraph", [(x: number) => trigValue(model(), x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth, visible: () => !isTangent(),
        }));
        this.dataCurve(() => isTangent() ? branches(model())() : [], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth, visible: isTangent,
        });

        // The equation, the most important readout, stays on the board; the reference has its own line while it is shown.
        this.caption("top-left", [
            {text: () => equationText(model(), language()), scale: 1.2, math: true, visible: () => !pickOn("boardText")},
            {text: () => `${model().fn}(x) (${t("trig_reference_legend")})`, visible: () => model().reference && !pickOn("boardText")},
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {fn, A, omega, phi, B} = this.model;
        const language = currentLanguage();
        return <>
            <ToolSection id="trig-function" element="div" className="inspector-group">
                <ChoiceSelect label={t("trig_function_label")} value={fn} help={t("trig_function_help")}
                              options={TRIG_FUNCTIONS.map(name => ({value: name, text: `${name} x`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </ToolSection>
            <ToolSection id="trig-parameters" element="div" className="inspector-group" pickTitle="Parametri">
                <Slider paramKey="trig.A" customText={t("trig_amplitude_label")} min={AMPLITUDE_MIN} max={AMPLITUDE_MAX} step={AMPLITUDE_STEP} value={A}
                        formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setAmplitude(next))}/>
                <Slider paramKey="trig.omega" customText={t("trig_omega_label")} min={OMEGA_MIN} max={OMEGA_MAX} step={OMEGA_STEP} value={omega}
                        help={t("trig_omega_help")} formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setOmega(next))}/>
                <Slider paramKey="trig.phi" customText={t("trig_phase_label")} min={PHASE_MIN} max={PHASE_MAX} step={PHASE_STEP} value={phi}
                        help={t("trig_phase_help")} formatValue={value => formatPhase(value, language)}
                        onChange={next => this.ignoreOutOfDomain(() => this.setPhase(next))}/>
                <Slider paramKey="trig.B" customText={t("trig_midline_label")} min={MIDLINE_MIN} max={MIDLINE_MAX} step={MIDLINE_STEP} value={B}
                        formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setMidline(next))}/>
            </ToolSection>
        </>;
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <div className="inspector-group">
            <OnOffSwitch checked={this.model.reference} label={t("trig_show_reference")}
                         onChange={checked => this.setReferenceVisible(checked)}/>
        </div>;
    }

    /**
     * What the view director keeps in the free rectangle (UX picks): two periods of the curve around the origin and its
     * amplitude band about the midline, so the curve the learner moves does not sit under a card. The tangent has no band, so
     * a fixed one stands in. Marks only move the view; they never change the curve.
     */
    protected override viewMarks(): readonly (readonly [number, number])[] | undefined {
        const {fn, A, omega, phi, B} = this.model;
        const p = period({fn, omega});
        if (!(p > 0) || !Number.isFinite(p)) return undefined;
        const half = Math.min(p, 8), shift = Number.isFinite(phi / omega) ? Math.max(-4, Math.min(4, -phi / omega)) : 0;
        const band = fn === "tan" ? 3 : Math.abs(A);
        const left = shift - half, right = shift + half, top = B + band, bottom = B - band;
        return [[left, top], [right, top], [right, bottom], [left, bottom]];
    }

    /** The cards' declaration (pick boardText): the equation as the formula, the derived values, the drawn curves as the legend. */
    protected override workspaceUx(): GraphUx | undefined {
        if (!pickOn("boardText")) return undefined;
        const {fn, A, omega, phi, B, reference} = this.model;
        const language = currentLanguage();
        const parameters = {fn, A, omega, phi, B};
        const number = (value: number) => formatNumber(value, language);
        const amplitudeValue = amplitude(parameters);
        const range = valueRange(parameters);
        const texOf = (text: string): {valueTex?: string} => { const tex = withPiTex(text); return tex === undefined ? {} : {valueTex: tex}; };
        const legend: LegendEntry[] = [
            {id: "curve", label: `${fn} x`, kind: "line", color: GraphPalette.comparisonCurve},
            ...(reference ? [{id: "reference", label: `${fn}(x) (${t("trig_reference_legend")})`, kind: "dashed" as const, color: GraphPalette.constructionAccent}] : []),
            {id: "midline", label: t("trig_midline_label"), kind: "dashed", color: GraphPalette.referenceCurve},
            ...(fn === "tan" ? [{id: "asymptotes", label: "Asimptote", kind: "dashed" as const, color: GraphPalette.referenceCurve}] : []),
        ];
        return {
            formula: equationText(parameters, language).replace(/,/g, "{,}").replace(/\b(sin|cos|tan)\b/g, "\\$1 ").replace(/π/g, "\\pi ").replace(/·/g, "\\cdot "),
            readouts: [
                {id: "wave", rows: [
                    {id: "phi", name: t("trig_phase_readout"), value: formatWithPi(phi, language), ...texOf(formatWithPi(phi, language)), legend: "curve"},
                    {id: "amplitude", name: t("trig_amplitude_readout"), value: amplitudeValue === null ? NOT_A_NUMBER_TEXT : number(amplitudeValue), legend: "curve"},
                ]},
                {id: "derived", rows: [
                    {id: "period", name: t("trig_period_readout"), value: formatWithPi(period(parameters), language), ...texOf(formatWithPi(period(parameters), language)), legend: "curve"},
                    {id: "shift", name: t("trig_shift_readout"), value: formatWithPi(phaseShift(parameters), language), ...texOf(formatWithPi(phaseShift(parameters), language)), legend: "curve"},
                    {id: "range", name: t("trig_range_readout"), value: range === null ? t("trig_all_reals") : `[${number(range[0])}${language === "sl" ? "; " : ", "}${number(range[1])}]`,
                        ...(range === null ? {} : {valueTex: `\\left[${number(range[0]).replace(/\u2212/g, "-").replace(/,/g, "{,}")};\\,${number(range[1]).replace(/\u2212/g, "-").replace(/,/g, "{,}")}\\right]`}), legend: "curve"},
                ]},
            ],
            notes: fn === "tan" ? [{id: "tangent", text: t("trig_tangent_note"), tone: "muted"}] : [],
            legend,
            pucks: [
                {param: "trig.A"},
                {param: "trig.omega", help: t("trig_omega_help")},
                {param: "trig.phi", help: t("trig_phase_help")},
                {param: "trig.B"},
            ],
        };
    }

    protected renderReadout(): React.ReactNode {
        if (pickOn("boardText")) return null; // the readout and legend cards show it
        const {fn, A, omega, phi, B} = this.model;
        const language = currentLanguage();
        const parameters = {fn, A, omega, phi, B};
        const number = (value: number) => formatNumber(value, language);
        const amplitudeValue = amplitude(parameters);
        const range = valueRange(parameters);
        const rows = [
            {id: "equation", label: "f(x)", value: equationText(parameters, language)},
            {id: "phi", label: t("trig_phase_readout"), value: formatWithPi(phi, language)},
            {id: "amplitude", label: t("trig_amplitude_readout"), value: amplitudeValue === null ? NOT_A_NUMBER_TEXT : number(amplitudeValue)},
            {id: "period", label: t("trig_period_readout"), value: formatWithPi(period(parameters), language)},
            {id: "shift", label: t("trig_shift_readout"), value: formatWithPi(phaseShift(parameters), language)},
            {
                id: "range", label: t("trig_range_readout"),
                value: range === null ? t("trig_all_reals") : `[${number(range[0])}${language === "sl" ? "; " : ", "}${number(range[1])}]`,
            },
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={fn === "tan" ? t("trig_tangent_note") : undefined}/>;
    }
}

export default TrigonometricFunctionsGraph;
