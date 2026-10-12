import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {currentLanguage, Language, onLanguageChange} from "../../localization";
import {Preset} from "../base/presets/Presets";
import {LessonAction, LessonSceneCheckpoint} from "../../learning/model";
import {formatNumber} from "../../analysis/format";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {GraphPalette} from "../styles/GraphPalette";

/**
 * Shared foundation of the function and calculus demonstrations (ADR 0007).
 *
 * A subclass describes its whole state as a flat model of numbers, booleans and strings (so the model doubles as
 * validated preset data and as React state). This class owns:
 *
 * - the synchronous model: `this.model` is the source of truth; React state only mirrors it for rendering. A Guided
 *   lesson scene applies all of its actions in one tick while `setState` is asynchronous, so lesson actions, drag
 *   handlers and inspector inputs must read and write `this.model` (through `commitModel`), never `this.state`;
 * - generated JSXGraph objects: everything a scene creates is registered with `own()` and removed, children first, by
 *   `removeGeneratedObjects()` (also from `disposeFigureScene()` and before every regeneration);
 * - preset export/import of the model with sanitizing (`parseModel`), the lesson default scene, and lesson
 *   capture/restore that also restores the synchronous model.
 *
 * The mathematics lives in `src/analysis/` and must not be imported back from here into that module.
 */
export type FunctionGraphState<M extends object> = BaseGraphState & M;

export type FunctionParameterAction = Extract<LessonAction, { kind: 'function-parameter' }>;
export type FunctionVisibilityAction = Extract<LessonAction, { kind: 'function-visibility' }>;
export type FunctionChoiceAction = Extract<LessonAction, { kind: 'function-choice' }>;

/** What a function graph offers lessons, keyed by the closed name sets of the lesson model. */
export interface FunctionLessonActions {
    parameters?: Partial<Record<FunctionParameterAction['name'], (value: number) => void>>;
    visibility?: Partial<Record<FunctionVisibilityAction['target'], (visible: boolean) => void>>;
    choices?: Partial<Record<FunctionChoiceAction['name'], (value: string) => void>>;
}

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Thrown by the model setters when a value is outside the graph's domain. Inspector controls swallow exactly this error
 * (`ignoreOutOfDomain`); lesson actions let it propagate, and anything else is a bug and is never swallowed.
 */
export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DomainError";
        Object.setPrototypeOf(this, DomainError.prototype);
    }
}

/** Removes floating-point noise left by rounding or slider arithmetic (and the sign of zero) without changing meaningful digits. */
export const cleanNumber = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

/** A number for a slider value or label: the current language's decimal separator and a true minus sign. */
export const localizedSliderValue = (value: number) => formatNumber(value, currentLanguage());

export type CaptionCorner = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

/** One line of the board caption. */
export interface CaptionLine {
    text: () => string;
    /** Text colour; defaults to the palette's label colour. */
    color?: string | (() => string);
    /** Font size relative to the caption's base size; the first (most important) line is usually 1.2. */
    scale?: number;
    visible?: () => boolean;
    /** The line is shown only while the board is at least this many pixels wide (its content is then in the inspector). */
    minBoardWidth?: number;
    /** The line is a formula: its one-letter variables are set in italics, as in the MathJax point labels. */
    math?: boolean;
}

/** Where a point's label sits relative to the point; chosen per point so that the label clears the curves through it. */
export type LabelPlacement = "above" | "below" | "left" | "right" | "above-left" | "above-right" | "below-left" | "below-right";

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The serif of the workspace headings and coordinate editor, so plain board text sits with the MathJax labels (SVG export keeps it). */
export const BOARD_TEXT_STYLE = 'font-family:Georgia,"Times New Roman",serif;font-variant-numeric:lining-nums;';

/**
 * Escaped HTML of a plain-text formula with its one-letter variables in italics; names such as sin, cos or dx stay upright
 * and Δ is an upright operator (Δy).
 */
export const mathTextHtml = (text: string) => escapeHtml(text).replace(/(?<!(?!Δ)\p{L})([A-Za-zα-ω])(?!\p{L})/gu, "<i>$1</i>");

/** A soft board-coloured plate so that a curve crossing the caption does not hurt legibility; it never takes pointer events. */
const CAPTION_STYLE = `${BOARD_TEXT_STYLE}background-color:rgba(255,253,245,0.88);padding:3px 8px;border-radius:2px;line-height:1.3;white-space:nowrap;pointer-events:none;`;

/** The caption's base font size shrinks with the board width and never goes below this. */
const CAPTION_MIN_FONT = 11;
const CAPTION_FULL_WIDTH = 700;

export default abstract class BaseFunctionGraph<M extends object> extends BaseGraph<FunctionGraphState<M>> {
    /** Synchronous source of truth for the graph; `this.state` mirrors it for rendering. */
    protected model: M;
    private generatedObjects: any[] = [];
    /** True only between an import that carried a board view and the `initialize()` that must not override it. */
    private boardStateImported = false;
    private captionLines: CaptionLine[] = [];
    private lastLanguage: Language = currentLanguage();

    constructor() {
        super();
        this.model = this.defaultModel();
    }

    override getInitialState(): FunctionGraphState<M> {
        // Always the default model: a remount must not start from values a preset import wrote into `this.model`.
        return {initialized: false, ...this.defaultModel()};
    }

    private unsubscribeLanguage?: () => void;

    /**
     * Board texts are functions evaluated on board update, so a language switch on an open graph must trigger one.
     * Subclass texts that read the language (`currentLanguage()` / `t()`) in their text functions therefore refresh.
     */
    override mount(container: HTMLElement): void {
        super.mount(container);
        this.unsubscribeLanguage?.();
        this.lastLanguage = currentLanguage();
        // The listener also fires on figure-export state changes; only an actual language change needs a board update.
        this.unsubscribeLanguage = onLanguageChange(() => {
            const language = currentLanguage();
            if (language === this.lastLanguage) return;
            this.lastLanguage = language;
            this.boardUpdate();
        });
    }

    override unmount(): void {
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = undefined;
        // The board is disposed with the session: drop every reference to its objects so nothing can touch them afterwards.
        this.generatedObjects = [];
        this.captionLines = [];
        this.onSceneRemoved();
        super.unmount();
        // A later mount() on this instance starts from the default model, like a new instance.
        this.model = this.defaultModel();
    }

    // ---- Subclass contract -------------------------------------------------------------------------------------

    protected abstract defaultModel(): M;

    /** Returns a sanitized model, or undefined when `data` is not a valid model (wrong shape, non-finite, out of domain). */
    protected abstract parseModel(data: unknown): M | undefined;

    /** Creates the JSXGraph objects for the current model; register each one with `own()`. Called with no generated objects present. */
    protected abstract createScene(): void;

    /** Moves existing objects to the current model after it changed by something other than dragging them. */
    protected syncSceneToModel(): void {
    }

    protected abstract defaultBoundingBox(): BoundingBox;

    protected abstract renderControls(): React.ReactNode;

    protected abstract renderReadout(): React.ReactNode;

    /** An optional key of colours and curves, shown between the readout and the controls. */
    protected renderLegend(): React.ReactNode {
        return null;
    }

    /**
     * The lesson parameters, optional elements and named choices this graph owns, each with the function that applies
     * it against `this.model`. A name missing here is unsupported: the registry does not handle it.
     */
    protected lessonFunctionActions(): FunctionLessonActions {
        return {};
    }

    // ---- Model -------------------------------------------------------------------------------------------------

    /**
     * Replaces the synchronous model, then mirrors it into React state. Pass `syncScene: false` when the objects already
     * show the new model (the user is dragging them).
     */
    protected commitModel(next: M, options: { syncScene?: boolean } = {}): void {
        this.model = next;
        // A late drag or input event after unmount only updates the model: there is no board or React tree to touch.
        if (!this.graphSession?.isAlive) return;
        this.setState({...next} as unknown as FunctionGraphState<M>);
        if (options.syncScene !== false && this.generatedObjects.length > 0) this.syncSceneToModel();
        this.boardUpdate();
    }

    override exportPresetData(): M {
        return {...this.model};
    }

    override importPresetData(data: any): void {
        let source: unknown = data;
        if (typeof data === "string") {
            try {
                source = JSON.parse(data);
            } catch {
                source = undefined;
            }
        }
        const parsed = this.parseModel(source);
        if (!parsed) console.warn("Ignoring invalid function preset data; using the default model.");
        this.commitModel(parsed ?? this.defaultModel());
    }

    override importPreset(preset: Preset): void {
        // Only a preset applied before the scene exists is followed by the `initialize()` that would reset the view; one
        // applied to a live scene sets its own view directly, and a stale flag would make a later initialize skip the default.
        this.boardStateImported = Boolean(preset.boardState) && this.generatedObjects.length === 0;
        super.importPreset(preset);
        // The model in `data` is authoritative; a preset without it shows the default model.
        if (preset.data === undefined || preset.data === null) this.importPresetData(this.defaultPreset());
    }

    override defaultPreset(): string {
        return JSON.stringify(this.defaultModel());
    }

    // ---- Generated objects ---------------------------------------------------------------------------------------

    /** Registers a JSXGraph object created for the scene so that it is removed with the scene. */
    protected own<T>(object: T): T {
        this.generatedObjects.push(object);
        return object;
    }

    protected get generatedObjectCount(): number {
        return this.generatedObjects.length;
    }

    /** Removes every owned object, newest first so that children go before their parents. */
    protected removeGeneratedObjects(): void {
        const objects = [...new Set<any>(this.generatedObjects)]
            .filter(object => object?.board === this.board && this.board.objectsList.includes(object))
            .reverse();
        if (objects.length) this.board.removeObject(objects);
        this.generatedObjects = [];
        this.onSceneRemoved();
    }

    /** Lets a subclass drop its references to removed objects. */
    protected onSceneRemoved(): void {
    }

    protected generateScene(): void {
        this.removeGeneratedObjects();
        this.createScene();
    }

    protected override disposeFigureScene(): void {
        if (this.graphSession?.isAlive) this.removeGeneratedObjects();
        else {
            this.generatedObjects = [];
            this.onSceneRemoved();
        }
    }

    initialize(): void {
        this.generateScene();
        const keepImportedView = this.boardStateImported;
        this.boardStateImported = false;
        if (!keepImportedView) this.board.setBoundingBox(this.defaultBoundingBox(), true);
        this.board.fullUpdate();
    }

    // ---- Lessons -------------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        // A graph handles exactly the names, elements and choices its `lessonFunctionActions()` lists.
        registry.on("function-parameter", action => this.lessonFunctionActions().parameters?.[action.name]?.(action.value),
            {supports: action => this.lessonFunctionActions().parameters?.[action.name] !== undefined});
        registry.on("function-visibility", action => this.lessonFunctionActions().visibility?.[action.target]?.(action.visible),
            {supports: action => this.lessonFunctionActions().visibility?.[action.target] !== undefined});
        registry.on("function-choice", action => this.lessonFunctionActions().choices?.[action.name]?.(action.value),
            {supports: action => this.lessonFunctionActions().choices?.[action.name] !== undefined});
    }

    protected override lessonDefaultState(): FunctionGraphState<M> {
        return {initialized: true, ...this.defaultModel()};
    }

    protected override prepareLessonDefaultScene(): void {
        if (!this.graphSession?.isReady) throw new Error("The graph is still preparing. Try again in a moment.");
        this.importPresetData(this.defaultPreset());
        this.board.setBoundingBox(this.defaultBoundingBox(), true);
        this.setState(this.lessonDefaultState());
        this.boardUpdate();
    }

    protected override captureLessonState(): LessonSceneCheckpoint {
        const checkpoint = super.captureLessonState();
        // React state may lag the synchronous model within one tick; the checkpoint must describe the model.
        const value = checkpoint.value as { graphState: object };
        value.graphState = {...value.graphState, ...this.model};
        return checkpoint;
    }

    protected override restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        super.restoreLessonState(checkpoint);
        if (this.graphSession?.isReady) this.setState({...this.model} as unknown as FunctionGraphState<M>);
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, runtimeState?: unknown): FunctionGraphState<M> {
        return {...super.figurePresetGraphState(graphState, runtimeState), ...this.model};
    }

    // ---- Rendering ------------------------------------------------------------------------------------------------

    /** The key numbers come first so they are visible without scrolling; the controls follow. `display: contents` keeps the groups' layout. */
    protected override workspaceEdit(): React.ReactNode {
        return <div className="function-inspector">{this.renderReadout()}{this.renderLegend()}{this.renderControls()}</div>;
    }

    /** Runs an inspector change; swallows only a DomainError (the value is outside the model's domain) and reports whether it applied. */
    protected ignoreOutOfDomain(action: () => void): boolean {
        try {
            action();
            return true;
        } catch (error) {
            if (error instanceof DomainError) return false;
            throw error;
        }
    }

    // ---- Board caption -------------------------------------------------------------------------------------------------

    private boardWidth(): number {
        return this.board?.canvasWidth || CAPTION_FULL_WIDTH;
    }

    private visibleCaptionLines(): CaptionLine[] {
        const width = this.boardWidth();
        return this.captionLines.filter(line => (line.visible?.() ?? true) && width >= (line.minBoardWidth ?? 0));
    }

    /** The visible lines of the board caption as plain text (what the board shows, one string per line). */
    captionPlainLines(): string[] {
        return this.visibleCaptionLines().map(line => line.text());
    }

    /** The text colours of the visible caption lines. */
    captionColors(): string[] {
        return this.visibleCaptionLines().map(line => typeof line.color === "function" ? line.color() : line.color ?? GraphPalette.label);
    }

    private captionHtml(): string {
        const colors = this.captionColors();
        return this.visibleCaptionLines().map((line, index) => {
            const color = colors[index];
            const html = line.math ? mathTextHtml(line.text()) : escapeHtml(line.text());
            return `<div style="color:${color};font-size:${line.scale ?? 1}em">${html}</div>`;
        }).join("");
    }

    /**
     * The one block of text a function graph writes on its board: stacked lines in one text object (so lines never overlap),
     * in a corner chosen by the graph to avoid its default curves, on a soft plate, with a font that shrinks on narrow boards.
     */
    protected caption(corner: CaptionCorner, lines: CaptionLine[]): void {
        const board = this.board;
        this.captionLines = lines;
        const [vertical, horizontal] = corner.split("-") as ["top" | "bottom", "left" | "center" | "right"];
        const x = () => {
            const [left, , right] = board.getBoundingBox();
            return horizontal === "left" ? left + 0.04 * (right - left) : horizontal === "right" ? right - 0.04 * (right - left) : (left + right) / 2;
        };
        const y = () => {
            const [, top, , bottom] = board.getBoundingBox();
            return vertical === "top" ? top - 0.04 * (top - bottom) : bottom + 0.04 * (top - bottom);
        };
        this.own(board.create("text", [x, y, () => this.captionHtml()], {
            anchorX: horizontal === "center" ? "middle" : horizontal, anchorY: vertical, fixed: true, highlight: false, parse: false,
            fontSize: () => Math.max(CAPTION_MIN_FONT, this.displaySettings.fontSize * Math.min(1, this.boardWidth() / CAPTION_FULL_WIDTH)),
            strokeColor: GraphPalette.label, cssStyle: CAPTION_STYLE, highlightCssStyle: CAPTION_STYLE,
        }));
    }

    // ---- Points ----------------------------------------------------------------------------------------------------------

    /** The label attributes of a point, placed so that it clears the curves through the point (pass them as the point's `label`). */
    protected pointLabel(placement: LabelPlacement | (() => LabelPlacement), distance = 1): object {
        const resolve = () => typeof placement === "function" ? placement() : placement;
        const vertical = () => resolve().startsWith("above") ? 1 : resolve().startsWith("below") ? -1 : 0;
        const horizontal = () => resolve().endsWith("left") ? -1 : resolve().endsWith("right") ? 1 : 0;
        return {
            ...this.styles.point.default.label,
            anchorX: () => horizontal() < 0 ? "right" : horizontal() > 0 ? "left" : "middle",
            anchorY: () => vertical() > 0 ? "bottom" : vertical() < 0 ? "top" : "middle",
            offset: () => [horizontal() * 6 * distance, vertical() * 0.5 * this.displaySettings.fontSize * distance],
        };
    }

    /**
     * A point that slides along a curve: dragging projects x onto the grid of `step` inside [min, max], writes it with
     * `write` and puts the point back on the curve at y = `position(x)` (the x-axis for a bound, the graph for a point on it).
     */
    protected slidingPoint(config: {
        x: number; position: (x: number) => number; min: number; max: number; step: number; attributes: object; write: (x: number) => void;
    }): JXG.Point {
        const point = this.own(this.board.create("point", [config.x, config.position(config.x)], config.attributes)) as JXG.Point;
        point.on("drag", () => {
            const x = Math.min(config.max, Math.max(config.min, Math.round(point.X() / config.step) * config.step + 0));
            if (!Number.isFinite(x)) return;
            const rounded = cleanNumber(x);
            config.write(rounded);
            point.moveTo([rounded, config.position(rounded)]);
        });
        return point;
    }
}
