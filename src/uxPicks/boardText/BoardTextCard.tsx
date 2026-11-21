import React, {useEffect, useRef, useState} from 'react';
import './BoardTextCard.css';

const HIDDEN = 'ux-boardtext-hidden';
const FORMULA_STYLE = 'color:#4d594f;font-size:1.2em';
const KEY = 'ux-boardtext-collapsed';

interface JxgText {
    elType: string; id: string; rendNode?: HTMLElement; visPropCalc?: {visible?: boolean};
    coords?: {scrCoords: number[]}; visProp?: {islabel?: boolean};
}
interface JxgBoard {
    containerObj: HTMLElement; objects: Record<string, JxgText>;
    on(ev: string, fn: () => void): void; off(ev: string, fn: () => void): void; update(): void;
}

/** Informational board texts: the formula line (shared style) and corner readouts (top-left HUD). */
function isInfoText(e: JxgText): boolean {
    if (e.elType !== 'text' || !e.rendNode || e.visProp?.islabel || e.id.endsWith('_infobox')) return false;
    if (e.rendNode.innerHTML.includes(FORMULA_STYLE)) return true;
    const c = e.coords?.scrCoords;
    return !!c && c[1] <= 40 && c[2] <= 130 && e.rendNode.textContent !== '';
}

function findBoard(frame: HTMLElement): JxgBoard | undefined {
    const boards = (window as unknown as {JXG?: {boards: Record<string, JxgBoard>}}).JXG?.boards;
    return boards && Object.values(boards).find(b => frame.contains(b.containerObj));
}

function readCollapsed(): boolean {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

/** Moves the formula and readout texts off the board into a hideable card over the graph. */
export function BoardTextCard(props: {frame: React.RefObject<HTMLDivElement | null>}) {
    const [rows, setRows] = useState<string[]>([]);
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const last = useRef('');

    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        let board: JxgBoard | undefined;
        const hidden = new Set<HTMLElement>();
        const sync = () => {
            const b = findBoard(frame);
            if (b !== board) { board?.off('update', sync); board = b; board?.on('update', sync); }
            if (!b) return;
            const html: string[] = [];
            for (const e of Object.values(b.objects)) {
                if (!isInfoText(e)) continue;
                const node = e.rendNode!;
                if (e.visPropCalc?.visible === false) { node.classList.remove(HIDDEN); continue; }
                const inner = node.innerHTML;
                if (inner.trim() !== '') html.push(inner);
                node.classList.add(HIDDEN); hidden.add(node);
            }
            const joined = html.join('\u0000');
            if (joined !== last.current) { last.current = joined; setRows(html); }
        };
        sync();
        const timer = window.setInterval(sync, 200);
        return () => {
            window.clearInterval(timer);
            board?.off('update', sync);
            hidden.forEach(n => n.classList.remove(HIDDEN));
            board?.update();
            last.current = '';
        };
    }, [props.frame]);

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* ignore */ }
    };

    if (rows.length === 0) return null;
    if (collapsed) {
        return <div className="ux-btext ux-btext-collapsed">
            <button type="button" className="ux-btext-chip" onClick={toggle} aria-expanded={false}>Besedilo</button>
        </div>;
    }
    return <div className="ux-btext">
        <div className="ux-btext-rows">
            {rows.map((r, i) => <div key={i} className="ux-btext-row" dangerouslySetInnerHTML={{__html: r}}/>)}
        </div>
        <button type="button" className="ux-btext-toggle" onClick={toggle} aria-expanded={true}
                aria-label="Skrij besedilo" title="Skrij besedilo">×</button>
    </div>;
}
