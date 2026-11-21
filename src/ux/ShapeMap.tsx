import React, {useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {getParam, observeParamChanges, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {uxEnabled} from './flags';
import {meaningful} from './YourTurn';
import {captureFamily, type Family} from './family';
import './ShapeMap.css';

/**
 * a14 — Shape map. Two parameters that work together (c and d, k and p, |w| and arg w) get one control: a pad in the
 * corner of the board whose background is a map of what the graph looks like everywhere in that parameter plane
 * (pictures of the real board, as in a13). Drag the dot across the map and the big board follows live; the map shows
 * where the shapes you are looking for live before you get there. Inspired by XY pads of synthesizers (Kaoss pad) and
 * the minimap of games. Generic: the map is captured through the shared slider registry, the dot writes the same
 * sliders. During a reading frame the dot is a spring: let go and the lesson's values come back.
 */

const SIZE = 5;
const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? entry.label;

function snap(entry: ParamEntry, value: number) {
    const clamped = Math.min(entry.max, Math.max(entry.min, value));
    return entry.step > 0 ? Number((Math.round((clamped - entry.min) / entry.step) * entry.step + entry.min).toPrecision(12)) : clamped;
}

export function ShapeMap(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const usable = params.filter(entry => meaningful(entry) && !entry.inert && entry.unavailable === undefined);
    const [open, setOpen] = useState(false);
    const [axes, setAxes] = useState<string[]>([]);
    const [family, setFamily] = useState<Family>();
    const [progress, setProgress] = useState<number>();
    const [locked, setLocked] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [trail, setTrail] = useState<[number, number][]>([]);
    const [aspect, setAspect] = useState(0.62);
    const recent = useRef<string[]>([]);
    const pad = useRef<HTMLDivElement>(null);
    const origin = useRef<number[]>();
    const busy = useRef(false);

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

    const capture = async (keys: string[]) => {
        const b = findBoard(props.frame.current);
        const entries = keys.map(getParam).filter(meaningful);
        if (!b || entries.length < 2 || busy.current) return;
        busy.current = true;
        setProgress(0);
        const result = await captureFamily(b, entries, SIZE, SIZE, setProgress);
        busy.current = false;
        setProgress(undefined);
        if (!result) return;
        setAspect(result.height / result.width);
        setAxes(keys);
        setFamily(result);
        setTrail([]);
    };

    const start = () => {
        const keys = [...recent.current.filter(key => usable.some(entry => entry.key === key)), ...usable.map(entry => entry.key)];
        const two = [...new Set(keys)].slice(0, 2);
        setOpen(true);
        void capture(two);
    };

    const toggle = (key: string) => {
        if (axes.includes(key)) return;
        // The tapped symbol replaces the older axis.
        void capture([axes[1], key]);
    };

    const entries = axes.map(getParam).filter(meaningful);
    const ready = !!family && entries.length === 2 && family.xs.length > 1 && family.ys.length > 1;

    // Cell i's centre is value xs[i]; the pad maps linearly between the first and last centre.
    const toFraction = (values: number[], k: 0 | 1) => {
        const list = k === 0 ? family!.xs : [...family!.ys].reverse();
        const n = list.length;
        const t = (values[k] - list[0]) / (list[n - 1] - list[0]);
        return (0.5 + t * (n - 1)) / n;
    };
    const fromFraction = (f: number, k: 0 | 1) => {
        const list = k === 0 ? family!.xs : [...family!.ys].reverse();
        const n = list.length;
        let t = (f * n - 0.5) / (n - 1);
        // Magnetic cell centres: the nice values of the map are easy to hit.
        const nearest = Math.round(t * (n - 1)) / (n - 1);
        if (Math.abs(t - nearest) < 0.06 / (n - 1)) t = nearest;
        return snap(entries[k], list[0] + t * (list[n - 1] - list[0]));
    };

    const write = (values: number[]) => entries.forEach((entry, k) => {
        const current = getParam(entry.key);
        if (!current) return;
        if (locked) current.setFromLesson(values[k]); else current.set(values[k]);
    });

    const point = (event: React.PointerEvent) => {
        const rect = pad.current!.getBoundingClientRect();
        const fx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const fy = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        return [fx, 1 - fy] as const;
    };

    const down = (event: React.PointerEvent) => {
        if (!ready) return;
        event.preventDefault();
        pad.current!.setPointerCapture(event.pointerId);
        origin.current = entries.map(entry => getParam(entry.key)!.value);
        setDragging(true);
        setTrail([]);
        move(event, true);
    };
    const move = (event: React.PointerEvent, force = false) => {
        if (!ready || (!dragging && !force)) return;
        const [fx, fy] = point(event);
        write([fromFraction(fx, 0), fromFraction(fy, 1)]);
        setTrail(list => [...list.slice(-40), [fx, 1 - fy]]);
    };
    const up = () => {
        if (!dragging) return;
        setDragging(false);
        const from = origin.current;
        if (!locked || !from) return;
        // A reading frame keeps the lesson's values: spring back with a little overshoot.
        const at = entries.map(entry => getParam(entry.key)!.value);
        const begin = performance.now();
        const spring = (now: number) => {
            const t = Math.min(1, (now - begin) / 520);
            const eased = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.5);
            entries.forEach((entry, k) => {
                const current = getParam(entry.key);
                if (!current) return;
                const raw = at[k] + (from[k] - at[k]) * eased;
                current.setFromLesson(t >= 1 ? from[k] : current.step >= 1 ? Math.round(raw) : raw);
            });
            if (t < 1) requestAnimationFrame(spring); else setTrail([]);
        };
        requestAnimationFrame(spring);
    };

    const key = (event: React.KeyboardEvent) => {
        if (!ready) return;
        const moves: Record<string, [number, number]> = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]};
        const step = moves[event.key];
        if (!step) return;
        event.preventDefault();
        const values = entries.map(entry => getParam(entry.key)!.value);
        const reach = [(family!.xs[1] - family!.xs[0]) / 4, (family!.ys[0] - family!.ys[1]) / 4];
        write(values.map((v, k) => snap(entries[k], v + step[k] * Math.max(entries[k].step, reach[k]))));
    };

    if (!open) {
        if (usable.length < 2) return null;
        const bottom = 64 + ['a10', 'a11', 'a13'].filter(flag => uxEnabled(flag as 'a10')).length * 48;
        return <button type="button" className="ux-map-start" style={{bottom}} onClick={start} title="Dva parametra z eno roko: zemljevid oblik">
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="15" rx="2.5"/><path d="M2.5 10h15M10 2.5v15" className="grid"/><circle cx="13" cy="7" r="2.4" className="dot"/></svg>
            Zemljevid
        </button>;
    }

    const live = ready ? entries.map(entry => getParam(entry.key)!.value) : [];
    const dot = ready ? [toFraction(live, 0), 1 - toFraction(live, 1)] : [0.5, 0.5];
    const outside = ready && (dot[0] < 0 || dot[0] > 1 || dot[1] < 0 || dot[1] > 1);
    const format = (entry: ParamEntry, value: number) => entry.format(Number(value.toPrecision(3)));

    return <div className={`ux-map${dragging ? ' is-dragging' : ''}`} role="group" aria-label="Zemljevid oblik">
        <div className="ux-map-head">
            <span className="ux-map-chips">
                {usable.map(entry => {
                    const axis = axes.indexOf(entry.key);
                    return <button key={entry.key} type="button" className={`ux-map-chip${axis >= 0 ? ' is-on' : ''}`} aria-pressed={axis >= 0} title={entry.label}
                        onClick={() => toggle(entry.key)} disabled={progress !== undefined}><i>{symbolOf(entry)}</i>{axis >= 0 && <small>{axis === 0 ? '→' : '↑'}</small>}</button>;
                })}
            </span>
            {outside && <button type="button" className="ux-map-icon" onClick={() => void capture(axes)} title="Nariši zemljevid okoli trenutnih vrednosti" aria-label="Osveži zemljevid">↻</button>}
            <button type="button" className="ux-map-icon" onClick={() => { setOpen(false); setFamily(undefined); }} aria-label="Zapri zemljevid">×</button>
        </div>
        <div ref={pad} className="ux-map-pad" style={{aspectRatio: `1 / ${aspect}`}} tabIndex={0} role="application"
            aria-label={ready ? `Zemljevid: ${symbolOf(entries[0])} vodoravno, ${symbolOf(entries[1])} navpično. Puščice premaknejo piko.` : 'Zemljevid se riše'}
            onPointerDown={down} onPointerMove={event => move(event)} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
            {ready && <div className="ux-map-tiles" style={{gridTemplateColumns: `repeat(${family!.xs.length}, 1fr)`}}>
                {family!.cells.map(cell => <span key={cell.values.join('|')} className="ux-map-tile" dangerouslySetInnerHTML={{__html: cell.svg}}/>)}
            </div>}
            {progress !== undefined && <div className="ux-map-progress"><span style={{width: `${Math.round(progress * 100)}%`}}/>Rišem zemljevid …</div>}
            {ready && trail.length > 1 && <svg className="ux-map-trail" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={trail.map(([x, y]) => `${x},${y}`).join(' ')}/>
            </svg>}
            {ready && !outside && <span className="ux-map-dot" style={{left: `${dot[0] * 100}%`, top: `${dot[1] * 100}%`}} aria-hidden="true"/>}
        </div>
        {ready && <div className="ux-map-readout" aria-live="polite">
            <span><i>{symbolOf(entries[0])}</i> = {format(entries[0], live[0])}</span>
            <span><i>{symbolOf(entries[1])}</i> = {format(entries[1], live[1])}</span>
            {locked && <small>vzmet</small>}
        </div>}
    </div>;
}
