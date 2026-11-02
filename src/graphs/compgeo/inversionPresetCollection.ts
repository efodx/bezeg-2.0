import {message, Message} from "../../localization";
import {parsePointSetModel, PointSetModel, serializePointSetModel} from "../../compgeo/pointSetModel";
import {
    INVERSION_COORDINATE_MAX, INVERSION_EXAMPLES, isCircleSpec, isInversionPoint, isInversionRadius, isInversionSource,
} from "../../compgeo/inversionModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {pointSetRejection} from "./pointSetPresetCollection";

export const INVERSION_PRESET_KEY = "compgeo-inversion";
/** The one vertex is the centre of inversion (or the power point). */
export const INVERSION_POINT_COUNT = 1;
export const INVERSION_FOCI = ["point", "source", "power", "angle"] as const;
export type InversionFocus = typeof INVERSION_FOCI[number];

/** The overlay ids the graph offers: its grid switch and the six parts of the figure. */
export const INVERSION_OVERLAY_IDS = ["grid", "inversion-circle", "rays", "image", "secant", "tangent", "angle-tangents"] as const;

export function isInversionFocus(value: unknown): value is InversionFocus {
    return typeof value === "string" && (INVERSION_FOCI as readonly string[]).includes(value);
}

export function isInversionExampleId(value: unknown): boolean {
    return typeof value === "string" && INVERSION_EXAMPLES.some(example => example.id === value);
}

const GRAPH_STATE_FIELDS = ["initialized", "overlays", "exampleId", "focus", "radius", "x", "source", "power", "angle"];

function extraKey(path: string, value: unknown, allowed: readonly string[]): string | undefined {
    if (!isRecord(value)) return undefined;
    const extra = Object.keys(value).find(field => !allowed.includes(field));
    return extra === undefined ? undefined : `${path}.${extra}`;
}

const POINT_KEYS = ["x", "y"];
const CIRCLE_KEYS = ["centre", "radius"];

function circleExtra(path: string, value: unknown): string | undefined {
    if (!isRecord(value)) return undefined;
    return extraKey(path, value, CIRCLE_KEYS) ?? extraKey(`${path}.centre`, value.centre, POINT_KEYS);
}

function sourceExtra(source: unknown): string | undefined {
    if (!isRecord(source)) return undefined;
    if (source.kind === "line") {
        return extraKey("source", source, ["kind", "p", "q"]) ?? extraKey("source.p", source.p, POINT_KEYS) ?? extraKey("source.q", source.q, POINT_KEYS);
    }
    return extraKey("source", source, ["kind", ...CIRCLE_KEYS]) ?? extraKey("source.centre", source.centre, POINT_KEYS);
}

/** The path of the first unknown field inside the nested records (`x`, `source`, the circles of `power` and `angle`). */
function nestedUnknownField(state: Record<string, unknown>): string | undefined {
    const {x, source, power, angle} = state;
    return extraKey("x", x, POINT_KEYS) ?? sourceExtra(source)
        ?? (isRecord(power) ? circleExtra("power.circle", power.circle) : undefined)
        ?? (isRecord(angle) ? circleExtra("angle.first", angle.first) ?? circleExtra("angle.second", angle.second) : undefined);
}

function isPower(value: unknown): boolean {
    if (!isRecord(value)) return false;
    const unknown = Object.keys(value).some(field => field !== "circle" && field !== "thetaDeg");
    return !unknown && isCircleSpec(value.circle) && typeof value.thetaDeg === "number" && Number.isFinite(value.thetaDeg)
        && value.thetaDeg >= 0 && value.thetaDeg < 360;
}

function isAngle(value: unknown): boolean {
    if (!isRecord(value)) return false;
    const unknown = Object.keys(value).some(field => field !== "first" && field !== "second" && field !== "which");
    return !unknown && isCircleSpec(value.first) && isCircleSpec(value.second) && (value.which === 0 || value.which === 1);
}

/**
 * The Preset collection of the inversion graph (task triangle-geometry/08 F2a). `data` is a `PointSetModel` in points mode at
 * grid step 1 with at most one vertex, an integer in [-10, 10] (the centre of inversion, or the power point). `graphState`
 * carries `initialized`, the toggles (known ids only), the optional example id, the focus, the inversion radius (integer 1..8),
 * the point `x`, the `source` (circle or line), the `power` block (circle and a direction in [0, 360)) and the `angle` block
 * (two circles and the intersection choice); never the model. Unknown fields and non-finite numbers are rejected. Not yet
 * listed in `presetCollections`; the route that uses the graph registers it.
 */
export function inversionPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    return Object.freeze({
        key: INVERSION_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => !GRAPH_STATE_FIELDS.includes(field));
            if (unknown !== undefined) return message("invalid_value", {value0: unknown});
            const nested = nestedUnknownField(graphState);
            if (nested !== undefined) return message("invalid_value", {value0: nested});
            if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_state");
            if (graphState.exampleId !== undefined && !isInversionExampleId(graphState.exampleId)) return message("inversion_invalid_example");
            if (graphState.focus !== undefined && !isInversionFocus(graphState.focus)) return message("inversion_invalid_focus");
            if (graphState.radius !== undefined && !isInversionRadius(graphState.radius)) return message("inversion_invalid_radius");
            if (graphState.x !== undefined && !isInversionPoint(graphState.x)) return message("inversion_invalid_x");
            if (graphState.source !== undefined && !isInversionSource(graphState.source)) return message("inversion_invalid_source");
            if (graphState.power !== undefined && !isPower(graphState.power)) return message("inversion_invalid_power");
            if (graphState.angle !== undefined && !isAngle(graphState.angle)) return message("inversion_invalid_angle");
            const overlays = graphState.overlays;
            if (overlays === undefined) return undefined;
            const valid = isRecord(overlays) && Object.entries(overlays).every(([id, shown]) => overlayIds.includes(id) && typeof shown === "boolean");
            return valid ? undefined : message("pointset_invalid_overlays");
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const parsed = parsePointSetModel(data, {pointLimit: INVERSION_POINT_COUNT, coordinateLimit: INVERSION_COORDINATE_MAX});
            if (!parsed.ok) return {rejection: pointSetRejection(parsed)};
            if (parsed.model.mode !== "points") return {rejection: message("notable_invalid_mode")};
            if (parsed.model.gridStepExponent !== 0) return {rejection: message("notable_invalid_grid_step")};
            return {data: serializePointSetModel(parsed.model)};
        },
    });
}

/** The module-level singleton; the Preset catalog compares collections by identity. */
export const inversionCollection: PresetCollection<PointSetModel> = inversionPresetCollection(INVERSION_OVERLAY_IDS);
