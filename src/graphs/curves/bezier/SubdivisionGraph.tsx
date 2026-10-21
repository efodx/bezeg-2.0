import {t, useT} from "../../../localization";
import React from 'react';

import {Button} from "react-bootstrap";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {curvePresetCollections, CurveCollectionPresetData} from "../curvePresetCollections";

export const MAX_SUBDIVISION_STEPS = 5;

function ShowControlPolygons(props: { checked: boolean, onChange: (checked: boolean) => void }) {
    const t = useT();
    return <OnOffSwitch checked={props.checked} label={t("control_polygons")} onChange={props.onChange}/>;
}

class SubdivisionGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    /**
     * Subdivision steps the scene has taken, derived from its pieces rather than kept as transient state: every step
     * splits every piece at 1/2 and the pieces offer no other subdivision, so k steps give 2^k pieces. An imported
     * Preset with n pieces counts as ceil(log2 n) steps, so the scene never exceeds 2^MAX_SUBDIVISION_STEPS pieces.
     */
    private get stepsDone(): number {
        return Math.min(MAX_SUBDIVISION_STEPS, Math.ceil(Math.log2(Math.max(1, this.jxgCurves.length))));
    }

    /** Every piece inherits the disabled curve operations, so an imported scene needs them on all pieces again. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.jxgCurves.forEach(curve => curve.setAttributes(Attributes.bezierDisabled));
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

    defaultPreset(): CurveCollectionPresetData {
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

    override presetCollection() {
        return curvePresetCollections["repeated-subdivision"];
    }

    override getAllJxgPoints() {
        return super.getAllJxgPoints().concat(this.jxgCurves.flatMap(curve => (curve as JXGBezierCurve).getJXGDecasteljauPoints()));
    }

    subdivide() {
        if (this.stepsDone >= MAX_SUBDIVISION_STEPS) {
            return;
        }
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

    /**
     * The scheme switch needs a selected curve, so it is offered in Display only while one is selected; its handlers
     * do not depend on selection, but its checked state reads the selected curve.
     */
    protected override workspaceGraphDisplay(): React.ReactNode {
        const selected = this.getSelectedCurve();
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("construction")}</h3>
            <ShowControlPolygons checked={this.getFirstJxgCurve().isShowingControlPolygon()}
                                 onChange={(checked) => {
                                     if (checked) {
                                         this.showControlPolygons();
                                     } else {
                                         this.hideControlPolygons();
                                     }
                                 }}/>
            {selected
                ? <OnOffSwitch checked={selected.isShowingDecasteljauScheme()} onChange={checked => {
                    if (checked) {
                        this.showDecasteljauScheme();
                    } else {
                        this.hideDecasteljauScheme();
                    }
                }} label={t("de_casteljau_scheme")}/>
                : <p>{t("select_curve_for_scheme")}</p>}</div></>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([<Button
            onClick={() => this.subdivide()}>{t("subdivide")}</Button>]) : [];
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
