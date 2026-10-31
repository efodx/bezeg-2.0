import {message} from "../../localization";
import {isRecord} from "../base/presets/PresetCollection";
import {classify, Conic, ConicType, conic} from "../../projective/conic";
import {DIRECTION_TABLE, DIRECTION_TABLE_SIZE, Direction, secondIntersection} from "../../projective/conicPencil";
import {AffineResult, Hom, hom, isZero, join, normalize, toAffine} from "../../projective/homogeneous";
import {pascal, PascalResult} from "../../projective/pascal";
import {accept, ProjectiveCheck, refuse} from "./projectiveValidation";

/**
 * The state of the Pascal and Pappus graph (K2, spec projective-conics-lessons, ADR 0033 section 2). The conic is one of four fixed
 * integer conics. Each of the six handles is the second intersection of the conic with the line through a fixed base point Q0 of
 * the conic in a direction taken from `DIRECTION_TABLE`; the model stores only the table index, so every point is rational and the
 * whole construction is decided exactly in bigint. The hexagon visits the handles in `order`, a permutation of 0..5. Doubles are
 * used for drawing only.
 */
export const PASCAL_CONIC_IDS = ["ellipse", "parabola", "hyperbola", "linePair"] as const;
export type PascalConicId = typeof PASCAL_CONIC_IDS[number];
export const PASCAL_EXAMPLE_IDS = ["default", "pappus", "infinity", "custom"] as const;
export type PascalExampleId = typeof PASCAL_EXAMPLE_IDS[number];
export const PASCAL_HANDLE_COUNT = 6;

/** The view box `[left, top, right, bottom]`. Handles only reach points inside it (with a small margin), so a handle is never lost. */
export const PASCAL_VIEW_BOX = [-12, 10.5, 12, -10.5] as const;
const REACH_X = 11.8;
const REACH_Y = 10.3;

export interface PascalModel {
    readonly example: PascalExampleId;
    readonly conic: PascalConicId;
    /** Per handle, an index into `DIRECTION_TABLE`. */
    readonly indices: readonly number[];
    /** The hexagon visits handle `order[0]`, `order[1]`, ... A permutation of 0..5. */
    readonly order: readonly number[];
}

interface ConicDefinition {
    readonly conic: Conic;
    /** The base point Q0 of each handle (a point of the conic). */
    readonly bases: readonly Hom[];
    readonly names: readonly string[];
}

const SMOOTH_NAMES = ["A", "B", "C", "D", "E", "F"] as const;
const PAIR_NAMES = ["A₁", "A₂", "A₃", "B₁", "B₂", "B₃"] as const;
const same = (base: Hom): Hom[] => [base, base, base, base, base, base];

/**
 * `A x^2 + B xy + C y^2 + D x + E y + F`:
 * ellipse 9x^2 + 25y^2 = 225 from Q0 = (-5, 0); parabola x^2 = 4y from the vertex (0, 0);
 * hyperbola 9x^2 - 16y^2 = 144 from the vertex (4, 0); line pair y(y - 3) = 0, the lines y = 0 (the A points) and y = 3 (the B points).
 * On the line pair a base on one line sends every second intersection to the other, so the A points are cast from (0, 3), the B
 * points from (0, 0).
 */
export const PASCAL_CONICS: Readonly<Record<PascalConicId, ConicDefinition>> = {
    ellipse: {conic: conic(9, 0, 25, 0, 0, -225), bases: same(hom(-5, 0, 1)), names: SMOOTH_NAMES},
    parabola: {conic: conic(1, 0, 0, 0, -4, 0), bases: same(hom(0, 0, 1)), names: SMOOTH_NAMES},
    hyperbola: {conic: conic(9, 0, -16, 0, 0, -144), bases: same(hom(4, 0, 1)), names: SMOOTH_NAMES},
    linePair: {
        conic: conic(0, 0, 1, 0, -3, 0),
        bases: [hom(0, 3, 1), hom(0, 3, 1), hom(0, 3, 1), hom(0, 0, 1), hom(0, 0, 1), hom(0, 0, 1)],
        names: PAIR_NAMES,
    },
};

export const handleNames = (id: PascalConicId): readonly string[] => PASCAL_CONICS[id].names;

/** The table index of the line direction of `(p, q)` (either sign). Throws for a direction outside the table. */
export function directionIndex(p: number, q: number): number {
    const flip = q < 0 || (q === 0 && p < 0);
    const [dp, dq] = flip ? [-p, -q] : [p, q];
    const index = DIRECTION_TABLE.findIndex(([tp, tq]) => tp === dp && tq === dq);
    if (index < 0) throw new RangeError(`direction (${p}, ${q}) is not in the direction table`);
    return index;
}

const indicesOf = (...directions: readonly Direction[]): number[] => directions.map(([p, q]) => directionIndex(p, q));

/** Default handle positions per conic: finite, distinct, inside the view box. */
export const PASCAL_DEFAULT_INDICES: Readonly<Record<PascalConicId, readonly number[]>> = {
    // t = 0, 1/2, 1, 2, -1, -1/3 of the spec: (5,0) (3,12/5) (0,3) (-3,12/5) (0,-3) (4,-9/5)
    ellipse: indicesOf([1, 0], [10, 3], [5, 3], [5, 6], [-5, 3], [-5, 1]),
    // (-4,4) (-2,1) (-1,1/4) (1,1/4) (2,1) (4,4)
    parabola: indicesOf([-1, 1], [-2, 1], [-4, 1], [4, 1], [2, 1], [1, 1]),
    // (20/3,4) (4,0) (20/3,-4) (-5,-9/4) (-5,9/4) (-5.97,3.32)
    hyperbola: indicesOf([2, 3], [0, 1], [-2, 3], [4, 1], [-4, 1], [-3, 1]),
    // A = (0,0) (2,0) (5,0), B = (1,3) (4,3) (6,3)
    linePair: indicesOf([0, 1], [-2, 3], [-5, 3], [1, 3], [4, 3], [2, 1]),
};

/** Hexagon orders. `pappus` is A1 B2 A3 B1 A2 B3; it is a self-crossing order on a smooth conic too. */
export const PASCAL_ORDER_IDS = ["natural", "pappus", "star"] as const;
export type PascalOrderId = typeof PASCAL_ORDER_IDS[number];
export const PASCAL_ORDERS: Readonly<Record<PascalOrderId, readonly number[]>> = {
    natural: [0, 1, 2, 3, 4, 5],
    pappus: [0, 4, 2, 3, 1, 5],
    star: [0, 2, 4, 1, 3, 5],
};

export const PASCAL_EXAMPLES: Readonly<Record<PascalExampleId, PascalModel>> = {
    default: {example: "default", conic: "ellipse", indices: PASCAL_DEFAULT_INDICES.ellipse, order: PASCAL_ORDERS.natural},
    pappus: {example: "pappus", conic: "linePair", indices: PASCAL_DEFAULT_INDICES.linePair, order: PASCAL_ORDERS.pappus},
    // A = (0,0) (1,0) (6,0), B = (4,3) (3,3) (8,3)
    infinity: {
        example: "infinity", conic: "linePair", order: PASCAL_ORDERS.pappus,
        indices: indicesOf([0, 1], [-1, 3], [-2, 1], [4, 3], [1, 1], [8, 3]),
    },
    custom: {example: "custom", conic: "ellipse", indices: PASCAL_DEFAULT_INDICES.ellipse, order: PASCAL_ORDERS.natural},
};

export const DEFAULT_PASCAL_MODEL: PascalModel = PASCAL_EXAMPLES.default;

const sameList = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

/** Whether a model still has exactly the values of its named example (`custom` never matches). */
export const matchesExample = (model: PascalModel): boolean => {
    const named = PASCAL_EXAMPLES[model.example];
    return model.example !== "custom" && model.conic === named.conic && sameList(model.indices, named.indices) && sameList(model.order, named.order);
};

export const orderIdOf = (order: readonly number[]): PascalOrderId | undefined => PASCAL_ORDER_IDS.find(id => sameList(PASCAL_ORDERS[id], order));

export const serializePascalModel = (model: PascalModel): PascalModel => ({
    example: model.example, conic: model.conic, indices: [...model.indices], order: [...model.order],
});

// ---- Handle positions ----------------------------------------------------------------------------------------------

/** The second intersection for a table index, when it is a finite point (the tangent case gives the base point itself). */
export function handlePoint(id: PascalConicId, handle: number, index: number): Hom | undefined {
    const def = PASCAL_CONICS[id];
    const result = secondIntersection(def.conic, def.bases[handle], DIRECTION_TABLE[index]);
    if (result.status === "ok") return result.ideal ? undefined : normalize(result.point);
    if (result.status === "tangent") return normalize(result.point);
    return undefined;
}

const cache = new Map<string, readonly number[]>();

const inReach = (p: Hom): boolean => {
    const view = toAffine(p);
    return view.kind === "finite" && Math.abs(view.view.x) <= REACH_X && Math.abs(view.view.y) <= REACH_Y;
};

/** The table indices a handle can take: a finite point inside the view box. Ascending. */
export function reachableIndices(id: PascalConicId, handle: number): readonly number[] {
    const key = `${id}:${handle}`;
    let list = cache.get(key);
    if (list === undefined) {
        const found: number[] = [];
        for (let i = 0; i < DIRECTION_TABLE_SIZE; i++) {
            const p = handlePoint(id, handle, i);
            if (p !== undefined && inReach(p)) found.push(i);
        }
        list = found;
        cache.set(key, list);
    }
    return list;
}

export const isReachable = (id: PascalConicId, handle: number, index: number): boolean =>
    Number.isInteger(index) && index >= 0 && index < DIRECTION_TABLE_SIZE && reachableIndices(id, handle).includes(index);

// ---- Import --------------------------------------------------------------------------------------------------------

/** Checks imported data field by field; the refusal names the field and the repair. */
export function parsePascalModel(data: unknown): ProjectiveCheck<PascalModel> {
    if (!isRecord(data)) return refuse(message("projective_invalid_not_an_object"));
    const example = PASCAL_EXAMPLE_IDS.find(id => id === data.example);
    if (example === undefined) return refuse(message("projective_invalid_unknown_example", {value0: PASCAL_EXAMPLE_IDS.join(", ")}));
    const conicId = PASCAL_CONIC_IDS.find(id => id === data.conic);
    if (conicId === undefined) return refuse(message("projective_invalid_unknown_conic", {value0: PASCAL_CONIC_IDS.join(", ")}));
    if (!Array.isArray(data.indices) || data.indices.length !== PASCAL_HANDLE_COUNT) return refuse(message("projective_invalid_field_missing", {value0: "indices"}));
    const indices: number[] = [];
    for (let handle = 0; handle < PASCAL_HANDLE_COUNT; handle++) {
        const value: unknown = data.indices[handle];
        const field = `indices[${handle}]`;
        if (typeof value !== "number" || !Number.isInteger(value)) return refuse(message("projective_invalid_non_integer", {value0: field}));
        if (value < 0 || value >= DIRECTION_TABLE_SIZE) return refuse(message("projective_k2_invalid_index_range", {value0: field, value1: DIRECTION_TABLE_SIZE - 1}));
        if (!isReachable(conicId, handle, value)) return refuse(message("projective_k2_invalid_unreachable", {value0: field}));
        indices.push(value);
    }
    if (!Array.isArray(data.order) || data.order.length !== PASCAL_HANDLE_COUNT) return refuse(message("projective_invalid_field_missing", {value0: "order"}));
    const order: number[] = data.order.map((v: unknown) => typeof v === "number" ? v : NaN);
    const isPermutation = [0, 1, 2, 3, 4, 5].every(handle => order.filter(v => v === handle).length === 1);
    if (!isPermutation) return refuse(message("projective_k2_invalid_order"));
    const model = serializePascalModel({example, conic: conicId, indices, order});
    // A named example whose values were edited is a custom set-up, so the example buttons never claim a wrong state.
    return accept(example === "custom" || matchesExample(model) ? model : {...model, example: "custom"});
}

// ---- Exact scene ---------------------------------------------------------------------------------------------------

export interface PascalPointView {
    readonly point: Hom;
    readonly view: AffineResult;
    /** A finite point outside the view box: listed in the text, not drawn. */
    readonly offBox: boolean;
}

export interface PascalScene {
    readonly conic: Conic;
    readonly type: ConicType;
    readonly conicId: PascalConicId;
    readonly names: readonly string[];
    /** The six handle points by handle number. */
    readonly handles: readonly Hom[];
    readonly order: readonly number[];
    /** The hexagon vertices in order. */
    readonly hexagon: readonly Hom[];
    /** Side `i` joins vertex `i` and `i + 1`; undefined when they coincide. */
    readonly sides: readonly (Hom | undefined)[];
    readonly result: PascalResult;
    /** The three Pascal points when the result is ok. */
    readonly pascalPoints: readonly PascalPointView[];
}

/** True for the line at infinity `[0, 0, c]`: it has no finite equation and is never drawn. */
export const isLineAtInfinity = (line: Hom): boolean => line[0] === 0n && line[1] === 0n;

export function pointInBox(view: AffineResult): boolean {
    return view.kind === "finite" && view.view.x >= PASCAL_VIEW_BOX[0] && view.view.x <= PASCAL_VIEW_BOX[2]
        && view.view.y >= PASCAL_VIEW_BOX[3] && view.view.y <= PASCAL_VIEW_BOX[1];
}

/** The handle's point; an index that is not a finite point (never produced by an edit or a checked import) falls back to the base point. */
export const handleOf = (model: PascalModel, handle: number): Hom =>
    handlePoint(model.conic, handle, model.indices[handle]) ?? PASCAL_CONICS[model.conic].bases[handle];

export function evaluatePascal(model: PascalModel): PascalScene {
    const def = PASCAL_CONICS[model.conic];
    const handles = model.indices.map((_, handle) => handleOf(model, handle));
    const hexagon = model.order.map(handle => handles[handle]);
    const sides = hexagon.map((p, i) => {
        const side = join(p, hexagon[(i + 1) % hexagon.length]);
        return isZero(side) ? undefined : side;
    });
    const result = pascal(hexagon);
    const pascalPoints = result.status === "ok"
        ? result.points.map(point => {
            const view = toAffine(point);
            return {point, view, offBox: view.kind === "finite" && !pointInBox(view)};
        })
        : [];
    return {conic: def.conic, type: classify(def.conic), conicId: model.conic, names: def.names, handles, order: model.order, hexagon, sides, result, pascalPoints};
}
