import {getDemonstrationCatalog} from './demonstrations';
import type {DemonstrationId} from './demonstrations';

/** Demonstrations the homepage carousel may show; every id needs a preview asset. */
export const homeDemonstrationPool: readonly DemonstrationId[] = [
    'epicycles', 'fixed-point', 'accumulation', 'definite-integral', 'function-inverse',
    'complex-multiplication', 'decasteljau', 'subdivision', 'patch-tensor', 'patch-coons',
    'voronoi', 'fortune', 'inscribed-angle', 'linear-map', 'curve-comb',
    'prob-binomial-normal', 'interp-runge', 'euler-method',
];

export const homeDemonstrationCount = 6;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const other = Math.min(index, Math.floor(random() * (index + 1)));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

/**
 * Draws `count` ids in random order, no two from the same family. When fewer than `count`
 * families exist the remaining slots are filled from the unused ids without the family rule.
 */
export function drawHomeDemonstrationIds(
    random: () => number = Math.random,
    pool: readonly DemonstrationId[] = homeDemonstrationPool,
    count: number = homeDemonstrationCount,
): DemonstrationId[] {
    const familyOf = new Map(getDemonstrationCatalog().demonstrations.map(entry => [entry.id, entry.family]));
    const shuffled = shuffle(pool, random);
    const drawn: DemonstrationId[] = [];
    const families = new Set<string>();
    for (const id of shuffled) {
        if (drawn.length >= count) break;
        const family = familyOf.get(id);
        if (family !== undefined && families.has(family)) continue;
        if (family !== undefined) families.add(family);
        drawn.push(id);
    }
    for (const id of shuffled) {
        if (drawn.length >= count) break;
        if (!drawn.includes(id)) drawn.push(id);
    }
    return drawn;
}

let visitDraw: DemonstrationId[] | undefined;

/** The visit's six ids: drawn on first use per page load, then remembered across remounts. */
export function getVisitDemonstrationIds(): readonly DemonstrationId[] {
    visitDraw ??= drawHomeDemonstrationIds();
    return visitDraw;
}

/** Test-only: forget the visit's draw, or pin it to the given ids. */
export function resetVisitDemonstrationIds(ids?: readonly DemonstrationId[]) {
    visitDraw = ids ? [...ids] : undefined;
}
