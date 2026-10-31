import React from "react";
import BaseGraph, {BaseGraphState, TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PresetCollection} from "../base/presets/PresetCollection";
import {GraphPalette} from "../styles/GraphPalette";
import {
    CROSS_RATIO_EXAMPLES, CROSS_RATIO_VIEW_BOX, CrossRatioExampleId, CrossRatioModel, CrossRatioScene, DEFAULT_CROSS_RATIO_MODEL, evaluateCrossRatio,
    serializeCrossRatioModel,
} from "./crossRatioModel";
import {HANDLE_COUNT, handlePosition, isHandle, moveHandle, nudgeHandle} from "./crossRatioEdit";
import {CrossRatioControls} from "./CrossRatioControls";
import {describeCrossRatio} from "./crossRatioText";
import {idealMarker, orientedUnit} from "./idealMarker";
import {crossRatioPresetCollection} from "./projectivePresetCollection";

/**
 * The cross-ratio graph (K1 of projective-conics-lessons, ADR 0033). Two lines, a centre `O`, four points A-D on the first
 * line `y = 0`, the rays from `O`, and the images on the second line. The scene store holds the integer `CrossRatioModel`;
 * the board is a function of it, and every readout is exact (projective kernel) and also text.
 *
 * Public interface: `model`, `scene()`, `selectedHandle`, `loadExample(id)`, `loadModel(model)`, `moveHandleTo(handle, x, y)`,
 * `nudgeSelected(dx, dy)`, `select(handle | undefined)`, `presetCollection()`. Handles 0-3 are A-D, 4 is O, 5-6 are M and N
 * (they fix the second line). An image at infinity is drawn as an arrow along its direction, never as a far finite point.
 *
 * Keyboard: the board container is focusable; arrow keys move the selected handle one grid step (A-D only along the line).
 * The inspector selects handles and places them with numeric fields. Not registered in any route yet.
 */
export interface CrossRatioGraphState extends BaseGraphState {
    model: CrossRatioModel;
}

const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
};

/** Distance along a ray beyond the centre at which a ray to an ideal image is cut off. */
const IDEAL_RAY_LENGTH = 14;
const NAMES = ["A", "B", "C", "D"] as const;

interface DrawnScene {
    readonly handles: readonly JXG.Point[];
    readonly all: readonly JXG.GeometryElement[];
}

export class CrossRatioGraph extends BaseGraph<CrossRatioGraphState, CrossRatioModel> {
    private drawn?: DrawnScene;
    private inDragSnap = false;
    private selected?: number;
    private nudged?: number;
    private sceneCache?: {readonly model: CrossRatioModel; readonly scene: CrossRatioScene};

    get model(): CrossRatioModel {
        return this.state.model;
    }

    get selectedHandle(): number | undefined {
        return this.selected;
    }

    /** The exact scene of the current model, computed once per model object. */
    scene(): CrossRatioScene {
        const model = this.model;
        if (this.sceneCache?.model !== model) this.sceneCache = {model, scene: evaluateCrossRatio(model)};
        return this.sceneCache.scene;
    }

    override getInitialState(): CrossRatioGraphState {
        return {initialized: false, model: DEFAULT_CROSS_RATIO_MODEL};
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    private commit(next: CrossRatioModel): boolean {
        if (next === this.model) return false;
        this.setState({model: next});
        this.requestRender();
        return true;
    }

    moveHandleTo(handle: number, x: number, y: number): boolean {
        return this.commit(moveHandle(this.model, handle, {x, y}));
    }

    nudgeSelected(dx: number, dy: number): boolean {
        const moved = this.selected !== undefined && this.commit(nudgeHandle(this.model, this.selected, dx, dy));
        if (moved) this.nudged = this.selected;
        return moved;
    }

    loadExample(id: CrossRatioExampleId): void {
        this.loadModel(CROSS_RATIO_EXAMPLES[id]);
    }

    /** Replaces the whole model (an example or an import checked by `parseCrossRatioModel`). */
    loadModel(model: CrossRatioModel): void {
        this.selected = undefined;
        this.nudged = undefined;
        this.setState({model: serializeCrossRatioModel(model)});
        this.requestRender();
    }

    select(handle: number | undefined): void {
        this.selected = isHandle(handle) ? handle : undefined;
        this.nudged = undefined;
        // Arrow keys only work while the board has focus, so selecting a handle from the inspector hands the focus over.
        if (this.selected !== undefined && this.hasBoard) this.board.containerObj.focus({preventScroll: true});
        this.requestRender();
        this.boardUpdate();
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<CrossRatioModel> {
        return crossRatioPresetCollection();
    }

    defaultPreset(): CrossRatioModel {
        return serializeCrossRatioModel(DEFAULT_CROSS_RATIO_MODEL);
    }

    override exportPresetData(): CrossRatioModel {
        return serializeCrossRatioModel(this.model);
    }

    /** An import or Reset replaces the model; the selection and the last nudge announcement belong to the old one and are cleared. */
    override importPresetData(data: CrossRatioModel): void {
        this.selected = undefined;
        this.nudged = undefined;
        this.setState({model: serializeCrossRatioModel(data)});
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): CrossRatioGraphState {
        return {...super.figurePresetGraphState(graphState), model: this.model};
    }

    protected override lessonDefaultState(): CrossRatioGraphState {
        return {...this.getInitialState(), initialized: true, model: this.model};
    }

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), crossRatioSelected: this.selected};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const handle = saved?.crossRatioSelected;
        this.selected = isHandle(handle) ? handle : undefined;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        // JSXGraph writes an empty aria-label of its own on the container, so the host's value is read before it is created.
        const hadLabel = container.getAttribute("aria-label");
        super.createMainView(session, container);
        this.board.setBoundingBox([...CROSS_RATIO_VIEW_BOX], true);
        this.bindInteraction(session, container, hadLabel);
    }

    /** Every listener and attribute set here is undone by the session cleanup. */
    private bindInteraction(session: GraphSession, container: HTMLElement, hadLabel: string | null): void {
        const hadTabIndex = container.getAttribute("tabindex");
        container.setAttribute("tabindex", "0");
        const label = () => container.setAttribute("aria-label", t("projective_k1_board_label"));
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
            this.nudgeSelected(step[0], step[1]);
        }
    };

    private dragHandle(handle: number, point: JXG.Point): void {
        if (this.inDragSnap || this.graphInteractionLocked) return;
        const before = this.model;
        const next = moveHandle(before, handle, {x: point.X(), y: point.Y()});
        const target = handlePosition(next, handle);
        this.inDragSnap = true;
        try {
            if (point.X() !== target.x || point.Y() !== target.y) point.moveTo([target.x, target.y], 0);
        } finally {
            this.inDragSnap = false;
        }
        this.selected = handle;
        this.commit(next);
    }

    override initialize(): void {
        this.syncScene();
    }

    protected override onStateChange(previous: Readonly<CrossRatioGraphState>): void {
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

    /** Creates the board once, then only moves the handles: every other object reads the exact scene through functions. */
    private syncScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        if (this.drawn === undefined || !this.drawnObjectsAlive()) {
            this.removeDrawn();
            this.drawn = this.createDrawn();
        } else {
            this.drawn.handles.forEach((handle, i) => {
                const at = handlePosition(this.model, i);
                if (handle.X() !== at.x || handle.Y() !== at.y) handle.moveTo([at.x, at.y], 0);
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

    private createDrawn(): DrawnScene {
        const board = this.board;
        const model = () => this.model;
        const all: JXG.GeometryElement[] = [];
        const add = <E extends JXG.GeometryElement>(element: E): E => {
            all.push(element);
            return element;
        };
        const hidden = (x: () => number, y: () => number) => add(board.create("point", [x, y], {
            visible: false, fixed: true, withLabel: false, showInfobox: false, name: "",
        }) as JXG.Point);
        const defined = () => this.scene().status === "ok";
        const centreAt = () => model().centre;

        // The two lines. The first is fixed at y = 0; the second passes through the draggable M and N.
        const first = [hidden(() => 0, () => 0), hidden(() => 1, () => 0)];
        add(board.create("line", first, {
            straightFirst: true, straightLast: true, strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth,
            highlight: false, fixed: true, layer: 4, name: "p", withLabel: true, label: {strokeColor: GraphPalette.label, offset: [-24, 10]},
        }) as JXG.GeometryElement);

        const handles = Array.from({length: HANDLE_COUNT}, (_, i) => {
            const at = handlePosition(model(), i);
            const names = ["A", "B", "C", "D", "O", "M", "N"];
            const handle = add(board.create("point", [at.x, at.y], {
                name: names[i], withLabel: true, size: () => this.selected === i ? 7 : 5, face: "o", showInfobox: false,
                fillColor: () => this.selected === i ? GraphPalette.selectedControlPoint : GraphPalette.controlPoint,
                strokeColor: () => this.selected === i ? GraphPalette.selectedControlPointOutline : GraphPalette.pointOutline,
                strokeWidth: () => this.selected === i ? 3 : 1, highlightFillColor: GraphPalette.selectedControlPoint,
                label: {offset: [8, 8], strokeColor: GraphPalette.label}, layer: 7,
            }) as JXG.Point);
            handle.on("down", () => {
                this.selected = i;
                this.requestRender();
                this.board.containerObj.focus({preventScroll: true});
            });
            handle.on("drag", () => this.dragHandle(i, handle));
            return handle;
        });
        add(board.create("line", [handles[5], handles[6]], {
            straightFirst: true, straightLast: true, strokeColor: GraphPalette.comparisonCurve, strokeWidth: () => this.displaySettings.strokeWidth,
            highlight: false, fixed: true, layer: 4, name: "p′", withLabel: true, label: {strokeColor: GraphPalette.label, offset: [-24, 10]},
        }) as JXG.GeometryElement);

        // Image i: the finite image, or the end of the ray toward an ideal one; direction unit is oriented along the ray.
        const unitOf = (i: number): readonly [number, number] | undefined => {
            const view = this.scene().imageViews?.[i];
            if (view?.kind !== "ideal") return undefined;
            const original = handlePosition(model(), i);
            return orientedUnit(view.direction, [original.x - centreAt().x, original.y - centreAt().y]);
        };
        const imageAt = (i: number, axis: 0 | 1): number => {
            const view = this.scene().imageViews?.[i];
            if (view?.kind === "finite") return axis === 0 ? view.view.x : view.view.y;
            const unit = unitOf(i);
            const centre = centreAt();
            if (unit) return (axis === 0 ? centre.x : centre.y) + unit[axis] * IDEAL_RAY_LENGTH;
            return axis === 0 ? centre.x : centre.y;
        };
        for (let i = 0; i < 4; i++) {
            const finite = () => defined() && this.scene().imageViews?.[i]?.kind === "finite";
            const end = hidden(() => imageAt(i, 0), () => imageAt(i, 1));
            add(board.create("segment", [handles[4], end], {
                strokeColor: GraphPalette.constructionAccent, strokeWidth: 1, dash: 2, highlight: false, fixed: true, layer: 3,
                visible: () => defined() || this.scene().status === "coincident-points",
            }) as JXG.GeometryElement);
            add(board.create("point", [() => imageAt(i, 0), () => imageAt(i, 1)], {
                name: `${NAMES[i]}′`, withLabel: true, size: 4, face: "o", fixed: true, showInfobox: false,
                fillColor: GraphPalette.derivedPoint, strokeColor: GraphPalette.pointOutline, highlight: false, layer: 6,
                label: {offset: [8, -12], strokeColor: GraphPalette.label},
                visible: finite,
            }) as JXG.Point);
        }

        // The point at infinity: an arrow along the direction on the second line, with its own text label.
        const marker = () => {
            const index = this.scene().idealIndex;
            const unit = index === undefined ? undefined : unitOf(index);
            const anchor: readonly [number, number] = [model().line2[0].x, model().line2[0].y];
            return unit ? idealMarker(anchor, unit) : undefined;
        };
        const from = hidden(() => marker()?.from[0] ?? 0, () => marker()?.from[1] ?? 0);
        const to = hidden(() => marker()?.to[0] ?? 0, () => marker()?.to[1] ?? 0);
        add(board.create("segment", [from, to], {
            strokeColor: GraphPalette.warningText, strokeWidth: 3, lastArrow: {type: 2, size: 8}, highlight: false, fixed: true, layer: 8,
            visible: () => marker() !== undefined,
        }) as JXG.GeometryElement);
        add(board.create("text", [() => marker()?.to[0] ?? 0, () => (marker()?.to[1] ?? 0) + 0.4, () => {
            const index = this.scene().idealIndex;
            return index === undefined ? "" : `${NAMES[index]}′ = ∞`;
        }], {fixed: true, highlight: false, strokeColor: GraphPalette.warningText, layer: 8, visible: () => marker() !== undefined}) as JXG.GeometryElement);

        // Text on the board: status and the exact cross-ratio, rebuilt from the scene and the language on every update.
        const readout = () => describeCrossRatio(this.scene(), t, currentLanguage());
        add(board.create("text", [-13.6, 8.3, () => readout().originalRatio ?? readout().status], {
            fixed: true, highlight: false, strokeColor: GraphPalette.label, anchorX: "left", layer: 9,
        }) as JXG.GeometryElement);
        add(board.create("text", [-13.6, 7.5, () => (readout().originalRatio ? readout().imageRatio ?? "" : "")], {
            fixed: true, highlight: false, strokeColor: GraphPalette.label, anchorX: "left", layer: 9,
        }) as JXG.GeometryElement);
        add(board.create("text", [-13.6, 6.7, () => readout().limit ?? ""], {
            fixed: true, highlight: false, strokeColor: GraphPalette.warningText, anchorX: "left", layer: 9,
        }) as JXG.GeometryElement);
        return {handles, all};
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
        return <CrossRatioControls model={this.model} scene={this.scene()} selected={this.selected} nudged={this.nudged} actions={{
            loadExample: id => this.loadExample(id),
            select: handle => this.select(handle),
            move: (handle, x, y) => {this.moveHandleTo(handle, x, y);},
        }}/>;
    }
}
