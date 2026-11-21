import React, {useEffect, useState} from 'react';
import {DockCard} from '../dock/DockCard';
import './toolsCard.css';

/**
 * Pick toolsCard: the tools column becomes a dock card ("Orodja") on the graph, with a head, fold and drag like the other
 * board cards, and the graph takes the page's full width. The card starts at the top-left anchor; it can dock at any
 * anchor or float. Phones keep the tools under the graph; the workspace renders them plainly there.
 */
export const TOOLS = 'tools';

const FOLD_KEY = 'ux-boardcard-collapsed:tools';
const readFold = () => { try { return localStorage.getItem(FOLD_KEY) === '1'; } catch { return false; } };

/**
 * The tools column as a dock card. The tools stay mounted while folded, so their state survives a fold.
 * While a reading frame locks the tools (`locked`) the card folds by itself (owner, 2026-11-21), giving the lesson the
 * room; opening it then only peeks until the frame ends. The learner's own fold is stored and comes back after.
 */
export function ToolsCard(props: {children: React.ReactNode; locked?: boolean}) {
    const locked = props.locked ?? false;
    const [own, setOwn] = useState(readFold);
    const [peek, setPeek] = useState(false);
    useEffect(() => { if (!locked) setPeek(false); }, [locked]);
    const onToggle = (open: boolean) => {
        if (locked) { setPeek(open); return; }
        setOwn(!open);
        try { localStorage.setItem(FOLD_KEY, open ? '0' : '1'); } catch { /* ignore */ }
    };
    return <DockCard kind={TOOLS} title="Orodja" what="orodja" region="tl" order={0} collapsed={own || (locked && !peek)} onToggle={onToggle}>
        {open => <div className="ux-tools-body" hidden={!open}>{props.children}</div>}
    </DockCard>;
}
