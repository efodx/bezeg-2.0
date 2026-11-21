import {currentLanguage, t} from "../../../localization";
import React from 'react';
import type JXG from "jsxgraph";

import {Button} from "react-bootstrap";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {affinePresetCollection} from "./collections";
import {formatNumber} from "../../../analysis/format";
import {ReadoutHeading, ReadoutHelp, ReadoutList} from "../../base/controls/ReadoutParts";
import {GraphPalette} from "../../styles/GraphPalette";
import {nameBox, PlacedLabels, pxFrame} from "../../legend/pointNamePlacement";
import {controlNameBox, evaluationNameBox} from "../object/AbstractJXGPointControlledCurve";
import {
    type Affine, type AffineOperation, type Pt, IDENTITY, affineOfOperation, bezierPoint, boxCentreOf, composeAffine,
    departsFromTrack, mappedReferencePoint, meanOf,
} from "./affineTrack";

/** Board objects the comparison owns: the faint reference curve and polygon, the two centre crosses and the ring on T(B(t)). */
interface AffineMarks {
    readonly board: JXG.Board;
    readonly objects: JXG.GeometryElement[];
    readonly curve: JXG.GeometryElement;
    readonly polygon: JXG.GeometryElement;
    readonly turnCentre: JXG.GeometryElement;
    readonly scaleCentre: JXG.GeometryElement;
    readonly ring: JXG.GeometryElement;
}

const SAME_CENTRE_PX = 0.5;
/** Two centre crosses closer than this (px) are named once, "c, c'" on the turn centre, since two names there would read as one. */
const MERGED_NAME_PX = 12;
const MERGED_NAME = "$$c,\\ c'$$";
const REFERENCE_SAMPLES = 60;
const isShown = (o: JXG.GeometryElement) => (o as unknown as {visProp?: {visible?: unknown}}).visProp?.visible !== false;

function AffineActionButton(props: {
    label: string;
    detail: string;
    symbol: string;
    onClick: () => void;
}) {
    return <Button className="affine-action-button" aria-label={`${props.label}: ${props.detail}`} onClick={props.onClick}>
        <span className="affine-action-symbol" aria-hidden="true">{props.symbol}</span>
        <span className="affine-action-copy"><span>{props.label}</span><small>{props.detail}</small></span>
    </Button>;
}

function AffineActionGroup(props: {title: string; children: React.ReactNode; className?: string}) {
    return <section className={`affine-transform-group ${props.className ?? ""}`}>
        <h4>{props.title}</h4>
        <div className="affine-transform-actions">{props.children}</div>
    </section>;
}

export default class AffineTransformBezierCurveGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    /** The control points as the scene or the route left them before any transformation; undefined until the next operation takes them. */
    private referencePoints?: Pt[];
    /** The map applied to the reference since: translations, turns and scalings in the order applied. */
    private track: Affine = IDENTITY;
    private marks?: AffineMarks;
    private readonly markLabels = new PlacedLabels();
    private readoutKey = '';
    private readonly onBoardUpdate = () => this.refreshComparison();

    /** The rotation leads Edit, then the other transformations, and stays while a curve is selected (graph-control first use). */
    protected override workspaceConstructionFirst() { return true; }
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }
    /** The curve operations stay disabled on every imported curve; the adapter attributes are not in its DTO. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.getFirstJxgCurve()?.setAttributes(Attributes.bezierDisabled);
        this.forgetReference();
    }

    override mount(container: HTMLElement) {
        super.mount(container);
        if (this.hasBoard) this.board.on('update', this.onBoardUpdate);
    }

    override unmount() {
        if (this.hasBoard) this.board.off('update', this.onBoardUpdate);
        this.removeMarks();
        this.forgetReference();
        super.unmount();
    }

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        this.removeMarks();
        this.forgetReference();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('affine-transform', action => {
            if (action.operation === 'translate-x') this.apply({kind: 'move', x: action.value, y: 0});
            if (action.operation === 'translate-y') this.apply({kind: 'move', x: 0, y: action.value});
            if (action.operation === 'scale') this.apply({kind: 'scale', factor: action.value});
            if (action.operation === 'rotate') this.apply({kind: 'rotate', theta: action.value});
            if (action.operation === 'reflect-x') this.apply({kind: 'flip', x: false, y: true});
            if (action.operation === 'reflect-y') this.apply({kind: 'flip', x: true, y: false});
            this.transformed();
        });
    }


    override presetCollection() {
        return affinePresetCollection;
    }

    defaultPreset(): CurveCollectionPresetData {
        return [["JSXBezierCurve", {
            "points": [[-3, 2], [0, -2], [1, 2], [3, -2]], "state": {
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

    override getGraphCommands(): JSX.Element[] {
        const comparison = this.comparisonReadout();
        return super.getGraphCommands().concat([
            <AffineActionGroup key="rotation" title={t("affine_rotation")}>
                <AffineActionButton label={t("rotate_left")} detail="18°" symbol="↺" onClick={() => this.rotate(-0.10 * Math.PI)}/>
                <AffineActionButton label={t("rotate_right")} detail="18°" symbol="↻" onClick={() => this.rotate(0.10 * Math.PI)}/>
            </AffineActionGroup>,
            <AffineActionGroup key="position" title={t("affine_position")} className="affine-position-group">
                <AffineActionButton label={t("left")} detail="−0.5" symbol="←" onClick={() => this.moveFor(-0.5, 0)}/>
                <AffineActionButton label={t("right")} detail="+0.5" symbol="→" onClick={() => this.moveFor(0.5, 0)}/>
                <AffineActionButton label={t("up")} detail="+0.5" symbol="↑" onClick={() => this.moveFor(0, 0.5)}/>
                <AffineActionButton label={t("down")} detail="−0.5" symbol="↓" onClick={() => this.moveFor(0, -0.5)}/>
            </AffineActionGroup>,
            <AffineActionGroup key="scale" title={t("affine_scale")}>
                <AffineActionButton label={t("scale_up")} detail="×1.2" symbol="＋" onClick={() => this.scale(1.2)}/>
                <AffineActionButton label={t("scale_down")} detail="×0.8" symbol="−" onClick={() => this.scale(0.8)}/>
            </AffineActionGroup>,
            <AffineActionGroup key="reflection" title={t("affine_reflection")}>
                <AffineActionButton label={t("reflect_across_y")} detail={t("affine_axis_y")} symbol="↔" onClick={() => this.flip(true, false)}/>
                <AffineActionButton label={t("reflect_across_x")} detail={t("affine_axis_x")} symbol="↕" onClick={() => this.flip(false, true)}/>
            </AffineActionGroup>,
            ...(comparison ? [comparison] : []),
        ]);
    }

    private moveFor(x: number, y: number) {
        this.apply({kind: 'move', x, y});
        this.transformed();
    }

    private scale(scale: number) {
        this.apply({kind: 'scale', factor: scale});
        this.transformed();
    }

    private rotate(number: number) {
        this.apply({kind: 'rotate', theta: number});
        this.transformed();
    }

    private flip(b: boolean, b2: boolean) {
        this.apply({kind: 'flip', x: b, y: b2});
        this.transformed();
    }

    /** Redraw the board and refresh the workspace, so the typed point fields show the moved control points. */
    private transformed() {
        this.ensureMarks();
        this.showMarks();
        this.readoutKey = this.readoutKeyNow();
        this.boardUpdate();
        this.refreshWorkspace();
    }

    /** The control points of the first curve as plain pairs. */
    private currentPoints(): Pt[] {
        return (this.getFirstCurve()?.getPoints() ?? []).map(p => [p.X(), p.Y()] as Pt);
    }

    /**
     * Applies one operation to the curve and to the tracked map T. The first operation after a scene, a reset or a hand edit takes
     * the curve as it is for the new reference. The centres are read before the curve moves, as the curve's own gestures read them.
     */
    private apply(op: AffineOperation): void {
        const curve = this.getFirstCurve();
        this.getFirstJxgCurve()?.setEvaluationObstacles(() => this.centreObstacles());
        if (!this.referencePoints) {
            this.referencePoints = this.currentPoints();
            this.track = IDENTITY;
        }
        const points = this.currentPoints();
        this.track = composeAffine(affineOfOperation(op, {mean: meanOf(points), box: boxCentreOf(points)}), this.track);
        if (op.kind === 'move') curve.moveFor(op.x, op.y);
        else if (op.kind === 'scale') curve.scale(op.factor);
        else if (op.kind === 'rotate') curve.rotate(op.theta);
        else curve.flip(op.x, op.y);
    }

    private forgetReference(): void {
        this.referencePoints = undefined;
        this.track = IDENTITY;
        this.markLabels.clear();
        this.readoutKey = '';
        this.hideMarks();
    }

    /** The curve differs from its reference (nothing to compare against before the first operation). */
    private differsFromReference(): boolean {
        const reference = this.referencePoints;
        if (!reference) return false;
        const current = this.currentPoints();
        return current.length !== reference.length || current.some((p, i) => Math.hypot(p[0] - reference[i][0], p[1] - reference[i][1]) > 1e-9);
    }

    private evaluationT(): number | undefined {
        return this.getFirstJxgCurve()?.exportState().evaluationPointT;
    }

    /** Board update: a hand edit ends the comparison, then the marks follow the curve. Creates and removes nothing. */
    private refreshComparison(): void {
        if (!this.referencePoints || !this.getFirstCurve()) return;
        if (departsFromTrack(this.referencePoints, this.track, this.currentPoints())) this.forgetReference();
        else this.showMarks();
        const key = this.readoutKeyNow();
        if (key !== this.readoutKey) {
            this.readoutKey = key;
            this.requestRender();
        }
    }

    private readoutKeyNow(): string {
        return this.differsFromReference() ? `${this.evaluationT() ?? ''}|${this.currentPoints().join(';')}` : '';
    }

    private hideMarks(): void {
        this.marks?.objects.forEach(o => { if (isShown(o)) o.setAttribute({visible: false}); });
    }

    private showMarks(): void {
        const marks = this.marks;
        if (!marks) return;
        const differs = this.differsFromReference();
        const frame = pxFrame(marks.board);
        let separate = false;
        let merged = false;
        if (differs && frame) {
            const points = this.currentPoints();
            const a = frame.toPx(...meanOf(points));
            const b = frame.toPx(...boxCentreOf(points));
            const apart = Math.hypot(a[0] - b[0], a[1] - b[1]);
            separate = apart > SAME_CENTRE_PX;
            merged = separate && apart < MERGED_NAME_PX;
        }
        const turnName = merged ? MERGED_NAME : '$$c$$';
        if ((marks.turnCentre as JXG.Point).name !== turnName) (marks.turnCentre as JXG.Point).setName(turnName);
        const scaleLabel = (marks.scaleCentre as JXG.Point).label;
        if (scaleLabel) scaleLabel.setAttribute({visible: merged ? false : 'inherit'});
        const want = new Map<JXG.GeometryElement, boolean>([
            [marks.curve, differs], [marks.polygon, differs], [marks.turnCentre, differs],
            [marks.scaleCentre, separate], [marks.ring, differs && this.evaluationT() !== undefined],
        ]);
        want.forEach((visible, o) => { if (isShown(o) !== visible) o.setAttribute({visible}); });
    }

    private removeMarks(): void {
        const marks = this.marks;
        this.marks = undefined;
        this.markLabels.clear();
        if (!marks || !this.graphSession?.isAlive) return;
        const live = marks.objects.filter(o => marks.board.objectsList.includes(o)).reverse();
        if (live.length) marks.board.removeObject(live);
    }

    /** Creates the comparison's board objects once per board; they follow `referencePoints`, the track and the curve by callbacks. */
    private ensureMarks(): AffineMarks | undefined {
        if (!this.hasBoard) return undefined;
        const board = this.board;
        if (this.marks && this.marks.board !== board) this.marks = undefined;
        if (this.marks) return this.marks;
        const reference = () => this.referencePoints ?? [];
        const faint = {
            strokeColor: GraphPalette.referenceCurve, strokeOpacity: 0.7, strokeWidth: 2, dash: 2, fixed: true, highlight: false,
            withLabel: false, hasPoint: false, layer: 3, visible: false, isDraggable: false,
        };
        // JSXGraph updates a hidden curve too: without a reference (before the first operation, after a drag or Reset) it draws nothing.
        const along = (u: number, axis: 0 | 1) => { const r = reference(); return r.length > 0 ? bezierPoint(r, u)[axis] : NaN; };
        const curve = board.create('curve', [(u: number) => along(u, 0), (u: number) => along(u, 1), 0, 1], faint) as JXG.Curve;
        const polygon = board.create('curve', [() => reference().map(p => p[0]), () => reference().map(p => p[1])], {...faint, strokeWidth: 1, strokeOpacity: 0.5}) as JXG.Curve;
        const settings = this.displaySettings;
        const centre = (id: 'c' | 'c2', at: () => Pt) => board.create('point', [() => at()[0], () => at()[1]], {
            ...this.styles.point.fixed, face: 'cross', size: () => Math.max(3, settings.pointSize - 1), fillColor: GraphPalette.label,
            highlightFillColor: GraphPalette.label, strokeColor: GraphPalette.label, highlightStrokeColor: GraphPalette.label,
            fixed: true, highlight: false, visible: false, layer: 8,
            name: id === 'c' ? '$$c$$' : "$$c'$$",
            label: {
                ...(this.styles.point.fixed.label as object), anchorX: 'middle', anchorY: 'middle', visible: 'inherit',
                offset: () => this.centreLabelOffset(id),
            },
        }) as JXG.Point;
        const turnCentre = centre('c', () => meanOf(this.currentPoints()));
        const scaleCentre = centre('c2', () => boxCentreOf(this.currentPoints()));
        const ring = board.create('point', [
            () => reference().length > 0 ? mappedReferencePoint(reference(), this.track, this.evaluationT() ?? 0)[0] : NaN,
            () => reference().length > 0 ? mappedReferencePoint(reference(), this.track, this.evaluationT() ?? 0)[1] : NaN,
        ], {
            face: 'o', size: () => settings.pointSize + 3, fillColor: 'none', fillOpacity: 0, highlightFillColor: 'none', highlightFillOpacity: 0,
            strokeColor: GraphPalette.emphasis, highlightStrokeColor: GraphPalette.emphasis, strokeWidth: 2, withLabel: false,
            fixed: true, highlight: false, visible: false, layer: 10,
        }) as JXG.Point;
        this.marks = {board, objects: [curve, polygon, turnCentre, scaleCentre, ring], curve, polygon, turnCentre, scaleCentre, ring};
        return this.marks;
    }

    /** The centre crosses that are shown are obstacles for the name of the shown curve point. */
    private centreObstacles(): ReadonlyArray<readonly [number, number, number]> {
        const marks = this.marks;
        const points = this.getFirstCurve()?.getPoints();
        if (!marks || !points || !isShown(marks.turnCentre)) return [];
        const current = points.map(p => [p.X(), p.Y()] as Pt);
        const out: Array<readonly [number, number, number]> = [[...meanOf(current), 3]];
        if (isShown(marks.scaleCentre)) out.push([...boxCentreOf(current), 3]);
        return out;
    }

    /** The offset (px, y up) from a centre cross to the middle of its name, from the shared name placement. */
    private centreLabelOffset(id: 'c' | 'c2'): [number, number] {
        const fallback: [number, number] = [10, 10];
        const marks = this.marks;
        const curve = this.getFirstJxgCurve();
        const frame = marks ? pxFrame(marks.board) : undefined;
        if (!marks || !curve || !frame) return fallback;
        const settings = this.displaySettings;
        const fontPx = settings.fontSize;
        const points = this.currentPoints();
        const mean = frame.toPx(...meanOf(points));
        const box = frame.toPx(...boxCentreOf(points));
        const separate = isShown(marks.scaleCentre);
        const t = this.evaluationT();
        const token: unknown[] = [fontPx, settings.pointSize, settings.pointLabelsVisible, separate, t, ...points.flat(), ...(this.referencePoints?.flat() ?? [])];
        const boxes = this.markLabels.boxes(marks.board, token, () => {
            const markers: Array<readonly [number, number, number]> = [[mean[0], mean[1], 3]];
            if (separate) markers.push([box[0], box[1], 3]);
            const blocks: Array<{x0: number; y0: number; x1: number; y1: number}> = [];
            curve.getJxgPoints().forEach((p, i) => {
                if (!isShown(p)) return;
                const [x, y] = frame.toPx(p.X(), p.Y());
                markers.push([x, y, settings.pointSize]);
                if (!settings.pointLabelsVisible) return;
                blocks.push(controlNameBox(`p${i}`, x, y, fontPx));
            });
            if (t !== undefined) {
                const at = frame.toPx(...bezierPoint(points, t));
                markers.push([at[0], at[1], settings.pointSize]);
                // The curve's own label of B(t) sits where the curve placed it: the middle of its box is the point plus the label offset (y up).
                const {w, h} = evaluationNameBox(t, fontPx);
                const label = (marks.board.objectsList as unknown as Array<{elType?: string; name?: string; label?: {visProp?: {offset?: unknown}}}>)
                    .find(o => o.elType === 'point' && typeof o.name === 'string' && o.name.startsWith('$$B('))?.label;
                const offset = typeof label?.visProp?.offset === 'function' ? (label.visProp.offset as () => unknown)() : label?.visProp?.offset;
                if (Array.isArray(offset) && offset.length === 2) {
                    const [cx, cy] = [at[0] + Number(offset[0]), at[1] - Number(offset[1])];
                    blocks.push({x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2});
                }
            }
            const samples: Array<readonly [number, number]> = [];
            const own = curve.getJxgCurve() as unknown as {points?: Array<{scrCoords: number[]}>};
            for (const c of own.points ?? []) if (Number.isFinite(c.scrCoords[1]) && Number.isFinite(c.scrCoords[2])) samples.push([c.scrCoords[1], c.scrCoords[2]]);
            const ref = this.referencePoints ?? [];
            if (ref.length) for (let i = 0; i <= REFERENCE_SAMPLES; i++) samples.push(frame.toPx(...bezierPoint(ref, i / REFERENCE_SAMPLES)));
            const items = [{id: 'c', ax: mean[0], ay: mean[1], ...nameBox('c', fontPx)}];
            if (separate) items.push({id: 'c2', ax: box[0], ay: box[1], ...nameBox("c'", fontPx)});
            return {items, markers, samples, blocks};
        });
        return this.markLabels.offset(boxes[id], id === 'c' ? mean : box, fallback);
    }

    /** The tools-column readout of the two computations of the shown curve point, or nothing while there is nothing to compare. */
    private comparisonReadout(): JSX.Element | null {
        const curve = this.getFirstCurve();
        const reference = this.referencePoints;
        const parameter = this.evaluationT();
        if (!curve || !reference || parameter === undefined || !this.differsFromReference()) return null;
        const language = currentLanguage();
        const number = (v: number) => formatNumber(v, language, 2);
        const pair = (p: Pt) => language === 'sl' ? `(${number(p[0])}; ${number(p[1])})` : `(${number(p[0])}, ${number(p[1])})`;
        const mapped = mappedReferencePoint(reference, this.track, parameter);
        const own = curve.eval(parameter);
        const at = number(parameter);
        return <section key="compare" className="affine-transform-group affine-compare" data-affine-compare="true">
            <ReadoutHeading>{t("affine_compare_title")}</ReadoutHeading>
            <ReadoutList label={t("affine_compare_title")} rows={[
                {id: 'affine-mapped-reference', label: `T(B(${at}))`, value: pair(mapped)},
                {id: 'affine-moved-points', label: <>B<sub>T</sub>({at})</>, value: pair([own.X(), own.Y()])},
            ]}/>
            <ReadoutHelp>{t("affine_compare_help")}</ReadoutHelp>
        </section>;
    }
}
