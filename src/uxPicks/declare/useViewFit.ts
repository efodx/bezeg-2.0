import {useEffect, useRef} from 'react';
import type {FitBox} from '../../graphs/base/fitBoundingBox';
import {useReducedMotion} from '../../graphs/base/controls/reducedMotion';
import {listParams, recentlyProbed, useParams, type ParamEntry} from '../a1/paramRegistry';
import {samplePoints} from './focusShapes';
import {getGraphUx, useGraphUx} from './graphUxStore';
import type {FocusDecl} from './graphUx';
import {getViewPort, setFitHandler, setNavHandler, subscribeViewPort} from './viewPort';
import {fitView, type FitResult, type Point, type Rect} from './viewFit';

/**
 * Applies the focus-hull view fit (docs/reviews/ux-picks/view-fit.md) for a graph that declares `GraphUx.focus`.
 * The base of every fit is the graph's VIEW INTENT (`ViewPort.intent`), never the view on screen, so refitting cannot drift.
 * Triggers: load, a lesson frame (its view or its actions), canvas resize, a card dropped, folded or opened; after a parameter
 * change only when a must point is under a card or off the canvas. A learner's own pan or zoom pauses the automatic fit until
 * "Prilagodi točkam" (fill mode) or the next lesson frame. Glide 250 ms, none under reduced motion, never during a drag.
 */
const GLIDE_MS = 250;
const SETTLE_MS = 140;
const REACH_SLIDER = 0.25;

type Values = Record<string, number>;

export function currentValues(params: readonly ParamEntry[] = listParams()): Values {
    const out: Values = {};
    for (const p of params) out[p.key] = p.value;
    return out;
}

/** The values `focus.at` is evaluated at besides the current ones: one parameter at a time (declared reach or the default). */
export function reachValues(focus: FocusDecl, params: readonly ParamEntry[]): Values[] {
    const base = currentValues(params);
    const out: Values[] = [];
    for (const p of params) {
        let candidates: number[];
        const declared = focus.reach?.[p.key];
        if (declared) candidates = [...declared];
        else if (p.kind === 'range') {
            const span = (p.max - p.min) * REACH_SLIDER;
            candidates = [-1, -0.5, 0.5, 1].map(k => p.value + k * span).map(v => Math.min(p.max, Math.max(p.min, v)));
        } else {
            const lo = p.min ?? -Infinity, hi = p.max ?? Infinity;
            candidates = [-2, -1, 1, 2].map(k => Math.min(hi, Math.max(lo, p.value + k)));
        }
        for (const v of candidates) if (v !== p.value && Number.isFinite(v)) out.push({...base, [p.key]: v});
    }
    return out;
}

/** Rectangles (px, origin at the board's top-left) of the open and folded cards, the pucks strip and the lesson card. */
function obstacleRects(container: HTMLElement): Rect[] {
    const frame = container.closest('.workspace-graph') ?? container.parentElement;
    const origin = container.getBoundingClientRect();
    const rects: Rect[] = [];
    frame?.querySelectorAll<HTMLElement>('.ux-dock [data-dock-item], .ux-dock .ux-dock-chip, .ux-dock .ux-pucks').forEach(el => {
        if (el.closest('.ux-pucks') && !el.classList.contains('ux-pucks')) return;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        rects.push({x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height});
    });
    return rects;
}

/** The obstacles as a comparable key (whole pixels): a dock change that leaves it equal (a hint, a hover cue) moves nothing. */
function obstacleKey(container: HTMLElement): string {
    return obstacleRects(container).map(r => [r.x, r.y, r.width, r.height].map(Math.round).join(',')).join(';');
}

function points(focus: FocusDecl, values: Values) {
    const set = focus.at(values);
    return {must: samplePoints(set.must), nice: samplePoints(set.nice ?? [])};
}

export function computeFit(mode: 'keep' | 'fill'): FitResult | undefined {
    const port = getViewPort(), focus = getGraphUx()?.focus;
    const base = port?.intent();
    if (!port || !focus || !base) return undefined;
    const rect = port.container.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return undefined;
    const params = listParams();
    const now = points(focus, currentValues(params));
    if (now.must.length === 0) return undefined;
    const reach: Point[] = [];
    for (const v of reachValues(focus, params)) {
        const p = points(focus, v);
        reach.push(...p.must, ...p.nice);
    }
    return fitView({
        must: now.must, nice: now.nice, reach, canvas: {width: rect.width, height: rect.height}, obstacles: obstacleRects(port.container),
        base, equalAxisUnits: port.equalAxisUnits, limits: focus.limits, mode,
    });
}

/** True when a must point of the current values is under a card or off the canvas in the view as shown. */
function mustNeedsRefit(): boolean {
    const port = getViewPort(), focus = getGraphUx()?.focus;
    if (!port || !focus) return false;
    const rect = port.container.getBoundingClientRect();
    const [left, top, right, bottom] = port.current();
    const obstacles = obstacleRects(port.container);
    return samplePoints(focus.at(currentValues()).must).some(p => {
        const x = (p[0] - left) / (right - left) * rect.width, y = (top - p[1]) / (top - bottom) * rect.height;
        return x < 0 || x > rect.width || y < 0 || y > rect.height
            || obstacles.some(o => x > o.x && x < o.x + o.width && y > o.y && y < o.y + o.height);
    });
}

export function useViewFit() {
    const ux = useGraphUx();
    const params = useParams();
    const reduced = useReducedMotion();
    const hasFocus = ux?.focus !== undefined;
    // `mode`: automatic fits keep the learner's last "Prilagodi točkam" (fill) until the graph or a lesson sets a new view.
    // `fitKey`: the obstacles the last fit cleared; `dockOnly`: the pending fit was asked for only by a dock change.
    const state = useRef({paused: false, down: false, wheelUntil: 0, applying: false, timer: 0, frame: 0, pendingCheck: false, pendingFit: false, boardDown: false,
        mode: 'keep' as 'keep' | 'fill', fitKey: undefined as string | undefined, dockOnly: false,
        goTo: undefined as ((box: FitBox) => void) | undefined, checkNow: undefined as (() => void) | undefined});
    const reducedRef = useRef(reduced);
    reducedRef.current = reduced;

    useEffect(() => {
        if (!hasFocus) return undefined;
        const s = state.current;
        const cancelGlide = () => { cancelAnimationFrame(s.frame); s.frame = 0; };
        const goTo = (target: FitBox) => {
            const port = getViewPort();
            if (!port) return;
            cancelGlide();
            const from = port.current();
            if (from.every((v, i) => Math.abs(v - target[i]) < 1e-9 * (1 + Math.abs(v)))) return;
            const run = (box: FitBox) => { s.applying = true; try { port.apply(box); } finally { s.applying = false; } };
            if (reducedRef.current) { run(target); return; }
            const start = performance.now();
            const tick = (now: number) => {
                const k = Math.min(1, (now - start) / GLIDE_MS);
                const e = k * k * (3 - 2 * k);
                run(k >= 1 ? target : from.map((v, i) => v + (target[i] - v) * e) as FitBox);
                s.frame = k < 1 ? requestAnimationFrame(tick) : 0;
            };
            s.frame = requestAnimationFrame(tick);
        };
        s.goTo = goTo;
        const fit = (mode: 'keep' | 'fill') => {
            const port = getViewPort();
            s.fitKey = port ? obstacleKey(port.container) : undefined;
            const result = computeFit(mode);
            if (result) goTo(result.box);
        };
        const run = () => {
            s.timer = 0;
            if (s.down) { s.pendingFit = true; return; }
            if (s.paused) return;
            const dockOnly = s.dockOnly;
            s.dockOnly = false;
            // A hint or hover cue in the dock changed nothing the fit avoids: leave the view where it is.
            const port = getViewPort();
            if (dockOnly && port && s.fitKey !== undefined && obstacleKey(port.container) === s.fitKey) return;
            fit(s.mode);
        };
        const schedule = (delay = SETTLE_MS, fromDock = false) => {
            // Any other trigger pending makes the fit unconditional.
            s.dockOnly = fromDock && (s.timer === 0 || s.dockOnly);
            window.clearTimeout(s.timer);
            s.timer = window.setTimeout(run, delay);
        };
        const resume = () => { s.paused = false; };
        const pause = () => { s.paused = true; cancelGlide(); window.clearTimeout(s.timer); s.timer = 0; };

        let boardOff: (() => void) | undefined;
        let containerOff: (() => void) | undefined;
        let observeOff: (() => void) | undefined;
        const bind = () => {
            boardOff?.(); containerOff?.(); observeOff?.();
            boardOff = containerOff = observeOff = undefined;
            const port = getViewPort();
            if (!port) return;
            const onBox = () => { if (!s.applying && (s.boardDown || performance.now() < s.wheelUntil)) pause(); };
            port.board.on('boundingbox', onBox);
            boardOff = () => port.board.off('boundingbox', onBox);
            const onDown = (e: Event) => { if (!(e.target as Element | null)?.closest('.ux-dock')) s.boardDown = true; };
            const onWheel = () => { s.wheelUntil = performance.now() + 500; };
            port.container.addEventListener('pointerdown', onDown, true);
            port.container.addEventListener('wheel', onWheel, {passive: true, capture: true});
            containerOff = () => { port.container.removeEventListener('pointerdown', onDown, true); port.container.removeEventListener('wheel', onWheel, true); };
            // Canvas resize and cards dropped, folded or opened.
            const ro = new ResizeObserver(() => schedule());
            ro.observe(port.container);
            const dock = port.container.closest('.workspace-graph')?.querySelector('.ux-dock');
            const mo = new MutationObserver(() => { if (s.down) s.pendingFit = true; else schedule(SETTLE_MS, true); });
            if (dock) mo.observe(dock, {attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true});
            observeOff = () => { ro.disconnect(); mo.disconnect(); };
        };
        // Pointer release anywhere: an interrupted fit runs, and a parameter drag ends (checked below by the param effect).
        const onDown = () => { s.down = true; };
        const onUp = () => {
            s.down = false; s.boardDown = false;
            if (s.pendingFit) { s.pendingFit = false; schedule(); }
            if (s.pendingCheck) { s.pendingCheck = false; window.setTimeout(() => s.checkNow?.(), SETTLE_MS); }
        };
        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
        const off = subscribeViewPort(kind => {
            if (kind === 'port') { bind(); resume(); s.mode = 'keep'; schedule(60); return; }
            resume(); // a view of the graph's own or a lesson frame: the fit starts over from the new intent
            s.mode = 'keep';
            schedule(kind === 'action' ? 220 : 60);
        });
        bind();
        setNavHandler(pause);
        setFitHandler(() => { resume(); window.clearTimeout(s.timer); s.timer = 0; s.dockOnly = false; s.mode = 'fill'; fit('fill'); });
        schedule(60);
        return () => {
            off(); boardOff?.(); containerOff?.(); observeOff?.();
            window.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointerup', onUp, true);
            window.removeEventListener('pointercancel', onUp, true);
            window.clearTimeout(s.timer); cancelGlide();
            setNavHandler(undefined); setFitHandler(undefined);
        };
    }, [hasFocus]);

    // A parameter changed (drag released, keys, typed, lesson): refit only when a must point is under a card or off the canvas.
    const checkTimer = useRef(0);
    useEffect(() => {
        if (!hasFocus) return undefined;
        const s = state.current;
        const check = () => {
            if (s.paused || recentlyProbed()) return;
            if (s.down) { s.pendingCheck = true; return; }
            if (mustNeedsRefit()) {
                const result = computeFit(s.mode);
                const port = getViewPort();
                if (result && port) s.goTo?.(result.box);
            }
        };
        s.checkNow = check;
        window.clearTimeout(checkTimer.current);
        checkTimer.current = window.setTimeout(check, 350);
        return () => window.clearTimeout(checkTimer.current);
    }, [hasFocus, params]);
}
