import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {getParam, observeParamChanges, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {uxEnabled} from './flags';
import {drawn, meaningful, signature, tween} from './YourTurn';
import './Ladder.css';

/**
 * a13 — Up the ladder. One press and the board steps back: the live graph shrinks into one cell of a grid of the same
 * graph at other values of a parameter (one parameter: a row of pictures; two: a map of the parameter plane, as in
 * Bret Victor's "Up and Down the Ladder of Abstraction"). What moves is drawn in colour, what stays is faded, so the
 * whole family is read at a glance: where does the vertex go when d grows, which (a, b) make the same curve. Tapping a
 * cell steps back down: it grows into the board and the live graph glides there. Generic: the pictures are the real
 * board at those values (set synchronously through the shared slider registry, cloned, restored), so it works on every
 * graph with a ranged parameter.
 */

interface Cell { values: number[]; svg: string }
type Phase = 'idle' | 'scanning' | 'open';

const frames = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

function niceStep(raw: number, step: number): number {
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = [1, 2, 2.5, 5, 10].map(m => m * power).find(m => m >= raw * 0.999) ?? 10 * power;
    return step > 0 ? Math.max(step, Math.round(nice / step) * step) : nice;
}

function niceBelow(raw: number, step: number): number {
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = [10, 5, 2.5, 2, 1].map(m => m * power).find(m => m <= raw * 1.001) ?? power;
    return step > 0 ? Math.max(step, Math.floor(nice / step + 1e-9) * step) : nice;
}

/**
 * `count` values a nice distance apart that include the live value (so one picture is the board as it is now) and stay
 * inside the slider's range; `half` is how far the window reaches on each side. Cyclic parameters show a full turn.
 */
function gridValues(entry: ParamEntry, center: number, half: number, count: number): number[] {
    const span = entry.max - entry.min;
    if (entry.cyclic !== undefined) return Array.from({length: count}, (_, i) => Number((entry.min + span * i / count).toPrecision(12)));
    // A nice distance for the window, but never so wide that the range cannot hold all the pictures.
    let d = Math.min(niceStep(2 * half / (count - 1), entry.step), niceBelow(span / (count - 1), entry.step));
    let out: number[] = [];
    // Pictures stay on multiples of d from the live value; when the range edge cuts one off, a smaller d fits them all.
    for (let attempt = 0; attempt < 6; attempt++) {
        let low = center - Math.floor((count - 1) / 2) * d;
        if (low < entry.min - 1e-9) low = center - Math.floor((center - entry.min) / d + 1e-9) * d;
        if (low + (count - 1) * d > entry.max + 1e-9) low = center + Math.floor((entry.max - center) / d + 1e-9) * d - (count - 1) * d;
        out = [];
        for (let i = 0; i < count; i++) {
            const value = Number((low + i * d).toPrecision(12));
            if (value >= entry.min - 1e-9 && value <= entry.max + 1e-9) out.push(value);
        }
        if (out.length >= count || d <= entry.step + 1e-12) break;
        d = niceBelow(d * 0.99, entry.step);
    }
    return out;
}

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? entry.label;

export function Ladder(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const usable = params.filter(entry => meaningful(entry) && !entry.inert && entry.unavailable === undefined);
    const [phase, setPhase] = useState<Phase>('idle');
    const [axes, setAxes] = useState<string[]>([]);
    const [cells, setCells] = useState<Cell[]>([]);
    const [columns, setColumns] = useState<number[]>([]);
    const [rows, setRows] = useState<number[]>([]);
    const [progress, setProgress] = useState(0);
    const [still, setStill] = useState(false);
    const [current, setCurrent] = useState<number[]>([]);
    const [locked, setLocked] = useState(false);
    const [note, setNote] = useState('');
    const recent = useRef<string[]>([]);
    const grid = useRef<HTMLOListElement>(null);
    const zoomFrom = useRef<number>(-1);
    const busy = useRef(false);
    const springBack = useRef<() => void>();

    // The most recently changed parameters are the ones the lesson is talking about: they are the default axes.
    useEffect(() => observeParamChanges(previous => {
        recent.current = [previous.key, ...recent.current.filter(key => key !== previous.key)].slice(0, 6);
    }), []);

    useEffect(() => {
        const section = props.frame.current?.closest('.workspace-graph');
        if (!section) return;
        const read = () => setLocked(section.getAttribute('data-lesson-locked') === 'true');
        read();
        const observer = new MutationObserver(read);
        observer.observe(section, {attributes: true, attributeFilter: ['data-lesson-locked']});
        return () => observer.disconnect();
    }, [props.frame]);

    useEffect(() => () => springBack.current?.(), []);

    const board = (): Board | undefined => findBoard(props.frame.current);
    const container = (b: Board) => (b as unknown as {containerObj: HTMLElement}).containerObj;
    const root = (b: Board) => (b as unknown as {renderer: {svgRoot?: SVGSVGElement}}).renderer.svgRoot;

    /** Puts the board at these values and waits until it has redrawn them. */
    const settle = async (b: Board, keys: string[], values: number[]) => {
        const events = b as unknown as {on(event: string, handler: () => void): void; off(event: string, handler: () => void): void};
        let redrawn = false;
        const mark = () => { redrawn = true; };
        events.on('update', mark);
        try { flushSync(() => keys.forEach((key, i) => getParam(key)?.setFromLesson(values[i]))); } finally { events.off('update', mark); }
        if (redrawn) return;
        await new Promise<void>(resolve => {
            let left = 4;
            const done = () => { events.off('update', done); resolve(); };
            const tick = () => { if (--left <= 0) done(); else requestAnimationFrame(tick); };
            events.on('update', done);
            requestAnimationFrame(tick);
        });
    };

    /** Whether anything the parameter moves is on view (a picture of an empty board teaches nothing). */
    const onView = (svg: SVGSVGElement, b: Board, ids: Set<string>) => {
        const width = svg.clientWidth, height = svg.clientHeight;
        return drawn(b).some(object => {
            if (!ids.has(object.id)) return false;
            try {
                const box = (object.rendNode as unknown as SVGGraphicsElement).getBBox();
                const w = Math.min(width, box.x + box.width) - Math.max(0, box.x), h = Math.min(height, box.y + box.height) - Math.max(0, box.y);
                return w >= 0 && h >= 0 && Math.max(w, h) > 0.04 * Math.min(width, height);
            } catch { return false; }
        });
    };

    /** Narrows a parameter's window around its live value until most pictures show something that moves. */
    const zoomWindow = async (b: Board, svg: SVGSVGElement, keys: string[], start: number[], index: number, count: number) => {
        const entry = getParam(keys[index])!;
        let half = (entry.max - entry.min) / 2;
        if (entry.cyclic !== undefined) return gridValues(entry, start[index], half, count);
        for (let attempt = 0; attempt < 4; attempt++) {
            const values = gridValues(entry, start[index], half, count);
            const looks: Map<string, string>[] = [];
            for (const value of values) {
                const probe = [...start];
                probe[index] = value;
                await settle(b, keys, probe);
                looks.push(new Map(drawn(b).map(object => [object.id, signature(object.rendNode!)])));
            }
            const moving = new Set<string>();
            for (const [id, first] of looks[0]) if (looks.some(look => look.get(id) !== first)) moving.add(id);
            if (moving.size === 0) return values;
            // Which pictures show any of it: a second pass, since what moves is known only after all looks.
            let shown = 0;
            for (const value of values) {
                const probe = [...start];
                probe[index] = value;
                await settle(b, keys, probe);
                if (onView(svg, b, moving)) shown++;
            }
            if (shown >= Math.ceil(0.8 * values.length) || half <= (entry.max - entry.min) / 24) return values;
            half /= 2;
        }
        return gridValues(entry, start[index], half, count);
    };

    const scan = async (wanted: string[]) => {
        const b = board();
        const svg = b && root(b);
        const entries = wanted.map(getParam).filter(meaningful);
        if (!b || !svg || entries.length === 0 || busy.current) return;
        busy.current = true;
        springBack.current?.();
        setNote('');
        setPhase('scanning');
        setProgress(0);
        const phone = window.innerWidth < 600;
        const start = entries.map(entry => entry.value);
        const keys = entries.map(entry => entry.key);
        const width = svg.clientWidth, height = svg.clientHeight;
        const box = container(b);
        box.style.transition = 'opacity 160ms ease';
        box.style.opacity = '0.12';
        const xs = await zoomWindow(b, svg, keys, start, 0, entries.length === 1 ? (phone ? 6 : 8) : 5);
        const ys = entries.length > 1 ? (await zoomWindow(b, svg, keys, start, 1, 5)).reverse() : [undefined];
        const clones: {values: number[]; node: SVGSVGElement; signatures: Map<string, string>}[] = [];
        const total = xs.length * ys.length;
        try {
            for (const y of ys) for (const x of xs) {
                const values = y === undefined ? [x] : [x, y];
                await settle(b, keys, values);
                const node = svg.cloneNode(true) as SVGSVGElement;
                const signatures = new Map(drawn(b).map(object => [object.rendNode!.id || object.id, signature(object.rendNode!)]));
                clones.push({values, node, signatures});
                setProgress(clones.length / total);
                if (clones.length % 3 === 0) await frames();
            }
        } finally {
            await settle(b, keys, start);
            box.style.opacity = '';
        }
        // What changes across the family is drawn in colour; everything that stays put is faded.
        const moving = new Set<string>();
        for (const [id, first] of clones[0].signatures) if (clones.some(clone => clone.signatures.get(id) !== first)) moving.add(id);
        const out: Cell[] = clones.map(({values, node, signatures}) => {
            node.querySelectorAll('.ux-ghosts, .ux-target-ghost, .ux-fit-layer').forEach(element => element.remove());
            for (const id of signatures.keys()) if (!moving.has(id)) node.querySelector(`[id="${id}"]`)?.classList.add('ux-ladder-still');
            for (const id of moving) node.querySelector(`[id="${id}"]`)?.classList.add('ux-ladder-moves');
            node.setAttribute('viewBox', `0 0 ${width} ${height}`);
            node.setAttribute('width', '100%');
            node.setAttribute('height', '100%');
            node.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            node.removeAttribute('style');
            return {values, svg: node.outerHTML};
        });
        // The cell nearest to the live values is where the board shrinks into.
        const span = entries.map(entry => entry.max - entry.min || 1);
        let nearest = 0, best = Infinity;
        out.forEach((cell, i) => {
            const d = cell.values.reduce((sum, v, k) => sum + Math.abs(v - start[k]) / span[k], 0);
            if (d < best) { best = d; nearest = i; }
        });
        zoomFrom.current = nearest;
        setStill(moving.size === 0);
        setCurrent(start);
        setColumns(xs);
        setRows(ys.filter((y): y is number => y !== undefined));
        setCells(out);
        setAxes(entries.map(entry => entry.key));
        setPhase('open');
        busy.current = false;
    };

    // Stepping up: the live board shrinks into its own cell; the other cells fade in around it.
    useLayoutEffect(() => {
        if (phase !== 'open' || zoomFrom.current < 0) return;
        const b = board();
        const cell = grid.current?.children[zoomFrom.current]?.querySelector('.ux-ladder-thumb') as HTMLElement | null;
        zoomFrom.current = -1;
        if (!b || !cell) return;
        const from = container(b).getBoundingClientRect(), to = cell.getBoundingClientRect();
        if (!from.width || !to.width) return;
        cell.animate([
            {transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, transformOrigin: '0 0'},
            {transform: 'none', transformOrigin: '0 0'},
        ], {duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)'});
    }, [phase, cells]);

    const open = () => {
        const keys = recent.current.filter(key => usable.some(entry => entry.key === key)).slice(0, 1);
        void scan(keys.length ? keys : [usable[0].key]);
    };

    const toggle = (key: string) => {
        let next = axes.includes(key) ? axes.filter(k => k !== key) : axes.length < 2 ? [...axes, key] : [axes[0], key];
        if (next.length === 0) next = [key];
        void scan(next);
    };

    // Stepping down: the chosen cell grows into the board, then the live graph glides to its values.
    const choose = (index: number, element: HTMLElement) => {
        const b = board();
        const cell = cells[index];
        if (!b || !cell) return;
        const from = element.getBoundingClientRect(), to = container(b).getBoundingClientRect();
        const animation = element.animate([
            {transform: 'none', transformOrigin: '0 0'},
            {transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`, transformOrigin: '0 0'},
        ], {duration: 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'});
        element.closest('li')?.classList.add('is-chosen');
        grid.current?.classList.add('is-leaving');
        const targets = axes.map((key, i) => ({key, from: getParam(key)?.value ?? cell.values[i], to: cell.values[i]}));
        animation.onfinish = () => {
            setPhase('idle');
            setCells([]);
            const stop = tween(targets, 'to', 700, () => {
                if (!locked) return;
                // During an explanation the lesson owns the graph: show the chosen picture, then hand it back.
                setNote(`Med razlago se graf vrne na vrednosti lekcije.`);
                const timer = window.setTimeout(() => { springBack.current = tween(targets, 'from', 600, () => setNote('')); }, 1600);
                springBack.current = () => { window.clearTimeout(timer); targets.forEach(target => getParam(target.key)?.setFromLesson(target.from)); setNote(''); };
            });
            springBack.current = stop;
        };
    };

    const close = () => { setPhase('idle'); setCells([]); };

    useEffect(() => {
        if (phase !== 'open') return;
        const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [phase]);

    if (usable.length === 0 && phase === 'idle') return note ? <p className="ux-ladder-note" role="status">{note}</p> : null;
    const bottom = 64 + (uxEnabled('a10') ? 48 : 0) + (uxEnabled('a11') ? 48 : 0);
    const entries = axes.map(getParam).filter(meaningful);
    const format = (entry: ParamEntry | undefined, value: number) => entry ? entry.format(Number(value.toPrecision(3))) : String(value);
    const two = entries.length === 2;
    const currentCell = (cell: Cell) => cell.values.every((v, k) => {
        const entry = entries[k];
        if (!entry) return false;
        const values = k === 0 ? columns : rows;
        const nearest = values.reduce((a, c) => Math.abs(c - current[k]) < Math.abs(a - current[k]) ? c : a, values[0]);
        return v === nearest;
    });
    const aspect = (() => { const b = board(); const svg = b && root(b); return svg && svg.clientHeight ? `${svg.clientWidth} / ${svg.clientHeight}` : '4 / 3'; })();

    return <>
        {phase === 'idle' && <button type="button" className="ux-ladder-start" style={{bottom}} onClick={open}
            title="Graf se pomanjša v mrežo slik pri drugih vrednostih parametra">
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="6" height="6" rx="1.2"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.2"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.2"/><rect x="11.5" y="11.5" width="6" height="6" rx="1.2" className="on"/></svg>
            Lestvica
        </button>}
        {note && <p className="ux-ladder-note" role="status">{note}</p>}
        {phase === 'scanning' && <div className="ux-ladder-scan" role="status"><span style={{width: `${Math.round(progress * 100)}%`}}/>Rišem družino grafov …</div>}
        {phase === 'open' && <div className={`ux-ladder ${two ? 'is-plane' : 'is-row'}`} role="dialog" aria-label="Lestvica abstrakcije">
            <div className="ux-ladder-head">
                <span className="ux-ladder-title">{two ? 'Ravnina parametrov' : 'Družina grafov'}</span>
                <span className="ux-ladder-chips" role="group" aria-label="Parametri na oseh">
                    {usable.map(entry => {
                        const axis = axes.indexOf(entry.key);
                        return <button key={entry.key} type="button" className={`ux-ladder-chip${axis >= 0 ? ' is-on' : ''}`} aria-pressed={axis >= 0}
                            title={entry.label} onClick={() => toggle(entry.key)}>
                            <i>{symbolOf(entry)}</i>{axis >= 0 && <small>{axis === 0 ? '→' : '↑'}</small>}
                        </button>;
                    })}
                </span>
                <button type="button" className="ux-ladder-close" onClick={close} aria-label="Zapri lestvico">×</button>
            </div>
            {still && <p className="ux-ladder-still-note">Ta parameter na grafu ničesar ne premakne.</p>}
            <div className="ux-ladder-body">
                {two && <div className="ux-ladder-yaxis" aria-hidden="true"><i>{symbolOf(entries[1])}</i>{rows.map(value => <span key={value}>{format(entries[1], value)}</span>)}</div>}
                <div className="ux-ladder-main">
                    <ol ref={grid} className="ux-ladder-grid" style={{'--cols': two ? columns.length : Math.min(columns.length, window.innerWidth < 600 ? 3 : 4), '--aspect': aspect} as React.CSSProperties}>
                        {cells.map((cell, i) => {
                            const label = cell.values.map((v, k) => `${entries[k] ? symbolOf(entries[k]) : ''} = ${format(entries[k], v)}`).join(', ');
                            return <li key={cell.values.join('|')} style={{'--i': i} as React.CSSProperties}>
                                <button type="button" className="ux-ladder-cell" aria-current={currentCell(cell) ? 'true' : undefined} aria-label={label}
                                    onClick={event => choose(i, event.currentTarget.querySelector('.ux-ladder-thumb') as HTMLElement)}>
                                    <span className="ux-ladder-thumb" dangerouslySetInnerHTML={{__html: cell.svg}}/>
                                    {!two && <span className="ux-ladder-value"><i>{entries[0] && symbolOf(entries[0])}</i> = {format(entries[0], cell.values[0])}</span>}
                                </button>
                            </li>;
                        })}
                    </ol>
                    {two && <div className="ux-ladder-xaxis" aria-hidden="true">{columns.map(value => <span key={value}>{format(entries[0], value)}</span>)}<i>{symbolOf(entries[0])}</i></div>}
                </div>
            </div>
            <p className="ux-ladder-hint">{two ? 'Vsaka slika je graf pri drugem paru vrednosti. ' : 'Barvno je, kar se spreminja; bledo, kar ostane. '}Tapni sliko in graf gre tja{usable.length > 1 ? two ? '; tapni simbol za drugo os.' : '; tapni še en simbol za ravnino dveh parametrov.' : '.'}</p>
        </div>}
    </>;
}
