import React, {useId} from "react";
import {currentLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {RealCoefficients} from "../../analysis/fourier";
import {FourierCoefficientTerm} from "../../analysis/fourierCoefficientsModel";
import {GraphPalette} from "../styles/GraphPalette";
import "./FourierSpectrumBars.css";

const W = 360;
const H = 170;
const PAD_LEFT = 38;
const PAD_RIGHT = 6;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;
/** The vertical range is at least this, so a spectrum of tiny coefficients does not fill the chart with noise. */
const MIN_RANGE = 0.05;

/** The chart is drawn from the coefficients only: the same numbers the readouts and the table show. */
export interface FourierSpectrumProps {
    coefficients: RealCoefficients;
    K: number;
    selected: { term: FourierCoefficientTerm; k: number };
}

/** The bar geometry of one coefficient, exported so tests can compare the drawing with the numbers. */
export function barRect(value: number, range: number): { y: number; height: number } {
    const zero = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) / 2;
    const height = (Math.abs(value) / range) * ((H - PAD_TOP - PAD_BOTTOM) / 2);
    return {y: value >= 0 ? zero - height : zero, height};
}

/**
 * The spectrum of a_k and b_k for k <= K as bars: a_k on the left and b_k on the right of every k, zero bars drawn as nothing but
 * still listed, and the selected coefficient outlined. The same values are in a table (the text alternative), so the chart is not
 * the only way to read them.
 */
export function FourierSpectrumBars(props: FourierSpectrumProps) {
    const t = useT();
    const id = useId();
    const language = currentLanguage();
    const {coefficients, K, selected} = props;
    /** The k = 0 bar is the constant term a_0/2 of the series, not a_0; every other bar is the coefficient itself. */
    const aValue = (k: number) => (k === 0 ? coefficients.a[0] / 2 : coefficients.a[k]);
    const values = [...Array.from({length: K + 1}, (_, k) => aValue(k)), ...coefficients.b.slice(1, K + 1)];
    const range = Math.max(MIN_RANGE, ...values.map(Math.abs));
    const slot = (W - PAD_LEFT - PAD_RIGHT) / (K + 1);
    const barWidth = Math.max(1, slot * 0.4);
    const zero = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) / 2;
    const show = (value: number) => formatNumber(value, language, 4);
    const labelEvery = K > 16 ? 4 : 2;
    const bars: React.ReactNode[] = [];
    for (let k = 0; k <= K; k++) {
        const x0 = PAD_LEFT + k * slot + slot * 0.08;
        const entries: { term: FourierCoefficientTerm; value: number; x: number }[] = [{term: "a", value: aValue(k), x: x0}];
        if (k > 0) entries.push({term: "b", value: coefficients.b[k], x: x0 + barWidth + slot * 0.04});
        for (const entry of entries) {
            const rect = barRect(entry.value, range);
            const isSelected = selected.term === entry.term && selected.k === k;
            bars.push(<rect key={`${entry.term}${k}`} x={entry.x} width={barWidth} y={rect.y} height={rect.height} data-term={entry.term} data-k={k}
                            fill={entry.term === "a" ? GraphPalette.primaryCurve : GraphPalette.additionalCurves[2]}
                            className={isSelected ? "fourier-spectrum-selected" : undefined}/>);
        }
    }
    return <figure className="fourier-spectrum" data-testid="fourier-spectrum">
        <figcaption>{t("fourier_coef_spectrum_title")}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className="fourier-spectrum-svg">
            <title id={`${id}-title`}>{t("fourier_coef_spectrum_title")}</title>
            <desc id={`${id}-desc`}>{t("fourier_coef_spectrum_desc", {value0: K})}</desc>
            <line x1={PAD_LEFT} x2={W - PAD_RIGHT} y1={zero} y2={zero} className="fourier-spectrum-axis"/>
            <line x1={PAD_LEFT} x2={PAD_LEFT} y1={PAD_TOP} y2={H - PAD_BOTTOM} className="fourier-spectrum-axis"/>
            {[range, 0, -range].map(y => <text key={y} x={PAD_LEFT - 4} y={zero - (y / range) * ((H - PAD_TOP - PAD_BOTTOM) / 2) + 4} textAnchor="end"
                                               className="fourier-spectrum-label" style={{fontSize: 11}}>{show(y)}</text>)}
            {Array.from({length: K + 1}, (_, k) => k).filter(k => k % labelEvery === 0).map(k =>
                <text key={k} x={PAD_LEFT + (k + 0.5) * slot} y={H - 6} textAnchor="middle" className="fourier-spectrum-label" style={{fontSize: 11}}>{k}</text>)}
            {bars}
        </svg>
        <details>
            <summary>{t("fourier_coef_table_summary")}</summary>
            <table className="fourier-spectrum-table" data-testid="fourier-spectrum-table">
                <thead><tr><th scope="col">k</th><th scope="col">aₖ</th><th scope="col">bₖ</th></tr></thead>
                <tbody>{Array.from({length: K + 1}, (_, k) => <tr key={k} data-k={k}>
                    <th scope="row">{k === 0 ? t("fourier_coef_table_constant") : k}</th>
                    <td data-term="a">{show(aValue(k))}</td>
                    <td data-term="b">{k === 0 ? "—" : show(coefficients.b[k])}</td>
                </tr>)}</tbody>
            </table>
        </details>
    </figure>;
}
