import React from "react";
import BaseGraph, {BaseGraphState, TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {sampleConic} from "../../projective/conicSampler";
import {
    DEFAULT_POLE_POLAR_MODEL, POLE_POLAR_CONICS, POLE_POLAR_DENOMINATOR, POLE_POLAR_EXAMPLES, POLE_POLAR_VIEW_BOX, PolePolarConicId, PolePolarDirection,
    PolePolarExampleId, PolePolarModel, PolePolarScene, evaluatePolePolar, isLineAtInfinity, serializePolePolarModel,
} from "./polePolarModel";
import {moveP, nudgeP, setConic, setDirection, setNumerators} from "./polePolarEdit";
import {PolePolarControls} from "./PolePolarControls";
import {definingPoints} from "./definingPoints";
import {TANGENCY_NAMES, TANGENT_NAMES} from "./polePolarText";
import {idealMarker, orientedUnit} from "./idealMarker";
import {polePolarPresetCollection} from "./projectivePresetCollection";

/**
 * The pole and polar graph (K3 of projective-conics-lessons, ADR 0033). One of four fixed conics, the point P (a finite point on the
 * 1/5 grid or a point at infinity), its polar `p`, the tangents `t₁`, `t₂` from P with the points of tangency `T₁`, `T₂`, and the centre
 * (the pole of the line at infinity; none is drawn for a parabola). The scene store holds the integer `PolePolarModel`; the board is
 * a function of it, and every readout is exact (projective kernel) and also text. A conic is drawn from `sampleConic`.
 *
 * Public interface: `model`, `scene()`, `pSelected`, `loadExample(id)`, `loadModel(model)`, `chooseConic(id)`, `moveTo(x, y)`,
 * `placeNumerators(x, y)`, `chooseDirection(direction | undefined)`, `nudgeSelected(dx, dy)`, `select(boolean)`, `presetCollection()`.
 *
 * Keyboard: the board container is focusable; once P is selected the arrow keys move it 0.2 (Shift: 1); an ideal P turns its direction.
 * Not registered in any route yet.
 */
export interface PolePolarGraphState extends BaseGraphState {
    model: PolePolarModel;
}

const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
};

const VIEW = {xMin: POLE_POLAR_VIEW_BOX[0], xMax: POLE_POLAR_VIEW_BOX[2], yMin: POLE_POLAR_VIEW_BOX[3], yMax: POLE_POLAR_VIEW_BOX[1]} as const;

/** The pieces of a conic in the view as one polyline, broken by NaN (JSXGraph lifts the pen at NaN). */
export function conicPolyline(id: PolePolarConicId): {x: number[]; y: number[]} {
    const out = {x: [] as number[], y: [] as number[]};
    for (const piece of sampleConic(POLE_POLAR_CONICS[id], VIEW).pieces) {
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
    readonly p: JXG.Point;
    readonly all: readonly JXG.GeometryElement[];
}

/** Line coefficients `[c, a, b]` for JSXGraph from exact or numerical coefficients of `ax + by + c = 0`. */
const lineCoefficients = (a: number, b: number, c: number): [number, number, number] | undefined => a === 0 && b === 0 ? undefined : [c, a, b];

/** Placeholder for a line that is absent or at infinity; such a line is hidden, never drawn. */
const HIDDEN_LINE: [number, number, number] = [1, 0, 1];

export class PolePolarGraph extends BaseGraph<PolePolarGraphState, PolePolarModel> {
    private drawn?: DrawnScene;
    private inDragSnap = false;
    private selected = false;
    private nudged = false;
    private sceneCache?: {readonly model: PolePolarModel; readonly scene: PolePolarScene};
    private readonly polylines = new Map<PolePolarConicId, {x: number[]; y: number[]}>();

    get model(): PolePolarModel {
        return this.state.model;
    }

    get pSelected(): boolean {
        return this.selected;
    }

    /** The exact scene of the current model, computed once per model object. */
    scene(): PolePolarScene {
        const model = this.model;
        if (this.sceneCache?.model !== model) this.sceneCache = {model, scene: evaluatePolePolar(model)};
        return this.sceneCache.scene;
    }

    override getInitialState(): PolePolarGraphState {
        return {initialized: false, model: DEFAULT_POLE_POLAR_MODEL};
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    private commit(next: PolePolarModel): boolean {
        if (next === this.model) return false;
        this.setState({model: next});
        this.requestRender();
        return true;
    }

    moveTo(x: number, y: number): boolean {
        return this.commit(moveP(this.model, {x, y}));
    }

    placeNumerators(x: number, y: number): boolean {
        return this.commit(setNumerators(this.model, {x, y}));
    }

    chooseConic(id: PolePolarConicId): boolean {
        return this.commit(setConic(this.model, id));
    }

    chooseDirection(direction: PolePolarDirection | undefined): boolean {
        return this.commit(setDirection(this.model, direction));
    }

    nudgeSelected(dx: number, dy: number): boolean {
        const moved = this.selected && this.commit(nudgeP(this.model, dx, dy));
        if (moved) this.nudged = true;
        return moved;
    }

    loadExample(id: PolePolarExampleId): void {
        this.loadModel(POLE_POLAR_EXAMPLES[id]);
    }

    /** Replaces the whole model (an example or an import checked by `parsePolePolarModel`). */
    loadModel(model: PolePolarModel): void {
        this.selected = false;
        this.nudged = false;
        this.setState({model: serializePolePolarModel(model)});
        this.requestRender();
    }

    select(selected: boolean): void {
        this.selected = selected;
        this.nudged = false;
        // Arrow keys only work while the board has focus, so selecting P from the inspector hands the focus over.
        if (selected && this.hasBoard) this.board.containerObj.focus({preventScroll: true});
        this.requestRender();
        this.boardUpdate();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PolePolarModel> {
        return polePolarPresetCollection();
    }

    defaultPreset(): PolePolarModel {
        return serializePolePolarModel(DEFAULT_POLE_POLAR_MODEL);
    }

    override exportPresetData(): PolePolarModel {
        return serializePolePolarModel(this.model);
    }

    /** An import or Reset replaces the model; the selection and the last nudge announcement belong to the old one and are cleared. */
    override importPresetData(data: PolePolarModel): void {
        this.selected = false;
        this.nudged = false;
        this.setState({model: serializePolePolarModel(data)});
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PolePolarGraphState {
        return {...super.figurePresetGraphState(graphState), model: this.model};
    }

    protected override lessonDefaultState(): PolePolarGraphState {
        return {...this.getInitialState(), initialized: true, model: this.model};
    }

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), polePolarSelected: this.selected};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.selected = saved?.polePolarSelected === true;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        // JSXGraph writes an empty aria-label of its own on the container, so the host's value is read before it is created.
        const hadLabel = container.getAttribute("aria-label");
        super.createMainView(session, container);
        this.board.setBoundingBox([...POLE_POLAR_VIEW_BOX], true);
        this.bindInteraction(session, container, hadLabel);
    }

    /** Every listener and attribute set here is undone by the session cleanup. */
    private bindInteraction(session: GraphSession, container: HTMLElement, hadLabel: string | null): void {
        const hadTabIndex = container.getAttribute("tabindex");
        container.setAttribute("tabindex", "0");
        const label = () => container.setAttribute("aria-label", t("projective_k3_board_label"));
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
        if (step && this.selected) {
            event.preventDefault();
            // Shift: a whole unit (five steps of 0.2) for a finite P.
            const k = event.shiftKey && this.model.ideal === undefined ? POLE_POLAR_DENOMINATOR : 1;
            this.nudgeSelected(step[0] * k, step[1] * k);
        }
    };

    private dragP(point: JXG.Point): void {
        if (this.inDragSnap || this.graphInteractionLocked) return;
        const next = moveP(this.model, {x: point.X(), y: point.Y()});
        const tx = next.p.x / POLE_POLAR_DENOMINATOR;
        const ty = next.p.y / POLE_POLAR_DENOMINATOR;
        this.inDragSnap = true;
        try {
            if (point.X() !== tx || point.Y() !== ty) point.moveTo([tx, ty], 0);
        } finally {
            this.inDragSnap = false;
        }
        this.selected = true;
        this.commit(next);
    }

    override initialize(): void {
        this.syncScene();
    }

    protected override onStateChange(previous: Readonly<PolePolarGraphState>): void {
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

    /** Creates the board once, then only moves P: every other object reads the exact scene through functions. */
    private syncScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        if (this.drawn === undefined || !this.drawnObjectsAlive()) {
            this.removeDrawn();
            this.drawn = this.createDrawn();
        } else {
            const x = this.model.p.x / POLE_POLAR_DENOMINATOR;
            const y = this.model.p.y / POLE_POLAR_DENOMINATOR;
            if (this.drawn.p.X() !== x || this.drawn.p.Y() !== y) this.drawn.p.moveTo([x, y], 0);
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

    private polyline(id: PolePolarConicId): {x: number[]; y: number[]} {
        let line = this.polylines.get(id);
        if (line === undefined) {
            line = conicPolyline(id);
            this.polylines.set(id, line);
        }
        return line;
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
        const finiteP = () => !model().ideal;
        const label = {strokeColor: GraphPalette.label};

        // The conic, drawn from the sampler; the hyperbola's two branches are one polyline broken by NaN.
        const curve = add(board.create("curve", [[], []], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth, highlight: false, fixed: true, layer: 4,
        }) as unknown as JXG.GeometryElement) as unknown as FillCurve & JXG.GeometryElement;
        curve.updateDataArray = () => {
            const data = this.polyline(model().conic);
            curve.dataX = data.x;
            curve.dataY = data.y;
        };

        // The polar and the tangents are lines given by exact (or, for irrational tangency, numerical) coefficients.
        const polarCoefficients = (): [number, number, number] => {
            const l = this.scene().polar;
            return (l && lineCoefficients(Number(l[0]), Number(l[1]), Number(l[2]))) ?? HIDDEN_LINE;
        };
        add(board.create("line", [() => polarCoefficients()[0], () => polarCoefficients()[1], () => polarCoefficients()[2]], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth: () => this.displaySettings.strokeWidth, highlight: false, fixed: true, layer: 4,
            name: "p", withLabel: true, label: {...label, offset: [-24, 10]}, visible: () => { const l = this.scene().polar; return l !== undefined && !isLineAtInfinity(l); },
        }) as JXG.GeometryElement);

        const tangentCoefficients = (i: number): [number, number, number] => {
            const line = this.scene().tangents[i];
            if (line === undefined) return HIDDEN_LINE;
            return (line.exact
                ? lineCoefficients(Number(line.line[0]), Number(line.line[1]), Number(line.line[2]))
                : lineCoefficients(line.coefficients[0], line.coefficients[1], line.coefficients[2])) ?? HIDDEN_LINE;
        };
        for (let i = 0; i < 2; i++) {
            add(board.create("line", [() => tangentCoefficients(i)[0], () => tangentCoefficients(i)[1], () => tangentCoefficients(i)[2]], {
                strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5, dash: 2, highlight: false, fixed: true, layer: 3,
                name: TANGENT_NAMES[i], withLabel: true, label: {...label, offset: [10, -10]},
                visible: () => {
                    const line = this.scene().tangents[i];
                    return this.scene().side === "outside" && line !== undefined && !(line.exact && isLineAtInfinity(line.line));
                },
            }) as JXG.GeometryElement);
            const tangencyAt = (axis: 0 | 1): number => {
                const found = this.scene().tangency[i];
                if (found === undefined) return 0;
                if (!found.exact) return found.approx.kind === "finite" ? (axis === 0 ? found.approx.x : found.approx.y) : 0;
                return found.view.kind === "finite" ? (axis === 0 ? found.view.view.x : found.view.view.y) : 0;
            };
            add(board.create("point", [() => tangencyAt(0), () => tangencyAt(1)], {
                name: TANGENCY_NAMES[i], withLabel: true, size: 4, face: "o", fixed: true, showInfobox: false,
                fillColor: GraphPalette.derivedPoint, strokeColor: GraphPalette.pointOutline, highlight: false, layer: 6,
                label: {...label, offset: [8, -12]},
                visible: () => {
                    const found = this.scene().tangency[i];
                    return found !== undefined && (found.exact ? found.view.kind === "finite" : found.approx.kind === "finite");
                },
            }) as JXG.Point);
        }

        // The centre: the pole of the line at infinity; for a parabola it is ideal and nothing finite is drawn.
        const centreAt = (axis: 0 | 1): number => {
            const centre = this.scene().centre;
            return centre?.kind === "finite" ? (axis === 0 ? centre.view.x : centre.view.y) : 0;
        };
        add(board.create("point", [() => centreAt(0), () => centreAt(1)], {
            name: "S", withLabel: true, size: 3, face: "+", fixed: true, showInfobox: false,
            fillColor: GraphPalette.derivedPoint, strokeColor: GraphPalette.pointOutline, highlight: false, layer: 5,
            label: {...label, offset: [8, 8]}, visible: () => this.scene().centre?.kind === "finite",
        }) as JXG.Point);

        // P: a draggable handle while it is finite.
        const at = model();
        const p = add(board.create("point", [at.p.x / POLE_POLAR_DENOMINATOR, at.p.y / POLE_POLAR_DENOMINATOR], {
            name: "P", withLabel: true, size: () => this.selected ? 7 : 5, face: "o", showInfobox: false,
            fillColor: () => this.selected ? GraphPalette.selectedControlPoint : GraphPalette.controlPoint,
            strokeColor: () => this.selected ? GraphPalette.selectedControlPointOutline : GraphPalette.pointOutline,
            strokeWidth: () => this.selected ? 3 : 1, highlightFillColor: GraphPalette.selectedControlPoint,
            label: {...label, offset: [8, 8]}, layer: 7, visible: finiteP,
        }) as JXG.Point);
        p.on("down", () => {
            this.selected = true;
            this.requestRender();
            this.board.containerObj.focus({preventScroll: true});
        });
        p.on("drag", () => this.dragP(p));

        // An ideal P has a direction only: an arrow from the origin along it, with its own text.
        const marker = () => {
            const ideal = model().ideal;
            if (!ideal) return undefined;
            const unit = orientedUnit([BigInt(ideal.dx), BigInt(ideal.dy)], [ideal.dx, ideal.dy]);
            return unit ? idealMarker([0, 0], unit, 6, 1.6) : undefined;
        };
        const hidden = (x: () => number, y: () => number) => add(board.create("point", [x, y], {
            visible: false, fixed: true, withLabel: false, showInfobox: false, name: "",
        }) as JXG.Point);
        const from = hidden(() => marker()?.from[0] ?? 0, () => marker()?.from[1] ?? 0);
        const to = hidden(() => marker()?.to[0] ?? 0, () => marker()?.to[1] ?? 0);
        add(board.create("segment", [from, to], {
            strokeColor: GraphPalette.warningText, strokeWidth: 3, lastArrow: {type: 2, size: 8}, highlight: false, fixed: true, layer: 8,
            visible: () => marker() !== undefined,
        }) as JXG.GeometryElement);
        add(board.create("text", [() => marker()?.to[0] ?? 0, () => (marker()?.to[1] ?? 0) + 0.4, "P = ∞"], {
            fixed: true, highlight: false, strokeColor: GraphPalette.warningText, layer: 8, visible: () => marker() !== undefined,
        }) as JXG.GeometryElement);

        // The polar, tangents and centre are sentences and live only in the inspector (they would cross the hyperbola here).
        return {p, all};
    }

    /** The board removes every scene object during a Preset replacement; drop the references so the next sync rebuilds. */
    protected override disposeFigureScene(): void {
        this.drawn = undefined;
    }

    override unmount(): void {
        this.removeDrawn();
        super.unmount();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <PolePolarControls model={this.model} scene={this.scene()} selected={this.selected} nudged={this.nudged} actions={{
            loadExample: id => this.loadExample(id),
            setConic: id => {this.chooseConic(id);},
            place: (x, y) => {this.placeNumerators(x, y);},
            setDirection: direction => {this.chooseDirection(direction);},
            select: selected => this.select(selected),
        }}/>;
    }
}
