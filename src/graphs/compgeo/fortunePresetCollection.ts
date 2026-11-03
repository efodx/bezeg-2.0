import {message, Message} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {incircle, orient} from "../../compgeo/predicates";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SITES} from "../../compgeo/sweep/limits";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseHullStep} from "./hullTraceRun";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/** The file contract key of the Fortune graph's Preset collection. Registered in `compgeoPresetCollections` (sweep task 24). */
export const FORTUNE_PRESET_KEY = "compgeo-fortune";
export const FORTUNE_OVERLAY_IDS = ["grid"] as const;

const sites = (points: ReadonlyArray<readonly [number, number]>): PointSetModel => ({
    mode: "points", closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y})),
});

/** Spec C5 default example: A (0,5), B (-4,3), C (4,3), D (0,-3). D falls inside the circle of B, A, C: a false alarm. */
export const FORTUNE_EXAMPLE_1: PointSetModel = sites([[0, 5], [-4, 3], [4, 3], [0, -3]]);
/** Spec C5 second example: the same without D; one circle event, centre (0,0). */
export const FORTUNE_EXAMPLE_2: PointSetModel = sites([[0, 5], [-4, 3], [4, 3]]);
/** Sites on one slanted line: parallel bisectors, no vertex. */
export const FORTUNE_COLLINEAR: PointSetModel = sites([[-6, -3], [-2, -1], [2, 1], [6, 3]]);
/** Four sites on the circle with centre (0,0) and radius 5: one vertex of degree four. */
export const FORTUNE_COCIRCULAR: PointSetModel = sites([[0, 5], [5, 0], [0, -5], [-5, 0]]);

export const FORTUNE_EXAMPLE_IDS = ["example-1", "example-2", "collinear", "cocircular", "random"] as const;
export type FortuneExampleId = typeof FORTUNE_EXAMPLE_IDS[number];

/** A small deterministic generator (mulberry32), so a seed names a set of sites. */
function generator(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let z = state;
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * `count` random sites with integer coordinates in [-9, 9] in general position: no two share a y (so the first arcs are never
 * pointed), no three are collinear and no four are cocircular. Deterministic for a seed.
 */
export function randomGeneralSites(seed: number, count = SWEEP_MAX_SITES): PointSetModel {
    const next = generator(seed);
    const chosen: GridPoint[] = [];
    let guard = 0;
    while (chosen.length < count && guard++ < 20000) {
        const candidate: GridPoint = {x: Math.floor(next() * 19) - 9, y: Math.floor(next() * 19) - 9};
        if (chosen.some(p => p.y === candidate.y)) continue;
        const collinear = chosen.some((a, i) => chosen.slice(i + 1).some(b => orient(a, b, candidate) === 0));
        if (collinear) continue;
        const cocircular = chosen.some((a, i) => chosen.slice(i + 1).some((b, j) => chosen.slice(i + j + 2).some(c => incircle(a, b, c, candidate) === 0)));
        if (!cocircular) chosen.push(candidate);
    }
    return {mode: "points", closed: false, gridStepExponent: 0, points: chosen};
}

/**
 * The Fortune graph's Preset collection. `data` is a points-mode set of at most 12 sites within 2^10 (nothing is clipped);
 * any other mode is rejected. `graphState` adds the step index `step` (any finite number; a stale index is clamped on
 * restore, not rejected) to the overlay switches. Playback status is never part of a Preset.
 */
export function fortunePresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(FORTUNE_PRESET_KEY, overlayIds, {pointLimit: SWEEP_MAX_SITES, coordinateLimit: SWEEP_COORD_LIMIT});
    return Object.freeze({
        key: FORTUNE_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, ...rest} = graphState;
            if (step !== undefined && parseHullStep(step) === undefined) return message("fortune_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const checked = base.check(data);
            if ("data" in checked && checked.data.mode !== "points") return {rejection: message("fortune_invalid_mode")};
            return checked;
        },
    });
}

export const fortuneCollection: PresetCollection<PointSetModel> = fortunePresetCollection(FORTUNE_OVERLAY_IDS);
