import React from "react";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import BaseGraph, {BaseGraphState, TransientState} from "../base/BaseGraph";
import {GraphSession} from "../base/GraphSession";
import type {Preset} from "../base/presets/Presets";
import type {FigureCaptureTarget} from "../base/export/FigureCapture";
import {parsePatchPointId} from "./patchSceneBuilder";
import {
    OverlayTypesetter,
    SURFACE_LABEL_COLOR,
    SURFACE_LABEL_FONT_PX,
    SURFACE_LABEL_OFFSET_X_PX,
    SurfaceLabelOverlay,
} from "./SurfaceLabelOverlay";
import {SurfaceCamera, SurfaceEdit, SurfaceScene, SurfaceView, Xyz} from "./surface-view/surfaceScene";
import {ThreeSurfaceView} from "./surface-view/threeSurfaceView";

/** State every surface graph has: the authored camera and the "view could not start" flag. */
export interface SurfaceGraphState extends BaseGraphState {
    camera: SurfaceCamera;
    /** True once the surface view failed to start (no WebGL, or the renderer failed to load). */
    surfaceUnavailable: boolean;
}

export interface SurfaceGraphOptions {
    /** Creates the view; tests pass a fake so nothing loads WebGL. Defaults to the Three view. */
    viewFactory?: () => SurfaceView;
    /** Typesets the on-screen labels; tests pass a stub so no MathJax loads. Defaults to the app's MathJax pipeline. */
    typeset?: OverlayTypesetter;
}

/**
 * A graph whose main view is a `SurfaceView` instead of a JSXGraph board. It owns the view's lifecycle (created per
 * mount, disposed with the session), applies the view's edit intents to the scene store and reconciles the view after
 * every host commit. Subclasses own the surface: they say which state changes alter the geometry, build the scene
 * and apply point edits.
 */
abstract class BaseSurfaceGraph<S extends SurfaceGraphState, D = unknown> extends BaseGraph<S, D> {
    private readonly viewFactory: () => SurfaceView;
    private view?: SurfaceView;
    private host?: HTMLElement;
    /** The DOM labels over the view; created and disposed with the view. */
    private labelOverlay?: SurfaceLabelOverlay;
    private readonly typeset?: OverlayTypesetter;
    /** Counts geometry changes; the view rebuilds its geometry when this changes. */
    private revision = 0;
    private viewIsNew = false;
    /** Transient: the selected control point id (`p-i-j`); not part of any Preset. */
    private selectedPointIdValue: string | undefined;

    protected constructor(options: SurfaceGraphOptions = {}) {
        super();
        this.viewFactory = options.viewFactory ?? (() => new ThreeSurfaceView());
        this.typeset = options.typeset;
    }

    // ---- Subclass contract -------------------------------------------------------------------------------------

    /** The scene for the current state; `revision` and `selectedPointId` come from this class. */
    protected abstract buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene;
    /** Whether the change from `previous` to the current state alters polylines, mesh or points (not the camera or markers). */
    protected abstract geometryChanged(previous: Readonly<S>): boolean;
    /** Applies a control point move; the host owns the net. */
    protected abstract movePoint(pointId: string, xyz: Xyz): void;
    /** Whether `pointId` names a control point of the current net. */
    protected abstract hasPoint(pointId: string): boolean;

    // ---- View lifecycle ----------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        const view = this.viewFactory();
        this.view = view;
        this.host = container;
        this.viewIsNew = true;
        // A fresh view starts available, whatever an earlier view (or a restored checkpoint) left in the store.
        this.setViewUnavailable(session, false);
        const overlay = new SurfaceLabelOverlay(container, this.typeset);
        this.labelOverlay = overlay;
        session.adoptMainView(() => {
            if (this.view === view) {
                this.view = undefined;
                this.host = undefined;
                this.labelOverlay = undefined;
            }
            view.dispose();
            overlay.dispose();
        });
        session.registerCleanup(view.onLayout(labels => overlay.update(labels)));
        session.registerCleanup(view.onEdit(edit => this.applyEdit(session, edit)));
        let language = currentLanguage();
        session.registerCleanup(onLanguageChange(() => {
            // The listener also fires on figure-export state changes; only an actual language change needs a new label.
            if (currentLanguage() === language) return;
            language = currentLanguage();
            view.setAriaLabel(t("surface_view_label"), t("surface_view_keys"));
        }));
        view.attach(container, {
            ariaLabel: t("surface_view_label"),
            description: t("surface_view_keys"),
            onContextLost: () => this.setViewUnavailable(session, true),
            onContextRestored: () => this.setViewUnavailable(session, false),
        }).catch((error: unknown) => {
            console.warn("The surface view could not start.", error);
            this.setViewUnavailable(session, true);
        });
    }

    private setViewUnavailable(session: GraphSession, unavailable: boolean): void {
        if (this.graphSession !== session || !session.isAlive) return;
        this.viewUnavailable = unavailable;
        if (this.state.surfaceUnavailable !== unavailable) this.setSurfaceState({surfaceUnavailable: unavailable});
    }

    private applyEdit(session: GraphSession, edit: SurfaceEdit): void {
        if (this.graphSession !== session || !session.isAlive || this.graphInteractionLocked) return;
        if (edit.kind === "camera") this.setSurfaceState({camera: edit.camera});
        else if (edit.kind === "select") this.selectPoint(edit.pointId);
        else {
            if (edit.phase === "start") this.selectPoint(edit.pointId);
            if (this.hasPoint(edit.pointId)) this.movePoint(edit.pointId, edit.xyz);
        }
    }

    /**
     * Sets keys every surface state has. Like `setBaseState`, this says once what TypeScript cannot see: a literal of
     * `SurfaceGraphState` keys is a `Partial<S>` for a generic `S`.
     */
    protected setSurfaceState(patch: Partial<SurfaceGraphState>, callback?: () => void): void {
        this.setState(patch as Partial<S>, callback);
    }

    protected get selectedPointId(): string | undefined {
        return this.selectedPointIdValue;
    }

    protected selectPoint(pointId: string | undefined): void {
        const next = pointId !== undefined && this.hasPoint(pointId) ? pointId : undefined;
        if (next === this.selectedPointIdValue) return;
        this.selectedPointIdValue = next;
        // The selected point's row and column are scene polylines, which the view rebuilds only on a new revision.
        this.revision++;
        this.reconcileView();
        this.requestRender();
    }

    /** The host element's width / height, or 1 before layout. */
    protected hostAspect(): number {
        const width = this.host?.clientWidth ?? 0, height = this.host?.clientHeight ?? 0;
        return width > 0 && height > 0 ? width / height : 1;
    }

    private reconcileView(): void {
        if (!this.view || !this.graphSession?.isAlive) return;
        this.view.reconcile(this.buildScene(this.revision, this.selectedPointIdValue));
    }

    protected override onStateChange(previous: Readonly<S>): void {
        if (this.viewIsNew || this.geometryChanged(previous)) {
            this.viewIsNew = false;
            this.revision++;
        }
        this.reconcileView();
    }

    /**
     * Whether the live view cannot draw (it failed to start, or its WebGL context is lost). The store flag
     * `surfaceUnavailable` shows it; a scene replacement may bring a stale flag back, so this is what it is checked against.
     */
    private viewUnavailable = false;

    /** A scene replacement (Preset, reset, lesson checkpoint) always changes the geometry. */
    protected override syncReplacedScene(): void {
        this.revision++;
        if (this.state.surfaceUnavailable !== this.viewUnavailable) this.setSurfaceState({surfaceUnavailable: this.viewUnavailable});
        this.reconcileView();
    }

    // ---- Transient state ---------------------------------------------------------------------------------------

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), selectedPoint: this.selectedPointIdValue ?? null};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const id = saved?.selectedPoint;
        this.selectedPointIdValue = typeof id === "string" && parsePatchPointId(id) !== undefined && this.hasPoint(id) ? id : undefined;
    }

    // ---- Presets and panels ------------------------------------------------------------------------------------

    /** All surface state lives in the Preset data (`state`); the Preset's `graphState` only marks it initialized. */
    override exportPreset(): Preset<D> {
        return {id: this.presets()!, graphState: {initialized: true}, data: this.exportPresetData()};
    }

    /**
     * Only the Preset's `data` (checked by the patch collection) sets surface state. A stored or imported `graphState`
     * is ignored, so it cannot put a degree or density into the state that the net does not match.
     */
    override importPreset(preset: Preset): void {
        super.importPreset({...preset, graphState: {initialized: true}});
    }

    /** A figure scene replaces the whole state after importing, so it must keep the imported surface. */
    protected override figurePresetGraphState(): S {
        return {...this.state, initialized: true};
    }

    protected override workspaceDisplay(): React.ReactNode {
        return null;
    }

    // ---- Figure export -----------------------------------------------------------------------------------------

    /** The view's host is what a figure export captures and locks; nothing to export before the view exists. */
    protected override figureContainer(): HTMLElement | undefined {
        return this.view ? this.host : undefined;
    }

    /**
     * The surface is drawn by WebGL, which a DOM-to-canvas capture cannot read: the target carries a still figure
     * (the view's depth-correct render plus its label layout) instead of an SVG renderer root.
     */
    protected override createFigureCaptureTarget(session: GraphSession): FigureCaptureTarget {
        const view = this.view, host = this.host, overlay = this.labelOverlay;
        if (!view || !host || !overlay) throw new Error("The surface view is not available for export.");
        return {
            container: host,
            // The still figure replaces the SVG renderer; the placeholder only satisfies the target's shape.
            rendererRoot: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
            still: {
                capture: () => view.capture(),
                present: async work => overlay.showStill(await view.capture(), work),
                labelStyle: {fontPx: SURFACE_LABEL_FONT_PX, offsetXPx: SURFACE_LABEL_OFFSET_X_PX, color: SURFACE_LABEL_COLOR},
            },
            isAlive: () => this.graphSession === session && session.isAlive,
            signal: session.signal,
            waitUntilReady: () => session.waitUntilReady(),
        };
    }

    /** Shown at the top of the edit panel when the view could not start. */
    protected unavailableNotice(): React.ReactNode {
        return this.state.surfaceUnavailable ? <p role="alert">{t("surface_unavailable")}</p> : null;
    }

    protected override workspaceEdit(): React.ReactNode {
        return this.unavailableNotice();
    }

    override initialize(): void {
    }
}

export default BaseSurfaceGraph;
