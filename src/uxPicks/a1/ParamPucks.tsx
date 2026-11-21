import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {createPortal} from 'react-dom';
import {accompanyingText, getParam, recentlyProbed, setEditingParam, setPuckedKeys, splitLabel, useParams, type CountParam, type ParamEntry as AnyParam, type RangeParam} from './paramRegistry';

/** Without the a29 hover card, the native tooltip carries the text that went with the control in the tools (now hidden there). */
function puckTip(entry: AnyParam, first: string, usage: string): string {
    return [first, ...accompanyingText(entry.key), usage].filter(Boolean).join('\n\n');
}
import {usePick} from '../picks';
import {jumpValue} from '../a29/track';
import {canOscillate, isOscillating, stopAllOscillators, sweepAll, toggleOscillator, useOscillators} from '../a3/oscillators';
import {useReducedMotion} from '../../graphs/base/controls/reducedMotion';
import {DockItem} from '../dock/BoardDock';
import {ShortcutsButton, isBoardKey} from '../dock/Shortcuts';
import {ChevronDownIcon, MinusIcon, PauseIcon, PlusIcon, WaveIcon} from '../dock/icons';
import './ParamPucks.css';

type ParamEntry = RangeParam;

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
    const place: React.CSSProperties = anchor ? {
        left: Math.max(8, Math.min(window.innerWidth - width - 8, anchor.left + anchor.width / 2 - width / 2)),
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
    const refuse = () => { setRefused(true); window.setTimeout(() => setRefused(false), 420); };
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
        const pxPerRange = Math.max(220, Math.min(620, props.boardWidth * 0.75));
        scrub.current = {pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, raw: entry.value, home: entry.value, moved: false, fine: 0, pxPerRange};
    };
    const onPointerMove = (event: React.PointerEvent) => {
        const state = scrub.current;
        if (!state || state.pointerId !== event.pointerId) return;
        const dx = event.clientX - state.lastX;
        state.lastX = event.clientX;
        if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 4) return;
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
            if (target !== undefined) { own.current = performance.now() + 500; entryRef.current.set(target); }
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
        aria-valuetext={entry.format(entry.value)} aria-disabled={blocked || undefined} title={entry.unavailable ?? (locked ? 'Graf je med razlago zaklenjen' : jumps ? undefined : puckTip(entry, entry.label, 'Povleci levo ali desno, za fino nastavljanje dvigni prst.'))}
        className={`ux-puck${blocked ? ' is-blocked' : ''}${nudged ? ' is-nudged' : ''}${refused ? ' is-refused' : ''}${moving ? ' is-moving' : ''}`}
        data-click={clicked % 2} data-param={entry.key}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={() => { if (blocked) refuse(); else setEditing(''); }} onKeyDown={onKeyDown}>
        <span className="ux-puck-text">
            {symbol ? <span className="ux-puck-symbol">{symbol}</span> : <span className="ux-puck-name">{name}</span>}
            {editing !== undefined
                ? <TypedValue initial={editing} shown={entry.format(entry.value)} label={entry.label} onDone={() => { setEditing(undefined); ref.current?.focus(); }}
                    accept={value => {
                        own.current = performance.now() + 500;
                        const ok = Number.isFinite(value) && (entry.cyclic !== undefined || (value >= entry.min - 1e-9 && value <= entry.max + 1e-9));
                        if (ok) { entry.set(value); setProblem(undefined); } else { refuse(); setProblem(Number.isFinite(value) ? allowedRange(entry.format, entry.min, entry.max) : 'Vpiši število'); }
                        return ok;
                    }} onInput={() => setProblem(undefined)}/>
                : <span className="ux-puck-value">{entry.format(entry.value)}</span>}
        </span>
        {moving && <MovingMark/>}
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
    const hoverCard = usePick('a29');
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
    const visible = useMemo(() => params.filter(entry => !entry.display && !PRESENTATION_LABEL.test(entry.label)
        && (entry.kind === 'count' || entry.max > entry.min)), [params]);
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
    if (visible.length === 0) return null;
    const scrubbed = scrub && visible.find((entry): entry is RangeParam => entry.kind === 'range' && entry.key === scrub.key);
    return <DockItem region="bottom" phoneRegion="tray"><div className={`ux-pucks${locked ? ' is-locked' : ''}${collapsed ? ' is-collapsed' : ''}`} role="group" aria-label="Parametri na grafu">
        {scrubbed && scrub && <Tape entry={scrubbed} value={scrub.value} fineLabel={scrub.fine} width={Math.min(width - 24, 416)} pxPerRange={scrub.pxPerRange} detent={scrub.detent}
            anchor={document.querySelector<HTMLElement>(`.ux-puck[data-param="${CSS.escape(scrubbed.key)}"]`)}/>}
        {/* Pinned above the row and out of the layout, so the row never moves when a reading frame locks it. */}
        {locked && !collapsed && <p className="ux-pucks-lock">Med razlago so parametri zaklenjeni — opazuj, kateri se spremeni.</p>}
        <div className="ux-pucks-row">
            <button type="button" className="ux-pucks-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Pokaži parametre na grafu' : 'Skrij parametre na grafu'}>
                {collapsed ? <>Parametri <b>{visible.length}</b></> : <ChevronDownIcon/>}
                <span className="visually-hidden">{collapsed ? '' : 'Skrij parametre'}</span>
            </button>
            {!collapsed && visible.map(entry => {
                const moving = oscillating.has(entry.key);
                return <span key={entry.key} className={`ux-puck-wrap${moving ? ' is-oscillating' : ''}`}>
                    {entry.kind === 'count'
                        ? <CountPuck entry={entry} locked={locked}/>
                        : <Puck entry={entry} locked={locked} boardWidth={width} onScrub={state => setScrub(state && {key: entry.key, ...state})}/>}
                    {showOscillator && canOscillate(entry) && <button type="button" className={`ux-puck-osc${locked ? ' is-held' : ''}`} aria-pressed={moving}
                        disabled={locked} aria-hidden={locked || undefined} tabIndex={locked ? -1 : undefined}
                        aria-label={moving ? `Ustavi: ${entry.label}` : `Naj se sam spreminja: ${entry.label}`}
                        title={hoverCard ? undefined : moving ? 'Ustavi' : entry.kind === 'count' ? 'Premikaj sam: števec šteje gor in dol' : 'Premikaj sam: drsnik niha med mejama'}
                        onPointerDown={event => event.stopPropagation()} onClick={() => toggleOscillator(entry.key)}>
                        {moving ? <PauseIcon/> : <WaveIcon/>}
                    </button>}
                </span>;
            })}
            <ShortcutsButton className="ux-pucks-help"/>
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
    const refuse = () => { setRefused(true); window.setTimeout(() => setRefused(false), 420); };
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
        title={locked ? 'Graf je med razlago zaklenjen' : hoverCard ? undefined : puckTip(entry, entry.label, 'Povleci levo ali desno ali pritisni − in +.')}
        className={`ux-puck ux-count-puck${locked ? ' is-blocked' : ''}${nudged ? ' is-nudged' : ''}${refused ? ' is-refused' : ''}${moving ? ' is-moving' : ''}`}
        data-param={entry.key} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
        onDoubleClick={event => { if ((event.target as Element).closest('button')) return; if (locked) refuse(); else setEditing(''); }}>
        <span className="ux-puck-text">
            <button type="button" tabIndex={-1} className="ux-count-step" aria-label={`Zmanjšaj: ${entry.label}`} aria-disabled={atMin || locked || undefined} onClick={() => step(-1)}><MinusIcon/></button>
            {symbol ? <span className="ux-puck-symbol">{symbol}</span> : <span className="ux-puck-name">{name}</span>}
            {editing !== undefined
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
                : <span className="ux-puck-value">{entry.format(entry.value)}</span>}
            <button type="button" tabIndex={-1} className="ux-count-step" aria-label={`Povečaj: ${entry.label}`} aria-disabled={atMax || locked || undefined} onClick={() => step(1)}><PlusIcon/></button>
        </span>
        {moving && <MovingMark/>}
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
