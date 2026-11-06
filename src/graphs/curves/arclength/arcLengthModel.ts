import {
    ArcLengthStatus, ArcLengthTable, arcLengthAt, arcLengthTableOfBezier, chordLengths, equalArcParameters, equalParameterSteps,
    lengthBracket, parameterAtArcLength, speedAt,
} from "../../../bezeg/impl/kernels/arc-length";

export const ARC_PIECES_MIN = 2;
export const ARC_PIECES_MAX = 64;
export const ARC_PIECES_DEFAULT = 8;
/** Samples of the speed plot over t in [0, 1] (one more point than intervals). */
export const ARC_SPEED_SAMPLES = 129;
/** A chord at or below this (relative to max(1, L)) counts as zero, so a ratio is not formed from it. */
const ZERO_CHORD = 1e-12;

export type ArcMoverMode = 'parameter' | 'arc';
export const ARC_MOVER_MODES: readonly ArcMoverMode[] = ['parameter', 'arc'];

type Rows = ReadonlyArray<ReadonlyArray<number>>;

export interface ArcLengthModel {
    pieces: number;
    table: ArcLengthTable;
    length: number;
    status: ArcLengthStatus;
    /** The curve has no length: every sample point coincides, so there is nothing to parametrize. */
    degenerate: boolean;
    equalT: { parameters: number[], points: number[][], chords: number[], ratio: number | undefined };
    equalArc: { parameters: number[], points: number[][], chords: number[], ratio: number | undefined };
    bracket: { chord: number, polygon: number };
    polylineLength: number;
    polylineError: number;
    speed: { t: number[], speed: number[] };
}

function ratioOf(chords: readonly number[], length: number): number | undefined {
    const largest = Math.max(...chords), smallest = Math.min(...chords);
    return smallest > ZERO_CHORD * Math.max(1, length) ? largest / smallest : undefined;
}

/** Everything the overlay shows, from one table: built once per change of control rows or N (not once per mark). */
export function buildArcLengthModel(rows: Rows, pieces: number): ArcLengthModel {
    const table = arcLengthTableOfBezier(rows);
    const source = table.source;
    const equalTParameters = equalParameterSteps(pieces);
    const equalArcResult = equalArcParameters(table, pieces);
    const equalTChords = chordLengths(source, equalTParameters);
    const equalArcChords = chordLengths(source, equalArcResult.parameters);
    const length = table.length;
    const polylineLength = equalTChords.reduce((a, b) => a + b, 0);
    const speedT = Array.from({length: ARC_SPEED_SAMPLES}, (_, i) => i / (ARC_SPEED_SAMPLES - 1));
    return {
        pieces, table, length, status: table.status,
        degenerate: !(length > ZERO_CHORD),
        equalT: {
            parameters: equalTParameters, points: equalTParameters.map(t => [...source.at(t).point]), chords: equalTChords,
            ratio: ratioOf(equalTChords, length),
        },
        equalArc: {
            parameters: equalArcResult.parameters, points: equalArcResult.parameters.map(t => [...source.at(t).point]),
            chords: equalArcChords, ratio: ratioOf(equalArcChords, length),
        },
        bracket: lengthBracket(rows),
        polylineLength,
        polylineError: Math.abs(length - polylineLength),
        speed: {t: speedT, speed: speedT.map(t => speedAt(source, t))},
    };
}

/** The parameter of the moving point: the position itself, or the parameter at arc length position * L. */
export function moverParameter(model: ArcLengthModel, mode: ArcMoverMode, position: number): number {
    const p = Math.min(1, Math.max(0, position));
    return mode === 'arc' ? parameterAtArcLength(model.table, p * model.length) : p;
}

/** s(t) at the mover (0 for a degenerate curve). */
export function moverArcLength(model: ArcLengthModel, t: number): number {
    return arcLengthAt(model.table, Math.min(1, Math.max(0, t)));
}
