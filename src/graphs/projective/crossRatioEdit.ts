import {CROSS_RATIO_COORD_LIMIT, CrossRatioModel, POINT_NAMES} from "./crossRatioModel";
import {ProjectiveGridPoint} from "./projectiveValidation";

/** The draggable handles: 0-3 are A-D on the first line, 4 is the centre, 5-6 fix the second line. */
export const HANDLE_COUNT = 7;
export const handleName = (handle: number): string => handle < 4 ? POINT_NAMES[handle] : handle === 4 ? "O" : handle === 5 ? "M" : "N";
export const isHandle = (handle: unknown): handle is number => typeof handle === "number" && Number.isInteger(handle) && handle >= 0 && handle < HANDLE_COUNT;

export function handlePosition(model: CrossRatioModel, handle: number): ProjectiveGridPoint {
    if (handle < 4) return {x: model.params[handle], y: 0};
    return handle === 4 ? model.centre : model.line2[handle - 5];
}

const clampGrid = (value: number): number => Math.max(-CROSS_RATIO_COORD_LIMIT, Math.min(CROSS_RATIO_COORD_LIMIT, Math.round(value)));

/**
 * Moves one handle to the grid point nearest to `to`, clamped to the coordinate limit. A handle A-D keeps `y = 0`.
 * Returns the same model object when nothing changes; any change makes the example `custom`.
 */
export function moveHandle(model: CrossRatioModel, handle: number, to: ProjectiveGridPoint): CrossRatioModel {
    if (!isHandle(handle) || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return model;
    const next = {x: clampGrid(to.x), y: clampGrid(to.y)};
    const current = handlePosition(model, handle);
    if (handle < 4) {
        if (current.x === next.x) return model;
        const params = [...model.params] as [number, number, number, number];
        params[handle] = next.x;
        return {...model, example: "custom", params};
    }
    if (current.x === next.x && current.y === next.y) return model;
    if (handle === 4) return {...model, example: "custom", centre: next};
    const line2: [ProjectiveGridPoint, ProjectiveGridPoint] = [model.line2[0], model.line2[1]];
    line2[handle - 5] = next;
    return {...model, example: "custom", line2};
}

/** Moves a handle by whole grid steps (keyboard stepping); the vertical step is ignored for A-D. */
export function nudgeHandle(model: CrossRatioModel, handle: number, dx: number, dy: number): CrossRatioModel {
    if (!isHandle(handle)) return model;
    const at = handlePosition(model, handle);
    return moveHandle(model, handle, {x: at.x + dx, y: at.y + dy});
}
