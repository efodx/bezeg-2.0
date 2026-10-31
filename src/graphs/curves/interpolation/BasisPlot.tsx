import React, {useId} from "react";
import {currentLanguage, useT} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {BasisPlotData, BasisSamples} from "./interpolationBasis";
import "./BasisPlot.css";

const W = 300;
const H = 170;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
/** The display font size (px) the plot text follows; the drawing is about as wide as the side panel, so one unit is about one pixel. */
export const BASIS_DEFAULT_FONT_SIZE = 20;
const tickSize = (fontSize: number) => Math.max(10, Math.round(fontSize * 0.65));

/** One colour per curve index, the same in both plots (hues spread around the wheel; readable on light and dark panels). */
export const basisColor = (index: number, count: number): string => `hsl(${Math.round(360 * index / Math.max(1, count))} 70% 45%)`;

export interface PlotScale {
    readonly xMin: number; readonly xMax: number; readonly yMin: number; readonly yMax: number;
    /** The extreme sampled values (without the margin), labelled on the vertical axis when they leave [0, 1]. */
    readonly dataMin: number; readonly dataMax: number;
    readonly padLeft: number; readonly padBottom: number;
}

const px = (scale: PlotScale, x: number) => scale.padLeft + (x - scale.xMin) / (scale.xMax - scale.xMin) * (W - scale.padLeft - PAD_RIGHT);
const py = (scale: PlotScale, y: number) => H - scale.padBottom - (y - scale.yMin) / (scale.yMax - scale.yMin) * (H - PAD_TOP - scale.padBottom);

const round = (value: number) => Math.round(value * 100) / 100;

/** SVG path data of a sampled curve ("M x y L x y ..."); exported so tests can compare the drawn path with the samples. */
export function pathOf(samples: BasisSamples, scale: PlotScale): string {
    return samples.map(([x, y], k) => `${k === 0 ? "M" : "L"}${round(px(scale, x))} ${round(py(scale, y))}`).join(" ");
}

/** The vertical range of a plot: the values 0 and 1 and every sampled value, with the room the text size needs. */
export function scaleOf(curves: readonly BasisSamples[], xMax: number, fontSize = BASIS_DEFAULT_FONT_SIZE): PlotScale {
    let yMin = 0;
    let yMax = 1;
    for (const curve of curves) for (const [, y] of curve) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
    const margin = (yMax - yMin) * 0.05;
    const size = tickSize(fontSize);
    return {xMin: 0, xMax, yMin: yMin - margin, yMax: yMax + margin, dataMin: yMin, dataMax: yMax,
        padLeft: Math.round(size * 3.4), padBottom: Math.round(size * 2)};
}

interface PanelProps {
    testId: string;
    title: string;
    curves: readonly BasisSamples[];
    marker: {readonly x: number; readonly values: readonly number[]};
    xMax: number;
    fontSize: number;
}

function Panel(props: PanelProps) {
    const t = useT();
    const language = currentLanguage();
    const id = useId();
    const {curves, marker, xMax} = props;
    const scale = scaleOf(curves, xMax, props.fontSize);
    const size = tickSize(props.fontSize);
    const n = curves.length;
    const label = (value: number) => formatNumber(value, language, 2);
    // The vertical axis is labelled 0, 1 and, when a curve leaves [0, 1], the extreme actually reached.
    const gap = (scale.dataMax - scale.dataMin) * 0.12;
    const yTicks = [0, 1];
    if (scale.dataMax > 1 + gap) yTicks.push(scale.dataMax);
    if (scale.dataMin < -gap) yTicks.push(scale.dataMin);
    const description = t("interp_basis_desc", {value0: n, value1: label(marker.x), value2: marker.values.map(label).join("; ")});
    return <figure className="basis-plot-panel" data-testid={props.testId}>
        <figcaption>{props.title}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className="basis-plot-svg">
            <title id={`${id}-title`}>{props.title}</title>
            <desc id={`${id}-desc`}>{description}</desc>
            {[0, 1].map(y => <line key={y} x1={scale.padLeft} x2={W - PAD_RIGHT} y1={py(scale, y)} y2={py(scale, y)} className="basis-plot-axis"/>)}
            <line x1={px(scale, 0)} x2={px(scale, 0)} y1={PAD_TOP} y2={H - scale.padBottom} className="basis-plot-axis"/>
            {yTicks.map(y => <text key={y} x={scale.padLeft - 4} y={py(scale, y) + size * 0.35} textAnchor="end" className="basis-plot-label"
                                   style={{fontSize: size}}>{label(y)}</text>)}
            {[0, xMax].map(x => <text key={x} x={px(scale, x)} y={H - size * 0.4} textAnchor="middle" className="basis-plot-label"
                                      style={{fontSize: size}}>{label(x)}</text>)}
            {curves.map((curve, i) => <path key={i} d={pathOf(curve, scale)} data-index={i} fill="none" stroke={basisColor(i, n)} strokeWidth={2}/>)}
            <line x1={px(scale, marker.x)} x2={px(scale, marker.x)} y1={PAD_TOP} y2={H - scale.padBottom} className="basis-plot-marker-line"
                  data-testid={`${props.testId}-marker-line`}/>
            {marker.values.map((value, i) => <circle key={i} cx={px(scale, marker.x)} cy={py(scale, value)} r={4} fill={basisColor(i, n)}
                                                     className="basis-plot-marker" data-index={i}/>)}
        </svg>
    </figure>;
}

/**
 * The Lagrange basis polynomials on [0, t_n] beside the Bernstein basis on [0, 1], with the shared position s marked on both.
 * The index of a curve is shown by a legend (colour and number) as well as by its colour, so it does not rest on hue alone.
 */
export function BasisPlot(props: {data: BasisPlotData; fontSize?: number}) {
    const t = useT();
    const {data} = props;
    const fontSize = props.fontSize ?? BASIS_DEFAULT_FONT_SIZE;
    return <div className="basis-plot" data-testid="basis-plot">
        <Panel testId="basis-lagrange" title={t("interp_basis_lagrange")} curves={data.lagrange} marker={data.lagrangeMarker} xMax={data.tEnd}
               fontSize={fontSize}/>
        <Panel testId="basis-bernstein" title={t("interp_basis_bernstein")} curves={data.bernstein} marker={data.bernsteinMarker} xMax={1}
               fontSize={fontSize}/>
        <ul className="basis-legend" aria-label={t("interp_basis_index")} style={{fontSize: tickSize(fontSize) + 2}}>
            {data.lagrange.map((_, i) => <li key={i} data-testid="basis-legend-item">
                <span className="basis-legend-swatch" style={{background: basisColor(i, data.lagrange.length)}} aria-hidden="true"/>{i}
            </li>)}
        </ul>
        <p className="inspector-help">{t("interp_basis_help")}</p>
    </div>;
}

export default BasisPlot;
