import React from "react";
import {DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import IterativeFunctionGraph, {IterationActionId} from "./IterativeFunctionGraph";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {NumberLanguage} from "../../analysis/format";
import {
    ROOT_FINDING_EXAMPLE_IDS, ROOT_FINDING_MAX_STEPS, ROOT_START_MAX, ROOT_START_MIN, rootFindingExample, RootFindingExampleId, RootFindingHistory,
    RootFindingTermination,
} from "../../analysis/rootFinding";
import {
    chooseRootFindingExample, chooseRootFindingMethod, DEFAULT_ROOT_FINDING_MODEL, moveRootFindingStart, ROOT_FINDING_METHODS, RootFindingMethod,
    RootFindingModel, rootFindingHistoryOf, RootFindingStart,
} from "../../analysis/rootFindingModel";
import {rootFindingEditMessage} from "./rootFindingMessages";
import {formatPrecise} from "./BisectionGraph";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {ReadoutHelp} from "../base/controls/ReadoutParts";

/** Time between two playback steps: one step per interval, never more than one per frame (ADR 0012), as for bisection. */
export const ROOT_FINDING_STEP_INTERVAL_MS = 600;

/** The number of iterates the table lists at most (the last ones); the readout rows always describe the last iterate. */
export const ROOT_FINDING_TABLE_ROWS = 10;

/** Drag grid of the start points. */
const START_DRAG_STEP = 0.05;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<RootFindingExampleId, string>> = {
    "square-minus-two": "x² − 2",
    "cubic-two-cycle": "x³ − 2x + 2",
    "cubic-three-roots": "x³ − x",
};

const exampleTitle = (id: RootFindingExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;
const methodTitle = (method: RootFindingMethod): string => method === "newton" ? t("root_finding_method_newton") : t("root_finding_method_secant");

type StatusKind = "ready" | "running" | Exclude<RootFindingTermination, "running">;

/** The ids of the root-finding declaration: the starts, method and example by arbiter key; the rows; the playback actions. */
export type RootFindingIds = {
    param: "root-x0" | "root-x1" | "root-finding-method" | "root-finding-example";
    row: "step" | "iterate" | "f-iterate" | "error" | "reference"; note: "reference";
    legend: "function" | "line" | "iterate" | "start"; section: never; action: IterationActionId;
};

const EXAMPLE_LABEL_KEYS = {
    "square-minus-two": "root_finding_example_square_minus_two",
    "cubic-two-cycle": "root_finding_example_cubic_two_cycle",
    "cubic-three-roots": "root_finding_example_cubic_three_roots",
} as const satisfies Record<RootFindingExampleId, Parameters<typeof message>[0]>;

/** One plotted line segment of the last step: from a graph point to where the tangent or secant meets the x-axis (or the second graph point). */
interface LineSegment {
    from: { x: number; y: number };
    to: { x: number; y: number };
}

interface View {
    history: RootFindingHistory;
    /** The last iterate and its function value. */
    last: number;
    fLast: number;
    /** The tangent or secant of the last step; absent before the first Newton step. */
    line?: LineSegment;
}

/**
 * Newton's and the secant method on a named example, one revealed step at a time (numerical methods lessons N1 to N3). The model
 * is `{method, example, x0, x1, step}`: `step` is the number of revealed steps and the history is recomputed from the other fields
 * (`src/analysis/rootFinding`), never stored. Next step and playback run the same transition. Editing the method, the example or a
 * start resets the step to 0 and pauses; so does anything that replaces the scene, exports a figure or unmounts the graph. A
 * reopened preset is paused at its stored step.
 */
export class RootFindingGraph extends IterativeFunctionGraph<RootFindingModel> {
    /** A derived value keyed by the identity of the model it was computed from; it can never be stale. */
    private readonly historyOf = this.modelCache(rootFindingHistoryOf);
    private startPoints: Partial<Record<RootFindingStart, JXG.Point>> = {};
    /** The drawn objects the legend entries name (`drawnObject`); cleared with the scene. */
    private drawn: Partial<Record<"function" | "line" | "iterate", unknown>> = {};

    override presetCollection() {
        return functionPresetCollections["root-finding"];
    }

    protected defaultModel(): RootFindingModel {
        return {...DEFAULT_ROOT_FINDING_MODEL};
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-2.5, 4, 3.5, -3];
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "root-finding";
    }

    protected stepIntervalMs(): number {
        return ROOT_FINDING_STEP_INTERVAL_MS;
    }

    protected iterationIndex(model: RootFindingModel): number {
        return model.step;
    }

    protected override normalizeIterationModel(model: RootFindingModel): RootFindingModel {
        return this.normalized(model);
    }

    protected cannotAdvanceMessage(): Message {
        return message("root_finding_cannot_advance");
    }

    private viewOf(model: RootFindingModel): View {
        const history = this.historyOf(model);
        const {iterates, example, stepsTaken: taken} = history;
        const last = iterates[iterates.length - 1];
        const value = example.value;
        let line: LineSegment | undefined;
        if (taken >= 1) {
            line = {from: {x: iterates[taken - 1], y: value(iterates[taken - 1])}, to: {x: last, y: 0}};
        } else if (model.method === "secant") {
            // Before the first secant step only the line through the two starts is shown; its x-intercept is the prediction.
            line = {from: {x: iterates[0], y: value(iterates[0])}, to: {x: iterates[1], y: value(iterates[1])}};
        }
        return {history, last, fLast: value(last), line};
    }

    /** The model with `step` cut to the steps the history can take (a stored step may lie beyond a termination). */
    private normalized(model: RootFindingModel): RootFindingModel {
        const taken = rootFindingHistoryOf(model).stepsTaken;
        return taken === model.step ? model : {...model, step: taken};
    }

    protected canAdvance(model: RootFindingModel = this.model): boolean {
        return this.historyOf(model).termination === "running";
    }

    /** The one mathematical transition of the iteration: Next step and every playback step run it. */
    protected transition(): IterationOutcome {
        if (!this.canAdvance()) return "complete";
        const next = rootFindingHistoryOf({...this.model, step: this.model.step + 1});
        this.commitModel({...this.model, step: next.stepsTaken});
        return next.termination === "running" ? "continue" : "complete";
    }

    /** Back to step 0 of the same method, example and starts; playback stops. */
    protected resetIteration(): void {
        this.replaceModel({...this.model, step: 0});
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    protected setMethod(value: unknown): void {
        const edit = chooseRootFindingMethod(this.model, value);
        if (!edit.ok) throw new DomainError(rootFindingEditMessage(edit.issue));
        if (edit.model !== this.model) this.replaceModel(edit.model);
    }

    protected setExample(value: unknown): void {
        const edit = chooseRootFindingExample(this.model, value);
        if (!edit.ok) throw new DomainError(rootFindingEditMessage(edit.issue));
        this.replaceModel(edit.model);
    }

    protected setStart(start: RootFindingStart, value: number): void {
        const edit = moveRootFindingStart(this.model, start, value);
        if (!edit.ok) throw new DomainError(rootFindingEditMessage(edit.issue));
        if (edit.model !== this.model) this.replaceModel(edit.model);
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"root-x0": value => this.setStart("x0", value), "root-x1": value => this.setStart("x1", value)},
            choices: {"root-finding-example": value => this.setExample(value), "root-finding-method": value => this.setMethod(value)},
        };
    }

    protected override syncSceneToModel(): void {
        this.startPoints.x0?.moveTo([this.model.x0, 0]);
        this.startPoints.x1?.moveTo([this.model.x1, 0]);
    }

    protected override onSceneRemoved(): void {
        this.startPoints = {};
        this.drawn = {};
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    private errorOf(model: RootFindingModel, x: number): number {
        return Math.abs(x - rootFindingExample(model.example).referenceRoot);
    }

    protected createScene(): void {
        const board = this.board;
        const view = () => this.viewOf(this.model);
        const example = () => rootFindingExample(this.model.example);
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thick = () => Math.max(3, this.displaySettings.strokeWidth * 2);
        const hasLine = () => view().line !== undefined;
        const secant = () => this.model.method === "secant";

        this.drawn.function = this.own(board.create("functiongraph", [(x: number) => example().value(x)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        }));

        // The tangent or secant of the last step, as a segment from its graph point to the x-axis.
        this.drawn.line = this.own(board.create("segment", [[() => view().line?.from.x ?? 0, () => view().line?.from.y ?? 0], [() => view().line?.to.x ?? 0, () => view().line?.to.y ?? 0]], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: thick, highlight: false, fixed: true, withLabel: false, visible: hasLine,
        }));
        // Drop line from the last iterate on the axis to its function value.
        this.own(board.create("segment", [[() => view().last, 0], [() => view().last, () => view().fLast]], {
            strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.7),
            highlight: false, fixed: true, withLabel: false,
        }));
        const marker = (x: () => number, y: () => number, color: string, visible: () => boolean = () => true) => {
            const point = board.create("point", [x, y], {
                ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, fillColor: color, highlightFillColor: color,
                size: () => Math.max(3, this.displaySettings.pointSize * 0.7), visible,
            });
            this.own(point);
            return point;
        };
        this.drawn.iterate = marker(() => view().last, () => view().fLast, GraphPalette.constructionAccent);
        marker(() => view().last, () => 0, GraphPalette.constructionAccent);
        marker(() => view().line?.from.x ?? 0, () => view().line?.from.y ?? 0, GraphPalette.comparisonCurve, hasLine);

        // The starts: draggable points on the x-axis. x1 exists for the secant method only.
        const start = (which: RootFindingStart, name: string, placement: "below-left" | "below-right", visible: () => boolean) => {
            const point = this.axisPoint({
                x: this.model[which], name, placement, color: GraphPalette.comparisonCurve, min: ROOT_START_MIN, max: ROOT_START_MAX, step: START_DRAG_STEP,
                write: x => this.setStart(which, x), visible,
            });
            this.startPoints[which] = point;
        };
        start("x0", "$$x_0$$", "below-left", () => true);
        start("x1", "$$x_1$$", "below-right", secant);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {method, example, x0, x1, step} = this.model;
        const history = this.historyOf(this.model);
        const playing = this.playback.isPlaying;
        const canAdvance = history.termination === "running";
        return <>
            <div className="inspector-group">
                <PuckOwned param="root-finding-method"><ChoiceSelect label={t("root_finding_method_label")} value={method} help={t("root_finding_method_help")}
                              options={ROOT_FINDING_METHODS.map(id => ({value: id, text: methodTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMethod(next))}/></PuckOwned>
                <ChoiceSelect label={t("root_finding_example_label")} value={example} help={t("root_finding_example_help")}
                              options={ROOT_FINDING_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <PuckOwnedGroup params={method === "secant" ? ["root-x0", "root-x1"] : ["root-x0"]} className="inspector-group">
                <PuckOwned param="root-x0"><Slider customText={t("root_finding_x0_label")} value={x0} min={ROOT_START_MIN} max={ROOT_START_MAX} step={0.1} fieldDecimals={9}
                        rejectedHint={t("root_finding_x0_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setStart("x0", next))}/></PuckOwned>
                {method === "secant" && <PuckOwned param="root-x1"><Slider customText={t("root_finding_x1_label")} value={x1} min={ROOT_START_MIN} max={ROOT_START_MAX} step={0.1} fieldDecimals={9}
                        rejectedHint={t("root_finding_x1_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setStart("x1", next))}/></PuckOwned>}
                <p className="inspector-help">{t("root_finding_starts_help")}</p>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <PlaybackButtons placement="graph" groupLabel={t("root_finding_iteration_controls")} nextLabel={t("next_step")} resetLabel={t("root_finding_reset")} playing={playing}
                                 onNext={() => this.ignoreOutOfDomain(() => this.nextStep())}
                                 onPlayPause={() => { if (playing) this.pauseIteration(); else this.play(); }} onReset={() => this.resetIteration()}
                                 {...playbackBlocks({atStart: step === 0, atEnd: !canAdvance, playing})}/>
                <p className="inspector-help">{t("root_finding_playback_note")}</p>
            </div>
        </>;
    }

    /** A declared legend replaces the panel's own, so Orodja shows no second one. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    /** The status to state in words, with a stable id for tests and for assistive technology; one source for the panel and the declaration. */
    private status(model: RootFindingModel, language: NumberLanguage): { id: StatusKind; text: Message; tone?: "warning" | "success" } {
        const {history, last} = this.viewOf(model);
        const newton = model.method === "newton";
        switch (history.termination) {
            case "running":
                return history.stepsTaken === 0
                    ? {id: "ready", text: message(newton ? "root_finding_status_ready_newton" : "root_finding_status_ready_secant")}
                    : {id: "running", text: message(newton ? "root_finding_status_running_newton" : "root_finding_status_running_secant")};
            case "root-found": return {id: "root-found", text: message("root_finding_status_root_found", {value0: formatPrecise(last, language)}), tone: "success"};
            case "flat-tangent": return {id: "flat-tangent", text: message("root_finding_status_flat_tangent"), tone: "warning"};
            case "flat-secant": return {id: "flat-secant", text: message("root_finding_status_flat_secant"), tone: "warning"};
            case "repeated-iterate": return {id: "repeated-iterate", text: message("root_finding_status_repeated"), tone: "warning"};
            case "non-finite": return {id: "non-finite", text: message("root_finding_status_non_finite"), tone: "warning"};
            case "step-cap": return {id: "step-cap", text: message("root_finding_status_cap", {value0: ROOT_FINDING_MAX_STEPS}), tone: "warning"};
        }
    }

    // ---- Declaration ---------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "root-x0": {read: () => this.model.x0, apply: (value: number) => this.setStart("x0", value)},
            "root-x1": {read: () => this.model.x1, apply: (value: number) => this.setStart("x1", value)},
            "root-finding-method": {read: () => this.model.method, apply: (value: unknown) => this.setMethod(value)},
            "root-finding-example": {read: () => this.model.example, apply: (value: unknown) => this.setExample(value)},
        };
    }

    /**
     * Pure data from the model. Board: the two starts (x1 only for the secant method) and the method as a segmented puck, the playback
     * actions, the legend of what the board draws. Orodja: the example (chosen once, it resets the starts). The rows, note and status
     * come from the panel; the table of iterates has no declared form and stays in Orodja.
     */
    protected override declaration(): GraphDeclaration {
        const range = (key: "root-x0" | "root-x1", label: "root_finding_x0_name" | "root_finding_x1_name", symbol: string): ParameterDeclaration => ({
            key, kind: "range", label: message(label), symbol, help: message("root_finding_starts_help"), placement: "board",
            min: ROOT_START_MIN, max: ROOT_START_MAX, step: 0.1, maxDecimals: 3, morph: false,
        });
        const secant = this.model.method === "secant";
        const legend: LegendEntry<RootFindingIds>[] = [
            {id: "function", label: message("root_finding_legend_function"), kind: "line", object: "function"},
            {id: "line", label: message("root_finding_legend_line"), kind: "line", object: "line"},
            {id: "iterate", label: message("root_finding_legend_iterate"), kind: "point", object: "iterate"},
            {id: "start", label: message("root_finding_legend_start"), kind: "point", object: "start"},
        ];
        return {
            ...this.commonDeclaration(),
            formula: {label: message("root_finding_formula_label"), tex: `f(x)=${rootFindingExample(this.model.example).latex}`},
            parameters: [
                {key: "root-finding-method", kind: "choice", label: message("root_finding_method_label"), help: message("root_finding_method_help"), placement: "board", puck: true,
                    options: ROOT_FINDING_METHODS.map(id => ({
                        value: id, label: message(id === "newton" ? "root_finding_method_newton" : "root_finding_method_secant"),
                        short: message(id === "newton" ? "root_finding_method_short_newton" : "root_finding_method_short_secant"),
                    }))},
                {key: "root-finding-example", kind: "choice", label: message("root_finding_example_label"), help: message("root_finding_example_help"), placement: "tools",
                    options: ROOT_FINDING_EXAMPLE_IDS.map(id => ({value: id, label: message(EXAMPLE_LABEL_KEYS[id])}))},
                range("root-x0", "root_finding_x0_name", "x_0"),
                ...(secant ? [range("root-x1", "root_finding_x1_name", "x_1")] : []),
            ],
            legend,
            actions: this.iterationActions(),
        };
    }

    /** The rows, the note and the status of the inspector as declared data (`renderReadout` draws them from it). */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const language = currentLanguage();
        const {history, last, fLast} = this.viewOf(model);
        const reference = rootFindingExample(model.example).referenceRoot;
        const text = (value: number) => ({kind: "formatted", text: formatPrecise(value, language)} as const);
        const status = this.status(model, language);
        const example = rootFindingExample(model.example);
        return {
            rows: [
                {id: "step", name: message("root_finding_readout_step", {value0: messageNumber(ROOT_FINDING_MAX_STEPS, 0)}), value: messageNumber(history.stepsTaken, 0)},
                {id: "iterate", name: message("root_finding_readout_iterate"), value: text(last)},
                {id: "f-iterate", name: message("root_finding_readout_value"), value: text(fLast)},
                {id: "error", name: message("root_finding_readout_error"), value: text(this.errorOf(model, last))},
                {id: "reference", name: message("root_finding_readout_reference"), value: text(reference)},
            ],
            notes: [{id: "reference", text: message("root_finding_note", {value0: formatPrecise(reference, language)})}],
            status: [{id: status.id, text: status.text, ...(status.tone ? {tone: status.tone} : {})}],
            plotted: x => example.value(x),
            must: [{x: model.x0, y: 0}, ...(model.method === "secant" ? [{x: model.x1, y: 0}] : [])],
        };
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const element = id === "start" ? this.startPoints.x0 : id === "function" || id === "line" || id === "iterate" ? this.drawn[id] : undefined;
        if (typeof element !== "object" || element === null || Array.isArray(element)) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const filled = id === "iterate" || id === "start";
        return {color: String(drawn.evalVisProp(filled ? "fillcolor" : "strokecolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        if (!this.performIterationAction(id)) throw new Error("Unknown action");
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const language = currentLanguage();
        const {history} = this.viewOf(model);
        const number = (value: number) => formatPrecise(value, language);
        const all = history.iterates;
        const first = Math.max(0, all.length - ROOT_FINDING_TABLE_ROWS);
        const status = this.status(model, language);
        return <>
            {this.renderDeclaredReadout()}
            <div className="inspector-group function-readout root-finding-table">
                <h3>{t("root_finding_table_title")}</h3>
                <table aria-label={t("root_finding_table_title")}>
                    <thead><tr>
                        <th scope="col">{t("root_finding_table_index")}</th><th scope="col">{t("root_finding_table_x")}</th>
                        <th scope="col">{t("root_finding_table_value")}</th><th scope="col">{t("root_finding_table_error")}</th>
                    </tr></thead>
                    <tbody>
                        {all.slice(first).map((x, offset) => <tr key={first + offset} data-iterate-row={first + offset}>
                            <th scope="row">{first + offset}</th><td>{number(x)}</td><td>{number(history.example.value(x))}</td><td>{number(this.errorOf(model, x))}</td>
                        </tr>)}
                    </tbody>
                </table>
                {first > 0 && <ReadoutHelp>{t("root_finding_table_truncated", {value0: ROOT_FINDING_TABLE_ROWS})}</ReadoutHelp>}
            </div>
            <FunctionStatus className="bisection-status" dataAttribute="root-finding-status" lines={[{id: status.id, text: renderMessage(status.text)}]} muted={this.playback.isPlaying}/>
        </>;
    }
}

export default RootFindingGraph;
