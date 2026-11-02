import {GridPoint} from "../../compgeo/grid";
import {BoardXY, inBox} from "../../compgeo/notablePointsModel";
import {
    AngleAnalysis, analyseAngle, analysePoint, analysePower, analyseSource, CircleSpec, Inversion, InversionExample, InversionSource,
    PointAnalysis, PowerAnalysis, SourceAnalysis, XY,
} from "../../compgeo/inversionModel";
import type {InversionFocus} from "./inversionPresetCollection";

/**
 * The derived figure of the inversion graph: a pure function of the centre (the one vertex) and the scene fields, using only the
 * analyses of `inversionModel.ts`. Nothing here inverts anything; the few geometry helpers (ray-box clipping for the edge
 * marker, unit directions) are plain view arithmetic on finite numbers.
 */
export interface InversionInputs {
    readonly centre: GridPoint | undefined;
    readonly radius: number;
    readonly focus: InversionFocus;
    readonly x: GridPoint;
    readonly source: InversionSource;
    readonly power: {readonly circle: CircleSpec; readonly thetaDeg: number};
    readonly angle: {readonly first: CircleSpec; readonly second: CircleSpec; readonly which: 0 | 1};
}

export type InversionView =
    | {readonly kind: "no-centre"}
    | {
        readonly kind: "scene";
        readonly focus: InversionFocus;
        readonly centre: GridPoint;
        readonly inversion: Inversion;
        readonly point?: PointAnalysis;
        readonly source?: SourceAnalysis;
        /** The kind of the source input (circle or line), which the analysis alone does not say. */
        readonly sourceKind?: InversionSource["kind"];
        readonly power?: PowerAnalysis;
        readonly angle?: AngleAnalysis;
        /** The images of the two circles of the angle focus (drawn like a source image). */
        readonly angleImages?: readonly [SourceAnalysis, SourceAnalysis];
    };

export function buildInversionView(inputs: InversionInputs): InversionView {
    const {centre, radius, focus} = inputs;
    if (!centre) return {kind: "no-centre"};
    const inversion: Inversion = {centre, radius};
    switch (focus) {
        case "point": return {kind: "scene", focus, centre, inversion, point: analysePoint(inversion, inputs.x)};
        case "source": return {kind: "scene", focus, centre, inversion, source: analyseSource(inversion, inputs.source), sourceKind: inputs.source.kind};
        case "power": return {kind: "scene", focus, centre, inversion, power: analysePower(centre, inputs.power.circle, inputs.power.thetaDeg)};
        default: {
            const {first, second, which} = inputs.angle;
            return {
                kind: "scene", focus, centre, inversion, angle: analyseAngle(inversion, first, second, which),
                angleImages: [
                    analyseSource(inversion, {kind: "circle", centre: first.centre, radius: first.radius}),
                    analyseSource(inversion, {kind: "circle", centre: second.centre, radius: second.radius}),
                ],
            };
        }
    }
}

/** A drawn place that may be outside the view: an image point, the centre of an image circle, or Q'. */
export type InversionPlaceId = "image" | "source-image" | "q-image";
export const INVERSION_PLACE_IDS: readonly InversionPlaceId[] = ["image", "source-image", "q-image"];

export interface InversionPlace {
    readonly id: InversionPlaceId;
    /** Where the board draws it; undefined beyond the model's draw cap. */
    readonly board: BoardXY | undefined;
    /** Unit vector from the centre of inversion towards the place, for the edge marker; undefined when there is none. */
    readonly direction: XY | undefined;
}

function unit(from: GridPoint, to: XY): XY | undefined {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const size = Math.hypot(dx, dy);
    return size > 0 && Number.isFinite(size) ? {x: dx / size, y: dy / size} : undefined;
}

export function inversionPlaces(view: InversionView): readonly InversionPlace[] {
    if (view.kind !== "scene") return [];
    const places: InversionPlace[] = [];
    if (view.point?.kind === "image") places.push({id: "image", board: view.point.board, direction: view.point.direction});
    if (view.source?.kind === "image" && view.source.drawn.kind === "circle") {
        places.push({
            id: "source-image",
            board: view.source.board?.kind === "circle" ? {x: view.source.board.centre.re, y: view.source.board.centre.im} : undefined,
            direction: unit(view.centre, {x: view.source.drawn.centre.re, y: view.source.drawn.centre.im}),
        });
    }
    if (view.angle?.kind === "angle") places.push({id: "q-image", board: view.angle.imageBoard, direction: unit(view.centre, view.angle.point)});
    return places;
}

/** The places the board does not show: beyond the draw cap, or outside the current view box. */
export function outsidePlaces(view: InversionView, box: readonly number[] | undefined): ReadonlySet<InversionPlaceId> {
    const outside = new Set<InversionPlaceId>();
    for (const place of inversionPlaces(view)) {
        if (place.board === undefined || (box !== undefined && !inBox(box, place.board))) outside.add(place.id);
    }
    return outside;
}

/**
 * The arrow for a place outside the view box. When the place has a drawn position (`place`), the tip is that position clamped
 * onto the box boundary and the arrow points from the box towards the place. For a place beyond the draw cap (`place` undefined)
 * the tip is where the ray from `from` along `direction` leaves the box; undefined when the ray misses the box. All values are
 * finite.
 */
export function edgeMarker(box: readonly number[], from: GridPoint, direction: XY, length: number, place?: XY): {tail: XY; tip: XY} | undefined {
    const [left, top, right, bottom] = box;
    const lo = {x: Math.min(left, right), y: Math.min(top, bottom)};
    const hi = {x: Math.max(left, right), y: Math.max(top, bottom)};
    if (place) {
        if (!Number.isFinite(place.x) || !Number.isFinite(place.y)) return undefined;
        const tip = {x: Math.min(Math.max(place.x, lo.x), hi.x), y: Math.min(Math.max(place.y, lo.y), hi.y)};
        const dx = place.x - tip.x;
        const dy = place.y - tip.y;
        const size = Math.hypot(dx, dy);
        const aim = size > 0 ? {x: dx / size, y: dy / size} : direction;
        const back = Math.max(Math.min(length, hi.x - lo.x, hi.y - lo.y), 0);
        const tail = {x: tip.x - back * aim.x, y: tip.y - back * aim.y};
        return [tip.x, tip.y, tail.x, tail.y].every(Number.isFinite) ? {tail, tip} : undefined;
    }
    let enter = 0;
    let exit = Infinity;
    for (const axis of ["x", "y"] as const) {
        const d = direction[axis];
        const o = from[axis];
        if (d === 0) {
            if (o < lo[axis] || o > hi[axis]) return undefined;
            continue;
        }
        const a = (lo[axis] - o) / d;
        const b = (hi[axis] - o) / d;
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
    }
    if (!Number.isFinite(exit) || exit < enter || exit <= 0) return undefined;
    const tip = {x: from.x + exit * direction.x, y: from.y + exit * direction.y};
    const back = Math.max(Math.min(length, exit - enter), 0);
    const tail = {x: tip.x - back * direction.x, y: tip.y - back * direction.y};
    return Number.isFinite(tip.x) && Number.isFinite(tip.y) && Number.isFinite(tail.x) && Number.isFinite(tail.y) ? {tail, tip} : undefined;
}

/** True when the graph fields still equal the example (so its id may stay in the scene state). */
export function matchesExample(example: InversionExample, inputs: InversionInputs): boolean {
    const same = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;
    const sameCircle = (a: CircleSpec, b: CircleSpec) => same(a.centre, b.centre) && a.radius === b.radius;
    if (!inputs.centre || !same(inputs.centre, example.inversion.centre) || inputs.radius !== example.inversion.radius) return false;
    if (example.point) return inputs.focus === "point" && same(inputs.x, example.point);
    if (example.source) {
        const s = inputs.source;
        const e = example.source;
        const sameSource = s.kind === e.kind && (s.kind === "circle" && e.kind === "circle"
            ? same(s.centre, e.centre) && s.radius === e.radius
            : s.kind === "line" && e.kind === "line" && same(s.p, e.p) && same(s.q, e.q));
        return inputs.focus === "source" && sameSource;
    }
    if (example.power) {
        return inputs.focus === "power" && same(inputs.centre, example.power.point) && sameCircle(inputs.power.circle, example.power.circle)
            && inputs.power.thetaDeg === example.power.thetaDeg;
    }
    if (example.angle) {
        return inputs.focus === "angle" && sameCircle(inputs.angle.first, example.angle.first) && sameCircle(inputs.angle.second, example.angle.second)
            && inputs.angle.which === example.angle.which;
    }
    return false;
}
