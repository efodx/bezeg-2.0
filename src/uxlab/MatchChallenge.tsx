import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {contentElements, findMainBoard, recoverBoards, svgRoot, traced, type UxBoard} from './board';
import {bindControls} from './controls';
import {geometryKey, sampleNode, shapeDistance, type Sample} from './geometrySamples';
import {jitterCandidates, jitterCheckpoint, readLeaf, restoreGroup, type Candidates} from './jitter';
import {morphScene} from './morph';
import './uxlab.css';

type Phase = 'idle' | 'active' | 'solved' | 'revealed';

interface Round {
    target: LessonSceneCheckpoint;
    targetShapes: Sample[][];
    mode: ShapeMode;
    candidates: Candidates;
    moved: string[];
    started: number;
    hints: number;
}

const SOLVED_PX = 3.5;

function toUser(board: UxBoard, [x, y]: Sample): Sample {
    const [left, top, right, bottom] = board.getBoundingBox();
    return [left + x / board.canvasWidth * (right - left), top - y / board.canvasHeight * (top - bottom)];
}

function toScreen(board: UxBoard, [x, y]: Sample): Sample {
    const [left, top, right, bottom] = board.getBoundingBox();
    return [(x - left) / (right - left) * board.canvasWidth, (top - y) / (top - bottom) * board.canvasHeight];
}

type ShapeMode = 'traced' | 'handles';

/** Traced geometry; a graph of bare points (a point set, a hull drawn elsewhere) is matched by its handles instead. */
function shapeElements(board: UxBoard, mode: ShapeMode) {
    const handles = (element: ReturnType<typeof contentElements>[number]) => (element.elType === 'point' || element.elType === 'glider') && element.isDraggable !== false;
    return contentElements(board).filter(mode === 'traced' ? traced : handles);
}

function shapesNow(board: UxBoard, mode: ShapeMode): Sample[][] {
    return shapeElements(board, mode).map(element => sampleNode(element.rendNode!, 5)).filter(shape => shape.length > 0);
}

const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});

function storageKey() { return `bezeg-ux-b4-best:${window.location.pathname}`; }
function readBest(): number { try { return Number(window.localStorage.getItem(storageKey()) ?? 0) || 0; } catch { return 0; } }
function writeBest(value: number) { try { window.localStorage.setItem(storageKey(), String(value)); } catch { /* storage off */ } }

/** Elderflower umbels bursting from the board centre. */
export function bloom(container: HTMLElement) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.createElement('div');
    layer.className = 'ux-bloom';
    const rect = container.getBoundingClientRect();
    for (let i = 0; i < 18; i++) {
        const flower = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        flower.setAttribute('viewBox', '-10 -10 20 20');
        flower.setAttribute('class', 'ux-bloom-flower');
        flower.innerHTML = [0, 72, 144, 216, 288].map(angle => `<ellipse cx="0" cy="-4.6" rx="3.3" ry="4.4" transform="rotate(${angle})" fill="#fffbea" stroke="#e8dfb8" stroke-width=".6"/>`).join('') + '<circle r="2.4" fill="#e9c84a"/>';
        layer.appendChild(flower);
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.22 * Math.min(rect.width, rect.height) + Math.random() * 0.25 * Math.min(rect.width, rect.height);
        const size = 14 + Math.random() * 16;
        flower.style.width = flower.style.height = `${size}px`;
        flower.animate([
            {transform: 'translate(-50%, -50%) scale(.2) rotate(0deg)', opacity: 0},
            {opacity: 1, offset: 0.15},
            {transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance + 40}px)) scale(1) rotate(${(Math.random() - 0.5) * 300}deg)`, opacity: 0},
        ], {duration: 1300 + Math.random() * 500, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards'});
    }
    container.appendChild(layer);
    window.setTimeout(() => layer.remove(), 2000);
}

/**
 * Lane B b4: the current scene becomes a purple ghost, the graph is shaken to a nearby valid scene, and the learner
 * brings it back with the ordinary controls. Live closeness, hints, solution, streaks.
 */
export function MatchChallenge(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [phase, setPhase] = useState<Phase>('idle');
    const [closeness, setCloseness] = useState(0);
    const [streak, setStreak] = useState(0);
    const [best, setBest] = useState(readBest);
    const [seconds, setSeconds] = useState(0);
    const [message, setMessage] = useState('');
    const round = useRef<Round>();
    const ghost = useRef<SVGGElement>();
    const pointerDown = useRef(false);
    const distance = useRef(Infinity);
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    useEffect(() => { if (!window.__uxLesson) window.__uxLesson = {capabilities: props.capabilities, session: undefined}; }, [props.capabilities]);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    const drawGhost = useCallback(() => {
        const current = round.current;
        if (!board || !current) return;
        const svg = svgRoot(board);
        if (!svg) return;
        if (!ghost.current || !ghost.current.isConnected) {
            ghost.current = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            ghost.current.setAttribute('class', 'ux-target');
            ghost.current.setAttribute('pointer-events', 'none');
            svg.insertBefore(ghost.current, svg.firstChild);
        }
        ghost.current.innerHTML = current.targetShapes.map(shape => {
            const points = shape.map(point => toScreen(board, point));
            if (points.length === 1) return `<circle cx="${points[0][0].toFixed(1)}" cy="${points[0][1].toFixed(1)}" r="7"/>`;
            // A path with several pieces (a grid, a dashed family) is sampled across the gaps: lift the pen at big jumps.
            const jumps = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
            const usual = [...jumps].sort((a, b) => a - b)[Math.floor(jumps.length / 2)] ?? 0;
            const d = points.map((point, index) => {
                const jump = index === 0 ? Infinity : jumps[index - 1];
                return `${jump > Math.max(22, 2.5 * usual) ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`;
            }).join(' ');
            return `<path d="${d}"/>`;
        }).join('');
    }, [board]);

    const removeGhost = () => { ghost.current?.remove(); ghost.current = undefined; };

    const measure = useCallback(() => {
        const current = round.current;
        if (!board || !current) return Infinity;
        const target = current.targetShapes.map(shape => shape.map(point => toScreen(board, point)));
        const value = shapeDistance(shapesNow(board, current.mode), target);
        distance.current = value;
        setCloseness(Number.isFinite(value) ? Math.round(100 * Math.exp(-value / 28)) : 0);
        return value;
    }, [board]);

    const solve = useCallback((byHand: boolean) => {
        const current = round.current;
        if (!current || !board) return;
        const before = props.capabilities.captureState();
        try { props.capabilities.restoreState(current.target); } catch { return; }
        morphScene(props.capabilities, before, {duration: 320});
        const time = Math.round((performance.now() - current.started) / 1000);
        setSeconds(time);
        if (byHand) {
            const nextStreak = streak + 1;
            setStreak(nextStreak);
            if (nextStreak > best) { setBest(nextStreak); writeBest(nextStreak); }
            setMessage(current.hints ? `Ujeto z ${current.hints === 1 ? 'enim namigom' : `${current.hints} namigi`}.` : 'Ujeto brez namiga!');
            setPhase('solved');
            bloom(board.containerObj);
        } else {
            setStreak(0);
            setMessage('Takole je bilo. Poskusi novega.');
            setPhase('revealed');
        }
        setCloseness(100);
    }, [board, best, props.capabilities, streak]);

    // Live closeness while the learner works; a match is accepted when the hand lets go.
    useEffect(() => {
        if (!board || phase !== 'active') return;
        let last = 0;
        let pending = 0;
        let box = board.getBoundingBox().join(',');
        const check = () => {
            pending = 0;
            if (!round.current || performance.now() < round.current.started) return;
            const nextBox = board.getBoundingBox().join(',');
            if (nextBox !== box) { box = nextBox; drawGhost(); }
            const value = measure();
            if (value < SOLVED_PX && !pointerDown.current && phaseRef.current === 'active') solve(true);
        };
        const onUpdate = () => {
            const now = performance.now();
            if (now - last < 80) { if (!pending) pending = window.setTimeout(check, 90); return; }
            last = now;
            check();
        };
        const onDown = (event: PointerEvent) => { if (event.target instanceof Element && !event.target.closest('.ux-match')) pointerDown.current = true; };
        const onUp = () => { if (!pointerDown.current) return; pointerDown.current = false; window.setTimeout(check, 30); };
        board.on('update', onUpdate);
        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
        const keyCheck = () => window.setTimeout(check, 60);
        window.addEventListener('keyup', keyCheck, true);
        window.addEventListener('change', keyCheck, true);
        return () => {
            board.off('update', onUpdate);
            window.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointerup', onUp, true);
            window.removeEventListener('pointercancel', onUp, true);
            window.removeEventListener('keyup', keyCheck, true);
            window.removeEventListener('change', keyCheck, true);
            window.clearTimeout(pending);
        };
    }, [board, phase, drawGhost, measure, solve]);

    const start = useCallback(async (reuseTarget: boolean) => {
        if (!board) return;
        let target: LessonSceneCheckpoint;
        if (reuseTarget && round.current) {
            target = round.current.target;
            try { props.capabilities.restoreState(target); } catch { return; }
        } else {
            try { target = props.capabilities.captureState(); } catch { return; }
        }
        const mode: ShapeMode = shapesNow(board, 'traced').length > 0 ? 'traced' : 'handles';
        const targetShapes = shapesNow(board, mode).map(shape => shape.map(point => toUser(board, point)));
        if (targetShapes.length === 0) { setMessage('Na grafu ni krivulje, ki bi jo lahko ujel.'); return; }
        const targetKeys = shapeElements(board, mode).map(element => geometryKey(element.rendNode!)).join('#');
        const candidates = jitterCandidates(target.value);
        if (candidates.groups.size === 0) { setMessage('Ta graf nima parametrov za izziv.'); return; }
        const bounds = bindControls(candidates, props.root.current ?? document);
        const level = Math.min(4, 1 + Math.floor(streak / 2));
        const inert = new Set<string>();
        const refusals = new Map<string, number>();
        for (let attempt = 0; attempt < 18 && inert.size < candidates.groups.size; attempt++) {
            const {value, moved} = jitterCheckpoint(target.value, candidates, level, board.getBoundingBox(), inert, bounds);
            const debug = window.location.search.includes('uxdebug');
            try {
                props.capabilities.restoreState({version: 1, value});
            } catch (error) {
                if (debug) console.info('[ux b4] jitter refused', moved.join(','), error instanceof Error ? error.message : error);
                recoverBoards();
                try { props.capabilities.restoreState(target); } catch { /* leave it */ }
                // A refused value may be just out of range; a group is given up after three refusals.
                for (const key of moved) { refusals.set(key, (refusals.get(key) ?? 0) + 1); if ((refusals.get(key) ?? 0) >= 3) inert.add(key); }
                continue;
            }
            // Some families draw after the host commits: look at the board two frames later.
            await nextFrames(2);
            if (recoverBoards()) {
                // The graph refused the scene while drawing it: put the target back and try other parameters.
                if (debug) console.info('[ux b4] board stuck after', moved.join(','));
                try { props.capabilities.restoreState(target); } catch { /* leave it */ }
                await nextFrames(1);
                recoverBoards();
                for (const key of moved) { refusals.set(key, (refusals.get(key) ?? 0) + 1); if ((refusals.get(key) ?? 0) >= 3) inert.add(key); }
                continue;
            }
            const keys = shapeElements(board, mode).map(element => geometryKey(element.rendNode!)).join('#');
            const apart = shapeDistance(shapesNow(board, mode), targetShapes.map(shape => shape.map(point => toScreen(board, point))));
            if (debug) console.info('[ux b4] attempt', moved.join(','), 'same', keys === targetKeys, 'apart', apart.toFixed(1));
            if (keys === targetKeys || apart < 18) { if (keys === targetKeys) moved.forEach(key => inert.add(key)); continue; }
            // The round starts once the shape has flown apart; checks before that would see the target itself.
            round.current = {target, targetShapes, mode, candidates, moved, started: performance.now() + 700, hints: 0};
            morphScene(props.capabilities, target, {duration: 650});
            drawGhost();
            setMessage('');
            setPhase('active');
            window.setTimeout(measure, 700);
            return;
        }
        try { props.capabilities.restoreState(target); } catch { /* unchanged */ }
        setMessage('Tega prizora ne znam premakniti. Poskusi na drugem okvirju.');
    }, [board, drawGhost, measure, props.capabilities, streak]);

    const hint = () => {
        const current = round.current;
        if (!current) return;
        const now = props.capabilities.captureState();
        const off = current.moved.find(key => current.candidates.groups.get(key)!.leaves.some(leaf => {
            const value = readLeaf(now.value, leaf.path);
            return typeof value === 'number' && Math.abs(value - leaf.value) > 1e-6;
        }));
        if (!off) { solve(true); return; }
        current.hints++;
        try { props.capabilities.restoreState({version: 1, value: restoreGroup(now.value, current.target.value, current.candidates, off)}); } catch { return; }
        morphScene(props.capabilities, now, {duration: 700});
        setMessage(current.moved.length > 1 ? 'Eno stvar sem postavil nazaj. Ostalo je tvoje.' : 'Glej, kam se je premaknilo.');
        window.setTimeout(() => { if (measure() < SOLVED_PX && phaseRef.current === 'active') solve(true); }, 760);
    };

    const stop = useCallback((restore: boolean) => {
        const current = round.current;
        if (restore && current && (phaseRef.current === 'active')) {
            const before = props.capabilities.captureState();
            try { props.capabilities.restoreState(current.target); morphScene(props.capabilities, before, {duration: 400}); } catch { /* ignore */ }
        }
        round.current = undefined;
        removeGhost();
        setPhase('idle');
        setMessage('');
    }, [props.capabilities]);

    // A lesson that takes the graph back (navigation, locking) ends the round without touching its scene.
    useEffect(() => { if (props.locked && phaseRef.current !== 'idle') stop(false); }, [props.locked, stop]);
    useEffect(() => () => { removeGhost(); }, []);
    useEffect(() => {
        const root = props.root.current;
        if (!root) return;
        const onClick = (event: MouseEvent) => {
            if (phaseRef.current === 'idle' || !(event.target instanceof Element)) return;
            if (event.target.closest('.guided-lesson-nav, .guided-lesson-exit, .guided-lesson-footer button, .guided-lesson-primary')) stop(false);
        };
        root.addEventListener('click', onClick, true);
        return () => root.removeEventListener('click', onClick, true);
    }, [props.root, stop]);

    if (!board || props.locked) return null;
    const shown = phase === "active" ? closeness : 100;
    const hud = phase === 'idle'
        ? <div className="ux-match ux-match-entry">
            <button type="button" className="ux-match-start" onClick={() => void start(false)}>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"/><circle cx="10" cy="10" r="2.6" fill="currentColor"/></svg>
                Izziv: ujemi obliko
            </button>
            {best > 0 && <span className="ux-match-best">rekord {best}</span>}
            {message && <span className="ux-match-message">{message}</span>}
        </div>
        : <div className={`ux-match ux-match-hud ux-match-${phase}`} role="group" aria-label="Izziv">
            <div className="ux-match-title">
                {phase === 'active' && <><strong>Ujemi vijolično obliko</strong><span className="ux-long"> z vlečenjem točk ali drsniki.</span></>}
                {phase === 'solved' && <><strong>Ujeto v {seconds} s.</strong> {message}</>}
                {phase === 'revealed' && <><strong>Rešitev.</strong> {message}</>}
            </div>
            <div className="ux-match-meter" aria-label={`Ujemanje ${shown} odstotkov`}><span style={{width: `${shown}%`}}/><b>{shown}%</b></div>
            <div className="ux-match-actions">
                {streak > 0 && <span className="ux-match-streak" title="Zaporedni zadetki">niz {streak}</span>}
                {phase === 'active' && <button type="button" onClick={hint}>Namig</button>}
                {phase === 'active' && <button type="button" onClick={() => solve(false)}>Rešitev</button>}
                {phase !== 'active' && <button type="button" className="ux-primary" onClick={() => void start(true)}>Nov izziv</button>}
                <button type="button" aria-label="Končaj izziv" onClick={() => stop(true)}>Končaj</button>
            </div>
            {phase === 'active' && message && <div className="ux-match-message">{message}</div>}
        </div>;
    return createPortal(hud, board.containerObj);
}
