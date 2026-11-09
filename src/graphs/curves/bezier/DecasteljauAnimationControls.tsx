import {t, useLanguage, useT} from "../../../localization";
import React, {useEffect, useState} from "react";
import {withDecimalSeparator} from "../../../analysis/format";
import Slider from "../../../inputs/Slider";
import {PlaybackButtons, playbackBlocks} from "../../base/controls/PlaybackButtons";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";

export type DecasteljauAnimationStatus = "ready" | "playing" | "paused" | "finished";

interface DecasteljauAnimationControlsProps {
    parameter: number;
    speed: number;
    status: DecasteljauAnimationStatus;
    onPlay: () => void;
    onPause: () => void;
    /** Back to t = 0, stopped: the run Reset. */
    onStop: () => void;
    onParameterChange: (value: number) => void;
    onSpeedChange: (value: number) => void;
}

function statusLabel(status: DecasteljauAnimationStatus): string {
    if (status === "playing") return t("animation_playing");
    if (status === "paused") return t("animation_paused");
    if (status === "finished") return t("animation_finished");
    return t("animation_ready");
}

export function DecasteljauAnimationControls(props: DecasteljauAnimationControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const playing = props.status === "playing";
    const readoutText = `t = ${withDecimalSeparator(props.parameter.toFixed(2), language)}`;
    const [readout] = useState(() => new SettledReadout());
    useEffect(() => { readout.report(readoutText); }, [readout, readoutText]);
    useEffect(() => () => readout.cancel(), [readout]);
    return <section className="decasteljau-animation-panel" aria-label={t("animation_controls")}>
        <div className="decasteljau-animation-heading">
            <div>
                <h4>{t("animation_controls")}</h4>
                <span>{statusLabel(props.status)}</span>
            </div>
            <output aria-live="off">{readoutText}</output>
            <LiveReadout readout={readout} muted={playing}/>
        </div>
        <PlaybackButtons groupLabel={t("animation_controls")} className="decasteljau-animation-actions" playing={playing}
                         {...playbackBlocks({atStart: props.status === "ready" && props.parameter === 0, atEnd: false, playing})}
                         onPlayPause={playing ? props.onPause : props.onPlay} onReset={props.onStop}/>
        <div className="decasteljau-animation-slider">
            <Slider customText={t("animation_parameter")} min={0} max={1} value={props.parameter}
                    onChange={props.onParameterChange}/>
        </div>
        <div className="decasteljau-animation-slider">
            <Slider customText={t("animation_speed")} min={0} max={1} value={props.speed}
                    onChange={props.onSpeedChange}/>
        </div>
    </section>;
}
