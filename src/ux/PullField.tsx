import React, {useCallback, useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {getParam, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {drawn, meaningful} from './YourTurn';
import {settle, svgRootOf} from './family';
import './PullField.css';

/**
 * a17 — Where a parameter pulls. Pick a parameter and arrows grow along every curve it moves: each arrow shows where a
 * small increase of the parameter pushes that point of the curve (the normal velocity of the family of curves). For d
 * they are all equal and point up; for a they grow away from the vertex; for c they lean sideways and vanish at the
 * vertex; for p in a binomial they push the bell's flanks in opposite directions. The arrows stay live while the
 * learner drags other parameters, so "how does a act at this shape?" is seen, not told. Generic: the board is nudged
 * synchronously through the shared slider registry and restored before the browser paints, so nothing flickers.
 */

type Vec = [number, number];
interface Arrow { from: Vec; to: Vec; strength: number; point?: boolean }

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);

function sample(node: SVGGeometryElement): Vec[] {
    let length = 0;
    try { length = node.getTotalLength(); } catch { return []; }
    if (!(length > 0)) return [];
    const count = Math.max(16, Math.min(160, Math.round(length / 9)));
    return Array.from({length: count + 1}, (_, i) => { const p = node.getPointAtLength(length * i / count); return [p.x, p.y] as Vec; });
}

export function PullField(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const usable = params.filter(entry => meaningful(entry) && !entry.inert && entry.unavailable === undefined);
    const [active, setActive] = useState<string>();
    const [arrows, setArrows] = useState<Arrow[]>([]);
    const [size, setSize] = useState<{width: number; height: number; left: number; top: number}>();
    const busy = useRef(false);

    const compute = useCallback(async (key: string) => {
        const b = findBoard(props.frame.current);
        const svg = b && svgRootOf(b);
        const entry = getParam(key);
        if (!b || !svg || !meaningful(entry) || busy.current) return;
        busy.current = true;
        try {
            const span = entry.max - entry.min;
            const delta = Math.max(entry.step, span * 0.02);
            const direction = entry.value + delta <= entry.max || entry.cyclic !== undefined ? 1 : -1;
            const start = entry.value;
            const isPoint = (object: {elType?: string}) => object.elType === 'point' || object.elType === 'glider';
            const shapes = () => new Map(drawn(b).filter(object => object.elType !== 'text' && !isPoint(object) && object.rendNode instanceof SVGGeometryElement)
                .map(object => [object.id, sample(object.rendNode as unknown as SVGGeometryElement)]));
            const centres = () => new Map(drawn(b).filter(isPoint).map(object => {
                const node = object.rendNode!;
                return [object.id, [Number(node.getAttribute('cx')), Number(node.getAttribute('cy'))] as Vec];
            }));
            const before = shapes(), pointsBefore = centres();
            await settle(b, [key], [start + direction * delta]);
            const after = shapes(), pointsAfter = centres();
            await settle(b, [key], [start]);
            const out: Arrow[] = [];
            // A point moves as a whole: one arrow from its centre.
            for (const [id, p] of pointsBefore) {
                const q = pointsAfter.get(id);
                if (!q || !Number.isFinite(p[0]) || !Number.isFinite(q[0])) continue;
                const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
                if (d > 0.05) out.push({from: p, to: [(q[0] - p[0]) * direction, (q[1] - p[1]) * direction], strength: d, point: true});
            }
            for (const [id, points] of before) {
                const moved = after.get(id);
                if (!moved || moved.length === 0 || points.length < 2) continue;
                // Curves this parameter does not move at all get no marks.
                if (moved.length === points.length && points.every((p, i) => Math.abs(p[0] - moved[i][0]) + Math.abs(p[1] - moved[i][1]) < 0.05)) continue;
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    // Only the motion across the curve is visible: project the step onto the curve's normal.
                    const a = points[Math.max(0, i - 1)], c = points[Math.min(points.length - 1, i + 1)];
                    const tx = c[0] - a[0], ty = c[1] - a[1];
                    const tl = Math.hypot(tx, ty);
                    if (tl < 1e-6) continue;
                    let best = moved[0], bestD = Infinity;
                    for (const q of moved) { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bestD) { bestD = d; best = q; } }
                    const nx = -ty / tl, ny = tx / tl;
                    const along = (best[0] - p[0]) * nx + (best[1] - p[1]) * ny;
                    out.push({from: p, to: [nx * along * direction, ny * along * direction], strength: Math.abs(along)});
                }
            }
            // Scale so that the strongest push is a readable arrow; thin out to one arrow per ~22 px of curve. Points
            // (whole motion) and curves (motion across the curve) are different quantities, so each has its own scale.
            const strongest = (point: boolean) => Math.max(0, ...out.filter(arrow => !!arrow.point === point).map(arrow => arrow.strength));
            const top = {curve: strongest(false), point: strongest(true)};
            const kept: Arrow[] = [];
            for (const arrow of [...out.filter(a => a.point), ...out.filter(a => !a.point)]) {
                const max0 = arrow.point ? top.point : top.curve;
                // Still places are marked sparsely (bar sides, fixed vertex) so the arrows stay the story.
                const gap = max0 && arrow.strength / max0 < 0.06 ? 46 : 22;
                if (!arrow.point && kept.some(k => Math.hypot(k.from[0] - arrow.from[0], k.from[1] - arrow.from[1]) < gap)) continue;
                const [x, y] = arrow.from;
                if (x < 0 || y < 0 || x > svg.clientWidth || y > svg.clientHeight) continue;
                const max = arrow.point ? top.point : top.curve;
                const scale = max > 0.05 ? 34 / max : 0;
                kept.push({from: arrow.from, to: [x + arrow.to[0] * scale, y + arrow.to[1] * scale], strength: max ? arrow.strength / max : 0, point: arrow.point});
            }
            const frame = props.frame.current!.getBoundingClientRect(), rect = svg.getBoundingClientRect();
            setSize({width: rect.width, height: rect.height, left: rect.left - frame.left, top: rect.top - frame.top});
            setArrows(kept);
        } finally {
            busy.current = false;
        }
    }, [props.frame]);

    // Live: recompute whenever any parameter (or the board) changes while a field is shown.
    const signature = usable.map(entry => `${entry.key}=${entry.value}`).join('|');
    useEffect(() => {
        if (!active) return;
        const timer = window.setTimeout(() => void compute(active), 40);
        return () => window.clearTimeout(timer);
    }, [active, signature, compute]);

    if (usable.length === 0) return null;
    const entry = active ? getParam(active) : undefined;
    return <>
        {active && size && <svg className="ux-pull-layer" aria-hidden="true" style={size} viewBox={`0 0 ${size.width} ${size.height}`}>
            <defs><marker id="ux-pull-head" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z"/></marker></defs>
            {arrows.map((arrow, i) => arrow.strength < 0.06
                ? <circle key={i} cx={arrow.from[0]} cy={arrow.from[1]} r="2.2" className="still"/>
                : <line key={i} x1={arrow.from[0]} y1={arrow.from[1]} x2={arrow.to[0]} y2={arrow.to[1]} markerEnd="url(#ux-pull-head)" style={{opacity: 0.45 + 0.55 * arrow.strength}}/>)}
        </svg>}
        <div className="ux-pull" role="group" aria-label="Kam vleče parameter">
            <span className="ux-pull-label">Kam vleče</span>
            {usable.map(item => <button key={item.key} type="button" className={`ux-pull-chip${active === item.key ? ' is-on' : ''}`} aria-pressed={active === item.key}
                title={`${item.label}: puščice kažejo, kam se premakne krivulja, ko ${symbolOf(item)} malo povečaš`}
                onClick={() => setActive(current => current === item.key ? undefined : item.key)}><i>{symbolOf(item)}</i></button>)}
        </div>
        {entry && <p className="ux-pull-note">Puščice kažejo, kam se premakne krivulja, ko <i>{symbolOf(entry)}</i> malo povečaš; pike, kjer ostane na mestu.</p>}
    </>;
}
