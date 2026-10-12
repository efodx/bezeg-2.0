import {t, useLanguage} from "../../../localization";
import React from 'react';

import {Button} from "react-bootstrap";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonSceneCheckpoint} from "../../../learning/model";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

export const MAX_SUBDIVISION_STEPS = 5;

function ShowControlPolygons(props: { checked: boolean, onChange: (checked: boolean) => void }) {
    useLanguage();
    return <OnOffSwitch checked={props.checked} label={t("control_polygons")} onChange={props.onChange}/>;
}

class SubdivisionGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    private stepsDone: number = 0;

    protected override captureFigureRuntimeState(): unknown {
        return {...super.captureFigureRuntimeState() as object, stepsDone: this.stepsDone};
    }

    protected override restoreFigureRuntimeState(runtimeState: unknown): void {
        super.restoreFigureRuntimeState(runtimeState);
        const stepsDone = (runtimeState as {stepsDone?: number} | undefined)?.stepsDone;
        if (typeof stepsDone === "number" && Number.isFinite(stepsDone)) this.stepsDone = stepsDone;
    }

    protected override resetSceneFields(): void {
        super.resetSceneFields();
        this.stepsDone = 0;
    }

    override initialize() {
        super.initialize();
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('subdivide', () => {
            if (this.stepsDone >= MAX_SUBDIVISION_STEPS) {
                throw new Error(`At most ${MAX_SUBDIVISION_STEPS} subdivision steps are available. Reset the scene to start again.`);
            }
            this.subdivide();
        });
    }

    protected override prepareLessonDefaultScene(): void {
        // The default preset import disposes every generated piece and its control polygon / de Casteljau points.
        super.prepareLessonDefaultScene();
        this.stepsDone = 0;
        this.getFirstJxgCurve()?.setAttributes(Attributes.bezierDisabled);
        this.refreshWorkspace();
    }

    protected override captureLessonState(): LessonSceneCheckpoint {
        const checkpoint = super.captureLessonState();
        return {...checkpoint, value: {...(checkpoint.value as object), stepsDone: this.stepsDone}} as LessonSceneCheckpoint;
    }

    protected override restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        const stepsDone = (checkpoint.value as {stepsDone?: unknown} | undefined)?.stepsDone;
        super.restoreLessonState(checkpoint);
        if (typeof stepsDone === "number" && Number.isInteger(stepsDone) && stepsDone >= 0) this.stepsDone = stepsDone;
        this.refreshWorkspace();
    }

    defaultPreset(): any {
        return [["JSXBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -3]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": true,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2
            }
        }]];
    }

    override presets() {
        return "bezier-subdivision";
    }

    override getAllJxgPoints() {
        return super.getAllJxgPoints().concat(this.jxgCurves.flatMap(curve => (curve as JXGBezierCurve).getJXGDecasteljauPoints()));
    }

    subdivide() {
        if (this.stepsDone >= MAX_SUBDIVISION_STEPS) {
            return;
        }
        this.stepsDone = this.stepsDone + 1;
        this.board.suspendUpdate();
        try {
            let oldJsxBezierCurves = this.jxgCurves.map(c => c as JXGBezierCurve);
            for (let bezierCurve of oldJsxBezierCurves) {
                // TODO REDESIGN SUBDIVISIONRESULTCONSUMER...
                bezierCurve.setSubdivisionResultConsumer(() => "");
                let newCurve = bezierCurve.subdivide(1 / 2);
                if (bezierCurve.isShowingControlPolygon()) {
                    newCurve.showControlPolygon();
                }
                this.applyCurveVisualRole(newCurve, this.jxgCurves.length);
                this.jxgCurves.push(newCurve);
            }
        } finally {
            this.unsuspendBoardUpdate();
        }
        this.refreshWorkspace();
    };

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([<Button
            onClick={() => this.subdivide()}>{t("subdivide")}</Button>,
            <ShowControlPolygons checked={this.getFirstJxgCurve().isShowingControlPolygon()}
                                 onChange={(checked) => {
                                     if (checked) {
                                         this.showControlPolygons();
                                     } else {
                                         this.hideControlPolygons();
                                     }
                                 }}/>]) : [];
    }

    override getSelectedCurveCommands(): JSX.Element[] {
        return super.getSelectedCurveCommands().concat([<OnOffSwitch
            checked={this.getSelectedCurve().isShowingDecasteljauScheme()} onChange={checked => {
            if (checked) {
                this.showDecasteljauScheme();
            } else {
                this.hideDecasteljauScheme();
            }
        }} label={t("de_casteljau_scheme")}/>]);
    }

    private hideControlPolygons() {
        this.board.suspendUpdate();
        this.jxgCurves.forEach(curve => (curve as JXGBezierCurve).hideDecasteljauScheme());
        this.jxgCurves.forEach(curve => curve.hideControlPolygon());
        this.unsuspendBoardUpdate();
        this.store.notify();
    }

    private showControlPolygons() {
        this.board.suspendUpdate();
        this.jxgCurves.forEach(curve => curve.showControlPolygon());
        this.unsuspendBoardUpdate();
        this.store.notify();
    }

    private showDecasteljauScheme() {
        this.board.suspendUpdate();
        if (this.getSelectedCurve()) {
            this.getSelectedCurve().setDecasteljauT(1 / 2);
        }
        this.unsuspendBoardUpdate();
        this.store.notify();
    }

    private hideDecasteljauScheme() {
        this.board.suspendUpdate();
        if (this.getSelectedCurve()) {
            this.getSelectedCurve().hideDecasteljauScheme();
        }
        this.unsuspendBoardUpdate();
        this.store.notify();
    }
}

export default SubdivisionGraph;
