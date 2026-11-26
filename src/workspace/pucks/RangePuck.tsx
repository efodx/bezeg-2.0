import {useEffect, useId, useRef, useState} from 'react';
import type {KeyboardEvent, PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {stepKeyDelta} from '../../inputs/stepKeys';
import {currentLanguage, renderMessage, useT} from '../../localization';
import type {Message} from '../../localization';
import type {RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {FAN_REST_MS, fanValues, fanWithNear} from '../preview/fan';
import {usePreviewHover} from '../preview/previewContext';
import {useJumpUndo} from './jumpUndo';
import type {PuckSweep} from '../sweep/useSweep';
import {PuckFrame, SweepButton, UndoPill, useHold, useTip} from './PuckParts';
import {spokenName} from './puckSymbol';
import {
    fineLevel, formatRange, isJump, parseEntry, placeRulerLeft, rulerTicks, rulerWidth, snapValue, widestChars,
    type EntryResult,
} from './pucksModel';

export interface PuckBounds {readonly left: number; readonly right: number; readonly width: number}

export interface RangePuckProps {
    /** The declared parameter (`kind: "range"`): its label names the slider, its help is the help card. */
    parameter: RangeParameter;
    value: number;
    /** Called with a value on the step grid inside the range; the caller writes it as `learner`. */
    /** Returns false when the write was not applied (refused), so no undo is offered for it. */
    onWrite(value: number): boolean | void;
    /** The board's rectangle: the drag ruler stays inside it. Read at drag time. */
    bounds?: () => PuckBounds | undefined;
    /** A domain refusal from the setter, shown at the puck. */
    refusal?: Message | string;
    /** Why the parameter is locked (a lesson frame); shown instead of the default reason. */
    lockReason?: Message;
    /** The sweep control; absent when none is offered (reduced motion, no arbiter). */
    sweep?: PuckSweep;
    /** Holds the key for the learner during a drag or a typed entry; returns the release. */
    onHold?(): () => void;
}

const TYPED_START = /^[0-9\-−,.]$/;
const DRAG_THRESHOLD = 3;
const RULER_HEIGHT = 44;

interface Drag {
    startX: number; startY: number; lastX: number; raw: number; moved: boolean; trackHit: boolean;
    pxPerRange: number; width: number; anchor: DOMRect;
    /** The board's rectangle, read once at pointer down: reading it per move forces a layout after every graph redraw. */
    bounds?: PuckBounds;
}
interface Entry {text: string; select: boolean}
interface RulerState {value: number; fine?: string; anchor: DOMRect; width: number; pxPerRange: number; bounds?: PuckBounds}

export function asText(refusal: Message | string | undefined): string | undefined {
    return refusal === undefined ? undefined : typeof refusal === 'string' ? refusal : renderMessage(refusal);
}

export function RangePuck(props: RangePuckProps) {
    const t = useT();
    const {parameter, value, onWrite} = props;
    const language = currentLanguage();
    const name = renderMessage(parameter.label);
    const spoken = spokenName(name, parameter.symbol);
    const locked = parameter.locked === true;
    const unit = parameter.unit ? renderMessage(parameter.unit) : '';
    const span = parameter.max - parameter.min;
    const bodyRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const drag = useRef<Drag>();
    const refocus = useRef(false);
    const latest = useRef(value);
    useEffect(() => { latest.current = value; });
    const [entry, setEntry] = useState<Entry | null>(null);
    const [notice, setNotice] = useState<string | undefined>();
    const [ruler, setRuler] = useState<RulerState | null>(null);
    const {controller, pending} = useJumpUndo(onWrite);
    const tip = useTip();
    const tipId = useId();
    const lockId = useId();
    const preview = usePreviewHover(parameter);
    const [hovered, setHovered] = useState<string | undefined>();
    const hold = useHold(props.onHold);
    const typing = entry !== null;
    useEffect(() => {
        if (!typing) return;
        hold.begin();
        return hold.end;
        // Holds once per open entry, not per typed character.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typing]);
    const fmt = (v: number) => formatRange(v, parameter, language);
    const valueText = unit ? `${fmt(value)} ${unit}` : fmt(value);
    const widthCh = widestChars(parameter, language) + (unit ? unit.length + 1 : 0) + 0.4;

    /** Writes `next`; only once it was applied does it offer the undo for a jump from `jumpFrom`, or end the offer for any other write. */
    const write = (next: number, jumpFrom?: number): boolean => {
        const previous = latest.current;
        if (next === previous) return false;
        latest.current = next;
        setNotice(undefined);
        if (onWrite(next) === false) { latest.current = previous; return false; }
        if (jumpFrom !== undefined) controller.offer(jumpFrom); else controller.dismiss();
        return true;
    };
    const step = (delta: number) => { write(snapValue(latest.current + delta, parameter)); };

    const refuse = (result: Extract<EntryResult, {ok: false}>): string => {
        if (result.reason === 'number') return t('puck_refuse_number', {value0: fmt(snapValue(parameter.min + span / 2, parameter))});
        return t('puck_refuse_range', {value0: fmt(parameter.min), value1: fmt(parameter.max)});
    };

    const closeEntry = () => { refocus.current = true; setEntry(null); };
    const submitEntry = () => {
        if (!entry) return;
        const result = parseEntry(entry.text, parameter);
        if (!result.ok) { setNotice(refuse(result)); return; }
        const before = latest.current;
        const applied = write(result.value, isJump(before, result.value, parameter.step) ? before : undefined);
        if (applied) setNotice(result.snapped ? t('puck_snapped', {value0: fmt(result.value)}) : undefined);
        closeEntry();
    };

    useEffect(() => {
        if (entry) {
            const input = inputRef.current;
            if (input && document.activeElement !== input) {
                input.focus();
                if (entry.select) input.select(); else input.setSelectionRange(input.value.length, input.value.length);
            }
        } else if (refocus.current) {
            refocus.current = false;
            bodyRef.current?.focus();
        }
        // The effect only moves focus when the entry opens or closes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry === null]);

    // The wheel steps the value; it needs a non-passive listener to keep the page from scrolling.
    useEffect(() => {
        const body = bodyRef.current;
        if (!body || locked) return;
        const onWheel = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            event.preventDefault();
            step(event.deltaY < 0 ? parameter.step : -parameter.step);
        };
        body.addEventListener('wheel', onWheel, {passive: false});
        return () => body.removeEventListener('wheel', onWheel);
        // `step` reads refs and props of this render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locked, parameter.step, parameter.min, parameter.max, entry === null]);

    // Mouse hover over the track previews the value a click there would jump to (same maths as the click); touch and keys show nothing.
    const active = useRef<typeof preview>();
    const endHover = () => { clearTimeout(restTimer.current); (active.current ?? preview)?.hide(); active.current = undefined; setHovered(undefined); };
    // A rest of the mouse on the body shows the overview fan: the graph at values across the sweep window, with the help card.
    const restTimer = useRef<ReturnType<typeof setTimeout>>();
    const startRest = () => {
        clearTimeout(restTimer.current);
        if (!preview || locked || drag.current || props.sweep?.running) return;
        restTimer.current = setTimeout(() => {
            if (drag.current) return;
            const current = latest.current;
            preview.showFan(fanWithNear(fanValues(parameter, current), current));
            active.current = preview;
        }, FAN_REST_MS);
    };
    // A parameter that becomes locked or not previewable while hovered ends its preview.
    useEffect(() => { if (active.current && (locked || !preview)) endHover(); }, [locked, preview]); // eslint-disable-line react-hooks/exhaustive-deps
    // A sweep that starts on the key, a wheel step or any other change of the value ends the fan.
    const running = props.sweep?.running === true;
    useEffect(() => { if (active.current) endHover(); }, [running, value]); // eslint-disable-line react-hooks/exhaustive-deps
    const onTrackMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!preview || locked || drag.current || event.pointerType !== 'mouse') return;
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;
        const target = snapValue(parameter.min + (event.clientX - rect.left) / rect.width * span, parameter);
        preview.show(target);
        active.current = preview;
        setHovered(t('puck_preview_value', {value0: fmt(target)}));
    };
    useEffect(() => endHover, []); // eslint-disable-line react-hooks/exhaustive-deps

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        clearTimeout(restTimer.current);
        if (locked || event.button > 0) return;
        endHover();
        tip.hide();
        hold.begin();
        const body = event.currentTarget;
        body.focus();
        try { body.setPointerCapture?.(event.pointerId); } catch { /* a synthetic pointer */ }
        const bounds = props.bounds?.();
        const width = rulerWidth(bounds, window.innerWidth);
        drag.current = {
            startX: event.clientX, startY: event.clientY, lastX: event.clientX, raw: latest.current, moved: false,
            trackHit: trackRef.current?.contains(event.target as Node) === true, pxPerRange: width, width, anchor: body.getBoundingClientRect(), bounds,
        };
    };
    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d) return;
        if (!d.moved) {
            if (Math.abs(event.clientX - d.startX) < DRAG_THRESHOLD && Math.abs(event.clientY - d.startY) < DRAG_THRESHOLD) return;
            d.moved = true;
            controller.dismiss();
        }
        const centre = d.anchor.top + d.anchor.height / 2;
        const level = fineLevel(Math.max(0, Math.abs(event.clientY - centre) - d.anchor.height / 2));
        d.raw += (event.clientX - d.lastX) / d.pxPerRange * span * level.factor;
        d.raw = Math.min(parameter.max, Math.max(parameter.min, d.raw));
        d.lastX = event.clientX;
        const next = snapValue(d.raw, parameter);
        write(next);
        setRuler({value: next, fine: level.label ? t(level.label) : undefined, anchor: d.anchor, width: d.width, pxPerRange: d.pxPerRange, bounds: d.bounds});
    };
    const endDrag = (event: {clientX: number}, cancelled: boolean) => {
        const d = drag.current;
        if (!d) return; // idempotent: pointerup is followed by lostpointercapture
        drag.current = undefined;
        setRuler(null);
        if (cancelled || d.moved || !d.trackHit) { hold.end(); return; }
        // A click on the track jumps there; more than one step away it offers the undo.
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) { hold.end(); return; }
        const target = snapValue(parameter.min + (event.clientX - rect.left) / rect.width * span, parameter);
        const before = latest.current;
        write(target, isJump(before, target, parameter.step) ? before : undefined);
        hold.end();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (locked || event.altKey || event.ctrlKey || event.metaKey) return;
        const delta = stepKeyDelta(event, parameter.step, parameter.bigStep, true);
        if (delta !== undefined) { event.preventDefault(); step(delta); return; }
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            write(event.key === 'Home' ? parameter.min : parameter.max);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            setEntry({text: fmt(latest.current), select: true});
        } else if (TYPED_START.test(event.key)) {
            event.preventDefault();
            setEntry({text: event.key, select: false});
        }
    };

    const fraction = span > 0 ? (value - parameter.min) / span : 0;
    const lockText = props.lockReason ? renderMessage(props.lockReason) : t('puck_locked');
    const describedBy = [tip.shown && tipId, locked && lockId].filter(Boolean).join(' ') || undefined;
    const help = parameter.help ? renderMessage(parameter.help) : undefined;

    return <PuckFrame label={name} symbol={parameter.symbol} help={help} locked={locked} lockReason={lockText} lockId={lockId} notice={notice ?? asText(props.refusal)}
        tip={hovered ?? (tip.shown ? help : undefined)} tipId={tipId} className={`puck-range${props.sweep?.running ? ' is-sweeping' : ''}`}
        headExtra={props.sweep && !locked && <SweepButton name={spoken} running={props.sweep.running} onToggle={props.sweep.toggle}/>}
        pill={<UndoPill open={pending !== undefined} name={spoken} onUndo={controller.undo} controller={controller}/>}>
        {entry
            // The entry keeps the body's structure (value line over the track) so the puck's height does not change either.
            ? <div className="puck-body puck-body-entry">
                <input ref={inputRef} className="puck-input" style={{width: `${widthCh}ch`}} inputMode="decimal" autoComplete="off" value={entry.text}
                    aria-label={t('puck_entry_label', {value0: spoken})} aria-invalid={notice !== undefined}
                    onChange={event => setEntry({text: event.target.value, select: false})}
                    onKeyDown={event => {
                        if (event.key === 'Enter') { event.preventDefault(); submitEntry(); }
                        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setNotice(undefined); closeEntry(); }
                    }}
                    onBlur={() => { setEntry(null); setNotice(undefined); }}/>
                <div className="puck-track" aria-hidden="true"><span className="puck-fill" style={{transform: `scaleX(${Math.min(1, Math.max(0, fraction))})`}}/><span className="puck-thumb" style={{transform: `translateX(${Math.min(1, Math.max(0, fraction)) * 100}%)`}}/></div>
            </div>
            : <div ref={bodyRef} {...tip.handlers} className="puck-body" role="slider" tabIndex={0} aria-label={spoken} aria-orientation="horizontal"
                aria-valuemin={parameter.min} aria-valuemax={parameter.max} aria-valuenow={value} aria-valuetext={valueText}
                aria-disabled={locked || undefined} aria-describedby={describedBy}
                onPointerEnter={event => { tip.handlers.onPointerEnter(event); if (event.pointerType === 'mouse') startRest(); }}
                onPointerLeave={() => { tip.handlers.onPointerLeave(); endHover(); }}
                onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                onPointerUp={event => endDrag(event, false)} onPointerCancel={event => endDrag(event, true)}
                onLostPointerCapture={event => endDrag(event, true)} onBlur={() => { tip.handlers.onBlur(); endDrag({clientX: 0}, true); }}
                onKeyDown={onKeyDown} onDoubleClick={() => { if (!locked) setEntry({text: fmt(latest.current), select: true}); }}>
                <span className="puck-value" style={{width: `${widthCh}ch`}}>{fmt(value)}{unit && <span className="puck-unit"> {unit}</span>}</span>
                <div ref={trackRef} className="puck-track" aria-hidden="true" onPointerMove={onTrackMove} onPointerLeave={event => { endHover(); if (event.pointerType === 'mouse' && event.relatedTarget instanceof Node && bodyRef.current?.contains(event.relatedTarget)) startRest(); }}><span className="puck-fill" style={{transform: `scaleX(${Math.min(1, Math.max(0, fraction))})`}}/><span className="puck-thumb" style={{transform: `translateX(${Math.min(1, Math.max(0, fraction)) * 100}%)`}}/></div>
            </div>}
        {ruler && createPortal(<DragRuler parameter={parameter} state={ruler} fmt={fmt}/>, document.body)}
    </PuckFrame>;
}

/** The drag ruler: a strip of ticks above the puck, kept inside the board's rectangle. */
function DragRuler({parameter, state, fmt}: {parameter: RangeParameter; state: RulerState; fmt(v: number): string}) {
    const left = placeRulerLeft(state.anchor, state.bounds, state.width, window.innerWidth);
    const ticks = rulerTicks(parameter, state.value, state.pxPerRange, state.width);
    return <div className="puck-ruler" aria-hidden="true" data-puck-ruler="" style={{left, bottom: Math.max(8, window.innerHeight - state.anchor.top + 8), width: state.width, height: RULER_HEIGHT}}>
        <svg width={state.width} height={26}>
            {ticks.map((tick, index) => <g key={index}>
                <line x1={tick.x} x2={tick.x} y1={tick.major ? 11 : 16} y2={24} className={tick.major ? 'major' : undefined}/>
                {tick.major && <text x={tick.x} y={8}>{fmt(tick.value)}</text>}
            </g>)}
            <line x1={state.width / 2} x2={state.width / 2} y1={0} y2={26} className="needle"/>
        </svg>
        <div className="puck-ruler-readout"><strong>{fmt(state.value)}</strong>{state.fine && <em> {state.fine}</em>}</div>
    </div>;
}
