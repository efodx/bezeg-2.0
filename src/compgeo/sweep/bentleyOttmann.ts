/**
 * Bentley-Ottmann segment-intersection kernel with a status array and a recorded trace (spec C2, dBCKO 2.1, ADR 0035).
 * Every decision is an exact sign test on grid or Rational values (`compareAtSweep`, `segmentIntersection`,
 * `compareEventPositions`); no tolerance and no floating point. Pure TypeScript.
 *
 * Choices:
 * - Collinear overlap is refused before any trace (`overlap` with the pair): the pair has no isolated point.
 * - A zero-length segment is a degenerate segment, not refused: it is an event point (upper = lower endpoint), is
 *   reported with every segment through it, and never enters the status (it has no extent below the line).
 * - Status changes at an event p: when only crossings pass through p (no segment starts or ends there) the contiguous
 *   block of segments through p is reversed by ONE `status-swap {first, last}` (two segments: a plain swap; three or
 *   more: the same event with a longer block). Otherwise the segments of L(p) and C(p) are `status-remove`d and those
 *   of U(p) and C(p) are `status-insert`ed in their order just below p.
 * - The status is a plain array: locating the segments through p scans it (O(n) per event) and says so; the
 *   O((n+k) log n) bound needs a balanced tree.
 * - Predicate counter: one per `compareAtSweep`, `segmentIntersection` and point-on-segment call made by the sweep
 *   (the up-front overlap check is not part of the trace).
 */
import {RationalPoint} from '../rational';
import {
    compareAtSweep,
    containsPoint,
    type IntersectionPoint,
    lowerEndpoint,
    type Segment,
    segmentIntersection,
    upperEndpoint,
} from './segments';
import {compareEventPositions} from './eventOrder';
import {checkSweepPoint, SWEEP_MAX_SEGMENTS, type SweepInputRefusal} from './limits';
import {type QueueEntry, sweepEventBuilder, type SweepEvent, type SweepKind, type SweepPayloads, type SweepTrace} from './sweepTrace';

/** Note keys of the Bentley-Ottmann trace. */
export type BentleyOttmannNote =
    | 'bo.schedule-endpoint' | 'bo.schedule-crossing' | 'bo.pop' | 'bo.report' | 'bo.swap' | 'bo.status-remove'
    | 'bo.status-insert' | 'bo.neighbour-test' | 'bo.done';
export type BentleyOttmannTrace = SweepTrace<IntersectionPoint, BentleyOttmannNote>;
const sweepEvent = sweepEventBuilder<IntersectionPoint, BentleyOttmannNote>();

/** Discrete outcome of a neighbour test: no contact; a contact after the event (new event scheduled, or already queued); or at/before it. */
export type NeighbourOutcome = 'none' | 'schedule' | 'queued' | 'passed';

export type BentleyOttmannRefusal =
    | { readonly reason: 'too-many-segments'; readonly count: number; readonly max: number }
    | { readonly reason: SweepInputRefusal; readonly segment: number; readonly end: 'a' | 'b' }
    | { readonly reason: 'overlap'; readonly pair: readonly [number, number] };

export type BentleyOttmannResult =
    | { readonly ok: true; readonly trace: BentleyOttmannTrace }
    | { readonly ok: false; readonly refusal: BentleyOttmannRefusal };

/** The first refusal reason, or null when the input may be swept. Overlap is reported as the first pair (i < j). */
export function checkBentleyOttmannInput(segments: readonly Segment[]): BentleyOttmannRefusal | null {
    if (segments.length > SWEEP_MAX_SEGMENTS) {
        return {reason: 'too-many-segments', count: segments.length, max: SWEEP_MAX_SEGMENTS};
    }
    for (let i = 0; i < segments.length; i++) {
        for (const end of ['a', 'b'] as const) {
            const check = checkSweepPoint(segments[i][end]);
            if (!check.ok) return {reason: check.reason, segment: i, end};
        }
    }
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            if (segmentIntersection(segments[i], segments[j]).kind === 'overlap') {
                return {reason: 'overlap', pair: [i, j]};
            }
        }
    }
    return null;
}

const keyOf = (p: RationalPoint): string => `${p.x.format()},${p.y.format()}`;

const sameGrid = (p: { x: number; y: number }, q: { x: number; y: number }): boolean => p.x === q.x && p.y === q.y;

/**
 * Runs the sweep and records the trace, or refuses the input. Object ids in the trace are segment indices; event ids
 * are distinct per position (each position is scheduled exactly once). Each `report` carries the point and the
 * ascending indices of every segment through it.
 */
export function bentleyOttmannTrace(segments: readonly Segment[]): BentleyOttmannResult {
    const refusal = checkBentleyOttmannInput(segments);
    if (refusal !== null) return {ok: false, refusal};

    const events: SweepEvent<IntersectionPoint, BentleyOttmannNote>[] = [];
    let predicates = 0;
    const emit = <K extends SweepKind>(kind: K, payload: SweepPayloads<IntersectionPoint>[K], noteKey: BentleyOttmannNote): void => {
        events.push(sweepEvent(kind, payload, predicates, noteKey));
    };

    const upper = segments.map(upperEndpoint);
    const lower = segments.map(lowerEndpoint);
    const isPoint = segments.map((s) => sameGrid(s.a, s.b));

    // Event queue: one entry per distinct position, ids in order of scheduling.
    const queue: QueueEntry[] = [];
    const known = new Map<string, number>();
    const schedule = (position: RationalPoint, noteKey: 'bo.schedule-endpoint' | 'bo.schedule-crossing'): void => {
        const entry: QueueEntry = {id: known.size, position};
        known.set(keyOf(position), entry.id);
        let at = queue.length;
        while (at > 0 && compareEventPositions(position, queue[at - 1].position) < 0) at--;
        queue.splice(at, 0, entry);
        emit('schedule', entry, noteKey);
    };
    const endpoints = new Map<string, RationalPoint>();
    for (const g of [...upper, ...lower]) endpoints.set(keyOf(RationalPoint.fromGrid(g)), RationalPoint.fromGrid(g));
    for (const p of [...endpoints.values()].sort(compareEventPositions)) schedule(p, 'bo.schedule-endpoint');

    const status: number[] = [];

    for (let entry = queue.shift(); entry !== undefined; entry = queue.shift()) {
        const p = entry.position;
        emit('pop', entry, 'bo.pop');

        // U(p), L(p), C(p). Segments through p other than these cannot exist (see header).
        const startsHere = segments.flatMap((_, i) => (RationalPoint.fromGrid(upper[i]).equals(p) ? [i] : []));
        const endsHere = segments.flatMap((_, i) => (RationalPoint.fromGrid(lower[i]).equals(p) ? [i] : []));
        const ending = status.filter((s) => endsHere.includes(s)); // L(p), in status order
        const crossing = status.filter((s) => {
            if (endsHere.includes(s)) return false;
            predicates++;
            return containsPoint(segments[s], p);
        }); // C(p), in status order
        const through = [...new Set([...startsHere, ...endsHere, ...crossing])].sort((a, b) => a - b);
        if (through.length > 1) emit('report', {item: {point: p, segments: through}}, 'bo.report');

        const entering = startsHere.filter((s) => !isPoint[s]);
        // A lone segment passing through p (a zero-length segment lies on it) keeps its place: no status change.
        const unchanged = entering.length === 0 && ending.length === 0 && crossing.length < 2;
        const removed = unchanged ? [] : status.filter((s) => ending.includes(s) || crossing.includes(s));
        const inserted = unchanged ? [] : [...entering, ...crossing];
        const swapOnly = entering.length === 0 && ending.length === 0 && crossing.length >= 2;
        const sweepCompare = (s: number, t: number): number => {
            predicates++;
            return compareAtSweep(segments[s], segments[t], p.y, p.x);
        };

        // Index range of the new block, or of the gap left by a pure removal.
        let first = 0;
        let count = 0;
        if (removed.length > 0) {
            const positions = removed.map((s) => status.indexOf(s));
            first = Math.min(...positions);
            if (Math.max(...positions) - first + 1 !== removed.length) {
                throw new Error('Bentley-Ottmann invariant broken: segments through the event point are not contiguous');
            }
        }
        if (swapOnly) {
            const last = first + removed.length - 1;
            emit('status-swap', {first, last}, 'bo.swap');
            status.splice(first, removed.length, ...status.slice(first, last + 1).reverse());
            count = removed.length;
        } else if (removed.length > 0 || inserted.length > 0) {
            for (const s of removed) {
                emit('status-remove', {id: s}, 'bo.status-remove');
                status.splice(status.indexOf(s), 1);
            }
            if (inserted.length > 0) {
                const ordered = [...inserted].sort(sweepCompare);
                // All new segments pass through p and no remaining one does, so they form one gap of the status.
                let lo = 0;
                let hi = status.length;
                while (lo < hi) {
                    const mid = (lo + hi) >> 1;
                    if (sweepCompare(ordered[0], status[mid]) < 0) hi = mid;
                    else lo = mid + 1;
                }
                first = lo;
                count = ordered.length;
                ordered.forEach((s, k) => {
                    emit('status-insert', {id: s, index: first + k}, 'bo.status-insert');
                    status.splice(first + k, 0, s);
                });
            }
        }

        // Only the new neighbour pairs: the block's two borders, or the pair that closes a gap.
        const pairs: [number, number][] = [];
        if (count > 0) {
            if (first > 0) pairs.push([status[first - 1], status[first]]);
            if (first + count < status.length) pairs.push([status[first + count - 1], status[first + count]]);
        } else if (first > 0 && first < status.length) {
            pairs.push([status[first - 1], status[first]]);
        }
        for (const [a, b] of pairs) {
            predicates++;
            const contact = segmentIntersection(segments[a], segments[b]);
            if (contact.kind === 'overlap') throw new Error('Bentley-Ottmann: overlap passed the input check');
            let outcome: NeighbourOutcome = 'none';
            let crossingPoint: RationalPoint | null = null;
            if (contact.kind === 'point') {
                if (compareEventPositions(p, contact.point) >= 0) outcome = 'passed';
                else if (known.has(keyOf(contact.point))) outcome = 'queued';
                else {
                    outcome = 'schedule';
                    crossingPoint = contact.point;
                }
            }
            emit('neighbour-test', {a, b, outcome}, 'bo.neighbour-test');
            if (crossingPoint !== null) schedule(crossingPoint, 'bo.schedule-crossing');
        }
    }
    emit('done', {}, 'bo.done');
    return {ok: true, trace: events};
}
