import type {Lease, ParameterArbiter, WriteResult} from "./parameterArbiter";
import {currentWrite} from "./writeSource";

/**
 * The only writer of one board's view (task 01b, [design](../../../../docs/reviews/ux-picks-app-wide/01b-design.md)).
 * Pure: it sees the board through {@link ViewBoard}, so it is testable without JSXGraph.
 *
 * Two values. The **intent** is the view the graph, a lesson, Reset, a Preset or the learner's pan and zoom last asked
 * for; Presets store it. The **fitted** view is a box a fit shows under an `animation` lease on the view key (task 07)
 * without changing the intent. Until a fit exists, the shown view is the intent.
 *
 * Bound to the graph's arbiter as one key (`view`, or `view:<board>` for a secondary board), so the arbiter's rules
 * apply unchanged: a learner pan ends a fit's lease, a lesson cannot move a view the learner holds, and an intent
 * change outside any write source is an untagged write.
 *
 * Who writes. {@link setIntent} takes the current write scope's source. A board `boundingbox` event the adapter did
 * not cause (wheel zoom, drag pan, keyboard navigation inside JSXGraph) becomes the new intent and is attributed to
 * the current source, which during learner input is the learner's gesture. A resize is not a write: inside
 * {@link resizing} the board's events are ignored and an intent set there becomes the baseline without attribution.
 * Before the adapter is bound (a graph's mount) nothing is attributed.
 */

/** JSXGraph order: `[left, top, right, bottom]`. */
export type ViewBox = readonly [number, number, number, number];

export interface ViewIntent {
    readonly box: ViewBox;
    /** Passed to `setBoundingBox` whenever the intent is shown (JSXGraph widens one axis to keep units square). */
    readonly keepAspectRatio: boolean;
}

/** The part of a JSXGraph board the adapter uses. */
export interface ViewBoard {
    getBoundingBox(): number[];
    setBoundingBox(box: number[], keepAspectRatio?: boolean, zoom?: ViewZoomMode): unknown;
    zoomIn?(): unknown;
    zoomOut?(): unknown;
    on(event: "boundingbox", handler: () => void): unknown;
    off(event: "boundingbox", handler: () => void): unknown;
}

/** JSXGraph's `setZoom` argument of `setBoundingBox`: what happens to the board's zoom factors. */
export type ViewZoomMode = "reset" | "update" | "keep";

const APPLIED: WriteResult = {status: "applied"};

function toBox(box: readonly number[]): ViewBox {
    if (box.length !== 4 || !box.every(Number.isFinite)) throw new Error(`Invalid view box [${box.join(", ")}].`);
    return [box[0], box[1], box[2], box[3]];
}

/** Equal within a relative tolerance of the box size, so a round trip through the board's pixel units compares equal. */
export function viewBoxesEqual(a: readonly number[], b: readonly number[]): boolean {
    const scale = Math.max(Math.abs(a[2] - a[0]), Math.abs(a[1] - a[3]), 1e-12);
    return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= scale * 1e-9);
}

export function viewIntentsEqual(a: ViewIntent, b: ViewIntent): boolean {
    return a.keepAspectRatio === b.keepAspectRatio && viewBoxesEqual(a.box, b.box);
}

export class ViewAdapter {
    private intentValue: ViewIntent;
    private fittedBox: ViewBox | undefined;
    /** The box the board showed after the adapter's last change, to recognise changes it did not make. */
    private lastShown: ViewBox;
    private applying = 0;
    /** Open {@link resizing} and {@link following} blocks: view changes there are not writes. */
    private derivedDepth = 0;
    /** The zoom mode of the {@link setIntent} call being applied (not part of the intent). */
    private pendingZoom: ViewZoomMode | undefined;
    private applyingFromArbiter = false;
    private arbiter: ParameterArbiter | undefined;
    private boundKey: string | undefined;
    private readonly listeners = new Set<() => void>();
    private readonly onBoundingBox = () => this.boardChanged();
    private disposed = false;

    constructor(private readonly board: ViewBoard) {
        const shown = toBox(board.getBoundingBox());
        this.intentValue = {box: shown, keepAspectRatio: false};
        this.lastShown = shown;
        board.on("boundingbox", this.onBoundingBox);
    }

    intent(): ViewIntent {
        return this.intentValue;
    }

    /** The box a fit shows, or `undefined` when the shown view is the intent. */
    fitted(): ViewBox | undefined {
        return this.fittedBox;
    }

    /**
     * Sets the intent and shows it, as the current write source. Bound to an arbiter, a `learner` or `lesson` write
     * goes through it (a lesson write to a view the learner holds is refused; a deliberate write ends the leases on
     * the view even when the box is unchanged). Inside {@link resizing} or {@link following} it is not a write.
     * `zoom` is passed to the board for this call only (JSXGraph's `setZoom`; default `"reset"`).
     */
    setIntent(box: readonly number[], options: { keepAspectRatio?: boolean; zoom?: ViewZoomMode } = {}): WriteResult {
        const intent: ViewIntent = {box: toBox(box), keepAspectRatio: options.keepAspectRatio ?? false};
        this.pendingZoom = options.zoom;
        try {
            return this.writeIntent(intent);
        } finally {
            this.pendingZoom = undefined;
        }
    }

    private writeIntent(intent: ViewIntent): WriteResult {
        if (this.derivedDepth > 0) {
            // Not a write: no change notification, and the arbiter takes the new intent as its baseline.
            this.applyIntent(intent, false);
            if (this.boundKey) this.arbiter?.adoptCurrentValue(this.boundKey);
            return APPLIED;
        }
        const write = currentWrite();
        if (this.arbiter && this.boundKey && !this.applyingFromArbiter && write && write.source !== "animation") {
            return this.arbiter.write(this.boundKey, intent, write.source);
        }
        this.applyIntent(intent);
        return APPLIED;
    }

    /**
     * Zooms around the board's centre by its own zoom factors; the resulting box becomes the intent, attributed to the
     * current source (the navigation buttons are learner input).
     */
    zoom(direction: "in" | "out"): void {
        const zoom = direction === "in" ? this.board.zoomIn : this.board.zoomOut;
        if (!zoom) throw new Error("This board has no zoom.");
        this.applying++;
        try {
            zoom.call(this.board);
        } finally {
            this.applying--;
        }
        this.boardChanged();
    }

    /**
     * Shows `box` without changing the intent, under an `animation` lease on the view key (task 07). Returns `false`,
     * and shows nothing, when the lease has ended or does not lease the view.
     */
    setFitted(box: readonly number[], lease: Lease): boolean {
        const fitted = toBox(box);
        if (!this.boundKey || !lease.active || !lease.keys.has(this.boundKey)) return false;
        return lease.run(() => {
            this.fittedBox = fitted;
            this.show(fitted, false);
        });
    }

    /**
     * Runs `work` (the board's resize handling) without treating view changes as writes: board events are ignored and
     * an intent set inside becomes the baseline.
     */
    resizing<T>(work: () => T): T {
        return this.derived(work);
    }

    /**
     * Runs `work`, a view that follows scene state whose own write was already attributed (a key-gated sync after the
     * host commit), without treating its view change as a write. Like {@link resizing}; never use it to silence a
     * view a lesson, Reset, a Preset or the learner asks for.
     */
    following<T>(work: () => T): T {
        return this.derived(work);
    }

    private derived<T>(work: () => T): T {
        this.derivedDepth++;
        try {
            return work();
        } finally {
            this.derivedDepth--;
            if (this.derivedDepth === 0 && !this.disposed) this.lastShown = toBox(this.board.getBoundingBox());
        }
    }

    /** Binds the intent as `key` of `arbiter`; its current intent becomes the baseline. Returns the unbind function. */
    bindTo(arbiter: ParameterArbiter, key = "view"): () => void {
        if (this.arbiter) throw new Error(`The view is already bound as "${this.boundKey}".`);
        const unbind = arbiter.bind<ViewIntent>(key, {
            read: () => this.intentValue,
            apply: intent => {
                this.applyingFromArbiter = true;
                try {
                    this.applyIntent(intent);
                } finally {
                    this.applyingFromArbiter = false;
                }
            },
            equals: viewIntentsEqual,
            subscribe: listener => {
                this.listeners.add(listener);
                return () => this.listeners.delete(listener);
            },
        });
        this.arbiter = arbiter;
        this.boundKey = key;
        return () => {
            unbind();
            if (this.arbiter === arbiter) {
                this.arbiter = undefined;
                this.boundKey = undefined;
            }
        };
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.board.off("boundingbox", this.onBoundingBox);
        this.listeners.clear();
        this.arbiter = undefined;
        this.boundKey = undefined;
    }

    private applyIntent(intent: ViewIntent, notify = true): void {
        const changed = !viewIntentsEqual(intent, this.intentValue);
        this.intentValue = intent;
        this.fittedBox = undefined;
        this.show(intent.box, intent.keepAspectRatio, this.pendingZoom);
        if (changed && notify) this.emit();
    }

    private show(box: ViewBox, keepAspectRatio: boolean, zoom?: ViewZoomMode): void {
        this.applying++;
        try {
            if (zoom === undefined) this.board.setBoundingBox([...box], keepAspectRatio);
            else this.board.setBoundingBox([...box], keepAspectRatio, zoom);
        } finally {
            this.applying--;
        }
        this.lastShown = toBox(this.board.getBoundingBox());
    }

    /** A board view change: the adapter's own (ignored) or the library's from learner input (the new intent). */
    private boardChanged(): void {
        if (this.disposed || this.applying > 0 || this.derivedDepth > 0) return;
        const shown = toBox(this.board.getBoundingBox());
        if (viewBoxesEqual(shown, this.lastShown)) return;
        this.lastShown = shown;
        this.intentValue = {box: shown, keepAspectRatio: false};
        this.fittedBox = undefined;
        this.emit();
    }

    private emit(): void {
        for (const listener of [...this.listeners]) listener();
    }
}
