/**
 * The run behind the Fortune graph (task sweep-algorithms/23): the exact kernel outcome for the current sites, its steps,
 * the trace origins for the drawing, and the plain-data note of each step. Pure; derived from the sites and never stored.
 */
import type {GridPoint} from '../../compgeo/grid';
import {Rational} from '../../compgeo/rational';
import {fortuneTrace, type FortuneOutcome, type FortuneRefused, type FortuneResult, type SweepHeight} from '../../compgeo/sweep/fortune';
import type {RationalBox} from '../../compgeo/voronoi';
import {fortuneBox, fortuneSteps, fortuneView, isKind, traceOrigins, type FortuneView} from './fortuneGeometry';

/** Site names A, B, C, ... (at most 12 sites). */
export const siteName = (index: number): string => String.fromCharCode(65 + index);
export const siteNames = (indices: readonly number[]): string => indices.map(siteName).join(', ');

export type FortuneNote =
    | {readonly kind: 'queued'}
    | {readonly kind: 'site'; readonly site: number; readonly hit: boolean; readonly cancelled: readonly (readonly number[])[]}
    | {readonly kind: 'circle'; readonly sites: readonly number[]; readonly cancelled: readonly (readonly number[])[]}
    | {readonly kind: 'done'};

export interface FortuneRun {
    readonly sites: readonly GridPoint[];
    readonly outcome: FortuneOutcome;
    readonly result?: FortuneResult;
    readonly refusal?: FortuneRefused;
    /** Number of steps (0 when refused). */
    readonly length: number;
    readonly box?: RationalBox;
    clamp(step: number): number;
    view(step: number, box?: RationalBox): FortuneView | undefined;
    note(step: number): FortuneNote | undefined;
}

export function runFortune(sites: readonly GridPoint[]): FortuneRun {
    const outcome = fortuneTrace(sites);
    if (!outcome.ok) {
        return {
            sites, outcome, refusal: outcome, length: 0,
            clamp: () => 0, view: () => undefined, note: () => undefined,
        };
    }
    const steps = fortuneSteps(outcome);
    const origins = traceOrigins(outcome, sites);
    const box = fortuneBox(outcome, sites);
    const clamp = (step: number): number => Math.min(Math.max(Math.trunc(Number.isFinite(step) ? step : 0), 0), steps.length - 1);
    const cancelledIn = (from: number, to: number): number[][] => {
        const found: number[][] = [];
        for (let k = from; k <= to; k++) {
            const event = outcome.trace[k];
            if (isKind(event, 'cancel')) found.push([...outcome.circles[event.payload.id - outcome.siteCount].sites]);
        }
        return found;
    };
    return {
        sites, outcome, result: outcome, length: steps.length, box, clamp,
        view: (step, within) => fortuneView(outcome, sites, clamp(step), within ?? box, origins),
        note: (step): FortuneNote => {
            const at = clamp(step);
            const last = steps[at];
            if (outcome.trace[last].kind === 'done') return {kind: 'done'};
            if (at === 0) return {kind: 'queued'};
            const pop = steps[at - 1] + 1;
            const cancelled = cancelledIn(pop, last);
            const siteEvent = outcome.siteEvents.find(e => e.event === pop);
            if (siteEvent) return {kind: 'site', site: siteEvent.site, hit: siteEvent.hit !== null, cancelled};
            const circle = outcome.circles.find(c => c.fate.kind === 'executed' && c.fate.event === pop);
            return {kind: 'circle', sites: circle ? [...circle.sites] : [], cancelled};
        },
    };
}

/** True when `r` is a perfect rational square, with its root (for a height that is rational after all). */
export function squareRoot(num: bigint, den: bigint): {num: bigint; den: bigint} | undefined {
    const root = (v: bigint): bigint | undefined => {
        if (v < 0n) return undefined;
        let x = BigInt(Math.floor(Math.sqrt(Number(v))));
        while (x * x > v) x -= 1n;
        while ((x + 1n) * (x + 1n) <= v) x += 1n;
        return x * x === v ? x : undefined;
    };
    const [n, d] = [root(num), root(den)];
    return n === undefined || d === undefined ? undefined : {num: n, den: d};
}

export type HeightText = {readonly kind: 'rational' | 'surd'; readonly latex: string; readonly value: number};

const fractionLatex = (num: bigint, den: bigint): string => {
    const sign = num < 0n ? '-' : '';
    const abs = num < 0n ? -num : num;
    return den === 1n ? `${sign}${abs}` : `${sign}\\tfrac{${abs}}{${den}}`;
};

/** The exact sweep height as undelimited LaTeX (a rational, or `q-\sqrt{r}`) and its double value. */
export function heightText(height: SweepHeight): HeightText {
    if (height.kind === 'rational') {
        return {kind: 'rational', latex: fractionLatex(height.value.num, height.value.den), value: height.value.toNumber()};
    }
    const value = height.q.toNumber() - Math.sqrt(height.r.toNumber());
    const root = squareRoot(height.r.num, height.r.den);
    if (root) {
        const exact = height.q.sub(Rational.fromBigInt(root.num, root.den));
        return {kind: 'rational', latex: fractionLatex(exact.num, exact.den), value: exact.toNumber()};
    }
    return {kind: 'surd', latex: `${fractionLatex(height.q.num, height.q.den)}-\\sqrt{${fractionLatex(height.r.num, height.r.den)}}`, value};
}
