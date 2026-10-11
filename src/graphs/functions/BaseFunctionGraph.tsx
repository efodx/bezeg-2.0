import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {onLanguageChange} from "../../localization";
import {Preset} from "../base/presets/Presets";
import {LessonAction, LessonSceneCheckpoint, UnsupportedLessonActionError} from "../../learning/model";

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

type BoundingBox = [left: number, top: number, right: number, bottom: number];

export default abstract class BaseFunctionGraph<M extends object> extends BaseGraph<{}, FunctionGraphState<M>> {
    /** Synchronous source of truth for the graph; `this.state` mirrors it for rendering. */
    protected model: M;
    private generatedObjects: any[] = [];
    private boardStateImported = false;

    constructor(props: {}) {
        super(props);
        this.model = this.defaultModel();
        this.state = {initialized: false, ...this.model};
    }

    private unsubscribeLanguage?: () => void;

    /**
     * Board texts are functions evaluated on board update, so a language switch on an open graph must trigger one.
     * Subclass texts that read the language (`currentLanguage()` / `t()`) in their text functions therefore refresh.
     */
    override componentDidMount(): void {
        super.componentDidMount();
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = onLanguageChange(() => this.boardUpdate());
    }

    override componentWillUnmount(): void {
        this.unsubscribeLanguage?.();
        this.unsubscribeLanguage = undefined;
        super.componentWillUnmount();
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

    /** Applies one lesson parameter against `this.model`. Throw UnsupportedLessonActionError for names the graph does not own. */
    protected applyFunctionParameter(action: FunctionParameterAction): void {
        throw new UnsupportedLessonActionError(action);
    }

    /** Shows or hides one optional element against `this.model`. Throw UnsupportedLessonActionError for targets the graph does not own. */
    protected applyFunctionVisibility(action: FunctionVisibilityAction): void {
        throw new UnsupportedLessonActionError(action);
    }

    /** Selects one named choice against `this.model`. Throw UnsupportedLessonActionError for names the graph does not own. */
    protected applyFunctionChoice(action: FunctionChoiceAction): void {
        throw new UnsupportedLessonActionError(action);
    }

    // ---- Model -------------------------------------------------------------------------------------------------

    /**
     * Replaces the synchronous model, then mirrors it into React state. Pass `syncScene: false` when the objects already
     * show the new model (the user is dragging them).
     */
    protected commitModel(next: M, options: { syncScene?: boolean } = {}): void {
        this.model = next;
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
        this.boardStateImported = Boolean(preset.boardState);
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
        if (!this.boardStateImported) this.board.setBoundingBox(this.defaultBoundingBox(), true);
        this.board.fullUpdate();
    }

    // ---- Lessons -------------------------------------------------------------------------------------------------

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === "function-parameter") {
            this.applyFunctionParameter(action);
            return;
        }
        if (action.kind === "function-visibility") {
            this.applyFunctionVisibility(action);
            return;
        }
        if (action.kind === "function-choice") {
            this.applyFunctionChoice(action);
            return;
        }
        super.applyLessonAction(action);
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

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.renderControls()}{this.renderReadout()}</>;
    }
}
