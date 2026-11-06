import React, {useEffect, useRef} from "react";
import {useT} from "../../../localization";
import "../offset/SpeedFactorPlot.css";

const W = 300;
const H = 170;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;
const DEFAULT_FONT_SIZE = 20;
const MARKER_RADIUS = 4;

const round = (value: number) => Math.round(value * 100) / 100;
const px = (t: number) => PAD_LEFT + t * (W - PAD_LEFT - PAD_RIGHT);

export interface ArcSpeedPlotData {
    t: readonly number[];
    speed: readonly number[];
    /** Parameters where the speed vanishes. */
    cusps: readonly number[];
}

/** The top of the vertical axis: the largest speed with a margin, or 1 when the curve does not move. */
export function arcSpeedYMax(data: ArcSpeedPlotData): number {
    const largest = Math.max(0, ...data.speed.filter(Number.isFinite));
    return largest > 0 ? largest * 1.1 : 1;
}

const py = (y: number, yMax: number) => H - PAD_BOTTOM - y / yMax * (H - PAD_TOP - PAD_BOTTOM);

/** SVG path data of |B'(t)|; a non-finite sample ends the current run. */
export function arcSpeedPathData(data: ArcSpeedPlotData): string {
    const yMax = arcSpeedYMax(data);
    const parts: string[] = [];
    let drawing = false;
    data.t.forEach((t, i) => {
        const y = data.speed[i];
        if (!Number.isFinite(y)) { drawing = false; return; }
        parts.push(`${drawing ? "L" : "M"}${round(px(t))} ${round(py(y, yMax))}`);
        drawing = true;
    });
    return parts.join(" ");
}

/** One vertical tick at each cusp parameter, over the full plot height. */
export function arcCuspTickPathData(cusps: readonly number[]): string {
    return cusps.filter(t => Number.isFinite(t) && t >= 0 && t <= 1)
        .map(t => `M${round(px(t))} ${PAD_TOP} L${round(px(t))} ${H - PAD_BOTTOM}`).join(" ");
}

/** The marker at the mover: a vertical guide and a ring on the curve. */
export function arcMarkerGeometry(data: ArcSpeedPlotData, marker: { t: number, speed: number }): { guide: string, cx: number, cy: number } {
    const yMax = arcSpeedYMax(data);
    const x = round(px(Math.min(1, Math.max(0, marker.t))));
    return {guide: `M${x} ${H - PAD_BOTTOM} L${x} ${PAD_TOP}`, cx: x, cy: round(py(Math.min(yMax, Math.max(0, marker.speed)), yMax))};
}

interface PlotElements {
    curve: SVGPathElement;
    cusps: SVGPathElement;
    guide: SVGPathElement;
    ring: SVGCircleElement;
}

/**
 * The imperative link between the board overlay and the plot, as SpeedFactorPlotController: the graph owns one, the overlay
 * pushes the samples and the mover marker, and the mounted component's elements are written directly, so a drag or a
 * playback frame renders no React.
 */
export class ArcSpeedPlotController {
    private elements?: PlotElements;
    private data?: ArcSpeedPlotData;
    private marker?: { t: number, speed: number };

    push(data: ArcSpeedPlotData): void {
        this.data = data;
        this.write();
    }

    setMarker(t: number, speed: number): void {
        this.marker = {t, speed};
        this.writeMarker();
    }

    lastData(): ArcSpeedPlotData | undefined { return this.data; }
    lastMarker(): { t: number, speed: number } | undefined { return this.marker; }

    register(elements: PlotElements): () => void {
        this.elements = elements;
        this.write();
        return () => { if (this.elements === elements) this.elements = undefined; };
    }

    private write(): void {
        if (!this.elements) return;
        this.elements.curve.setAttribute("d", this.data ? arcSpeedPathData(this.data) : "");
        this.elements.cusps.setAttribute("d", this.data ? arcCuspTickPathData(this.data.cusps) : "");
        this.writeMarker();
    }

    private writeMarker(): void {
        const el = this.elements;
        if (!el) return;
        if (!this.data || !this.marker) {
            el.guide.setAttribute("d", "");
            el.ring.setAttribute("visibility", "hidden");
            return;
        }
        const {guide, cx, cy} = arcMarkerGeometry(this.data, this.marker);
        el.guide.setAttribute("d", guide);
        el.ring.setAttribute("cx", String(cx));
        el.ring.setAttribute("cy", String(cy));
        el.ring.setAttribute("visibility", "visible");
    }
}

/** The graph of the speed |B'(t)| over t in [0, 1] with the mover marker and cusp ticks; written by the controller, not by React. */
export function ArcSpeedPlot(props: { controller: ArcSpeedPlotController, fontSize?: number }) {
    const t = useT();
    const curve = useRef<SVGPathElement>(null);
    const cusps = useRef<SVGPathElement>(null);
    const guide = useRef<SVGPathElement>(null);
    const ring = useRef<SVGCircleElement>(null);
    const {controller} = props;
    useEffect(() => {
        if (!curve.current || !cusps.current || !guide.current || !ring.current) return undefined;
        return controller.register({curve: curve.current, cusps: cusps.current, guide: guide.current, ring: ring.current});
    }, [controller]);
    const size = Math.max(10, Math.round((props.fontSize ?? DEFAULT_FONT_SIZE) * 0.65));
    return <figure className="speed-factor-plot" data-testid="arc-speed-plot-panel">
        <figcaption>{t("arcparam_speed_plot_title")}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("arcparam_speed_plot_aria")} className="speed-factor-plot-svg"
             data-testid="arc-speed-plot">
            <line x1={PAD_LEFT} x2={PAD_LEFT} y1={PAD_TOP} y2={H - PAD_BOTTOM} className="speed-factor-plot-axis"/>
            <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={H - PAD_BOTTOM} y2={H - PAD_BOTTOM} className="speed-factor-plot-axis"/>
            <text x={PAD_LEFT - 4} y={H - PAD_BOTTOM + size * 0.35} textAnchor="end" className="speed-factor-plot-label" style={{fontSize: size}}>0</text>
            {[0, 1].map(x => <text key={x} x={px(x)} y={H - size * 0.4} textAnchor="middle" className="speed-factor-plot-label"
                                   style={{fontSize: size}}>{x}</text>)}
            <path ref={cusps} className="speed-factor-plot-cusps" data-testid="arc-speed-plot-cusps"/>
            <path ref={curve} className="speed-factor-plot-curve" data-testid="arc-speed-plot-curve"/>
            <path ref={guide} className="speed-factor-plot-zero" data-testid="arc-speed-plot-guide"/>
            <circle ref={ring} r={MARKER_RADIUS} className="speed-factor-plot-curve" fill="none" visibility="hidden" data-testid="arc-speed-plot-marker"/>
        </svg>
    </figure>;
}
