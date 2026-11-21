import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {getParam, observeParamChanges, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {PRESENTATION_LABEL, Puck, Tape} from './ParamPucks';
import './YourTurn.css';

/**
 * a8 — Your turn. When a lesson step moves the graph (Next, a step's action), the board offers to hand the step over:
 * the change rewinds, the new state stays on the board as a dashed target, and the learner rebuilds it with only the
 * knobs the step touched. The target warms from ochre to green as the learner closes in; a hit blooms. Nothing is
 * lesson-specific: the step's before and after come from the shared parameter registry, the target from the board's SVG.
 */

const GEOMETRY_ATTRIBUTES = ['d', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'points'];
const SKIPPED_TYPES = new Set([5, 18, 24]);
const DRAWN_TAGS = ['path', 'line', 'ellipse', 'circle', 'polygon', 'rect'];
type BoardObject = {id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean}};

function signature(node: Element): string {
    let out = node.tagName;
    for (const name of GEOMETRY_ATTRIBUTES) {
        const value = node.getAttribute(name);
        if (value !== null) out += `|${value}`;
    }
    return out;
}

function drawn(board: Board): BoardObject[] {
    return ((board as unknown as {objectsList: BoardObject[]}).objectsList).filter(object => object.rendNode && object.visPropCalc?.visible
        && !SKIPPED_TYPES.has(object.type) && object.elType !== 'axis' && object.elType !== 'text' && object.elType !== 'ticks'
        && DRAWN_TAGS.includes(object.rendNode.tagName.toLowerCase()));
}

function meaningful(entry: ParamEntry | undefined): entry is ParamEntry {
    return !!entry && entry.max > entry.min && !entry.display && !PRESENTATION_LABEL.test(entry.label);
}

function tolerance(entry: ParamEntry) {
    const span = entry.max - entry.min;
    return entry.step >= 1 ? entry.step * 0.5 : Math.max(entry.step * 1.5, span * 0.008);
}

function distance(entry: ParamEntry, a: number, b: number) {
    const d = Math.abs(a - b);
    return entry.cyclic === undefined ? d : Math.min(d, entry.cyclic - d);
}

function mix(a: number[], b: number[], t: number) {
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

interface Target { key: string; from: number; to: number }
interface Pending { from: Map<string, number>; armedAt: number; lastChange: number }
type Phase = 'rewinding' | 'playing' | 'solved' | 'revealed';

function tween(targets: Target[], toward: 'from' | 'to', duration: number, done: () => void): () => void {
    const start = performance.now();
    const origin = new Map(targets.map(target => [target.key, getParam(target.key)?.value ?? target[toward === 'to' ? 'from' : 'to']]));
    let raf = 0;
    const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        for (const target of targets) {
            const entry = getParam(target.key);
            if (!entry) continue;
            const a = origin.get(target.key)!, b = target[toward];
            const raw = a + (b - a) * eased;
            entry.setFromLesson(t >= 1 ? b : entry.step >= 1 ? Math.round((raw - entry.min) / entry.step) * entry.step + entry.min : raw);
        }
        if (t < 1) raf = requestAnimationFrame(step); else done();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
}

function Bloom() {
    // Elderflower florets: five cream petals round a yellow eye, thrown out from the middle of the board.
    const florets = Array.from({length: 14}, (_, i) => {
        const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.3;
        const reach = 70 + (i * 37) % 90;
        return <svg key={i} className="ux-bloom-floret" viewBox="-10 -10 20 20" aria-hidden="true"
            style={{'--dx': `${Math.cos(angle) * reach}px`, '--dy': `${Math.sin(angle) * reach}px`, '--delay': `${(i % 5) * 40}ms`, '--size': `${14 + (i * 7) % 12}px`} as React.CSSProperties}>
            {[0, 1, 2, 3, 4].map(p => <ellipse key={p} cx="0" cy="-4.6" rx="3.3" ry="4.4" transform={`rotate(${p * 72})`}/>)}
            <circle r="2.3"/>
        </svg>;
    });
    return <div className="ux-bloom" aria-hidden="true">{florets}</div>;
}

export function YourTurn(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const [offer, setOffer] = useState<Target[]>();
    const [targets, setTargets] = useState<Target[]>();
    const [phase, setPhase] = useState<Phase>('rewinding');
    const [scrub, setScrub] = useState<{key: string; value: number; fine: string; pxPerRange: number; detent: boolean}>();
    const [width, setWidth] = useState(600);
    const [result, setResult] = useState('');
    const [holding, setHolding] = useState(false);
    const pending = useRef<Pending>();
    const ghost = useRef<SVGGElement>();
    const started = useRef(0);
    const stopTween = useRef<() => void>(() => undefined);
    const targetsRef = useRef<Target[]>();
    targetsRef.current = targets;

    const clearGhost = () => { ghost.current?.remove(); ghost.current = undefined; };
    /** Leaves the lesson exactly where it put the graph. */
    const settle = () => {
        stopTween.current();
        for (const target of targetsRef.current ?? []) getParam(target.key)?.setFromLesson(target.to);
        clearGhost();
        setTargets(undefined);
        setScrub(undefined);
    };
    const settleRef = useRef(settle);
    settleRef.current = settle;

    useLayoutEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        const resize = new ResizeObserver(() => setWidth(frame.getBoundingClientRect().width));
        resize.observe(frame);
        return () => resize.disconnect();
    }, [props.frame]);

    // Watch lesson steps: a click on a lesson button arms; parameter changes in the next moments are the step's doing.
    useEffect(() => {
        const arm = (event: Event) => {
            const target = event.target as Element | null;
            if (!target?.closest('.guided-lesson button, .guided-lesson-tab')) return;
            if (targetsRef.current) settleRef.current();
            setOffer(undefined);
            const now = performance.now();
            pending.current = {from: new Map(), armedAt: now, lastChange: now};
        };
        const unobserve = observeParamChanges((previous, next) => {
            const step = pending.current;
            if (!step) return;
            const now = performance.now();
            if (now - step.armedAt < 700 && !step.from.has(next.key)) step.from.set(next.key, previous.value);
            step.lastChange = now;
        });
        const timer = window.setInterval(() => {
            const step = pending.current;
            if (!step) return;
            const now = performance.now();
            if (now - step.armedAt > 6000) { pending.current = undefined; return; }
            if (now - step.lastChange < 380 || now - step.armedAt < 520) return;
            pending.current = undefined;
            const moved: Target[] = [];
            for (const [key, from] of step.from) {
                const entry = getParam(key);
                if (!meaningful(entry) || entry.inert && entry.unavailable) continue;
                if (distance(entry, entry.value, from) > tolerance(entry)) moved.push({key, from, to: entry.value});
            }
            if (moved.length > 0) setOffer(moved);
        }, 120);
        document.addEventListener('click', arm, true);
        document.addEventListener('keydown', arm, true);
        return () => {
            document.removeEventListener('click', arm, true);
            document.removeEventListener('keydown', arm, true);
            window.clearInterval(timer);
            unobserve();
            settleRef.current();
        };
    }, []);

    const begin = () => {
        if (!offer) return;
        const board = findBoard(props.frame.current);
        setOffer(undefined);
        if (!board) return;
        const renderer = (board as unknown as {renderer: {svgRoot?: SVGSVGElement; layer?: SVGGElement[]}}).renderer;
        const root = renderer.svgRoot;
        if (!root) return;
        // The target is what the board shows now; keep a copy of every drawn element, and later only those the rewind moves.
        const copies = drawn(board).map(object => ({object, sig: signature(object.rendNode!), clone: object.rendNode!.cloneNode(false) as SVGElement}));
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'ux-target-ghost');
        group.setAttribute('pointer-events', 'none');
        const anchor = renderer.layer?.[2] ?? null;
        root.insertBefore(group, anchor && anchor.parentNode === root ? anchor : root.firstChild?.nextSibling ?? null);
        clearGhost();
        ghost.current = group;
        const reveal = () => {
            for (const copy of copies) {
                if (copy.clone.parentNode || !copy.object.rendNode || signature(copy.object.rendNode) === copy.sig) continue;
                const clone = copy.clone;
                clone.removeAttribute('id');
                clone.removeAttribute('class');
                clone.removeAttribute('style');
                const point = copy.object.elType === 'point' || copy.object.elType === 'glider';
                clone.setAttribute('fill', point ? 'currentColor' : 'none');
                clone.setAttribute('data-kind', point ? 'point' : 'line');
                group.appendChild(clone);
            }
        };
        const chosen = offer;
        setTargets(chosen);
        setPhase('rewinding');
        setResult('');
        stopTween.current = tween(chosen, 'from', 650, () => {
            window.setTimeout(() => { reveal(); started.current = performance.now(); setPhase('playing'); }, 90);
        });
        // Points and curves that move during the rewind appear as the target while the graph travels back.
        let checks = 0;
        const progressive = window.setInterval(() => { reveal(); if (++checks > 10) window.clearInterval(progressive); }, 70);
    };

    // Judge the learner's state on every parameter change.
    const live = targets?.map(target => ({target, entry: getParam(target.key)})).filter((item): item is {target: Target; entry: ParamEntry} => !!item.entry);
    const hits = live?.map(({target, entry}) => distance(entry, entry.value, target.to) <= tolerance(entry)) ?? [];
    const warmth = live && live.length > 0 ? live.reduce((sum, {target, entry}) => sum + Math.max(0, 1 - distance(entry, entry.value, target.to) / Math.max(distance(entry, target.from, target.to), tolerance(entry))), 0) / live.length : 0;
    // A hit counts when the hand lets go on it (or a key lands on it), so passing through the target mid-drag does not end the turn.
    const solved = phase === 'playing' && !holding && hits.length > 0 && hits.every(Boolean);
    useEffect(() => {
        if (ghost.current) ghost.current.style.color = phase === 'solved' ? '#2f7a4b' : mix([184, 138, 67], [47, 122, 75], Math.pow(warmth, 1.6));
    }, [warmth, phase]);
    useEffect(() => {
        if (!solved || !targets) return;
        for (const target of targets) getParam(target.key)?.setFromLesson(target.to);
        const seconds = Math.max(1, Math.round((performance.now() - started.current) / 1000));
        setResult(`Zadeto v ${seconds} s.`);
        setPhase('solved');
        try { navigator.vibrate?.([12, 40, 18]); } catch { /* not supported */ }
        ghost.current?.classList.add('is-hit');
        const timer = window.setTimeout(() => { clearGhost(); setTargets(undefined); }, 2600);
        return () => window.clearTimeout(timer);
    }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps

    const show = () => {
        if (!targets) return;
        stopTween.current();
        setPhase('revealed');
        setResult('Tako gre — naslednjič poskusi sam.');
        stopTween.current = tween(targets, 'to', 1100, () => {
            window.setTimeout(() => { clearGhost(); setTargets(undefined); }, 1600);
        });
    };

    const frameElement = props.frame.current;
    useEffect(() => {
        frameElement?.classList.toggle('ux-yourturn-active', !!targets);
        return () => frameElement?.classList.remove('ux-yourturn-active');
    }, [targets, frameElement]);

    const names = (list: Target[]) => list.map(target => {
        const entry = getParam(target.key);
        return entry ? splitLabel(entry.label).symbol ?? entry.label : '';
    }).filter(Boolean);

    if (offer && !targets) {
        return <div className="ux-turn-offer" role="status">
            <button type="button" className="ux-turn-go" onClick={begin}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10 a5 5 0 1 0 1.6 -3.7"/><path d="M5 3.6 V7 H8.4"/></svg>
                <span><strong>Ti na vrsti</strong><small>Korak je spremenil {names(offer).map((name, i) => <React.Fragment key={i}>{i > 0 && ', '}<i>{name}</i></React.Fragment>)} — naredi ga sam</small></span>
            </button>
            <button type="button" className="ux-turn-close" aria-label="Ne zdaj" onClick={() => setOffer(undefined)}>×</button>
        </div>;
    }
    if (!targets) return null;
    const scrubbed = scrub && live?.find(item => item.target.key === scrub.key);
    return <div className={`ux-turn-panel is-${phase}`} role="group" aria-label="Ti na vrsti">
        {phase === 'solved' && <Bloom/>}
        <div className="ux-turn-card">
            <p className="ux-turn-title">
                {phase === 'solved' || phase === 'revealed' ? <strong>{result}</strong>
                    : <><strong>Ti na vrsti.</strong> Pripelji graf do črtkane slike{live && live.length > 1 ? ` — ${hits.filter(Boolean).length} od ${live.length} že drži` : ''}.</>}
            </p>
            <div className="ux-turn-row" onPointerDownCapture={() => {
                setHolding(true);
                window.addEventListener('pointerup', () => setHolding(false), {once: true});
                window.addEventListener('pointercancel', () => setHolding(false), {once: true});
            }}>
                {live?.map(({target, entry}, i) => {
                    const free = {...entry, inert: false, unavailable: undefined, set: entry.setFromLesson};
                    return <div key={target.key + (phase === 'rewinding' ? '-r' : '')} className={`ux-turn-knob${hits[i] ? ' is-hit' : ''}`}>
                        <Puck entry={free} locked={phase !== 'playing'} boardWidth={width} oscillating={false} showOscillator={false}
                            onScrub={state => setScrub(state && {key: target.key, ...state})}/>
                    </div>;
                })}
                {phase === 'playing' && <>
                    <button type="button" className="ux-turn-show" onClick={show}>Pokaži</button>
                    <button type="button" className="ux-turn-close" aria-label="Opusti in nadaljuj z lekcijo" onClick={settle}>×</button>
                </>}
            </div>
        </div>
        {scrubbed && scrub && <Tape entry={scrubbed.entry} value={scrub.value} fineLabel={scrub.fine} width={Math.min(width - 24, 720)} pxPerRange={scrub.pxPerRange} detent={scrub.detent}/>}
    </div>;
}
