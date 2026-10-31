import {DIRECTION_TABLE} from "../../projective/conicPencil";
import {toAffine} from "../../projective/homogeneous";
import {
    isReachable, PASCAL_CONIC_IDS, PASCAL_CONICS, PASCAL_DEFAULT_INDICES, PASCAL_HANDLE_COUNT, PascalConicId, PascalModel, reachableIndices,
} from "./pascalModel";

/** A larger keyboard step (Shift): this many reachable positions at once. */
export const SHIFT_STEP = 5;

const edited = (model: PascalModel, change: Partial<Pick<PascalModel, "conic" | "indices" | "order">>): PascalModel =>
    ({example: "custom", conic: model.conic, indices: model.indices, order: model.order, ...change});

/** Puts handle `handle` at table index `index` when that position is reachable; otherwise returns the same object. */
export function setIndex(model: PascalModel, handle: number, index: number): PascalModel {
    if (!Number.isInteger(handle) || handle < 0 || handle >= PASCAL_HANDLE_COUNT) return model;
    if (index === model.indices[handle] || !isReachable(model.conic, handle, index)) return model;
    return edited(model, {indices: model.indices.map((v, i) => i === handle ? index : v)});
}

/**
 * Moves a handle `steps` reachable positions along the direction table (negative: back), wrapping around: directions are lines,
 * so the table is a circle. Directions whose second intersection is not a finite point in the view are skipped.
 */
export function stepHandle(model: PascalModel, handle: number, steps: number): PascalModel {
    if (!Number.isInteger(handle) || handle < 0 || handle >= PASCAL_HANDLE_COUNT || steps === 0) return model;
    const list = reachableIndices(model.conic, handle);
    if (list.length === 0) return model;
    const at = list.indexOf(model.indices[handle]);
    const target = at < 0 ? list[0] : list[(((at + steps) % list.length) + list.length) % list.length];
    return setIndex(model, handle, target);
}

/**
 * The reachable table index whose line direction through the handle's base point is nearest (in angle) to the pointer at
 * `to`. Undefined when the pointer is on the base point (no direction) or not finite.
 */
export function nearestIndex(model: PascalModel, handle: number, to: {x: number; y: number}): number | undefined {
    if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) return undefined;
    const base = toAffine(PASCAL_CONICS[model.conic].bases[handle]);
    if (base.kind !== "finite") return undefined;
    const dx = to.x - base.view.x;
    const dy = to.y - base.view.y;
    if (Math.hypot(dx, dy) < 1e-9) return undefined;
    const phi = ((Math.atan2(dy, dx) % Math.PI) + Math.PI) % Math.PI;
    let best: number | undefined;
    let bestGap = Infinity;
    for (const index of reachableIndices(model.conic, handle)) {
        const [p, q] = DIRECTION_TABLE[index];
        const gap = Math.abs(Math.atan2(q, p) - phi);
        const wrapped = Math.min(gap, Math.PI - gap);
        if (wrapped < bestGap) {
            bestGap = wrapped;
            best = index;
        }
    }
    return best;
}

/** Drag: snap the handle to the table direction nearest the pointer. */
export function dragHandle(model: PascalModel, handle: number, to: {x: number; y: number}): PascalModel {
    const index = nearestIndex(model, handle, to);
    return index === undefined ? model : setIndex(model, handle, index);
}

/** Switching the conic restarts the six handles at that conic's default positions; the hexagon order is kept. */
export function setConic(model: PascalModel, conic: PascalConicId): PascalModel {
    if (!PASCAL_CONIC_IDS.includes(conic) || conic === model.conic) return model;
    return edited(model, {conic, indices: PASCAL_DEFAULT_INDICES[conic]});
}

/** Replaces the hexagon order; an invalid permutation or the same order returns the same object. */
export function setOrder(model: PascalModel, order: readonly number[]): PascalModel {
    const valid = order.length === PASCAL_HANDLE_COUNT && [0, 1, 2, 3, 4, 5].every(h => order.filter(v => v === h).length === 1);
    if (!valid || order.every((v, i) => v === model.order[i])) return model;
    return edited(model, {order: [...order]});
}
