import type {Board} from "jsxgraph";

/**
 * The board objects JSXGraph itself creates and keeps for the board's whole lifetime: the default axes with their
 * ticks and labels, the (possibly hidden) infobox and the two pointer-sketching curves. No scene owns them, so scene
 * teardown never removes them. This is the only place that reads these JSXGraph internals; tests use it to tell a
 * scene's leftovers from infrastructure.
 */
export function boardInfrastructureObjects(board: Board): Set<object> {
    const preserved = new Set<object>();
    const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
    const valuesOf = (value: unknown): unknown[] => isObject(value) ? Object.values(value) : [];
    const visit = (object: unknown): void => {
        if (!isObject(object) || preserved.has(object)) return;
        preserved.add(object);
        valuesOf(object.childElements).forEach(visit);
        valuesOf(object.ticks).forEach(visit);
        valuesOf(object.labels).forEach(visit);
        visit(object.defaultTicks);
    };
    const internals = board as unknown as {defaultAxes?: {x?: unknown; y?: unknown}; infobox?: unknown; sketches?: unknown; sketch?: unknown};
    visit(internals.infobox);
    for (const axis of [internals.defaultAxes?.x, internals.defaultAxes?.y]) {
        visit(axis);
        if (!isObject(axis)) continue;
        valuesOf(axis.ancestors).forEach(visit);
        visit(axis.point1);
        visit(axis.point2);
    }
    valuesOf(internals.sketches).forEach(visit);
    visit(internals.sketch);
    return preserved;
}
