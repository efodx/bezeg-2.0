import {t} from "../../../localization";
import React from 'react';

import {Button} from "react-bootstrap";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonAction} from "../../../learning/model";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";

class ElevationGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    /** Runtime-only switch; the overlay is on by default and is not stored in presets. */
    private elevationOverlayOn = true;
    private polygonShownBeforeOverlay = false;

    override initialize() {
        super.initialize();
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.applyElevationOverlay();
    }

    protected override prepareLessonDefaultScene(): void {
        this.elevationOverlayOn = true;
        super.prepareLessonDefaultScene();
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.applyElevationOverlay();
        this.boardUpdate();
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <>{super.workspaceDisplay()}<div className="inspector-group">
            <OnOffSwitch initialState={this.elevationOverlayOn} label={t("show_elevated_points_on_control_polygon")}
                         onChange={checked => this.setElevationOverlay(checked)}/>
            <p>{t("elevated_points_description")}</p></div></>;
    }

    private setElevationOverlay(on: boolean) {
        this.elevationOverlayOn = on;
        this.applyElevationOverlay();
        this.boardUpdate();
    }

    /** Brings the board in line with the switch; safe to call repeatedly (show is idempotent). */
    private applyElevationOverlay() {
        const curve = this.getFirstJxgCurve();
        if (!curve) return;
        if (this.elevationOverlayOn) {
            if (!curve.isShowingElevatePoints()) {
                this.polygonShownBeforeOverlay = curve.isShowingControlPolygon();
            }
            curve.showControlPolygon();
            curve.showElevatePoints();
        } else if (curve.isShowingElevatePoints()) {
            curve.hideElevatePoints();
            curve.showControllPolygon(this.polygonShownBeforeOverlay);
        }
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'degree-elevation') {
            this.elevate();
            return;
        }
        super.applyLessonAction(action);
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
