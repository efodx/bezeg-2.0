import React, {useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {usePick} from '../picks';
import {HelpIcon} from '../dock/icons';

/**
 * Pick boardText: a result group of the tools ("Odčitki") moves into the readout card on the graph. With the pick on, the
 * children render through a portal into their own slot inside the card's body (React content, MathJax, data-readout
 * hooks and live updates stay as they are); slots stack in document order of the groups' anchors. With the pick off,
 * the children render in place and nothing changes. A folded card detaches the slots, so the readouts never fall back
 * into the tools.
 */
interface Entry { anchor: HTMLElement; slot: HTMLElement; }

const entries = new Set<Entry>();
const listeners = new Set<() => void>();
let host: HTMLElement | null = null;
let count = 0;

function layout() {
    if (!host) return;
    const sorted = [...entries].filter(e => e.anchor.isConnected)
        .sort((a, b) => a.anchor.compareDocumentPosition(b.anchor) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    sorted.forEach((e, i) => { if (host!.children[i] !== e.slot) host!.insertBefore(e.slot, host!.children[i] ?? null); });
}
function emit() {
    count = entries.size;
    layout();
    listeners.forEach(l => l());
}
/** What the readout groups show now (their slots keep their content while the card is folded). */
export function readoutText(): string { return [...entries].map(e => e.slot.textContent ?? '').join(' '); }
export function setReadoutHost(el: HTMLElement | null) { host = el; layout(); }
export function useReadoutCount(): number {
    return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => count, () => 0);
}

export function BoardReadout(props: {children: React.ReactNode}) {
    const on = usePick('boardText');
    const anchor = useRef<HTMLSpanElement>(null);
    const [slot] = useState(() => { const d = document.createElement('div'); d.className = 'ux-bread-slot'; return d; });
    useLayoutEffect(() => {
        if (!on || !anchor.current) return undefined;
        const entry = {anchor: anchor.current, slot};
        entries.add(entry); emit();
        return () => { entries.delete(entry); slot.remove(); emit(); };
    }, [on, slot]);
    if (!on) return <>{props.children}</>;
    return <><span ref={anchor} hidden data-readout-anchor=""/>{createPortal(props.children, slot)}</>;
}

/** Explanations in the readout slots: help paragraphs, not status lines (those stay visible). */
const HELP = '.ux-bread-slot :is(p, .inspector-help, .form-text):not([role="status"], [role="alert"], [aria-live], [data-refusal-notice], .function-status, .visually-hidden)';

/**
 * The readout card's body: the slots of every readout group, in document order. Help paragraphs sit behind a "?" at the
 * foot (closed by default, like the tools sections), so the card shows values first.
 */
export function ReadoutBody() {
    const wrap = useRef<HTMLDivElement>(null);
    const [has, setHas] = useState(false);
    const [open, setOpen] = useState(false);
    useLayoutEffect(() => {
        const run = () => setHas(!!wrap.current?.querySelector(HELP));
        run();
        const timer = window.setInterval(run, 300);
        return () => window.clearInterval(timer);
    }, []);
    return <div ref={wrap} className="ux-bread-wrap" data-help-open={open || undefined}>
        <div className="ux-btext-body ux-bread-body" ref={setReadoutHost}/>
        {has && <div className="ux-bread-helpbar">
            <button type="button" className="ux-sec-help" aria-expanded={open} aria-label="Pomoč: odčitki" title="Pomoč: odčitki" onClick={() => setOpen(o => !o)}><HelpIcon/></button>
        </div>}
    </div>;
}
