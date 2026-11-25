import {message, t} from "../../../localization";
import type {BaseCurveIds} from "../../base/BaseCurveGraph";
import type {GraphDeclaration} from "../../base/declare/graphDeclaration";
import {runAs} from "../../base/writes/writeSource";
import React from 'react';

import {CurveOperation} from "../../base/controls/BezierCurveControls";
import type {DisplayToggle} from "../../base/controls/CurveDisplayControls";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {degreeElevationAction} from "../../base/lesson/curveLessonActions";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {TransientState} from "../../base/BaseGraph";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {elevationPresetCollection} from "./collections";

/** The ids of the elevation declaration: the generic curve workspace actions plus the overlay switch and the elevate button. */
export type ElevationIds = Omit<BaseCurveIds, "action" | "legend"> & {action: BaseCurveIds["action"] | "elevated-points" | "elevate"; legend: BaseCurveIds["legend"] | "elevated"};

class ElevationGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    /** Declares the common curve workspace (legend, view marks, display switches) plus the elevation overlay and the elevate button. */
    protected override declaresCurveWorkspace() { return true; }

    protected override declaration(): GraphDeclaration<ElevationIds> | undefined {
        const common = this.commonCurveDeclaration();
        return {...common,
            legend: [...(common.legend ?? []), ...(this.elevationOverlayOn ? [{id: "elevated" as const, label: message("elevation_legend_elevated_points"), kind: "point" as const, object: "elevated"}] : [])],
            actions: [...(common.actions ?? []),
                {id: "elevated-points", label: message("show_elevated_points_on_control_polygon"), placement: "tools", section: "display", enabled: true, pressed: this.elevationOverlayOn},
                // The graph's main action is on the board; the Orodja panel keeps the preview and the same button.
                {id: "elevate", label: message("elevate_degree"), placement: "board", enabled: true}]};
    }

    /** The overlay forces the control polygon on while it is shown, so the polygon is a switch in Orodja, not a puck that would fight it. */
    protected override curveDisplayPuck(toggle: DisplayToggle): boolean {
        return toggle !== "control-polygon";
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== "elevated") return super.drawnObject(id);
        const point: JXG.GeometryElement | undefined = this.getFirstJxgCurve()?.getElevatePoints()[0];
        if (!point) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = point as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp("fillcolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    override performAction(id: string): void {
        if (id === "elevated-points") { runAs("learner", () => this.setElevationOverlay(!this.elevationOverlayOn)); return; }
        if (id === "elevate") { runAs("learner", () => { this.elevate(); this.store.notify(); }); return; }
        super.performAction(id);
    }

    /** The elevation preview and apply lead Edit and stay while a curve is selected (graph-control first use). */
    protected override workspaceConstructionFirst() { return true; }
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    /** Transient switch; the overlay is on in a fresh scene and is not stored in presets. */
    private elevationOverlayOn = true;
    /**
     * The control polygon visibility the overlay replaced, restored when the overlay is turned off. Undefined until the
     * overlay is applied to a fresh scene, which then reads it from the imported curve.
     */
    private polygonShownBeforeOverlay?: boolean;

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), elevationOverlayOn: this.elevationOverlayOn,
            polygonShownBeforeOverlay: this.polygonShownBeforeOverlay ?? null};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.elevationOverlayOn = typeof saved?.elevationOverlayOn === "boolean" ? saved.elevationOverlayOn : true;
        this.polygonShownBeforeOverlay = typeof saved?.polygonShownBeforeOverlay === "boolean" ? saved.polygonShownBeforeOverlay : undefined;
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.getFirstJxgCurve()?.setAttributes(Attributes.bezierDisabled);
        this.applyElevationOverlay();
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group">
            <OnOffSwitch checked={this.elevationOverlayOn} label={t("show_elevated_points_on_control_polygon")}
                         onChange={checked => this.setElevationOverlay(checked)}/>
            <p>{t("elevated_points_description")}</p></div></>;
    }

    private setElevationOverlay(on: boolean) {
        // Turning the overlay on records the polygon visibility it replaces.
        if (on && !this.elevationOverlayOn) this.polygonShownBeforeOverlay = undefined;
        this.elevationOverlayOn = on;
        this.applyElevationOverlay();
        this.boardUpdate();
        this.store.notify();
    }

    /** Brings the board in line with the switch; safe to call repeatedly (show is idempotent). */
    private applyElevationOverlay() {
        const curve = this.getFirstJxgCurve();
        if (!curve) return;
        if (this.elevationOverlayOn) {
            if (!curve.isShowingElevatePoints()) {
                this.polygonShownBeforeOverlay ??= curve.isShowingControlPolygon();
            }
            curve.showControlPolygon();
            curve.showElevatePoints();
        } else if (curve.isShowingElevatePoints()) {
            curve.hideElevatePoints();
            curve.showControllPolygon(this.polygonShownBeforeOverlay ?? false);
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(degreeElevationAction(() => this.elevate()));
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            "points": [[-4, -2], [-3, 3], [2, 3], [3, -2]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2
            }
        }]];
    }

    elevate() {
        this.board.suspendUpdate();
        this.getFirstJxgCurve().elevate();
        this.getFirstJxgCurve().rebuildElevatePoints();
        this.unsuspendBoardUpdate();
    }

    override presetCollection() {
        return elevationPresetCollection;
    }

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([<CurveOperation key="elevation" curve={this.getFirstJxgCurve()} tool="elevation" permanentPreview
            onChanged={() => this.store.notify()} onApply={() => this.elevate()} applyClassName="btn btn-primary degree-elevation-action"
            applyIcon={<span className="degree-elevation-action-icon" aria-hidden="true">↑</span>}/>]);
    }
}

export default ElevationGraph;
