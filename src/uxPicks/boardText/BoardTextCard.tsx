import React, {useEffect, useRef, useState} from 'react';
import {typesetMath} from '../../mathjax/loadMathJax';
import {swatchStyle} from '../../graphs/functions/FunctionReadout';
import {buildCardHtml} from './boardTextLayout';
import {DockCard} from '../dock/DockCard';
import {isMorphing, subscribeMorphing} from '../b1/morph';
import {usePublishedLegend} from './legendStore';
import {ReadoutBody, useReadoutCount} from './BoardReadout';
import './BoardTextCard.css';

const HIDDEN = 'ux-boardtext-hidden';
const FORMULA_STYLE = 'color:#4d594f;font-size:1.2em';

interface JxgText {
    elType: string; id: string; rendNode?: HTMLElement; visPropCalc?: {visible?: boolean};
    coords?: {scrCoords: number[]}; visProp?: {islabel?: boolean};
}
interface JxgBoard {
    containerObj: HTMLElement; objects: Record<string, JxgText>;
    on(ev: string, fn: () => void): void; off(ev: string, fn: () => void): void; update(): void;
}

/** A legend row a graph drew on its board and marked with `data-board-legend` (see src/graphs/legend). */
function isBoardLegend(e: JxgText): boolean {
    return e.elType === 'text' && !!e.rendNode && e.rendNode.hasAttribute('data-board-legend');
}

/** Informational board texts: the formula line (shared style) and corner readouts (top-left HUD). */
function isInfoText(e: JxgText): boolean {
    if (e.elType !== 'text' || !e.rendNode || e.visProp?.islabel || e.id.endsWith('_infobox') || isBoardLegend(e)) return false;
    if (e.rendNode.innerHTML.includes(FORMULA_STYLE)) return true;
    const c = e.coords?.scrCoords;
    return !!c && c[1] <= 40 && c[2] <= 130 && e.rendNode.textContent !== '';
}

function findBoard(frame: HTMLElement): JxgBoard | undefined {
    const boards = (window as unknown as {JXG?: {boards: Record<string, JxgBoard>}}).JXG?.boards;
    return boards && Object.values(boards).find(b => frame.contains(b.containerObj));
}

interface Scan { text: string; legendRows: string[]; }

/** Watches the board in `frame`: hides its info and legend texts and returns what the two cards show. */
function useBoardScan(frame: React.RefObject<HTMLDivElement | null>): Scan {
    const [scan, setScan] = useState<Scan>({text: '', legendRows: []});
    const last = useRef('');
    useEffect(() => {
        const host = frame.current;
        if (!host) return;
        let board: JxgBoard | undefined;
        const hidden = new Set<HTMLElement>();
        const sync = () => {
            const b = findBoard(host);
            if (b !== board) { board?.off('update', sync); board = b; board?.on('update', sync); }
            if (!b) return;
            const parts: string[] = [];
            const drawn: {order: number; html: string}[] = [];
            for (const e of Object.values(b.objects)) {
                const legend = isBoardLegend(e);
                if (!legend && !isInfoText(e)) continue;
                const node = e.rendNode!;
                if (e.visPropCalc?.visible === false) { node.classList.remove(HIDDEN); continue; }
                const inner = node.innerHTML;
                if (inner.trim() !== '') {
                    if (legend) {
                        const color = node.style.color ? ` style="color:${node.style.color}"` : '';
                        drawn.push({order: Number(node.getAttribute('data-board-legend-order') ?? 0), html: `<div class="ux-bleg-drawn"${color}>${inner}</div>`});
                    } else parts.push(inner);
                }
                node.classList.add(HIDDEN); hidden.add(node);
            }
            drawn.sort((a, b) => a.order - b.order);
            const joined = parts.join('\u0000') + '\u0001' + drawn.map(d => d.html).join('\u0000');
            // While a lesson morph runs the numbers are in between; the card holds its settled content until it ends.
            if (isMorphing() || joined === last.current) return;
            last.current = joined;
            const built = buildCardHtml(parts);
            setScan({text: built.text, legendRows: [...built.legend, ...drawn.map(d => d.html)]});
        };
        sync();
        const timer = window.setInterval(sync, 200);
        const unsubscribe = subscribeMorphing(() => { if (!isMorphing()) sync(); });
        return () => {
            unsubscribe();
            window.clearInterval(timer);
            board?.off('update', sync);
            hidden.forEach(n => n.classList.remove(HIDDEN));
            board?.update();
            last.current = '';
        };
    }, [frame]);
    return scan;
}

/** The text card's body: typeset into an off-screen buffer, one pass at a time and only for the newest text, then swapped in. */
function TypesetBody(props: {html: string; className?: string}) {
    const body = useRef<HTMLDivElement>(null);
    const buffer = useRef<HTMLDivElement>(null);
    const pipe = useRef({want: '', shown: '', running: false, token: 0});
    useEffect(() => {
        const st = pipe.current;
        st.want = props.html;
        if (props.html === '' || st.running) return;
        const my = ++st.token;
        const run = async () => {
            st.running = true;
            try {
                while (st.want !== st.shown && buffer.current && body.current && st.token === my) {
                    const target = st.want;
                    await new Promise<void>(r => requestAnimationFrame(() => r()));
                    if (!buffer.current || !body.current || st.token !== my) break;
                    buffer.current.innerHTML = target;
                    await typesetMath(buffer.current, () => st.token === my);
                    if (!buffer.current || !body.current || st.token !== my) break;
                    body.current.innerHTML = buffer.current.innerHTML;
                    st.shown = target;
                }
            } finally { if (st.token === my) st.running = false; }
        };
        void run();
        return () => { st.token++; st.shown = ''; st.running = false; };
    }, [props.html]);
    return <>
        <div ref={body} className={props.className ?? 'ux-btext-body'}/>
        <div ref={buffer} className="ux-btext-buffer" aria-hidden="true"/>
    </>;
}

/**
 * Pick boardText: two cards docked on the graph (DockCard). The text card holds the formula and the
 * readouts the graph drew on its board; the legend card holds the tools' "Legenda" group and the legend rows the
 * graph drew on its board. Each card shows only when it has something, and is moved and hidden on its own.
 */
export function BoardCards(props: {frame: React.RefObject<HTMLDivElement | null>}) {
    const scan = useBoardScan(props.frame);
    const items = usePublishedLegend();
    // A graph with a tools legend repeats its key in a short line on the board; the fuller tools legend wins.
    const rows = items.length > 0 ? [] : scan.legendRows;
    const readouts = useReadoutCount();
    const hasLegend = items.length > 0 || rows.length > 0;
    return <>
        {scan.text !== '' && <DockCard kind="text" title="Besedilo" what="besedilo" region="tr">
            {open => open && <TypesetBody html={scan.text}/>}
        </DockCard>}
        {/* Bottom right: the top left holds the tools and, in a lesson, the lesson card (owner chose "lesson takes top-left"). */}
        {hasLegend && <DockCard kind="legend" title="Legenda" what="legendo" region="br" order={1} foldWhenNarrow>
            {open => open && <div className="ux-btext-body ux-bleg-body">
                {items.length > 0 && <ul className="ux-bleg-list">
                    {items.map(item => <li key={item.id} data-legend={item.id}>
                        <span className={`function-legend-swatch function-legend-${item.kind ?? 'area'}`} style={swatchStyle(item)} aria-hidden="true"/>
                        <span>{item.label}</span>
                    </li>)}
                </ul>}
                {rows.length > 0 && <TypesetBody html={rows.join('')} className="ux-bleg-rows"/>}
            </div>}
        </DockCard>}
        {readouts > 0 && <DockCard kind="readout" title="Odčitki" what="odčitke" region="tr" order={2} foldWhenNarrow>
            {open => open && <ReadoutBody/>}
        </DockCard>}
    </>;
}
