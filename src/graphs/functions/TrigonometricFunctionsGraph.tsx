import React from "react";
import BaseFunctionGraph, {DomainError, localizedSliderValue, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import Slider from "../../inputs/Slider";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, messageNumber, t} from "../../localization";
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

/** The ids of the trigonometric declaration: the four parameters are board pucks, the reference graph a switch puck; the drawn graphs are the legend. */
export type TrigonometricIds = {
    param: "A" | "omega" | "phi" | "B";
    row: "equation" | "A" | "omega" | "phase-value" | "B" | "phi" | "amplitude" | "period" | "shift" | "range";
    note: "tangent"; legend: "curve" | "midline" | "reference"; section: never; action: "reference";
};

/** The reference graph is the plain basic function: A = 1, omega = 1, phi = 0, B = 0. */
const REFERENCE = {A: 1, omega: 1, phi: 0, B: 0} as const;

/**
 * Trigonometric functions `f(x) = A * g(omega * x + phi) + B` with `g` one of sin, cos, tan, four parameter sliders, an
 * optional dashed reference graph of the plain `g(x)` and the dashed midline `y = B`. Tangent is drawn branch by branch
 * (one run of points between consecutive asymptotes) so that it is never joined across an asymptote. The model is
 * `{fn, A, omega, phi, B, reference}`; the mathematics comes from `src/analysis/trigonometric`.
 */
export class TrigonometricFunctionsGraph extends BaseFunctionGraph<TrigonometricModel> {
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`); a tangent graph is a separate data curve. */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

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
        this.drawn.set("midline", this.own(board.create("functiongraph", [() => model().B], {
            strokeColor: GraphPalette.referenceCurve, dash: 3, highlight: false, fixed: true, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.6),
        })));

        const referenceVisible = () => model().reference;
        this.drawn.set("reference", this.own(board.create("functiongraph", [(x: number) => basicValue(model().fn, x)], {
            strokeColor: GraphPalette.constructionAccent, dash: 2, strokeOpacity: 0.88, highlight: false, fixed: true, strokeWidth: referenceStrokeWidth, visible: () => referenceVisible() && !isTangent(),
        })));
        this.drawn.set("reference-tan", this.dataCurve(() => referenceVisible() && isTangent() ? branches(REFERENCE)() : [], {
            strokeColor: GraphPalette.constructionAccent, dash: 2, strokeOpacity: 0.88, highlight: false, fixed: true, strokeWidth: referenceStrokeWidth, visible: () => referenceVisible() && isTangent(),
        }));

        this.dataCurve(() => {
            if (!isTangent()) return [];
            const {omega, phi} = model();
            const {left, right, top, bottom} = view();
            return tangentAsymptotes(omega, phi, left, right).map(x => ({x: [x, x], y: [bottom, top]}));
        }, {strokeColor: GraphPalette.referenceCurve, dash: 3, strokeOpacity: 0.7, highlight: false, fixed: true, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.6), visible: isTangent});

        this.drawn.set("curve", this.own(board.create("functiongraph", [(x: number) => trigValue(model(), x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth, visible: () => !isTangent(),
        })));
        this.drawn.set("curve-tan", this.dataCurve(() => isTangent() ? branches(model())() : [], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth, visible: isTangent,
        }));
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {fn, A, omega, phi, B} = this.model;
        const language = currentLanguage();
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("trig_function_label")} value={fn} help={t("trig_function_help")}
                              options={TRIG_FUNCTIONS.map(name => ({value: name, text: `${name} x`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <PuckOwnedGroup params={["A", "omega", "phi", "B"]} className="inspector-group">
                <PuckOwned param="A"><Slider customText={t("trig_amplitude_label")} min={AMPLITUDE_MIN} max={AMPLITUDE_MAX} step={AMPLITUDE_STEP} value={A}
                        formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setAmplitude(next))}/></PuckOwned>
                <PuckOwned param="omega"><Slider customText={t("trig_omega_label")} min={OMEGA_MIN} max={OMEGA_MAX} step={OMEGA_STEP} value={omega}
                        help={t("trig_omega_help")} formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setOmega(next))}/></PuckOwned>
                <PuckOwned param="phi"><Slider customText={t("trig_phase_label")} min={PHASE_MIN} max={PHASE_MAX} step={PHASE_STEP} value={phi}
                        help={t("trig_phase_help")} formatValue={value => formatPhase(value, language)}
                        onChange={next => this.ignoreOutOfDomain(() => this.setPhase(next))}/></PuckOwned>
                <PuckOwned param="B"><Slider customText={t("trig_midline_label")} min={MIDLINE_MIN} max={MIDLINE_MAX} step={MIDLINE_STEP} value={B}
                        formatValue={localizedSliderValue} onChange={next => this.ignoreOutOfDomain(() => this.setMidline(next))}/></PuckOwned>
            </PuckOwnedGroup>
        </>;
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <PuckOwnedGroup params={["reference"]} className="inspector-group">
            <OnOffSwitch checked={this.model.reference} label={t("trig_show_reference")}
                         onChange={checked => this.setReferenceVisible(checked)}/>
        </PuckOwnedGroup>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys; each applies the existing validated setter. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            A: {read: () => this.model.A, apply: (value: number) => this.setAmplitude(value)},
            omega: {read: () => this.model.omega, apply: (value: number) => this.setOmega(value)},
            phi: {read: () => this.model.phi, apply: (value: number) => this.setPhase(value)},
            B: {read: () => this.model.B, apply: (value: number) => this.setMidline(value)},
        };
    }

    /** The common declaration (rows, view marks) plus the four parameters as board pucks, the reference switch and the legend of the drawn graphs. */
    protected override declaration(): GraphDeclaration {
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "A", kind: "range", label: message("trig_amplitude_name"), symbol: "A", placement: "board",
                    min: AMPLITUDE_MIN, max: AMPLITUDE_MAX, step: AMPLITUDE_STEP, maxDecimals: 1},
                {key: "omega", kind: "range", label: message("trig_omega_name"), symbol: "\\omega", help: message("trig_omega_help"), placement: "board",
                    min: OMEGA_MIN, max: OMEGA_MAX, step: OMEGA_STEP, maxDecimals: 2},
                {key: "phi", kind: "range", label: message("trig_phase_name"), symbol: "\\varphi", help: message("trig_phase_help"), placement: "board",
                    min: PHASE_MIN, max: PHASE_MAX, step: PHASE_STEP, maxDecimals: 2},
                {key: "B", kind: "range", label: message("trig_midline_name"), symbol: "B", placement: "board",
                    min: MIDLINE_MIN, max: MIDLINE_MAX, step: MIDLINE_STEP, maxDecimals: 1},
            ],
            legend: [
                {id: "curve", label: message("trig_legend_curve"), kind: "line", object: "curve"},
                {id: "midline", label: message("trig_legend_midline"), kind: "dashed", object: "midline"},
                ...(this.model.reference ? [{id: "reference" as const, label: message("trig_legend_reference"), kind: "dashed" as const, object: "reference"}] : []),
            ],
            actions: [
                {id: "reference", label: message("trig_reference_name"), help: message("trig_show_reference"), placement: "board", enabled: true,
                    pressed: this.model.reference, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "reference") runAs("learner", () => this.setReferenceVisible(!this.model.reference));
        else throw new Error("Unknown action");
    }

    /** The main graph and the reference are a function graph, or a separate branch-by-branch data curve while the function is tan. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(this.model.fn === "tan" && (id === "curve" || id === "reference") ? `${id}-tan` : id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp("strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    protected override onSceneRemoved(): void {
        this.drawn.clear();
    }

    /**
     * The highest and lowest point of sine and cosine nearest to x = 0 (the lessons read heights and peak distances off them), so the
     * view keeps them visible; tangent has none.
     */
    private extremes({fn, A, omega, phi, B}: {fn: TrigonometricModel["fn"]; A: number; omega: number; phi: number; B: number}): {x: number; y: number}[] {
        if (fn === "tan" || A === 0) return [];
        const half = Math.PI / omega;
        // The argument is 0 or pi/2 away from a peak for cos and sin respectively: peak of sin at omega x + phi = pi/2, of cos at 0.
        const peak = ((fn === "sin" ? Math.PI / 2 : 0) - phi) / omega;
        const nearest = (x: number) => x - Math.round(x / (2 * half)) * 2 * half;
        const high = nearest(peak);
        const low = nearest(peak + half);
        const top = B + Math.abs(A);
        const bottom = B - Math.abs(A);
        const [highX, lowX] = A > 0 ? [high, low] : [low, high];
        return [{x: highX, y: top}, {x: lowX, y: bottom}];
    }

    /** Declared by the base (task 08): the readout rows, the note and the plotted curve; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {fn, A, omega, phi, B} = this.model;
        const language = currentLanguage();
        const parameters = {fn, A, omega, phi, B};
        const number = (value: number) => formatNumber(value, language);
        const amplitudeValue = amplitude(parameters);
        const range = valueRange(parameters);
        const formatted = (text: string) => ({kind: "formatted", text} as const);
        return {
            rows: [
                {id: "equation", symbol: "f(x)", value: message("trig_equation_value", {value0: equationText(parameters, language)})},
                {id: "A", symbol: "A", value: messageNumber(A)},
                {id: "omega", symbol: "\\omega", value: messageNumber(omega)},
                {id: "phase-value", symbol: "\\varphi", value: formatted(formatPhase(phi, language))},
                {id: "B", symbol: "B", value: messageNumber(B)},
                {id: "phi", name: message("trig_phase_readout"), value: formatted(formatWithPi(phi, language))},
                {id: "amplitude", name: message("trig_amplitude_readout"), value: amplitudeValue === null ? formatted(NOT_A_NUMBER_TEXT) : messageNumber(amplitudeValue)},
                {id: "period", name: message("trig_period_readout"), value: formatted(formatWithPi(period(parameters), language))},
                {id: "shift", name: message("trig_shift_readout"), value: formatted(formatWithPi(phaseShift(parameters), language))},
                {
                    id: "range", name: message("trig_range_readout"),
                    value: range === null ? message("trig_all_reals") : formatted(`[${number(range[0])}${language === "sl" ? "; " : ", "}${number(range[1])}]`),
                },
            ],
            notes: fn === "tan" ? [{id: "tangent", text: message("trig_tangent_note")}] : [],
            plotted: x => trigValue(parameters, x),
            must: this.extremes(parameters),
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default TrigonometricFunctionsGraph;
