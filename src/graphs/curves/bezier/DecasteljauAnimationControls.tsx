import {t, useLanguage} from "../../../localization";
import React from "react";
import Slider from "../../../inputs/Slider";

export type DecasteljauAnimationStatus = "ready" | "playing" | "paused" | "finished";

interface DecasteljauAnimationControlsProps {
    parameter: number;
    speed: number;
    status: DecasteljauAnimationStatus;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onReplay: () => void;
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
    useLanguage();
    return <section className="decasteljau-animation-panel" aria-label={t("animation_controls")}>
        <div className="decasteljau-animation-heading">
            <div>
                <h4>{t("animation_controls")}</h4>
                <span>{statusLabel(props.status)}</span>
            </div>
            <output aria-live="polite">t = {props.parameter.toFixed(2)}</output>
        </div>
        <div className="decasteljau-animation-actions" role="group" aria-label={t("animation_controls")}>
            <button type="button" className="decasteljau-animation-play" disabled={props.status === "playing"} onClick={props.onPlay}>
                <span aria-hidden="true">▶</span>{t("play")}
            </button>
            <button type="button" disabled={props.status !== "playing"} onClick={props.onPause}>
                <span aria-hidden="true">Ⅱ</span>{t("pause")}
            </button>
            <button type="button" disabled={props.status === "ready" && props.parameter === 0} onClick={props.onStop}>
                <span aria-hidden="true">■</span>{t("stop")}
            </button>
            <button type="button" onClick={props.onReplay}>
                <span aria-hidden="true">↻</span>{t("replay")}
            </button>
        </div>
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
