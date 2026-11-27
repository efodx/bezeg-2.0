import React from "react";
import {renderMessage, useT} from "../../localization";
import type {CurvePairState} from "../../compgeo/curvePairSubdivision";
import {bezierHullsNotes} from "./bezierHullsNotes";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {StepCounter} from "../base/controls/StepCounter";

export interface BezierHullsControlActions {
    nextStep(): void;
    playPause(): void;
    reset(): void;
}

export interface BezierHullsControlsProps {
    /** What the shown step knows (the graph's `pairState`). */
    state: CurvePairState;
    step: number;
    length: number;
    playing: boolean;
    actions: BezierHullsControlActions;
}

/**
 * Next step / Play / Pause / Reset and the readout of the Bezier hulls graph. An unavailable button stays focusable
 * (`aria-disabled`) so keyboard focus is not lost when playback reaches its end. The readout is one line per item and
 * is announced as a status once on a pause or at the end, never on every tick of Play.
 */
export function BezierHullsControls(props: BezierHullsControlsProps) {
    const t = useT();
    const {state, step, length, playing, actions} = props;
    const atEnd = step >= length - 1;
    const notes = bezierHullsNotes(state, step, length);
    const [, ...lines] = notes;
    const liveReadout = useStatusReadout(notes.map(note => renderMessage(note.text)).join("\n"), true);
    return <>
        <div className="inspector-group">
            <PlaybackButtons placement="graph" groupLabel={t("bezierhulls_controls_label")} nextLabel={t("next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("bezierhulls_playback_note")}</p>
        </div>
        <div className="inspector-group" data-bezier-hulls="readout" data-declared-panel="">
            <StepCounter step={step} length={length} hooks={{"data-bezier-hulls": "step", "data-readout-note": ""}}/>
            {lines.map(line => <p data-readout-note key={line.id} className="inspector-help" data-bezier-hulls={line.id}>{renderMessage(line.text)}</p>)}
        </div>
        {/* Silent while Play runs (a tick each interval would flood a screen reader); announces the readout once on Pause or at the end. */}
        <LiveReadout readout={liveReadout} muted={playing} dataAttribute="bezier-hulls-live"/>
    </>;
}
