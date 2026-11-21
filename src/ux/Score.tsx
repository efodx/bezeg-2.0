import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {currentParams, holdProbe, splitLabel, type ParamEntry} from './paramRegistry';
import {meaningful} from './YourTurn';
import './Score.css';

/**
 * a25 — The lesson as a score. When a guided lesson opens, Bezeg reads it ahead (quietly stepping through every frame
 * and back) and writes a score under the lesson's progress, like automation lanes in a music editor: one lane per
 * parameter, one column per frame, a diamond wherever the lesson moves that parameter, a playhead on the current frame.
 * The plan of the lesson becomes visible at a glance — first d, then c, then a, then all together — and any column is
 * a jump. Generic: frames are read from the lesson runtime's own buttons and progress, values from the shared registry.
 */

interface Column { id: string; step: number; frame: number; values: Map<string, number> }
interface Lane { key: string; symbol: string; min: number; max: number; format: (value: number) => string }

function progress(): {step: number; steps: number; frame: number; frames: number} | undefined {
    const text = document.querySelector('.guided-lesson-progress')?.textContent ?? '';
    const n = text.match(/\d+/g)?.map(Number);
    return n && n.length >= 4 ? {step: n[0], steps: n[1], frame: n[2], frames: n[3]} : undefined;
}
const idOf = (p: {step: number; frame: number}) => `${p.step}.${p.frame}`;
const order = (p: {step: number; frame: number}) => p.step * 1000 + p.frame;
const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);
const tick = () => new Promise(resolve => window.setTimeout(resolve, 0));
const button = (which: 'next' | 'back') => document.querySelector(`.guided-lesson-nav-${which}`) as HTMLButtonElement | null;

function values(): Map<string, number> {
    return new Map(currentParams().filter(entry => meaningful(entry)).map(entry => [entry.key, entry.value]));
}

export function Score() {
    const [columns, setColumns] = useState<Column[]>();
    const [lanes, setLanes] = useState<Lane[]>([]);
    const [here, setHere] = useState<string>();
    const [host, setHost] = useState<HTMLElement>();
    const [hover, setHover] = useState<number>();
    const [gated, setGated] = useState(false);
    const scanned = useRef(false);
    const jumping = useRef(false);

    // Read the lesson ahead once, as soon as it shows its progress.
    useEffect(() => {
        let cancelled = false;
        const wait = window.setInterval(async () => {
            const start = progress();
            if (!start || scanned.current || currentParams().length === 0) return;
            scanned.current = true;
            window.clearInterval(wait);
            const release = holdProbe();
            document.body.classList.add('ux-score-reading');
            const out: Column[] = [];
            let moved = 0, stoppedAtGate = false;
            try {
                // Back to the lesson's first frame first, so a deep link into the middle still reads the whole lesson.
                for (let i = 0; i < 80 && order(progress()!) > 1001; i++) { const back = button('back'); if (!back || back.disabled) break; back.click(); await tick(); moved--; }
                for (let i = 0; i < 80; i++) {
                    const p = progress();
                    if (!p) break;
                    out.push({id: idOf(p), step: p.step, frame: p.frame, values: values()});
                    if (p.step === p.steps && p.frame === p.frames) break; // the last Next would finish the lesson
                    const next = button('next');
                    if (!next || next.disabled) { stoppedAtGate = true; break; }
                    next.click(); await tick();
                    const q = progress();
                    if (!q || idOf(q) === idOf(p)) { stoppedAtGate = true; break; }
                    moved++;
                }
                // And back to where the learner was.
                for (let i = 0; i < 160; i++) {
                    const p = progress();
                    if (!p || idOf(p) === idOf(start)) break;
                    const which = order(p) > order(start) ? 'back' : 'next';
                    const nav = button(which);
                    if (!nav || nav.disabled) break;
                    nav.click(); await tick();
                }
            } finally {
                document.body.classList.remove('ux-score-reading');
                release();
            }
            if (cancelled) return;
            void moved;
            // Lanes: parameters the lesson actually moves, in the order it first moves them.
            const keys: string[] = [];
            out.forEach((column, i) => {
                if (i === 0) return;
                for (const [key, value] of column.values) if (out[i - 1].values.get(key) !== undefined && Math.abs(out[i - 1].values.get(key)! - value) > 1e-9 && !keys.includes(key)) keys.push(key);
            });
            setLanes(keys.map(key => {
                const entry = currentParams().find(e => e.key === key)!;
                const seen = out.map(c => c.values.get(key)).filter((v): v is number => v !== undefined);
                const low = Math.min(...seen), high = Math.max(...seen);
                return {key, symbol: entry ? symbolOf(entry) : key, min: low, max: high > low ? high : low + 1, format: entry ? entry.format : String};
            }));
            setColumns(out);
            setGated(stoppedAtGate);
        }, 250);
        return () => { cancelled = true; window.clearInterval(wait); };
    }, []);

    // Follow the learner: the playhead is the current frame; the score lives right under the lesson's progress line.
    useEffect(() => {
        const timer = window.setInterval(() => {
            const p = progress();
            if (p) setHere(idOf(p));
            const anchor = document.querySelector('.guided-lesson-progress');
            if (anchor && (!host || !host.isConnected)) {
                const box = document.createElement('div');
                box.className = 'ux-score-host';
                anchor.insertAdjacentElement('afterend', box);
                setHost(box);
            }
        }, 200);
        return () => window.clearInterval(timer);
    }, [host]);
    useEffect(() => () => { host?.remove(); }, [host]);

    const jump = async (column: Column) => {
        if (jumping.current) return;
        jumping.current = true;
        for (let i = 0; i < 80; i++) {
            const p = progress();
            if (!p || idOf(p) === column.id) break;
            const nav = button(order(column) < order(p) ? 'back' : 'next');
            if (!nav || nav.disabled) break;
            nav.click();
            await new Promise(resolve => window.setTimeout(resolve, 40));
        }
        jumping.current = false;
    };

    if (!host || !columns || columns.length < 2) return null;
    const width = 100 / columns.length;
    const current = columns.findIndex(column => column.id === here);
    const shown = hover ?? current;
    return createPortal(<section className="ux-score" aria-label="Partitura lekcije">
        <div className="ux-score-head">
            <span className="ux-score-title">Partitura</span>
            {shown >= 0 && <span className="ux-score-readout">
                {lanes.map(lane => { const v = columns[shown].values.get(lane.key); return v === undefined ? null : <span key={lane.key}><i>{lane.symbol}</i> = {lane.format(Number(v.toPrecision(4)))}</span>; })}
            </span>}
        </div>
        {lanes.length === 0 && <p className="ux-score-empty">Ta lekcija ne premika drsnikov; spreminja točke ali besedilo.</p>}
        <div className="ux-score-grid" onMouseLeave={() => setHover(undefined)}>
            <div className="ux-score-steps">
                {columns.map((column, i) => <button key={column.id} type="button" className={`ux-score-col${i === current ? ' is-here' : ''}${column.frame === 1 ? ' is-step' : ''}`}
                    style={{width: `${width}%`}} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => void jump(column)}
                    aria-label={`Korak ${column.step}, okvir ${column.frame}`}>{column.frame === 1 ? column.step : ''}</button>)}
            </div>
            {lanes.map(lane => {
                const y = (v: number) => 22 - (v - lane.min) / (lane.max - lane.min) * 18;
                const points = columns.map((column, i) => { const v = column.values.get(lane.key); return v === undefined ? undefined : [(i + 0.5) * width, y(v)] as [number, number]; });
                // Held values are flat; a frame that changes the value ramps into it, like an automation curve.
                let d = '';
                points.forEach((p, i) => { if (!p) return; const prev = points[i - 1]; d += prev ? ` L${p[0] - width * 0.35} ${prev[1]} L${p[0]} ${p[1]}` : `M${p[0] - width / 2} ${p[1]} L${p[0]} ${p[1]}`; });
                const last = points[points.length - 1];
                if (last) d += ` L${last[0] + width / 2} ${last[1]}`;
                return <div key={lane.key} className="ux-score-lane">
                    <span className="ux-score-symbol"><i>{lane.symbol}</i></span>
                    <svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
                        {current >= 0 && <rect x={current * width} y={0} width={width} height={26} className="playhead"/>}
                        <path d={d} vectorEffect="non-scaling-stroke"/>
                    </svg>
                    {points.map((p, i) => {
                        const prev = i > 0 ? columns[i - 1].values.get(lane.key) : undefined, v = columns[i].values.get(lane.key);
                        return p && prev !== undefined && v !== undefined && Math.abs(prev - v) > 1e-9
                            ? <span key={i} className="ux-score-key" style={{left: `calc(30px + (100% - 30px) * ${p[0] / 100})`, top: `${p[1] / 26 * 100}%`}}/> : null;
                    })}
                </div>;
            })}
        </div>
        {gated && <p className="ux-score-empty">Naprej od tu vodi tvoja naloga; partitura se nadaljuje, ko jo rešiš.</p>}
    </section>, host);
}
