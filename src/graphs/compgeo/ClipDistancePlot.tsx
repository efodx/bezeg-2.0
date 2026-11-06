import React, {useEffect, useRef} from "react";
import {useT} from "../../localization";
import type {ClipRange, DistancePoint} from "../../bezeg/impl/kernels/bezier-clipping";
import type {ClippingStepView} from "./bezierClippingView";
import "../curves/offset/SpeedFactorPlot.css";

const W = 300;
const H = 170;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;
const DEFAULT_FONT_SIZE = 20;
const MARK = 3;
const Y_MARGIN = 0.08;

const round = (value: number) => Math.round(value * 100) / 100;
const px = (t: number) => PAD_LEFT + t * (W - PAD_LEFT - PAD_RIGHT);

/** The vertices of the convex hull of the points (t, d), counter-clockwise from the leftmost; collinear points leave their two ends. */
export function distanceHull(points: readonly DistancePoint[]): DistancePoint[] {
    const sorted = [...points].sort((p, q) => p.t - q.t || p.d - q.d);
    const unique = sorted.filter((p, i) => i === 0 || p.t !== sorted[i - 1].t || p.d !== sorted[i - 1].d);
    if (unique.length < 3) return unique;
    const cross = (o: DistancePoint, a: DistancePoint, b: DistancePoint) => (a.t - o.t) * (b.d - o.d) - (a.d - o.d) * (b.t - o.t);
    const chain = (input: readonly DistancePoint[]) => {
        const out: DistancePoint[] = [];
        for (const p of input) {
            while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
            out.push(p);
        }
        out.pop();
        return out;
    };
    const lower = chain(unique);
    const upper = chain([...unique].reverse());
    const hull = [...lower, ...upper];
    // All collinear: both chains collapse to the two ends.
    return hull.length < 3 ? [unique[0], unique[unique.length - 1]] : hull;
}

/** The vertical range of the plot: the points and the band with a margin, and a nonzero span when they are all equal. */
export function distanceYRange(view: ClippingStepView): ClipRange {
    const values = [...view.distance.map(p => p.d), view.band[0], view.band[1]];
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo;
    if (!(span > 0)) return [lo - 1, hi + 1];
    return [lo - span * Y_MARGIN, hi + span * Y_MARGIN];
}

/** The path data of every part of the inset for one view; `y` maps a signed distance to the plot's pixel row. */
export interface ClipDistancePaths {
    points: string;
    hull: string;
    band: string;
    bandEdges: string;
    zero: string;
    clipped: string;
    clippedEnds: string;
}

export function clipDistancePaths(view: ClippingStepView): ClipDistancePaths {
    const [yLo, yHi] = distanceYRange(view);
    const py = (d: number) => PAD_TOP + (yHi - d) / (yHi - yLo) * (H - PAD_TOP - PAD_BOTTOM);
    const at = (p: DistancePoint) => `${round(px(p.t))} ${round(py(p.d))}`;
    const hull = distanceHull(view.distance);
    const [b0, b1] = [round(py(view.band[1])), round(py(view.band[0]))];
    const bottom = H - PAD_BOTTOM;
    const clipped = view.clippedLocal;
    return {
        points: view.distance.map(p => `M${round(px(p.t) - MARK)} ${round(py(p.d))} L${round(px(p.t) + MARK)} ${round(py(p.d))} M${round(px(p.t))} ${round(py(p.d) - MARK)} L${round(px(p.t))} ${round(py(p.d) + MARK)}`).join(" "),
        hull: hull.length === 0 ? "" : hull.map((p, i) => `${i === 0 ? "M" : "L"}${at(p)}`).join(" ") + (hull.length >= 3 ? " Z" : ""),
        band: `M${px(0)} ${b0} L${px(1)} ${b0} L${px(1)} ${b1} L${px(0)} ${b1} Z`,
        bandEdges: `M${px(0)} ${b0} L${px(1)} ${b0} M${px(0)} ${b1} L${px(1)} ${b1}`,
        zero: yLo < 0 && yHi > 0 ? `M${px(0)} ${round(py(0))} L${px(1)} ${round(py(0))}` : "",
        clipped: clipped ? `M${round(px(clipped[0]))} ${bottom} L${round(px(clipped[1]))} ${bottom}` : "",
        clippedEnds: clipped ? clipped.map(t => `M${round(px(t))} ${bottom} L${round(px(t))} ${PAD_TOP}`).join(" ") : "",
    };
}

interface InsetElements {
    points: SVGPathElement;
    hull: SVGPathElement;
    band: SVGPathElement;
    bandEdges: SVGPathElement;
    zero: SVGPathElement;
    clipped: SVGPathElement;
    clippedEnds: SVGPathElement;
    captions: Record<"A" | "B" | "none", HTMLElement>;
}

/**
 * The imperative link between the graph and the inset, as ArcSpeedPlotController: the graph owns one and pushes the shown step's
 * view (or null for none), and the mounted component's elements are written directly, so a step, tolerance change or drag
 * renders no inset React. A remount registers new elements and redraws the last view.
 */
export class ClipDistancePlotController {
    private elements?: InsetElements;
    private view: ClippingStepView | null = null;

    push(view: ClippingStepView | null): void {
        this.view = view;
        this.write();
    }

    lastView(): ClippingStepView | null { return this.view; }

    register(elements: InsetElements): () => void {
        this.elements = elements;
        this.write();
        return () => { if (this.elements === elements) this.elements = undefined; };
    }

    private write(): void {
        const el = this.elements;
        if (!el) return;
        const paths: ClipDistancePaths | null = this.view ? clipDistancePaths(this.view) : null;
        for (const key of ["points", "hull", "band", "bandEdges", "zero", "clipped", "clippedEnds"] as const) {
            el[key].setAttribute("d", paths ? paths[key] : "");
        }
        const shown = this.view ? this.view.target : "none";
        for (const key of ["A", "B", "none"] as const) el.captions[key].hidden = key !== shown;
    }
}

/**
 * The distance of the clipped curve's sub-net to the fat line of the other, over its own parameter 0 to 1: the control points
 * (crosses), their convex hull (solid outline), the band (dashed edges on a tint) and the kept range (thick bar). Written by the
 * controller, not by React. Without a clip to show it keeps its place and says so.
 */
export function ClipDistancePlot(props: {controller: ClipDistancePlotController, fontSize?: number}) {
    const t = useT();
    const {controller} = props;
    const points = useRef<SVGPathElement>(null);
    const hull = useRef<SVGPathElement>(null);
    const band = useRef<SVGPathElement>(null);
    const bandEdges = useRef<SVGPathElement>(null);
    const zero = useRef<SVGPathElement>(null);
    const clipped = useRef<SVGPathElement>(null);
    const clippedEnds = useRef<SVGPathElement>(null);
    const captionA = useRef<HTMLSpanElement>(null);
    const captionB = useRef<HTMLSpanElement>(null);
    const captionNone = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const [p, h, b, be, z, c, ce] = [points.current, hull.current, band.current, bandEdges.current, zero.current, clipped.current, clippedEnds.current];
        const [ca, cb, cn] = [captionA.current, captionB.current, captionNone.current];
        if (!p || !h || !b || !be || !z || !c || !ce || !ca || !cb || !cn) return undefined;
        return controller.register({points: p, hull: h, band: b, bandEdges: be, zero: z, clipped: c, clippedEnds: ce, captions: {A: ca, B: cb, none: cn}});
    }, [controller]);
    const size = Math.max(10, Math.round((props.fontSize ?? DEFAULT_FONT_SIZE) * 0.65));
    const ink = {stroke: "var(--workspace-ink)"};
    return <figure className="speed-factor-plot" data-bezier-clipping="inset">
        <figcaption data-bezier-clipping="inset-caption">
            <span ref={captionA} hidden>{t("bezierclipping_inset_caption_a")}</span>
            <span ref={captionB} hidden>{t("bezierclipping_inset_caption_b")}</span>
            <span ref={captionNone}>{t("bezierclipping_inset_caption_none")}</span>
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("bezierclipping_inset_aria")} className="speed-factor-plot-svg"
             data-bezier-clipping="inset-svg">
            <line x1={PAD_LEFT} x2={PAD_LEFT} y1={PAD_TOP} y2={H - PAD_BOTTOM} className="speed-factor-plot-axis"/>
            <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={H - PAD_BOTTOM} y2={H - PAD_BOTTOM} className="speed-factor-plot-axis"/>
            {[0, 1].map(x => <text key={x} x={px(x)} y={H - size * 0.4} textAnchor="middle" className="speed-factor-plot-label"
                                   style={{fontSize: size}}>{x}</text>)}
            <path ref={band} data-bezier-clipping="inset-band" style={{fill: "var(--workspace-ink-soft)", fillOpacity: 0.18, stroke: "none"}}/>
            <path ref={bandEdges} data-bezier-clipping="inset-band-edges" fill="none" strokeDasharray="6 4" strokeWidth={1.5} style={ink}/>
            <path ref={zero} data-bezier-clipping="inset-zero" fill="none" strokeWidth={1} strokeDasharray="1 3" style={ink}/>
            <path ref={hull} data-bezier-clipping="inset-hull" fill="none" strokeWidth={2} style={ink}/>
            <path ref={points} data-bezier-clipping="inset-points" fill="none" strokeWidth={1.5} style={ink}/>
            <path ref={clippedEnds} data-bezier-clipping="inset-clipped-ends" fill="none" strokeWidth={1} strokeDasharray="2 2" style={ink}/>
            <path ref={clipped} data-bezier-clipping="inset-clipped" fill="none" strokeWidth={5} strokeLinecap="butt" style={ink}/>
        </svg>
        <p className="inspector-help" data-bezier-clipping="inset-legend">{t("bezierclipping_inset_legend")}</p>
    </figure>;
}
