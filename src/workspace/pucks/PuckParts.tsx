import {useCallback, useEffect, useId, useRef, useState} from 'react';
import type {FocusEvent, PointerEvent, ReactNode} from 'react';
import {useT} from '../../localization';
import {Tex} from '../cards/Tex';
import './pucks.css';

/** Pieces both pucks share: the undo pill, the help card and its tooltip, the frame with its notice and lock reason. */

/** "Razveljavi" for 4 s after a jump; clicking it or pressing Esc anywhere restores the previous value. */
export function UndoPill(props: {open: boolean; name: string; onUndo(): void}) {
    const t = useT();
    const {open, onUndo} = props;
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            event.preventDefault();
            onUndo();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onUndo]);
    if (!open) return null;
    return <button type="button" className="puck-undo" aria-label={t('puck_undo_label', {value0: props.name})} onClick={onUndo}>{t('puck_undo')}</button>;
}

/**
 * Tooltip handlers: the help text shows on mouse hover and on keyboard focus (`:focus-visible`), never on touch and
 * never while a drag or a click is in progress.
 */
export function useTip() {
    const [shown, setShown] = useState(false);
    const hide = useCallback(() => setShown(false), []);
    return {
        shown,
        hide,
        handlers: {
            onPointerEnter: (event: PointerEvent) => { if (event.pointerType === 'mouse') setShown(true); },
            onPointerLeave: hide,
            onPointerDown: hide,
            onFocus: (event: FocusEvent) => {
                let visible = false;
                try { visible = event.currentTarget.matches(':focus-visible'); } catch { /* an engine without the selector */ }
                if (visible) setShown(true);
            },
            onBlur: hide,
        },
    };
}

/** Holds the puck's key for the learner while a drag or a typed entry is open (it ends a sweep on the key); released on end and on unmount. */
export function useHold(onHold?: () => () => void) {
    const release = useRef<() => void>();
    const end = useCallback(() => { release.current?.(); release.current = undefined; }, []);
    const begin = useCallback(() => { end(); release.current = onHold?.(); }, [onHold, end]);
    useEffect(() => end, [end]);
    return {begin, end};
}

export interface FrameProps {
    label: string;
    /** The declared symbol (undelimited TeX), typeset after the bare label. */
    symbol?: string;
    help?: string;
    locked: boolean;
    lockReason: string;
    /** A refusal shown at the puck, already text. */
    notice?: string;
    tip?: string;
    tipId?: string;
    lockId?: string;
    pill?: ReactNode;
    /** Sits in the label row before the "?" (the sweep button). */
    headExtra?: ReactNode;
    className?: string;
    children: ReactNode;
}

/** The button that lets a parameter move by itself; `aria-pressed` while it does. Quiet on fine pointers, always shown on touch (css). */
export function SweepButton(props: {name: string; running: boolean; onToggle(): void}) {
    const t = useT();
    const label = t('puck_sweep', {value0: props.name});
    return <button type="button" className="puck-sweep" aria-pressed={props.running} aria-label={label} title={label} onClick={props.onToggle}>
        {props.running
            ? <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false" data-glyph="stop">
                <rect x="3.5" y="3.5" width="9" height="9" fill="currentColor"/>
            </svg>
            : <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false" data-glyph="sweep">
                <path d="M1 8 C3 2 5 2 8 8 S13 14 15 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>}
    </button>;
}

/** The puck's outer box: label row with the "?" help, the control, the notice and the lock reason. */
export function PuckFrame(props: FrameProps) {
    const t = useT();
    const [helpOpen, setHelpOpen] = useState(false);
    const helpId = useId();
    return <div className={`puck${props.locked ? ' is-locked' : ''} ${props.className ?? ''}`} data-puck=""
        onKeyDown={event => { if (event.key === 'Escape' && helpOpen) { event.stopPropagation(); setHelpOpen(false); } }}>
        {props.pill}
        <div className="puck-head">
            <span className="puck-label" title={props.label}>{props.label}{props.symbol && <>{' '}<Tex tex={props.symbol} className="ws-symbol"/></>}</span>
            {props.headExtra}
            {props.help && <button type="button" className="puck-help-button" aria-expanded={helpOpen} aria-controls={helpId}
                aria-label={helpOpen ? t('puck_help_close') : t('puck_help_open', {value0: props.label})}
                onClick={() => setHelpOpen(open => !open)}>?</button>}
        </div>
        {props.children}
        {props.tip && !helpOpen && <div role="tooltip" id={props.tipId} className="puck-tip">{props.tip}</div>}
        {props.help && helpOpen && <div id={helpId} className="puck-help-card" role="group" aria-label={props.label}>{props.help}</div>}
        <div className="puck-notice" role="status" aria-live="polite">{props.notice ?? ''}</div>
        {props.locked && <div className="puck-lock" id={props.lockId} data-puck-lock="">{props.lockReason}</div>}
    </div>;
}
