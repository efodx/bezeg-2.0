import {
    POLE_POLAR_CONIC_IDS, POLE_POLAR_DENOMINATOR, POLE_POLAR_DIRECTION_LIMIT, POLE_POLAR_NUMERATOR_LIMIT, PolePolarConicId, PolePolarDirection, PolePolarModel,
} from "./polePolarModel";
import {ProjectiveGridPoint} from "./projectiveValidation";

/** The one draggable handle is P. */
export const P_HANDLE = 0;

const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

/** Moves P to the 1/5 grid point nearest to the board position `to` (coordinates in board units). A finite move leaves the ideal mode. */
export function moveP(model: PolePolarModel, to: {x: number; y: number}): PolePolarModel {
    if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) return model;
    return setNumerators(model, {x: Math.round(to.x * POLE_POLAR_DENOMINATOR), y: Math.round(to.y * POLE_POLAR_DENOMINATOR)});
}

/** Places the finite P by its numerators over 5, clamped to the limit. Returns the same object when nothing changes. */
export function setNumerators(model: PolePolarModel, to: ProjectiveGridPoint): PolePolarModel {
    const next = {x: clamp(to.x, POLE_POLAR_NUMERATOR_LIMIT), y: clamp(to.y, POLE_POLAR_NUMERATOR_LIMIT)};
    if (model.ideal === undefined && next.x === model.p.x && next.y === model.p.y) return model;
    return {example: "custom", conic: model.conic, p: next};
}

/** Switches P to the point at infinity of `direction` (or back to the finite P when `undefined`). */
export function setDirection(model: PolePolarModel, direction: PolePolarDirection | undefined): PolePolarModel {
    if (direction === undefined) {
        if (model.ideal === undefined) return model;
        return {example: "custom", conic: model.conic, p: model.p};
    }
    const next = {dx: clamp(direction.dx, POLE_POLAR_DIRECTION_LIMIT), dy: clamp(direction.dy, POLE_POLAR_DIRECTION_LIMIT)};
    if (next.dx === 0 && next.dy === 0) return model;
    if (model.ideal && model.ideal.dx === next.dx && model.ideal.dy === next.dy) return model;
    return {...model, example: "custom", ideal: next};
}

export function setConic(model: PolePolarModel, conic: PolePolarConicId): PolePolarModel {
    if (!POLE_POLAR_CONIC_IDS.includes(conic) || conic === model.conic) return model;
    return {...model, example: "custom", conic};
}

/**
 * Keyboard stepping: a finite P moves by `dx`, `dy` numerators (one step is 0.2); an ideal P turns its direction by whole units and
 * skips the zero direction.
 */
export function nudgeP(model: PolePolarModel, dx: number, dy: number): PolePolarModel {
    if (model.ideal === undefined) return setNumerators(model, {x: model.p.x + dx, y: model.p.y + dy});
    const turned = {dx: model.ideal.dx + Math.sign(dx), dy: model.ideal.dy + Math.sign(dy)};
    if (turned.dx === 0 && turned.dy === 0) {
        // step over the zero direction
        return setDirection(model, {dx: turned.dx + Math.sign(dx), dy: turned.dy + Math.sign(dy)});
    }
    return setDirection(model, turned);
}
