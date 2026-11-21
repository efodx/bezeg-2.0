import React, {useEffect, useState} from 'react';
import {DockCard} from '../dock/DockCard';
import {useToolsSections} from './useToolsSections';
import './toolsCard.css';

/**
 * Pick toolsCard: the tools column becomes a dock card ("Orodja") on the graph, with a head, fold and drag like the other
 * board cards, and the graph takes the page's full width. The card starts at the top-left anchor; it can dock at any
 * anchor or float. Phones keep the tools under the graph; the workspace renders them plainly there.
 */
export const TOOLS = 'tools';

const FOLD_KEY = 'ux-boardcard-collapsed:tools';
/** Below this width the board is crowded: while a guided lesson is open the tools card starts folded (the lesson gets the room). */
const NARROW_QUERY = '(max-width: 1199.98px)';
/** The fold the learner chose during the current lesson (memory only; cleared when the lesson closes; never stored). */
let lessonFold: boolean | null = null;
const lessonIsOpen = () => !!document.querySelector('.demonstration-workspace.lesson-open');

const readFold = () => { try { return localStorage.getItem(FOLD_KEY) === '1'; } catch { return false; } };

/**
 * The tools column as a dock card. The tools stay mounted while folded, so their state survives a fold.
 * While a reading frame locks the tools (`locked`) the card folds by itself (owner, 2026-11-21), giving the lesson the
 * room; opening it then only peeks until the frame ends. The learner's own fold is stored and comes back after.
 */
export function ToolsCard(props: {children: React.ReactNode; locked?: boolean}) {
    const locked = props.locked ?? false;
    const [body, setBody] = useState<HTMLDivElement | null>(null);
    useToolsSections(body);
    const [own, setOwn] = useState(readFold);
    const [peek, setPeek] = useState(false);
    useEffect(() => { if (!locked) setPeek(false); }, [locked]);
    // Reading room: on a narrow window a lesson starts the card folded; opening it is remembered until the lesson closes.
    const [inLesson, setInLesson] = useState(lessonIsOpen);
    const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
    const [lessonOwn, setLessonOwn] = useState<boolean | null>(lessonFold);
    useEffect(() => {
        const mq = window.matchMedia(NARROW_QUERY);
        const onMq = () => setNarrow(mq.matches);
        mq.addEventListener('change', onMq);
        const workspace = document.querySelector('.demonstration-workspace');
        const apply = () => {
            const now = !!workspace?.classList.contains('lesson-open');
            setInLesson(now);
            if (!now) { lessonFold = null; setLessonOwn(null); }
        };
        apply();
        const observer = workspace ? new MutationObserver(apply) : null;
        if (workspace) observer?.observe(workspace, {attributes: true, attributeFilter: ['class']});
        return () => { mq.removeEventListener('change', onMq); observer?.disconnect(); };
    }, []);
    const reading = inLesson && narrow;
    const onToggle = (open: boolean) => {
        if (locked) { setPeek(open); return; }
        if (reading) { lessonFold = !open; setLessonOwn(!open); return; }
        setOwn(!open);
        try { localStorage.setItem(FOLD_KEY, open ? '0' : '1'); } catch { /* ignore */ }
    };
    return <DockCard kind={TOOLS} title="Orodja" what="orodja" region="tl" order={0} collapsed={(reading ? lessonOwn ?? true : own) || (locked && !peek)} onToggle={onToggle}>
        {open => <div className="ux-tools-body" ref={setBody} hidden={!open}>{props.children}</div>}
    </DockCard>;
}
