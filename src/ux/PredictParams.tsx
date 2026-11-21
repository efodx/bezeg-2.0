import React, {useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {currentParams, getParam, observeParamChanges, splitLabel, type ParamEntry} from './paramRegistry';
import {drawn, meaningful, signature, tween} from './YourTurn';
import {settle} from './family';
import './PredictParams.css';

/**
 * a16 — Your prediction in numbers (with a5). After the learner has sketched a prediction and the step has changed the
 * graph, Bezeg asks which values of the changed parameters the sketch stands for: it searches those parameters on the
 * real board until the curve runs through the sketch, then the learner flips between "your prediction" (d ≈ 0,8) and
 * "the lesson" (d = 1) and sees both graphs and both numbers. A wrong prediction becomes a specific misconception
 * ("you shifted by −1 instead of +1"). Generic: the step's changed parameters come from the shared slider registry, the
 * curves from a5's own check, the search is a plain grid-and-refine over at most two parameters.
 */

type Vec = [number, number];
interface Fit { keys: string[]; lesson: number[]; predicted: number[]; error: number; alt?: {key: string; value: number; lessonValue: number; error: number} }

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);

function samples(node: SVGGeometryElement, count: number): Vec[] {
    let length = 0;
    try { length = node.getTotalLength(); } catch { return []; }
    if (!(length > 0)) return [];
    return Array.from({length: count + 1}, (_, i) => { const p = node.getPointAtLength(length * i / count); return [p.x, p.y] as Vec; });
}

export function PredictParams(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [offer, setOffer] = useState<{sketch: Vec[]; ids: string[]; keys: string[]; from: number[]}>();
    const [phase, setPhase] = useState<'offer' | 'fitting' | 'shown' | 'nofit'>('offer');
    const [fit, setFit] = useState<Fit>();
    const [showing, setShowing] = useState<'predicted' | 'lesson'>('lesson');
    const stable = useRef(new Map<string, number>());
    const burstFrom = useRef(new Map<string, number>());
    const inBurst = useRef(false);
    const timer = useRef(0);
    const stop = useRef<() => void>();

    // Values before the latest burst of changes (a step's Next changes its parameters together).
    useEffect(() => {
        for (const entry of currentParams()) stable.current.set(entry.key, entry.value);
        const off = observeParamChanges((previous, next) => {
            if (!inBurst.current) {
                inBurst.current = true;
                burstFrom.current = new Map(stable.current);
            }
            if (!burstFrom.current.has(previous.key)) burstFrom.current.set(previous.key, previous.value);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => {
                inBurst.current = false;
                for (const entry of currentParams()) stable.current.set(entry.key, entry.value);
            }, 700);
            void next;
        });
        return () => { off(); window.clearTimeout(timer.current); };
    }, []);

    const restore = () => {
        stop.current?.();
        if (fit && offer) for (const target of states(fit)) getParam(target.key)?.setFromLesson(target.to);
    };

    useEffect(() => {
        const predicted = (event: Event) => {
            const detail = (event as CustomEvent<{sketch: Vec[]; ids: string[]}>).detail;
            const changed = currentParams().filter(entry => meaningful(entry) && burstFrom.current.has(entry.key) && burstFrom.current.get(entry.key) !== entry.value);
            if (changed.length === 0 || changed.length > 2 || detail.sketch.length < 4) return;
            setFit(undefined);
            setPhase('offer');
            setOffer({sketch: detail.sketch, ids: detail.ids, keys: changed.map(entry => entry.key), from: changed.map(entry => burstFrom.current.get(entry.key)!)});
        };
        const cleared = () => { setOffer(undefined); setFit(undefined); };
        window.addEventListener('ux-predicted', predicted);
        window.addEventListener('ux-predicted-clear', cleared);
        return () => { window.removeEventListener('ux-predicted', predicted); window.removeEventListener('ux-predicted-clear', cleared); };
    }, []);

    // A new frame of the lesson ends the comparison and gives the lesson its values back.
    useEffect(() => {
        if (!fit) return;
        let last = document.querySelector('.guided-lesson-progress')?.textContent;
        const observer = new MutationObserver(() => {
            const now = document.querySelector('.guided-lesson-progress')?.textContent;
            if (now !== last) { last = now; stop.current?.(); setOffer(undefined); setFit(undefined); }
        });
        observer.observe(document.body, {subtree: true, childList: true, characterData: true});
        return () => observer.disconnect();
    }, [fit]);

    const run = async () => {
        const b = findBoard(props.frame.current);
        if (!b || !offer) return;
        setPhase('fitting');
        const keys = offer.keys;
        const entries = keys.map(key => getParam(key)!);
        const lesson = entries.map(entry => entry.value);
        const sketch = offer.sketch.filter((_, i) => i % Math.max(1, Math.floor(offer.sketch.length / 60)) === 0);
        const xs = sketch.map(p => p[0]), ys = sketch.map(p => p[1]);
        const region = [Math.min(...xs) - 30, Math.min(...ys) - 30, Math.max(...xs) + 30, Math.max(...ys) + 30];
        const nearest = (p: Vec, cloud: Vec[]) => {
            let best = Infinity;
            for (const q of cloud) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < best) best = d; }
            return Math.sqrt(best);
        };
        // Two-way distance: the sketch near the curve, and the curve inside the sketch's region near the sketch.
        const objects = () => (b as unknown as {objectsList: {id: string; rendNode?: SVGElement}[]}).objectsList;
        let ids = offer.ids;
        const error = async (which: string[], values: number[]) => {
            await settle(b, which, values);
            const parts = objects().filter(object => ids.includes(object.id) && object.rendNode instanceof SVGGeometryElement)
                .map(object => samples(object.rendNode as unknown as SVGGeometryElement, 160)).filter(part => part.length > 0);
            const curve = parts.flat();
            if (curve.length === 0) return 1e6;
            const there = sketch.reduce((sum, p) => sum + nearest(p, curve), 0) / sketch.length;
            // The way back is judged on the one object the sketch follows best (a bell sketched over bars and a
            // normal curve should match the curve, not be punished by the bar outlines).
            let back = 120;
            for (const part of parts) {
                const inside = part.filter(([x, y]) => x >= region[0] && x <= region[2] && y >= region[1] && y <= region[3]);
                if (inside.length >= 4) back = Math.min(back, inside.reduce((sum, p) => sum + nearest(p, sketch), 0) / inside.length);
            }
            return there + 0.5 * back;
        };
        const container = (b as unknown as {containerObj: HTMLElement}).containerObj;
        container.style.transition = 'opacity 140ms ease';
        container.style.opacity = '0.15';
        const snap = (entry: ParamEntry, v: number) => {
            const c = Math.min(entry.max, Math.max(entry.min, v));
            return entry.step > 0 ? Number((Math.round((c - entry.min) / entry.step) * entry.step + entry.min).toPrecision(12)) : c;
        };
        // A time budget: some boards (hundreds of bars) take tens of milliseconds per look.
        const started = performance.now();
        const late = () => performance.now() - started > 7000;
        /**
         * Coarse grid over a window (25 values for one parameter, 11 × 11 for two), then a shrinking pattern search. The
         * window spans the step's own change three times over, so a heavy board is not drawn at extreme values.
         */
        const search = async (which: ParamEntry[], windows: [number, number][]) => {
            const ids = which.map(entry => entry.key);
            let best = which.map(entry => entry.value), bestError = Infinity;
            const counts = which.length === 1 ? [25] : [11, 11];
            const grids = which.map((entry, k) => [...new Set(Array.from({length: counts[k]}, (_, i) => snap(entry, windows[k][0] + (windows[k][1] - windows[k][0]) * i / (counts[k] - 1))))]);
            const combos = which.length === 1 ? grids[0].map(v => [v]) : grids[0].flatMap(x => grids[1].map(y => [x, y]));
            for (const values of combos) {
                if (late()) break;
                const e = await error(ids, values);
                if (e < bestError) { bestError = e; best = values; }
            }
            let reach = which.map((entry, k) => (windows[k][1] - windows[k][0]) / (counts[k] - 1));
            for (let round = 0; round < 14 && !late(); round++) {
                let improved = false;
                for (let k = 0; k < which.length; k++) for (const sign of [1, -1]) {
                    const probe = [...best];
                    probe[k] = snap(which[k], best[k] + sign * reach[k]);
                    if (probe[k] === best[k]) continue;
                    const e = await error(ids, probe);
                    if (e < bestError - 1e-6) { bestError = e; best = probe; improved = true; }
                }
                if (!improved) reach = reach.map((r, k) => Math.max(which[k].step || 1e-6, r / 2));
            }
            return {values: best, error: bestError};
        };
        let result: Fit | undefined;
        const others = currentParams().filter(entry => meaningful(entry) && !entry.inert && entry.unavailable === undefined && !keys.includes(entry.key));
        try {
            const around = (entry: ParamEntry, a: number, b: number): [number, number] => {
                const span = Math.max(3 * Math.abs(b - a), (entry.max - entry.min) * 0.15);
                const mid = (a + b) / 2;
                return [Math.max(entry.min, mid - span), Math.min(entry.max, mid + span)];
            };
            const main = await search(entries, entries.map((entry, k) => around(entry, offer.from[k], lesson[k])));
            result = {keys, lesson, predicted: main.values, error: main.error};
            await settle(b, keys, lesson);
            // A sketch the changed parameters cannot draw: maybe the learner expected a different parameter to change.
            if (main.error > 10) {
                await settle(b, keys, offer.from);
                for (const other of others) {
                    if (late()) break;
                    const start = other.value;
                    // The curves this parameter moves (a nudge of 5 %), not the ones the step moved.
                    const look = () => new Map(drawn(b).map(object => [object.id, signature(object.rendNode!)]));
                    const before = look();
                    await settle(b, [other.key], [start + (start + (other.max - other.min) * 0.05 <= other.max ? 1 : -1) * (other.max - other.min) * 0.05]);
                    const after = look();
                    ids = [...after].filter(([id, sig]) => before.has(id) && before.get(id) !== sig).map(([id]) => id);
                    await settle(b, [other.key], [start]);
                    if (ids.length === 0) continue;
                    const alone = await search([getParam(other.key)!], [around(other, start, start)]);
                    await settle(b, [other.key], [start]);
                    if (alone.error < Math.min(20, 0.6 * (result.alt?.error ?? main.error))) result.alt = {key: other.key, value: alone.values[0], lessonValue: start, error: alone.error};
                }
            }
        } finally {
            await settle(b, keys, lesson);
            container.style.opacity = '';
        }
        // A prediction that does not fit any curve of this family is better left unscored than overread.
        if (!result || (result.error > 60 && !result.alt)) { setPhase('nofit'); return; }
        setFit(result);
        setPhase('shown');
        show('predicted', result);
    };

    /** The two states being compared: the learner's (sketch) and the lesson's. */
    const states = (f: Fit) => {
        const all = f.alt ? [...f.keys, f.alt.key] : f.keys;
        const mine = f.alt ? [...offer!.from, f.alt.value] : f.predicted;
        const theirs = f.alt ? [...f.lesson, f.alt.lessonValue] : f.lesson;
        return all.map((key, i) => ({key, from: mine[i], to: theirs[i]}));
    };

    const show = (which: 'predicted' | 'lesson', f: Fit | undefined = fit) => {
        if (!f) return;
        stop.current?.();
        setShowing(which);
        stop.current = tween(states(f), which === 'lesson' ? 'to' : 'from', 650, () => undefined);
    };

    const close = () => { restore(); setOffer(undefined); setFit(undefined); };

    if (!offer) return null;
    const format = (key: string, value: number) => { const e = getParam(key); return e ? e.format(Number(value.toPrecision(3))) : String(value); };
    const symbol = (key: string) => { const e = getParam(key); return e ? symbolOf(e) : key; };
    const describe = (f: Fit) => f.keys.map((key, i) => {
        const entry = getParam(key);
        const from = offer.from[i], lesson = f.lesson[i], predicted = f.predicted[i];
        // Close enough: within 15 % of the lesson's own change (and never finer than the slider's step).
        const tol = entry ? Math.max(entry.step, 0.15 * Math.abs(lesson - from), (entry.max - entry.min) * 0.004) : 0;
        if (Math.abs(predicted - lesson) <= tol) return `${symbol(key)}: zadel si.`;
        const lessonUp = lesson > from, predictedUp = predicted > from;
        if (Math.abs(predicted - from) <= tol) return `${symbol(key)}: napoved ga ni spremenila, lekcija pa ${lessonUp ? 'poveča' : 'zmanjša'}.`;
        if (lessonUp !== predictedUp) return `${symbol(key)}: napovedal si nasprotno smer.`;
        return `${symbol(key)}: prava smer, ${Math.abs(predicted - from) > Math.abs(lesson - from) ? 'a preveč' : 'a premalo'}.`;
    }).join(' ');

    return <div className="ux-pp" role="status">
        {phase === 'offer' && <button type="button" className="ux-pp-ask" onClick={() => void run()}>
            <span aria-hidden="true">≈</span> Kateri {offer.keys.length > 1 ? 'vrednosti' : 'vrednost'} {offer.keys.map(key => <i key={key}>{symbol(key)}</i>)} si napovedal?
        </button>}
        {phase === 'nofit' && <p className="ux-pp-busy">Te oblike ne nariše noben parameter tega grafa — skica ostane kot risba.
            <button type="button" className="ux-pp-close is-inline" onClick={() => setOffer(undefined)} aria-label="Zapri">×</button></p>}
        {phase === 'fitting' && <p className="ux-pp-busy"><span className="ux-pp-spinner" aria-hidden="true"/>Iščem vrednosti tvoje napovedi …</p>}
        {phase === 'shown' && fit && <div className="ux-pp-card">
            <div className="ux-pp-switch" role="group" aria-label="Primerjaj">
                <button type="button" aria-pressed={showing === 'predicted'} onClick={() => show('predicted')}>
                    <small>Tvoja napoved</small>
                    {fit.alt ? <span><i>{symbol(fit.alt.key)}</i> ≈ {format(fit.alt.key, fit.alt.value)}</span>
                        : fit.keys.map((key, i) => <span key={key}><i>{symbol(key)}</i> ≈ {format(key, fit.predicted[i])}</span>)}
                </button>
                <button type="button" aria-pressed={showing === 'lesson'} onClick={() => show('lesson')}>
                    <small>Lekcija</small>
                    {fit.keys.map((key, i) => <span key={key}><i>{symbol(key)}</i> = {format(key, fit.lesson[i])}</span>)}
                </button>
            </div>
            <p className="ux-pp-verdict">{fit.alt
                ? <>Tvoja skica ustreza spremembi <i>{symbol(fit.alt.key)}</i>, lekcija pa je spremenila {fit.keys.map(key => <i key={key}>{symbol(key)}</i>)}. Preklopi in primerjaj, kaj naredi vsak.</>
                : <>{describe(fit)}{fit.error > 14 && ` Skica se grafu le približa (povprečni odmik ${fit.error.toFixed(0)} px).`}</>}</p>
            <button type="button" className="ux-pp-close" onClick={close} aria-label="Zapri primerjavo">×</button>
        </div>}
    </div>;
}
