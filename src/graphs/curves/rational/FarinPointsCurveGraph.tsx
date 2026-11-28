import {message, t} from "../../../localization";
import {BaseRationalCurveGraph} from "./BaseRationalCurveGraph";
import React from "react";
import {BaseGraphStates, type BaseCurveIds} from "../../base/BaseCurveGraph";
import type {ActionDeclaration, GraphDeclaration, LegendEntry} from "../../base/declare/graphDeclaration";
import {PuckOwnedGroup} from "../../base/controls/PuckOwnership";
import {GraphPalette} from "../../styles/GraphPalette";
import {runAs} from "../../base/writes/writeSource";
import {watchedBox} from "../bezier/watchedBox";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {farinPresetCollection} from "./collections";


/** The ids of the Farin declaration: the common curve ids plus the Farin points (a legend entry and a switch puck). */
export type FarinIds = Omit<BaseCurveIds, "legend" | "action"> & {
    legend: BaseCurveIds["legend"] | "farin-points";
    action: BaseCurveIds["action"] | "farin-points";
};

class RationalBezierCurveGraph extends BaseRationalCurveGraph<BaseGraphStates> {
    /**
     * Task 08 (lane L48): the board workspace. The Farin points are a switch puck (the chapter prompt asks the learner to turn them
     * on; the lesson steps set them by scene) and a legend entry; dragging a Farin point stays a board drag, the weights stay board
     * labels (no step asks the learner to set one) and standard form stays an Orodja setup switch.
     */
    protected override declaresRationalWorkspace() { return true; }

    protected override declaration(): GraphDeclaration<FarinIds> | undefined {
        const common = this.commonCurveDeclaration();
        const legend: LegendEntry<FarinIds>[] = [...(common.legend ?? []), {id: "farin-points", label: message("farin_points"), kind: "point", object: "farin-points"}];
        const farin: ActionDeclaration<FarinIds> = {id: "farin-points", label: message("farin_points"), placement: "board", puck: true, enabled: true,
            pressed: this.getFirstJxgCurve()?.isShowingFarinPoints() ?? false};
        // A Farin point lies on a control polygon edge, so the box of the control points and the curve already covers it.
        return {...common, legend, actions: [...(common.actions ?? []), farin], followView: watchedBox(common.marks)};
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== "farin-points") return super.drawnObject(id);
        return {color: GraphPalette.comparisonCurve, visible: this.getFirstJxgCurve()?.isShowingFarinPoints() ?? false};
    }

    override performAction(id: string): void {
        if (id !== "farin-points") { super.performAction(id); return; }
        runAs("learner", () => this.showFarinPoints(!this.getFirstJxgCurve().isShowingFarinPoints()));
    }

    override initialize() {
        super.initialize();
        if (this.getFirstJxgCurve().isShowingFarinPoints()) {
            this.showFarinPoints(true);
        }
    }

    override importPresetData(str: CurveCollectionPresetData) {
        super.importPresetData(str);
        this.syncFarinInteraction();
    }

    /** The preset importer rebuilds Farin sliders from the preset state; curve-input locking must follow.
     *  Control points stay draggable: each Farin slider follows its two control points. */
    private syncFarinInteraction() {
        const curve = this.getFirstJxgCurve();
        if (!curve) return;
        this.inputsDisabled = curve.isShowingFarinPoints();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('farin-points', action => {
            if (typeof action.visible !== 'boolean') throw new Error('Farin point visibility must be true or false.');
            this.showFarinPoints(action.visible);
            this.boardUpdate();
            this.refreshWorkspace();
        });
        registry.on('standard-form', action => {
            if (typeof action.enabled !== 'boolean') throw new Error('Standard form must be true or false.');
            this.getFirstJxgCurve().setStandardForm(action.enabled);
            this.boardUpdate();
            this.refreshWorkspace();
        });
        registry.on('rational-weights', action => {
            const count = this.getFirstJxgCurve().getJxgPoints().length;
            const weights = action.weights;
            if (!Array.isArray(weights) || weights.length !== count
                || !weights.every(w => typeof w === 'number' && Number.isFinite(w) && w > 0)) {
                throw new Error(`Provide exactly ${count} finite weights greater than zero.`);
            }
            this.getFirstJxgCurve().setEffectiveWeights(weights.slice());
            this.boardUpdate();
            this.refreshWorkspace();
        });
    }

    // The weights switch is the curve's own, in its display group above; the construction group adds only the Farin points.
    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}<PuckOwnedGroup params={["farin-points"]} className="inspector-group"><h3>{t("construction")}</h3>
            <OnOffSwitch checked={this.getFirstJxgCurve().isShowingFarinPoints()}
                onChange={(checked) => this.showFarinPoints(checked)} label={t("farin_points")}/></PuckOwnedGroup></>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(<OnOffSwitch
            checked={this.getFirstJxgCurve().inStandardForm()}
            onChange={(checked) => {
                this.getFirstJxgCurve().setStandardForm(checked);
                this.store.notify();
            }}
            label={t("standard_form")}/>) : [];
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXRationalBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -3]], "weights": [1, 2, 1, 1], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "subdivisionT": 0.5,
                "extrapolationT": 1.2,
                "showingWeights": false,
                "weightNumber": 1,
                "showingFarinPoints": true
            }
        }]];
    }

    override presetCollection() {
        return farinPresetCollection;
    }

    private showFarinPoints(checked: boolean) {
        this.getFirstJxgCurve().showFarinPoints(checked);
        this.syncFarinInteraction();
        this.store.notify();
    }
}

export default RationalBezierCurveGraph;
