import {message, t, useT} from "../../../localization";
import React from 'react';

import {CurveOperation} from "../../base/controls/BezierCurveControls";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates, type BaseCurveIds} from "../../base/BaseCurveGraph";
import type {GraphDeclaration, LegendEntry} from "../../base/declare/graphDeclaration";
import {runAs} from "../../base/writes/writeSource";
import {watchedBox} from "./watchedBox";
import {Attributes} from "../../attributes/Attributes";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {repeatedSubdivisionPresetCollection} from "./collections";

export const MAX_SUBDIVISION_STEPS = 5;

function ShowControlPolygons(props: { checked: boolean, onChange: (checked: boolean) => void }) {
    const t = useT();
    return <OnOffSwitch checked={props.checked} label={t("control_polygons")} onChange={props.onChange}/>;
}

/** The ids of the repeated-subdivision declaration: the common curve ids (a switch per piece), a compact legend of the pieces and the scheme switch. */
export type RepeatedSubdivisionIds = Omit<BaseCurveIds, "legend" | "action"> & {
    legend: BaseCurveIds["legend"] | "pieces" | "pieces-alt" | "control-points";
    action: BaseCurveIds["action"] | "decasteljau-scheme";
};

class SubdivisionGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    /** Task 08 (lane L41): the board workspace (legend of the pieces, view marks, polygon and hull pucks of a lone curve). No cut parameter: the lesson halves at 1/2 only. */
    protected override declaresCurveWorkspace(): boolean { return true; }

    /**
     * The common declaration with a compact legend: up to 32 pieces would give 64 entries, so the pieces are one entry (a lone
     * curve is "Krivulja") and, once there are several, a second for the neighbours' alternate colour, plus the control points.
     */
    protected override declaration(): GraphDeclaration<RepeatedSubdivisionIds> {
        const common = this.commonCurveDeclaration();
        const many = this.jxgCurves.length > 1;
        const legend: LegendEntry<RepeatedSubdivisionIds>[] = [
            {id: "pieces", label: many ? message("repeated_subdivision_pieces") : message("curve"), kind: "line", object: "curve-0"},
            ...(many ? [{id: "pieces-alt" as const, label: message("repeated_subdivision_pieces_alt"), kind: "line" as const, object: `curve-${this.jxgCurves.length - 1}`}] : []),
            {id: "control-points", label: message("control_points"), kind: "point", object: "control-points-0"}];
        const selected = this.getSelectedCurve();
        return {...common, legend, followView: watchedBox(common.marks),
            actions: [...(common.actions ?? []), {id: "decasteljau-scheme", label: message("de_casteljau_scheme"), placement: "tools", section: "display",
                enabled: !!selected, pressed: !!selected?.isShowingDecasteljauScheme()}]};
    }

    override performAction(id: string): void {
        if (id !== "decasteljau-scheme") { super.performAction(id); return; }
        const selected = this.getSelectedCurve();
        if (!selected) return;
        runAs("learner", () => selected.isShowingDecasteljauScheme() ? this.hideDecasteljauScheme() : this.showDecasteljauScheme());
    }

    /** The midpoint Subdivide operation leads Edit and stays while a curve is selected (graph-control first use). */
    protected override workspaceConstructionFirst() { return true; }
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
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
        return repeatedSubdivisionPresetCollection;
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
            const newPieces: JXGBezierCurve[] = [];
            for (let bezierCurve of oldJsxBezierCurves) {
                // TODO REDESIGN SUBDIVISIONRESULTCONSUMER...
                bezierCurve.setSubdivisionResultConsumer(() => "");
                let newCurve = bezierCurve.subdivide(1 / 2);
                if (bezierCurve.isShowingControlPolygon()) {
                    newCurve.showControlPolygon();
                }
                newPieces.push(newCurve);
                this.jxgCurves.push(newCurve);
            }
            this.alternatePieceRoles(oldJsxBezierCurves, newPieces);
        } finally {
            this.unsuspendBoardUpdate();
        }
        this.refreshWorkspace();
    };

    /**
     * Every step halves every piece: the kept (left) halves are the old pieces and the new (right) halves come after them, so along the
     * curve the pieces alternate old, new, old, new. They alternate moss and blue (solid), so neighbouring pieces differ in hue after every step.
     */
    private alternatePieceRoles(kept: JXGBezierCurve[], added: JXGBezierCurve[]) {
        const first = {...this.styles.curve.series(0), strokeOpacity: 1, dash: 0};
        kept.forEach(piece => piece.getJxgCurve().setAttribute(first));
        added.forEach(piece => piece.getJxgCurve().setAttribute({...this.styles.curve.series(1), dash: 0}));
    }

    /**
     * The scheme switch needs a selected curve, so it is offered in Display only while one is selected; its handlers
     * do not depend on selection, but its checked state reads the selected curve.
     */
    protected override workspaceGraphDisplay(): React.ReactNode {
        const selected = this.getSelectedCurve();
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("construction")}</h3>
            <PuckOwned param="control-polygon-0"><ShowControlPolygons checked={this.getFirstJxgCurve().isShowingControlPolygon()}
                                 onChange={(checked) => {
                                     if (checked) {
                                         this.showControlPolygons();
                                     } else {
                                         this.hideControlPolygons();
                                     }
                                 }}/></PuckOwned>
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
        return this.state.initialized ? super.getGraphCommands().concat([<CurveOperation key="subdivision" curve={this.getFirstJxgCurve()} tool="subdivision" permanentPreview parameter={null}
            onChanged={() => this.store.notify()} onApply={() => this.subdivide()}
            applyReason={this.stepsDone >= MAX_SUBDIVISION_STEPS ? t("subdivision_steps_limit", {value0: String(MAX_SUBDIVISION_STEPS)}) : undefined}/>]) : [];
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
            this.getSelectedCurve().showCurrentDecasteljauScheme(true);
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
