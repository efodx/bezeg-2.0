import {THREE_VIEWS_ANGLE_STEPS, THREE_VIEWS_LIMIT, ThreeViewsModel} from "./threeViewsModel";

const clampC = (k: number): number => Math.max(-THREE_VIEWS_LIMIT, Math.min(THREE_VIEWS_LIMIT, Math.round(k)));

/** Sets c in tenths (clamped to -25..25, rounded to a whole number). Returns the same object when nothing changes. */
export function setC(model: ThreeViewsModel, tenths: number): ThreeViewsModel {
    if (!Number.isFinite(tenths)) return model;
    const next = clampC(tenths);
    return next === model.c ? model : {...model, c: next};
}

/** Keyboard stepping: `steps` tenths up (positive) or down (negative). */
export const nudgeC = (model: ThreeViewsModel, steps: number): ThreeViewsModel => setC(model, model.c + steps);

export function setPointOn(model: ThreeViewsModel, on: boolean): ThreeViewsModel {
    return on === model.pointOn ? model : {...model, pointOn: on};
}

/** Sets the step of the point on the circle; it wraps around (24 steps of 15 degrees). */
export function setAngle(model: ThreeViewsModel, angle: number): ThreeViewsModel {
    if (!Number.isFinite(angle)) return model;
    const next = ((Math.round(angle) % THREE_VIEWS_ANGLE_STEPS) + THREE_VIEWS_ANGLE_STEPS) % THREE_VIEWS_ANGLE_STEPS;
    return next === model.angle ? model : {...model, angle: next};
}
