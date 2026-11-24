// The view director (task 07 slice 2a; design: docs/reviews/ux-picks-app-wide/briefs/notes/07-view-director-design.md).
// Keeps a graph's declared marks clear of the cards by SHOWING a fitted box under an animation lease on the view key. It reads the
// intent only and never writes it, so Presets and exports keep storing the intent. Framework-free: the board is seen through the
// ViewAdapter, time and frames are injected.
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import type {FitBox} from '../../graphs/base/fitBoundingBox';
import type {Lease, ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {viewBoxesEqual, type ViewAdapter, type ViewBox, type ViewChange} from '../../graphs/base/writes/viewAdapter';
import {activeGesture, onLearnerGestureEnd} from '../../graphs/base/writes/writeSource';
import {autofitSwitch, type AutofitSwitch} from './autofitSwitch';
import {coveredMarks, fitIntent} from './fitIntent';
import {fitView, type Point, type Rect} from './viewFit';
import {marksToPoints} from './viewMarks';

export const GLIDE_MS = 250;
/** Zoom limits of the keep-mode fallback (maxIn is unused by `keep`). */
const KEEP_LIMITS = {maxOut: 2.2, maxIn: 1};
/** A card rectangle that moves by no more than this (px) is not a change. */
const RECT_TOLERANCE_PX = 1;
/** The key the main board's view adapter is bound to. */
export const VIEW_KEY = 'view';

export interface DirectorGeometry {
    canvas: {width: number; height: number};
    /** `freeRect(layout)`. */
    free: Rect;
    /** `obstacleRects(layout)`. */
    obstacles: readonly Rect[];
}

export type FitMode = 'glide' | 'jump';

export interface ViewDirectorDeps {
    adapter: ViewAdapter;
    arbiter: ParameterArbiter;
    /** The declared marks of the present state. */
    marks(): ViewMarks | undefined;
    /** Default: the intent's `keepAspectRatio`. */
    equalAxisUnits?(): boolean;
    now?(): number;
    requestFrame?(callback: () => void): number;
    cancelFrame?(id: number): void;
    reducedMotion?(): boolean;
    autofit?: AutofitSwitch;
}

/** Whether a board gets a director: declared marks, the main view bound as `view`, and not a surface demonstration. */
export function directorEligible(input: {marks: ViewMarks | undefined; boundKeys: readonly string[] | undefined; surface: boolean}): boolean {
    return input.marks !== undefined && !input.surface && (input.boundKeys?.includes(VIEW_KEY) ?? false);
}

const merge = (a: FitMode | undefined, b: FitMode): FitMode => a === 'jump' || b === 'jump' ? 'jump' : 'glide';
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function sameRect(a: Rect, b: Rect): boolean {
    return Math.abs(a.x - b.x) <= RECT_TOLERANCE_PX && Math.abs(a.y - b.y) <= RECT_TOLERANCE_PX
        && Math.abs(a.width - b.width) <= RECT_TOLERANCE_PX && Math.abs(a.height - b.height) <= RECT_TOLERANCE_PX;
}

function sameGeometry(a: DirectorGeometry, b: DirectorGeometry): boolean {
    return sameRect(a.free, b.free) && a.obstacles.length === b.obstacles.length && a.obstacles.every((rect, index) => sameRect(rect, b.obstacles[index]));
}

interface Glide {
    readonly token: object;
    readonly lease: Lease;
    readonly from: ViewBox;
    readonly to: ViewBox;
    readonly start: number;
}

export class ViewDirector {
    private readonly adapter: ViewAdapter;
    private readonly arbiter: ParameterArbiter;
    private readonly marks: () => ViewMarks | undefined;
    private readonly equalAxisUnits: () => boolean;
    private readonly now: () => number;
    private readonly requestFrame: (callback: () => void) => number;
    private readonly cancelFrame: (id: number) => void;
    private readonly reducedMotion: () => boolean;
    private readonly autofit: AutofitSwitch;
    private readonly stops: (() => void)[] = [];

    private geometry: DirectorGeometry | undefined;
    private paused = false;
    private dragging = false;
    private disposed = false;
    private request: {mode: FitMode; force: boolean} | undefined;
    private deferred: {mode: FitMode; force: boolean} | undefined;
    private frameId: number | undefined;
    private glide: Glide | undefined;
    private lastTarget: ViewBox | undefined;
    private marksKey: string;
    private marksSeen: ViewMarks | undefined;

    constructor(deps: ViewDirectorDeps) {
        this.adapter = deps.adapter;
        this.arbiter = deps.arbiter;
        this.marks = deps.marks;
        this.equalAxisUnits = deps.equalAxisUnits ?? (() => deps.adapter.intent().keepAspectRatio);
        this.now = deps.now ?? (() => performance.now());
        this.requestFrame = deps.requestFrame ?? (callback => requestAnimationFrame(callback));
        this.cancelFrame = deps.cancelFrame ?? (id => cancelAnimationFrame(id));
        this.reducedMotion = deps.reducedMotion ?? (() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
        this.autofit = deps.autofit ?? autofitSwitch;
        this.marksKey = this.currentMarksKey();
        this.stops.push(
            this.adapter.subscribe(change => this.intentChanged(change)),
            onLearnerGestureEnd(() => this.gestureEnded()),
            this.autofit.subscribe(() => { if (this.autofit.get()) this.trigger('glide'); }),
        );
    }

    // ---- inputs ----------------------------------------------------------------------------------------------------------

    /** The layout's free area and cards. The first call is the load fit; a change of more than 1 px later is a card change. */
    setGeometry(geometry: DirectorGeometry): void {
        if (this.disposed) return;
        const previous = this.geometry;
        if (!previous) { this.geometry = geometry; this.trigger('jump'); return; }
        // A rectangle within a pixel of the last one is the same one: keeping it keeps repeated fits identical.
        if (sameGeometry(previous, geometry) && previous.canvas.width === geometry.canvas.width && previous.canvas.height === geometry.canvas.height) return;
        this.geometry = geometry;
        this.lastTarget = undefined;
        this.trigger('glide');
    }

    /** A lesson frame changed: also ends a pause. */
    frameChanged(): void {
        if (this.disposed) return;
        this.paused = false;
        this.lastTarget = undefined;
        this.trigger('glide');
    }

    /** The board's size changed (it arrives continuously, so the fit jumps). */
    resized(): void {
        if (this.disposed) return;
        this.lastTarget = undefined;
        this.trigger('jump');
    }

    /** The fit button: ends a pause and fits once even when Samodejno is off. */
    fitNow(): void {
        if (this.disposed) return;
        this.paused = false;
        this.lastTarget = undefined;
        this.trigger('glide', true);
    }

    /** A card drag is active: nothing is shown until the drop. */
    setDragging(dragging: boolean): void {
        if (this.disposed || this.dragging === dragging) return;
        this.dragging = dragging;
        if (!dragging) this.flushDeferred();
    }

    /** The learner moved the view by other means than the board's own events (the pan buttons). */
    pause(): void {
        if (this.disposed) return;
        this.paused = true;
        this.request = undefined;
        this.deferred = undefined;
        this.cancelGlide();
    }

    isPaused(): boolean {
        return this.paused;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.cancelGlide();
        this.adapter.clearFitted(); // the intent is what the board shows again
        if (this.frameId !== undefined) this.cancelFrame(this.frameId);
        this.frameId = undefined;
        this.request = undefined;
        this.deferred = undefined;
        for (const stop of this.stops.splice(0)) stop();
    }

    // ---- triggers ----------------------------------------------------------------------------------------------------------

    private intentChanged(change: ViewChange): void {
        if (this.disposed) return;
        this.lastTarget = undefined;
        // Only navigation (pan, zoom, arrows) is the learner taking the view; a Reset, a Preset or a lesson write glides.
        if (change.source === 'learner' && change.navigation) this.pause();
        else {
            this.paused = false;
            this.trigger('glide');
        }
    }

    private gestureEnded(): void {
        if (this.disposed) return;
        const key = this.currentMarksKey();
        const changed = key !== this.marksKey;
        this.marksKey = key;
        // A released parameter refits only when a must mark is covered in the view as shown (no abrupt refits on release).
        if (changed && this.mustCoveredInShown()) this.trigger('glide');
        this.flushDeferred();
    }

    private flushDeferred(): void {
        const deferred = this.deferred;
        if (!deferred || this.blocked()) return;
        this.deferred = undefined;
        this.trigger(deferred.mode, deferred.force);
    }

    private blocked(): boolean {
        return this.dragging || activeGesture() !== undefined;
    }

    private trigger(mode: FitMode, force = false): void {
        if (this.disposed) return;
        if (!force && (this.paused || !this.autofit.get())) return;
        this.request = {mode: merge(this.request?.mode, mode), force: force || (this.request?.force ?? false)};
        this.schedule();
    }

    private schedule(): void {
        if (this.frameId === undefined && !this.disposed) this.frameId = this.requestFrame(() => this.tick());
    }

    // ---- the frame ---------------------------------------------------------------------------------------------------------

    private tick(): void {
        this.frameId = undefined;
        if (this.disposed) return;
        if (this.blocked()) {
            // Never write during a learner span or a card drag: remember it and run once afterwards.
            if (this.request) this.deferred = {mode: merge(this.deferred?.mode, this.request.mode), force: this.request.force || (this.deferred?.force ?? false)};
            this.request = undefined;
            if (this.glide) { this.deferred = {mode: merge(this.deferred?.mode, 'glide'), force: this.deferred?.force ?? false}; this.cancelGlide(); }
            return;
        }
        if (this.request && this.geometry) {
            const {mode} = this.request;
            this.request = undefined;
            this.fit(mode);
        }
        if (this.glide) this.step();
    }

    private fit(mode: FitMode): void {
        const target = this.target();
        if (!target) return;
        this.marksKey = this.currentMarksKey();
        if (this.lastTarget && viewBoxesEqual(target, this.lastTarget)) return;
        this.lastTarget = target;
        const shown = this.shownBox();
        if (viewBoxesEqual(target, shown)) { this.cancelGlide(); return; }
        const token = {};
        const lease = this.arbiter.lease([VIEW_KEY], () => this.leaseEnded(token));
        if (!lease) return; // the learner holds the view
        if (mode === 'jump' || this.reducedMotion()) {
            this.adapter.setFitted(target, lease);
            lease.release();
            return;
        }
        this.glide = {token, lease, from: shown, to: target, start: this.now()};
        this.schedule();
    }

    private step(): void {
        const glide = this.glide;
        if (!glide) return;
        const t = Math.min(1, Math.max(0, (this.now() - glide.start) / GLIDE_MS));
        const k = easeOutCubic(t);
        const mix = (i: 0 | 1 | 2 | 3): number => glide.from[i] + (glide.to[i] - glide.from[i]) * k;
        const box: ViewBox = t >= 1 ? glide.to : [mix(0), mix(1), mix(2), mix(3)];
        if (!this.adapter.setFitted(box, glide.lease)) { this.glide = undefined; return; }
        if (t >= 1) { this.glide = undefined; glide.lease.release(); return; }
        this.schedule();
    }

    private cancelGlide(): void {
        const glide = this.glide;
        if (!glide) return;
        this.glide = undefined;
        this.arbiter.endLease(glide.lease, 'released');
    }

    private leaseEnded(token: object): void {
        if (this.glide?.token === token) this.glide = undefined;
        // A lease the learner ended (Escape, a gesture) only drops the glide; navigation alone pauses (intentChanged).
    }

    // ---- the fit -----------------------------------------------------------------------------------------------------------

    private shownBox(): ViewBox {
        return this.adapter.fitted() ?? this.adapter.intent().box;
    }

    private currentMarksKey(): string {
        const marks = this.marks();
        // The same object is the same marks (declarations memoize), so it is not serialized again.
        if (marks !== undefined && marks === this.marksSeen) return this.marksKey;
        this.marksSeen = marks;
        return JSON.stringify(marks ?? null);
    }

    private mustCoveredInShown(): boolean {
        const marks = this.marks();
        if (!marks || !this.geometry || this.paused || !this.autofit.get()) return false;
        const {must} = marksToPoints(marks);
        return coveredMarks(this.shownBox() as FitBox, must, this.geometry.canvas, this.geometry.obstacles).length > 0;
    }

    /** The box to show: the intent mapped into the free area, or, when a must mark is still covered, the keep-mode fit. */
    private target(): ViewBox | undefined {
        const marks = this.marks();
        const geometry = this.geometry;
        if (!marks || !geometry || !(geometry.canvas.width > 0) || !(geometry.canvas.height > 0)) return undefined;
        const intent = this.adapter.intent().box as FitBox;
        const equalAxisUnits = this.equalAxisUnits();
        const {canvas, free, obstacles} = geometry;
        let box: FitBox = fitIntent({intent, canvas, free, equalAxisUnits}).box;
        const {must, nice} = marksToPoints(marks);
        if (coveredMarks(box, must, canvas, obstacles).length > 0) {
            box = fitView({must: must as readonly Point[], nice, canvas, obstacles, base: intent, equalAxisUnits, limits: KEEP_LIMITS, mode: 'keep', free}).box;
        }
        return box.every(Number.isFinite) ? [box[0], box[1], box[2], box[3]] : undefined;
    }
}
