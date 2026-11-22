import {useSyncExternalStore} from 'react';
import {getGraphUx} from '../declare/graphUxStore';

/**
 * Card budget (round 11): a card with no stored fold starts open only if it is within the budget, so a first view is not
 * crowded: from WIDE_PX on two cards may be open, below it one; the lesson card counts as one. Priority for the open slots:
 * lesson card, Odčitki (readout), Orodja (tools). Legenda and section cards start folded. The learner's own fold is stored
 * by the card and always wins. Fold before clip: `planFolds` folds the lowest-priority open unstored card of a column that
 * cannot show its cards whole (never the lesson card), instead of clipping it.
 */
export const WIDE_PX = 1200;
const OPEN_ORDER = ['readout', 'tools'];
/** A graph whose main action lives in Orodja declares `firstCard: 'tools'` (GraphUx): Orodja then comes before Odčitki. */
const toolsFirst = () => getGraphUx()?.firstCard === 'tools';

/** Whether the budget opens this card (before any fold-before-clip). */
export function budgetOpen(kind: string, lesson: boolean): boolean {
    const slots = (window.innerWidth >= WIDE_PX ? 2 : 1) - (lesson ? 1 : 0);
    const order = toolsFirst() ? ['tools', 'readout'] : OPEN_ORDER;
    const i = order.indexOf(kind);
    return i >= 0 && i < slots;
}

/** How soon a card folds when its column is too full: smaller folds first; the lesson card never. */
function priority(kind: string): number {
    return kind === 'guide' ? Infinity : kind === 'readout' ? (toolsFirst() ? 1 : 2) : kind === 'tools' ? (toolsFirst() ? 2 : 1) : 0;
}

export const storedFold = (key: string): boolean | null => {
    try { const v = localStorage.getItem(key); return v === null ? null : v === '1'; } catch { return null; }
};

let folded: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
const set = (next: Set<string>) => {
    if (next.size === folded.size && [...next].every(k => folded.has(k))) return;
    folded = next;
    listeners.forEach(l => l());
};
/** Cards the planner folded to avoid clipping (display only; never stored). */
export function useBudgetFolded(kind: string): boolean {
    return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => folded.has(kind), () => false);
}

/** One planning pass: the planner forgets its folds, then folds cards until no side column clips (re-run after layout). */
export function planFolds(dock: HTMLElement, keyOf: (kind: string) => string) {
    set(new Set());
    let rounds = 0;
    const step = () => {
        const next = new Set(folded);
        let changed = false;
        for (const col of Array.from(dock.querySelectorAll<HTMLElement>('.ux-dock-col-l, .ux-dock-col-r'))) {
            const stacks = Array.from(col.querySelectorAll<HTMLElement>('[data-region]'));
            const clips = stacks.some(s => s.scrollHeight > s.clientHeight + 1);
            if (!clips) continue;
            const open = stacks.flatMap(s => Array.from(s.children) as HTMLElement[])
                .filter(c => c.hasAttribute('data-dock-item') && !c.classList.contains('ux-btext-collapsed') && !c.classList.contains('is-floating'));
            if (open.length < 2) continue;
            const cands = open.filter(c => c.dataset.kind && c.dataset.kind !== 'guide' && storedFold(keyOf(c.dataset.kind!)) === null && !next.has(c.dataset.kind!));
            if (cands.length === 0) continue;
            cands.sort((a, b) => priority(a.dataset.kind!) - priority(b.dataset.kind!));
            next.add(cands[0].dataset.kind!);
            changed = true;
        }
        if (!changed) return;
        set(next);
        if (++rounds < 6) window.setTimeout(step, 120);
    };
    window.setTimeout(step, 120);
}
