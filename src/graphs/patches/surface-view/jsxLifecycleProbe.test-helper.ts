/**
 * Counting instruments for the lifecycle tests of the JSXGraph surface view (task 06 of docs/specs/jsxgraph-surface-view.md):
 * live event listeners per target, live ResizeObservers and matchMedia subscriptions, and outstanding timers and animation
 * frames. `install()` wraps the browser APIs, `uninstall()` restores them; a count is taken between the two.
 */
interface ListenerKey {
    type: string;
    listener: EventListenerOrEventListenerObject;
    capture: boolean;
}

export interface ProbeCounts {
    /** Live listeners on the window, the document, and the given host element. */
    window: number;
    document: number;
    host: number;
    /** Live listeners on every other target that is still in the document (the listeners JSXGraph puts on `document.body`, say). */
    otherConnected: number;
    /** ResizeObservers that still observe something. */
    observers: number;
    /** matchMedia subscriptions that were not removed. */
    mediaQueries: number;
    /** Intervals and timeouts of more than `SHORT_TIMER_MS` scheduled and neither fired nor cancelled, and animation frames likewise. */
    timers: number;
    frames: number;
}

/** JSXGraph schedules zero-delay one-shot timers (text sizes) that no `freeBoard` cancels; they are not counted, a timer longer than this is. */
export const SHORT_TIMER_MS = 20;

const captureOf = (options?: boolean | AddEventListenerOptions): boolean => typeof options === 'boolean' ? options : !!options?.capture;

export class LifecycleProbe {
    private readonly listeners = new Map<EventTarget, ListenerKey[]>();
    private readonly observing = new Map<object, Set<Element>>();
    private readonly queries = new Set<object>();
    private readonly timeouts = new Map<unknown, string>();
    private readonly delays = new Map<unknown, number>();
    private readonly frameIds = new Map<number, string>();
    private restore: Array<() => void> = [];

    install(): void {
        const proto = EventTarget.prototype;
        const add = proto.addEventListener, remove = proto.removeEventListener;
        const listeners = this.listeners;
        proto.addEventListener = function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
            if (listener) {
                const list = listeners.get(this) ?? [];
                const capture = captureOf(options);
                if (!list.some(k => k.type === type && k.listener === listener && k.capture === capture)) list.push({type, listener, capture});
                listeners.set(this, list);
            }
            return add.call(this, type, listener, options);
        } as typeof proto.addEventListener;
        proto.removeEventListener = function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
            const list = listeners.get(this);
            if (list && listener) {
                const capture = captureOf(options);
                const at = list.findIndex(k => k.type === type && k.listener === listener && k.capture === capture);
                if (at >= 0) list.splice(at, 1);
                if (!list.length) listeners.delete(this);
            }
            return remove.call(this, type, listener, options);
        } as typeof proto.removeEventListener;
        this.restore.push(() => { proto.addEventListener = add; proto.removeEventListener = remove; });

        const OriginalObserver = window.ResizeObserver;
        const observing = this.observing;
        window.ResizeObserver = class {
            private readonly key = {};
            observe(target: Element) { (observing.get(this.key) ?? observing.set(this.key, new Set()).get(this.key)!).add(target); }
            unobserve(target: Element) { observing.get(this.key)?.delete(target); }
            disconnect() { observing.delete(this.key); }
        } as unknown as typeof ResizeObserver;
        this.restore.push(() => { window.ResizeObserver = OriginalObserver; });

        const originalMedia = window.matchMedia;
        const queries = this.queries;
        window.matchMedia = ((query: string) => {
            const list = {};
            const callbacks = new Set<unknown>();
            const subscribe = (cb: unknown) => { callbacks.add(cb); queries.add(list); };
            const unsubscribe = (cb: unknown) => { callbacks.delete(cb); if (!callbacks.size) queries.delete(list); };
            return {
                matches: false, media: query, onchange: null, dispatchEvent: () => false,
                addEventListener: (_type: string, cb: unknown) => subscribe(cb), removeEventListener: (_type: string, cb: unknown) => unsubscribe(cb),
                addListener: subscribe, removeListener: unsubscribe,
            };
        }) as unknown as typeof window.matchMedia;
        this.restore.push(() => { window.matchMedia = originalMedia; });

        const g = globalThis as unknown as Record<string, (...args: unknown[]) => unknown>;
        const stackOf = (): string => (new Error().stack ?? '').split('\n').slice(4, 7).join(' | ');
        const wrapTimer = (name: 'setTimeout' | 'setInterval', clear: 'clearTimeout' | 'clearInterval', repeats: boolean): void => {
            const original = g[name], originalClear = g[clear];
            g[name] = ((callback: (...a: unknown[]) => void, delay?: number, ...rest: unknown[]) => {
                const id: unknown = original(() => { if (!repeats) this.timeouts.delete(id); callback(...rest); }, delay);
                // jsdom schedules its animation frames with a timer of its own; the frame is counted below.
                if (!(new Error().stack ?? "").includes("requestAnimationFrame")) this.timeouts.set(id, stackOf());
                this.delays.set(id, repeats ? Infinity : delay ?? 0);
                return id;
            }) as never;
            g[clear] = ((id: unknown) => { this.timeouts.delete(id); this.delays.delete(id); return originalClear(id); }) as never;
            this.restore.push(() => { g[name] = original; g[clear] = originalClear; });
        };
        wrapTimer('setTimeout', 'clearTimeout', false);
        wrapTimer('setInterval', 'clearInterval', true);
        const originalFrame = g.requestAnimationFrame, originalCancel = g.cancelAnimationFrame;
        g.requestAnimationFrame = ((callback: (t: number) => void) => {
            const id = originalFrame((t: number) => { this.frameIds.delete(id as number); callback(t); }) as number;
            this.frameIds.set(id, stackOf());
            return id;
        }) as never;
        g.cancelAnimationFrame = ((id: number) => { this.frameIds.delete(id); return originalCancel(id); }) as never;
        this.restore.push(() => { g.requestAnimationFrame = originalFrame; g.cancelAnimationFrame = originalCancel; });
    }

    uninstall(): void {
        for (const undo of this.restore.splice(0).reverse()) undo();
    }

    /** `ignore` is a subtree whose listeners are not the view's (the root React renders into). */
    count(host?: Element | null, ignore?: Element): ProbeCounts {
        const live = (target: EventTarget): number => this.listeners.get(target)?.length ?? 0;
        let otherConnected = 0;
        for (const [target, list] of this.listeners) {
            if (target === window || target === document || target === host) continue;
            if (ignore && target instanceof Node && ignore.contains(target)) continue;
            if (target instanceof Node && target.isConnected) otherConnected += list.length;
        }
        return {
            window: live(window), document: live(document), host: host ? live(host) : 0, otherConnected,
            observers: [...this.observing.values()].filter(set => set.size > 0).length,
            mediaQueries: this.queries.size, timers: [...this.timeouts.keys()].filter(id => (this.delays.get(id) ?? 0) > SHORT_TIMER_MS).length, frames: this.frameIds.size,
        };
    }

    /** Where the outstanding timers and frames were scheduled, for failure messages. */
    outstanding(): string[] {
        const long = [...this.timeouts].filter(([id]) => (this.delays.get(id) ?? 0) > SHORT_TIMER_MS).map(([, where]) => `timer ${where}`);
        return [...long, ...[...this.frameIds.values()].map(where => `frame ${where}`)];
    }
}

/**
 * Lets the timers JSXGraph left behind fire. Every update of a board's text elements schedules a zero-delay timer that
 * `freeBoard` cannot cancel and whose closure holds the text, so the whole disposed board (some 30 MB of SVG DOM for a
 * patch) stays reachable until the timer fires. A test that mounts and disposes many views in a row without ever
 * yielding to the timer queue keeps all of them: await this after `dispose`.
 */
export const letBoardTimersFire = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 5));
