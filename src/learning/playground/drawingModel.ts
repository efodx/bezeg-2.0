/**
 * Pure drawing model of the Bézier playground (no React, no DOM). See docs/specs/bezier-drawing-playground.md.
 * Every operation returns a new Drawing; inputs are never mutated.
 */
import {deCasteljauInPlace, deCasteljauScheme} from '../../bezeg/impl/kernels/bezier-kernels';

/** A point in the fixed user space (y points down, as in SVG). */
export interface Point {
    x: number;
    y: number;
}

/** How the two handles of an anchor are tied together when one is dragged. */
export type AnchorType = 'corner' | 'smooth-aligned' | 'smooth-mirrored';

/** An anchor with its incoming and outgoing handle (absolute positions). */
export interface Anchor {
    position: Point;
    handleIn: Point;
    handleOut: Point;
    type: AnchorType;
}

/** One path: ordered anchors and a closed flag. */
export interface Drawing {
    readonly anchors: readonly Anchor[];
    readonly closed: boolean;
}

/** Four cubic control points P0..P3. */
export type CubicSegment = readonly [Point, Point, Point, Point];

/** Continuity of the join at an anchor, from geometry. */
export type JointClass = 'C0' | 'G1' | 'C1';

/** Maximum number of anchors. */
export const MAX_ANCHORS = 32;
/** ViewBox width of the drawing space. */
export const VIEWBOX_WIDTH = 1000;
/** ViewBox height of the drawing space. */
export const VIEWBOX_HEIGHT = 625;
/** Distance of a point added with addPointAfterLast. */
export const ADD_POINT_DISTANCE = 60;
/** Number of undo steps the history retains. */
export const HISTORY_LIMIT = 200;
/** Known anchor types. */
export const ANCHOR_TYPES: readonly AnchorType[] = ['corner', 'smooth-aligned', 'smooth-mirrored'];

/** The empty drawing. */
export const EMPTY_DRAWING: Drawing = {anchors: [], closed: false};

const add = (a: Point, b: Point): Point => ({x: a.x + b.x, y: a.y + b.y});
const sub = (a: Point, b: Point): Point => ({x: a.x - b.x, y: a.y - b.y});
const scale = (a: Point, s: number): Point => ({x: a.x * s, y: a.y * s});
const len = (a: Point): number => Math.hypot(a.x, a.y);
const clonePoint = (p: Point): Point => ({x: p.x, y: p.y});

function replaceAt(d: Drawing, i: number, anchor: Anchor): Drawing {
    return {...d, anchors: d.anchors.map((a, k) => (k === i ? anchor : a))};
}

/** Append a corner anchor (no-op at the cap or on a closed path). */
export function appendCorner(d: Drawing, position: Point): Drawing {
    if (d.closed || d.anchors.length >= MAX_ANCHORS) return d;
    const p = clonePoint(position);
    return {...d, anchors: [...d.anchors, {position: p, handleIn: clonePoint(p), handleOut: clonePoint(p), type: 'corner'}]};
}

/** Append a smooth-mirrored anchor with the given outgoing handle; the incoming one is 2A - H (no-op at the cap). */
export function appendSmooth(d: Drawing, position: Point, handleOut: Point): Drawing {
    if (d.closed || d.anchors.length >= MAX_ANCHORS) return d;
    const p = clonePoint(position);
    const out = clonePoint(handleOut);
    return {...d, anchors: [...d.anchors, {position: p, handleIn: sub(scale(p, 2), out), handleOut: out, type: 'smooth-mirrored'}]};
}

/** Append a corner anchor 60 units from the last one, inside the viewBox (centre when empty). */
export function addPointAfterLast(d: Drawing): Drawing {
    if (d.closed || d.anchors.length >= MAX_ANCHORS) return d;
    if (d.anchors.length === 0) return appendCorner(d, {x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2});
    const last = d.anchors[d.anchors.length - 1].position;
    const inside = (p: Point) => p.x >= 0 && p.x <= VIEWBOX_WIDTH && p.y >= 0 && p.y <= VIEWBOX_HEIGHT;
    const directions: Point[] = [{x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}];
    for (const dir of directions) {
        const p = add(last, scale(dir, ADD_POINT_DISTANCE));
        if (inside(p)) return appendCorner(d, p);
    }
    // Only reachable if the last anchor lies outside the viewBox: clamp.
    return appendCorner(d, {x: Math.min(VIEWBOX_WIDTH, Math.max(0, last.x)), y: Math.min(VIEWBOX_HEIGHT, Math.max(0, last.y))});
}

/** Move anchor i to a new position; both handles move with it. */
export function moveAnchor(d: Drawing, i: number, position: Point): Drawing {
    const a = d.anchors[i];
    if (!a) return d;
    const delta = sub(position, a.position);
    return replaceAt(d, i, {...a, position: clonePoint(position), handleIn: add(a.handleIn, delta), handleOut: add(a.handleOut, delta)});
}

/**
 * Drag handle `which` of anchor i to `position`, applying the type constraint to the other handle.
 * With `alt`, a smooth-mirrored anchor becomes smooth-aligned first (the other handle keeps its length).
 */
export function moveHandle(d: Drawing, i: number, which: 'in' | 'out', position: Point, alt = false): Drawing {
    const a = d.anchors[i];
    if (!a) return d;
    const type: AnchorType = alt && a.type === 'smooth-mirrored' ? 'smooth-aligned' : a.type;
    const h = clonePoint(position);
    const oldOther = which === 'in' ? a.handleOut : a.handleIn;
    let other = oldOther;
    if (type === 'smooth-mirrored') {
        other = sub(scale(a.position, 2), h);
    } else if (type === 'smooth-aligned') {
        const v = sub(h, a.position);
        const l = len(v);
        if (l > 0) other = sub(a.position, scale(v, len(sub(oldOther, a.position)) / l));
    }
    return replaceAt(d, i, {
        ...a,
        type,
        handleIn: which === 'in' ? h : other,
        handleOut: which === 'in' ? other : h,
    });
}

/** Set an anchor's type; switching to a smooth type places handles along previous -> next at 1/3 of the chords. */
export function setAnchorType(d: Drawing, i: number, type: AnchorType): Drawing {
    const a = d.anchors[i];
    if (!a) return d;
    if (type === 'corner') return replaceAt(d, i, {...a, type});
    const n = d.anchors.length;
    const prevIdx = i > 0 ? i - 1 : d.closed && n > 1 ? n - 1 : -1;
    const nextIdx = i < n - 1 ? i + 1 : d.closed && n > 1 ? 0 : -1;
    const A = a.position;
    const prev = prevIdx >= 0 ? d.anchors[prevIdx].position : null;
    const next = nextIdx >= 0 ? d.anchors[nextIdx].position : null;
    // A lone anchor has no tangent: collapse its handles onto it so the stored type stays truthful.
    if (!prev && !next) return replaceAt(d, i, {...a, type, handleIn: clonePoint(A), handleOut: clonePoint(A)});
    // Tangent direction and chord lengths; an end anchor uses its only neighbour for both sides.
    let dirVec = prev && next ? sub(next, prev) : next ? sub(next, A) : sub(A, prev!);
    if (len(dirVec) === 0) {
        // Coincident neighbours (for example a closed two-anchor path): use the perpendicular to the chord.
        const chord = sub(A, prev ?? next!);
        dirVec = len(chord) > 0 ? {x: -chord.y, y: chord.x} : {x: 1, y: 0};
    }
    const dir = scale(dirVec, 1 / len(dirVec));
    let lenIn = (prev ? len(sub(A, prev)) : len(sub(next!, A))) / 3;
    let lenOut = (next ? len(sub(next, A)) : len(sub(A, prev!))) / 3;
    if (type === 'smooth-mirrored') lenIn = lenOut = (lenIn + lenOut) / 2;
    return replaceAt(d, i, {...a, type, handleIn: sub(A, scale(dir, lenIn)), handleOut: add(A, scale(dir, lenOut))});
}

/** Toggle an anchor between corner and smooth-mirrored. */
export function toggleAnchorType(d: Drawing, i: number): Drawing {
    const a = d.anchors[i];
    if (!a) return d;
    return setAnchorType(d, i, a.type === 'corner' ? 'smooth-mirrored' : 'corner');
}

/** Delete anchor i; a closed path left with fewer than two anchors opens. */
export function deleteAnchor(d: Drawing, i: number): Drawing {
    if (!d.anchors[i]) return d;
    const anchors = d.anchors.filter((_, k) => k !== i);
    return {anchors, closed: d.closed && anchors.length >= 2};
}

/** Whether the path can be closed (open with at least two anchors). */
export function canClose(d: Drawing): boolean {
    return !d.closed && d.anchors.length >= 2;
}

/** Close the path; a no-op unless {@link canClose}. */
export function closeDrawing(d: Drawing): Drawing {
    return canClose(d) ? {...d, closed: true} : d;
}

/** The empty drawing. */
export function clearDrawing(): Drawing {
    return EMPTY_DRAWING;
}

/** The cubic segments [P0, P1, P2, P3]; a closed path adds the segment from the last anchor to the first. */
export function segments(d: Drawing): CubicSegment[] {
    const n = d.anchors.length;
    const count = d.closed && n >= 2 ? n : Math.max(0, n - 1);
    const result: CubicSegment[] = [];
    for (let i = 0; i < count; i++) {
        const a = d.anchors[i];
        const b = d.anchors[(i + 1) % n];
        result.push([a.position, a.handleOut, b.handleIn, b.position]);
    }
    return result;
}

const fmt = (v: number): string => String(Math.round(v * 1e6) / 1e6);
const pt = (p: Point): string => `${fmt(p.x)} ${fmt(p.y)}`;

/** The SVG path `M A0 C H0+ H1- A1 ...` (closed paths end with the closing C and Z); empty string without segments. */
export function toSvgPath(d: Drawing): string {
    const segs = segments(d);
    if (segs.length === 0) return '';
    const parts = [`M ${pt(segs[0][0])}`, ...segs.map(s => `C ${pt(s[1])} ${pt(s[2])} ${pt(s[3])}`)];
    if (d.closed) parts.push('Z');
    return parts.join(' ');
}

/** Indices of anchors that form a joint: interior anchors of open paths, all anchors of closed paths with two or more segments. */
export function jointIndices(d: Drawing): number[] {
    const n = d.anchors.length;
    if (d.closed) return n >= 2 ? d.anchors.map((_, i) => i) : [];
    return n >= 3 ? Array.from({length: n - 2}, (_, k) => k + 1) : [];
}

function extent(d: Drawing): number {
    const pts = d.anchors.flatMap(a => [a.position, a.handleIn, a.handleOut]);
    if (pts.length === 0) return 1;
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const e = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    return e > 0 ? e : 1;
}

/** Continuity of the join at anchor i, from geometry (tolerance 1e-9 of the drawing extent). Use for indices from {@link jointIndices}. */
export function classifyJoint(d: Drawing, i: number): JointClass {
    const a = d.anchors[i];
    if (!a) return 'C0';
    const eps = 1e-9 * extent(d);
    const u = sub(a.position, a.handleIn);
    const v = sub(a.handleOut, a.position);
    if (len(sub(u, v)) <= eps) return 'C1';
    const lu = len(u);
    const lv = len(v);
    if (lu > eps && lv > eps) {
        const cross = u.x * v.y - u.y * v.x;
        const dot = u.x * v.x + u.y * v.y;
        if (dot > 0 && Math.abs(cross) <= 1e-9 * lu * lv) return 'G1';
    }
    return 'C0';
}

/** All control points of the one Bézier curve of degree 3k through the segments: A0, H0+, H1-, A1, ... (closed ends at A0). */
export function singleCurveControlPoints(d: Drawing): Point[] {
    const segs = segments(d);
    if (segs.length === 0) return [];
    return [segs[0][0], ...segs.flatMap(s => [s[1], s[2], s[3]])];
}

/** Point on the Bézier curve with the given control points at t, via the src/bezeg De Casteljau kernel. */
export function evaluateBezier(points: readonly Point[], t: number): Point {
    const rows = points.map(p => [p.x, p.y]);
    deCasteljauInPlace(t, rows);
    return {x: rows[0][0], y: rows[0][1]};
}

/** De Casteljau levels at t: level 0 is the control points, level r has n - r points, the last is the curve point. */
export function deCasteljauRows(points: readonly Point[], t: number): Point[][] {
    const n = points.length;
    const scheme = deCasteljauScheme(t, points.map(p => [p.x, p.y]));
    return scheme.map((level, r) => level.slice(0, n - r).map(([x, y]) => ({x, y})));
}

/** Validate untrusted data (e.g. parsed JSON) into a Drawing; null if invalid. Never throws. */
export function validateDrawing(data: unknown): Drawing | null {
    try {
        if (typeof data !== 'object' || data === null) return null;
        const {anchors, closed} = data as {anchors?: unknown; closed?: unknown};
        if (typeof closed !== 'boolean' || !Array.isArray(anchors) || anchors.length > MAX_ANCHORS) return null;
        const readPoint = (p: unknown): Point | null => {
            if (typeof p !== 'object' || p === null) return null;
            const {x, y} = p as {x?: unknown; y?: unknown};
            return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? {x, y} : null;
        };
        const result: Anchor[] = [];
        for (const raw of anchors as unknown[]) {
            if (typeof raw !== 'object' || raw === null) return null;
            const r = raw as Record<string, unknown>;
            const position = readPoint(r.position);
            const handleIn = readPoint(r.handleIn);
            const handleOut = readPoint(r.handleOut);
            const type = ANCHOR_TYPES.find(t => t === r.type);
            if (!position || !handleIn || !handleOut || !type) return null;
            result.push({position, handleIn, handleOut, type});
        }
        return {anchors: result, closed: closed && result.length >= 2};
    } catch {
        return null;
    }
}

/** Immutable undo history of values; a drag is committed as one push. */
export interface History<T> {
    readonly past: readonly T[];
    readonly present: T;
    readonly future: readonly T[];
}

/** A history holding only `initial`. */
export function createHistory<T>(initial: T): History<T> {
    return {past: [], present: initial, future: []};
}

/** Commit a new present (clears redo, keeps at most HISTORY_LIMIT undo steps); an identical value is ignored. */
export function pushHistory<T>(h: History<T>, value: T): History<T> {
    if (Object.is(value, h.present)) return h;
    return {past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: value, future: []};
}

/** Step back one commit (no-op when impossible). */
export function undoHistory<T>(h: History<T>): History<T> {
    if (h.past.length === 0) return h;
    return {past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future]};
}

/** Step forward one commit (no-op when impossible). */
export function redoHistory<T>(h: History<T>): History<T> {
    if (h.future.length === 0) return h;
    return {past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1)};
}

/** Whether undo is possible. */
export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0;
/** Whether redo is possible. */
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0;
