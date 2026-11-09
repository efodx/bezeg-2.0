import React, {useId} from "react";
import {currentLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {FourierDecayScale} from "../../analysis/fourierCoefficientsModel";
import {FourierExampleId} from "../../analysis/fourierExamples";
import {
    FOURIER_DECAY_REFERENCES, FOURIER_LOG_MIN_EXPONENT, fourierAmplitudes, fourierLogAxis, isZeroAmplitude,
} from "../../analysis/fourierDecay";
import {ReadoutHelp} from "../base/controls/ReadoutParts";
import "./FourierDecaySpectra.css";

const W = 240;
const H = 150;
const PAD_LEFT = 52;
const PAD_RIGHT = 6;
const PAD_TOP = 8;
const PAD_BOTTOM = 24;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;
const baseline = PAD_TOP + PLOT_H;
/** Tick and k labels are HTML spans over the scaled svg, positioned in percent and sized in CSS rem (.75rem = 12 px), so they do not shrink with the viewBox. */
const pctX = (x: number) => `${((x / W) * 100).toFixed(3)}%`;
const pctY = (y: number) => `${((y / H) * 100).toFixed(3)}%`;

const SUPERSCRIPT: Record<string, string> = {"-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"};
/** 10^e as text: 10⁻⁸. */
export const powerOfTen = (exponent: number): string => "10" + String(exponent).split("").map(c => SUPERSCRIPT[c]).join("");

/** An amplitude as the table shows it: exact zeros as 0, very small values in exponent form, so 2,203e-6 is not shown as 0. */
export function amplitudeText(value: number, language: "sl" | "en"): string {
    if (isZeroAmplitude(value)) return "0";
    if (value < 1e-4) return value.toExponential(3).replace(".", language === "sl" ? "," : ".").replace("e-", "e−");
    return formatNumber(value, language, 5);
}

export interface FourierDecaySpectraProps {
    selections: readonly FourierExampleId[];
    N: number;
    scale: FourierDecayScale;
    colors: readonly string[];
    exampleName: (id: FourierExampleId) => string;
}

/**
 * Three amplitude spectra A_k = sqrt(a_k^2 + b_k^2), 1 <= k <= N, side by side (stacked in a narrow container), one panel per selected
 * example, drawn only from `fourierAmplitudes` (the numbers of the table). Linear scale: bars from 0, an exact zero as a marker on the
 * baseline. Log scale: a base-10 axis from 10^-8, an exact zero is not drawn (and the panel says so). The dashed curve is the example's
 * reference c/k, c/k^2 or c r^k (an upper envelope for the jump example).
 */
export function FourierDecaySpectra(props: FourierDecaySpectraProps) {
    const t = useT();
    const idBase = useId();
    const language = currentLanguage();
    const {N, scale} = props;
    return <figure className="fourier-decay" data-testid="fourier-decay">
        <figcaption>{t("fourier_decay_spectra_title")}</figcaption>
        <div className="fourier-decay-panels">
            {props.selections.map((id, panel) => {
                const amplitudes = fourierAmplitudes(id, N);
                const reference = FOURIER_DECAY_REFERENCES[id];
                const referenceValues = amplitudes.map((_, i) => reference.amplitude(i + 1));
                const maximum = Math.max(...amplitudes, ...referenceValues);
                const slot = (W - PAD_LEFT - PAD_RIGHT) / N;
                const centre = (k: number) => PAD_LEFT + (k - 0.5) * slot;
                const axis = fourierLogAxis(maximum);
                const logY = (value: number) => {
                    const fraction = (Math.log10(value) - axis.minExponent) / (axis.maxExponent - axis.minExponent);
                    return baseline - Math.min(1, Math.max(0, fraction)) * PLOT_H;
                };
                const linearY = (value: number) => baseline - (value / maximum) * PLOT_H;
                const yOf = scale === "log" ? logY : linearY;
                const hidden = amplitudes.filter(value => isZeroAmplitude(value)).length;
                const floored = scale === "log" && amplitudes.some(value => !isZeroAmplitude(value) && Math.log10(value) < FOURIER_LOG_MIN_EXPONENT);
                const barWidth = Math.max(0.8, slot * 0.7);
                const color = props.colors[panel];
                // The reference is broken where it leaves the log axis (below 10^-8), so it never runs along the floor like data.
                const runs: string[] = [];
                let current = "";
                referenceValues.forEach((value, i) => {
                    if (scale === "log" && Math.log10(value) < FOURIER_LOG_MIN_EXPONENT) {
                        if (current) runs.push(current);
                        current = "";
                        return;
                    }
                    current += `${current ? "L" : "M"}${centre(i + 1).toFixed(2)} ${yOf(value).toFixed(2)}`;
                });
                if (current) runs.push(current);
                const name = props.exampleName(id);
                const scaleText = scale === "log" ? t("fourier_decay_scale_log") : t("fourier_decay_scale_linear");
                const labelEvery = N > 40 ? 20 : N > 16 ? 5 : 2;
                const ticks = scale === "log"
                    ? axis.ticks.filter((_, i, all) => all.length <= 6 || i % 2 === (all.length - 1) % 2).map(exponent => ({y: logY(10 ** exponent), text: powerOfTen(exponent)}))
                    : [{y: baseline, text: "0"}, {y: PAD_TOP, text: formatNumber(maximum, language, 3)}];
                const panelId = `${idBase}-${panel}`;
                return <figure key={panel} className="fourier-decay-panel" data-testid="fourier-decay-panel" data-example={id} data-panel={panel}>
                    <figcaption><span className="fourier-decay-swatch" style={{backgroundColor: color}} aria-hidden="true"/>{name}</figcaption>
                    <div className="fourier-decay-plot">
                    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${panelId}-desc`} className="fourier-decay-svg">
                        <desc id={`${panelId}-desc`}>{t("fourier_decay_spectrum_desc", {value0: name, value1: N, value2: scaleText})}</desc>
                        <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={baseline} y2={baseline} className="fourier-decay-axis"/>
                        <line x1={PAD_LEFT} x2={PAD_LEFT} y1={PAD_TOP} y2={baseline} className="fourier-decay-axis"/>
                        {amplitudes.map((value, i) => {
                            const k = i + 1;
                            if (isZeroAmplitude(value)) {
                                return scale === "log" ? null
                                    : <circle key={k} cx={centre(k)} cy={baseline} r={2} className="fourier-decay-zero" data-k={k} data-zero="true"/>;
                            }
                            const top = yOf(value);
                            return <rect key={k} x={centre(k) - barWidth / 2} width={barWidth} y={top} height={Math.max(1, baseline - top)} fill={color}
                                         data-k={k} data-amplitude={value}/>;
                        })}
                        {runs.map((d, i) => <path key={i} d={d} className="fourier-decay-reference" data-reference={id}/>)}
                    </svg>
                    {ticks.map(tick => <span key={tick.text} className="fourier-decay-label fourier-decay-label-y" aria-hidden="true"
                                             style={{right: `calc(100% - ${pctX(PAD_LEFT - 4)})`, top: pctY(tick.y)}}>{tick.text}</span>)}
                    {Array.from({length: N}, (_, i) => i + 1).filter(k => k === 1 || k % labelEvery === 0).map(k =>
                        <span key={k} className="fourier-decay-label fourier-decay-label-x" aria-hidden="true" style={{left: pctX(centre(k)), top: pctY(baseline + 3)}}>{k}</span>)}
                    </div>
                    <p className="fourier-decay-key">{reference.kind === "envelope"
                        ? t("fourier_decay_reference_envelope", {value0: reference.formula})
                        : t("fourier_decay_reference_exact", {value0: reference.formula})}</p>
                    {scale === "linear" && hidden > 0 && <p className="fourier-decay-key" data-testid="fourier-decay-zero-key">{t("fourier_decay_zero_key")}</p>}
                    {scale === "log" && hidden > 0 && <ReadoutHelp hooks={{"data-testid": "fourier-decay-zero-note"}}>{t("fourier_decay_zero_note")}</ReadoutHelp>}
                    {floored && <ReadoutHelp hooks={{"data-testid": "fourier-decay-floor-note"}}>{t("fourier_decay_floor_note")}</ReadoutHelp>}
                    <details>
                        <summary>{t("fourier_decay_table_summary")}</summary>
                        <table className="fourier-decay-table" data-testid="fourier-decay-table" data-example={id}>
                            <thead><tr><th scope="col">k</th><th scope="col">Aₖ</th></tr></thead>
                            <tbody>{amplitudes.map((value, i) => <tr key={i} data-k={i + 1}>
                                <th scope="row">{i + 1}</th><td>{amplitudeText(value, language)}</td>
                            </tr>)}</tbody>
                        </table>
                    </details>
                </figure>;
            })}
        </div>
    </figure>;
}
