import React, {useEffect, useRef} from "react";
import {useT} from "../../../localization";
import "./SpeedFactorPlot.css";

const W = 300;
const H = 170;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;
/** The fixed vertical range of the plot; values outside it are not drawn. */
export const SPEED_PLOT_Y_MIN = -2;
export const SPEED_PLOT_Y_MAX = 3;
/** The display font size (px) the tick text follows. */
const DEFAULT_FONT_SIZE = 20;

const px = (t: number) => PAD_LEFT + t * (W - PAD_LEFT - PAD_RIGHT);
const py = (y: number) => H - PAD_BOTTOM - (y - SPEED_PLOT_Y_MIN) / (SPEED_PLOT_Y_MAX - SPEED_PLOT_Y_MIN) * (H - PAD_TOP - PAD_BOTTOM);
const round = (value: number) => Math.round(value * 100) / 100;

export interface SpeedFactorPlotData {
    t: readonly number[];
    factor: readonly number[];
    /** The parameter of each cusp. */
    cusps: readonly number[];
}

/** SVG path data of 1 + d*kappa: a NaN or out-of-range sample ends the current run, so no segment joins across it. */
export function speedFactorPathData(data: SpeedFactorPlotData): string {
    const parts: string[] = [];
    let drawing = false;
    data.t.forEach((t, i) => {
        const y = data.factor[i];
        if (!Number.isFinite(y) || y < SPEED_PLOT_Y_MIN || y > SPEED_PLOT_Y_MAX) { drawing = false; return; }
        parts.push(`${drawing ? "L" : "M"}${round(px(t))} ${round(py(y))}`);
        drawing = true;
    });
    return parts.join(" ");
}

/** One vertical tick at each cusp parameter, over the full plot height. */
export function cuspTickPathData(cusps: readonly number[]): string {
    return cusps.filter(t => Number.isFinite(t) && t >= 0 && t <= 1)
        .map(t => `M${round(px(t))} ${PAD_TOP} L${round(px(t))} ${H - PAD_BOTTOM}`).join(" ");
}

interface PlotPaths {
    curve: SVGPathElement;
    cusps: SVGPathElement;
}

/**
 * The imperative link between the board overlay and the plot. The graph owns one, so it survives overlay recreation; the
 * overlay pushes the samples on every board update and the mounted component writes them straight to its paths, so a drag
 * renders no React. A component that mounts later replays the last data.
 */
export class SpeedFactorPlotController {
    private paths?: PlotPaths;
    private last?: SpeedFactorPlotData;

    push(data: SpeedFactorPlotData): void {
        this.last = data;
        this.write();
    }

    /** The last data pushed, for tests. */
    lastData(): SpeedFactorPlotData | undefined { return this.last; }

    register(paths: PlotPaths): () => void {
        this.paths = paths;
        this.write();
        return () => { if (this.paths === paths) this.paths = undefined; };
    }

    private write(): void {
        if (!this.paths) return;
        this.paths.curve.setAttribute("d", this.last ? speedFactorPathData(this.last) : "");
        this.paths.cusps.setAttribute("d", this.last ? cuspTickPathData(this.last.cusps) : "");
    }
}

/** The graph of the offset's speed factor 1 + d*kappa over t in [0, 1]; its curve is written by the controller, not by React. */
export function SpeedFactorPlot(props: {controller: SpeedFactorPlotController; fontSize?: number}) {
    const t = useT();
    const curve = useRef<SVGPathElement>(null);
    const cusps = useRef<SVGPathElement>(null);
    const {controller} = props;
    useEffect(() => {
        if (!curve.current || !cusps.current) return undefined;
        return controller.register({curve: curve.current, cusps: cusps.current});
    }, [controller]);
    const size = Math.max(10, Math.round((props.fontSize ?? DEFAULT_FONT_SIZE) * 0.65));
    const label = t("offset_speed_plot_aria");
    return <figure className="speed-factor-plot" data-testid="offset-speed-plot-panel">
        <figcaption>{t("offset_speed_plot_title")}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="speed-factor-plot-svg" data-testid="offset-speed-plot">
            <line x1={PAD_LEFT} x2={PAD_LEFT} y1={PAD_TOP} y2={H - PAD_BOTTOM} className="speed-factor-plot-axis"/>
            <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={py(SPEED_PLOT_Y_MIN)} y2={py(SPEED_PLOT_Y_MIN)} className="speed-factor-plot-axis"/>
            <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={py(0)} y2={py(0)} className="speed-factor-plot-zero"/>
            {[SPEED_PLOT_Y_MIN, 0, SPEED_PLOT_Y_MAX].map(y => <text key={y} x={PAD_LEFT - 4} y={py(y) + size * 0.35} textAnchor="end"
                                                                    className="speed-factor-plot-label" style={{fontSize: size}}>{y}</text>)}
            {[0, 1].map(x => <text key={x} x={px(x)} y={H - size * 0.4} textAnchor="middle" className="speed-factor-plot-label"
                                   style={{fontSize: size}}>{x}</text>)}
            <path ref={cusps} className="speed-factor-plot-cusps" data-testid="offset-speed-plot-cusps"/>
            <path ref={curve} className="speed-factor-plot-curve" data-testid="offset-speed-plot-curve"/>
        </svg>
    </figure>;
}
