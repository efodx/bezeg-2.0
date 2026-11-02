import {FIVE_POINT_COUNT, FIVE_POINT_DENOMINATOR, FIVE_POINT_NUMERATOR_LIMIT, FIVE_POINT_STEP, FivePointModel} from "./fivePointModel";
import {ProjectiveGridPoint} from "./projectiveValidation";

const clamp = (value: number): number => Math.max(-FIVE_POINT_NUMERATOR_LIMIT, Math.min(FIVE_POINT_NUMERATOR_LIMIT, value));
const validIndex = (index: number): boolean => Number.isInteger(index) && index >= 0 && index < FIVE_POINT_COUNT;

/** Moves point `index` to the 1/5 grid point nearest to the board position `to` (coordinates in board units). */
export function movePoint(model: FivePointModel, index: number, to: {x: number; y: number}): FivePointModel {
    if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) return model;
    const per = FIVE_POINT_DENOMINATOR / FIVE_POINT_STEP;
    return setNumerators(model, index, {x: Math.round(to.x * per) * FIVE_POINT_STEP, y: Math.round(to.y * per) * FIVE_POINT_STEP});
}

/** Places point `index` by its numerators over 15 (clamped). Returns the same object when nothing changes. */
export function setNumerators(model: FivePointModel, index: number, to: ProjectiveGridPoint): FivePointModel {
    if (!validIndex(index)) return model;
    const next = {x: clamp(to.x), y: clamp(to.y)};
    const old = model.points[index];
    if (next.x === old.x && next.y === old.y) return model;
    return {...model, example: "custom", points: model.points.map((p, i) => i === index ? next : p)};
}

/** Keyboard stepping: `dx`, `dy` are counts of 1/5 steps (three numerators each). */
export function nudgePoint(model: FivePointModel, index: number, dx: number, dy: number): FivePointModel {
    if (!validIndex(index)) return model;
    const old = model.points[index];
    return setNumerators(model, index, {x: old.x + dx * FIVE_POINT_STEP, y: old.y + dy * FIVE_POINT_STEP});
}

const firstOther = (a: number, b: number): number => [0, 1, 2, 3, 4].find(i => i !== a && i !== b) as number;

/** Chooses an arc end. Picking the other end's point swaps the two; the third point moves off a point that became an end. */
export function setEnd(model: FivePointModel, which: "a" | "b", index: number): FivePointModel {
    if (!validIndex(index) || model[which] === index) return model;
    const other = which === "a" ? model.b : model.a;
    const next = index === other ? {a: model.b, b: model.a, t: model.t} : {a: model.a, b: model.b, t: model.t, [which]: index};
    const t = next.t === next.a || next.t === next.b ? firstOther(next.a, next.b) : next.t;
    return {...model, example: "custom", a: next.a, b: next.b, t};
}

/** Chooses the third point (not an end). */
export function setThird(model: FivePointModel, index: number): FivePointModel {
    if (!validIndex(index) || index === model.t || index === model.a || index === model.b) return model;
    return {...model, example: "custom", t: index};
}
