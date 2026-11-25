import {useEffect, useId, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {formatNumber} from '../../analysis/format';
import {currentLanguage, renderMessage, useT} from '../../localization';
import type {Message} from '../../localization';
import type {CountParameter} from '../../graphs/base/declare/graphDeclaration';
import {parseDecimal} from '../../inputs/NumberInput';
import {usePreviewHover} from '../preview/previewContext';
import {useJumpUndo} from './jumpUndo';
import type {PuckSweep} from '../sweep/useSweep';
import {PuckFrame, SweepButton, UndoPill, useHold, useTip} from './PuckParts';
import {widestCountChars} from './pucksModel';
import {asText} from './RangePuck';

export interface CountPuckProps {
    /** The declared parameter (`kind: "count"`). */
    parameter: CountParameter;
    value: number;
    onWrite(value: number): void;
    /** A domain refusal from the setter, shown at the puck. */
    refusal?: Message | string;
    lockReason?: Message;
    /** The sweep control; absent when none is offered (reduced motion, no arbiter). */
    sweep?: PuckSweep;
    /** Holds the key for the learner during a typed entry; returns the release. */
    onHold?(): () => void;
}

const TYPED_START = /^[0-9\-−]$/;

export function CountPuck(props: CountPuckProps) {
    const t = useT();
    const {parameter, value, onWrite} = props;
    const language = currentLanguage();
    const name = renderMessage(parameter.label);
    const locked = parameter.locked === true;
    const bodyRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const refocus = useRef(false);
    const latest = useRef(value);
    useEffect(() => { latest.current = value; });
    const [entry, setEntry] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | undefined>();
    const {controller, pending} = useJumpUndo(onWrite);
    const tip = useTip();
    const tipId = useId();
    const lockId = useId();
    const fmt = (n: number) => formatNumber(n, language, 0);
    const widthCh = widestCountChars(parameter) + 0.4;
    const preview = usePreviewHover(parameter);
    const [hovered, setHovered] = useState<string | undefined>();
    const hold = useHold(props.onHold);
    const typing = entry !== null;
    useEffect(() => {
        if (!typing) return;
        hold.begin();
        return hold.end;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typing]);
    // The − and + buttons preview the value a press would give (mouse only); at a bound there is nothing to preview.
    const showStep = (delta: number) => {
        const target = latest.current + delta;
        if (!preview || locked || target < parameter.min || target > parameter.max) { endHover(); return; }
        preview.show(target);
        active.current = preview;
        setHovered(t('puck_preview_value', {value0: fmt(target)}));
    };
    const active = useRef<typeof preview>();
    const endHover = () => { (active.current ?? preview)?.hide(); active.current = undefined; setHovered(undefined); };
    // A parameter that becomes locked or not previewable while hovered ends its preview.
    useEffect(() => { if (active.current && (locked || !preview)) endHover(); }, [locked, preview]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => endHover, []); // eslint-disable-line react-hooks/exhaustive-deps

    const write = (next: number) => {
        const bounded = Math.min(parameter.max, Math.max(parameter.min, next));
        if (bounded === latest.current) return;
        latest.current = bounded;
        setNotice(undefined);
        onWrite(bounded);
    };
    const step = (delta: number) => { controller.dismiss(); write(latest.current + delta); };
    const closeEntry = () => { refocus.current = true; setEntry(null); };
    const submitEntry = () => {
        if (entry === null) return;
        const parsed = parseDecimal(entry);
        if (!Number.isFinite(parsed)) { setNotice(t('puck_refuse_number', {value0: fmt(parameter.min)})); return; }
        if (!Number.isInteger(parsed) || parsed < parameter.min || parsed > parameter.max) {
            setNotice(t('puck_refuse_whole', {value0: fmt(parameter.min), value1: fmt(parameter.max)}));
            return;
        }
        const before = latest.current;
        // A typed count more than one step away offers the undo, like a range jump.
        if (Math.abs(parsed - before) > 1) controller.offer(before); else controller.dismiss();
        write(parsed);
        closeEntry();
    };

    useEffect(() => {
        if (entry !== null) {
            const input = inputRef.current;
            if (input && document.activeElement !== input) input.focus();
        } else if (refocus.current) {
            refocus.current = false;
            bodyRef.current?.focus();
        }
        // The effect only moves focus when the entry opens or closes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry === null]);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (locked || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); step(1); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
        else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            controller.dismiss();
            write(event.key === 'Home' ? parameter.min : parameter.max);
        } else if (event.key === 'Enter') { event.preventDefault(); setEntry(fmt(latest.current)); }
        else if (TYPED_START.test(event.key)) { event.preventDefault(); setEntry(event.key); }
    };

    const baseHelp = parameter.help ? renderMessage(parameter.help) : undefined;
    // A previewable count says where its preview is: the − and + buttons.
    const help = preview && baseHelp ? `${baseHelp} ${t('puck_count_preview_hint')}` : baseHelp;
    const lockText = props.lockReason ? renderMessage(props.lockReason) : t('puck_locked');
    const describedBy = [tip.shown && tipId, locked && lockId].filter(Boolean).join(' ') || undefined;
    const atMin = value <= parameter.min, atMax = value >= parameter.max;

    return <PuckFrame label={name} symbol={parameter.symbol} help={help} locked={locked} lockReason={lockText} lockId={lockId} notice={notice ?? asText(props.refusal)}
        tip={hovered ?? (tip.shown ? help : undefined)} tipId={tipId} className={`puck-count${props.sweep?.running ? ' is-sweeping' : ''}`}
        headExtra={props.sweep && !locked && <SweepButton name={name} running={props.sweep.running} onToggle={props.sweep.toggle}/>}
        pill={<UndoPill open={pending !== undefined} name={name} onUndo={controller.undo}/>}>
        <div className="puck-stepper">
            <button type="button" className="puck-step" aria-label={t('puck_decrease', {value0: name})} aria-disabled={locked || atMin || undefined}
                onPointerEnter={event => { if (event.pointerType === 'mouse') showStep(-1); }} onPointerLeave={endHover}
                onClick={() => { if (!locked && !atMin) { step(-1); if (hovered !== undefined) showStep(-1); } }}>−</button>
            {entry !== null
                ? <input ref={inputRef} className="puck-input" style={{width: `${widthCh}ch`}} inputMode="numeric" autoComplete="off" value={entry}
                    aria-label={t('puck_entry_label', {value0: name})} aria-invalid={notice !== undefined}
                    onChange={event => setEntry(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') { event.preventDefault(); submitEntry(); }
                        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setNotice(undefined); closeEntry(); }
                    }}
                    onBlur={() => { setEntry(null); setNotice(undefined); }}/>
                : <div ref={bodyRef} {...tip.handlers} className="puck-body puck-count-value" role="spinbutton" tabIndex={0} aria-label={name}
                    aria-valuemin={parameter.min} aria-valuemax={parameter.max} aria-valuenow={value} aria-valuetext={fmt(value)}
                    aria-disabled={locked || undefined} aria-describedby={describedBy}
                    onKeyDown={onKeyDown} onDoubleClick={() => { if (!locked) setEntry(fmt(latest.current)); }}>
                    <span className="puck-value" style={{width: `${widthCh}ch`}}>{fmt(value)}</span>
                </div>}
            <button type="button" className="puck-step" aria-label={t('puck_increase', {value0: name})} aria-disabled={locked || atMax || undefined}
                onPointerEnter={event => { if (event.pointerType === 'mouse') showStep(1); }} onPointerLeave={endHover}
                onClick={() => { if (!locked && !atMax) { step(1); if (hovered !== undefined) showStep(1); } }}>+</button>
        </div>
    </PuckFrame>;
}
