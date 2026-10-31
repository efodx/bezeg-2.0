/**
 * "Look underneath" mode of the drawing playground (slice PG3, docs/specs/bezier-drawing-playground.md).
 *
 * State ownership: this component owns only the overlay switches, the selected segment and the parameter t. The drawing
 * itself stays inside DrawingPlayground; every overlay is derived from the drawing passed in the render-prop context, so
 * edits update the overlays immediately and no copy of the drawing is kept. The selected segment is clamped at render
 * time when segments disappear. Overlay evaluation uses the src/bezeg De Casteljau kernel through drawingModel.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {useT} from '../../localization';
import Slider from '../../inputs/Slider';
import DrawingPlayground, {PlaygroundOverlayContext} from './DrawingPlayground';
import {
    Drawing, Point, VIEWBOX_HEIGHT, VIEWBOX_WIDTH, classifyJoint, deCasteljauRows, evaluateBezier, jointIndices, segments, singleCurveControlPoints,
} from './drawingModel';

/** Samples of the one-curve overlay (the spec asks for at least 400). */
export const SINGLE_CURVE_SAMPLES = 400;

interface Switches {points: boolean; casteljau: boolean; joins: boolean; single: boolean}
const ALL_ON: Switches = {points: true, casteljau: true, joins: true, single: true};
/** Joint label distance from its anchor, in sixteenths of the label font size (about 1.6 em: clear of the anchor dot). */
const JOINT_LABEL_DISTANCE = 26;

const pointList = (pts: readonly Point[]) => pts.map(p => `${p.x},${p.y}`).join(' ');
const clampIndex = (i: number, count: number) => Math.max(0, Math.min(i, count - 1));

/** SVG path of the degree-3k curve sampled with the De Casteljau kernel. */
export function singleCurvePath(drawing: Drawing, samples = SINGLE_CURVE_SAMPLES): string {
    const pts = singleCurveControlPoints(drawing);
    if (pts.length < 2) return '';
    const out: string[] = [];
    for (let i = 0; i <= samples; i++) {
        const p = evaluateBezier(pts, i / samples);
        out.push(`${i === 0 ? 'M' : 'L'} ${Math.round(p.x * 1e3) / 1e3} ${Math.round(p.y * 1e3) / 1e3}`);
    }
    return out.join(' ');
}

/**
 * Offset of a joint label: outward from the anchors' centroid, so it sits away from the shape and its handles (which lie
 * along the tangent, where the P0-P3 labels are). Returns a unit vector; straight down when the anchor is the centroid.
 */
export function jointLabelDirection(drawing: Drawing, i: number): Point {
    const n = drawing.anchors.length;
    const c = drawing.anchors.reduce((s, a) => ({x: s.x + a.position.x / n, y: s.y + a.position.y / n}), {x: 0, y: 0});
    const p = drawing.anchors[i].position;
    const len = Math.hypot(p.x - c.x, p.y - c.y);
    return len < 1e-9 ? {x: 0, y: 1} : {x: (p.x - c.x) / len, y: (p.y - c.y) / len};
}

interface Box {left: number; top: number; right: number; bottom: number}
const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Centre of a joint label of font size `size`: JOINT_LABEL_DISTANCE/16 em from the anchor along `dir`, flipped inward when
 * that would cover the degree caption (`avoid`), then clamped so the whole label stays inside the view box.
 */
export function jointLabelPosition(at: Point, dir: Point, size: number, avoid: Box | null): Point {
    const d = JOINT_LABEL_DISTANCE * size / 16;
    const halfW = 0.8 * size, halfH = 0.6 * size; // a two-character label such as "C1"
    const boxAt = (c: Point): Box => ({left: c.x - halfW, top: c.y - halfH, right: c.x + halfW, bottom: c.y + halfH});
    let c = {x: at.x + dir.x * d, y: at.y + dir.y * d};
    if (avoid && overlaps(boxAt(c), avoid)) c = {x: at.x - dir.x * d, y: at.y - dir.y * d};
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    return {x: clamp(c.x, halfW, VIEWBOX_WIDTH - halfW), y: clamp(c.y, halfH, VIEWBOX_HEIGHT - halfH)};
}

function Label({at, text, sub, size, className, dx = 10, dy = -10, centered = false}: {at: Point; text: string; sub?: string; size: number; className: string; dx?: number; dy?: number; centered?: boolean}) {
    return <text x={at.x + dx * size / 16} y={at.y + dy * size / 16} fontSize={size} className={`lu-label ${className}`}
                 {...(centered ? {textAnchor: 'middle', dominantBaseline: 'central'} : {})}>
        {text}{sub !== undefined && <tspan fontSize={size * 0.7} dy={size * 0.25}>{sub}</tspan>}
    </text>;
}

function Overlays({ctx, switches, selected, t}: {ctx: PlaygroundOverlayContext; switches: Switches; selected: number; t: number}) {
    const translate = useT();
    const {drawing, unitsPerPx} = ctx;
    const segs = useMemo(() => segments(drawing), [drawing]);
    // Memoized on the drawing: the degree-3k sampling is the expensive part.
    const singlePath = useMemo(() => singleCurvePath(drawing), [drawing]);
    const joints = useMemo(() => jointIndices(drawing).map(i => ({i, cls: classifyJoint(drawing, i), dir: jointLabelDirection(drawing, i)})), [drawing]);
    const size = Math.max(14, 15 * unitsPerPx);
    const sel = segs.length > 0 ? clampIndex(selected, segs.length) : -1;
    const rows = sel >= 0 ? deCasteljauRows(segs[sel], t) : [];
    const degree = 3 * segs.length;
    const degreeText = translate('playground_single_degree', {value0: degree});
    // The caption's box at (16, 16 + size): about 0.56 em per character, with a little room below the baseline.
    const degreeBox: Box | null = switches.single && singlePath ? {left: 16, top: 16, right: 16 + 0.56 * size * degreeText.length, bottom: 16 + 1.3 * size} : null;
    return <>
        {segs.map((s, i) => <path key={`hit-${i}`} className="lu-segment-hit" data-role="segment" data-index={i} pointerEvents="stroke"
                                  strokeWidth={Math.max(16, 22 * unitsPerPx)} d={`M ${s[0].x} ${s[0].y} C ${s[1].x} ${s[1].y} ${s[2].x} ${s[2].y} ${s[3].x} ${s[3].y}`}/>)}
        {switches.points && <g data-overlay="points">
            {segs.map((s, i) => <polyline key={i} data-overlay-part="polygon" data-index={i} className={`lu-polygon${i === sel ? ' is-selected' : ''}`} points={pointList(s)}/>)}
            {sel >= 0 && segs[sel].map((p, k) => <Label key={k} at={p} text="P" sub={String(k)} size={size} className="lu-point-label"/>)}
        </g>}
        {switches.casteljau && sel >= 0 && <g data-overlay="casteljau">
            {rows.slice(1, -1).map((level, r) => <React.Fragment key={r}>
                <polyline data-overlay-part="row" data-level={r + 1} className={`lu-level-${r + 1}`} points={pointList(level)}/>
                {level.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={4 * Math.max(1, unitsPerPx * 0.8)} className={`lu-dot-${r + 1}`}/>)}
            </React.Fragment>)}
            {rows.length > 0 && <circle data-overlay-part="bt" cx={rows[rows.length - 1][0].x} cy={rows[rows.length - 1][0].y} r={7 * Math.max(1, unitsPerPx * 0.8)} className="lu-bt"/>}
        </g>}
        {switches.joins && <g data-overlay="joins">
            {joints.map(({i, cls, dir}) => <Label key={i} at={jointLabelPosition(drawing.anchors[i].position, dir, size, degreeBox)} text={cls}
                                                  size={size} className="lu-joint-label" dx={0} dy={0} centered/>)}
        </g>}
        {switches.single && singlePath && <g data-overlay="single">
            <path data-overlay-part="single-curve" className="lu-single" d={singlePath}/>
            <text data-overlay-part="degree" aria-hidden="true" x={16} y={16 + size} fontSize={size} className="lu-label lu-degree">{degreeText}</text>
        </g>}
    </>;
}

/** Writes the clamped selection back, so previous/next and later growth start from the visible segment, not a stale index. */
function ClampSelection({count, selected, set}: {count: number; selected: number; set: (i: number) => void}) {
    useEffect(() => {
        if (count > 0 && selected > count - 1) set(count - 1);
    }, [count, selected, set]);
    return null;
}

export default function LookUnderneath() {
    const translate = useT();
    const [switches, setSwitches] = useState<Switches>(ALL_ON);
    const [selected, setSelected] = useState(0);
    const [t, setT] = useState(0.5);

    const controls = (ctx: PlaygroundOverlayContext) => {
        const count = segments(ctx.drawing).length;
        const sel = count > 0 ? clampIndex(selected, count) : -1;
        const toggle = (key: keyof Switches, label: string) => (
            <label className="lu-switch"><input type="checkbox" checked={switches[key]} onChange={e => setSwitches({...switches, [key]: e.target.checked})}/>{label}</label>
        );
        return <div className="lu-controls">
            <ClampSelection count={count} selected={selected} set={setSelected}/>
            <fieldset className="lu-switches">
                <legend>{translate('playground_overlays')}</legend>
                {toggle('points', translate('playground_overlay_points'))}
                {toggle('casteljau', translate('de_casteljau_construction'))}
                {toggle('joins', translate('playground_overlay_joins'))}
                {toggle('single', translate('playground_overlay_single'))}
            </fieldset>
            <div className="lu-segments">
                <button type="button" disabled={sel <= 0} onClick={() => setSelected(sel - 1)}>{translate('playground_segment_prev')}</button>
                <span data-lu="segment">{sel >= 0 ? translate('playground_segment_current', {value0: sel + 1, value1: count}) : translate('playground_segment_none')}</span>
                <button type="button" disabled={sel < 0 || sel >= count - 1} onClick={() => setSelected(sel + 1)}>{translate('playground_segment_next')}</button>
            </div>
            {switches.single && count > 0 && <p className="lu-note" data-lu="degree">{translate('playground_single_degree', {value0: 3 * count})}</p>}
            {switches.joins && <p className="lu-note" data-lu="legend">{translate('playground_joins_legend')}</p>}
            {switches.casteljau && count > 0 && <Slider customText={translate('construction_parameter_t')} min={0} max={1} step={0.01} value={t} onChange={setT}/>}
        </div>;
    };

    return <DrawingPlayground mode="inspect" onSelectSegment={setSelected} controls={controls}
                              overlays={ctx => <Overlays ctx={ctx} switches={switches} selected={selected} t={t}/>}/>;
}
