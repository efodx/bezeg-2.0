/**
 * Graph teardown contract. Every Demonstration in `allGraphFactories`, mounted through the real `GraphHost`: once plain
 * and once in React StrictMode (which mounts, unmounts and mounts again). The StrictMode mount must leave the board
 * objects and event handlers of the plain mount. After a scene change, a started playback and a scene replacement
 * (a lesson checkpoint restore and the default scene), the unmount must leave:
 *   - no board of the graph (the registry of JSXGraph boards is back to what it was, the board container is empty,
 *     and a surface view is disposed),
 *   - no listener the graph registered with `addEventListener` (window, document, board container, media queries,
 *     resize observers), no scene store subscriber and no language subscriber or language lock,
 *   - a language change after the unmount does not throw,
 *   - no pending timeout, interval or animation frame (checked after a short real wait, as JSXGraph leaves
 *     zero-delay timers that run once), and a stopped playback after the scene replacement.
 * This replaces the per-graph "StrictMode mounts, unmounts and mounts again" and "a scene change and unmount leave no
 * board objects, listeners or timers / no scheduler callback" tests; a graph keeps only the extras it alone asserts.
 * Tier: sampled locally, rotated in CI with a daily full run (`catalogSweepScope.ts`): the transient state sample, each
 * family's first graph, the playback graphs and the graphs the branch's changed files reach, plus a rotating slice in a
 * CI push or pull request. BEZEG_GRAPH_TEARDOWN=all or BEZEG_SWEEPS=all runs every graph (docs/commands.md,
 * "Catalog sweep scope").
 */
import React from 'react';
import {afterAll, beforeAll, beforeEach, describe, expect, inject, test, vi} from 'vitest';
import {act, cleanup, fireEvent, render, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import JXG from 'jsxgraph';
import {allGraphFactories} from '../allGraphFactories';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {GraphHost} from './GraphHost';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {changeScene, internals} from './realGraphScenes';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from './realGraphTestHarness';
import {createGraph} from './createTestGraph';
import {classNames, familySample, selectEntries, skippedPlaceholder, TRANSIENT_STATE_SAMPLE} from './catalogSweepScope';
import {LESSON_ANIMATION_IDS, type LessonAction} from '../../learning/model';
import type {DemonstrationId} from '../../demonstrations';

// Counts the live language subscriptions and language locks made outside React.
const languageHooks = vi.hoisted(() => ({listeners: 0, locks: 0}));
vi.mock('../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            languageHooks.listeners++;
            const off = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) languageHooks.listeners--; released = true; off(); };
        },
        registerLanguageLock: (isLocked: () => boolean) => {
            languageHooks.locks++;
            const off = original.registerLanguageLock(isLocked);
            let released = false;
            return () => { if (!released) languageHooks.locks--; released = true; off(); };
        },
    };
});

type GraphLike = BaseGraph<BaseGraphState>;
type Assertion = 'boards' | 'listeners' | 'subscribers' | 'timers' | 'playback' | 'strictMode';

/**
 * Graphs that cannot satisfy an assertion, with the reason. A graph listed here skips only the named assertion, never
 * the whole contract. Found by the first full run (BEZEG_GRAPH_TEARDOWN=all, 2026-11-11); product code is not fixed here.
 */
const EXEMPT: Partial<Record<DemonstrationId, Partial<Record<Assertion, string>>>> = {
};

const allIds = Object.keys(allGraphFactories) as DemonstrationId[];
/** The playback graphs (a step or frame scheduler), which the sample must reach beside one graph per family. */
const PLAYBACK_SAMPLE: readonly DemonstrationId[] = ['bisection', 'decasteljau', 'delaunay', 'convex-hull', 'curve-kinematics'];
const SAMPLE = familySample(allIds, [...TRANSIENT_STATE_SAMPLE, ...PLAYBACK_SAMPLE]);
const ids = selectEntries(inject('graphTeardownScope'), 'BEZEG_GRAPH_TEARDOWN', allIds, SAMPLE,
    (id, scope) => classNames(createGraph(id)).some(name => scope.changedNames.includes(name)));

// ---- Observers, installed around every global the graphs register with ----------------------------------------------

type Listener = {target: unknown; type: string; listener: unknown; capture: boolean; seq: number};
type Timer = {delay: number; seq: number; moduleTimer: boolean};

let seq = 0;
/**
 * Timers started by the MathJax loader (src/mathjax/loadMathJax.ts: the 15 s startup guard, cleared only when MathJax
 * starts) belong to the module, not to the graph whose panel first typeset: whichever graph triggers the load leaves
 * one, so they are excluded by origin (the registering stack) rather than by graph.
 */
const MODULE_TIMER = /loadMathJax/;
let listeners: Listener[] = [];
const timeouts = new Map<unknown, Timer>();
const intervals = new Map<unknown, Timer>();
const frames = new Map<unknown, Timer>();
let mediaQueries = 0;
let observers = 0;
const restores: Array<() => void> = [];
let realSetTimeout: typeof setTimeout;

const captured = (options: unknown): boolean => options === true || (typeof options === 'object' && options !== null && (options as {capture?: boolean}).capture === true);

function installObservers(): void {
    realSetTimeout = globalThis.setTimeout;
    const addEventListener = EventTarget.prototype.addEventListener;
    const removeEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function(this: unknown, type: string, listener: unknown, options?: unknown) {
        const once = typeof options === 'object' && options !== null && ((options as {once?: boolean}).once || (options as {signal?: unknown}).signal);
        if (listener && !once && !listeners.some(entry => entry.target === this && entry.type === type && entry.listener === listener && entry.capture === captured(options))) {
            listeners.push({target: this, type, listener, capture: captured(options), seq: ++seq});
        }
        return addEventListener.call(this, type, listener as EventListener, options as AddEventListenerOptions);
    };
    EventTarget.prototype.removeEventListener = function(this: unknown, type: string, listener: unknown, options?: unknown) {
        listeners = listeners.filter(entry => !(entry.target === this && entry.type === type && entry.listener === listener && entry.capture === captured(options)));
        return removeEventListener.call(this, type, listener as EventListener, options as EventListenerOptions);
    };
    restores.push(() => { EventTarget.prototype.addEventListener = addEventListener; EventTarget.prototype.removeEventListener = removeEventListener; });

    for (const target of new Set<Record<string, any>>([globalThis as never, window as never])) {
        const original = {setTimeout: target.setTimeout, clearTimeout: target.clearTimeout, setInterval: target.setInterval,
            clearInterval: target.clearInterval, requestAnimationFrame: target.requestAnimationFrame, cancelAnimationFrame: target.cancelAnimationFrame};
        target.setTimeout = (callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
            const id = original.setTimeout.call(target, (...rest: unknown[]) => { timeouts.delete(id); return callback(...rest); }, delay, ...args);
            timeouts.set(id, {delay: delay ?? 0, seq: ++seq, moduleTimer: MODULE_TIMER.test(new Error().stack ?? '')});
            return id;
        };
        target.clearTimeout = (id: unknown) => { timeouts.delete(id); return original.clearTimeout.call(target, id); };
        target.setInterval = (callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
            const id = original.setInterval.call(target, callback, delay, ...args);
            intervals.set(id, {delay: delay ?? 0, seq: ++seq, moduleTimer: false});
            return id;
        };
        target.clearInterval = (id: unknown) => { intervals.delete(id); return original.clearInterval.call(target, id); };
        if (original.requestAnimationFrame) {
            target.requestAnimationFrame = (callback: FrameRequestCallback) => {
                const id = original.requestAnimationFrame.call(target, (time: number) => { frames.delete(id); return callback(time); });
                frames.set(id, {delay: 0, seq: ++seq, moduleTimer: false});
                return id;
            };
            target.cancelAnimationFrame = (id: unknown) => { frames.delete(id); return original.cancelAnimationFrame.call(target, id); };
        }
        restores.push(() => Object.assign(target, original));
    }

    // jsdom has neither layout nor media queries; count the listeners and observers a graph leaves on these shims.
    const matchMedia = window.matchMedia;
    window.matchMedia = (() => {
        const live = new Set<unknown>();
        const query = {
            matches: false,
            addEventListener: (_type: string, listener: unknown) => { if (!live.has(listener)) { live.add(listener); mediaQueries++; } },
            removeEventListener: (_type: string, listener: unknown) => { if (live.delete(listener)) mediaQueries--; },
            addListener: (listener: unknown) => query.addEventListener('change', listener),
            removeListener: (listener: unknown) => query.removeEventListener('change', listener),
        };
        return query;
    }) as unknown as typeof window.matchMedia;
    const ResizeObserverBefore = window.ResizeObserver;
    window.ResizeObserver = class {
        private readonly targets = new Set<unknown>();
        observe(target: unknown) { if (!this.targets.has(target)) { this.targets.add(target); observers++; } }
        unobserve(target: unknown) { if (this.targets.delete(target)) observers--; }
        disconnect() { observers -= this.targets.size; this.targets.clear(); }
    } as unknown as typeof ResizeObserver;
    restores.push(() => { window.matchMedia = matchMedia; window.ResizeObserver = ResizeObserverBefore; });
}

beforeAll(() => {
    installBoardShims();
    installObservers();
    // React registers its own listeners on the document and on a portal's container (body) the first time a graph's
    // workspace renders; do that once before any graph is watched.
    host(createGraph('bezier'), false).unmount();
    cleanup();
});
afterAll(() => { for (const restore of restores.splice(0).reverse()) restore(); });
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { appStorage.clear(); });
skippedPlaceholder(allIds.length - ids.length, 'Demonstrations', 'BEZEG_GRAPH_TEARDOWN');

// ---- What a mount leaves ---------------------------------------------------------------------------------------------

/** Board objects, tick labels aside (JSXGraph keeps a pool of them whose size depends on earlier views), per type. */
function shot(graph: GraphLike) {
    const board = (graph as unknown as {hasBoard: boolean}).hasBoard ? internals(graph).board : undefined;
    if (!board) {
        const view = surfaceViewOf(graph);
        return {counts: {scene: view?.scenes.length ? 1 : 0}, total: 0, handlers: {} as Record<string, number>};
    }
    const objects = board.objectsList as unknown as Array<{elType: string; labels?: unknown[]}>;
    const tickLabels = new Set(objects.flatMap(object => object.elType === 'ticks' ? object.labels ?? [] : []));
    const counts: Record<string, number> = {};
    let total = 0;
    for (const object of objects) {
        if (tickLabels.has(object)) continue;
        counts[object.elType] = (counts[object.elType] ?? 0) + 1;
        total++;
    }
    const handlers: Record<string, number> = {};
    for (const [name, list] of Object.entries((board as unknown as {eventHandlers: Record<string, unknown[]>}).eventHandlers ?? {})) handlers[name] = list.length;
    return {counts, total, handlers};
}

interface Watch {
    seq: number;
    boards: string[];
    bodyChildren: Element[];
    language: {listeners: number; locks: number};
    media: number;
    observers: number;
}

const watch = (): Watch => ({seq: ++seq, boards: Object.keys(JXG.boards as Record<string, unknown>), bodyChildren: [...document.body.children],
    language: {...languageHooks}, media: mediaQueries, observers});

const boardBox = (graph: GraphLike): HTMLElement | undefined =>
    (graph as unknown as {hasBoard: boolean}).hasBoard ? internals(graph).board.containerObj as HTMLElement : undefined;

const host = (graph: GraphLike, strict: boolean) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};

/** The listeners a mount registered and left in place, by target and type (React's own on the render container aside). */
const liveListeners = (before: Watch, container: HTMLElement, box?: HTMLElement): string[] => listeners
    // React attaches listeners to its root container and straight to some of its own elements (details toggle, invalid on
    // inputs); those leave with the removed tree. Inside that tree only the board container counts.
    .filter(entry => entry.seq > before.seq && entry.target !== container
        && (entry.target === box || !(entry.target instanceof Node) || entry.target.getRootNode() === document))
    .map(entry => `${(entry.target as {nodeName?: string}).nodeName ?? entry.target?.constructor?.name ?? typeof entry.target}.${entry.type}`).sort();

/** A short real wait: zero-delay timers JSXGraph leaves run once, a frame loop would re-arm itself. */
const flush = () => new Promise<void>(resolve => realSetTimeout(resolve, 40));

const playbackActions = (graph: GraphLike): LessonAction[] => LESSON_ANIMATION_IDS
    .map(animationId => ({kind: 'animation', animationId, command: 'play'}) as LessonAction)
    .filter(action => graph.supportsLessonAction(action));

/** Everything a graph must have released after its last unmount. */
async function expectTornDown(id: DemonstrationId, graph: GraphLike, before: Watch, container: HTMLElement, box: HTMLElement | undefined, label: string) {
    const exempt = EXEMPT[id] ?? {};
    const check = (assertion: Assertion, run: () => void) => { if (!exempt[assertion]) run(); };
    await flush();
    check('boards', () => {
        expect(Object.keys(JXG.boards as Record<string, unknown>).filter(name => !before.boards.includes(name)), `${label}: boards left`).toEqual([]);
        if (box) expect(box.childElementCount, `${label}: board container`).toBe(0);
        const view = surfaceViewOf(graph);
        if (view) expect(view.disposed, `${label}: surface view disposed`).toBeGreaterThan(0);
        expect([...document.body.children].filter(element => element !== container && !before.bodyChildren.includes(element)), `${label}: body nodes left`).toEqual([]);
    });
    check('listeners', () => {
        expect(liveListeners(before, container, box), `${label}: listeners left`).toEqual([]);
        expect(mediaQueries - before.media, `${label}: media query listeners left`).toBe(0);
        expect(observers - before.observers, `${label}: resize observer targets left`).toBe(0);
    });
    check('subscribers', () => {
        expect(() => act(() => { setLanguage('en'); }), `${label}: a language change after unmount`).not.toThrow();
        act(() => { setLanguage('sl'); });
        expect((graph.store as unknown as {listeners: Set<unknown>}).listeners.size, `${label}: scene store subscribers left`).toBe(0);
        expect(languageHooks.listeners - before.language.listeners, `${label}: language subscribers left`).toBe(0);
        expect(languageHooks.locks - before.language.locks, `${label}: language locks left`).toBe(0);
    });
    check('timers', () => {
        const describe = (map: Map<unknown, Timer>, kind: string) => [...map.values()].filter(timer => timer.seq > before.seq && !timer.moduleTimer).map(timer => `${kind}(${timer.delay})`);
        expect([...describe(timeouts, 'timeout'), ...describe(intervals, 'interval'), ...describe(frames, 'frame')], `${label}: timers left`).toEqual([]);
    });
}

describe.each(ids)('%s', id => {
    test('plain and StrictMode mounts, a scene change and unmount leave nothing behind', async () => {
        // Plain mount: the reference object counts.
        const plainGraph = createGraph(id);
        const plainBefore = watch();
        const plain = host(plainGraph, false);
        const reference = shot(plainGraph);
        const plainBox = boardBox(plainGraph);
        const plainListeners = liveListeners(plainBefore, plain.container, plainBox);
        plain.unmount();
        await expectTornDown(id, plainGraph, plainBefore, plain.container, plainBox, 'plain mount');
        cleanup();

        // StrictMode: the same objects, then a scene change, playback and a scene replacement before the unmount.
        const graph = createGraph(id);
        const before = watch();
        const strict = host(graph, true);
        const box = boardBox(graph);
        if (!EXEMPT[id]?.strictMode) expect(shot(graph), 'StrictMode mount').toEqual(reference);
        if (!EXEMPT[id]?.listeners) expect(liveListeners(before, strict.container, box), 'StrictMode listeners').toEqual(plainListeners);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        changeScene({graph, view: strict}, 'a');
        const play = () => {
            act(() => { for (const action of playbackActions(graph)) capabilities.apply(action); });
            for (const button of within(strict.container).queryAllByRole('button', {name: t('play')})) act(() => { fireEvent.click(button); });
        };
        play();
        act(() => capabilities.restoreState(checkpoint));
        if (!EXEMPT[id]?.strictMode) expect(shot(graph), 'restored scene').toEqual(reference);
        act(() => capabilities.apply({kind: 'prepared-scene', sceneId: 'teardown-default', source: 'demonstration-default'}));
        // A playback graph reports it as a getter or a method; a graph without playback reports nothing.
        const playing = () => { const flag = (graph as unknown as {isPlaying?: boolean | (() => boolean)}).isPlaying; return typeof flag === 'function' ? flag.call(graph) : flag; };
        if (!EXEMPT[id]?.playback && playing() !== undefined) expect(playing(), 'playback after the scene replacement').toBe(false);
        play();
        strict.unmount();
        if (!EXEMPT[id]?.playback && playing() !== undefined) expect(playing(), 'playback after unmount').toBe(false);
        await expectTornDown(id, graph, before, strict.container, box, 'StrictMode mount');
        cleanup();
    });
});
