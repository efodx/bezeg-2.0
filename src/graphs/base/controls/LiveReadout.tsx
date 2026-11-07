import React, {useLayoutEffect, useRef, useSyncExternalStore} from "react";

/** Quiet period after the last report before a changed readout is published to the live region. */
export const READOUT_SETTLE_MS = 500;

/**
 * Text for a polite live region that follows a board readout without announcing every drag frame. `report` is cheap and
 * touches no React state; a changed text is published only once no further report arrived for the quiet period. The
 * first report while nothing is published goes out at once, so the mounted region starts with the current value.
 * Multi-line text becomes one sentence-like string. The owner calls {@link cancel} on unmount.
 */
export class SettledReadout {
    private published = "";
    private pending?: ReturnType<typeof setTimeout>;
    private pendingText?: string;
    private readonly listeners = new Set<() => void>();

    constructor(private readonly settleMs = READOUT_SETTLE_MS) {}

    report(raw: string): void {
        const text = this.normalise(raw);
        this.clearTimer();
        if (text === this.published) return;
        if (this.published === "") { this.publish(text); return; }
        this.pendingText = text;
        this.pending = setTimeout(() => { this.pending = undefined; this.publish(text); }, this.settleMs);
    }

    /** Publishes `raw` at once and drops a pending change: for a scene that was just rebuilt, whose text is complete only now. */
    replace(raw: string): void {
        this.clearTimer();
        const text = this.normalise(raw);
        if (text !== this.published) this.publish(text);
    }

    /** Publishes a pending change at once: the quiet period is over because whatever muted the readout has ended. */
    flush(): void {
        const text = this.pendingText;
        if (this.pending === undefined || text === undefined) return;
        this.clearTimer();
        if (text !== this.published) this.publish(text);
    }

    /** Drops a pending change; the published text stays. */
    cancel(): void { this.clearTimer(); }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };

    getSnapshot = (): string => this.published;

    private normalise(raw: string): string {
        return raw.split("\n").map(line => line.trim()).filter(Boolean)
            .map(line => /[.!?]$/.test(line) ? line : `${line}.`).join(" ");
    }

    private clearTimer() {
        if (this.pending !== undefined) clearTimeout(this.pending);
        this.pending = undefined;
    }

    private publish(text: string) {
        this.published = text;
        this.listeners.forEach(listener => listener());
    }
}

/**
 * The always-mounted, visually hidden polite live region for a {@link SettledReadout}: the one announcement region of a
 * graph. While `muted` (callers pass `muted={playing}`) the region stays present and empty, so a run that changes the
 * status on every step is not read out; the readout keeps tracking, and on unmute the current text appears at once, so
 * Pause or the end of a run announces the state once. `dataAttribute` adds one empty `data-<name>` marker for tests.
 */
export function LiveReadout({readout, muted = false, dataAttribute}: { readout: SettledReadout; muted?: boolean; dataAttribute?: string }) {
    const text = useSyncExternalStore(readout.subscribe, readout.getSnapshot);
    const wasMuted = useRef(muted);
    useLayoutEffect(() => {
        if (wasMuted.current && !muted) readout.flush();
        wasMuted.current = muted;
    }, [muted, readout]);
    const extra = dataAttribute ? {[`data-${dataAttribute}`]: ""} : {};
    return <p className="visually-hidden" role="status" aria-live="polite" data-readout-live="" {...extra}>{muted ? "" : text}</p>;
}
