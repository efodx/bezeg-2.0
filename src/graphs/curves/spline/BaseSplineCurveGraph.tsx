import {t} from "../../../localization";
import React from "react";
import BaseCurveGraph, {BaseCurveIds, BaseGraphStates} from "../../base/BaseCurveGraph";
import type {GraphDeclaration, ViewMarks} from "../../base/declare/graphDeclaration";
import type {EditableCurve} from "../../base/CurveEditingFeature";
import {BezierSpline} from "../../../bezeg/impl/curve/bezier-spline";
import {AbstractJXGSplineCurve} from "../object/AbstractJXGSplineCurve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";

/** The ids a declared spline graph owns: the common curve ids (legend of the curve and its points, display switches). */
export type SplineIds = BaseCurveIds;

export abstract class BaseSplineCurveGraph<S extends BaseGraphStates> extends BaseCurveGraph<S> {
    /**
     * Opt-in for the spline demonstrations converted to the board workspace: true declares the common curve workspace (legend,
     * display switches, view marks) plus the spline's joins in the marks and a `followView` around what the learner watches.
     * Undeclared spline graphs keep today's panels.
     */
    protected declaresSplineWorkspace(): boolean { return false; }
    protected override declaresCurveWorkspace(): boolean { return this.declaresSplineWorkspace(); }

    private splineMarksCache: {base: ViewMarks; key: string; marks: ViewMarks} | undefined;

    /** The base marks (control points, curve samples of every piece) plus the computed joins, which the free points do not list. */
    protected override curveViewMarks(): ViewMarks {
        const base = super.curveViewMarks();
        const joins = this.jxgCurves.flatMap(curve => {
            const spline = curve.getCurve() as BezierSpline;
            return spline.getNonFreePoints().filter(point => Number.isFinite(point.X()) && Number.isFinite(point.Y()));
        });
        const key = joins.map(point => `${point.X()},${point.Y()}`).join(";");
        if (this.splineMarksCache?.base === base && this.splineMarksCache.key === key) return this.splineMarksCache.marks;
        const marks: ViewMarks = {must: [...base.must, ...joins.map(point => ({kind: "point" as const, x: point.X(), y: point.Y()}))], nice: base.nice};
        this.splineMarksCache = {base, key, marks};
        return marks;
    }

    /**
     * The box around what the learner watches (every control point and join, grown by a fifth). Without it the view director
     * frames the lesson scene's box, widened to the canvas aspect, inside the narrow card-free strip, and the spline shrinks.
     */
    protected splineWatchedBox(marks: ViewMarks): [number, number, number, number] | undefined {
        const points = marks.must.flatMap(mark => mark.kind === "point" ? [[mark.x, mark.y]] : []);
        if (points.length === 0) return undefined;
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.3);
        return [left - pad, top + 2 * pad, right + pad, bottom - pad];
    }

    protected override declaration(): GraphDeclaration | undefined {
        const common = super.declaration();
        return common && {...common, followView: this.splineWatchedBox(this.curveViewMarks())};
    }

    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    /** Only the free points are rows; the junction points are computed from them. */
    protected override typedPointsOf(curve: EditableCurve) {
        const spline = curve.getCurve() as BezierSpline;
        return spline.getPoints().filter(point => !spline.getNonFreePoints().includes(point));
    }
    override mount(container: HTMLElement) {
        super.mount(container);
        this.getFirstJxgCurve().setAttributes({allowShowPoints: true});
    }

    /** Presets, lesson scenes and checkpoints replace the curve objects without calling mount(). */
    override importPresetData(data: CurveCollectionPresetData) {
        super.importPresetData(data);
        this.getFirstJxgCurve()?.setAttributes({allowShowPoints: true});
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('spline-label-points', action => {
            if (typeof action.visible !== 'boolean') {
                throw new Error('Labelling all spline points must be switched on or off.');
            }
            this.setLabelAll(action.visible);
            this.refreshSplineSwitches();
        });
        registry.on('spline-hide-fixed', action => {
            if (typeof action.hidden !== 'boolean') {
                throw new Error('Hiding the derived spline points must be switched on or off.');
            }
            this.getFirstJxgCurve().setHideFixed(action.hidden);
            this.boardUpdate();
            this.refreshSplineSwitches();
        });
    }

    /** The switches and counters read the curve while rendering, so a changed curve only needs a render. */
    protected refreshSplineSwitches() {
        this.requestRender();
    }

    override getFirstCurve(): BezierSpline {
        return super.getFirstCurve() as BezierSpline;
    }

    override getFirstJxgCurve(): AbstractJXGSplineCurve<any> {
        return super.getFirstJxgCurve() as AbstractJXGSplineCurve<any>;
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("point_visibility")}</h3>
            <OnOffSwitch onChange={(checked) => this.setLabelAll(checked)}
                label={t("label_all_points")}
                checked={this.getFirstJxgCurve().getLabelAll()}/>
            <OnOffSwitch onChange={(checked) => {
                this.getFirstJxgCurve().setHideFixed(checked);
                this.store.notify();
            }}
                label={t("hide_fixed_points")}
                checked={this.getFirstJxgCurve().getHideFixed()}/></div></>;
    }

    protected setLabelAll(checked: boolean) {
        this.getFirstJxgCurve().setLabelAll(checked);
        this.boardUpdate();
        this.store.notify();
    }
}