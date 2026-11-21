import React, {useEffect, useRef, useState} from 'react';
import {typesetMath} from '../../mathjax/loadMathJax';
import {swatchStyle} from '../../graphs/functions/FunctionReadout';
import {buildCardHtml} from './boardTextLayout';
import {DockCard} from '../dock/DockCard';
import {isMorphing, subscribeMorphing} from '../b1/morph';
import {usePublishedLegend} from './legendStore';
import {ReadoutBody, readoutText, useReadoutCount} from './BoardReadout';
import {BoardSectionCards, useSections} from './BoardSection';
import {referencedCards, type RefCard} from './lessonRefs';
import {setAutoOpen} from './autoOpenStore';
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

const squash = (t: string) => t.normalize('NFKC').replace(/[\s ]+/g, '').replace(/[−–]/g, '-');
const numbers = (t: string) => t.match(/\d+(?:,\d+)?/g) ?? [];
/** A digit string the card above shows as `shown` (the same, or the same cut shorter at 3 or more characters). */
const sameNumber = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

/** A row that says in words what the text says in words: its label (without a parenthesis) occurs in the text and the text
 * continues with the row's value (same stem: "ocena napake: skrita" and "Ocena napake (Lagrange) skrito"). Numbers are left to the rules below. */
function statesSame(shown: string, label: string, v: string): boolean {
    if (/\d/.test(v) || v.length < 4) return false;
    const key = squash(label.replace(/\([^)]*\)/g, '')).toLowerCase();
    if (key.length < 6) return false;
    const text = shown.toLowerCase(), stem = v.toLowerCase().slice(0, Math.max(4, v.length - 1));
    for (let at = text.indexOf(key); at >= 0; at = text.indexOf(key, at + 1)) {
        if (text.slice(at + key.length, at + key.length + 3 + stem.length).includes(stem)) return true;
    }
    return false;
}

/** Whether a readout row (label, value) says what the text above already shows (both squashed): a value the text
 * repeats whole, or the row's symbol (its label after the first word) followed by the same number. */
export function repeatsText(shown: string, label: string, value: string): boolean {
    const v = squash(value), l = squash(label.split(/\s+/).slice(1).join(' '));
    if (v === '') return false;
    if (statesSame(shown, label, v)) return true;
    if (v.length >= 4 && shown.includes(v)) return true;
    const nums = numbers(v);
    if (l === '' || nums.length !== 1 || v.replace(nums[0]!, '') !== '') return false;
    for (let at = shown.indexOf(l); at >= 0; at = shown.indexOf(l, at + 1)) {
        const after = numbers(shown.slice(at + l.length, at + l.length + nums[0]!.length + 2))[0];
        if (after && shown.slice(at + l.length).startsWith(after) && sameNumber(after, nums[0]!)) return true;
    }
    return false;
}

/** The readout slots under the formula, below a thin rule; rows that repeat what the text shows are hidden. */
function MergedReadouts() {
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const run = () => {
            const el = root.current;
            const text = el?.parentElement?.querySelector('.ux-btext-body:not(.ux-bmerged)');
            if (!el || !text) return;
            const shown = squash(text.textContent ?? '');
            let visible = 0;
            el.querySelectorAll('.readout-list-row').forEach(row => {
                const dup = repeatsText(shown, row.querySelector('dt')?.textContent ?? '', row.querySelector('dd')?.textContent ?? '');
                row.classList.toggle('ux-bread-dup', dup);
                if (!dup) visible++;
            });
            el.querySelectorAll('.readout-list').forEach(l => l.classList.toggle('ux-bread-dup', l.querySelectorAll('.readout-list-row:not(.ux-bread-dup)').length === 0));
            el.querySelectorAll('.inspector-reveals-title').forEach(h => h.classList.toggle('ux-bread-dup', h.textContent === 'Odčitki'));
            el.classList.toggle('ux-bread-empty', visible === 0 && !el.querySelector('p, .readout-scroll-table'));
        };
        run();
        const timer = window.setInterval(run, 250);
        return () => window.clearInterval(timer);
    }, []);
    return <div ref={root} className="ux-bmerged"><ReadoutBody/></div>;
}

const plain = (html: string) => html.replace(/<[^>]*>/g, ' ');

/** In a guided lesson: on each frame change, decides which cards the frame refers to (lessonRefs) and publishes them. */
function useLessonRefs(getCards: () => RefCard[]) {
    const latest = useRef(getCards);
    latest.current = getCards;
    useEffect(() => {
        let frame: string | null = null;
        const timers: number[] = [];
        const decide = (text: string) => setAutoOpen(referencedCards(text, latest.current()));
        const poll = () => {
            const region = document.querySelector('.ux-bcard-guide .guided-lesson-reading');
            const text = region ? [...region.querySelectorAll('[data-tex]')].map(n => n.getAttribute('data-tex') ?? '').join(' ') : null;
            if (text === frame) return;
            frame = text;
            timers.splice(0).forEach(t => window.clearTimeout(t));
            if (text === null) { setAutoOpen(new Set()); return; }
            // The board settles (a morph, the text scan) before the cards' values are compared.
            const settle = () => { if (isMorphing()) { timers.push(window.setTimeout(settle, 200)); } else decide(text); };
            timers.push(window.setTimeout(settle, 500), window.setTimeout(() => decide(text), 1800));
        };
        poll();
        const timer = window.setInterval(poll, 250);
        return () => { window.clearInterval(timer); timers.forEach(t => window.clearTimeout(t)); setAutoOpen(new Set()); };
    }, []);
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
    const sections = useSections();
    // The card is named after what it shows (owner, 2026-11-21, on curvature's "Ukrivljenost κ 0,2357 …" card titled
    // Besedilo: "this is actually a readout"): read-off values (label/value rows, a decimal, an angle in degrees, a point's
    // coordinates, or merged readout rows) make it "Odčitki"; a bare formula stays "Besedilo". Its kind (stored place and
    // fold) is unchanged. The text is TeX source here, so a decimal comma may be written {,} and degrees \circ.
    const readsValues = readouts > 0 || scan.text.includes('ux-btext-k')
        || /\d(?:,|\{,\})\d|\d\s*(?:°|\^?\{?\\circ)|\(\s*-?\d+(?:(?:,|\{,\})\d+)?\s*;\s*[-−]?\d/.test(plain(scan.text));
    useLessonRefs(() => {
        const cards: RefCard[] = [];
        if (scan.text !== '') cards.push({kind: 'text', readouts: readsValues, text: `${plain(scan.text)} ${readoutText()}`});
        else if (readouts > 0) cards.push({kind: 'readout', readouts: true, text: readoutText()});
        if (hasLegend) cards.push({kind: 'legend', legend: true, text: `${items.map(i => i.label).join(' ')} ${plain(rows.join(' '))}`});
        sections.forEach(s => cards.push({kind: `section-${s.kind}`, title: s.title, text: s.slot.textContent ?? ''}));
        return cards;
    });
    return <>
        {scan.text !== '' && <DockCard kind="text" title={readsValues ? 'Odčitki' : 'Besedilo'} what={readsValues ? 'odčitke' : 'besedilo'} region="tr" foldInLesson>
            {open => open && <>
                <TypesetBody html={scan.text}/>
                {readouts > 0 && <MergedReadouts/>}
            </>}
        </DockCard>}
        {/* Bottom right: the top left holds the tools and, in a lesson, the lesson card (owner chose "lesson takes top-left"). */}
        {hasLegend && <DockCard kind="legend" title="Legenda" what="legendo" region="br" order={1} foldWhenNarrow foldInLesson>
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
        {readouts > 0 && scan.text === '' && <DockCard kind="readout" title="Odčitki" what="odčitke" region="tr" order={2} foldWhenNarrow foldInLesson>
            {open => open && <ReadoutBody/>}
        </DockCard>}
        <BoardSectionCards/>
    </>;
}
