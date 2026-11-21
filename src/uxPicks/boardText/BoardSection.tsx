import React, {useLayoutEffect, useState, useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {usePick} from '../picks';
import {DockCard} from '../dock/DockCard';

/**
 * Pick boardText: a read-only group of the tools that explains the graph (e.g. the transformations' "Vrstni red operacij")
 * becomes its own card on the graph instead of being buried in the tools (owner, 2026-11-21: "this could probably be a
 * separate control/card"). The body renders through a portal into the card, so React updates stay live. With the pick off
 * the group renders in the tools as before (an `inspector-group` with its heading).
 *
 * `<BoardSection kind="steps" title="Vrstni red operacij" what="vrstni red operacij">{body}</BoardSection>`; the
 * board text layer renders the cards (`BoardSectionCards`).
 */
interface Section { kind: string; title: string; what: string; slot: HTMLElement; }

const sections = new Map<string, Section>();
const listeners = new Set<() => void>();
let list: Section[] = [];
function emit() { list = [...sections.values()]; listeners.forEach(l => l()); }
function useSections(): Section[] {
    return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => list, () => list);
}

export function BoardSection(props: {kind: string; title: string; what: string; children: React.ReactNode}) {
    const on = usePick('boardText');
    const [slot] = useState(() => { const d = document.createElement('div'); d.className = 'ux-btext-body ux-bsection-body'; return d; });
    useLayoutEffect(() => {
        if (!on) return undefined;
        sections.set(props.kind, {kind: props.kind, title: props.title, what: props.what, slot});
        emit();
        return () => { if (sections.get(props.kind)?.slot === slot) sections.delete(props.kind); slot.remove(); emit(); };
    }, [on, props.kind, props.title, props.what, slot]);
    if (!on) return <div className="inspector-group"><h3>{props.title}</h3>{props.children}</div>;
    return createPortal(props.children, slot);
}

/** Moves the slot into the open card's body; a folded card detaches it (the content never falls back into the tools). */
function SlotHost(props: {slot: HTMLElement}) {
    return <div ref={el => { if (el && props.slot.parentElement !== el) el.appendChild(props.slot); }}/>;
}

/** One card per registered section, at the left middle (the right column holds the text, readouts and legend). */
export function BoardSectionCards() {
    const all = useSections();
    return <>{all.map((s, i) => <DockCard key={s.kind} kind={`section-${s.kind}`} title={s.title} what={s.what} region="ml" order={i} foldWhenNarrow>
        {open => open && <SlotHost slot={s.slot}/>}
    </DockCard>)}</>;
}
