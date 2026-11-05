import type {Board, Curve, GeometryElement, Line, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GraphPalette} from "../../styles/GraphPalette";
import {curvatureAt, evolutePoint, polynomialBezierSource, Vec2} from "../../../bezeg/impl/curve/curvature";
import type {EvoluteTraceMode} from "../../../learning/model";
import {curvatureFrame} from "./CurvatureOverlay";

/** Number of parameter samples of the evolute trace: t_i = tEnd * i / (EVOLUTE_SAMPLES - 1). */
export const EVOLUTE_SAMPLES = 256;
/**
 * An evolute point farther from the curve than this many curve extents is dropped like an undefined one: next to an
 * inflection the centre of curvature runs off to infinity, and a segment to a point that far is clipped at the view
 * anyway but loses coordinate precision. Samples beyond it break the trace; no segment is drawn to them.
 */
export const EVOLUTE_MAX_RADIUS_FACTOR = 50;

export interface EvoluteTrace {
    /** Flat coordinates; a NaN entry (in both arrays, at the same index) separates two pieces of the trace. */
    x: number[];
    y: number[];
}

interface EvoluteSample {
    point: Vec2 | undefined;
    /** Sign of the curvature, 0 where there is no evolute point. */
    sign: number;
}

function sampleAt(source: ReturnType<typeof polynomialBezierSource>, t: number): EvoluteSample {
    const {point, d1, d2} = source.at(t);
    const curvature = curvatureAt(d1, d2, source.scale);
    if (curvature.kind === 'singular') return {point: undefined, sign: 0};
    const centre = evolutePoint(point, curvature.normal, curvature.kappa, source.scale);
    if (!centre || Math.hypot(centre[0] - point[0], centre[1] - point[1]) > EVOLUTE_MAX_RADIUS_FACTOR * source.scale) {
        return {point: undefined, sign: 0};
    }
    return {point: centre, sign: Math.sign(curvature.kappa)};
}

/** The sample the trace draws at t: the centre of curvature, or undefined where the curve is singular, its curvature is 0, or the centre is beyond {@link EVOLUTE_MAX_RADIUS_FACTOR}. */
export function evolutePointAt(controlPoints: ReadonlyArray<ReadonlyArray<number>>, t: number): Vec2 | undefined {
    return sampleAt(polynomialBezierSource(controlPoints), t).point;
}

/**
 * The evolute of the polynomial Bezier curve with these control points for t in [0, tEnd], at `samples` evenly spaced
 * parameters. The trace breaks (a NaN pair) at a sample whose evolute point is undefined and between two neighbouring
 * samples whose curvature has opposite signs: the evolute passes through infinity at the inflection between them, so a
 * joining segment would be false. A curve with no defined evolute point (a straight line) gives empty arrays.
 */
export function evoluteTrace(controlPoints: ReadonlyArray<ReadonlyArray<number>>, tEnd: number, samples = EVOLUTE_SAMPLES): EvoluteTrace {
    const x: number[] = [];
    const y: number[] = [];
    if (controlPoints.length < 2 || !Number.isFinite(tEnd) || samples < 1) return {x, y};
    const source = polynomialBezierSource(controlPoints);
    let previous: EvoluteSample | undefined;
    let pendingBreak = false;
    for (let i = 0; i < samples; i++) {
        const current = sampleAt(source, samples === 1 ? tEnd : tEnd * i / (samples - 1));
        if (!current.point) {
            pendingBreak = x.length > 0;
        } else {
            if (previous?.point && previous.sign !== current.sign) pendingBreak = true;
            if (pendingBreak) {
                x.push(NaN);
                y.push(NaN);
            }
            x.push(current.point[0]);
            y.push(current.point[1]);
            pendingBreak = false;
        }
        previous = current;
    }
    return {x, y};
}

interface EvoluteSettings {
    board: Board;
    /** Control points of the curve being studied, read lazily so dragging needs no listener. */
    controlPoints: () => ReadonlyArray<ReadonlyArray<number>> | undefined;
    parameter: () => number;
    traceMode: () => EvoluteTraceMode;
    normalShown: () => boolean;
    fontSize: () => number;
}

type DataCurve = Curve & { updateDataArray: () => void; dataX: number[]; dataY: number[] };

/**
 * The evolute overlay: the evolute trace (one curve, refilled on every board update), the normal line at the parameter and
 * the evolute point E (a diamond tagged "E"). Elements read the curve lazily, so no drag listener exists; the one
 * subscription (language change, for the board text) is released in dispose.
 */
export class EvoluteOverlay {
    private readonly board: Board;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;

    constructor(private readonly settings: EvoluteSettings) {
        this.board = settings.board;
        this.build();
    }

    /** The created elements, for ownership checks. */
    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    private frame() {
        const points = this.settings.controlPoints();
        return points ? curvatureFrame(points, this.settings.parameter()) : undefined;
    }

    /** The evolute point at the parameter, or undefined where it does not exist. */
    evolutePoint(): Vec2 | undefined {
        const f = this.frame();
        if (!f || f.status === 'singular') return undefined;
        return evolutePoint(f.point, f.normal, f.kappa, f.scale);
    }

    /** The readout line: the evolute point E, or why there is none. */
    readoutText(): string {
        const f = this.frame();
        if (!f) return "";
        if (f.status === 'singular') return t("evolute_status_undefined");
        const e = this.evolutePoint();
        if (!e) return t("evolute_status_none");
        const num = (value: number) => formatNumber(value, currentLanguage(), 4);
        return t("evolute_point_value", {value0: num(e[0]), value1: num(e[1])});
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private traceData(): EvoluteTrace {
        const points = this.settings.controlPoints();
        const mode = this.settings.traceMode();
        if (!points || mode === 'hidden') return {x: [], y: []};
        return evoluteTrace(points, mode === 'to-parameter' ? this.settings.parameter() : 1);
    }

    private build() {
        const auxiliary = {visible: false, fixed: true, withLabel: false, highlight: false, name: ''};
        const hasFrame = () => { const f = this.frame(); return !!f && f.status !== 'singular'; };
        const normalShown = () => hasFrame() && this.settings.normalShown();
        const hasEvolute = () => this.evolutePoint() !== undefined;

        const trace = this.create<DataCurve>('curve', [[], []], {
            fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2,
            visible: () => this.settings.traceMode() !== 'hidden',
        });
        trace.updateDataArray = () => {
            const data = this.traceData();
            trace.dataX = data.x;
            trace.dataY = data.y;
        };
        // Creation ran the default (empty) data; draw the real trace now rather than at the next board update.
        trace.needsUpdate = true;
        trace.update();

        // The normal line: through the curve point along the kernel's unit normal; the evolute point lies on it.
        const anchor = this.create<Point>('point', [() => this.frame()?.point[0] ?? NaN, () => this.frame()?.point[1] ?? NaN], auxiliary);
        const along = this.create<Point>('point', [
            () => { const f = this.frame(); return f && f.status !== 'singular' ? f.point[0] + f.scale * f.normal[0] : NaN; },
            () => { const f = this.frame(); return f && f.status !== 'singular' ? f.point[1] + f.scale * f.normal[1] : NaN; },
        ], auxiliary);
        this.create<Line>('line', [anchor, along], {
            fixed: true, highlight: false, withLabel: false, straightFirst: true, straightLast: true,
            strokeColor: GraphPalette.constructionAccent, strokeWidth: 1.5, dash: 2, visible: normalShown,
        });

        // The evolute point: a diamond with the tag E, so it is told apart without colour.
        const point = this.create<Point>('point', [() => this.evolutePoint()?.[0] ?? NaN, () => this.evolutePoint()?.[1] ?? NaN], {
            ...auxiliary, visible: hasEvolute, size: 4, face: '<>', strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve,
        });
        this.create<Text>('text', [() => point.X(), () => point.Y(), "E"], {
            fixed: true, highlight: false, useMathJax: false, anchorX: 'left', anchorY: 'bottom',
            fontSize: () => this.settings.fontSize(), strokeColor: GraphPalette.label, visible: hasEvolute,
        });

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** Removes every owned element (later ones first) and releases the language subscription. Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.stopLanguageUpdates?.();
        this.stopLanguageUpdates = undefined;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        if (present.length) this.board.removeObject(present);
    }
}
