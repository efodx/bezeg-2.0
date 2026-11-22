import React, {useState} from 'react';
import {createPortal} from 'react-dom';

/**
 * Pick toolsCard: the tools' tab group (Uredi / Prikaz / Shrani) as three icon buttons in the Orodja head, open or folded.
 * Each keeps aria-pressed, its label as the accessible name and its hint as the description; the label is shown as a tooltip
 * on a fine pointer's hover and on keyboard focus (never after a click or tap), like the pucks'. The tooltip is drawn on the
 * page, outside the card (the card clips its own box, and a folded card is only its head).
 */
export interface ToolTab { id: string; label: string; hint: string; }

const base = {viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false} as const;
/** A pencil: edit. */
const PencilIcon = () => <svg {...base}><path d="M10.5 3.2 12.8 5.5 5.6 12.7 2.9 13.1 3.3 10.4zM9.2 4.5l2.3 2.3"/></svg>;
/** An eye: display. */
const EyeIcon = () => <svg {...base}><path d="M1.5 8S4 3.7 8 3.7 14.5 8 14.5 8 12 12.3 8 12.3 1.5 8 1.5 8z"/><circle cx={8} cy={8} r={1.9}/></svg>;
/** A tray with a down arrow: save. */
const SaveIcon = () => <svg {...base}><path d="M8 2.5v7M5.2 6.9 8 9.7l2.8-2.8M2.8 10.5v2.2c0 .4.3.8.8.8h8.8c.5 0 .8-.4.8-.8v-2.2"/></svg>;
const ICONS: Record<string, () => React.JSX.Element> = {edit: PencilIcon, display: EyeIcon, save: SaveIcon};

interface Tip { label: string; x: number; y: number; }

export function ToolTabs(props: {tabs: ToolTab[]; current: string; onPick: (id: string) => void; label: string}) {
    const [tip, setTip] = useState<Tip | null>(null);
    const show = (el: HTMLElement, label: string) => {
        const r = el.getBoundingClientRect();
        setTip({label, x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom + 6)});
    };
    return <span className="ux-tool-tabs" role="group" aria-label={props.label}>
        {props.tabs.map(tab => {
            const Icon = ICONS[tab.id] ?? PencilIcon;
            return <button key={tab.id} type="button" className="ux-tool-tab" aria-label={tab.label} aria-pressed={props.current === tab.id}
                aria-describedby={`inspector-tab-hint-${tab.id}`} aria-controls={`inspector-${tab.id}`}
                onClick={() => props.onPick(tab.id)}
                onPointerEnter={e => { if (e.pointerType === 'mouse') show(e.currentTarget, tab.label); }}
                onPointerLeave={() => setTip(null)}
                onFocus={e => { if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget, tab.label); }}
                onBlur={() => setTip(null)}
                onKeyDown={e => { if (e.key === 'Escape') setTip(null); }}><Icon/></button>;
        })}
        {tip && createPortal(<span role="tooltip" aria-hidden="true" className="ux-tool-tab-tip" style={{left: tip.x, top: tip.y}}>{tip.label}</span>, document.body)}
    </span>;
}
