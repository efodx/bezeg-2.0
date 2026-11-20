import {ElderBranch} from './elderGeometry';

/** Axis-aligned box in generator units. */
export interface ElderBox {x: number; y: number; width: number; height: number}

const NUMBER = /-?\d*\.?\d+(?:e-?\d+)?/g;

/**
 * Bounds of every point a still elder draws, so a viewBox can hold the whole drawing instead of cutting it at
 * the generator box. Paths use absolute M/L/Q/C points (curve control points included, which can only widen the
 * box). The one relative command is the floret circle, `M(cx - r) cy a r r 0 1 0 2r 0 a ...`, covered as a circle.
 */
export function elderBounds(branches: ElderBranch[], pad = 0): ElderBox {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const take = (x: number, y: number) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    };
    const eat = (d: string) => {
        let last: [number, number] = [0, 0];
        for (const [, cmd, args] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
            const n = (args.match(NUMBER) ?? []).map(Number);
            if (cmd === 'a') {
                const r = n[0] ?? 0;
                take(last[0], last[1] - r);
                take(last[0] + 2 * r, last[1] + r);
            } else if (cmd === 'M' || cmd === 'L' || cmd === 'Q' || cmd === 'C') {
                for (let i = 0; i + 1 < n.length; i += 2) take(n[i], n[i + 1]);
                if (n.length >= 2) last = [n[n.length - 2], n[n.length - 1]];
            }
        }
    };
    for (const b of branches) {
        b.paths.forEach((p) => eat(p.d));
        for (const h of b.heads) {
            h.paths.forEach((p) => eat(p.d));
            h.subsets.forEach((s) => s.paths.forEach((p) => eat(p.d)));
        }
    }
    return {x: minX - pad, y: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad};
}
