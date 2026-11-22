import React, {useEffect, useState} from 'react';
import {DockCard} from '../dock/DockCard';
import {budgetOpen, storedFold} from '../dock/dockBudget';
import {useGraphUx} from '../declare/graphUxStore';
import {useToolsSections} from './useToolsSections';
import {setToolsExpanded, useToolsExpanded} from './toolsExpand';
import {ToolTabs, type ToolTab} from './ToolTabs';
import './toolsCard.css';

/**
 * Pick toolsCard: the tools column becomes a dock card ("Orodja") on the graph, with a head, fold and drag like the other
 * board cards, and the graph takes the page's full width. The card starts at the top-left anchor; it can dock at any
 * anchor or float. Phones keep the tools under the graph; the workspace renders them plainly there.
 */
export const TOOLS = 'tools';

const FOLD_KEY = 'ux-boardcard-collapsed:tools';
/** The fold the learner chose during the current lesson (memory only; cleared when the lesson closes; never stored). */
let lessonFold: boolean | null = null;
const lessonIsOpen = () => !!document.querySelector('.demonstration-workspace.lesson-open');

/** The learner's stored fold; with none, the card budget decides (open on a free graph from 1200 px, with Odčitki). */
const readFold = () => storedFold(FOLD_KEY);

/**
 * The tools column as a dock card. The tools stay mounted while folded, so their state survives a fold.
 * While a reading frame locks the tools (`locked`) the card folds by itself (owner, 2026-11-21), giving the lesson the
 * room; opening it then only peeks until the frame ends. The learner's own fold is stored and comes back after.
 */
export function ToolsCard(props: {children: React.ReactNode; locked?: boolean; tabs?: {tabs: ToolTab[]; current: string; label: string; onPick: (id: string) => void}}) {
    const locked = props.locked ?? false;
    const [body, setBody] = useState<HTMLDivElement | null>(null);
    useToolsSections(body);
    useGraphUx(); // the budget order depends on the graph's `firstCard`, published after the first render
    const [own, setOwn] = useState(readFold);
    const [peek, setPeek] = useState(false);
    useEffect(() => { if (!locked) setPeek(false); }, [locked]);
    // Reading room: at every width a lesson starts (owner, round 5: tools folded always) the card folded; opening it is remembered until the lesson closes.
    const [inLesson, setInLesson] = useState(lessonIsOpen);
    const [lessonOwn, setLessonOwn] = useState<boolean | null>(lessonFold);
    useEffect(() => {
        const workspace = document.querySelector('.demonstration-workspace');
        const apply = () => {
            const now = !!workspace?.classList.contains('lesson-open');
            setInLesson(now);
            if (!now) { lessonFold = null; setLessonOwn(null); }
        };
        apply();
        const observer = workspace ? new MutationObserver(apply) : null;
        if (workspace) observer?.observe(workspace, {attributes: true, attributeFilter: ['class']});
        return () => { observer?.disconnect(); };
    }, []);
    const reading = inLesson;
    const onToggle = (open: boolean) => {
        if (locked) { setPeek(open); return; }
        if (reading) { lessonFold = !open; setLessonOwn(!open); return; }
        setOwn(!open);
        try { localStorage.setItem(FOLD_KEY, open ? '0' : '1'); } catch { /* ignore */ }
    };
    const folded = (reading ? lessonOwn ?? true : own ?? !budgetOpen(TOOLS, false)) || (locked && !peek);
    const expanded = useToolsExpanded();
    // Folding Orodja, or leaving the page, returns the stack to its previous split.
    useEffect(() => { if (folded) setToolsExpanded(false); }, [folded]);
    useEffect(() => () => setToolsExpanded(false), []);
    // An icon in the head picks its tab; on the folded card it also opens the card.
    const pick = (id: string) => { props.tabs?.onPick(id); if (folded) onToggle(true); };
    const tabs = props.tabs && <ToolTabs tabs={props.tabs.tabs} current={props.tabs.current} label={props.tabs.label} onPick={pick}/>;
    return <DockCard kind={TOOLS} title="Orodja" what="orodja" region="tl" order={0} collapsed={folded} onToggle={onToggle}
        headExtra={tabs} className={expanded && !folded ? 'is-expanded' : undefined}>
        {open => <div className="ux-tools-body" ref={setBody} hidden={!open}>{props.children}</div>}
    </DockCard>;
}
