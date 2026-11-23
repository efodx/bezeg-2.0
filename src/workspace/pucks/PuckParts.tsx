import {useCallback, useEffect, useId, useState} from 'react';
import type {FocusEvent, PointerEvent, ReactNode} from 'react';
import {useT} from '../../localization';
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

export interface FrameProps {
    label: string;
    help?: string;
    locked: boolean;
    lockReason: string;
    /** A refusal shown at the puck, already text. */
    notice?: string;
    tip?: string;
    tipId?: string;
    lockId?: string;
    pill?: ReactNode;
    className?: string;
    children: ReactNode;
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
            <span className="puck-label" title={props.label}>{props.label}</span>
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
