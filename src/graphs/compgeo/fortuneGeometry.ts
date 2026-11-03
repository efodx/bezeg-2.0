/**
 * Drawing geometry of Fortune's sweep (task sweep-algorithms/23): doubles for the board only, derived from the exact
 * kernel trace (`fortuneTrace`) and never fed back into it. Pure TypeScript: no React, JSXGraph or localization.
 *
 * Steps. The graph steps over EVENT GROUPS of the trace, not over every trace entry: a group is a `pop` and the status,
 * report, cancel and schedule entries that follow it, so every step shows a consistent beach line (inside a group the
 * status passes through a state that is no beach line). Step 0 is the state after the sites are queued (the sweep line
 * above everything), the last step is `done`.
 *
 * Drawn beach line. At sweep level l the arc of a site p (u = p_y - l > 0) is the parabola
 *   y(x) = (x - p_x)^2 / (2u) + (p_y + l) / 2,
 * and the breakpoint of adjacent arcs i | j is the root of the quadratic named in the kernel's comment (the larger root
 * when j_y > i_y, else the smaller one). A site at the level itself (u = 0) is a pointed arc: a vertical segment.
 */
import type {GridPoint} from '../../compgeo/grid';
import {Rational} from '../../compgeo/rational';
import {circumcentre} from '../../compgeo/triangle';
import type {RationalBox} from '../../compgeo/voronoi';
import {type FortuneResult, type FortuneState, fortuneStateAt, type SweepHeight} from '../../compgeo/sweep/fortune';
import type {SweepEvent, SweepKind, SweepPayloads} from '../../compgeo/sweep/sweepTrace';
import type {TraceEvent} from '../../compgeo/trace';
import {frame} from './voronoiDrawing';

/** Type guard on the event kind (narrows the payload). */
export function isKind<K extends SweepKind>(event: SweepEvent<number>, kind: K): event is TraceEvent<K, SweepPayloads<number>[K]> {
    return event.kind === kind;
}

export interface Pt {
    readonly x: number;
    readonly y: number;
}

/** Samples per arc (a fixed count: the drawn beach line is approximate by design). */
export const ARC_SAMPLES = 24;
/** Samples of a circle outline. */
export const CIRCLE_SAMPLES = 64;
const POINTED = 1e-9;

/** Trace indices of the steps: after the queue is filled, after each event group, and `done`. */
export function fortuneSteps(result: FortuneResult): readonly number[] {
    const trace = result.trace;
    const firstPop = trace.findIndex(event => event.kind === 'pop');
    const steps: number[] = [Math.max(firstPop - 1, 0)];
    for (let k = Math.max(firstPop, 0); k + 1 < trace.length; k++) {
        const next = trace[k + 1].kind;
        if (next === 'pop' || next === 'done') steps.push(k);
    }
    steps.push(trace.length - 1);
    return steps;
}

export function heightValue(height: SweepHeight | null): number | null {
    if (height === null) return null;
    return height.kind === 'rational' ? height.value.toNumber() : height.q.toNumber() - Math.sqrt(height.r.toNumber());
}

/** The x of the breakpoint of adjacent arcs `left | right` at level `level` (both sites at or above it). */
export function breakpointX(left: GridPoint, right: GridPoint, level: number): number {
    const ui = left.y - level;
    const uj = right.y - level;
    if (ui <= POINTED && uj <= POINTED) return (left.x + right.x) / 2;
    if (uj <= POINTED) return right.x;
    if (ui <= POINTED) return left.x;
    // D(x) = a x^2 + b x + c with a = u_j - u_i (the kernel's quadratic, expanded).
    const a = uj - ui;
    const b = 2 * (ui * right.x - uj * left.x);
    const c = uj * left.x * left.x - ui * right.x * right.x + ui * uj * (ui - uj);
    if (Math.abs(a) < 1e-12) return -c / b;
    const disc = Math.sqrt(Math.max(b * b - 4 * a * c, 0));
    // Larger root for a > 0, smaller root for a < 0: always (-b + sqrt) / 2a.
    const q = -(b + Math.sign(b || 1) * disc) / 2;
    const roots = [q / a, c / q].filter(Number.isFinite);
    if (roots.length < 2) return (-b + disc) / (2 * a);
    return a > 0 ? Math.max(...roots) : Math.min(...roots);
}

export function parabolaY(site: GridPoint, level: number, x: number): number {
    const u = site.y - level;
    return u <= POINTED ? level : ((x - site.x) ** 2) / (2 * u) + (site.y + level) / 2;
}

export interface ArcDraw {
    readonly arc: number;
    readonly site: number;
    readonly xs: readonly number[];
    readonly ys: readonly number[];
}

export interface BreakpointDraw {
    readonly left: number;
    readonly right: number;
    readonly at: Pt;
    /** Where this breakpoint's trace began; null = at infinity (drawn up to the box). */
    readonly from: Pt | null;
}

export interface FinishedTrace {
    readonly from: Pt | null;
    readonly to: Pt;
}

export interface CircleDraw {
    readonly id: number;
    readonly centre: Pt;
    readonly radius: number;
    readonly low: Pt;
}

export interface FortuneView {
    readonly step: number;
    readonly index: number;
    readonly state: FortuneState;
    readonly done: boolean;
    /** The sweep level as a double; null before the first event. */
    readonly level: number | null;
    /** The y the sweep line is drawn at: the level, or the top of the box before the first event. */
    readonly lineY: number;
    readonly arcs: readonly ArcDraw[];
    readonly breakpoints: readonly BreakpointDraw[];
    readonly finished: readonly FinishedTrace[];
    readonly scheduled: readonly CircleDraw[];
    readonly cancelled: readonly CircleDraw[];
    readonly vertices: readonly Pt[];
}

interface Origins {
    readonly open: ReadonlyMap<string, Pt | null>;
    readonly finished: readonly FinishedTrace[];
}

const pairKey = (left: number, right: number): string => `${left}|${right}`;
const toPt = (p: {x: Rational; y: Rational}): Pt => ({x: p.x.toNumber(), y: p.y.toNumber()});

/** Where each open breakpoint's trace began, and the traces that ended at a vertex, after every step (index = step). */
export function traceOrigins(result: FortuneResult, sites: readonly GridPoint[]): readonly Origins[] {
    const steps = fortuneSteps(result);
    const trace = result.trace;
    let beach: number[] = [];
    const open = new Map<string, Pt | null>();
    const finished: FinishedTrace[] = [];
    const snapshots: Origins[] = [];
    steps.forEach((last, j) => {
        const from = j === 0 ? 0 : steps[j - 1] + 1;
        beach = [...beach];
        for (let k = from; k <= last; k++) {
            const event = trace[k];
            if (isKind(event, 'status-insert')) beach.splice(event.payload.index, 0, event.payload.id);
            else if (isKind(event, 'status-remove')) beach = beach.filter(arc => arc !== event.payload.id);
        }
        if (j > 0) transition(result, sites, from, beach, open, finished);
        snapshots.push({open: new Map(open), finished: [...finished]});
    });
    return snapshots;
}

function transition(
    result: FortuneResult, sites: readonly GridPoint[], pop: number,
    after: readonly number[], open: Map<string, Pt | null>, finished: FinishedTrace[],
): void {
    const siteEvent = result.siteEvents.find(e => e.event === pop);
    if (siteEvent) {
        const {arc, above, hit} = siteEvent;
        const s = sites[siteEvent.site];
        if (hit) {
            const [l, r] = hit;
            const centre = circumcentre(sites[result.arcSite[l]], sites[result.arcSite[r]], s);
            if (centre.kind !== 'point') return;
            const vertex = toPt(centre.point);
            finished.push({from: open.get(pairKey(l, r)) ?? null, to: vertex});
            open.delete(pairKey(l, r));
            open.set(pairKey(l, arc), vertex);
            open.set(pairKey(arc, r), vertex);
        } else if (above !== null && sites[result.arcSite[above]].y === s.y) {
            open.set(pairKey(above, arc), null);
        } else if (above !== null) {
            const p = sites[result.arcSite[above]];
            const split: Pt = {x: s.x, y: parabolaY(p, s.y, s.x)};
            const rest = arc + 1;
            const next = after[after.indexOf(rest) + 1];
            if (next !== undefined) {
                open.set(pairKey(rest, next), open.get(pairKey(above, next)) ?? null);
                open.delete(pairKey(above, next));
            }
            open.set(pairKey(above, arc), split);
            open.set(pairKey(arc, rest), split);
        }
        return;
    }
    const circle = result.circles.find(c => c.fate.kind === 'executed' && c.fate.event === pop);
    if (circle) {
        const [a, middle, b] = circle.arcs;
        const vertex = toPt(circle.centre);
        for (const key of [pairKey(a, middle), pairKey(middle, b)]) {
            finished.push({from: open.get(key) ?? null, to: vertex});
            open.delete(key);
        }
        open.set(pairKey(a, b), vertex);
    }
}

const circleDraw = (result: FortuneResult, k: number): CircleDraw => {
    const circle = result.circles[k];
    const centre = toPt(circle.centre);
    const radius = Math.sqrt(circle.r2.toNumber());
    return {id: circle.id, centre, radius, low: {x: centre.x, y: centre.y - radius}};
};

/** The drawing of step `step` (clamped) inside `box` (grid units, doubles from the exact box). */
export function fortuneView(
    result: FortuneResult, sites: readonly GridPoint[], step: number, box: RationalBox, origins: readonly Origins[],
): FortuneView {
    const steps = fortuneSteps(result);
    const at = Math.min(Math.max(Math.trunc(step), 0), steps.length - 1);
    const index = steps[at];
    const state = fortuneStateAt(result, sites, index);
    const done = result.trace[index].kind === 'done';
    const level = heightValue(state.height);
    const [minX, maxX, minY, maxY] = [box.minX.toNumber(), box.maxX.toNumber(), box.minY.toNumber(), box.maxY.toNumber()];
    const cap = maxY + (maxY - minY);

    const arcs: ArcDraw[] = [];
    const breakpoints: BreakpointDraw[] = [];
    if (level !== null && !done) {
        const beach = state.sweep.status;
        const bx: number[] = [];
        for (let m = 0; m + 1 < beach.length; m++) {
            const x = breakpointX(sites[state.beach[m]], sites[state.beach[m + 1]], level);
            bx.push(m > 0 ? Math.max(x, bx[m - 1]) : x);
        }
        beach.forEach((arc, m) => {
            const site = state.beach[m];
            const p = sites[site];
            const lo = Math.max(m === 0 ? -Infinity : bx[m - 1], minX);
            const hi = Math.min(m === beach.length - 1 ? Infinity : bx[m], maxX);
            const xs: number[] = [];
            const ys: number[] = [];
            if (p.y - level <= POINTED) {
                // A pointed arc: a vertical segment from the sweep line up to its neighbour's parabola.
                const neighbour = sites[state.beach[m > 0 ? m - 1 : m + 1] ?? site];
                if (p.x >= minX && p.x <= maxX) {
                    xs.push(p.x, p.x);
                    ys.push(level, Math.min(parabolaY(neighbour, level, p.x), cap));
                }
            } else if (hi > lo) {
                for (let i = 0; i < ARC_SAMPLES; i++) {
                    const x = lo + ((hi - lo) * i) / (ARC_SAMPLES - 1);
                    xs.push(x);
                    ys.push(Math.min(parabolaY(p, level, x), cap));
                }
            }
            arcs.push({arc, site, xs, ys});
        });
        const origin = origins[at];
        for (let m = 0; m + 1 < beach.length; m++) {
            const x = bx[m];
            const leftSite = sites[state.beach[m]];
            const y = leftSite.y - level <= POINTED ? parabolaY(sites[state.beach[m + 1]], level, x) : parabolaY(leftSite, level, x);
            breakpoints.push({
                left: beach[m], right: beach[m + 1], at: {x, y},
                from: origin.open.get(pairKey(beach[m], beach[m + 1])) ?? null,
            });
        }
    }
    const n = result.siteCount;
    const scheduled = state.sweep.queue.filter(e => e.id >= n && !done).map(e => circleDraw(result, e.id - n));
    const cancelled = done ? [] : result.circles
        .map((c, k) => ({c, k}))
        .filter(({c}) => c.fate.kind === 'cancelled' && c.fate.event >= 0 && c.fate.event <= index && c.scheduled <= index)
        .map(({k}) => circleDraw(result, k));
    return {
        step: at, index, state, done, level, lineY: level ?? maxY, arcs, breakpoints,
        finished: done ? [] : origins[at].finished,
        scheduled, cancelled,
        vertices: done ? [] : state.vertices.map(v => toPt(result.diagram.vertices[v].point)),
    };
}

/** The bounding box of the drawing: the sites and vertices (`frame`) united with every circle of the run, rounded outward. */
export function fortuneBox(result: FortuneResult, sites: readonly GridPoint[]): RationalBox {
    const base = frame(result.diagram, sites);
    let [minX, maxX, minY, maxY] = [base.minX, base.maxX, base.minY, base.maxY];
    const span = Math.max(maxX.sub(minX).toNumber(), maxY.sub(minY).toNumber());
    for (const circle of result.circles) {
        const centre = toPt(circle.centre);
        const radius = Math.sqrt(circle.r2.toNumber());
        // By design a huge circle (radius above three spans: nearly collinear sites) is left out: including it would flatten the rest of
        // the drawing. Such a circle is drawn clipped by the view, and the sweep line stays inside the box (its extent is the box's).
        if (radius > 3 * span) continue;
        // `frame` may end on a non-integer rational: compare as rationals, only the circle's own side is rounded to an integer.
        const [lowX, highX] = [Rational.fromInt(Math.floor(centre.x - radius)), Rational.fromInt(Math.ceil(centre.x + radius))];
        const [lowY, highY] = [Rational.fromInt(Math.floor(centre.y - radius)), Rational.fromInt(Math.ceil(centre.y + radius))];
        if (lowX.compare(minX) < 0) minX = lowX;
        if (highX.compare(maxX) > 0) maxX = highX;
        if (lowY.compare(minY) < 0) minY = lowY;
        if (highY.compare(maxY) > 0) maxY = highY;
    }
    return {minX, maxX, minY, maxY};
}
