import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {uxEnabled} from './flags';
import {useOscillators, toggleOscillator} from './oscillators';
import './ParamPucks.css';

/**
 * a1 — Parameter pucks on the board. Every ranged parameter of the graph (each mounted shared Slider) appears as a puck
 * docked over the graph. Drag a puck sideways to scrub; pull your finger up away from the puck to scrub finer; values
 * click into detents at nice numbers; the wheel and the arrow keys step. Changes made by the lesson light the puck up.
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

export function Tape(props: {entry: ParamEntry; value: number; fineLabel: string; width: number; pxPerRange: number; detent: boolean}) {
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
        ticks.push(<line key={n} x1={x} x2={x} y1={isMajor ? 14 : 20} y2={30} className={isMajor ? 'major' : undefined}/>);
        if (isMajor) ticks.push(<text key={`t${n}`} x={x} y={10}>{entry.format(entry.cyclic === undefined ? v : ((v % entry.cyclic) + entry.cyclic) % entry.cyclic)}</text>);
    }
    const minX = half + (entry.min - value) * pxPerUnit, maxX = half + (entry.max - value) * pxPerUnit;
    return <div className={`ux-tape${props.detent ? ' is-detent' : ''}`} aria-hidden="true">
        <svg width={width} height={34}>
            {entry.cyclic === undefined && minX > 0 && <rect x={0} y={0} width={minX} height={34} className="ux-tape-out"/>}
            {entry.cyclic === undefined && maxX < width && <rect x={maxX} y={0} width={width - maxX} height={34} className="ux-tape-out"/>}
            {ticks}
            <line x1={half} x2={half} y1={0} y2={34} className="ux-tape-needle"/>
        </svg>
        <div className="ux-tape-readout"><span>{splitLabel(entry.label).symbol ?? entry.label}</span> = <strong>{entry.format(value)}</strong>
            {props.fineLabel && <em>{props.fineLabel}</em>}</div>
    </div>;
}

export function Puck(props: {entry: ParamEntry; locked: boolean; onScrub(state: {value: number; fine: string; pxPerRange: number; detent: boolean} | undefined): void; boardWidth: number; oscillating: boolean; showOscillator: boolean}) {
    const {entry, locked} = props;
    const ref = useRef<HTMLDivElement>(null);
    const scrub = useRef<ScrubState>();
    const homeRef = useRef(entry.value);
    const [nudged, setNudged] = useState(false);
    const [refused, setRefused] = useState(false);
    const [clicked, setClicked] = useState(0);
    const previous = useRef(entry.value);
    const entryRef = useRef(entry);
    entryRef.current = entry;
    // A change that did not come from this puck (the lesson, the inspector, an oscillator) lights it up.
    useEffect(() => {
        if (previous.current === entry.value) return;
        previous.current = entry.value;
        if (scrub.current || props.oscillating) return;
        setNudged(true);
        const timer = window.setTimeout(() => setNudged(false), 1100);
        return () => window.clearTimeout(timer);
    }, [entry.value, props.oscillating]);
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
        if (!state.moved) ref.current?.focus();
    };
    const onKeyDown = (event: React.KeyboardEvent) => {
        const big = event.shiftKey || event.key.startsWith('Page') ? 10 : 1;
        if (['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); stepBy(entry.step * big); }
        else if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)) { event.preventDefault(); stepBy(-entry.step * big); }
        else if (event.key === 'Home' && !blocked) { event.preventDefault(); entry.set(entry.min); }
        else if (event.key === 'End' && !blocked) { event.preventDefault(); entry.set(entry.max); }
    };
    return <div ref={ref} role="slider" tabIndex={0} aria-label={entry.label} aria-valuemin={entry.min} aria-valuemax={entry.max} aria-valuenow={entry.value}
        aria-valuetext={entry.format(entry.value)} aria-disabled={blocked || undefined} title={entry.unavailable ?? (locked ? 'Graf je med razlago zaklenjen' : `${entry.label}: povleci levo ali desno, za fino nastavljanje dvigni prst`)}
        className={`ux-puck${blocked ? ' is-blocked' : ''}${nudged ? ' is-nudged' : ''}${refused ? ' is-refused' : ''}${props.oscillating ? ' is-oscillating' : ''}`}
        data-click={clicked % 2} data-param={entry.key}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={() => { if (!blocked) entry.set(homeRef.current); }} onKeyDown={onKeyDown}>
        <span className="ux-puck-text">
            {symbol ? <span className="ux-puck-symbol">{symbol}</span> : <span className="ux-puck-name">{name}</span>}
            <span className="ux-puck-value">{entry.format(entry.value)}</span>
        </span>
        <span className="ux-puck-track" aria-hidden="true"><span style={{left: `${Math.max(0, Math.min(1, fraction)) * 100}%`}}/></span>
        {props.showOscillator && !blocked && <button type="button" className="ux-puck-osc" aria-pressed={props.oscillating}
            aria-label={props.oscillating ? `Ustavi nihanje ${entry.label}` : `Zaniha ${entry.label}`} title={props.oscillating ? 'Ustavi nihanje' : 'Naj parameter niha med mejama'}
            onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); toggleOscillator(entry.key); }}>
            <svg viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6 C 4 -1, 6 -1, 10 6 S 16 13, 19 6"/></svg>
        </button>}
    </div>;
}

export function ParamPucks(props: {frame: React.RefObject<HTMLElement>}) {
    const params = useParams();
    const oscillating = useOscillators();
    const showOscillator = uxEnabled('a3');
    const [scrub, setScrub] = useState<{key: string; value: number; fine: string; pxPerRange: number; detent: boolean}>();
    const [collapsed, setCollapsed] = useState(false);
    const [width, setWidth] = useState(600);
    const [locked, setLocked] = useState(false);
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
    const visible = useMemo(() => params.filter(entry => entry.max > entry.min && !entry.display && !PRESENTATION_LABEL.test(entry.label)), [params]);
    if (visible.length === 0) return null;
    const scrubbed = scrub && visible.find(entry => entry.key === scrub.key);
    return <div className={`ux-pucks${locked ? ' is-locked' : ''}${collapsed ? ' is-collapsed' : ''}`} role="group" aria-label="Parametri na grafu">
        {scrubbed && scrub && <Tape entry={scrubbed} value={scrub.value} fineLabel={scrub.fine} width={Math.min(width - 24, 720)} pxPerRange={scrub.pxPerRange} detent={scrub.detent}/>}
        <div className="ux-pucks-row">
            <button type="button" className="ux-pucks-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Pokaži parametre na grafu' : 'Skrij parametre na grafu'}>
                {collapsed ? <>Parametri <b>{visible.length}</b></> : <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 L6 7.5 L9 4.5"/></svg>}
                <span className="visually-hidden">{collapsed ? '' : 'Skrij parametre'}</span>
            </button>
            {!collapsed && visible.map(entry => <Puck key={entry.key} entry={entry} locked={locked} boardWidth={width}
                oscillating={oscillating.has(entry.key)} showOscillator={showOscillator}
                onScrub={state => setScrub(state && {key: entry.key, ...state})}/>)}
        </div>
        {locked && !collapsed && <p className="ux-pucks-lock">Med razlago so parametri zaklenjeni — opazuj, kateri se spremeni.</p>}
    </div>;
}
