import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {
    THREE_VIEWS_ANGLE_STEPS, THREE_VIEWS_LIMIT, THREE_VIEWS_TENTHS,
    DEFAULT_THREE_VIEWS_MODEL, directionAnchor, directionSegments, evaluateThreeViews, IMAGE_CENTRE, imagePolyline, PANEL_HALF_HEIGHT, PANEL_HALF_WIDTH,
    serializeThreeViewsModel, SOURCE_CENTRE, SOURCE_SCALE, THREE_VIEWS_VIEW_BOX, ThreeViewsModel, ThreeViewsScene, windowExit,
} from "./threeViewsModel";
import {nudgeC, setAngle, setC, setPointOn} from "./threeViewsEdit";
import {ThreeViewsControls} from "./ThreeViewsControls";
import {describeThreeViews} from "./threeViewsText";
import {threeViewsPresetCollection} from "./projectivePresetCollection";

/**
 * The "one conic, three views" graph (K5 of projective-conics-lessons, ADR 0033), two panels on one board: the source plane on the
 * left (the unit circle, the line L: y = c and an optional point P on the circle, drawn at scale 2) and the image plane on the right
 * (the image conic from `sampleConic`, the asymptote directions and the image of P, at scale 1). The state is the integer
 * `ThreeViewsModel` (c in tenths, the optional point by a step of 15 degrees); every drawn object reads the exact scene through
 * functions, so the board is created once. Not registered in any route yet.
 *
 * Public interface: `model`, `scene()`, `setCTenths(k)`, `nudgeCTenths(steps)`, `togglePoint(on)`, `placePoint(step)`, `loadModel(model)`,
 * `presetCollection()`.
 *
 * Keyboard: the board container is focusable; the arrow keys change c by 0.1 (Shift: 1).
 */
export interface ThreeViewsGraphState extends BaseGraphState {
    model: ThreeViewsModel;
}

const STEPS: Readonly<Record<string, number>> = {ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1};
const TENTHS_PER_UNIT = 10;
const CIRCLE_SAMPLES = 120;

const sourceX = (x: number): number => SOURCE_CENTRE + SOURCE_SCALE * x;
const sourceY = (y: number): number => SOURCE_SCALE * y;
const imageX = (x: number): number => IMAGE_CENTRE + x;

const frame = (centre: number): {x: number[]; y: number[]} => ({
    x: [centre - PANEL_HALF_WIDTH, centre + PANEL_HALF_WIDTH, centre + PANEL_HALF_WIDTH, centre - PANEL_HALF_WIDTH, centre - PANEL_HALF_WIDTH],
    y: [-PANEL_HALF_HEIGHT, -PANEL_HALF_HEIGHT, PANEL_HALF_HEIGHT, PANEL_HALF_HEIGHT, -PANEL_HALF_HEIGHT],
});

interface FillCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}

interface DrawnScene {
    readonly all: readonly JXG.GeometryElement[];
}

export class ThreeViewsGraph extends BaseGraph<ThreeViewsGraphState, ThreeViewsModel> {
    private drawn?: DrawnScene;
    private sceneCache?: {readonly model: ThreeViewsModel; readonly scene: ThreeViewsScene};
    private polylineCache?: {readonly key: string; readonly value: {x: number[]; y: number[]}};

    get model(): ThreeViewsModel {
        return this.state.model;
    }

    /** The exact scene of the current model, computed once per model object. */
    scene(): ThreeViewsScene {
        const model = this.model;
        if (this.sceneCache?.model !== model) this.sceneCache = {model, scene: evaluateThreeViews(model)};
        return this.sceneCache.scene;
    }

    override getInitialState(): ThreeViewsGraphState {
        return {initialized: false, model: DEFAULT_THREE_VIEWS_MODEL};
    }

    // ---- Edits ---------------------------------------------------------------------------------------------------

    private commit(next: ThreeViewsModel): boolean {
        if (next === this.model) return false;
        this.setState({model: next});
        this.requestRender();
        return true;
    }

    setCTenths(tenths: number): boolean {
        return this.commit(setC(this.model, tenths));
    }

    nudgeCTenths(steps: number): boolean {
        return this.commit(nudgeC(this.model, steps));
    }

    togglePoint(on: boolean): boolean {
        return this.commit(setPointOn(this.model, on));
    }

    placePoint(step: number): boolean {
        return this.commit(setAngle(this.model, step));
    }

    /** Replaces the whole model (an import checked by `parseThreeViewsModel`). */
    loadModel(model: ThreeViewsModel): void {
        this.setState({model: serializeThreeViewsModel(model)});
        this.requestRender();
    }

    /**
     * Lesson actions (`projective`, the `three-views-*` operations): each is the matching control action. Values are checked strictly (a
     * lesson-content error throws, nothing is clamped, rounded or wrapped, as the controls do), then the control's own graph method runs.
     */
    applyProjectiveAction(action: Extract<LessonAction, {kind: "projective"}>): void {
        switch (action.operation) {
            case "three-views-set-c": {
                const {tenths} = action;
                if (typeof tenths !== "number" || !Number.isInteger(tenths) || Math.abs(tenths) > THREE_VIEWS_LIMIT) {
                    throw new Error(`projective three-views-set-c: tenths must be an integer from ${-THREE_VIEWS_LIMIT} to ${THREE_VIEWS_LIMIT} (c in steps of 1/${THREE_VIEWS_TENTHS}).`);
                }
                this.setCTenths(tenths);
                return;
            }
            case "three-views-set-point": {
                if (typeof action.on !== "boolean") throw new Error("projective three-views-set-point: on must be true or false.");
                this.togglePoint(action.on);
                return;
            }
            case "three-views-set-angle": {
                const {step} = action;
                if (typeof step !== "number" || !Number.isInteger(step) || step < 0 || step >= THREE_VIEWS_ANGLE_STEPS) {
                    throw new Error(`projective three-views-set-angle: step must be an integer from 0 to ${THREE_VIEWS_ANGLE_STEPS - 1} (steps of 15 degrees).`);
                }
                this.placePoint(step);
                return;
            }
            default:
                throw new Error(`projective: the three-views graph has no operation ${action.operation}.`);
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("projective", action => this.applyProjectiveAction(action));
    }

    // ---- Presets -------------------------------------------------------------------------------------------------

    override presetCollection(): PresetCollection<ThreeViewsModel> {
        return threeViewsPresetCollection();
    }

    defaultPreset(): ThreeViewsModel {
        return serializeThreeViewsModel(DEFAULT_THREE_VIEWS_MODEL);
    }

    /** A Preset carries the model once, as `data`; its `graphState` omits `model`, which the collection's `checkGraphState` rejects. */
    override exportPreset(): Preset<ThreeViewsModel> {
        const preset = super.exportPreset();
        const {model: _model, ...graphState} = preset.graphState as ThreeViewsGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): ThreeViewsModel {
        return serializeThreeViewsModel(this.model);
    }

    /** An import or the app-level Reset replaces the model. */
    override importPresetData(data: ThreeViewsModel): void {
        this.setState({model: serializeThreeViewsModel(data)});
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): ThreeViewsGraphState {
        return {...super.figurePresetGraphState(graphState), model: this.model};
    }

    protected override lessonDefaultState(): ThreeViewsGraphState {
        return {...this.getInitialState(), initialized: true, model: this.model};
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override initialView(): [number, number, number, number] {
        return [...THREE_VIEWS_VIEW_BOX];
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
        const label = () => container.setAttribute("aria-label", t("projective_three_views_board_label"));
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
        const step = STEPS[event.key];
        if (step === undefined) return;
        event.preventDefault();
        // Shift: a whole unit (ten tenths).
        this.nudgeCTenths(step * (event.shiftKey ? TENTHS_PER_UNIT : 1));
    };

    override initialize(): void {
        this.syncScene();
    }

    protected override onStateChange(previous: Readonly<ThreeViewsGraphState>): void {
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

    /** Creates the board once; every object reads the exact scene through functions, so a state change only re-evaluates them. */
    private syncScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        if (this.drawn === undefined || !this.drawnObjectsAlive()) {
            this.removeDrawn();
            this.drawn = this.createDrawn();
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

    /** The polyline of the image conic, remembered for the last conic only. */
    private polyline(scene: ThreeViewsScene): {x: number[]; y: number[]} {
        const key = scene.conic.join(",");
        if (this.polylineCache?.key !== key) this.polylineCache = {key, value: imagePolyline(scene.conic)};
        return this.polylineCache.value;
    }

    private createDrawn(): DrawnScene {
        const board = this.board;
        const all: JXG.GeometryElement[] = [];
        const add = <E extends JXG.GeometryElement>(element: E): E => {
            all.push(element);
            return element;
        };
        const label = {strokeColor: GraphPalette.label};
        const curveOf = (fill: (curve: FillCurve) => void, attributes: Record<string, unknown>) => {
            const curve = add(board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes}) as unknown as JXG.GeometryElement) as unknown as FillCurve & JXG.GeometryElement;
            curve.updateDataArray = () => fill(curve);
            return curve;
        };
        const fixedCurve = (data: () => {x: number[]; y: number[]}, attributes: Record<string, unknown>) => curveOf(curve => {
            const d = data();
            curve.dataX = d.x;
            curve.dataY = d.y;
        }, attributes);
        const text = (x: () => number, y: () => number, content: () => string, attributes: Record<string, unknown> = {}) => add(board.create("text", [x, y, content], {
            fixed: true, highlight: false, strokeColor: GraphPalette.label, layer: 8, ...attributes,
        }) as JXG.GeometryElement);
        const marker = (name: string, at: () => readonly [number, number] | undefined, attributes: Record<string, unknown>) => add(board.create("point", [() => at()?.[0] ?? 0, () => at()?.[1] ?? 0], {
            name, withLabel: true, fixed: true, showInfobox: false, strokeColor: GraphPalette.pointOutline, highlight: false, layer: 7,
            label: {...label, offset: [8, 8]}, visible: () => at() !== undefined, ...attributes,
        }) as JXG.Point);

        // The panel frames and titles.
        for (const centre of [SOURCE_CENTRE, IMAGE_CENTRE]) {
            fixedCurve(() => frame(centre), {strokeColor: GraphPalette.referenceCurve, strokeWidth: 1, layer: 1});
        }
        text(() => SOURCE_CENTRE - PANEL_HALF_WIDTH + 0.2, () => PANEL_HALF_HEIGHT - 0.5, () => describeThreeViews(this.scene(), t, currentLanguage()).sourceTitle);
        text(() => IMAGE_CENTRE - PANEL_HALF_WIDTH + 0.2, () => PANEL_HALF_HEIGHT - 0.5, () => describeThreeViews(this.scene(), t, currentLanguage()).imageTitle);
        // The note that part of the image conic or P' lies outside the panel (empty lines when everything is visible).
        for (const index of [0, 1]) {
            text(() => IMAGE_CENTRE - PANEL_HALF_WIDTH + 0.2, () => -PANEL_HALF_HEIGHT + 0.5 + 0.7 * (1 - index),
                () => describeThreeViews(this.scene(), t, currentLanguage()).clippedLines[index] ?? "");
        }

        // Source plane: the unit circle, the line L and its label.
        fixedCurve(() => {
            const x: number[] = [];
            const y: number[] = [];
            for (let i = 0; i <= CIRCLE_SAMPLES; i++) {
                const theta = 2 * Math.PI * i / CIRCLE_SAMPLES;
                x.push(sourceX(Math.cos(theta)));
                y.push(sourceY(Math.sin(theta)));
            }
            return {x, y};
        }, {strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth, layer: 4});
        fixedCurve(() => {
            const height = sourceY(this.scene().cValue);
            return {x: [SOURCE_CENTRE - PANEL_HALF_WIDTH, SOURCE_CENTRE + PANEL_HALF_WIDTH], y: [height, height]};
        }, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, layer: 3});
        text(() => SOURCE_CENTRE + PANEL_HALF_WIDTH - 1.6, () => sourceY(this.scene().cValue) + 0.3, () => `L: y = ${describeThreeViews(this.scene(), t, currentLanguage()).cText}`);

        // The points where L meets the circle (one or two, none when L misses it).
        for (const index of [0, 1] as const) {
            marker(index === 0 ? "Q₁" : "Q₂", () => {
                const p = this.scene().ideal[index];
                return p ? [sourceX(p.x), sourceY(this.scene().cValue)] : undefined;
            }, {size: 4, face: "o", fillColor: GraphPalette.derivedPoint});
        }
        marker("P", () => {
            const p = this.scene().point;
            return p ? [sourceX(p.x), sourceY(p.y)] : undefined;
        }, {size: 5, face: "o", fillColor: GraphPalette.controlPoint});

        // Image plane: the image conic (the sampler breaks the hyperbola at its points at infinity, so the branches are never joined).
        fixedCurve(() => {
            const d = this.polyline(this.scene());
            return {x: d.x.map(imageX), y: d.y};
        }, {strokeColor: GraphPalette.primaryCurve, strokeWidth: () => this.displaySettings.strokeWidth, layer: 4});

        // The asymptote directions (hyperbola) or the axis direction (parabola): a dashed ray to the window edge and a marker for the point at infinity.
        for (const index of [0, 1] as const) {
            const segment = () => directionSegments(this.scene())[index];
            fixedCurve(() => {
                const s = segment();
                return s ? {x: [imageX(s[0].x), imageX(s[1].x)], y: [s[0].y, s[1].y]} : {x: [], y: []};
            }, {strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5, dash: 2, layer: 3, visible: () => segment() !== undefined});
            marker(index === 0 ? "Q₁′" : "Q₂′", () => {
                const s = segment();
                return s ? [imageX(s[1].x), s[1].y] : undefined;
            }, {size: 4, face: "diamond", fillColor: GraphPalette.derivedPoint});
        }

        // The image of the optional point: on the conic, or at the window edge in its direction when it lies on L (a point at infinity).
        marker("P′", () => {
            const p = this.scene().point;
            if (!p) return undefined;
            if (p.image.kind === "finite") {
                const inside = Math.abs(p.image.X) <= PANEL_HALF_WIDTH && Math.abs(p.image.Y) <= PANEL_HALF_HEIGHT;
                return inside ? [imageX(p.image.X), p.image.Y] : undefined;
            }
            const edge = windowExit(directionAnchor(this.scene()), p.image.direction);
            return [imageX(edge.x), edge.y];
        }, {size: 5, face: "o", fillColor: GraphPalette.controlPoint});
        return {all};
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
        return <ThreeViewsControls model={this.model} scene={this.scene()} actions={{
            setC: tenths => {this.setCTenths(tenths);},
            setPointOn: on => {this.togglePoint(on);},
            setAngle: step => {this.placePoint(step);},
        }}/>;
    }
}
