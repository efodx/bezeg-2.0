import React, {useSyncExternalStore} from "react";

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
    private readonly listeners = new Set<() => void>();

    constructor(private readonly settleMs = READOUT_SETTLE_MS) {}

    report(raw: string): void {
        const text = this.normalise(raw);
        this.clearTimer();
        if (text === this.published) return;
        if (this.published === "") { this.publish(text); return; }
        this.pending = setTimeout(() => { this.pending = undefined; this.publish(text); }, this.settleMs);
    }

    /** Publishes `raw` at once and drops a pending change: for a scene that was just rebuilt, whose text is complete only now. */
    replace(raw: string): void {
        this.clearTimer();
        const text = this.normalise(raw);
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

/** The always-mounted, visually hidden polite live region for a {@link SettledReadout}. */
export function LiveReadout({readout}: { readout: SettledReadout }) {
    const text = useSyncExternalStore(readout.subscribe, readout.getSnapshot);
    return <p className="visually-hidden" role="status" aria-live="polite" data-readout-live="">{text}</p>;
}
