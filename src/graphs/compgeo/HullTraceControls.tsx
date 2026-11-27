import React, {useEffect, useState} from "react";
import {renderMessage, useT} from "../../localization";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {GridPoint} from "../../compgeo/grid";
import {HULL_ALGORITHMS, HullAlgorithm, HullEventInfo, parseHullAlgorithm} from "./hullTraceRun";
import {hullAlgorithmMessage, hullTraceNotes} from "./hullTraceNotes";
import {PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {StepCounter} from "../base/controls/StepCounter";

export interface HullTraceControlActions {
    setAlgorithm(algorithm: HullAlgorithm): void;
    nextStep(): void;
    playPause(): void;
    reset(): void;
}

export interface HullTraceControlsProps {
    algorithm: HullAlgorithm;
    step: number;
    length: number;
    playing: boolean;
    event: HullEventInfo | undefined;
    points: readonly GridPoint[];
    gridStepExponent: number;
    /** Total orientation tests of every algorithm on the current points; present only after `done`. */
    totals: Readonly<Record<HullAlgorithm, number>> | undefined;
    actions: HullTraceControlActions;
    /** The algorithm is fixed by the host (the robustness graph, task 19): the algorithm choice is not shown. */
    fixedAlgorithm?: boolean;
    /** The monotone chain keeps a collinear middle point (pop rule `<`): the collinear test note says so. */
    collinearKept?: boolean;
}

/**
 * Algorithm choice, Next step / Play / Pause / Reset and the status of the hull trace. An unavailable button stays focusable
 * (`aria-disabled`) so keyboard focus is not lost when playback reaches its end.
 */
export function HullTraceControls(props: HullTraceControlsProps) {
    const t = useT();
    const {algorithm, step, length, playing, event, points, gridStepExponent, totals, actions, fixedAlgorithm, collinearKept} = props;
    const atEnd = step >= length - 1;
    const notes = hullTraceNotes({step, length, event, points, gridStepExponent, totals, collinearKept});
    const text = (id: string) => { const found = notes.find(note => note.id === id); return found ? renderMessage(found.text) : undefined; };
    /** Ends a status piece with one full stop; the notes already carry their own. */
    const sentence = (value: string | false | undefined) => value && /[.!?]$/.test(value) ? value : `${value}.`;
    const liveText = ["step", "note", "detail", "count"].map(text).filter(Boolean).map(sentence).join(" ");
    // Each step is a discrete state, so the readout publishes it at once; the mute while Play runs is the region's.
    const [liveReadout] = useState(() => new SettledReadout());
    useEffect(() => { liveReadout.replace(liveText); }, [liveReadout, liveText]);
    useEffect(() => () => liveReadout.cancel(), [liveReadout]);
    return <>
        {!fixedAlgorithm && <PuckOwnedGroup className="inspector-group" params={["algorithm", ...HULL_ALGORITHMS]}>
            <ChoiceSelect label={t("hulltrace_algorithm_label")} value={algorithm}
                          options={HULL_ALGORITHMS.map(id => ({value: id, text: renderMessage(hullAlgorithmMessage(id))}))}
                          onChange={value => { const next = parseHullAlgorithm(value); if (next) actions.setAlgorithm(next); }}
                          help={algorithm === "slow-edge-test" ? t("hulltrace_slow_note", {value0: length}) : undefined}/>
        </PuckOwnedGroup>}
        <div className="inspector-group">
            <PlaybackButtons placement="graph" groupLabel={t("hulltrace_controls_label")} nextLabel={t("next_step")} playing={playing}
                             onNext={() => actions.nextStep()} onPlayPause={() => actions.playPause()} onReset={() => actions.reset()}
                             {...playbackBlocks({atStart: step === 0, atEnd, playing, stepsWhilePlaying: true})}/>
            <p className="inspector-help">{t("hulltrace_playback_note")}</p>
        </div>
        <div className="inspector-group" data-hull-trace-status="" data-declared-panel="">
            <StepCounter step={step} length={length} hooks={{"data-hull-trace": "step", "data-readout-note": ""}}/>
            {event && <p data-readout-note className="inspector-help" data-hull-trace="note">{text("note")}</p>}
            {text("detail") && <p data-readout-note className="inspector-help" data-hull-trace="detail">{text("detail")}</p>}
            {event && <p data-readout-note className="inspector-help" data-hull-trace="count">{text("count")}</p>}
            {/* Silent while Play runs (a tick every 400 ms would flood a screen reader); announces the status once on Pause or at the end. */}
            <LiveReadout readout={liveReadout} muted={playing} dataAttribute="hull-trace-live"/>
            {totals && <>
                <h3 className="inspector-help">{t("hulltrace_counts_title")}</h3>
                <ul data-hull-trace="totals">
                    {HULL_ALGORITHMS.map(id => <li data-readout-note key={id} data-algorithm={id}>
                        {text(`total-${id}`)}</li>)}
                </ul>
            </>}
        </div>
    </>;
}
