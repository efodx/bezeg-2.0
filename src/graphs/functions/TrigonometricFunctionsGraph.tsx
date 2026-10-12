import React from "react";
import BaseFunctionGraph, {DomainError, localizedSliderValue, FunctionChoiceAction, FunctionParameterAction, FunctionVisibilityAction} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {
    AMPLITUDE_MAX, AMPLITUDE_MIN, AMPLITUDE_STEP, amplitude, basicValue, equationText, formatPhase, formatWithPi, GraphPiece, joinPieces, MIDLINE_MAX,
    MIDLINE_MIN, MIDLINE_STEP, OMEGA_MAX, OMEGA_MIN, OMEGA_STEP, period, PHASE_MAX, PHASE_MIN, PHASE_STEP, phaseShift, snapPhase, tangentAsymptotes,
    tangentBranches, TRIG_FUNCTIONS, trigValue, valueRange,
} from "../../analysis/trigonometric";
import {
    DEFAULT_TRIGONOMETRIC_MODEL, isAmplitude, isMidline, isOmega, isPhase, isTrigFunction, parseTrigonometricModel, TrigonometricModel,
} from "../../analysis/trigonometricModel";
import {UnsupportedLessonActionError} from "../../learning/model";
import {SizeContext} from "../context/SizeContext";
import {GraphPalette} from "../styles/GraphPalette";

/** Removes floating-point noise left by slider arithmetic (-3 + 30 * 0.1) without changing meaningful digits. */
const clean = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

/** The reference graph is the plain basic function: A = 1, omega = 1, phi = 0, B = 0. */
const REFERENCE = {A: 1, omega: 1, phi: 0, B: 0} as const;

/**
 * Trigonometric functions `f(x) = A * g(omega * x + phi) + B` with `g` one of sin, cos, tan, four parameter sliders, an
 * optional dashed reference graph of the plain `g(x)` and the dashed midline `y = B`. Tangent is drawn branch by branch
 * (one run of points between consecutive asymptotes) so that it is never joined across an asymptote. The model is
 * `{fn, A, omega, phi, B, reference}`; the mathematics comes from `src/analysis/trigonometric`.
 */
export class TrigonometricFunctionsGraph extends BaseFunctionGraph<TrigonometricModel> {
    override presets(): string {
        return "trigonometric-function";
    }

    protected defaultModel(): TrigonometricModel {
        return {...DEFAULT_TRIGONOMETRIC_MODEL};
    }

    protected parseModel(data: unknown): TrigonometricModel | undefined {
        return parseTrigonometricModel(data);
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-7, 4, 7, -4];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    protected setFunction(value: unknown): void {
        if (!isTrigFunction(value)) throw new DomainError("The function must be sin, cos or tan.");
        this.commitModel({...this.model, fn: value});
    }

    protected setAmplitude(value: number): void {
        if (!isAmplitude(value)) throw new DomainError(`The amplitude A must be a finite number between ${AMPLITUDE_MIN} and ${AMPLITUDE_MAX}.`);
        this.commitModel({...this.model, A: clean(value)});
    }

    protected setOmega(value: number): void {
        if (!isOmega(value)) throw new DomainError(`The frequency omega must be a finite number between ${OMEGA_MIN} and ${OMEGA_MAX}.`);
        this.commitModel({...this.model, omega: clean(value)});
    }

    protected setPhase(value: number): void {
        if (!isPhase(value)) throw new DomainError("The phase phi must be a finite number between -pi and pi.");
        this.commitModel({...this.model, phi: Math.min(PHASE_MAX, Math.max(PHASE_MIN, snapPhase(value)))});
    }

    protected setMidline(value: number): void {
        if (!isMidline(value)) throw new DomainError(`The midline B must be a finite number between ${MIDLINE_MIN} and ${MIDLINE_MAX}.`);
        this.commitModel({...this.model, B: clean(value)});
    }

    protected setReferenceVisible(visible: boolean): void {
        this.commitModel({...this.model, reference: visible});
    }

    protected override applyFunctionParameter(action: FunctionParameterAction): void {
        switch (action.name) {
            case "A":
                return this.setAmplitude(action.value);
            case "omega":
                return this.setOmega(action.value);
            case "phi":
                return this.setPhase(action.value);
            case "B":
                return this.setMidline(action.value);
            default:
                throw new UnsupportedLessonActionError(action);
        }
    }

    protected override applyFunctionVisibility(action: FunctionVisibilityAction): void {
        if (action.target === "reference") {
            this.setReferenceVisible(action.visible);
            return;
        }
        throw new UnsupportedLessonActionError(action);
    }

    protected override applyFunctionChoice(action: FunctionChoiceAction): void {
        if (action.name === "trig-function") {
            this.setFunction(action.value);
            return;
        }
        throw new UnsupportedLessonActionError(action);
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
        const strokeWidth = () => SizeContext.strokeWidth;
        const referenceStrokeWidth = () => Math.max(1, SizeContext.strokeWidth * 0.72);
        const branches = (parameters: Omit<TrigonometricModel, "fn" | "reference">) => () => {
            const {left, right} = view();
            return tangentBranches(parameters, left, right);
        };

        // Layers, lowest first: midline, reference graph, asymptotes, then the main graph over them.
        this.own(board.create("functiongraph", [() => model().B], {
            strokeColor: GraphPalette.referenceCurve, dash: 3, highlight: false, fixed: true, strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.6),
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
        }, {strokeColor: GraphPalette.referenceCurve, dash: 3, strokeOpacity: 0.7, highlight: false, fixed: true, strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.6), visible: isTangent});

        this.own(board.create("functiongraph", [(x: number) => trigValue(model(), x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth, visible: () => !isTangent(),
        }));
        this.dataCurve(() => isTangent() ? branches(model())() : [], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth, visible: isTangent,
        });

        // The equation, the most important readout, stays on the board; the reference has its own line while it is shown.
        this.caption("top-left", [
            {text: () => equationText(model(), language()), scale: 1.2, math: true},
            {text: () => `${model().fn}(x) (${t("trig_reference_legend")})`, visible: () => model().reference},
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {fn, A, omega, phi, B, reference} = this.state;
        const language = currentLanguage();
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("trig_function_label")} value={fn} help={t("trig_function_help")}
                              options={TRIG_FUNCTIONS.map(name => ({value: name, text: `${name} x`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("trig_amplitude_label")} min={AMPLITUDE_MIN} max={AMPLITUDE_MAX} step={AMPLITUDE_STEP} fixedValue={A}
                        formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setAmplitude(next))}/>
                <Slider customText={t("trig_omega_label")} min={OMEGA_MIN} max={OMEGA_MAX} step={OMEGA_STEP} fixedValue={omega}
                        help={t("trig_omega_help")} formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setOmega(next))}/>
                <Slider customText={t("trig_phase_label")} min={PHASE_MIN} max={PHASE_MAX} step={PHASE_STEP} fixedValue={phi}
                        help={t("trig_phase_help")} formatValue={value => formatPhase(value, language)}
                        onChange={next => this.ignoreOutOfDomain(() => this.setPhase(next))}/>
                <Slider customText={t("trig_midline_label")} min={MIDLINE_MIN} max={MIDLINE_MAX} step={MIDLINE_STEP} fixedValue={B}
                        formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setMidline(next))}/>
            </div>
            <div className="inspector-group">
                <OnOffSwitch initialState={reference} label={t("trig_show_reference")}
                             onChange={checked => this.setReferenceVisible(checked)}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const {fn, A, omega, phi, B} = this.state;
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
