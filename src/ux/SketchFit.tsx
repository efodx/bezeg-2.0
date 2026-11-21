import React, {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {getParam, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {uxEnabled} from './flags';
import {meaningful, signature, drawn, tween} from './YourTurn';
import './SketchFit.css';

/**
 * a11 — Draw it, Bezeg finds it. The learner sketches a curve on the board; Bezeg moves the graph's own parameters
 * until the curve runs through the sketch and then says which parameters the sketch has ("a ≈ 2, d ≈ −1"). The inverse
 * question of every graph lesson — which numbers make this shape? — answered by the learner's hand. Generic: the solver
 * knows nothing about the graph. It probes which drawn curves each registered parameter moves, then runs damped
 * Gauss–Newton (Levenberg–Marquardt) with finite differences through the real board, so the search is visible.
 */

type Vec = [number, number];
type Phase = 'idle' | 'drawing' | 'fitting' | 'done' | 'failed';

const frames = (n = 1) => new Promise<void>(resolve => {
    const step = (left: number) => requestAnimationFrame(() => left <= 1 ? resolve() : step(left - 1));
    step(n);
});

function resample(points: Vec[], count: number): Vec[] {
    if (points.length < 2) return points;
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const total = lengths[lengths.length - 1];
    const out: Vec[] = [];
    let j = 0;
    for (let i = 0; i < count; i++) {
        const target = total * i / (count - 1);
        while (j < lengths.length - 2 && lengths[j + 1] < target) j++;
        const span = lengths[j + 1] - lengths[j] || 1;
        const t = (target - lengths[j]) / span;
        out.push([points[j][0] + (points[j + 1][0] - points[j][0]) * t, points[j][1] + (points[j + 1][1] - points[j][1]) * t]);
    }
    return out;
}

function samplePath(node: SVGGeometryElement, count: number): Vec[] {
    let length = 0;
    try { length = node.getTotalLength(); } catch { return []; }
    if (!(length > 0)) return [];
    const out: Vec[] = [];
    for (let i = 0; i <= count; i++) {
        const point = node.getPointAtLength(length * i / count);
        out.push([point.x, point.y]);
    }
    return out;
}

/** Solves (A + λ diag A) x = b for a small dense system by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]): number[] | undefined {
    const n = b.length;
    const m = a.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
        if (Math.abs(m[p][c]) < 1e-12) return undefined;
        [m[c], m[p]] = [m[p], m[c]];
        for (let r = c + 1; r < n; r++) {
            const f = m[r][c] / m[c][c];
            for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
        }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
        let sum = m[r][n];
        for (let k = r + 1; k < n; k++) sum -= m[r][k] * x[k];
        x[r] = sum / m[r][r];
    }
    return x;
}

interface Result { values: {entry: ParamEntry; value: number}[]; error: number; twins: [string, string][] }

export function SketchFit(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const usable = params.filter(entry => meaningful(entry) && !entry.inert);
    const [phase, setPhase] = useState<Phase>('idle');
    const [stroke, setStroke] = useState<Vec[]>([]);
    const [result, setResult] = useState<Result>();
    const [message, setMessage] = useState('');
    const [locked, setLocked] = useState(false);
    const before = useRef<Map<string, number>>(new Map());
    const cancelled = useRef(false);
    const svgOffset = useRef<Vec>([0, 0]);

    useEffect(() => {
        const section = props.frame.current?.closest('.workspace-graph');
        if (!section) return;
        const read = () => setLocked(section.getAttribute('data-lesson-locked') === 'true');
        read();
        const observer = new MutationObserver(read);
        observer.observe(section, {attributes: true, attributeFilter: ['data-lesson-locked']});
        return () => observer.disconnect();
    }, [props.frame]);

    useEffect(() => () => {
        cancelled.current = true;
        const b = findBoard(props.frame.current);
        if (b) (b as unknown as {containerObj: HTMLElement}).containerObj.style.opacity = '';
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const board = (): Board | undefined => findBoard(props.frame.current);
    const root = (b: Board) => (b as unknown as {renderer: {svgRoot?: SVGSVGElement}}).renderer.svgRoot;

    const fit = async (sketch: Vec[]) => {
        const b = board();
        const svg = b && root(b);
        if (!b || !svg) return;
        cancelled.current = false;
        setPhase('fitting');
        setMessage('Iščem parametre …');
        const keys = usable.map(entry => entry.key);
        before.current = new Map(usable.map(entry => [entry.key, entry.value]));
        const events = b as unknown as {on(event: string, handler: () => void): void; off(event: string, handler: () => void): void};
        let synchronous = 0;
        let fast = false;
        const settle = async (values: number[]) => {
            // Fast path: commit the change synchronously; when the board redraws inside that commit, it is ready to read.
            let redrawn = false;
            const mark = () => { redrawn = true; };
            events.on('update', mark);
            try { flushSync(() => keys.forEach((key, i) => getParam(key)?.set(values[i]))); } finally { events.off('update', mark); }
            if (redrawn && keys.every((key, k) => { const entry = getParam(key); return !entry || Math.abs(entry.value - values[k]) <= entry.step / 2 + 1e-9 || entry.value === entry.max || entry.value === entry.min; })) {
                // Let the page breathe now and then so the search stays visible and the tab responsive.
                if (++synchronous % 12 === 0) await frames(1);
                fast = true;
                return;
            }
            for (let i = 0; i < 8; i++) {
                if (keys.every((key, k) => { const entry = getParam(key); return !entry || Math.abs(entry.value - values[k]) <= entry.step / 2 + 1e-9 || entry.value === entry.max || entry.value === entry.min; })) break;
                await frames();
            }
            // Then let the board redraw: its next update, or four frames if nothing needed redrawing.
            await new Promise<void>(resolve => {
                let left = 4;
                const done = () => { events.off('update', done); resolve(); };
                const tick = () => { if (--left <= 0) done(); else requestAnimationFrame(tick); };
                events.on('update', done);
                requestAnimationFrame(tick);
            });
            await frames(1);
        };
        // Which drawn curves respond to which parameter: nudge each by 4 % and look.
        const start = keys.map(key => getParam(key)!.value);
        const curveIds = new Set<string>();
        const active: number[] = [];
        for (let i = 0; i < keys.length; i++) {
            const entry = getParam(keys[i])!;
            const span = entry.max - entry.min;
            const reference = new Map(drawn(b).map(object => [object.id, signature(object.rendNode!)]));
            const probe = [...start];
            const delta = Math.max(entry.step, span * 0.04);
            probe[i] = start[i] + delta <= entry.max ? start[i] + delta : start[i] - delta;
            await settle(probe);
            let moved = false;
            for (const object of drawn(b)) {
                if (object.elType === 'point' || object.elType === 'glider' || !(object.rendNode instanceof SVGGeometryElement)) continue;
                const old = reference.get(object.id);
                if (old !== undefined && old !== signature(object.rendNode)) { curveIds.add(object.id); moved = true; }
            }
            if (moved) active.push(i);
            await settle(start);
            if (cancelled.current) return;
        }
        if (active.length === 0 || curveIds.size === 0) {
            setPhase('failed');
            setMessage('Na tem grafu ni krivulje, ki bi jo parametri premikali.');
            return;
        }
        const container = (b as unknown as {containerObj: HTMLElement}).containerObj;
        container.style.transition = 'opacity 200ms ease';
        container.style.opacity = '0.3';
        const targets = resample(sketch, 36);
        // A time budget, not a count: a heavy board (hundreds of bars) redraws in tens of milliseconds per look.
        const searchStart = performance.now();
        const elapsed = () => performance.now() - searchStart;
        // Two-way distance: every part of the sketch near the curve, and every part of the curve inside the sketch's
        // region near the sketch (otherwise a steep spike that merely crosses the sketch would count as a fit).
        const dense = resample(sketch, 140);
        const xs = dense.map(p => p[0]), ys = dense.map(p => p[1]);
        const pad = Math.max(12, 0.08 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
        const region = {left: Math.min(...xs) - pad, right: Math.max(...xs) + pad, top: Math.min(...ys) - pad, bottom: Math.max(...ys) + pad};
        const nearest = (x: number, y: number, cloud: Vec[]) => {
            let best = Infinity;
            for (const [sx, sy] of cloud) {
                const d = (sx - x) * (sx - x) + (sy - y) * (sy - y);
                if (d < best) best = d;
            }
            return Math.sqrt(best);
        };
        const residuals = (): number[] => {
            const curves = drawn(b).filter(object => curveIds.has(object.id) && object.rendNode instanceof SVGGeometryElement)
                .map(object => samplePath(object.rendNode as unknown as SVGGeometryElement, 220)).filter(samples => samples.length > 0);
            if (curves.length === 0) return [...targets, ...targets].map(() => 1000);
            const perCurve = curves.map(samples => targets.map(([x, y]) => nearest(x, y, samples)));
            const forward = targets.map((_, j) => Math.min(...perCurve.map(distances => distances[j])));
            // The reverse check uses the one curve that carries the sketch (a histogram's bars are not asked to lie on it).
            const carrier = perCurve.map(distances => distances.reduce((sum, d) => sum + d, 0)).reduce((bestIndex, total, i, all) => total < all[bestIndex] ? i : bestIndex, 0);
            const inside = curves[carrier].filter(([x, y]) => x >= region.left && x <= region.right && y >= region.top && y <= region.bottom);
            const reverse = inside.length === 0 ? 0 : Math.sqrt(inside.reduce((sum, [x, y]) => sum + nearest(x, y, dense) ** 2, 0) / inside.length);
            return [...forward, ...targets.map(() => reverse)];
        };
        const cost = (r: number[]) => r.reduce((sum, v) => sum + v * v, 0);
        const entries = active.map(i => getParam(keys[i])!);
        const clampTo = (entry: ParamEntry, v: number) => entry.cyclic !== undefined ? ((v % entry.cyclic) + entry.cyclic) % entry.cyclic : Math.min(entry.max, Math.max(entry.min, v));
        const full = (x: number[]) => {
            const values = [...start];
            active.forEach((index, k) => { values[index] = clampTo(entries[k], x[k]); });
            return values;
        };
        const evaluate = async (x: number[]) => { await settle(full(x)); return residuals(); };

        // Levenberg–Marquardt in units of each parameter's range, from where the graph is now and, if that ends far
        // from the sketch, from two more starting points.
        const scale = entries.map(entry => entry.max - entry.min);
        const run = async (x0: number[], iterations = 16) => {
            let x = [...x0];
            let r = await evaluate(x);
            let c = cost(r);
            let lambda = 0.3;
            let normal: number[][] = [];
            let previous = Infinity;
            for (let iteration = 0; iteration < iterations && !cancelled.current && elapsed() < 11000; iteration++) {
                const jacobian: number[][] = [];
                for (let k = 0; k < x.length; k++) {
                    const h = Math.max(entries[k].step, scale[k] * 0.01);
                    const xs = [...x];
                    xs[k] = x[k] + h <= entries[k].max || entries[k].cyclic !== undefined ? x[k] + h : x[k] - h;
                    const rk = await evaluate(xs);
                    const used = (xs[k] - x[k]) / scale[k];
                    jacobian.push(rk.map((v, j) => (v - r[j]) / used));
                }
                const n = x.length;
                const jtj = Array.from({length: n}, (_, a) => Array.from({length: n}, (_, bIndex) => jacobian[a].reduce((sum, v, j) => sum + v * jacobian[bIndex][j], 0)));
                const jtr = Array.from({length: n}, (_, a) => -jacobian[a].reduce((sum, v, j) => sum + v * r[j], 0));
                normal = jtj;
                let improved = false;
                for (let tries = 0; tries < 5 && !improved; tries++) {
                    const damped = jtj.map((row, a) => row.map((v, bIndex) => a === bIndex ? v * (1 + lambda) + 1e-9 : v));
                    const dx = solve(damped, jtr);
                    if (!dx) { lambda *= 10; continue; }
                    // A trust region: no parameter moves more than 15 % of its range in one step.
                    const largest = Math.max(...dx.map(Math.abs));
                    const shrink = largest > 0.15 ? 0.15 / largest : 1;
                    const candidate = x.map((v, k) => clampTo(entries[k], v + dx[k] * shrink * scale[k]));
                    const rc = await evaluate(candidate);
                    const cc = cost(rc);
                    if (cc < c) { x = candidate; r = rc; c = cc; lambda = Math.max(1e-4, lambda / 3); improved = true; }
                    else lambda *= 6;
                }
                const rms = Math.sqrt(c / r.length);
                if (!improved || rms < 2.5 || (iteration > 3 && previous - rms < previous * 0.01)) break;
                previous = rms;
            }
            return {x, c, rms: Math.sqrt(c / r.length), normal};
        };
        // Screen starting points with one look each — where the graph is now, each sign flip of a parameter whose range
        // crosses zero (a curve cannot pass through a = 0 to open the other way), and a few random ones — then run
        // the solver from the two most promising.
        const here = active.map(i => start[i]);
        const starts: number[][] = [here];
        entries.forEach((entry, k) => { if (entry.min < 0 && entry.max > 0 && Math.abs(here[k]) > entry.step) starts.push(here.map((v, j) => j === k ? -v : v)); });
        for (let n = 0; n < 40; n++) starts.push(entries.map((entry, k) => n % 2 === 0 ? entry.min + (entry.max - entry.min) * (0.2 + Math.random() * 0.6) : clampTo(entry, here[k] + (Math.random() - 0.5) * scale[k] * 0.5)));
        // Every start gets a short polish (the landscape has valleys a raw look cannot rank), the best three a full run.
        const polished: Awaited<ReturnType<typeof run>>[] = [];
        for (const x0 of starts) {
            if (cancelled.current) return;
            // A board that redraws only on the next frame makes every look cost ~100 ms: fewer, shorter tries there.
            if ((!fast && polished.length >= 3) || (polished.length >= 2 && elapsed() > 6000)) break;
            polished.push(await run(x0, fast ? 7 : 2));
            if (polished[polished.length - 1].rms < 3) break;
        }
        polished.sort((p, q) => p.c - q.c);
        setMessage('Še natančneje …');
        let best = polished[0];
        for (const candidate of polished.slice(0, fast ? 3 : 1)) {
            if (cancelled.current) return;
            const refined = await run(candidate.x, fast ? 20 : 8);
            if (refined.c < best.c) best = refined;
            if (best.rms < 3) break;
        }
        if (cancelled.current) { container.style.opacity = ''; return; }
        // Parsimony: a parameter that barely helps goes back to where it was, so the answer names only what the sketch needs.
        for (let k = 0; k < best.x.length && !cancelled.current; k++) {
            const original = start[active[k]];
            if (Math.abs(best.x[k] - original) < 1e-9) continue;
            const trial = [...best.x];
            trial[k] = original;
            const rt = await evaluate(trial);
            const ct = cost(rt);
            if (ct <= best.c * 1.15 + rt.length * 4) best = {...best, x: trial, c: Math.min(best.c, ct)};
        }
        // Land on the parameters' own steps.
        const snapped = best.x.map((v, k) => {
            const entry = entries[k];
            const base = entry.cyclic === undefined ? entry.min : 0;
            return Number((Math.round((v - base) / entry.step) * entry.step + base).toFixed(10));
        });
        const forwardRms = (r: number[]) => Math.sqrt(r.slice(0, targets.length).reduce((sum, v) => sum + v * v, 0) / targets.length);
        const unsnappedRms = forwardRms(await evaluate(best.x));
        let finalValues = snapped;
        let finalRms = forwardRms(await evaluate(snapped));
        // Rounding to the slider's step can spoil a fit (a small b); then the exact values stay.
        if (finalRms > unsnappedRms + 2.5) { finalValues = best.x; finalRms = unsnappedRms; }
        // Show the answer as motion: back to where the graph was, then glide into the sketch.
        await settle(start);
        container.style.opacity = '';
        await new Promise<void>(resolve => { tween(active.map((index, k) => ({key: keys[index], from: start[index], to: finalValues[k]})), 'to', 1000, resolve); });
        // Two parameters whose effects on the curve are (almost) parallel trade off: many pairs draw the same curve.
        const twins: [string, string][] = [];
        const g = best.normal;
        for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
            const correlation = Math.abs(g[i][j]) / Math.sqrt(g[i][i] * g[j][j] || 1);
            if (correlation > 0.985) twins.push([entries[i].label, entries[j].label]);
        }
        const changed = entries.map((entry, k) => ({entry, value: finalValues[k]})).filter(({entry, value}) => Math.abs((before.current.get(entry.key) ?? value) - value) > 1e-9);
        setResult({values: changed.length > 0 ? changed : entries.map((entry, k) => ({entry, value: finalValues[k]})), error: finalRms, twins});
        setPhase('done');
        setMessage('');
    };

    const svgPoint = (event: React.PointerEvent): Vec => {
        const b = board();
        const svg = b && root(b);
        const rect = svg?.getBoundingClientRect();
        if (rect) svgOffset.current = [rect.left - (props.frame.current?.getBoundingClientRect().left ?? 0), rect.top - (props.frame.current?.getBoundingClientRect().top ?? 0)];
        return rect ? [event.clientX - rect.left, event.clientY - rect.top] : [0, 0];
    };
    const down = (event: React.PointerEvent) => {
        if (event.button !== 0) return;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        setStroke([svgPoint(event)]);
    };
    const move = (event: React.PointerEvent) => {
        if (!(event.buttons & 1) && event.pointerType === 'mouse') return;
        if (stroke.length === 0) return;
        const p = svgPoint(event);
        setStroke(current => {
            const last = current[current.length - 1];
            return last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 3 ? current : [...current, p];
        });
    };
    const up = () => {
        if (stroke.length < 6) { setStroke([]); return; }
        void fit(stroke);
    };
    const undim = () => { const b = board(); if (b) (b as unknown as {containerObj: HTMLElement}).containerObj.style.opacity = ''; };
    const undo = () => {
        cancelled.current = true;
        undim();
        for (const [key, value] of before.current) getParam(key)?.set(value);
        setPhase('idle');
        setStroke([]);
        setResult(undefined);
    };
    const close = () => { cancelled.current = true; undim(); setPhase('idle'); setStroke([]); setResult(undefined); setMessage(''); };

    if (usable.length === 0 && phase === 'idle') return null;
    const bottom = uxEnabled('a10') ? 112 : 64;
    const path = stroke.map((p, i) => `${i ? 'L' : 'M'}${(p[0] + svgOffset.current[0]).toFixed(1)} ${(p[1] + svgOffset.current[1]).toFixed(1)}`).join(' ');
    return <>
        {phase !== 'idle' && <svg className="ux-fit-layer" aria-hidden="true"><path d={path} className={phase === 'done' ? 'is-done' : ''}/></svg>}
        {phase === 'drawing' && <div className="ux-fit-capture" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>}
        {phase === 'idle' && <button type="button" className="ux-fit-start" style={{bottom}} disabled={locked}
            title={locked ? 'Med razlago je graf zaklenjen' : 'Nariši krivuljo, Bezeg poišče parametre'} onClick={() => { setStroke([]); setPhase('drawing'); }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 15 C 6 4, 9 4, 11 10 S 15 16, 17 6"/><path d="M14.5 3.5 l2 2 -7 7 -2.6.6.6-2.6z" className="pen"/></svg>
            Nariši in najdi
        </button>}
        {phase !== 'idle' && <div className={`ux-fit-card is-${phase}`} role="status">
            {phase === 'drawing' && <p><strong>Nariši krivuljo</strong> z eno potezo — Bezeg bo poiskal parametre, pri katerih gre graf skozi tvojo skico.</p>}
            {phase === 'fitting' && <p className="ux-fit-busy"><span className="ux-fit-spinner" aria-hidden="true"/>{message}</p>}
            {phase === 'failed' && <p>{message}</p>}
            {phase === 'done' && result && <>
                <p><strong>Tvoja skica:</strong> {result.values.map(({entry}, i) => <span key={entry.key} className="ux-fit-value">{i > 0 ? ' · ' : ''}<i>{splitLabel(entry.label).symbol ?? entry.label}</i> ≈ {entry.format(Number((getParam(entry.key)?.value ?? entry.value).toPrecision(2)))}</span>)}</p>
                {result.twins.length > 0 && <p className="ux-fit-twins">{result.twins.map(([a, b]) => `${splitLabel(a).symbol ?? a} in ${splitLabel(b).symbol ?? b}`).join('; ')}: ta dva parametra tu delujeta enako, zato isto krivuljo da več parov vrednosti.</p>}
                <p className="ux-fit-quality">{result.error < 6 ? 'Graf gre lepo skozi skico.' : result.error < 18 ? 'Graf se skici približa, a je ne ujame povsem.' : 'Te oblike ta graf ne zmore — poglej, kaj je najbližje.'} <small>(povprečni odmik {result.error.toFixed(0)} px)</small></p>
            </>}
            <div className="ux-fit-actions">
                {(phase === 'done' || phase === 'failed') && <button type="button" onClick={() => { setStroke([]); setResult(undefined); setPhase('drawing'); }}>Nariši znova</button>}
                {(phase === 'done' || phase === 'fitting') && <button type="button" onClick={undo}>Vrni graf</button>}
                <button type="button" aria-label="Zapri" onClick={close}>×</button>
            </div>
        </div>}
    </>;
}
