import React from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber, formatSignificant, type NumberLanguage} from "../../analysis/format";
import type {ClipRange, ClipState} from "../../bezeg/impl/kernels/bezier-clipping";
import {bezierClippingReadout, BezierClippingStatus, ClipTableRow} from "./bezierClippingReadout";
import {ClipDistancePlot, ClipDistancePlotController} from "./ClipDistancePlot";
import type {TraceControlActions} from "./TraceCurvePairGraph";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {StepCounter, stepCounterText} from "../base/controls/StepCounter";
import {ReadoutScrollTable} from "../base/controls/ReadoutParts";
import "./BezierClippingControls.css";

export interface BezierClippingControlsProps {
    /** What the shown step knows (the graph's `clipState`). */
    state: ClipState;
    step: number;
    length: number;
    playing: boolean;
    /** The hull test of the two whole nets (the graph's `hullsApart`). */
    hullsApart: boolean;
    /** The tolerance exponent k of 10^-k, and the graph's setter. */
    toleranceExponent: number;
    onTolerance(exponent: number): void;
    actions: TraceControlActions;
    inset: ClipDistancePlotController;
    fontSize?: number;
}

type Translate = ReturnType<typeof useT>;

/** Memoised: its props (the controller, the font size) do not change during a drag, so a drag renders no inset React. */
const Inset = React.memo(ClipDistancePlot);

/** The tolerance exponents the select offers: 10^-3 to 10^-10. */
export const CLIP_TOLERANCE_EXPONENTS: readonly number[] = [3, 4, 5, 6, 7, 8, 9, 10];

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** `10⁻⁶` for the exponent 6. */
export const powerOfTenText = (exponent: number) => `10⁻${[...String(exponent)].map(d => SUPERSCRIPT[Number(d)]).join("")}`;

function statusText(t: Translate, status: BezierClippingStatus): string {
    switch (status) {
        case "overlapping": return t("bezierclipping_status_overlapping");
        case "separated": return t("bezierclipping_status_separated");
        case "running": return t("bezierclipping_status_running");
        case "found": return t("bezierclipping_status_found");
        case "empty": return t("bezierclipping_status_empty");
        case "limit": return t("bezierclipping_status_limit");
    }
}

function kindText(t: Translate, kind: ClipTableRow["kind"]): string {
    switch (kind) {
        case "result": return t("bezierclipping_kind_result");
        case "active": return t("bezierclipping_kind_active");
        case "unresolved": return t("bezierclipping_kind_unresolved");
    }
}

const rangeText = (t: Translate, language: NumberLanguage, range: ClipRange) =>
    t("bezierclipping_range", {value0: formatNumber(range[0], language, 6), value1: formatNumber(range[1], language, 6)});


/**
 * Tolerance, Next step / Play / Pause / Reset, the status, the readout, the interval table and the distance inset of the Bezier
 * clipping graph. Unavailable buttons stay focusable (`aria-disabled`); the status region is silent during Play and announces
 * once on a pause or at the end.
 */
export function BezierClippingControls(props: BezierClippingControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {state, step, length, playing, actions} = props;
    const atEnd = step >= length - 1;
    const readout = bezierClippingReadout(state, props.hullsApart);
    const stepText = stepCounterText(t, step, length);
    const status = statusText(t, readout.status);
    const count = t("bezierclipping_clip_count", {value0: readout.clipCount});
    const widest = readout.widest === null ? null : t("bezierclipping_widest", {value0: formatSignificant(readout.widest, language, 3)});
    const {rows, further} = readout.table;
    const liveReadout = useStatusReadout([stepText, status, count, ...(widest === null ? [] : [widest])].join("\n"));
    return <>
        <div className="inspector-group" data-bezier-clipping="tolerance">
            <ChoiceSelect label={t("bezierclipping_tolerance_label")} value={String(props.toleranceExponent)}
                          options={CLIP_TOLERANCE_EXPONENTS.map(k => ({value: String(k), text: powerOfTenText(k), ariaLabel: t("bezierclipping_tolerance_option", {value0: k})}))}
                          onChange={value => props.onTolerance(Number(value))}/>
            <p className="inspector-help">{t("bezierclipping_tolerance_help")}</p>
        </div>
        <div className="inspector-group">
            <PlaybackButtons groupLabel={t("bezierclipping_controls_label")} nextLabel={t("next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("bezierclipping_playback_note")}</p>
        </div>
        <div className="inspector-group" data-bezier-clipping="readout">
            <StepCounter step={step} length={length} hooks={{"data-bezier-clipping": "step"}}/>
            <p className="inspector-help" data-bezier-clipping="status" data-status={readout.status}>{status}</p>
            <p className="inspector-help" data-bezier-clipping="clips">{count}</p>
            {widest !== null && <p className="inspector-help" data-bezier-clipping="widest">{widest}</p>}
        </div>
        <div className="inspector-group bezier-clipping-table">
            <ReadoutScrollTable label={t("bezierclipping_table_caption")}>
            <table data-bezier-clipping="table" style={{width: "100%", fontSize: "1rem", fontVariantNumeric: "tabular-nums", borderCollapse: "collapse"}}>
                <caption style={{textAlign: "left", fontWeight: 700}}>{t("bezierclipping_table_caption")}</caption>
                <thead>
                    <tr>
                        <th scope="col" style={{textAlign: "left"}}>{t("bezierclipping_col_kind")}</th>
                        <th scope="col" style={{textAlign: "left"}}>{t("bezierclipping_col_a")}</th>
                        <th scope="col" style={{textAlign: "left"}}>{t("bezierclipping_col_b")}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => <tr key={i} data-bezier-clipping="row" data-kind={row.kind} style={row.kind === "result" ? {fontWeight: 700} : undefined}>
                        <th scope="row" style={{textAlign: "left"}}>{kindText(t, row.kind)}</th>
                        <td>{rangeText(t, language, row.aRange)}</td>
                        <td>{rangeText(t, language, row.bRange)}</td>
                    </tr>)}
                    {further > 0 && <tr data-bezier-clipping="further">
                        <td colSpan={3}>{t("bezierclipping_further", {value0: further})}</td>
                    </tr>}
                </tbody>
            </table>
            </ReadoutScrollTable>
        </div>
        <Inset controller={props.inset} fontSize={props.fontSize}/>
        {/* Silent while Play runs (a tick each interval would flood a screen reader); announces once on Pause or at the end. */}
        <LiveReadout readout={liveReadout} muted={playing} dataAttribute="bezier-clipping-live"/>
    </>;
}
