import type {GridPoint} from "../../compgeo/grid";
import type {MonotoneChainOptions} from "../../compgeo/monotoneChain";
import {kettnerSignMap} from "../../compgeo/inexactOrientation";
import {formatSignificant} from "../../analysis/format";

/**
 * Pure adapters of the hull robustness graph (spec convexity-hulls-lessons A5, task 19): the saved choices with their parsers,
 * the Kettner cell readout built from task 17's `kettnerSignMap()`, and the chain output readout. No React, JSXGraph or
 * localization. Every `naive...` field here is INEXACT (a double evaluation) and is only ever shown next to the exact sign.
 */
export const ROBUSTNESS_MODES = ["chain", "kettner"] as const;
export type RobustnessMode = typeof ROBUSTNESS_MODES[number];
export const POP_RULES = ["non-left", "right"] as const;
export type PopRule = MonotoneChainOptions["pop"];
export const DUPLICATE_RULES = ["merge", "keep"] as const;
export type DuplicateRule = MonotoneChainOptions["duplicates"];
export const KETTNER_PANELS = ["inexact", "exact"] as const;
export type KettnerPanel = typeof KETTNER_PANELS[number];

export const DEFAULT_ROBUSTNESS_MODE: RobustnessMode = "chain";
export const DEFAULT_POP_RULE: PopRule = "non-left";
export const DEFAULT_DUPLICATE_RULE: DuplicateRule = "merge";
export const DEFAULT_KETTNER_PANEL: KettnerPanel = "inexact";
/** Cells per side of the Kettner map. */
export const KETTNER_SIZE = 64;
/** The cell named in the spec (exact value about +9,33e-15, double value about -5,68e-14). */
export const DEFAULT_KETTNER_CELL: KettnerCellIndex = Object.freeze({i: 41, j: 48});

export interface KettnerCellIndex {
    readonly i: number;
    readonly j: number;
}

const oneOf = <T extends string>(known: readonly T[], value: unknown): T | undefined => known.find(item => item === value);
export const parseRobustnessMode = (value: unknown): RobustnessMode | undefined => oneOf(ROBUSTNESS_MODES, value);
export const parsePopRule = (value: unknown): PopRule | undefined => oneOf(POP_RULES, value);
export const parseDuplicateRule = (value: unknown): DuplicateRule | undefined => oneOf(DUPLICATE_RULES, value);
export const parseKettnerPanel = (value: unknown): KettnerPanel | undefined => oneOf(KETTNER_PANELS, value);
/** A saved cell coordinate: an integer from 0 to 63; anything else is undefined (the importer rejects it). */
export function parseKettnerCoordinate(value: unknown): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < KETTNER_SIZE ? value : undefined;
}

/** A cell coordinate cut to the map (a stale or arrow-key value never leaves it). */
export function clampKettnerCoordinate(value: number): number {
    return Number.isFinite(value) ? Math.min(KETTNER_SIZE - 1, Math.max(0, Math.round(value))) : 0;
}

export type Sign = -1 | 0 | 1;

export interface KettnerCellReadout {
    readonly i: number;
    readonly j: number;
    /** The exact sign of orient(p, q, r). */
    readonly exact: Sign;
    /** INEXACT: the sign of the double evaluation. */
    readonly naive: Sign;
    /** INEXACT: the double value behind `naive`. */
    readonly naiveValue: number;
    /** Whether the inexact sign equals the exact one, differs in sign, or is a false zero. */
    readonly kind: "agree" | "wrong-sign" | "false-zero";
}

/** The readout of one cell, straight from the memoized map; undefined for a cell outside 0..63. */
export function kettnerCellReadout(i: number, j: number): KettnerCellReadout | undefined {
    if (parseKettnerCoordinate(i) === undefined || parseKettnerCoordinate(j) === undefined) return undefined;
    const cell = kettnerSignMap().cells[j * KETTNER_SIZE + i];
    const kind = cell.naive === cell.exact ? "agree" : cell.naive === 0 ? "false-zero" : "wrong-sign";
    return {i, j, exact: cell.exact, naive: cell.naive, naiveValue: cell.naiveValue, kind};
}

export interface KettnerCounts {
    readonly total: number;
    readonly wrongSign: number;
    readonly falseZero: number;
    readonly agree: number;
}

export function kettnerCounts(): KettnerCounts {
    const {wrongSign, falseZero, agree} = kettnerSignMap();
    return {total: KETTNER_SIZE * KETTNER_SIZE, wrongSign, falseZero, agree};
}

/** A sign as the symbol drawn in the cell: "+", "−" (true minus) or "0". */
export function signSymbol(sign: Sign): string {
    return sign > 0 ? "+" : sign < 0 ? "−" : "0";
}

export interface ChainOutputEntry {
    /** 1-based point number, as the board's labels P1, P2, ... */
    readonly number: number;
    readonly x: number;
    readonly y: number;
}

export interface ChainOutputReadout {
    readonly entries: readonly ChainOutputEntry[];
    /** The first entry of every location listed more than once (the `<` rule on collinear input, or copies kept by `keep`). */
    readonly repeated: readonly ChainOutputEntry[];
}

/** The output hull of a finished chain run as grid coordinates, with the locations that the output lists more than once. */
export function chainOutputReadout(hull: readonly number[], points: readonly GridPoint[]): ChainOutputReadout {
    const entries = hull.filter(index => points[index] !== undefined)
        .map(index => ({number: index + 1, x: points[index].x, y: points[index].y}));
    const seen = new Map<string, ChainOutputEntry>();
    const repeated = new Set<ChainOutputEntry>();
    for (const entry of entries) {
        const first = seen.get(`${entry.x},${entry.y}`);
        if (first) repeated.add(first); else seen.set(`${entry.x},${entry.y}`, entry);
    }
    return {entries, repeated: [...repeated]};
}

const SUPERSCRIPT: Readonly<Record<string, string>> = {"-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"};

/**
 * A double orientation value as text with three significant digits. `formatSignificant` turns anything below 1e-12 into "0" (it
 * hides floating-point noise), but here the tiny value is the point of the picture (about -5.68e-14 in cell (41, 48)), so a
 * nonzero value is shown in exponent form and only an exact 0 reads "0".
 */
export function formatDoubleValue(value: number, language: Parameters<typeof formatSignificant>[1]): string {
    if (value === 0 || !Number.isFinite(value) || Math.abs(value) >= 1e-12) return formatSignificant(value, language, 3);
    const [mantissa, exponent] = Math.abs(value).toExponential(2).split("e");
    const trimmed = mantissa.replace(/0+$/, "").replace(/\.$/, "");
    const text = `${language === "sl" ? trimmed.replace(".", ",") : trimmed}·10${String(Number(exponent)).replace(/./g, character => SUPERSCRIPT[character])}`;
    return value < 0 ? `−${text}` : text;
}
