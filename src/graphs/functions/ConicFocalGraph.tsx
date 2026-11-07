import React from "react";
import BaseFunctionGraph, {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {currentLanguage, t} from "../../localization";
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
/** The top 10 units stay free for the opaque top-right caption, so P, the foci and the directrix of the examples lie below it. */
export const CONIC_VIEW_BOX: BoundingBox = [-14, 20, 14, -10];
const DIRECTRIX_DASH = 3;
const BRIDGE_DASH = 4;

const kindText = (kind: ConicKind): string => {
    switch (kind) {
        case "circle": return t("conic_kind_circle");
        case "ellipse": return t("conic_kind_ellipse");
        case "parabola": return t("conic_kind_parabola");
        case "hyperbola": return t("conic_kind_hyperbola");
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

    private number(value: number, decimals = 4): string {
        return formatNumber(value, currentLanguage(), decimals);
    }

    private statuses(view: ConicFocalView): { id: string; text: string }[] {
        const result: { id: string; text: string }[] = [];
        if (view.kind === "circle") result.push({id: "circle", text: t("conic_status_circle")});
        else if (view.kind === "ellipse") result.push({id: "ellipse", text: t("conic_status_ellipse", {value0: this.number(view.focalSum ?? 0)})});
        else if (view.kind === "parabola") result.push({id: "parabola", text: t("conic_status_parabola")});
        else result.push({id: "hyperbola", text: t("conic_status_hyperbola", {value0: this.number(view.focalDifference ?? 0)})});
        if (view.bridge) {
            result.push({
                id: "bridge",
                text: t("conic_status_bridge", {value0: this.number(view.bridge.weights[1]), value1: kindText(view.bridge.weightKind), value2: kindText(view.kind === "circle" ? "ellipse" : view.kind)}),
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
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const compact = () => this.boardWidth() < COMPACT_BOARD_WIDTH;
        const hasDirectrix = () => view().conic.directrix !== undefined;
        const hasSecondFocus = () => view().secondFocus !== null;
        const bridgeVisible = () => view().bridge !== null;

        // Layers, lowest first: the directrix, the conic (one curve per branch), the Bezier arc, the distance segments, the points.
        const directrix = () => view().conic.directrix ?? {nx: 1, ny: 0, d: 0};
        this.own(board.create("line", [
            [() => directrix().nx * directrix().d, () => directrix().ny * directrix().d],
            [() => directrix().nx * directrix().d - directrix().ny, () => directrix().ny * directrix().d + directrix().nx],
        ], {
            strokeColor: GraphPalette.referenceCurve, dash: DIRECTRIX_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
            visible: hasDirectrix,
        }));
        [0, 1].forEach(index => {
            const branch = this.own(board.create("curve", [[], []], {
                strokeColor: GraphPalette.primaryCurve, strokeWidth, highlight: false, fixed: true, visible: () => view().branches.length > index,
            })) as unknown as FillCurve;
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
        bridge.updateDataArray = () => {
            const samples = view().bridge?.samples ?? [];
            bridge.dataX = samples.map(point => point.x);
            bridge.dataY = samples.map(point => point.y);
        };

        const segment = (from: () => [number, number], to: () => [number, number], color: string, dash: number | undefined, visible: () => boolean) =>
            this.own(board.create("segment", [from, to], {
                strokeColor: color, strokeWidth: thin, ...(dash === undefined ? {} : {dash}), highlight: false, fixed: true, withLabel: false,
                firstArrow: false, lastArrow: false, visible,
            }));
        const focus = (): [number, number] => [view().conic.focus.x, view().conic.focus.y];
        const second = (): [number, number] => [view().secondFocus?.x ?? 0, view().secondFocus?.y ?? 0];
        const pointP = (): [number, number] => [view().p.x, view().p.y];
        const foot = (): [number, number] => [view().foot?.x ?? 0, view().foot?.y ?? 0];
        segment(pointP, focus, GraphPalette.constructionAccent, undefined, () => true);
        segment(pointP, foot, GraphPalette.constructionLevels[3], undefined, hasDirectrix);
        segment(pointP, second, GraphPalette.constructionLevels[3], 2, hasSecondFocus);

        const fixedPoint = (name: string, at: () => [number, number], color: string, visible: () => boolean) =>
            this.own(board.create("point", [() => at()[0], () => at()[1]], {
                ...this.styles.point.fixed, name, highlight: false, label: this.pointLabel("above-right", 1, visible), fillColor: color,
                highlightFillColor: color, visible,
            }));
        fixedPoint("$$F$$", focus, GraphPalette.constructionAccent, () => true);
        fixedPoint("$$F_2$$", second, GraphPalette.constructionAccent, hasSecondFocus);

        // P is dragged along the conic: the drag keeps the direction from F (or its opposite), the model stores the polar angle, and
        // the point goes back to the nearest point the conic has. A drag the model refuses puts P back where the model has it.
        const point = this.own(board.create("point", [view().p.x, view().p.y], {
            ...this.styles.point.default, name: "$$P$$", label: this.pointLabel("above-right", 1.6),
        })) as JXG.Point;
        bindMovablePointCursor(point, board);
        point.on("drag", () => {
            const phi = conicPhiNear(view().conic, {x: point.X(), y: point.Y()});
            const accepted = this.ignoreOutOfDomain(() => this.setPhi(phi, {syncScene: false}));
            if (!accepted) this.syncSceneToModel();
            else point.moveTo([view().p.x, view().p.y]);
        });
        this.pointP = point;

        this.caption("top-right", [
            {text: () => t("conic_board_title"), scale: 1.2, math: true},
            {text: () => t("conic_board_parameters", {value0: this.number(model().epsilon), value1: this.number(model().ell), value2: kindText(view().kind)})},
            {
                text: () => {
                    const now = view();
                    return now.ratio === null || now.pd === null
                        ? t("conic_board_ratio_undefined", {value0: this.number(now.pf)})
                        : t("conic_board_ratio", {value0: this.number(now.pf), value1: this.number(now.pd), value2: this.number(now.ratio)});
                },
                color: () => view().ratio === null ? GraphPalette.warningText : GraphPalette.label,
            },
            {text: () => t("conic_board_sum", {value0: this.number(view().focalSum ?? 0)}), visible: () => view().focalSum !== null},
            {text: () => t("conic_board_difference", {value0: this.number(view().focalDifference ?? 0)}), visible: () => view().focalDifference !== null},
            {
                text: () => {
                    const arc = view().bridge;
                    return arc ? t("conic_board_bridge", {value0: this.number(arc.weights[1]), value1: formatSignificant(arc.deviation, currentLanguage())}) : "";
                },
                visible: bridgeVisible,
            },
            {text: () => t("conic_status_circle"), color: GraphPalette.warningText, minBoardWidth: COMPACT_BOARD_WIDTH, visible: () => !compact() && view().kind === "circle"},
        ]);
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
        const resetUnavailable = !state.bridge || state.weight === null;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("conic_example_label")} value={example ?? "custom"} help={t("conic_example_help")}
                              options={example === undefined ? [...options, {value: "custom", text: t("conic_example_custom")}] : options}
                              onChange={next => { if (next !== "custom") this.ignoreOutOfDomain(() => this.setExample(next)); }}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("conic_epsilon_label")} min={CONIC_EPSILON_MIN} max={CONIC_EPSILON_MAX} step={0.05} value={state.epsilon}
                        rejectedHint={t("conic_epsilon_rejected_hint", rangeHint(CONIC_EPSILON_MIN, CONIC_EPSILON_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setEpsilon(next))}/>
                <Slider customText={t("conic_ell_label")} min={CONIC_ELL_MIN} max={CONIC_ELL_MAX} step={0.1} value={state.ell}
                        rejectedHint={t("conic_ell_rejected_hint", rangeHint(CONIC_ELL_MIN, CONIC_ELL_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setEll(next))}/>
                <Slider customText={t("conic_phi_label")} min={CONIC_PHI_MIN} max={CONIC_PHI_MAX} step={0.01} value={state.phi} decimals={2}
                        rejectedHint={t("conic_phi_rejected_hint", rangeHint(CONIC_PHI_MIN, CONIC_PHI_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setPhi(next))}/>
                <p className="inspector-help">{t("conic_fields_help")}</p>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.bridge} label={t("conic_bridge_label")} onChange={next => this.ignoreOutOfDomain(() => this.setBridge(next))}/>
                <p className="inspector-help">{t("conic_bridge_help")}</p>
                <Slider customText={t("conic_weight_label")} min={CONIC_WEIGHT_MIN} max={CONIC_WEIGHT_MAX} step={0.01} value={weightShown} disabled={!state.bridge}
                        rejectedHint={t("conic_weight_rejected_hint", rangeHint(CONIC_WEIGHT_MIN, CONIC_WEIGHT_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setWeight(next))}/>
                <div className="demo-actions">
                    {/* aria-disabled, not disabled: a focused button that becomes unavailable must not drop keyboard focus. */}
                    <button type="button" data-action="matched-weight" aria-disabled={resetUnavailable}
                            onClick={() => { if (!resetUnavailable) this.ignoreOutOfDomain(() => this.setWeight(null)); }}>{t("conic_weight_matched")}</button>
                </div>
                <p className="inspector-help">{t("conic_weight_help")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "conic", color: GraphPalette.primaryCurve, label: t("conic_legend_conic"), kind: "line"},
            {id: "directrix", color: GraphPalette.referenceCurve, label: t("conic_legend_directrix"), kind: "dashed-line"},
            {id: "distances", color: GraphPalette.constructionAccent, label: t("conic_legend_distances"), kind: "line"},
            {id: "bridge", color: GraphPalette.comparisonCurve, label: t("conic_legend_bridge"), kind: "dashed-line"},
            {id: "focus", color: GraphPalette.constructionAccent, label: t("conic_legend_focus"), kind: "dot"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const rows = [
            {id: "kind", label: t("conic_readout_kind"), value: kindText(view.kind)},
            {id: "pf", label: t("conic_readout_pf"), value: this.number(view.pf)},
            {id: "pd", label: t("conic_readout_pd"), value: view.pd === null ? t("conic_not_applicable") : this.number(view.pd)},
            {id: "ratio", label: t("conic_readout_ratio"), value: view.ratio === null ? t("conic_ratio_undefined") : this.number(view.ratio)},
            ...(view.pf2 === null ? [] : [{id: "pf2", label: t("conic_readout_pf2"), value: this.number(view.pf2)}]),
            ...(view.focalSum === null ? [] : [{id: "sum", label: t("conic_readout_sum"), value: this.number(view.focalSum)}]),
            ...(view.focalDifference === null ? [] : [{id: "difference", label: t("conic_readout_difference"), value: this.number(view.focalDifference)}]),
            ...(view.bridge === null ? [] : [
                {id: "weight", label: t("conic_readout_weight"), value: this.number(view.bridge.weights[1])},
                {id: "matched-weight", label: t("conic_readout_matched"), value: this.number(view.bridge.matchedWeight)},
                {id: "weight-kind", label: t("conic_readout_weight_kind"), value: kindText(view.bridge.weightKind)},
                {id: "deviation", label: t("conic_readout_deviation"), value: formatSignificant(view.bridge.deviation, language)},
            ]),
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("conic_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(view).map(status => <p key={status.id} className="inspector-help" data-conic-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default ConicFocalGraph;
