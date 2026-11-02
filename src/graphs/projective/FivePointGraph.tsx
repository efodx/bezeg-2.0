import React from "react";
import BaseGraph, {BaseGraphState, TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";
import {Conic} from "../../projective/conic";
import {sampleConic} from "../../projective/conicSampler";
import {
    arcPoint, DEFAULT_FIVE_POINT_MODEL, evaluateFivePoint, extrapolatedPieces, FIVE_POINT_COUNT, FIVE_POINT_DENOMINATOR, FIVE_POINT_EXAMPLES, FIVE_POINT_NAMES,
    FIVE_POINT_STEP, FIVE_POINT_VIEW_BOX, FivePointExampleId, FivePointModel, FivePointScene, LastUnique, nextLastUnique, serializeFivePointModel, shownConic,
} from "./fivePointModel";
import {movePoint, nudgePoint, setEnd, setNumerators, setThird} from "./fivePointEdit";
import {FivePointControls} from "./FivePointControls";
import {describeFivePoint} from "./fivePointText";
import {definingPoints} from "./definingPoints";
import {fivePointPresetCollection} from "./projectivePresetCollection";

/**
 * The five-point graph (K4 of projective-conics-lessons, ADR 0033): five draggable points A to E on the 1/5 grid, the unique conic through
 * them (or a status when there is none), a rational quadratic Bezier arc of that conic between two chosen points with its end tangents,
 * the middle control point P1 (the pole of the chord), the weight from a third point, the Farin points F1, F2 and the shoulder S, and the
 * overlay of the arc drawn by the shared rational de Casteljau kernel. The scene store holds the integer `FivePointModel` and the
 * last unique conic's points (`lastUnique`); the board is a function of both. Not registered in any route yet.
 *
 * Public interface: `model`, `scene()`, `shown()`, `selectedIndex`, `extrapolating`, `loadExample(id)`, `loadModel(model)`,
 * `moveTo(i, x, y)`, `placeNumerators(i, x, y)`, `chooseEnd(which, i)`, `chooseThird(i)`, `nudgeSelected(dx, dy)`, `select(i | undefined)`,
 * `setExtrapolation(boolean)`, `presetCollection()`.
 *
 * Keyboard: the board container is focusable; once a point is selected the arrow keys move it 1/5 (Shift: 1).
 */
export interface FivePointGraphState extends BaseGraphState {
    model: FivePointModel;
    /** The points of the last position with a unique conic; drawn greyed while the current position is degenerate. */
    lastUnique?: LastUnique;
}

const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
};

const VIEW = {xMin: FIVE_POINT_VIEW_BOX[0], xMax: FIVE_POINT_VIEW_BOX[2], yMin: FIVE_POINT_VIEW_BOX[3], yMax: FIVE_POINT_VIEW_BOX[1]} as const;
const STEPS_PER_UNIT = FIVE_POINT_DENOMINATOR / FIVE_POINT_STEP;
const ARC_SAMPLES = 80;

/** The pieces of a conic in the view as one polyline, broken by NaN (JSXGraph lifts the pen at NaN), so branches are never joined. */
export function conicPolyline(c: Conic): {x: number[]; y: number[]} {
    const out = {x: [] as number[], y: [] as number[]};
    for (const piece of sampleConic(c, VIEW).pieces) {
        if (out.x.length) {
            out.x.push(NaN);
            out.y.push(NaN);
        }
        for (const p of piece.points) {
            out.x.push(p.x);
            out.y.push(p.y);
        }
    }
    return out;
}

interface FillCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}

interface DrawnScene {
    readonly points: readonly JXG.Point[];
    readonly all: readonly JXG.GeometryElement[];
}

const HIDDEN_LINE: [number, number, number] = [1, 0, 1];
const coordinate = (numerator: number): number => numerator / FIVE_POINT_DENOMINATOR;

export class FivePointGraph extends BaseGraph<FivePointGraphState, FivePointModel> {
    private drawn?: DrawnScene;
    private inDragSnap = false;
    private selected?: number;
    private nudged = false;
    private extrapolation = false;
    private sceneCache?: {readonly model: FivePointModel; readonly scene: FivePointScene};
    private shownCache?: {readonly model: FivePointModel; readonly last: LastUnique; readonly value: ReturnType<typeof shownConic>};
    private polylineCache?: {readonly key: string; readonly value: {x: number[]; y: number[]}};

    get model(): FivePointModel {
        return this.state.model;
    }

    get selectedIndex(): number | undefined {
        return this.selected;
    }

    get extrapolating(): boolean {
        return this.extrapolation;
    }

    /** The exact scene of the current model, computed once per model object. */
    scene(): FivePointScene {
        const model = this.model;
        if (this.sceneCache?.model !== model) this.sceneCache = {model, scene: evaluateFivePoint(model)};
        return this.sceneCache.scene;
    }

    /** The conic to draw (the current one, or the last unique one marked stale), computed once per model and record. */
    shown(): ReturnType<typeof shownConic> {
        const model = this.model;
        const last = this.state.lastUnique;
        if (this.shownCache?.model !== model || this.shownCache.last !== last) {
            this.shownCache = {model, last, value: shownConic(this.scene(), last)};
        }
        return this.shownCache.value;
    }

    override getInitialState(): FivePointGraphState {
        return {initialized: false, model: DEFAULT_FIVE_POINT_MODEL, lastUnique: nextLastUnique(undefined, DEFAULT_FIVE_POINT_MODEL, evaluateFivePoint(DEFAULT_FIVE_POINT_MODEL))};
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    private sceneOf(model: FivePointModel): FivePointScene {
        return this.sceneCache?.model === model ? this.sceneCache.scene : evaluateFivePoint(model);
    }

    private commit(next: FivePointModel): boolean {
        if (next === this.model) return false;
        this.setState({model: next, lastUnique: nextLastUnique(this.state.lastUnique, next, this.sceneOf(next))});
        this.requestRender();
        return true;
    }

    moveTo(index: number, x: number, y: number): boolean {
        return this.commit(movePoint(this.model, index, {x, y}));
    }

    placeNumerators(index: number, x: number, y: number): boolean {
        return this.commit(setNumerators(this.model, index, {x, y}));
    }

    chooseEnd(which: "a" | "b", index: number): boolean {
        return this.commit(setEnd(this.model, which, index));
    }

    chooseThird(index: number): boolean {
        return this.commit(setThird(this.model, index));
    }

    nudgeSelected(dx: number, dy: number): boolean {
        const moved = this.selected !== undefined && this.commit(nudgePoint(this.model, this.selected, dx, dy));
        if (moved) this.nudged = true;
        return moved;
    }

    loadExample(id: FivePointExampleId): void {
        this.loadModel(FIVE_POINT_EXAMPLES[id]);
    }

    /** Replaces the whole model (an example or an import checked by `parseFivePointModel`); a new model has no stale conic. */
    loadModel(model: FivePointModel): void {
        this.selected = undefined;
        this.nudged = false;
        const next = serializeFivePointModel(model);
        this.setState({model: next, lastUnique: nextLastUnique(undefined, next, evaluateFivePoint(next))});
        this.requestRender();
    }

    select(index: number | undefined): void {
        this.selected = index !== undefined && index >= 0 && index < FIVE_POINT_COUNT ? index : undefined;
        this.nudged = false;
        // Focus stays where the user is (an inspector button); a press on a board point focuses the board itself.
        this.requestRender();
        this.boardUpdate();
    }

    setExtrapolation(on: boolean): void {
        if (on === this.extrapolation) return;
        this.extrapolation = on;
        this.requestRender();
        this.boardUpdate();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<FivePointModel> {
        return fivePointPresetCollection();
    }

    defaultPreset(): FivePointModel {
        return serializeFivePointModel(DEFAULT_FIVE_POINT_MODEL);
    }

    /** A Preset carries the model once, as `data`; its `graphState` omits `model` and `lastUnique`, which the collection's `checkGraphState` rejects. */
    override exportPreset(): Preset<FivePointModel> {
        const preset = super.exportPreset();
        const {model: _model, lastUnique: _last, ...graphState} = preset.graphState as FivePointGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): FivePointModel {
        return serializeFivePointModel(this.model);
    }

    /** An import or the app-level Reset replaces the model; the selection, the last nudge, the extrapolation toggle and the stale conic belong to the old one and are cleared. */
    override importPresetData(data: FivePointModel): void {
        this.selected = undefined;
        this.nudged = false;
        this.extrapolation = false;
        const next = serializeFivePointModel(data);
        this.setState({model: next, lastUnique: nextLastUnique(undefined, next, evaluateFivePoint(next))});
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): FivePointGraphState {
        return {...super.figurePresetGraphState(graphState), model: this.model, lastUnique: this.state.lastUnique};
    }

    protected override lessonDefaultState(): FivePointGraphState {
        return {...this.getInitialState(), initialized: true, model: this.model, lastUnique: this.state.lastUnique};
    }

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), fivePointSelected: this.selected, fivePointExtrapolation: this.extrapolation};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const index = saved?.fivePointSelected;
        this.selected = typeof index === "number" ? index : undefined;
        this.extrapolation = saved?.fivePointExtrapolation === true;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override initialView(): [number, number, number, number] {
        return [...FIVE_POINT_VIEW_BOX];
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        // JSXGraph writes an empty aria-label of its own on the container, so the host's value is read before it is created.
        const hadLabel = container.getAttribute("aria-label");
        super.createMainView(session, container);
        this.bindInteraction(session, container, hadLabel);
    }

    /** Every listener and attribute set here is undone by the session cleanup. */
    private bindInteraction(session: GraphSession, container: HTMLElement, hadLabel: string | null): void {
        const hadTabIndex = container.getAttribute("tabindex");
        container.setAttribute("tabindex", "0");
        const label = () => container.setAttribute("aria-label", t("projective_five_point_board_label"));
        label();
        let language = currentLanguage();
        const unsubscribeLanguage = onLanguageChange(() => {
            if (currentLanguage() === language) return;
            language = currentLanguage();
            label();
            // Board text is a function of the language; an update re-evaluates it.
            this.boardUpdate();
        });
        container.addEventListener("keydown", this.onKeyDown);
        session.registerCleanup(() => {
            unsubscribeLanguage();
            container.removeEventListener("keydown", this.onKeyDown);
            if (hadTabIndex === null) container.removeAttribute("tabindex"); else container.setAttribute("tabindex", hadTabIndex);
            if (hadLabel === null) container.removeAttribute("aria-label"); else container.setAttribute("aria-label", hadLabel);
        });
    }

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.altKey || event.ctrlKey || event.metaKey || this.graphInteractionLocked) return;
        const step = ARROW_STEPS[event.key];
        if (step && this.selected !== undefined) {
            event.preventDefault();
            // Shift: a whole unit (five steps of 1/5).
            const k = event.shiftKey ? STEPS_PER_UNIT : 1;
            this.nudgeSelected(step[0] * k, step[1] * k);
        }
    };

    private dragPoint(index: number, point: JXG.Point): void {
        if (this.inDragSnap || this.graphInteractionLocked) return;
        const next = movePoint(this.model, index, {x: point.X(), y: point.Y()});
        const tx = coordinate(next.points[index].x);
        const ty = coordinate(next.points[index].y);
        this.inDragSnap = true;
        try {
            if (point.X() !== tx || point.Y() !== ty) point.moveTo([tx, ty], 0);
        } finally {
            this.inDragSnap = false;
        }
        this.selected = index;
        this.commit(next);
    }

    override initialize(): void {
        this.syncScene();
    }

    protected override onStateChange(previous: Readonly<FivePointGraphState>): void {
        super.onStateChange(previous);
        this.syncScene();
    }

    protected override syncReplacedScene(): void {
        this.syncScene();
    }

    private drawnObjectsAlive(): boolean {
        const list = this.board.objectsList as unknown[];
        return this.drawn === undefined || this.drawn.all.every(object => list.includes(object));
    }

    /** Creates the board once, then only moves the five points: every other object reads the exact scene through functions. */
    private syncScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        if (this.drawn === undefined || !this.drawnObjectsAlive()) {
            this.removeDrawn();
            this.drawn = this.createDrawn();
        } else {
            this.drawn.points.forEach((point, i) => {
                const x = coordinate(this.model.points[i].x);
                const y = coordinate(this.model.points[i].y);
                if (point.X() !== x || point.Y() !== y) point.moveTo([x, y], 0);
            });
        }
        this.boardUpdate();
    }

    private removeDrawn(): void {
        if (this.drawn && this.hasBoard) {
            const list = this.board.objectsList as unknown[];
            const present = this.drawn.all.filter(object => list.includes(object)).reverse();
            if (present.length) this.board.removeObject(present);
        }
        this.drawn = undefined;
    }

    /** The polyline of one conic, remembered for the last conic only (a drag changes it every step). */
    private polyline(c: Conic): {x: number[]; y: number[]} {
        const key = c.join(",");
        if (this.polylineCache?.key !== key) this.polylineCache = {key, value: conicPolyline(c)};
        return this.polylineCache.value;
    }

    private createDrawn(): DrawnScene {
        const board = this.board;
        const model = () => this.model;
        const all: JXG.GeometryElement[] = [];
        const add = <E extends JXG.GeometryElement>(element: E): E => {
            all.push(element);
            // A line given by coefficients creates two anonymous defining points on the board; they belong to the scene and go with it.
            definingPoints(element).forEach(helper => { if (!all.includes(helper)) all.push(helper); });
            return element;
        };
        const okArc = () => {
            const arc = this.scene().arc;
            return arc && arc.status === "ok" ? arc : undefined;
        };
        const label = {strokeColor: GraphPalette.label};
        const curveOf = (fill: (curve: FillCurve) => void, attributes: Record<string, unknown>) => {
            const curve = add(board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes}) as unknown as JXG.GeometryElement) as unknown as FillCurve & JXG.GeometryElement;
            curve.updateDataArray = () => fill(curve);
            return curve;
        };

        // The conic, drawn from the sampler; the hyperbola's two branches are one polyline broken by NaN. A stale conic is grey and dashed.
        curveOf(curve => {
            const shown = this.shown();
            const data = shown ? this.polyline(shown.conic) : {x: [], y: []};
            curve.dataX = data.x;
            curve.dataY = data.y;
        }, {
            strokeColor: () => this.shown()?.stale ? GraphPalette.referenceCurve : GraphPalette.primaryCurve,
            strokeWidth: () => this.displaySettings.strokeWidth, dash: () => this.shown()?.stale ? 3 : 0, layer: 4,
            visible: () => this.shown() !== undefined,
        });

        // A line pair (three collinear points) is drawn in the warning colour: it is the only conic, and it is not smooth.
        curveOf(curve => {
            const scene = this.scene();
            const data = scene.kind === "line-pair" && scene.conic ? this.polyline(scene.conic) : {x: [], y: []};
            curve.dataX = data.x;
            curve.dataY = data.y;
        }, {strokeColor: GraphPalette.warningText, strokeWidth: 2, dash: 2, layer: 4, visible: () => this.scene().kind === "line-pair"});

        // The arc as the shared rational de Casteljau evaluator draws it, over the conic, and its extrapolation (dashed, never joined across a zero).
        curveOf(curve => {
            const arc = okArc();
            curve.dataX = [];
            curve.dataY = [];
            if (!arc) return;
            for (let i = 0; i <= ARC_SAMPLES; i++) {
                const [x, y] = arcPoint(arc, i / ARC_SAMPLES);
                curve.dataX.push(x);
                curve.dataY.push(y);
            }
        }, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: () => this.displaySettings.strokeWidth + 3, layer: 3, visible: () => okArc() !== undefined});

        curveOf(curve => {
            const arc = okArc();
            curve.dataX = [];
            curve.dataY = [];
            if (!arc || !this.extrapolation) return;
            extrapolatedPieces(arc).forEach((piece, i) => {
                if (i > 0) { curve.dataX.push(NaN); curve.dataY.push(NaN); }
                curve.dataX.push(...piece.x);
                curve.dataY.push(...piece.y);
            });
        }, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 2, layer: 3, visible: () => okArc() !== undefined && this.extrapolation});

        // The control polygon P0 P1 P2.
        curveOf(curve => {
            const arc = okArc();
            curve.dataX = arc ? arc.controlPoints.map(p => p.x) : [];
            curve.dataY = arc ? arc.controlPoints.map(p => p.y) : [];
        }, {strokeColor: GraphPalette.controlPolygon, strokeWidth: 1.5, dash: 1, layer: 2, visible: () => okArc() !== undefined});

        // The end tangents: the lines P0 P1 and P2 P1.
        const tangent = (end: 0 | 2): [number, number, number] => {
            const arc = okArc();
            if (!arc) return HIDDEN_LINE;
            const p = arc.controlPoints[end];
            const q = arc.controlPoints[1];
            const a = q.y - p.y;
            const b = p.x - q.x;
            return a === 0 && b === 0 ? HIDDEN_LINE : [-(a * p.x + b * p.y), a, b];
        };
        for (const end of [0, 2] as const) {
            add(board.create("line", [() => tangent(end)[0], () => tangent(end)[1], () => tangent(end)[2]], {
                strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5, dash: 2, highlight: false, fixed: true, layer: 3, visible: () => okArc() !== undefined,
            }) as JXG.GeometryElement);
        }

        // P1, the Farin points and the shoulder.
        const derived = (name: string, at: () => readonly [number, number] | undefined, face: string, size: number) => add(board.create("point", [() => at()?.[0] ?? 0, () => at()?.[1] ?? 0], {
            name, withLabel: true, size, face, fixed: true, showInfobox: false, fillColor: GraphPalette.derivedPoint, strokeColor: GraphPalette.pointOutline,
            highlight: false, layer: 6, label: {...label, offset: [8, -12]}, visible: () => at() !== undefined,
        }) as JXG.Point);
        const of = (pick: (arc: NonNullable<ReturnType<typeof okArc>>) => {x: number; y: number}) => (): readonly [number, number] | undefined => {
            const arc = okArc();
            return arc ? [pick(arc).x, pick(arc).y] : undefined;
        };
        derived("P₁", of(arc => arc.controlPoints[1]), "square", 4);
        derived("F₁", of(arc => arc.farinPoints[0]), "o", 3);
        derived("F₂", of(arc => arc.farinPoints[1]), "o", 3);
        derived("S", of(arc => arc.shoulder), "+", 4);

        // The five grid points A to E; the arc ends and the weight point are highlighted.
        const isEnd = (i: number) => model().a === i || model().b === i;
        const points = FIVE_POINT_NAMES.map((name, i) => {
            const at = model().points[i];
            const point = add(board.create("point", [coordinate(at.x), coordinate(at.y)], {
                name, withLabel: true, size: () => this.selected === i ? 7 : isEnd(i) ? 6 : 5, face: "o", showInfobox: false,
                fillColor: () => this.selected === i ? GraphPalette.selectedControlPoint : isEnd(i) ? GraphPalette.constructionAccent : model().t === i ? GraphPalette.comparisonCurve : GraphPalette.controlPoint,
                strokeColor: () => this.selected === i ? GraphPalette.selectedControlPointOutline : GraphPalette.pointOutline,
                strokeWidth: () => this.selected === i ? 3 : 1, highlightFillColor: GraphPalette.selectedControlPoint,
                label: {...label, offset: [8, 8]}, layer: 7,
            }) as JXG.Point);
            point.on("down", () => {
                this.selected = i;
                this.requestRender();
                this.board.containerObj.focus({preventScroll: true});
            });
            point.on("drag", () => this.dragPoint(i, point));
            return point;
        });

        // The weight readout on the board: its decimals follow the language.
        add(board.create("text", [-11.5, 9.6, () => describeFivePoint(this.scene(), false, t, currentLanguage()).weightBoard ?? ""], {
            fixed: true, highlight: false, strokeColor: GraphPalette.label, layer: 8, visible: () => okArc() !== undefined,
        }) as JXG.GeometryElement);
        return {points, all};
    }

    /** Removes this family's drawn objects; the next sync rebuilds them. */
    protected override disposeFigureScene(): void {
        this.removeDrawn();
    }

    override unmount(): void {
        this.removeDrawn();
        super.unmount();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <FivePointControls model={this.model} scene={this.scene()} stale={this.shown()?.stale === true} selected={this.selected} nudged={this.nudged}
                                  extrapolation={this.extrapolation} actions={{
            loadExample: id => this.loadExample(id),
            setEnd: (which, index) => {this.chooseEnd(which, index);},
            setThird: index => {this.chooseThird(index);},
            place: (index, x, y) => {this.placeNumerators(index, x, y);},
            select: index => this.select(index),
            setExtrapolation: on => this.setExtrapolation(on),
        }}/>;
    }
}
