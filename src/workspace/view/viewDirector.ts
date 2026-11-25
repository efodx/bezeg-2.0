// The view director (task 07 slice 2a; design: docs/reviews/ux-picks-app-wide/briefs/notes/07-view-director-design.md).
// Keeps a graph's declared marks clear of the cards by SHOWING a fitted box under an animation lease on the view key. It reads the
// intent only and never writes it, so Presets and exports keep storing the intent. Framework-free: the board is seen through the
// ViewAdapter, time and frames are injected.
import type {ViewMarks} from '../../graphs/base/declare/graphDeclaration';
import type {FitBox} from '../../graphs/base/fitBoundingBox';
import type {Lease, LeaseEndReason, ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {viewBoxesEqual, type ViewAdapter, type ViewBox, type ViewChange} from '../../graphs/base/writes/viewAdapter';
import {activeGesture, onLearnerGestureEnd} from '../../graphs/base/writes/writeSource';
import {autofitSwitch, type AutofitSwitch} from './autofitSwitch';
import {coveredMarks, fitIntent} from './fitIntent';
import {fitView, type Point, type Rect} from './viewFit';
import {easeOutCubic, GLIDE_MS} from './motion';
import {marksToPoints} from './viewMarks';

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
    /** The declared `followView` of the present state: the fit's base when present, the stored intent otherwise (task 07 slice 4). */
    follow?(): ViewBox | undefined;
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

/** Two follow boxes are the same within a relative tolerance of 1e-9 of the box size. */
const FOLLOW_TOLERANCE = 1e-9;

function sameFollow(a: ViewBox | undefined, b: ViewBox | undefined): boolean {
    if (!a || !b) return a === b;
    const tolerance = FOLLOW_TOLERANCE * Math.max(Math.abs(a[2] - a[0]), Math.abs(a[1] - a[3]));
    return a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
}

/**
 * The box a glide shows at eased progress `k`: width and height change geometrically (a 4x zoom is uniform per frame) and the
 * centre moves linearly. Sizes that are zero or change sign fall back to linear interpolation. Exactness at k = 1 is not
 * this function's job: `step()` shows `glide.to` itself once t >= 1.
 */
export function glideBox(from: ViewBox, to: ViewBox, k: number): ViewBox {
    const lin = (a: number, b: number): number => a + (b - a) * k;
    const size = (a: number, b: number): number => a * b > 0 && Number.isFinite(a * b) ? a * Math.pow(b / a, k) : lin(a, b);
    // ViewBox is [xmin, ymax, xmax, ymin]: width = [2] - [0], height = [1] - [3].
    const w = size(from[2] - from[0], to[2] - to[0]);
    const h = size(from[1] - from[3], to[1] - to[3]);
    const cx = lin((from[0] + from[2]) / 2, (to[0] + to[2]) / 2);
    const cy = lin((from[1] + from[3]) / 2, (to[1] + to[3]) / 2);
    return [cx - w / 2, cy + h / 2, cx + w / 2, cy - h / 2];
}

const merge = (a: FitMode | undefined, b: FitMode): FitMode => a === 'jump' || b === 'jump' ? 'jump' : 'glide';

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
    /** `from`, `to`, `start` and `ms` are re-based when a card rectangle changes during a lesson frame's glide (one glide per step). */
    from: ViewBox;
    to: ViewBox;
    start: number;
    /** The duration: a glide that carries on after a retarget or a lesson write only has the time that was left. */
    ms: number;
    /** Started by `frameChanged()`: a geometry trigger retargets it instead of starting a second glide. */
    readonly byFrame: boolean;
}

export class ViewDirector {
    private readonly adapter: ViewAdapter;
    private readonly arbiter: ParameterArbiter;
    private readonly marks: () => ViewMarks | undefined;
    private readonly equalAxisUnits: () => boolean;
    private readonly follow: () => ViewBox | undefined;
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
    /** A `frameChanged()` is waiting in `request`: the glide it starts is the step's one glide. */
    private frameRequested = false;
    private deferred: {mode: FitMode; force: boolean} | undefined;
    private frameId: number | undefined;
    private glide: Glide | undefined;
    /** The box this director last showed: what the board showed before a write dropped the fit. Unset while the view is the learner's. */
    private shown: ViewBox | undefined;
    /** Shows `shown` again between a write that dropped the fit and the fit that follows it. */
    private hold: Lease | undefined;
    /** A frame glide a lesson write ended: the glide that follows carries on from where it was, in the time that was left. */
    private carried: {remaining: number} | undefined;
    private lastTarget: ViewBox | undefined;
    private marksKey: string;
    private marksSeen: ViewMarks | undefined;
    /** The `followView` this director last acted on; a learner gesture holds it back until the gesture ends. */
    private followSeen: ViewBox | undefined;
    /** Set by a non-learner intent write: the follow box it saw. While the follow is still that box, the stored intent is the fit's base. */
    private intentWonAt: {follow: ViewBox | undefined} | undefined;
    /** The stored intent's box as of the last change, to tell a write that moved it from one that restated it. */
    private intentSeen: ViewBox | undefined;
    /** The follow box seen by the write that moved the intent since the last fit; taken into `intentWonAt` at the next fit. */
    private intentPending: {follow: ViewBox | undefined} | undefined;

    constructor(deps: ViewDirectorDeps) {
        this.adapter = deps.adapter;
        this.follow = deps.follow ?? (() => undefined);
        this.followSeen = this.follow();
        this.intentSeen = deps.adapter.intent().box;
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
        this.frameRequested = true;
        this.carried = undefined; // a new step starts its own glide in full
        this.trigger('glide');
    }

    /**
     * The declared `followView` may have changed (the host calls this after each render). A change glides (inside a lesson step it is
     * the step's one glide); during a learner gesture it waits for the gesture's end, where Samodejno decides. A pause ignores it.
     */
    followChanged(): void {
        if (this.disposed || this.blocked()) return;
        const next = this.follow();
        if (sameFollow(next, this.followSeen)) return;
        this.followSeen = next;
        this.intentWonAt = undefined; // the follow moved on: an older write's win does not come back when it returns to that box
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
        this.shown = undefined;
        this.cancelGlide();
        this.releaseHold();
    }

    isPaused(): boolean {
        return this.paused;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.cancelGlide();
        this.releaseHold();
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
        // Latest writer wins: a non-learner write is newer than the followView it saw, so the intent is the base until the follow moves.
        // A write of the box the intent already was (a scene that restates the default view) is no new say over the follow box.
        // A scene may write the default view and then its own (and the next step the same again): only the net move since the last
        // fit counts, so a step that ends where the intent already was does not become a new say over the follow box.
        const written = this.adapter.intent().box;
        if (change.source === 'learner') { this.intentSeen = written; this.intentPending = undefined; }
        else this.intentPending = sameFollow(written, this.intentSeen) ? undefined : {follow: this.follow()};
        // Only navigation (pan, zoom, arrows) is the learner taking the view; a Reset, a Preset or a lesson write glides.
        if (change.source === 'learner' && change.navigation) this.pause();
        else {
            this.paused = false;
            this.holdShown();
            this.trigger('glide');
        }
    }

    /**
     * A lesson write, a Reset or a Preset drops the fit and the board snaps to the intent for the frames before the fit runs, so
     * the glide would start from the intent. The arbiter ends the leases after the write, so the previous box is shown again in a
     * microtask (before the next paint) under a lease of its own, and the fit that follows glides from it.
     */
    private holdShown(): void {
        // Not `blocked()`: Back and Next are learner spans, and the box shown before is written again, not a new one.
        queueMicrotask(() => {
            const box = this.shown;
            if (this.disposed || this.paused || !box || !this.autofit.get() || this.dragging || this.adapter.fitted() !== undefined) return;
            this.releaseHold();
            const lease = this.arbiter.lease([VIEW_KEY], () => { if (this.hold === lease) this.hold = undefined; });
            if (!lease) return;
            if (this.adapter.setFitted(box, lease)) {
                this.hold = lease;
                this.schedule();
            } else lease.release();
        });
    }

    private releaseHold(): void {
        const hold = this.hold;
        this.hold = undefined;
        if (hold) this.arbiter.endLease(hold, 'released');
    }

    private gestureEnded(): void {
        if (this.disposed) return;
        const key = this.currentMarksKey();
        const changed = key !== this.marksKey;
        this.marksKey = key;
        // A released parameter refits only when a must mark is covered in the view as shown (no abrupt refits on release).
        // A moved follow box is the graph's own intent for the state: it glides at the gesture's end when Samodejno is on.
        const follow = this.follow();
        const followed = !sameFollow(follow, this.followSeen);
        this.followSeen = follow;
        if (followed) this.intentWonAt = undefined;
        if ((changed && this.mustCoveredInShown()) || followed) this.trigger('glide');
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

    private schedule(): void {        if (this.frameId === undefined && !this.disposed) this.frameId = this.requestFrame(() => this.tick());
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
            const byFrame = this.frameRequested;
            this.request = undefined;
            this.frameRequested = false;
            this.fit(mode, byFrame);
        }
        if (this.glide) this.step();
        else this.releaseHold();
    }

    private fit(mode: FitMode, byFrame: boolean): void {
        if (this.intentPending) { this.intentWonAt = this.intentPending; this.intentPending = undefined; }
        // A win lasts only while the follow is the box the write saw: once it moved and a fit ran, the follow is the base again.
        if (this.intentWonAt && !sameFollow(this.follow(), this.intentWonAt.follow)) this.intentWonAt = undefined;
        this.intentSeen = this.adapter.intent().box;
        const target = this.target();
        if (!target) return;
        this.marksKey = this.currentMarksKey();
        if (this.lastTarget && viewBoxesEqual(target, this.lastTarget)) return;
        this.lastTarget = target;
        // One glide per step: a card that moves while the frame's glide runs only changes where that glide ends.
        const running = this.glide;
        if (running?.byFrame && !byFrame && mode === 'glide' && !this.reducedMotion()) {
            // Continue from the box shown now, in the time that is left: the eased position does not jump.
            running.from = this.shownBox();
            running.ms = Math.max(running.ms - (this.now() - running.start), 1);
            running.start = this.now();
            running.to = target;
            this.schedule();
            return;
        }
        const carried = mode === 'glide' ? this.carried : undefined;
        this.carried = undefined;
        const shown = this.shownBox();
        if (viewBoxesEqual(target, shown)) { this.cancelGlide(); this.releaseHold(); return; }
        const token = {};
        const lease = this.arbiter.lease([VIEW_KEY], reason => this.leaseEnded(token, reason)); // replaces the hold's lease
        if (!lease) return; // the learner holds the view
        if (mode === 'jump' || this.reducedMotion()) {
            if (this.adapter.setFitted(target, lease)) this.shown = target;
            lease.release();
            return;
        }
        // A lesson write that ended this step's glide midway: carry on from the box shown, in the time that was left (no restart).
        this.glide = {token, lease, from: shown, to: target, start: this.now(), byFrame: byFrame || carried !== undefined, ms: carried ? Math.max(carried.remaining, 1) : GLIDE_MS};
        this.schedule();
    }

    private step(): void {
        const glide = this.glide;
        if (!glide) return;
        const t = Math.min(1, Math.max(0, (this.now() - glide.start) / glide.ms));
        const k = easeOutCubic(t);
        const box: ViewBox = t >= 1 ? glide.to : glideBox(glide.from, glide.to, k);
        if (!this.adapter.setFitted(box, glide.lease)) { this.glide = undefined; return; }
        this.shown = box;
        if (t >= 1) { this.glide = undefined; glide.lease.release(); return; }
        this.schedule();
    }

    private cancelGlide(): void {
        const glide = this.glide;
        if (!glide) return;
        this.glide = undefined;
        this.arbiter.endLease(glide.lease, 'released');
    }

    private leaseEnded(token: object, reason: LeaseEndReason): void {
        const glide = this.glide;
        if (glide?.token === token) {
            this.glide = undefined;
            // A lesson write ends the step's glide midway: the glide that follows carries on in the time that was left.
            if (glide.byFrame && reason === 'lesson') {
                const remaining = glide.ms - (this.now() - glide.start);
                if (remaining > 0) this.carried = {remaining};
            }
        }
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
        // The fit's base is the graph's followView when it declares one; the stored intent is never written either way.
        const follow = this.follow();
        const intentWins = this.intentWonAt !== undefined && sameFollow(follow, this.intentWonAt.follow);
        const intent = ((intentWins ? undefined : follow) ?? this.adapter.intent().box) as FitBox;
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
