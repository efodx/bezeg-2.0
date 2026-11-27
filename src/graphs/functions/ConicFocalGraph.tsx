import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FillCurve, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import type {GraphDeclaration, ViewMark, ViewMarks} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import type {ViewBox} from "../base/writes/viewAdapter";
import {PuckOwned} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import Slider from "../../inputs/Slider";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {FunctionStatus} from "./FunctionStatus";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {ConicKind} from "../../analysis/conic";
import {
    chooseConicExample, CONIC_ELL_MAX, CONIC_ELL_MIN, CONIC_EPSILON_MAX, CONIC_EPSILON_MIN, CONIC_EXAMPLE_IDS, CONIC_PHI_MAX, CONIC_PHI_MIN,
    CONIC_WEIGHT_MAX, CONIC_WEIGHT_MIN, ConicEdit, conicExampleOf, ConicExampleId, ConicFocalModel, conicFocalView, ConicFocalView, conicPhiNear,
    defaultConicFocalModel, setConicBridge, setConicEll, setConicEpsilon, setConicPhi, setConicWeight,
} from "../../analysis/conicFocalModel";
import {conicFocalEditMessage} from "./conicFocalMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** The picture holds the focus, both foci of the examples and the conic around them; the units are equal on both axes. */
/** The starting window; the view director fits the box around the key points (`conicFrame`), not this whole window, between the cards. */
export const CONIC_VIEW_BOX: BoundingBox = [-14, 20, 14, -10];
/** The padded box around key points, at least this many units each way so a circle or a lone focus keeps a sensible scale; it stays inside the starting window. */
const FRAME_MIN_SPAN = 10;
function conicFrame(points: readonly (readonly [number, number])[]): ViewBox {
    const [wLeft, wTop, wRight, wBottom] = CONIC_VIEW_BOX;
    if (points.length === 0) return [wLeft, wTop, wRight, wBottom];
    let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
    for (const [x, y] of points) { left = Math.min(left, x); right = Math.max(right, x); top = Math.max(top, y); bottom = Math.min(bottom, y); }
    const padX = Math.max(1, (right - left) * 0.12), padY = Math.max(1, (top - bottom) * 0.12);
    left -= padX; right += padX; top += padY; bottom -= padY;
    const growX = Math.max(0, FRAME_MIN_SPAN - (right - left)) / 2, growY = Math.max(0, FRAME_MIN_SPAN - (top - bottom)) / 2;
    return [Math.max(wLeft, left - growX), Math.min(wTop, top + growY), Math.min(wRight, right + growX), Math.max(wBottom, bottom - growY)];
}
const DIRECTRIX_DASH = 3;
const BRIDGE_DASH = 4;

/** The ids of the conic declaration: the eccentricity and (with the arc shown) the middle weight are pucks; the matched weight is an Orodja action. */
export type ConicIds = {
    param: "conic-epsilon" | "conic-weight";
    row: "kind" | "pf" | "pd" | "ratio" | "pf2" | "sum" | "difference" | "weight" | "matched-weight" | "weight-kind" | "deviation"; note: "definition";
    legend: "conic" | "directrix" | "pf" | "pd" | "bridge" | "focus"; section: never; action: "matched-weight";
};

const kindMessage = (kind: ConicKind): Message => {
    switch (kind) {
        case "circle": return message("conic_kind_circle");
        case "ellipse": return message("conic_kind_ellipse");
        case "parabola": return message("conic_kind_parabola");
        case "hyperbola": return message("conic_kind_hyperbola");
    }
};

const exampleText = (id: ConicExampleId): string => {
    switch (id) {
        case "ellipse": return t("conic_example_ellipse");
        case "parabola": return t("conic_example_parabola");
        case "hyperbola": return t("conic_example_hyperbola");
        case "circle": return t("conic_example_circle");
        case "bridge": return t("conic_example_bridge");
    }
};

/**
 * Conic focal view (lesson S6): the conic is drawn from its definition |PF| = e |Pd| (`src/analysis/conic`), the point P slides
 * along it, and an optional rational quadratic Bezier arc is laid over it. The model is `ConicFocalModel`
 * (`src/analysis/conicFocalModel`): the focus, the side of the directrix, the semi-latus rectum l, the numerical eccentricity e, the
 * polar angle of P and the optional middle weight. The kind (circle, ellipse, parabola, hyperbola) is derived from e alone, the
 * parabola only at exactly e = 1 and the circle (without a directrix) at exactly e = 0.
 *
 * Rules (reject, never clamp): e in [0, 2.5], l in [0.5, 6], phi in [-pi, pi], a middle weight in [0.1, 5]. A setter that would
 * break a rule throws a `DomainError` and leaves the model unchanged.
 */
export class ConicFocalGraph extends BaseFunctionGraph<ConicFocalModel> {
    private pointP?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
    /** The view marks of the conic and its foci; they do not depend on P, so dragging P does not move the view. */
    private marksMemo?: { key: string; marks: ViewMarks; frame: ViewBox };

    override presetCollection() {
        return functionPresetCollections["conic-focal"];
    }

    protected defaultModel(): ConicFocalModel {
        return defaultConicFocalModel();
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...CONIC_VIEW_BOX];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    private viewOf(model: ConicFocalModel): ConicFocalView {
        return this.memoView(model, () => conicFocalView(model));
    }

    /** The model module decides; a refusal becomes a localized `DomainError`, no change commits nothing. */
    private applyEdit(edit: ConicEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) throw new DomainError(conicFocalEditMessage(edit.issue));
        if (edit.model === this.model) return;
        this.commitModel(edit.model, options);
    }

    protected setExample(value: unknown): void { this.applyEdit(chooseConicExample(value)); }

    protected setEpsilon(value: number): void { this.applyEdit(setConicEpsilon(this.model, value)); }

    protected setEll(value: number): void { this.applyEdit(setConicEll(this.model, value)); }

    protected setPhi(value: number, options: { syncScene?: boolean } = {}): void { this.applyEdit(setConicPhi(this.model, value), options); }

    /** A weight of null returns to the matched weight. */
    protected setWeight(value: number | null): void { this.applyEdit(setConicWeight(this.model, value)); }

    protected setBridge(value: boolean): void { this.applyEdit(setConicBridge(this.model, value)); }

    /** Lesson scenes choose the example (it fixes the conic, P and the bridge setting), show the Bezier arc and set its middle weight. */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"conic-weight": value => this.setWeight(value)},
            visibility: {"conic-bridge": visible => this.setBridge(visible)},
            choices: {"conic-example": value => this.setExample(value)},
        };
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private statuses(view: ConicFocalView): { id: string; text: Message }[] {
        const result: { id: string; text: Message }[] = [];
        if (view.kind === "circle") result.push({id: "circle", text: message("conic_status_circle")});
        else if (view.kind === "ellipse") result.push({id: "ellipse", text: message("conic_status_ellipse", {value0: messageNumber(view.focalSum ?? 0, 4)})});
        else if (view.kind === "parabola") result.push({id: "parabola", text: message("conic_status_parabola")});
        else result.push({id: "hyperbola", text: message("conic_status_hyperbola", {value0: messageNumber(view.focalDifference ?? 0, 4)})});
        if (view.bridge) {
            result.push({
                id: "bridge",
                text: message("conic_status_bridge", {
                    value0: messageNumber(view.bridge.weights[1], 4), value1: kindMessage(view.bridge.weightKind), value2: kindMessage(view.kind === "circle" ? "ellipse" : view.kind),
                }),
            });
        }
        return result;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override syncSceneToModel(): void {
        const {p} = this.viewOf(this.model);
        this.pointP?.moveTo([p.x, p.y]);
    }

    protected override onSceneRemoved(): void {
        this.pointP = undefined;
        this.drawn.clear();
    }

    protected createScene(): void {
        const board = this.board;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        // The directrix is context but must stay at least as strong as the axes; the two defining distances are content, half as wide again as the conic.
        const directrixWidth = this.displayThinWidth(0.8);
        const distanceWidth = () => strokeWidth() * 1.5;
        const hasDirectrix = () => view().conic.directrix !== undefined;
        const hasSecondFocus = () => view().secondFocus !== null;
        const bridgeVisible = () => view().bridge !== null;

        // Layers, lowest first: the directrix, the conic (one curve per branch), the Bezier arc, the distance segments, the points.
        const directrix = () => view().conic.directrix ?? {nx: 1, ny: 0, d: 0};
        this.drawn.set("directrix", this.own(board.create("line", [
            [() => directrix().nx * directrix().d, () => directrix().ny * directrix().d],
            [() => directrix().nx * directrix().d - directrix().ny, () => directrix().ny * directrix().d + directrix().nx],
        ], {
            strokeColor: GraphPalette.referenceCurve, dash: DIRECTRIX_DASH, strokeWidth: directrixWidth, highlight: false, fixed: true, withLabel: false,
            visible: hasDirectrix,
        })));
        [0, 1].forEach(index => {
            const branch = this.own(board.create("curve", [[], []], {
                strokeColor: GraphPalette.primaryCurve, strokeWidth, highlight: false, fixed: true, visible: () => view().branches.length > index,
            })) as unknown as FillCurve;
            if (index === 0) this.drawn.set("conic", branch as unknown as JXG.GeometryElement);
            branch.updateDataArray = () => {
                const points = view().branches[index] ?? [];
                branch.dataX = points.map(point => point.x);
                branch.dataY = points.map(point => point.y);
            };
        });
        const bridge = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth: () => strokeWidth() * 1.6, dash: BRIDGE_DASH, highlight: false, fixed: true,
            visible: bridgeVisible,
        })) as unknown as FillCurve;
        this.drawn.set("bridge", bridge as unknown as JXG.GeometryElement);
        bridge.updateDataArray = () => {
            const samples = view().bridge?.samples ?? [];
            bridge.dataX = samples.map(point => point.x);
            bridge.dataY = samples.map(point => point.y);
        };

        const segment = (from: () => [number, number], to: () => [number, number], color: string, dash: number | undefined, visible: () => boolean, width: () => number = thin) =>
            this.own(board.create("segment", [from, to], {
                strokeColor: color, strokeWidth: width, ...(dash === undefined ? {} : {dash}), highlight: false, fixed: true, withLabel: false,
                firstArrow: false, lastArrow: false, visible,
            }));
        const focus = (): [number, number] => [view().conic.focus.x, view().conic.focus.y];
        const second = (): [number, number] => [view().secondFocus?.x ?? 0, view().secondFocus?.y ?? 0];
        const pointP = (): [number, number] => [view().p.x, view().p.y];
        const foot = (): [number, number] => [view().foot?.x ?? 0, view().foot?.y ?? 0];
        this.drawn.set("pf", segment(pointP, focus, GraphPalette.comparisonCurve, undefined, () => true, distanceWidth));
        this.drawn.set("pd", segment(pointP, foot, GraphPalette.emphasis, undefined, hasDirectrix, distanceWidth));
        segment(pointP, second, GraphPalette.referenceCurve, 2, hasSecondFocus);

        const fixedPoint = (name: string, at: () => [number, number], color: string, visible: () => boolean) =>
            this.own(board.create("point", [() => at()[0], () => at()[1]], {
                ...this.styles.point.fixed, name, highlight: false, label: this.pointLabel("above-right", 1, visible), fillColor: color,
                highlightFillColor: color, visible,
            }));
        this.drawn.set("focus", fixedPoint("$$F$$", focus, GraphPalette.constructionAccent, () => true) as JXG.GeometryElement);
        fixedPoint("$$F_2$$", second, GraphPalette.constructionAccent, hasSecondFocus);

        // P is dragged along the conic: the drag keeps the direction from F (or its opposite), the model stores the polar angle, and
        // the point goes back to the nearest point the conic has. A drag the model refuses puts P back where the model has it.
        const point = this.own(board.create("point", [view().p.x, view().p.y], {
            ...this.styles.point.default, name: "$$P$$", label: this.pointLabel("above-right", 1.6),
        })) as JXG.Point;
        bindMovablePointCursor(point, board);
        point.on("drag", () => runAs("learner", () => {
            const phi = conicPhiNear(view().conic, {x: point.X(), y: point.Y()});
            const accepted = this.ignoreOutOfDomain(() => this.setPhi(phi, {syncScene: false}));
            if (!accepted) this.syncSceneToModel();
            else point.moveTo([view().p.x, view().p.y]);
        }));
        this.pointP = point;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const view = this.viewOf(state);
        const language = currentLanguage();
        const example = conicExampleOf(state);
        const options = CONIC_EXAMPLE_IDS.map(id => ({value: id as string, text: exampleText(id)}));
        const rangeHint = (min: number, max: number) => ({value0: formatNumber(min, language), value1: formatNumber(max, language)});
        const matched = view.bridge?.matchedWeight ?? state.weight ?? 1;
        const weightShown = state.weight ?? matched;
        const matchedReason = !state.bridge ? t("conic_weight_needs_bridge") : state.weight === null ? t("conic_weight_already_matched") : undefined;
        return <>
            <div className="inspector-group">
                <Slider customText={t("conic_phi_label")} min={CONIC_PHI_MIN} max={CONIC_PHI_MAX} step={0.01} value={state.phi} decimals={2}
                        rejectedHint={t("conic_phi_rejected_hint", rangeHint(CONIC_PHI_MIN, CONIC_PHI_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setPhi(next))}/>
                <PuckOwned param="conic-epsilon"><Slider customText={t("conic_epsilon_label")} min={CONIC_EPSILON_MIN} max={CONIC_EPSILON_MAX} step={0.05} value={state.epsilon}
                        rejectedHint={t("conic_epsilon_rejected_hint", rangeHint(CONIC_EPSILON_MIN, CONIC_EPSILON_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setEpsilon(next))}/></PuckOwned>
                <Slider customText={t("conic_ell_label")} min={CONIC_ELL_MIN} max={CONIC_ELL_MAX} step={0.1} value={state.ell}
                        rejectedHint={t("conic_ell_rejected_hint", rangeHint(CONIC_ELL_MIN, CONIC_ELL_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setEll(next))}/>
                <p className="inspector-help">{t("conic_fields_help")}</p>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.bridge} label={t("conic_bridge_label")} onChange={next => this.ignoreOutOfDomain(() => this.setBridge(next))}/>
                <p className="inspector-help">{t("conic_bridge_help")}</p>
                <PuckOwned param="conic-weight"><Slider customText={t("conic_weight_label")} min={CONIC_WEIGHT_MIN} max={CONIC_WEIGHT_MAX} step={0.01} value={weightShown} unavailableReason={state.bridge ? undefined : t("conic_weight_needs_bridge")}
                        rejectedHint={t("conic_weight_rejected_hint", rangeHint(CONIC_WEIGHT_MIN, CONIC_WEIGHT_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setWeight(next))}/></PuckOwned>
                <div className={CONTROL_ROW_FILL}>
                    <UnavailableButton data-action="matched-weight" reason={matchedReason}
                                       onBlockedPress={reason => { if (state.bridge) this.refusals.refuse(reason, true); }}
                                       onPress={() => { if (this.ignoreOutOfDomain(() => this.setWeight(null))) this.refusals.clear(); }}>{t("conic_weight_set_matching")}</UnavailableButton>
                </div>
                <p className="inspector-help">{t("conic_weight_help")}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("conic_example_label")} value={example ?? "custom"} help={t("conic_example_help")}
                              options={example === undefined ? [...options, {value: "custom", text: t("conic_example_custom")}] : options}
                              onChange={next => { if (next !== "custom") this.ignoreOutOfDomain(() => this.setExample(next)); }}/>
            </div>
        </>;
    }

    /** The legend is declared: the graph's own legend panel renders nothing. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the setters validate and refuse with a `DomainError`; a weight read before one is set is the matched one. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "conic-epsilon": {read: () => this.model.epsilon, apply: (value: number) => this.setEpsilon(value)},
            "conic-weight": {read: () => this.model.weight ?? this.viewOf(this.model).bridge?.matchedWeight ?? 1, apply: (value: number) => this.setWeight(value)},
        };
    }

    /**
     * The common declaration (rows, note, status) plus the eccentricity (step "Sliding epsilon through 1": a puck) and, while the Bezier arc is
     * shown, the middle weight (step "The middle weight decides the kind": a puck), the matched-weight button (Orodja) and the legend of the
     * drawn objects. The semi-latus rectum, the angle of P (P is dragged on the board), the example choice (five options) and the arc switch
     * (every scene sets it) stay in Orodja.
     */
    protected override declaration(): GraphDeclaration {
        const model = this.model;
        const view = this.viewOf(model);
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "conic-epsilon", kind: "range", label: message("conic_epsilon_name"), symbol: "\\varepsilon", help: message("conic_epsilon_help"), placement: "board",
                    min: CONIC_EPSILON_MIN, max: CONIC_EPSILON_MAX, step: 0.05, maxDecimals: 2},
                ...(view.bridge === null ? [] : [{key: "conic-weight" as const, kind: "range" as const, label: message("conic_weight_name"), symbol: "w_1",
                    help: message("conic_weight_help"), placement: "board" as const, min: CONIC_WEIGHT_MIN, max: CONIC_WEIGHT_MAX, step: 0.01, maxDecimals: 2}]),
            ],
            legend: [
                {id: "conic", label: message("conic_legend_conic"), kind: "line", object: "conic"},
                {id: "directrix", label: message("conic_legend_directrix"), kind: "dashed", object: "directrix"},
                {id: "pf", label: message("conic_legend_pf"), kind: "line", object: "pf"},
                {id: "pd", label: message("conic_legend_pd"), kind: "line", object: "pd"},
                {id: "bridge", label: message("conic_legend_bridge"), kind: "dashed", object: "bridge"},
                {id: "focus", label: message("conic_legend_focus"), kind: "point", object: "focus"},
            ],
            actions: [{id: "matched-weight", label: message("conic_weight_set_matching"), placement: "tools", tab: "edit", enabled: model.bridge && model.weight !== null}],
            marks: this.conicMarks(model, view),
            followView: this.conicFollowFrame(model, view),
        };
    }

    /** The matched-weight button of the inspector, as the learner presses it. */
    override performAction(id: string): void {
        if (id !== "matched-weight") throw new Error("Unknown action");
        runAs("learner", () => this.ignoreOutOfDomain(() => this.setWeight(null)));
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp(id === "focus" ? "fillcolor" : "strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    /**
     * What the view keeps in sight: the foci, the Bezier arc's control points and the conic's branches inside the starting view. P and the
     * distance segments are not marks (P lies on the conic and a drag would move the view); the marks depend on the conic, not on P.
     */
    private conicMarks(model: ConicFocalModel, view: ConicFocalView): ViewMarks {
        const key = [model.focusX, model.direction, model.ell, model.epsilon, model.bridge].join(",");
        if (this.marksMemo?.key === key) return this.marksMemo.marks;
        const [left, top, right, bottom] = CONIC_VIEW_BOX;
        const must: ViewMark[] = [{kind: "point", x: view.conic.focus.x, y: view.conic.focus.y}];
        if (view.secondFocus) must.push({kind: "point", x: view.secondFocus.x, y: view.secondFocus.y});
        for (const control of view.bridge?.points ?? []) must.push({kind: "point", x: control.x, y: control.y});
        const nice: ViewMark[] = [];
        for (const branch of view.branches) {
            const points = branch.filter(({x, y}) => x >= left && x <= right && y >= bottom && y <= top).map(({x, y}) => [x, y] as [number, number]);
            if (points.length > 1) nice.push({kind: "polyline", points});
        }
        // The directrix is an infinite line: keep its foot below the focus in sight, so the segment |Pd| ends on screen.
        const directrix = view.conic.directrix;
        if (directrix) {
            const {x, y} = view.conic.focus, gap = directrix.d - (directrix.nx * x + directrix.ny * y);
            nice.push({kind: "point", x: x + gap * directrix.nx, y: y + gap * directrix.ny});
        }
        const marks: ViewMarks = {must, nice};
        const pointsOf = (list: ViewMark[]) => list.flatMap(mark => (mark.kind === "point" ? [[mark.x, mark.y] as [number, number]] : mark.kind === "polyline" ? mark.points : []));
        const frame = conicFrame([...pointsOf(must), ...pointsOf(nice)]);
        this.marksMemo = {key, marks, frame};
        return marks;
    }

    /** The box around the foci, control points and the conic inside the starting view: what the director fits between the cards (the whole 28 by 30 unit window leaves a small conic). */
    private conicFollowFrame(model: ConicFocalModel, view: ConicFocalView): ViewBox {
        this.conicMarks(model, view);
        return this.marksMemo!.frame;
    }

    /** The readout rows, the definition note and the status lines, as declared data; the inspector's readout is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const view = this.viewOf(this.model);
        const number = (value: number) => messageNumber(value, 4);
        return {
            rows: [
                {id: "kind", name: message("conic_readout_kind"), value: kindMessage(view.kind)},
                {id: "pf", name: message("conic_readout_pf"), value: number(view.pf)},
                {id: "pd", name: message("conic_readout_pd"), value: view.pd === null ? message("conic_not_applicable") : number(view.pd)},
                {id: "ratio", name: message("conic_readout_ratio"), value: view.ratio === null ? message("conic_ratio_undefined") : number(view.ratio)},
                ...(view.pf2 === null ? [] : [{id: "pf2" as const, name: message("conic_readout_pf2"), value: number(view.pf2)}]),
                ...(view.focalSum === null ? [] : [{id: "sum" as const, name: message("conic_readout_sum"), value: number(view.focalSum)}]),
                ...(view.focalDifference === null ? [] : [{id: "difference" as const, name: message("conic_readout_difference"), value: number(view.focalDifference)}]),
                ...(view.bridge === null ? [] : [
                    {id: "weight" as const, name: message("conic_readout_weight"), value: number(view.bridge.weights[1])},
                    {id: "matched-weight" as const, name: message("conic_readout_matched"), value: number(view.bridge.matchedWeight)},
                    {id: "weight-kind" as const, name: message("conic_readout_weight_kind"), value: kindMessage(view.bridge.weightKind)},
                    {id: "deviation" as const, name: message("conic_readout_deviation"), value: {kind: "formatted" as const, text: formatSignificant(view.bridge.deviation, currentLanguage())}},
                ]),
            ],
            notes: [{id: "definition", text: message("conic_note")}],
            status: this.statuses(view),
        };
    }

    protected renderReadout(): React.ReactNode {
        const lines = (this.functionPanel().status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}));
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="demo-status" dataAttribute="conic-status" lines={lines}/>
        </>;
    }
}

export default ConicFocalGraph;
