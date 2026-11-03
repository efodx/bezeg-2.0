import {
    CONIC_DEFAULT_MAX_RADIUS, circleConic, classifyEccentricity, classifyMiddleWeight, Conic, conicFromFocusDirectrix, conicMetrics, ConicKind,
    directrixDistance, focalDistance, focusDirectrixRatio, matchedConicArc, maxConicDeviation, sampleConic, sampleRationalQuadratic, Vec2,
} from './conic';

/*
 * The model of the conic focal view (lesson S6): which conic (focus F on the x-axis, the side of the directrix, the semi-latus
 * rectum l and the numerical eccentricity e), where the point P sits on it and the Bezier bridge. It owns the validity rules, the
 * edit setters and the numbers every part of the display is derived from; localization stays outside
 * (`graphs/functions/conicFocalMessages`).
 *
 * Parametrization: the directrix lies at distance l/e from F on the side `direction`, so e -> 0 leaves the circle of radius l
 * around F without a directrix, and the polar form is r = l / (1 + e cos(phi)) with phi measured from the direction towards the
 * directrix. P is stored as that polar angle phi, valid for every conic; the point actually shown is the nearest one the picture can
 * hold (see `conicPointAt`), so changing e never invalidates a stored P.
 */

export const CONIC_ELL_MIN = 0.5;
export const CONIC_ELL_MAX = 6;
/** e reaches exactly 0 (circle) and 1 (parabola) by slider steps. */
export const CONIC_EPSILON_MIN = 0;
export const CONIC_EPSILON_MAX = 2.5;
export const CONIC_FOCUS_MIN = -8;
export const CONIC_FOCUS_MAX = 8;
export const CONIC_PHI_MIN = -Math.PI;
export const CONIC_PHI_MAX = Math.PI;
export const CONIC_WEIGHT_MIN = 0.1;
export const CONIC_WEIGHT_MAX = 5;
/** Unbounded branches are cut, and P stays, where the distance from F reaches this radius. */
export const CONIC_VIEW_RADIUS = CONIC_DEFAULT_MAX_RADIUS;
export const CONIC_SAMPLES = 240;

/** `weight` is the middle weight the user chose, or null for the matched weight of the conic. */
export interface ConicFocalModel {
    readonly focusX: number;
    /** Which side of F the directrix lies on: 1 right, -1 left. */
    readonly direction: 1 | -1;
    readonly ell: number;
    readonly epsilon: number;
    readonly phi: number;
    readonly bridge: boolean;
    readonly weight: number | null;
}

export const CONIC_EXAMPLE_IDS = ['ellipse', 'parabola', 'hyperbola', 'circle', 'bridge'] as const;
export type ConicExampleId = typeof CONIC_EXAMPLE_IDS[number];

/** The spec examples; each P is the spec point: (0, 3), (1, 2), (6, sqrt 48) and a point of the circle. */
export const CONIC_EXAMPLE_MODELS: Readonly<Record<ConicExampleId, ConicFocalModel>> = {
    ellipse: {focusX: 4, direction: 1, ell: 1.8, epsilon: 0.8, phi: Math.PI - Math.atan2(3, 4), bridge: false, weight: null},
    parabola: {focusX: 1, direction: -1, ell: 2, epsilon: 1, phi: -Math.PI / 2, bridge: false, weight: null},
    hyperbola: {focusX: 5, direction: -1, ell: 16 / 3, epsilon: 5 / 3, phi: -(Math.PI - Math.acos(1 / 7)), bridge: false, weight: null},
    circle: {focusX: 0, direction: 1, ell: 3, epsilon: 0, phi: Math.PI / 3, bridge: false, weight: null},
    bridge: {focusX: 4, direction: 1, ell: 1.8, epsilon: 0.8, phi: Math.PI - Math.atan2(3, 4), bridge: true, weight: null},
};

export const isConicExampleId = (value: unknown): value is ConicExampleId =>
    typeof value === 'string' && (CONIC_EXAMPLE_IDS as readonly string[]).includes(value);

export const defaultConicFocalModel = (example: ConicExampleId = 'ellipse'): ConicFocalModel => ({...CONIC_EXAMPLE_MODELS[example]});

/** The example the model equals in its conic (focus, side, l, e) and bridge setting, or undefined for a custom conic. */
export function conicExampleOf(model: ConicFocalModel): ConicExampleId | undefined {
    return CONIC_EXAMPLE_IDS.find(id => {
        const example = CONIC_EXAMPLE_MODELS[id];
        return example.focusX === model.focusX && example.direction === model.direction && example.ell === model.ell &&
            example.epsilon === model.epsilon && example.bridge === model.bridge;
    });
}

/** The rule a rejected value broke; the ranges travel with it. */
export type ConicIssue =
    | {readonly kind: 'focusX' | 'ell' | 'epsilon' | 'phi' | 'weight'; readonly min: number; readonly max: number}
    | {readonly kind: 'direction'}
    | {readonly kind: 'bridge'}
    | {readonly kind: 'example'; readonly allowed: readonly ConicExampleId[]};

export type ConicFileIssue = ConicIssue | {readonly kind: 'object'};

export type ConicCheck =
    | {readonly ok: true; readonly model: ConicFocalModel}
    | {readonly ok: false; readonly issue: ConicFileIssue};

export type ConicEdit =
    | {readonly ok: true; readonly model: ConicFocalModel}
    | {readonly ok: false; readonly issue: ConicIssue};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const inRange = (value: unknown, min: number, max: number): value is number => isFiniteNumber(value) && value >= min && value <= max;

const issues = {
    focusX: {kind: 'focusX', min: CONIC_FOCUS_MIN, max: CONIC_FOCUS_MAX},
    ell: {kind: 'ell', min: CONIC_ELL_MIN, max: CONIC_ELL_MAX},
    epsilon: {kind: 'epsilon', min: CONIC_EPSILON_MIN, max: CONIC_EPSILON_MAX},
    phi: {kind: 'phi', min: CONIC_PHI_MIN, max: CONIC_PHI_MAX},
    weight: {kind: 'weight', min: CONIC_WEIGHT_MIN, max: CONIC_WEIGHT_MAX},
} as const satisfies Record<string, ConicIssue>;

/**
 * The single validity rule of a stored model: finite numbers in range (focusX -8..8, l 0.5..6, e 0..2.5, phi -pi..pi, weight null
 * or 0.1..5), direction 1 or -1, bridge a boolean. Nothing is clamped; unknown properties are dropped. A rejection names its field.
 */
export function checkConicFocalModel(data: unknown): ConicCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return {ok: false, issue: {kind: 'object'}};
    const {focusX, direction, ell, epsilon, phi, bridge, weight} = data as Record<string, unknown>;
    if (!inRange(focusX, CONIC_FOCUS_MIN, CONIC_FOCUS_MAX)) return {ok: false, issue: issues.focusX};
    if (direction !== 1 && direction !== -1) return {ok: false, issue: {kind: 'direction'}};
    if (!inRange(ell, CONIC_ELL_MIN, CONIC_ELL_MAX)) return {ok: false, issue: issues.ell};
    if (!inRange(epsilon, CONIC_EPSILON_MIN, CONIC_EPSILON_MAX)) return {ok: false, issue: issues.epsilon};
    if (!inRange(phi, CONIC_PHI_MIN, CONIC_PHI_MAX)) return {ok: false, issue: issues.phi};
    if (typeof bridge !== 'boolean') return {ok: false, issue: {kind: 'bridge'}};
    if (weight !== null && !inRange(weight, CONIC_WEIGHT_MIN, CONIC_WEIGHT_MAX)) return {ok: false, issue: issues.weight};
    return {ok: true, model: {focusX, direction, ell, epsilon, phi, bridge, weight}};
}

export function parseConicFocalModel(data: unknown): ConicFocalModel | undefined {
    const check = checkConicFocalModel(data);
    return check.ok ? check.model : undefined;
}

export function chooseConicExample(example: unknown): ConicEdit {
    if (!isConicExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: CONIC_EXAMPLE_IDS}};
    return {ok: true, model: defaultConicFocalModel(example)};
}

const edit = (model: ConicFocalModel, next: Partial<ConicFocalModel>): ConicEdit => {
    const changed = (Object.keys(next) as (keyof ConicFocalModel)[]).some(key => next[key] !== model[key]);
    return {ok: true, model: changed ? {...model, ...next} : model};
};

/**
 * A committed e, l or weight is rounded to 1e-12 (as S5 does with q): an accumulated slider step such as 1.0000000000000002 or
 * 4.163336342344337e-17 is stored as the exact 1 (the parabola) or 0 (the circle). The range is checked on the rounded value.
 */
const commitRounded = (value: unknown): unknown => isFiniteNumber(value) ? Math.round(value * 1e12) / 1e12 + 0 : value;

export const setConicEpsilon = (model: ConicFocalModel, value: unknown): ConicEdit => {
    const rounded = commitRounded(value);
    return inRange(rounded, CONIC_EPSILON_MIN, CONIC_EPSILON_MAX) ? edit(model, {epsilon: rounded}) : {ok: false, issue: issues.epsilon};
};
export const setConicEll = (model: ConicFocalModel, value: unknown): ConicEdit => {
    const rounded = commitRounded(value);
    return inRange(rounded, CONIC_ELL_MIN, CONIC_ELL_MAX) ? edit(model, {ell: rounded}) : {ok: false, issue: issues.ell};
};
export const setConicPhi = (model: ConicFocalModel, value: unknown): ConicEdit =>
    inRange(value, CONIC_PHI_MIN, CONIC_PHI_MAX) ? edit(model, {phi: value}) : {ok: false, issue: issues.phi};
/** A weight of null returns to the matched weight. */
export const setConicWeight = (model: ConicFocalModel, value: unknown): ConicEdit => {
    if (value === null) return edit(model, {weight: null});
    const rounded = commitRounded(value);
    return inRange(rounded, CONIC_WEIGHT_MIN, CONIC_WEIGHT_MAX) ? edit(model, {weight: rounded}) : {ok: false, issue: issues.weight};
};
export const setConicBridge = (model: ConicFocalModel, value: unknown): ConicEdit =>
    typeof value === 'boolean' ? edit(model, {bridge: value}) : {ok: false, issue: {kind: 'bridge'}};

/** The conic the model describes, drawn from its definition (circle for e = 0, no directrix). */
export function conicOfModel(model: ConicFocalModel): Conic {
    const focus: Vec2 = {x: model.focusX, y: 0};
    if (model.epsilon === 0) return circleConic(focus, model.ell);
    const distance = model.ell / model.epsilon;
    return conicFromFocusDirectrix(focus, {nx: model.direction, ny: 0, d: model.direction * model.focusX + distance}, model.epsilon);
}

/**
 * The point of the conic at polar angle phi from F, moved to the nearest angle the picture holds: an unbounded branch is cut where
 * the distance from F reaches `maxRadius` (the same cut `sampleConic` makes), and no point lies in the gap between the branches.
 * Returns the angle actually used and the point.
 */
export function conicPointAt(conic: Conic, phi: number, maxRadius = CONIC_VIEW_RADIUS): { phi: number; point: Vec2 } {
    const e = conic.epsilon;
    const ell = conic.kind === 'circle' ? conic.radius as number : e * (conic.focusDirectrixDistance as number);
    let used = phi;
    if (conic.kind === 'parabola' || conic.kind === 'hyperbola') {
        const delta = Math.min(ell / maxRadius, 1);
        const near = Math.acos(Math.max(-1, Math.min(1, (delta - 1) / e)));
        const farAvailable = conic.kind === 'hyperbola' && delta < e - 1;
        const far = Math.acos(Math.max(-1, Math.min(1, (-delta - 1) / e)));
        const size = Math.abs(phi);
        if (size > near && !(farAvailable && size >= far)) {
            const target = farAvailable && far - size < size - near ? far : near;
            used = (phi < 0 ? -1 : 1) * target;
        }
    }
    const direction = conic.directrix ?? {nx: 1, ny: 0};
    const r = conic.kind === 'circle' ? ell : ell / (1 + e * Math.cos(used));
    const ux = direction.nx * Math.cos(used) - direction.ny * Math.sin(used);
    const uy = direction.ny * Math.cos(used) + direction.nx * Math.sin(used);
    return {phi: used, point: {x: conic.focus.x + r * ux, y: conic.focus.y + r * uy}};
}

/** The polar angle phi in (-pi, pi] of the displayed point nearest to `target` (a drag): the ray from F and its opposite ray are tried. */
export function conicPhiNear(conic: Conic, target: Vec2): number {
    const direction = conic.directrix ?? {nx: 1, ny: 0};
    const dx = target.x - conic.focus.x;
    const dy = target.y - conic.focus.y;
    const along = dx * direction.nx + dy * direction.ny;
    const across = dy * direction.nx - dx * direction.ny;
    const psi = Math.atan2(across, along);
    const opposite = psi > 0 ? psi - Math.PI : psi + Math.PI;
    const candidates = [conicPointAt(conic, psi), conicPointAt(conic, opposite)];
    const distance = (c: { point: Vec2 }) => Math.hypot(c.point.x - target.x, c.point.y - target.y);
    return (distance(candidates[0]) <= distance(candidates[1]) ? candidates[0] : candidates[1]).phi;
}

export interface BridgeView {
    readonly points: readonly [Vec2, Vec2, Vec2];
    /** The weights drawn (matched or the user's). */
    readonly weights: readonly [number, number, number];
    readonly matchedWeight: number;
    /** The conic kind of the drawn middle weight, from `classifyMiddleWeight`. */
    readonly weightKind: Exclude<ConicKind, 'circle'>;
    readonly samples: readonly Vec2[];
    /** max | |PF| - e |Pd| | over the samples of the drawn arc. */
    readonly deviation: number;
}

/** The numbers every part of the display is derived from. */
export interface ConicFocalView {
    readonly conic: Conic;
    readonly kind: ConicKind;
    readonly branches: readonly (readonly Vec2[])[];
    readonly p: Vec2;
    readonly pf: number;
    /** Null for the circle. */
    readonly pd: number | null;
    /** |PF| / |Pd|; null for the circle (undefined) or for P on the directrix. */
    readonly ratio: number | null;
    /** The foot of the perpendicular from P on the directrix; null for the circle. */
    readonly foot: Vec2 | null;
    readonly secondFocus: Vec2 | null;
    readonly pf2: number | null;
    /** |PF| + |PF2| (ellipse). */
    readonly focalSum: number | null;
    /** ||PF2| - |PF|| (hyperbola). */
    readonly focalDifference: number | null;
    readonly bridge: BridgeView | null;
}

export function conicFocalView(model: ConicFocalModel): ConicFocalView {
    const conic = conicOfModel(model);
    const kind = classifyEccentricity(model.epsilon);
    const {point: p} = conicPointAt(conic, model.phi);
    const pf = focalDistance(conic, p);
    const pd = directrixDistance(conic, p);
    const metrics = kind === 'ellipse' || kind === 'hyperbola' ? conicMetrics(conic) : undefined;
    const secondFocus = metrics?.secondFocus ?? null;
    const pf2 = secondFocus ? Math.hypot(p.x - secondFocus.x, p.y - secondFocus.y) : null;
    const dir = conic.directrix;
    const signedGap = dir ? dir.d - (dir.nx * p.x + dir.ny * p.y) : 0;
    let bridge: BridgeView | null = null;
    if (model.bridge) {
        const arc = matchedConicArc(conic);
        const matchedWeight = arc.weights[1];
        const w1 = model.weight ?? matchedWeight;
        const weights: [number, number, number] = [1, w1, 1];
        const samples = sampleRationalQuadratic(arc.points, weights, CONIC_SAMPLES);
        bridge = {
            points: arc.points, weights, matchedWeight, weightKind: classifyMiddleWeight(w1), samples,
            deviation: maxConicDeviation(conic, samples),
        };
    }
    return {
        conic, kind, branches: sampleConic(conic, CONIC_SAMPLES, CONIC_VIEW_RADIUS), p, pf, pd, ratio: focusDirectrixRatio(conic, p),
        foot: dir ? {x: p.x + signedGap * dir.nx, y: p.y + signedGap * dir.ny} : null,
        secondFocus, pf2, focalSum: kind === 'ellipse' && pf2 !== null ? pf + pf2 : null,
        focalDifference: kind === 'hyperbola' && pf2 !== null ? Math.abs(pf2 - pf) : null, bridge,
    };
}
