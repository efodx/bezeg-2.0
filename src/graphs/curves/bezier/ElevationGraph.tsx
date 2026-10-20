import {t} from "../../../localization";
import React from 'react';

import {Button} from "react-bootstrap";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {degreeElevationAction} from "../../base/lesson/curveLessonActions";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {TransientState} from "../../base/BaseGraph";

class ElevationGraph extends BaseBezierCurveGraph<BaseGraphStates> {
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

    defaultPreset(): any {
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

    override presets(): string {
        return "elevation-graph";
    }

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([<Button className="degree-elevation-action" onClick={() => this.elevate()}>
            <span className="degree-elevation-action-icon" aria-hidden="true">↑</span>
            {t("elevate_degree")}
        </Button>]);
    }
}

export default ElevationGraph;
