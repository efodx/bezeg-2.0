import React from "react";
import BaseGraph, {BaseGraphState, TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {sampleConic} from "../../projective/conicSampler";
import {Hom, toAffine} from "../../projective/homogeneous";
import {
    DEFAULT_PASCAL_MODEL, isLineAtInfinity, PASCAL_CONICS, PASCAL_EXAMPLES, PASCAL_HANDLE_COUNT, PASCAL_ORDERS, PASCAL_VIEW_BOX, PascalConicId,
    PascalExampleId, PascalModel, PascalOrderId, PascalScene, evaluatePascal, serializePascalModel,
} from "./pascalModel";
import {dragHandle, SHIFT_STEP, setConic, setOrder, stepHandle} from "./pascalEdit";
import {PascalControls} from "./PascalControls";
import {definingPoints} from "./definingPoints";
import {PASCAL_POINT_NAMES, SIDE_NAMES} from "./pascalText";
import {idealMarker, orientedUnit} from "./idealMarker";
import {pascalPresetCollection} from "./projectivePresetCollection";

/**
 * The Pascal and Pappus graph (K2 of projective-conics-lessons, ADR 0033). One of four fixed conics, six handles that move only
 * along the exact direction table (each handle is stored as a table index), the hexagon sides, the three intersections of opposite
 * sides and the line through them. The scene store holds the integer `PascalModel`; the board is a function of it, and every readout
 * is exact (projective kernel, bigint determinant) and also text. A conic is drawn from `sampleConic`.
 *
 * Public interface: `model`, `scene()`, `selectedHandle`, `loadExample(id)`, `loadModel(model)`, `chooseConic(id)`, `chooseOrder(id)`,
 * `stepHandle(handle, steps)`, `dragHandleTo(handle, x, y)`, `select(handle | undefined)`, `nudgeSelected(steps)`, `presetCollection()`.
 *
 * Keyboard: the board container is focusable; once a point is selected the arrow keys step it one position (Shift: five).
 * Not registered in any route yet.
 */
export interface PascalGraphState extends BaseGraphState {
    model: PascalModel;
}

/** Arrow keys: right and up step forward along the direction table, left and down back. */
const ARROW_STEPS: Readonly<Record<string, number>> = {ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1};

const VIEW = {xMin: PASCAL_VIEW_BOX[0], xMax: PASCAL_VIEW_BOX[2], yMin: PASCAL_VIEW_BOX[3], yMax: PASCAL_VIEW_BOX[1]} as const;

/** The pieces of a conic in the view as one polyline, broken by NaN (JSXGraph lifts the pen at NaN). */
export function conicPolyline(id: PascalConicId): {x: number[]; y: number[]} {
    const out = {x: [] as number[], y: [] as number[]};
    for (const piece of sampleConic(PASCAL_CONICS[id].conic, VIEW).pieces) {
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
    readonly conic: PascalConicId;
    readonly handles: readonly JXG.Point[];
    readonly all: readonly JXG.GeometryElement[];
}

/** Line coefficients `[c, a, b]` for JSXGraph from a homogeneous line `ax + by + c = 0`; undefined for the line at infinity. */
const lineCoefficients = (line: Hom | undefined): [number, number, number] | undefined =>
    line === undefined || isLineAtInfinity(line) ? undefined : [Number(line[2]), Number(line[0]), Number(line[1])];

/** Placeholder for a line that is absent or at infinity; such a line is hidden, never drawn. */
const HIDDEN_LINE: [number, number, number] = [1, 0, 1];

const FACES = ["[]", "<>", "^"] as const;
const DASHES = [0, 2, 4] as const;

export class PascalGraph extends BaseGraph<PascalGraphState, PascalModel> {
    private drawn?: DrawnScene;
    private inDragSnap = false;
    private selected: number | undefined;
    private nudged: number | undefined;
    private sceneCache?: {readonly model: PascalModel; readonly scene: PascalScene};
    private readonly polylines = new Map<PascalConicId, {x: number[]; y: number[]}>();

    get model(): PascalModel {
        return this.state.model;
    }

    get selectedHandle(): number | undefined {
        return this.selected;
    }

    /** The exact scene of the current model, computed once per model object. */
    scene(): PascalScene {
        const model = this.model;
        if (this.sceneCache?.model !== model) this.sceneCache = {model, scene: evaluatePascal(model)};
        return this.sceneCache.scene;
    }

    override getInitialState(): PascalGraphState {
        return {initialized: false, model: DEFAULT_PASCAL_MODEL};
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    private commit(next: PascalModel): boolean {
        if (next === this.model) return false;
        this.setState({model: next});
        this.requestRender();
        return true;
    }

    stepHandle(handle: number, steps: number): boolean {
        return this.commit(stepHandle(this.model, handle, steps));
    }

    dragHandleTo(handle: number, x: number, y: number): boolean {
        return this.commit(dragHandle(this.model, handle, {x, y}));
    }

    chooseConic(id: PascalConicId): boolean {
        const changed = this.commit(setConic(this.model, id));
        if (changed) this.nudged = undefined;
        return changed;
    }

    chooseOrder(id: PascalOrderId): boolean {
        return this.commit(setOrder(this.model, PASCAL_ORDERS[id]));
    }

    nudgeSelected(steps: number): boolean {
        const handle = this.selected;
        const moved = handle !== undefined && this.commit(stepHandle(this.model, handle, steps));
        if (moved) this.nudged = handle;
        return moved;
    }

    loadExample(id: PascalExampleId): void {
        this.loadModel(PASCAL_EXAMPLES[id]);
    }

    /** Replaces the whole model (an example or an import checked by `parsePascalModel`). */
    loadModel(model: PascalModel): void {
        this.selected = undefined;
        this.nudged = undefined;
        this.setState({model: serializePascalModel(model)});
        this.requestRender();
    }

    select(handle: number | undefined): void {
        this.selected = handle;
        this.nudged = undefined;
        // Arrow keys only work while the board has focus, so selecting a point from the inspector hands the focus over.
        if (handle !== undefined && this.hasBoard) this.board.containerObj.focus({preventScroll: true});
        this.requestRender();
        this.boardUpdate();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<PascalModel> {
        return pascalPresetCollection();
    }

    defaultPreset(): PascalModel {
        return serializePascalModel(DEFAULT_PASCAL_MODEL);
    }

    override exportPresetData(): PascalModel {
        return serializePascalModel(this.model);
    }

    /** An import or Reset replaces the model; the selection and the last nudge announcement belong to the old one and are cleared. */
    override importPresetData(data: PascalModel): void {
        this.selected = undefined;
        this.nudged = undefined;
        this.setState({model: serializePascalModel(data)});
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): PascalGraphState {
        return {...super.figurePresetGraphState(graphState), model: this.model};
    }

    protected override lessonDefaultState(): PascalGraphState {
        return {...this.getInitialState(), initialized: true, model: this.model};
    }

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), pascalSelected: this.selected ?? -1};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const handle = saved?.pascalSelected;
        this.selected = typeof handle === "number" && Number.isInteger(handle) && handle >= 0 && handle < PASCAL_HANDLE_COUNT ? handle : undefined;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        // JSXGraph writes an empty aria-label of its own on the container, so the host's value is read before it is created.
        const hadLabel = container.getAttribute("aria-label");
        super.createMainView(session, container);
        this.board.setBoundingBox([...PASCAL_VIEW_BOX], true);
        this.bindInteraction(session, container, hadLabel);
    }

    /** Every listener and attribute set here is undone by the session cleanup. */
    private bindInteraction(session: GraphSession, container: HTMLElement, hadLabel: string | null): void {
        const hadTabIndex = container.getAttribute("tabindex");
        container.setAttribute("tabindex", "0");
        const label = () => container.setAttribute("aria-label", t("projective_k2_board_label"));
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
        if (step !== undefined && this.selected !== undefined) {
            event.preventDefault();
            this.nudgeSelected(step * (event.shiftKey ? SHIFT_STEP : 1));
        }
    };

    private dragPoint(handle: number, point: JXG.Point): void {
        if (this.inDragSnap || this.graphInteractionLocked) return;
        const next = dragHandle(this.model, handle, {x: point.X(), y: point.Y()});
        const target = toAffine(evaluatePascal(next).handles[handle]);
        this.inDragSnap = true;
        try {
            if (target.kind === "finite" && (point.X() !== target.view.x || point.Y() !== target.view.y)) point.moveTo([target.view.x, target.view.y], 0);
        } finally {
            this.inDragSnap = false;
        }
        this.selected = handle;
        this.commit(next);
    }

    override initialize(): void {
        this.syncScene();
    }

    protected override onStateChange(previous: Readonly<PascalGraphState>): void {
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

    /** Creates the board once per conic, then only moves the handles: every other object reads the exact scene through functions. */
    private syncScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        if (this.drawn === undefined || this.drawn.conic !== this.model.conic || !this.drawnObjectsAlive()) {
            this.removeDrawn();
            this.drawn = this.createDrawn();
        } else {
            const handles = this.scene().handles;
            this.drawn.handles.forEach((point, i) => {
                const at = toAffine(handles[i]);
                if (at.kind === "finite" && (point.X() !== at.view.x || point.Y() !== at.view.y)) point.moveTo([at.view.x, at.view.y], 0);
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

    private polyline(id: PascalConicId): {x: number[]; y: number[]} {
        let line = this.polylines.get(id);
        if (line === undefined) {
            line = conicPolyline(id);
            this.polylines.set(id, line);
        }
        return line;
    }

    private createDrawn(): DrawnScene {
        const board = this.board;
        const conicId = this.model.conic;
        const names = PASCAL_CONICS[conicId].names;
        const all: JXG.GeometryElement[] = [];
        const add = <E extends JXG.GeometryElement>(element: E): E => {
            all.push(element);
            // A line given by coefficients creates two anonymous defining points on the board; they belong to the scene and go with it.
            definingPoints(element).forEach(helper => { if (!all.includes(helper)) all.push(helper); });
            return element;
        };
        const label = {strokeColor: GraphPalette.label};
        const lineOptions = {highlight: false, fixed: true, withLabel: true} as const;

        // The conic, drawn from the sampler; a hyperbola's branches and a line pair's lines are one polyline broken by NaN.
        const curve = add(board.create("curve", [[], []], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth, highlight: false, fixed: true, layer: 4,
        }) as unknown as JXG.GeometryElement) as unknown as FillCurve & JXG.GeometryElement;
        curve.updateDataArray = () => {
            const data = this.polyline(conicId);
            curve.dataX = data.x;
            curve.dataY = data.y;
        };

        // The six sides of the hexagon: lines through two vertices, dashed by opposite pair. A side between coinciding vertices is hidden.
        for (let i = 0; i < 6; i++) {
            const coefficients = (): [number, number, number] => lineCoefficients(this.scene().sides[i]) ?? HIDDEN_LINE;
            add(board.create("line", [() => coefficients()[0], () => coefficients()[1], () => coefficients()[2]], {
                ...lineOptions, strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5, dash: DASHES[i % 3], layer: 3,
                name: SIDE_NAMES[i], label: {...label, offset: [10 + 6 * i, -10 - 5 * i]},
                visible: () => lineCoefficients(this.scene().sides[i]) !== undefined,
            }) as JXG.GeometryElement);
        }

        // The Pascal line: absent unless the points are collinear, and never drawn when it is the line at infinity.
        const pascalLine = (): Hom | undefined => {
            const result = this.scene().result;
            return result.status === "ok" && result.line !== null ? result.line : undefined;
        };
        const lineAt = (): [number, number, number] => lineCoefficients(pascalLine()) ?? HIDDEN_LINE;
        add(board.create("line", [() => lineAt()[0], () => lineAt()[1], () => lineAt()[2]], {
            ...lineOptions, strokeColor: GraphPalette.comparisonCurve, strokeWidth: () => this.displaySettings.strokeWidth, layer: 4,
            name: "p", label: {...label, offset: [-24, 10]}, visible: () => lineCoefficients(pascalLine()) !== undefined,
        }) as JXG.GeometryElement);

        // The three Pascal points: finite and inside the view they are markers, ideal ones are arrows below, others are text only.
        for (let i = 0; i < 3; i++) {
            const view = () => this.scene().pascalPoints[i]?.view;
            const at = (axis: "x" | "y"): number => {
                const found = view();
                return found?.kind === "finite" ? found.view[axis] : 0;
            };
            add(board.create("point", [() => at("x"), () => at("y")], {
                name: PASCAL_POINT_NAMES[i], withLabel: true, size: 5, face: FACES[i], fixed: true, showInfobox: false,
                fillColor: GraphPalette.derivedPoint, strokeColor: GraphPalette.pointOutline, highlight: false, layer: 6,
                label: {...label, offset: [8, -12]},
                visible: () => { const found = this.scene().pascalPoints[i]; return found !== undefined && found.view.kind === "finite" && !found.offBox; },
            }) as JXG.Point);

            // An ideal point has a direction only: an arrow from the origin along it, at its own distance, with its own name.
            const marker = () => {
                const found = view();
                if (found?.kind !== "ideal") return undefined;
                const unit = orientedUnit(found.direction, [Number(found.direction[0]), Number(found.direction[1])]);
                return unit ? idealMarker([0, 0], unit, 5 + 1.3 * i, 1) : undefined;
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
            add(board.create("text", [() => (marker()?.to[0] ?? 0) + 0.2, () => (marker()?.to[1] ?? 0) + 0.3, `${PASCAL_POINT_NAMES[i]} = ∞`], {
                fixed: true, highlight: false, strokeColor: GraphPalette.warningText, layer: 8, visible: () => marker() !== undefined,
            }) as JXG.GeometryElement);
        }

        // The six handles, labelled A to F (A₁ to B₃ on a line pair). Dragging snaps to the nearest table direction.
        const handles = names.map((name, handle) => {
            const start = toAffine(this.scene().handles[handle]);
            const point = add(board.create("point", [start.kind === "finite" ? start.view.x : 0, start.kind === "finite" ? start.view.y : 0], {
                name, withLabel: true, size: () => this.selected === handle ? 7 : 5, face: "o", showInfobox: false,
                fillColor: () => this.selected === handle ? GraphPalette.selectedControlPoint : GraphPalette.controlPoint,
                strokeColor: () => this.selected === handle ? GraphPalette.selectedControlPointOutline : GraphPalette.pointOutline,
                strokeWidth: () => this.selected === handle ? 3 : 1, highlightFillColor: GraphPalette.selectedControlPoint,
                label: {...label, offset: [8, 8]}, layer: 7,
            }) as JXG.Point);
            point.on("down", () => {
                this.selected = handle;
                this.requestRender();
                this.board.containerObj.focus({preventScroll: true});
            });
            point.on("drag", () => this.dragPoint(handle, point));
            return point;
        });

        // The status, determinant and intersections are sentences and live only in the inspector (they would cross the conic here).
        return {conic: conicId, handles, all};
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
        return <PascalControls model={this.model} scene={this.scene()} selected={this.selected} nudged={this.nudged} actions={{
            loadExample: id => this.loadExample(id),
            setConic: id => {this.chooseConic(id);},
            setOrder: id => {this.chooseOrder(id);},
            select: handle => this.select(handle),
            step: (handle, steps) => {this.stepHandle(handle, steps);},
        }}/>;
    }
}
