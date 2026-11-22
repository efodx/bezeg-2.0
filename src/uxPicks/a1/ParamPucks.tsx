import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {createPortal} from 'react-dom';
import {getParam, recentlyProbed, setEditingParam, setPuckedKeys, splitLabel, useParams, type CountParam, type ParamEntry as AnyParam, type RangeParam} from './paramRegistry';

import {declaredPuckHelp, useGraphUx} from '../declare/graphUxStore';

/** Without the a29 hover card, the native tooltip carries the help the graph declared for the puck (`PuckDecl.help`). */
function puckTip(entry: AnyParam, first: string, usage: string): string {
    return [first, declaredPuckHelp(entry.key), usage].filter(Boolean).join('\n\n');
}
import {usePick} from '../picks';
import {jumpValue} from '../a29/track';
import {canOscillate, isOscillating, stopAllOscillators, sweepAll, toggleOscillator, useOscillators} from '../a3/oscillators';
import {useReducedMotion} from '../../graphs/base/controls/reducedMotion';
import {DockItem} from '../dock/BoardDock';
import {isBoardKey, toggleShortcuts, typingTarget} from '../dock/Shortcuts';
import {HelpIcon} from '../dock/icons';
import {ChevronDownIcon, MinusIcon, PauseIcon, PlusIcon, WaveIcon} from '../dock/icons';
import './ParamPucks.css';

/** Why the pucks are held while a reading frame is on (also the strip's note); shown as the title of a locked puck. */
const LOCK_NOTE = 'Med razlago so parametri zaklenjeni — opazuj, kateri se spremeni.';

/** A puck's label when the control has no symbol: whole words up to 12 characters, never an ellipsis (the full name is the puck's title). */
export function shortName(name: string): string {
    const words = name.trim().split(/\s+/);
    let out = '';
    for (const word of words) {
        const next = out ? `${out} ${word}` : word;
        if (next.length > 12) break;
        out = next;
    }
    return out || `${words[0].slice(0, 11)}.`;
}

/** A refused tap on a locked puck: the strip's lock note says so for a moment (a touch has no hover title). */
const LOCK_TAP = 'ux-puck-lock-tap';
/** a29: a jump on the track tells the strip what it replaced (detail: JumpUndo); a drag or typed entry on that puck ends the offer. */
const JUMPED = 'ux-puck-jumped';
const JUMP_ENDED = 'ux-puck-jump-ended';
const UNDO_MS = 4000;
interface JumpUndo {key: string; label: string; old: number; oldText: string; set(value: number): void}
const LOCK_REASON = 'Zaklenjeno v tem koraku razlage';
const LockMark = () => <span className="ux-puck-lock" role="img" aria-label={LOCK_REASON} title={LOCK_REASON}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.4"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/></svg></span>;

type ParamEntry = RangeParam;

/**
 * The width a puck reserves for its value, once, from the widest string its range can format (sign, integer digits, the step's
 * decimals, decimal comma, unit), so the puck and the ∿ button beside it never change size while the value moves.
 */
export function valueBoxWidth(entry: AnyParam): string {
    const lo = entry.min ?? 0, hi = entry.max ?? 0;
    const values = [lo, hi, -Math.abs(lo), -Math.abs(hi)];
    for (let i = 1; i < 9; i++) values.push(lo + (hi - lo) * i / 9);
    let width = 1;
    for (const v of values) width = Math.max(width, entry.format(v).length);
    return `${width + 0.4}ch`;
}

/**
 * a1 — Parameter pucks on the board. Every ranged parameter of the graph (each mounted shared Slider) appears as a puck
 * docked over the graph. Drag a puck sideways to scrub; pull your finger up away from the puck to scrub finer; values
 * click into detents at nice numbers; the wheel and the arrow keys step. Changes made by the lesson light the puck up.
 * ux-picks extension: every CountSetter (- n +) appears too, as a count puck that steps by dragging, wheel, keys or its
 * own - and + buttons. Oscillation (a3) is left out.
 */

/** Sliders that tune the presentation rather than the mathematics. */
export const PRESENTATION_LABEL = /hitrost animacije|animation speed|velikost element|element size|debelina|line width/i;

const FINE_LEVELS = [{distance: 0, factor: 1, label: ''}, {distance: 56, factor: 0.25, label: 'fino ×¼'}, {distance: 130, factor: 1 / 16, label: 'zelo fino ×¹⁄₁₆'}];

function decimalsOf(step: number) {
    const text = String(step);
    if (text.includes('e')) return 6;
    return text.split('.')[1]?.length ?? 0;
}

function snap(value: number, entry: ParamEntry) {
    const base = entry.cyclic === undefined ? entry.min : 0;
    const steps = Math.round((value - base) / entry.step);
    const snapped = base + steps * entry.step;
    return Number(snapped.toFixed(Math.min(10, decimalsOf(entry.step) + 2)));
}

/** Values worth a detent: the value the puck started from, zero, and whole numbers when the range is short enough. */
function detents(entry: ParamEntry, home: number): number[] {
    const out = new Set<number>([home]);
    if (entry.min <= 0 && entry.max >= 0) out.add(0);
    const span = entry.max - entry.min;
    if (span <= 24 && entry.step <= 0.5) for (let n = Math.ceil(entry.min); n <= entry.max; n++) out.add(n);
    if (span <= 3 && entry.step <= 0.05) for (let n = Math.ceil(entry.min * 2); n <= entry.max * 2; n++) out.add(n / 2);
    return [...out];
}

function haptic() {
    try { navigator.vibrate?.(6); } catch { /* not supported */ }
}

interface ScrubState {
    pointerId: number; startX: number; startY: number; lastX: number; raw: number; home: number; moved: boolean;
    detent?: number; fine: number; pxPerRange: number;
}

/** The drag ruler: compact, and anchored above the puck being dragged (a fixed box that follows the puck's place). */
export function Tape(props: {entry: ParamEntry; value: number; fineLabel: string; width: number; anchor?: HTMLElement | null; pxPerRange: number; detent: boolean}) {
    const {entry, value, width} = props;
    const span = entry.max - entry.min;
    const pxPerUnit = props.pxPerRange / span;
    // Labelled ticks at a round spacing at least 46 px apart (1, 2 or 5 × 10^k), with four or five minor ticks between.
    const rawMajor = 46 / pxPerUnit;
    const power = Math.pow(10, Math.floor(Math.log10(rawMajor)));
    const mantissa = [1, 2, 5, 10].find(f => f * power >= rawMajor) ?? 10;
    const major = mantissa * power;
    const minor = major / (mantissa === 2 ? 4 : 5);
    const half = width / 2;
    const from = value - half / pxPerUnit, to = value + half / pxPerUnit;
    const ticks: React.ReactNode[] = [];
    for (let n = Math.ceil(from / minor); n * minor <= to && ticks.length < 400; n++) {
        const v = n * minor;
        if (entry.cyclic === undefined && (v < entry.min - 1e-9 || v > entry.max + 1e-9)) continue;
        const x = half + (v - value) * pxPerUnit;
        const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
        ticks.push(<line key={n} x1={x} x2={x} y1={isMajor ? 11 : 16} y2={24} className={isMajor ? 'major' : undefined}/>);
        if (isMajor) ticks.push(<text key={`t${n}`} x={x} y={8}>{entry.format(entry.cyclic === undefined ? v : ((v % entry.cyclic) + entry.cyclic) % entry.cyclic)}</text>);
    }
    const minX = half + (entry.min - value) * pxPerUnit, maxX = half + (entry.max - value) * pxPerUnit;
    const anchor = props.anchor?.getBoundingClientRect();
    // Kept inside the board (round 14 A' P2-1: over the page margin it covered the board's edge and looked detached), and
    // inside the window when the board is wider than the window.
    const board = props.anchor?.closest('.ux-board-frame')?.getBoundingClientRect();
    const lo = Math.max(8, (board?.left ?? 0) + 8), hi = Math.min(window.innerWidth, board?.right ?? window.innerWidth) - width - 8;
    const place: React.CSSProperties = anchor ? {
        left: Math.max(lo, Math.min(hi, anchor.left + anchor.width / 2 - width / 2)),
        bottom: Math.max(8, window.innerHeight - anchor.top + 8),
    } : {};
    return createPortal(<div className={`ux-tape${props.detent ? ' is-detent' : ''}`} style={place} aria-hidden="true">
        <svg width={width} height={26}>
            {entry.cyclic === undefined && minX > 0 && <rect x={0} y={0} width={minX} height={26} className="ux-tape-out"/>}
            {entry.cyclic === undefined && maxX < width && <rect x={maxX} y={0} width={width - maxX} height={26} className="ux-tape-out"/>}
            {ticks}
            <line x1={half} x2={half} y1={0} y2={26} className="ux-tape-needle"/>
        </svg>
        <div className="ux-tape-readout"><span>{splitLabel(entry.label).symbol ?? entry.label}</span> = <strong>{entry.format(value)}</strong>
            {props.fineLabel && <em>{props.fineLabel}</em>}</div>
    </div>, document.body);
}

/** How long (ms) after its last change a value still counts as moving by itself. */
const MOVING_MS = 400;

/**
 * True while a value is changing on its own: an oscillator, or a run of outside changes (a lesson animation).
 * Changes the user makes on this puck (drag, keys, wheel, typing: `own` holds the time until which they count) never mark it.
 */
function useMoving(key: string, value: number, dragging: () => boolean, own: React.MutableRefObject<number>): boolean {
    const [moving, setMoving] = useState(false);
    const last = useRef({value, at: 0});
    const timer = useRef<number>();
    const sweepingRef = useRef(false);
    useEffect(() => {
        if (last.current.value === value) return;
        const now = performance.now();
        const before = last.current.at;
        last.current = {value, at: now};
        if (dragging() || recentlyProbed() || now < own.current) return;
        if (!isOscillating(key) && now - before > MOVING_MS) return;
        setMoving(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => { if (!sweepingRef.current) setMoving(false); }, MOVING_MS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    // A sweep holds the mark for as long as it runs (a count may wait seconds between steps), then lets go like any other run.
    const sweeping = useOscillators().has(key);
    sweepingRef.current = sweeping;
    useEffect(() => {
        window.clearTimeout(timer.current);
        if (sweeping) setMoving(true);
        else timer.current = window.setTimeout(() => setMoving(false), MOVING_MS);
    }, [sweeping]);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    return moving;
}

/** The quiet cue that the number is passing through, not the lesson's value: a small wave in the puck's corner. */
const MovingMark = () => <span className="ux-puck-moving" aria-hidden="true"><WaveIcon/></span>;

export function Puck(props: {entry: ParamEntry; locked: boolean; onScrub(state: {value: number; fine: string; pxPerRange: number; detent: boolean} | undefined): void; boardWidth: number}) {
    const {entry, locked} = props;
    const ref = useRef<HTMLDivElement>(null);
    const scrub = useRef<ScrubState>();
    const homeRef = useRef(entry.value);
    const jumps = usePick('a29');
    const [nudged, setNudged] = useState(false);
    const [refused, setRefused] = useState(false);
    const [clicked, setClicked] = useState(0);
    const previous = useRef(entry.value);
    const entryRef = useRef(entry);
    entryRef.current = entry;
    const own = useRef(0);
    const moving = useMoving(entry.key, entry.value, () => !!scrub.current, own);
    // A change that did not come from this puck (the lesson, the inspector, an oscillator) lights it up.
    useEffect(() => {
        if (previous.current === entry.value) return;
        previous.current = entry.value;
        if (scrub.current || recentlyProbed() || isOscillating(entry.key)) return;
        setNudged(true);
        const timer = window.setTimeout(() => setNudged(false), 1100);
        return () => window.clearTimeout(timer);
    }, [entry.value]);
    const blocked = locked || entry.inert;
    const refuse = () => { setRefused(true); window.setTimeout(() => setRefused(false), 420); if (locked) window.dispatchEvent(new Event(LOCK_TAP)); };
    const stepBy = (delta: number) => {
        if (blocked) { refuse(); return; }
        entry.set(snap(entry.value + delta, entry));
    };
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const wheel = (event: WheelEvent) => {
            event.preventDefault();
            const current = entryRef.current;
            if (locked || current.inert) return;
            own.current = performance.now() + 500;
            const direction = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : -event.deltaY) > 0 ? 1 : -1;
            current.set(snap(current.value + direction * current.step * (event.shiftKey ? 10 : 1), current));
        };
        element.addEventListener('wheel', wheel, {passive: false});
        return () => element.removeEventListener('wheel', wheel);
    }, [locked]);
    const span = entry.max - entry.min;
    const fraction = span > 0 ? (entry.value - entry.min) / span : 0;
    const {symbol, name} = splitLabel(entry.label);
    const onPointerDown = (event: React.PointerEvent) => {
        if (event.button !== 0) return;
        if (blocked) { refuse(); return; }
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        let pxPerRange = Math.max(220, Math.min(620, props.boardWidth * 0.75));
        // R12A: a finger is coarse (40 px moved c by 5.9 of 40 on a phone), so the default drag maps the whole range to at least
        // 2.5 strip widths; the lift-for-fine levels still divide it further. A mouse or pen keeps the board-width mapping.
        if (event.pointerType === 'touch') pxPerRange = Math.max(pxPerRange, 2.5 * ((event.currentTarget as HTMLElement).closest('.ux-pucks')?.clientWidth ?? 0));
        scrub.current = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, raw: entry.value, home: entry.value, moved: false, fine: 0, pxPerRange};
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const state = scrub.current;
        if (!state || state.pointerId !== event.pointerId) return;
        const dx = event.clientX - state.lastX;
        state.lastX = event.clientX;
        if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 4) return;
        if (!state.moved) window.dispatchEvent(new CustomEvent(JUMP_ENDED, {detail: entry.key}));
        state.moved = true;
        const lift = Math.max(0, state.startY - event.clientY);
        const level = [...FINE_LEVELS].reverse().find(l => lift >= l.distance) ?? FINE_LEVELS[0];
        state.fine = FINE_LEVELS.indexOf(level);
        const current = entryRef.current;
        const unitsPerPx = (current.max - current.min) / state.pxPerRange * level.factor;
        state.raw += dx * unitsPerPx;
        if (current.cyclic === undefined) state.raw = Math.min(current.max, Math.max(current.min, state.raw));
        // Detents hold within 7 px of a nice value.
        const radius = 7 * unitsPerPx;
        const near = detents(current, state.home).find(d => Math.abs(state.raw - d) <= radius);
        if (near !== undefined && state.detent !== near) { haptic(); setClicked(c => c + 1); }
        state.detent = near;
        const value = near ?? snap(state.raw, current);
        if (value !== current.value) current.set(value);
        props.onScrub({value, fine: level.label, pxPerRange: state.pxPerRange / level.factor, detent: near !== undefined});
    };
    const onPointerUp = (event: React.PointerEvent) => {
        const state = scrub.current;
        if (!state || state.pointerId !== event.pointerId) return;
        scrub.current = undefined;
        props.onScrub(undefined);
        if (!state.moved && event.type === 'pointerup' && jumps && ref.current) {
            // a29: a press on the track (the strip along the bottom of the puck) jumps to the value under the pointer.
            const target = jumpValue(entryRef.current, ref.current, event.clientX, event.clientY);
            if (target !== undefined) {
                const current = entryRef.current;
                own.current = performance.now() + 500;
                const old = current.value;
                current.set(target);
                if (target !== old) window.dispatchEvent(new CustomEvent<JumpUndo>(JUMPED, {detail: {key: current.key, label: current.label, old, oldText: current.format(old), set: current.set}}));
            }
        }
        if (!state.moved) ref.current?.focus();
    };
    const [editing, setEditing] = useState<string>();
    const [problem, setProblem] = useState<string>();
    useTypingState(entry.key, editing !== undefined, entry.value, setProblem);
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (editing !== undefined) return;
        const typed = startsTyping(event);
        if (typed !== undefined) { event.preventDefault(); if (blocked) refuse(); else setEditing(typed); return; }
        own.current = performance.now() + 500;
        const big = event.shiftKey || event.key.startsWith('Page') ? 10 : 1;
        if (['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); stepBy(entry.step * big); }
        else if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)) { event.preventDefault(); stepBy(-entry.step * big); }
        else if (event.key === 'Home' && !blocked) { event.preventDefault(); entry.set(entry.min); }
        else if (event.key === 'End' && !blocked) { event.preventDefault(); entry.set(entry.max); }
    };
    return <div ref={ref} role="slider" tabIndex={0} aria-label={entry.label} aria-valuemin={entry.min} aria-valuemax={entry.max} aria-valuenow={entry.value}
        aria-valuetext={entry.format(entry.value)} aria-disabled={blocked || undefined} title={entry.unavailable ?? (locked ? LOCK_REASON : jumps ? undefined : puckTip(entry, entry.label, 'Povleci levo ali desno, za fino nastavljanje dvigni prst.'))}
        className={`ux-puck${blocked ? ' is-blocked' : ''}${nudged ? ' is-nudged' : ''}${refused ? ' is-refused' : ''}${moving ? ' is-moving' : ''}`}
        data-click={clicked % 2} data-param={entry.key}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={() => { if (blocked) refuse(); else setEditing(''); }} onKeyDown={onKeyDown}>
        <span className="ux-puck-text">
            {symbol ? <span className="ux-puck-symbol">{symbol}</span> : <span className="ux-puck-name">{shortName(name)}</span>}
            <span className="ux-puck-valuebox" style={{width: valueBoxWidth(entry)}}>{editing !== undefined
                ? <TypedValue initial={editing} shown={entry.format(entry.value)} label={entry.label} onDone={() => { setEditing(undefined); ref.current?.focus(); }}
                    accept={value => {
                        own.current = performance.now() + 500;
                        window.dispatchEvent(new CustomEvent(JUMP_ENDED, {detail: entry.key}));
                        const ok = Number.isFinite(value) && (entry.cyclic !== undefined || (value >= entry.min - 1e-9 && value <= entry.max + 1e-9));
                        if (ok) { entry.set(value); setProblem(undefined); } else { refuse(); setProblem(Number.isFinite(value) ? allowedRange(entry.format, entry.min, entry.max) : 'Vpiši število'); }
                        return ok;
                    }} onInput={() => setProblem(undefined)}/>
                : <span className="ux-puck-value">{entry.format(entry.value)}</span>}</span>
        </span>
        {moving && <MovingMark/>}
        {locked && <LockMark/>}
        {problem && <span className="ux-puck-problem" role="alert">{problem}</span>}
        <span className="ux-puck-track" aria-hidden="true"><span style={{left: `${Math.max(0, Math.min(1, fraction)) * 100}%`}}/></span>
    </div>;
}

export function ParamPucks(props: {frame: React.RefObject<HTMLElement>}) {
    const params = useParams();
    const [scrub, setScrub] = useState<{key: string; value: number; fine: string; pxPerRange: number; detent: boolean}>();
    const [collapsed, setCollapsed] = useState(false);
    const [width, setWidth] = useState(600);
    const [locked, setLocked] = useState(false);
    const oscillating = useOscillators();
    const reducedMotion = useReducedMotion();
    // Reduced motion: nothing moves by itself, so the sweep button is not offered and a running sweep stops.
    const showOscillator = usePick('a3') && !reducedMotion;
    useEffect(() => { if (reducedMotion) stopAllOscillators(); }, [reducedMotion]);
    useLayoutEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        const section = frame.closest('.workspace-graph');
        const read = () => {
            setWidth(frame.getBoundingClientRect().width);
            setLocked(section?.getAttribute('data-lesson-locked') === 'true');
        };
        read();
        const resize = new ResizeObserver(read);
        resize.observe(frame);
        const mutation = section ? new MutationObserver(read) : undefined;
        if (section) mutation?.observe(section, {attributes: true, attributeFilter: ['data-lesson-locked']});
        return () => { resize.disconnect(); mutation?.disconnect(); };
    }, [props.frame]);
    // Exactly the pucks the graph declares (`GraphUx.pucks`), in its order; nothing is guessed from the registry.
    const declared = useGraphUx()?.pucks;
    const visible = useMemo(() => (declared ?? []).flatMap(decl => {
        const entry = params.find(e => e.key === decl.param);
        return entry && (entry.kind === 'count' || entry.max > entry.min) ? [decl.label ? {...entry, label: decl.label} : entry] : [];
    }), [params, declared]);
    // The tools card hides the controls the pucks show (only while the row is open, so a folded row gives them back).
    useLayoutEffect(() => { setPuckedKeys(collapsed ? [] : visible.map(entry => entry.key)); }, [visible, collapsed]);
    useLayoutEffect(() => () => setPuckedKeys([]), []);
    // N: sweep every puck that can, or stop all if any is sweeping (nothing under reduced motion, like the ∿ button itself).
    const sweepable = showOscillator ? visible.filter(canOscillate).map(entry => entry.key) : [];
    const sweepRef = useRef(sweepable);
    sweepRef.current = sweepable;
    useEffect(() => {
        if (!showOscillator || collapsed) return undefined;
        const onKey = (event: KeyboardEvent) => {
            if ((event.key !== 'n' && event.key !== 'N') || !isBoardKey(event) || locked) return;
            event.preventDefault();
            sweepAll(sweepRef.current);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showOscillator, collapsed, locked]);
    // Esc stops a running sweep (the value stays where it stopped) and takes back a track jump; a field being edited keeps its own Esc.
    const [undo, setUndo] = useState<JumpUndo>();
    const undoRef = useRef(undo);
    undoRef.current = undo;
    useEffect(() => {
        let timer = 0;
        const onJump = (event: Event) => {
            setUndo((event as CustomEvent<JumpUndo>).detail);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setUndo(undefined), UNDO_MS);
        };
        const onEnd = (event: Event) => {
            if (undoRef.current && undoRef.current.key === (event as CustomEvent<string>).detail) { window.clearTimeout(timer); setUndo(undefined); }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented || typingTarget(event.target)) return;
            const pending = undoRef.current;
            if (pending) { window.clearTimeout(timer); pending.set(pending.old); setUndo(undefined); }
            stopAllOscillators();
        };
        window.addEventListener(JUMPED, onJump);
        window.addEventListener(JUMP_ENDED, onEnd);
        window.addEventListener('keydown', onKey);
        return () => { window.clearTimeout(timer); window.removeEventListener(JUMPED, onJump); window.removeEventListener(JUMP_ENDED, onEnd); window.removeEventListener('keydown', onKey); };
    }, []);
    const undoNow = () => { if (undo) { undo.set(undo.old); setUndo(undefined); } };
    // Phone: the row scrolls sideways, so the side that has more pucks gets a chevron (and the stylesheet's fade there).
    const [flash, setFlash] = useState(false);
    useEffect(() => {
        let timer = 0;
        const on = () => { setFlash(true); window.clearTimeout(timer); timer = window.setTimeout(() => setFlash(false), 3000); };
        window.addEventListener(LOCK_TAP, on);
        return () => { window.removeEventListener(LOCK_TAP, on); window.clearTimeout(timer); };
    }, []);
    const rowRef = useRef<HTMLDivElement>(null);
    // The lesson layer's graph catcher (tap the graph = fold the card) lies over the whole board, strip included: a tap on the
    // strip while a reading frame is on would fold the card. The strip answers it instead: a button gets its click, a locked
    // puck says why it is locked.
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            const catcher = event.target;
            const row = rowRef.current;
            if (!(catcher instanceof Element) || !catcher.classList.contains('guided-lesson-graph-catcher') || !row) return;
            const r = row.getBoundingClientRect();
            if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) return;
            event.stopPropagation();
            const under = document.elementsFromPoint(event.clientX, event.clientY).find(el => el !== catcher && row.contains(el));
            const button = under?.closest('button');
            if (button && !button.disabled) button.click(); else if (under?.closest('.ux-puck')) window.dispatchEvent(new Event(LOCK_TAP));
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);
    const [lastSwept, setLastSwept] = useState<string>();
    const [more, setMore] = useState('');
    useEffect(() => {
        const row = rowRef.current;
        if (!row) return undefined;
        const measure = () => {
            const v = [row.scrollLeft > 2 ? 'start' : '', row.scrollLeft + row.clientWidth < row.scrollWidth - 2 ? 'end' : ''].filter(Boolean).join(' ');
            setMore(prev => prev === v ? prev : v);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        Array.from(row.children).forEach(child => observer.observe(child));
        row.addEventListener('scroll', measure, {passive: true});
        return () => { observer.disconnect(); row.removeEventListener('scroll', measure); };
    }, [visible.length, collapsed]);
    const nudge = (direction: 1 | -1) => rowRef.current?.scrollBy({left: direction * Math.max(80, rowRef.current.clientWidth * 0.7), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    if (visible.length === 0) return null;
    const scrubbed = scrub && visible.find((entry): entry is RangeParam => entry.kind === 'range' && entry.key === scrub.key);
    return <DockItem region="bottom" phoneRegion="tray"><div className={`ux-pucks${locked ? ' is-locked' : ''}${collapsed ? ' is-collapsed' : ''}`} role="group" aria-label="Parametri na grafu">
        {scrubbed && scrub && <Tape entry={scrubbed} value={scrub.value} fineLabel={scrub.fine} width={Math.min(width - 24, 416)} pxPerRange={scrub.pxPerRange} detent={scrub.detent}
            anchor={document.querySelector<HTMLElement>(`.ux-puck[data-param="${CSS.escape(scrubbed.key)}"]`)}/>}
        {/* Pinned above the row and out of the layout, so the row never moves when a reading frame locks it. */}
        {undo && !collapsed && !locked
            ? <p className="ux-pucks-lock ux-puck-undo" role="status">{undo.label} = {undo.oldText} · <button type="button" onPointerDown={event => event.stopPropagation()} onClick={undoNow}>Razveljavi</button></p>
            : locked && !collapsed && <p className={`ux-pucks-lock${flash ? ' is-flash' : ''}`} role="status">{LOCK_NOTE}</p>}
        <div className="ux-pucks-rowbox"><div className="ux-pucks-row" ref={rowRef} data-more={more || undefined}>
            <span className="ux-pucks-help-wrap">
                <button type="button" className="ux-sc-button ux-pucks-help" aria-label="Pomoč za parametre" aria-describedby="ux-pucks-help-tip" aria-haspopup="dialog"
                    onPointerDown={e => e.stopPropagation()} onClick={e => toggleShortcuts(e.currentTarget)}><HelpIcon/></button>
                <span id="ux-pucks-help-tip" role="tooltip" className="ux-pucks-help-tip">Pomoč za parametre (?)</span>
            </span>
            <button type="button" className="ux-pucks-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Pokaži parametre na grafu' : 'Skrij parametre na grafu'}>
                {collapsed ? <>Parametri <b>{visible.length}</b></> : <ChevronDownIcon/>}
                <span className="visually-hidden">{collapsed ? '' : 'Skrij parametre'}</span>
            </button>
            {!collapsed && <span className="ux-pucks-items">{visible.map(entry => {
                const moving = oscillating.has(entry.key);
                const oscName = splitLabel(entry.label).symbol ?? splitLabel(entry.label).name;
                return <span key={entry.key} className={`ux-puck-wrap${moving ? ' is-oscillating' : ''}${lastSwept === entry.key ? ' is-last-swept' : ''}`}>
                    {entry.kind === 'count'
                        ? <CountPuck entry={entry} locked={locked}/>
                        : <Puck entry={entry} locked={locked} boardWidth={width} onScrub={state => setScrub(state && {key: entry.key, ...state})}/>}
                    {showOscillator && canOscillate(entry) && <button type="button" className={`ux-puck-osc${locked ? ' is-held' : ''}`} aria-pressed={moving}
                        disabled={locked} aria-hidden={locked || undefined} tabIndex={locked ? -1 : undefined}
                        aria-label={moving ? `Ustavi: ${entry.label}` : `Zaženi gibanje: ${entry.label}`}
                        onPointerDown={event => event.stopPropagation()} onClick={() => { setLastSwept(entry.key); toggleOscillator(entry.key); }}>
                        {moving ? <PauseIcon/> : <WaveIcon/>}
                    </button>}
                    {showOscillator && canOscillate(entry) && !locked && <span role="tooltip" aria-hidden="true" className="ux-puck-osc-tip">{moving ? `Ustavi: ${oscName}` : `Zaženi gibanje: ${oscName}`}</span>}
                </span>;
            })}</span>}
        </div>
        {more.includes('start') && <button type="button" className="ux-pucks-more is-start" aria-label="Več parametrov levo" tabIndex={-1} onClick={() => nudge(-1)}><ChevronDownIcon/></button>}
        {more.includes('end') && <button type="button" className="ux-pucks-more is-end" aria-label="Več parametrov desno" tabIndex={-1} onClick={() => nudge(1)}><ChevronDownIcon/></button>}
        </div>
    </div></DockItem>;
}

/** Pixels of sideways drag per step of a count. */
const COUNT_STEP_PX = 26;

/**
 * A count (CountSetter) as a puck: drag sideways to step it one at a time, or use its − and +, the wheel or the arrow keys.
 * Every step goes through the setter's own onMinus/onPlus, so the graph's bounds and refusals apply unchanged.
 */
export function CountPuck(props: {entry: CountParam; locked: boolean}) {
    const hoverCard = usePick('a29');
    const {entry, locked} = props;
    const ref = useRef<HTMLDivElement>(null);
    const entryRef = useRef(entry);
    entryRef.current = entry;
    const drag = useRef<{pointerId: number; startX: number; startY: number; steps: number; moved: boolean}>();
    const own = useRef(0);
    const moving = useMoving(entry.key, entry.value, () => !!drag.current, own);
    const [nudged, setNudged] = useState(false);
    const [refused, setRefused] = useState(false);
    const previous = useRef(entry.value);
    useEffect(() => {
        if (previous.current === entry.value) return;
        previous.current = entry.value;
        if (drag.current || recentlyProbed() || isOscillating(entry.key)) return;
        setNudged(true);
        const timer = window.setTimeout(() => setNudged(false), 1100);
        return () => window.clearTimeout(timer);
    }, [entry.value]);
    const refuse = () => { setRefused(true); window.setTimeout(() => setRefused(false), 420); if (locked) window.dispatchEvent(new Event(LOCK_TAP)); };
    const step = (direction: 1 | -1) => {
        if (locked) { refuse(); return false; }
        own.current = performance.now() + 500;
        const current = entryRef.current;
        const moved = direction > 0 ? current.plus() : current.minus();
        if (!moved) refuse(); else haptic();
        return moved;
    };
    const stepRef = useRef(step);
    stepRef.current = step;
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const wheel = (event: WheelEvent) => {
            event.preventDefault();
            const direction = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : -event.deltaY) > 0 ? 1 : -1;
            stepRef.current(direction);
        };
        element.addEventListener('wheel', wheel, {passive: false});
        return () => element.removeEventListener('wheel', wheel);
    }, []);
    const onPointerDown = (event: React.PointerEvent) => {
        if (event.button !== 0 || (event.target as Element).closest('button')) return;
        if (locked) { refuse(); return; }
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        drag.current = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, steps: 0, moved: false};
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const state = drag.current;
        if (!state || state.pointerId !== event.pointerId) return;
        if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 4) return;
        state.moved = true;
        const wanted = Math.round((event.clientX - state.startX) / COUNT_STEP_PX);
        // One step per move event: the setter's caller updates its count on the next render. At a bound the drag re-anchors.
        if (wanted === state.steps) return;
        const direction = wanted > state.steps ? 1 : -1;
        if (step(direction)) state.steps += direction;
        else state.startX = event.clientX - state.steps * COUNT_STEP_PX;
    };
    const onPointerUp = (event: React.PointerEvent) => {
        const state = drag.current;
        if (!state || state.pointerId !== event.pointerId) return;
        drag.current = undefined;
        if (!state.moved) ref.current?.focus();
    };
    const [editing, setEditing] = useState<string>();
    const [problem, setProblem] = useState<string>();
    useTypingState(entry.key, editing !== undefined, entry.value, setProblem);
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (editing !== undefined) return;
        const typed = startsTyping(event);
        if (typed !== undefined) { event.preventDefault(); if (locked) refuse(); else setEditing(typed); return; }
        if (['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); step(1); }
        else if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)) { event.preventDefault(); step(-1); }
    };
    const {symbol, name} = splitLabel(entry.label);
    const span = entry.min !== undefined && entry.max !== undefined ? entry.max - entry.min : undefined;
    const dots = span !== undefined && span > 0 && span <= 24 && Number.isInteger(span) ? span + 1 : 0;
    const atMin = entry.min !== undefined && entry.value <= entry.min;
    const atMax = entry.max !== undefined && entry.value >= entry.max;
    return <div ref={ref} role="spinbutton" tabIndex={0} aria-label={entry.label} aria-valuenow={entry.value} aria-valuemin={entry.min} aria-valuemax={entry.max}
        aria-valuetext={entry.format(entry.value)} aria-disabled={locked || undefined}
        title={locked ? LOCK_REASON : hoverCard ? undefined : puckTip(entry, entry.label, 'Povleci levo ali desno ali pritisni − in +.')}
        className={`ux-puck ux-count-puck${locked ? ' is-blocked' : ''}${nudged ? ' is-nudged' : ''}${refused ? ' is-refused' : ''}${moving ? ' is-moving' : ''}`}
        data-param={entry.key} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
        onDoubleClick={event => { if ((event.target as Element).closest('button')) return; if (locked) refuse(); else setEditing(''); }}>
        <span className="ux-puck-text">
            <button type="button" tabIndex={-1} className="ux-count-step" data-step="-1" aria-label={`Zmanjšaj: ${entry.label}`} aria-disabled={atMin || locked || undefined} onClick={() => step(-1)}><MinusIcon/></button>
            {symbol ? <span className="ux-puck-symbol">{symbol}</span> : <span className="ux-puck-name">{shortName(name)}</span>}
            <span className="ux-puck-valuebox" style={{width: valueBoxWidth(entry)}}>{editing !== undefined
                ? <TypedValue initial={editing} shown={entry.format(entry.value)} label={entry.label} onDone={() => { setEditing(undefined); ref.current?.focus(); }}
                    accept={value => {
                        own.current = performance.now() + 500;
                        const ok = setCount(entry, value);
                        if (ok) setProblem(undefined);
                        else {
                            refuse();
                            setProblem(!Number.isFinite(value) ? 'Vpiši število' : !Number.isInteger(value) ? 'Vpiši celo število' : allowedRange(entry.format, entry.min, entry.max));
                        }
                        return ok;
                    }} onInput={() => setProblem(undefined)}/>
                : <span className="ux-puck-value">{entry.format(entry.value)}</span>}</span>
            <button type="button" tabIndex={-1} className="ux-count-step" data-step="1" aria-label={`Povečaj: ${entry.label}`} aria-disabled={atMax || locked || undefined} onClick={() => step(1)}><PlusIcon/></button>
        </span>
        {moving && <MovingMark/>}
        {locked && <LockMark/>}
        {problem && <span className="ux-puck-problem" role="alert">{problem}</span>}
        {dots > 0 && <span className="ux-count-dots" aria-hidden="true">
            {Array.from({length: dots}, (_, index) => {
                const value = entry.min! + index;
                return <span key={index} className={value === entry.value ? 'is-on' : value < entry.value ? 'is-below' : undefined}/>;
            })}
        </span>}
    </div>;
}

/** "Dovoljeno od −20 do 20": what a refused typed value may be instead. */
function allowedRange(format: (value: number) => string, min?: number, max?: number): string {
    if (min !== undefined && max !== undefined) return `Dovoljeno od ${format(min)} do ${format(max)}`;
    if (min !== undefined) return `Dovoljeno od ${format(min)} naprej`;
    if (max !== undefined) return `Dovoljeno do ${format(max)}`;
    return 'Vpiši število';
}

/** While a puck is typed into, the registry says so (hover previews stay quiet); the puck's message ends when its value changes. */
function useTypingState(key: string, typing: boolean, value: number, setProblem: (text: undefined) => void) {
    useEffect(() => { setProblem(undefined); }, [value, setProblem]);
    useEffect(() => {
        // Closing the field (Escape, blur, a refused Enter that ends typing) ends its message too.
        if (!typing) { setProblem(undefined); return; }
        setEditingParam(key);
        return () => setEditingParam(undefined);
    }, [key, typing, setProblem]);
}

/** Enter starts typing with the current value; a digit, minus or decimal mark starts typing with that character. */
function startsTyping(event: React.KeyboardEvent): string | undefined {
    if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
    if (event.key === 'Enter' || event.key === 'F2') return '';
    if (/^[0-9,.\-−]$/.test(event.key)) return event.key === '−' ? '-' : event.key;
    return undefined;
}

/** Reads "1,5", "-2", "−0.25" (decimal comma or point, typographic minus). */
function parseTyped(text: string): number {
    const cleaned = text.trim().replace(/\s/g, '').replace('−', '-').replace(',', '.');
    return cleaned === '' || cleaned === '-' ? NaN : Number(cleaned);
}

/**
 * Sets a count to a typed whole number through the setter's own − and +, one step per synchronous render, so the
 * graph's bounds and refusals apply unchanged. Returns false when the value is not whole or lies outside the bounds.
 */
function setCount(entry: CountParam, target: number): boolean {
    if (!Number.isInteger(target)) return false;
    if ((entry.min !== undefined && target < entry.min) || (entry.max !== undefined && target > entry.max)) return false;
    for (let guard = 0; guard < 500; guard++) {
        const current = getParam(entry.key);
        if (!current || current.kind !== 'count') return false;
        if (current.value === target) return true;
        let moved = false;
        flushSync(() => { moved = target > current.value ? current.plus() : current.minus(); });
        if (!moved) return false;
    }
    return false;
}

/** The puck's value as a text field while the learner types; Enter or leaving commits, Escape cancels. */
function TypedValue(props: {initial: string; shown: string; label: string; accept(value: number): boolean; onInput?(): void; onDone(): void}) {
    const input = useRef<HTMLInputElement>(null);
    const [text, setText] = useState(props.initial === '' ? props.shown : props.initial);
    const [invalid, setInvalid] = useState(false);
    const finished = useRef(false);
    useEffect(() => {
        const node = input.current;
        if (!node) return;
        node.focus();
        if (props.initial === '') node.select(); else node.setSelectionRange(node.value.length, node.value.length);
    }, [props.initial]);
    const unchanged = () => text.trim() === props.shown;
    const commit = () => {
        if (finished.current) return;
        if (unchanged() || props.accept(parseTyped(text))) { finished.current = true; props.onDone(); }
        else { setInvalid(true); input.current?.select(); }
    };
    return <input ref={input} className={`ux-puck-input${invalid ? ' is-invalid' : ''}`} inputMode="decimal" aria-label={`Vpiši: ${props.label}`}
        value={text} size={Math.max(3, text.length + 1)}
        onChange={event => { setText(event.target.value); setInvalid(false); props.onInput?.(); }}
        onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
        onKeyDown={event => {
            event.stopPropagation();
            if (event.key === 'Enter') { event.preventDefault(); commit(); }
            else if (event.key === 'Escape') { event.preventDefault(); finished.current = true; props.onDone(); }
        }}
        onBlur={() => {
            if (finished.current) return;
            finished.current = true;
            if (!unchanged()) props.accept(parseTyped(text));
            props.onDone();
        }}/>;
}
