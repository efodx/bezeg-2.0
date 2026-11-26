import {useLayoutEffect, useRef, useState} from 'react';
import type {ToolsSection} from '../presenter/cardHost';

export const TOOLS_SECTION_IDS: readonly ToolsSection[] = ['edit', 'display', 'save'];

const SHOWN = 'input, button, select, textarea, canvas, svg, img, a';

/** Whether a panel shows anything: a control, a drawing or text, ignoring what a declared graph hides (`[data-declared-panel]`) and
 *  `hidden` parts. The panel is read in place and the walk stops at the first thing it shows, so a tab with content costs a few nodes. */
export function panelHasContent(panel: Element | null, declared: boolean): boolean {
    if (!panel) return false;
    const ignored = declared ? '[hidden], [data-declared-panel]' : '[hidden]';
    const walker = panel.ownerDocument.createTreeWalker(panel, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: node => node instanceof Element && node.matches(ignored) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node instanceof Element ? node.matches(SHOWN) : (node.nodeValue ?? '').trim() !== '') return true;
    }
    return false;
}

/** The Orodja tabs that have content, read from the mounted panels after every commit. While no tab has content all three count (nothing
 *  to prefer). When the shown tab is empty and another has content, the first such tab is shown instead. `keep` is the tab a lesson step
 *  sends the learner to: it counts whatever it holds and is never switched away from, so this hook and the lesson cannot pull against
 *  each other. */
export function useToolsSectionsWithContent(declared: boolean, section: ToolsSection, setSection: (section: ToolsSection) => void, keep?: ToolsSection): readonly ToolsSection[] {
    const [sections, setSections] = useState<readonly ToolsSection[]>(TOOLS_SECTION_IDS);
    const known = useRef<string>(TOOLS_SECTION_IDS.join());
    // Runs after every commit on purpose: the panels belong to the graph, which re-renders them without telling this hook. State is
    // set only when the set of tabs changes (compared through `known`), so it settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => {
        const withContent = TOOLS_SECTION_IDS.filter(id => id === keep || panelHasContent(document.getElementById(`inspector-${id}`), declared));
        const next = withContent.length === 0 ? TOOLS_SECTION_IDS : withContent;
        if (known.current !== next.join()) {
            known.current = next.join();
            setSections(next);
        }
        if (!next.includes(section)) setSection(next[0]);
    });
    return sections;
}
