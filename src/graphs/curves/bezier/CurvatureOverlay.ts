import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GraphPalette} from "../../styles/GraphPalette";
import {curvatureAt, osculatingCircle, polynomialBezierSource, Vec2} from "../../../bezeg/impl/curve/curvature";

/** Length of the drawn T and N arrows, as a fraction of the curve's extent (the kernel's scale). */
export const FRAME_ARROW_FRACTION = 0.2;
/** Half length of the drawn tangent line (shown where the osculating circle degenerates) as a multiple of the extent. */
const LINE_HALF_LENGTH = 50;

export type CurvatureFrame =
    | { status: 'circle', point: Vec2, tangent: Vec2, normal: Vec2, kappa: number, radius: number, centre: Vec2, scale: number }
    | { status: 'line', point: Vec2, tangent: Vec2, normal: Vec2, kappa: number, scale: number }
    | { status: 'singular', point: Vec2, scale: number };

/**
 * The Frenet frame and osculating circle of the polynomial Bezier curve with these control points at t.
 * All curvature quantities come from the curvature kernel; this function only combines them.
 */
export function curvatureFrame(controlPoints: ReadonlyArray<ReadonlyArray<number>>, t: number): CurvatureFrame | undefined {
    if (controlPoints.length < 2 || !Number.isFinite(t)) return undefined;
    const source = polynomialBezierSource(controlPoints);
    const {point, d1, d2} = source.at(t);
    const curvature = curvatureAt(d1, d2, source.scale);
    if (curvature.kind === 'singular') return {status: 'singular', point, scale: source.scale};
    const circle = osculatingCircle(point, d1, d2, source.scale);
    if (circle.kind === 'circle') {
        return {status: 'circle', point, tangent: curvature.tangent, normal: curvature.normal, kappa: curvature.kappa,
            radius: circle.radius, centre: circle.centre, scale: source.scale};
    }
    if (circle.kind === 'line') {
        return {status: 'line', point, tangent: curvature.tangent, normal: curvature.normal, kappa: curvature.kappa, scale: source.scale};
    }
    return {status: 'singular', point, scale: source.scale};
}

/** Angle of the unit tangent against the positive x axis in degrees, in (-180, 180]; never negative zero. */
export function tangentAngleDegrees(tangent: Vec2): number {
    const degrees = Math.atan2(tangent[1], tangent[0]) * 180 / Math.PI;
    return degrees === 0 ? 0 : degrees;
}

interface OverlaySettings {
    board: Board;
    /** Control points of the curve being studied, read lazily so dragging needs no listener. */
    controlPoints: () => ReadonlyArray<ReadonlyArray<number>> | undefined;
    parameter: () => number;
    fontSize: () => number;
}

/**
 * One owned overlay: Frenet frame arrows, the osculating circle (or tangent line), and readouts. Every element is
 * created here and removed by {@link dispose}; the elements read the curve lazily, so no drag listener exists. The one
 * subscription (language change, for board text) is released in dispose too.
 */
export class CurvatureOverlay {
    private readonly board: Board;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;

    constructor(private readonly settings: OverlaySettings) {
        this.board = settings.board;
        this.build();
    }

    /** The created elements, for ownership checks. */
    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    private frame(): CurvatureFrame | undefined {
        const points = this.settings.controlPoints();
        return points ? curvatureFrame(points, this.settings.parameter()) : undefined;
    }

    private arrowTip(which: 'tangent' | 'normal', axis: 0 | 1): number {
        const f = this.frame();
        if (!f || f.status === 'singular') return NaN;
        return f.point[axis] + FRAME_ARROW_FRACTION * f.scale * f[which][axis];
    }

    private lineEnd(sign: 1 | -1, axis: 0 | 1): number {
        const f = this.frame();
        return f?.status === 'line' ? f.point[axis] + sign * LINE_HALF_LENGTH * f.scale * f.tangent[axis] : NaN;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const board = this.board;
        const font = () => this.settings.fontSize();
        const hasFrame = () => { const f = this.frame(); return !!f && f.status !== 'singular'; };
        const isCircle = () => this.frame()?.status === 'circle';
        const isLine = () => this.frame()?.status === 'line';
        const auxiliary = {visible: false, fixed: true, withLabel: false, highlight: false, name: ''};

        const anchor = this.create<Point>('point', [() => this.frame()?.point[0] ?? NaN, () => this.frame()?.point[1] ?? NaN], auxiliary);
        const tangentTip = this.create<Point>('point', [() => this.arrowTip('tangent', 0), () => this.arrowTip('tangent', 1)], auxiliary);
        const normalTip = this.create<Point>('point', [() => this.arrowTip('normal', 0), () => this.arrowTip('normal', 1)], auxiliary);
        const centre = this.create<Point>('point', [
            () => { const f = this.frame(); return f?.status === 'circle' ? f.centre[0] : NaN; },
            () => { const f = this.frame(); return f?.status === 'circle' ? f.centre[1] : NaN; },
        ], {...auxiliary, visible: isCircle, size: 2, strokeColor: GraphPalette.constructionAccent, fillColor: GraphPalette.constructionAccent});
        const lineNear = this.create<Point>('point', [() => this.lineEnd(-1, 0), () => this.lineEnd(-1, 1)], auxiliary);
        const lineFar = this.create<Point>('point', [() => this.lineEnd(1, 0), () => this.lineEnd(1, 1)], auxiliary);

        const arrow = {fixed: true, highlight: false, withLabel: false, lastArrow: {type: 2, size: 6}, strokeWidth: 2.5, visible: hasFrame};
        this.create('segment', [anchor, tangentTip], {...arrow, strokeColor: GraphPalette.primaryCurve});
        // The normal is dashed, so T and N differ without colour as well as by their text tags.
        this.create('segment', [anchor, normalTip], {...arrow, strokeColor: GraphPalette.comparisonCurve, dash: 2});
        const tag = (name: string, tip: Point) => this.create<Text>('text', [() => tip.X(), () => tip.Y(), name], {
            fixed: true, highlight: false, useMathJax: false, anchorX: 'left', anchorY: 'bottom',
            fontSize: font, strokeColor: GraphPalette.label, visible: hasFrame,
        });
        tag('T', tangentTip);
        tag('N', normalTip);

        this.create('circle', [centre, () => { const f = this.frame(); return f?.status === 'circle' ? f.radius : 0; }], {
            fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2,
            dash: 3, fillColor: 'none', fillOpacity: 0, visible: isCircle,
        });
        this.create('line', [lineNear, lineFar], {
            fixed: true, highlight: false, withLabel: false, straightFirst: false, straightLast: false,
            strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, dash: 3, visible: isLine,
        });

        const box = () => board.getBoundingBox();
        this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => this.readoutText(),
        ], {
            anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false,
            fontSize: font, strokeColor: () => this.frame()?.status === 'circle' ? GraphPalette.label : GraphPalette.warningText,
        });

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && board.renderer) board.update();
        });
    }

    /** The text readout: kappa and radius, or the status for a line or a singular point. */
    readoutText(): string {
        const f = this.frame();
        if (!f) return "";
        const num = (value: number) => formatNumber(value, currentLanguage(), 4);
        if (f.status === 'singular') return t("curvature_status_singular");
        const angle = t("curvature_angle_value", {value0: num(tangentAngleDegrees(f.tangent))});
        if (f.status === 'line') return `${t("curvature_kappa_value", {value0: num(0)})}\n${t("curvature_status_line")}\n${angle}`;
        return `${t("curvature_kappa_value", {value0: num(f.kappa)})}\n${t("curvature_radius_value", {value0: num(f.radius)})}\n${angle}`;
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
