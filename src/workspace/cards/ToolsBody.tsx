import {useEffect, useLayoutEffect, useRef} from 'react';
import {useT} from '../../localization';
import {useIsMeasurePass} from './MeasurePass';
import type {ToolsSection} from '../presenter/cardHost';
import './tools.css';

const SECTIONS: readonly ToolsSection[] = ['edit', 'display', 'save'];

/** The card's natural size: what the tools column was. The measure layer sees this proxy instead of a second copy of the graph's
 *  controls (two copies would duplicate every id and input); the shown body scrolls inside whatever height the layout gives. */
export const TOOLS_NATURAL = {w: 310, h: 420} as const;

export interface ToolsBodyProps {
    panels: Readonly<Record<ToolsSection, React.ReactNode>>;
    section: ToolsSection;
    /** A declared graph: its readout and legend panels live in cards, so the stylesheet hides the old ones (`[data-declared]`). */
    declared: boolean;
    /** A lesson card is read: not operable (slice 3 removes the lock). */
    locked?: boolean;
}

/** The three panels of Orodja (Uredi, Prikaz, Shrani); the head icons choose which one shows. All stay mounted. */
export function ToolsBody({panels, section, declared, locked = false}: ToolsBodyProps) {
    const t = useT();
    const measuring = useIsMeasurePass();
    const root = useRef<HTMLDivElement>(null);
    // Tab changes return the scroll owner (the card body) to the top.
    useEffect(() => {
        const body = root.current?.closest<HTMLElement>('[data-card-body]');
        if (body) body.scrollTop = 0;
    }, [section]);
    useLayoutEffect(() => {
        const element = root.current as (HTMLElement & {inert?: boolean}) | null;
        if (element) element.inert = locked;
    }, [locked]);
    if (measuring) return <div className="tools-body-proxy" style={{width: TOOLS_NATURAL.w, height: TOOLS_NATURAL.h}}/>;
    return <div ref={root} id="inspector-content" className="workspace-inspector tools-body"
        aria-disabled={locked || undefined} data-declared={declared ? '' : undefined} data-card-blocks="">
        {/* data-card-blocks: the layout reads the blocks of the shown panel as the places a cut may fall (measureCards.ts). */}
        {SECTIONS.map(id => <section key={id} id={`inspector-${id}`} data-testid={`inspector-${id}`} hidden={section !== id}
            aria-label={t(id)}>{panels[id]}</section>)}
    </div>;
}

const ICONS: Record<ToolsSection, string> = {
    edit: 'M3 13 L3.5 10 L10.5 3 L13 5.5 L6 12.5 Z M9 4.5 L11.5 7',
    display: 'M1.5 8 C3.5 4.5 6 3.5 8 3.5 C10 3.5 12.5 4.5 14.5 8 C12.5 11.5 10 12.5 8 12.5 C6 12.5 3.5 11.5 1.5 8 Z M8 6 A2 2 0 1 1 8 10 A2 2 0 1 1 8 6',
    save: 'M8 2.5 L8 10 M4.5 6.5 L8 10 L11.5 6.5 M3 13 L13 13',
};

/** Uredi, Prikaz and Shrani as icon buttons in the card head. Choosing one also unfolds the card (`onChoose`). */
export function ToolsHeadActions({section, onChoose, sections = SECTIONS}: {section: ToolsSection; onChoose: (section: ToolsSection) => void; sections?: readonly ToolsSection[]}) {
    const t = useT();
    const hints: Record<ToolsSection, string> = {edit: t('tool_group_edit_hint'), display: t('tool_group_display_hint'), save: t('tool_group_save_hint')};
    return <>
        {SECTIONS.filter(id => sections.includes(id)).map(id => <button key={id} type="button" className="board-card-button tools-head-button" aria-label={t(id)}
            aria-pressed={section === id} aria-controls={`inspector-${id}`} title={hints[id]} onClick={() => onChoose(id)}>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"><path d={ICONS[id]}/></svg>
        </button>)}
    </>;
}
