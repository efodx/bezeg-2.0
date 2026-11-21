import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {getParam, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {Puck, Tape} from './ParamPucks';
import {Bloom, distance, drawn, meaningful, mix, signature, tolerance, tween, type Target} from './YourTurn';
import './YourTurn.css';
import './GraphGame.css';

/**
 * a10 — Hit the graph. Any graph becomes a practice game: a dashed target appears (the same graph at hidden parameter
 * values) and the learner brings the live graph onto it with whatever hands they like — the knobs in the game card,
 * the inspector, the board pucks (a1) or grabbing the curve (a4). The first rounds name the one parameter that moved;
 * later rounds show every knob, so the learner has to read the difference ("it is narrower, so a") and then two or three
 * parameters at once. Generic: targets are random nice values of registered parameters, the ghost is the board's own SVG.
 */

type Phase = 'capturing' | 'playing' | 'solved' | 'revealed';
interface Round { number: number; targets: Target[]; fixed: Target[]; knobs: string[]; started: number }

const frames = (n = 1) => new Promise<void>(resolve => {
    const step = (left: number) => requestAnimationFrame(() => left <= 1 ? resolve() : step(left - 1));
    step(n);
});

async function settledAt(targets: Target[], toward: 'from' | 'to') {
    for (let i = 0; i < 40; i++) {
        if (targets.every(target => {
            const entry = getParam(target.key);
            return !entry || Math.abs(entry.value - target[toward]) < 1e-9;
        })) break;
        await frames();
    }
    await frames(2);
}

function niceStep(raw: number, step: number) {
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = [1, 2, 2.5, 5, 10].map(f => f * power).find(v => v >= raw * 0.999) ?? 10 * power;
    return Math.max(step, Math.round(nice / step) * step);
}

/** A nice value well away from the current one. */
function pickTarget(entry: ParamEntry): number {
    const span = entry.max - entry.min;
    const grid = niceStep(span / 16, entry.step);
    const far = Math.max(tolerance(entry) * 3, span * 0.12);
    const base = entry.cyclic === undefined ? entry.min : 0;
    const top = entry.cyclic === undefined ? entry.max : entry.cyclic - grid;
    const count = Math.floor((top - base) / grid + 1e-9);
    for (let tries = 0; tries < 40; tries++) {
        const value = Number((base + grid * Math.floor(Math.random() * (count + 1))).toFixed(10));
        if (distance(entry, value, entry.value) >= far) return value;
    }
    return entry.value <= (entry.min + entry.max) / 2 ? entry.max : entry.min;
}

/** Most of an element is on the board: a point inside it, a path with at least 40 % of its samples inside. */
function onView(node: SVGElement, view: {width: number; height: number}): boolean {
    const inside = (x: number, y: number) => x >= 4 && y >= 4 && x <= view.width - 4 && y <= view.height - 4;
    const tag = node.tagName.toLowerCase();
    if (tag === 'ellipse' || tag === 'circle') {
        const x = Number(node.getAttribute('cx')), y = Number(node.getAttribute('cy'));
        const r = Number(node.getAttribute('rx') ?? node.getAttribute('r') ?? 0);
        // A large circle (a construction circle) only needs to cross the board; a point has to sit on it.
        return r > 20 ? x + r > 0 && y + r > 0 && x - r < view.width && y - r < view.height : inside(x, y);
    }
    if (!(node instanceof SVGGeometryElement)) return true;
    let length = 0;
    try { length = node.getTotalLength(); } catch { return true; }
    if (!(length > 0)) return false;
    let hits = 0;
    const samples = 48;
    for (let i = 0; i <= samples; i++) {
        const point = node.getPointAtLength(length * i / samples);
        if (inside(point.x, point.y)) hits++;
    }
    return hits / (samples + 1) >= 0.4;
}

function levelOf(number: number, available: number) {
    if (number < 2) return {count: 1, named: true};
    if (number < 4 || available < 2) return {count: 1, named: false};
    if (number < 6 || available < 3) return {count: 2, named: false};
    return {count: 3, named: false};
}

export function GraphGame(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const candidates = params.filter(entry => meaningful(entry) && !(entry.inert && entry.unavailable));
    const [round, setRound] = useState<Round>();
    const [phase, setPhase] = useState<Phase>('capturing');
    const [score, setScore] = useState({points: 0, streak: 0, gained: 0});
    const [holding, setHolding] = useState(false);
    const [scrub, setScrub] = useState<{key: string; value: number; fine: string; pxPerRange: number; detent: boolean}>();
    const [width, setWidth] = useState(600);
    const ghost = useRef<SVGGElement>();
    const stopTween = useRef<() => void>(() => undefined);
    const busy = useRef(false);
    const nextTimer = useRef(0);
    /** Parameters whose change moves nothing drawn (only a text label), so they cannot make a target. */
    const blind = useRef(new Set<string>());
    const roundRef = useRef(round);
    roundRef.current = round;
    // Test hook for the lane's browser checks.
    (window as unknown as {__uxGame?: Round}).__uxGame = round;

    useLayoutEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        const resize = new ResizeObserver(() => setWidth(frame.getBoundingClientRect().width));
        resize.observe(frame);
        return () => resize.disconnect();
    }, [props.frame]);

    // Any hand on a control (inspector, pucks, grabbed curve) holds judgement until it lets go.
    useEffect(() => {
        if (!round) return;
        const down = () => setHolding(true);
        const up = () => setHolding(false);
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('pointerup', up, true);
        document.addEventListener('pointercancel', up, true);
        return () => {
            document.removeEventListener('pointerdown', down, true);
            document.removeEventListener('pointerup', up, true);
            document.removeEventListener('pointercancel', up, true);
        };
    }, [round !== undefined]); // eslint-disable-line react-hooks/exhaustive-deps

    const clearGhost = () => { ghost.current?.remove(); ghost.current = undefined; };

    const startRound = async (number: number) => {
        const board: Board | undefined = findBoard(props.frame.current);
        const available = candidates.filter(entry => getParam(entry.key) && !blind.current.has(entry.key));
        if (!board || available.length === 0 || busy.current) return;
        busy.current = true;
        clearGhost();
        const level = levelOf(number, available.length);
        const chosen = [...available].sort(() => Math.random() - 0.5).slice(0, level.count);
        const container = (board as unknown as {containerObj: HTMLElement}).containerObj;
        const root = (board as unknown as {renderer: {svgRoot?: SVGSVGElement}}).renderer.svgRoot;
        const view = {width: root?.clientWidth ?? 0, height: root?.clientHeight ?? 0};
        const before = new Map(drawn(board).map(object => [object.id, signature(object.rendNode!)]));
        // Photograph the target with the board blanked for a blink: move there, copy what moved, come back. A target
        // whose moved curves would mostly leave the board is thrown away and another one drawn.
        container.style.opacity = '0';
        let targets: Target[] = [];
        let clones: SVGElement[] = [];
        for (let attempt = 0; attempt < 8; attempt++) {
            targets = chosen.map(entry => ({key: entry.key, from: entry.value, to: pickTarget(entry)}));
            for (const target of targets) getParam(target.key)?.setFromLesson(target.to);
            await settledAt(targets, 'to');
            const moved = drawn(board).filter(object => before.get(object.id) !== undefined && before.get(object.id) !== signature(object.rendNode!));
            if (moved.length > 0 && (attempt === 7 || moved.every(object => onView(object.rendNode!, view)))) {
                clones = moved.map(object => {
                    const clone = object.rendNode!.cloneNode(false) as SVGElement;
                    clone.removeAttribute('id');
                    clone.removeAttribute('class');
                    clone.removeAttribute('style');
                    const point = object.elType === 'point' || object.elType === 'glider';
                    clone.setAttribute('fill', point ? 'currentColor' : 'none');
                    clone.setAttribute('data-kind', point ? 'point' : 'line');
                    return clone;
                });
                break;
            }
        }
        if (clones.length === 0) {
            for (const target of targets) getParam(target.key)?.setFromLesson(target.from);
            await settledAt(targets, 'from');
            container.style.opacity = '';
            busy.current = false;
            if (chosen.length === 1) { blind.current.add(chosen[0].key); void startRound(number); }
            return;
        }
        const knobs = level.named ? targets.map(target => target.key) : available.map(entry => entry.key);
        // Knobs that are not part of the answer have to stay where they are, or the graph would not match the target.
        const fixed = available.filter(entry => knobs.includes(entry.key) && !targets.some(target => target.key === entry.key)).map(entry => ({key: entry.key, from: entry.value, to: entry.value}));
        setPhase('capturing');
        setRound({number, targets, fixed, knobs, started: 0});
        for (const target of targets) getParam(target.key)?.setFromLesson(target.from);
        await settledAt(targets, 'from');
        const renderer = (board as unknown as {renderer: {layer?: SVGGElement[]}}).renderer;
        if (root) {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'ux-target-ghost is-game');
            group.setAttribute('pointer-events', 'none');
            for (const clone of clones) group.appendChild(clone);
            const anchor = renderer.layer?.[2] ?? null;
            root.insertBefore(group, anchor && anchor.parentNode === root ? anchor : root.firstChild?.nextSibling ?? null);
            ghost.current = group;
        }
        container.style.opacity = '';
        busy.current = false;
        setRound(current => current && {...current, started: performance.now()});
        setPhase('playing');
    };

    const stop = () => {
        window.clearTimeout(nextTimer.current);
        stopTween.current();
        clearGhost();
        setRound(undefined);
        setScrub(undefined);
        setScore({points: 0, streak: 0, gained: 0});
    };
    useEffect(() => () => { clearGhost(); window.clearTimeout(nextTimer.current); stopTween.current(); }, []);

    const live = round?.targets.map(target => ({target, entry: getParam(target.key)})).filter((item): item is {target: Target; entry: ParamEntry} => !!item.entry);
    const hits = live?.map(({target, entry}) => distance(entry, entry.value, target.to) <= tolerance(entry)) ?? [];
    const warmth = live && live.length > 0 ? live.reduce((sum, {target, entry}) => sum + Math.max(0, 1 - distance(entry, entry.value, target.to) / Math.max(distance(entry, target.from, target.to), tolerance(entry))), 0) / live.length : 0;
    const fixedOk = round?.fixed.every(target => {
        const entry = getParam(target.key);
        return !entry || distance(entry, entry.value, target.to) <= tolerance(entry);
    }) ?? true;
    const solved = phase === 'playing' && !holding && fixedOk && hits.length > 0 && hits.every(Boolean);
    useEffect(() => {
        if (ghost.current) ghost.current.style.color = phase === 'solved' ? '#2f7a4b' : mix([184, 138, 67], [47, 122, 75], Math.pow(warmth, 1.6));
    }, [warmth, phase]);
    useEffect(() => {
        if (!solved || !round) return;
        for (const target of [...round.targets, ...round.fixed]) getParam(target.key)?.setFromLesson(target.to);
        const seconds = (performance.now() - round.started) / 1000;
        const gained = Math.round((100 * round.targets.length + Math.max(0, 40 - seconds) * 5) * (1 + 0.25 * score.streak) / 10) * 10;
        setScore(current => ({points: current.points + gained, streak: current.streak + 1, gained}));
        setPhase('solved');
        try { navigator.vibrate?.([12, 40, 18]); } catch { /* not supported */ }
        ghost.current?.classList.add('is-hit');
        // Not tied to this effect's cleanup: the phase change below flips `solved` back and would cancel it.
        nextTimer.current = window.setTimeout(() => { void startRound(round.number + 1); }, 1500);
    }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps

    const show = () => {
        if (!round) return;
        setPhase('revealed');
        setScore(current => ({...current, streak: 0, gained: 0}));
        stopTween.current = tween([...round.targets, ...round.fixed], 'to', 1100, () => {
            nextTimer.current = window.setTimeout(() => { void startRound(round.number + 1); }, 1300);
        });
    };

    const frameElement = props.frame.current;
    useEffect(() => {
        frameElement?.classList.toggle('ux-yourturn-active', !!round);
        return () => frameElement?.classList.remove('ux-yourturn-active');
    }, [round, frameElement]);

    if (candidates.length === 0) return null;
    if (!round) {
        return <button type="button" className="ux-game-start" onClick={() => void startRound(0)} title="Na grafu se pojavi črtkana tarča — pripelji graf nanjo">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="4"/><circle cx="10" cy="10" r="1" className="dot"/></svg>
            Zadeni graf
        </button>;
    }
    const knobEntries = round.knobs.map(key => getParam(key)).filter((entry): entry is ParamEntry => !!entry);
    const hitKeys = new Set(live?.filter((_, i) => hits[i]).map(item => item.target.key));
    const named = round.knobs.length === round.targets.length && round.targets.every(target => round.knobs.includes(target.key));
    const scrubbed = scrub && knobEntries.find(entry => entry.key === scrub.key);
    const level = levelOf(round.number, candidates.length);
    let prompt: React.ReactNode;
    if (phase === 'solved') prompt = <strong className="ux-game-good">Zadetek! +{score.gained}</strong>;
    else if (phase === 'revealed') prompt = <strong>Takole. Nova tarča prihaja …</strong>;
    else if (named) prompt = <>Spremeni <i>{round.targets.map(target => splitLabel(getParam(target.key)?.label ?? '').symbol ?? '').join(', ')}</i>, da se graf pokrije s črtkano tarčo.</>;
    else prompt = <>{level.count === 1 ? 'Spremenil se je en parameter. Kateri?' : level.count === 2 ? 'Spremenila sta se dva parametra. Katera?' : 'Spremenili so se trije parametri. Kateri?'}</>;
    return <div className={`ux-turn-panel ux-game is-${phase}`} role="group" aria-label="Zadeni graf">
        {phase === 'solved' && <Bloom/>}
        <div className="ux-turn-card">
            <div className="ux-game-head">
                <span className="ux-game-round">Krog {round.number + 1}</span>
                {score.streak > 1 && <span className="ux-game-streak" title="Zaporedni zadetki">niz {score.streak}</span>}
                <span className="ux-game-points">{score.points} točk</span>
                {phase === 'playing' && <button type="button" className="ux-turn-show" onClick={show}>Pokaži</button>}
                <button type="button" className="ux-turn-close" aria-label="Končaj igro" onClick={stop}>×</button>
            </div>
            <p className="ux-turn-title">{prompt}</p>
            <div className="ux-turn-row" onPointerDownCapture={() => setHolding(true)}>
                {knobEntries.map(entry => {
                    const free = {...entry, inert: false, unavailable: undefined, set: entry.setFromLesson};
                    return <div key={`${entry.key}-${round.number}-${phase === 'capturing' ? 'c' : 'p'}`} className={`ux-turn-knob${hitKeys.has(entry.key) && named ? ' is-hit' : ''}`}>
                        <Puck entry={free} locked={phase !== 'playing'} boardWidth={width} oscillating={false} showOscillator={false}
                            onScrub={state => setScrub(state && {key: entry.key, ...state})}/>
                    </div>;
                })}
            </div>
        </div>
        {scrubbed && scrub && <Tape entry={scrubbed} value={scrub.value} fineLabel={scrub.fine} width={Math.min(width - 24, 720)} pxPerRange={scrub.pxPerRange} detent={scrub.detent}/>}
    </div>;
}
