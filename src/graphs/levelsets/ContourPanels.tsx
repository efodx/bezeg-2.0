import React, {useEffect, useId, useRef, useState, useSyncExternalStore} from "react";
import {useT} from "../../localization";
import Slider from "../../inputs/Slider";
import {LiveReadout} from "../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {useReducedMotion} from "../base/controls/reducedMotion";
import {ReadoutHeading, ReadoutList} from "../base/controls/ReadoutParts";
import type {SurfaceView} from "../patches/surface-view/surfaceScene";
import type ContourMapGraph from "./ContourMapGraph";
import {FUNCTION_KEYS} from "./ContourMapGraph";

const REDUCED_REASON_ID = "contour-play-reduced-reason";

/** Play or pause, reset and the step slider of the descent: host state, so only this part re-renders on a step. */
export function ContourPlayback(props: {graph: ContourMapGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    useReducedMotion(); // follows a system change; the graph's own reducedMotion() is read below
    if (graph.state.mode !== "descent") return null;
    const step = graph.step;
    const last = graph.lastStep();
    const playing = graph.playing;
    const params = {value0: "0", value1: String(last)};
    const blocks = playbackBlocks({atStart: step === 0, atEnd: step === last, playing});
    const playBlock = blocks.playBlock ?? (!playing && graph.reducedMotion() ? "reduced-motion" : undefined);
    return <div className="inspector-group">
        <PlaybackButtons reducedMotionReason={text("playback_block_reduced_motion_step_slider")}
                         placement="graph" groupLabel={text("levelsets_graph_playback_group")} nextLabel={text("next_step")}
                         playing={playing} onNext={() => graph.nextStep()} onPlayPause={() => (graph.playing ? graph.pausePlayback() : graph.play())}
                         onReset={() => graph.resetSteps()}
                         {...blocks} playBlock={playBlock} describedBy={playBlock === "reduced-motion" ? {"play-pause": REDUCED_REASON_ID} : undefined}/>
        {playBlock === "reduced-motion" && <p id={REDUCED_REASON_ID} className="inspector-help">{text("playback_block_reduced_motion_step_slider")}</p>}
        <Slider customText={text("levelsets_graph_steps_label")} min={0} max={last} step={1} grid={1} bigStep={5} decimals={0} value={step}
                rejectedHint={text("levelsets_graph_steps_rejected", params)}
                onChange={value => graph.setStepIndex(Math.round(value))}/>
    </div>;
}

/** The status sentence, the labelled readout rows and the legend of the drawn elements. */
export function ContourReadout(props: {graph: ContourMapGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    return <div className="inspector-group">
        <ReadoutHeading>{text("levelsets_graph_readout_title")}</ReadoutHeading>
        <p data-contour-status="">{graph.statusText()}</p>
        <ReadoutList label={text("levelsets_graph_readout_title")} rows={graph.readoutRows()}/>
        <ul className="readout-list readout-list-sentences" aria-label={text("levelsets_graph_legend_title")} data-contour-legend="">
            {graph.legend().map(row => <li key={row.id} data-legend={row.id}>{row.text}</li>)}
        </ul>
        <LiveReadout readout={graph.status} muted={graph.playing}/>
    </div>;
}

/** The surface z = f(x, y) with the chosen-level contour, in the workspace beside the map; the camera edits are stored. */
export function ContourSurfacePanel(props: {graph: ContourMapGraph}) {
    // Keyed on the graph, so the "unavailable" note of one graph never stays when another graph is shown.
    return <SurfacePanelOf key={graphKey(props.graph)} graph={props.graph}/>;
}

const graphKeys = new WeakMap<ContourMapGraph, number>();
let nextGraphKey = 0;
function graphKey(graph: ContourMapGraph): number {
    let key = graphKeys.get(graph);
    if (key === undefined) { key = nextGraphKey++; graphKeys.set(graph, key); }
    return key;
}

function SurfacePanelOf(props: {graph: ContourMapGraph}) {
    const text = useT();
    const {graph} = props;
    const titleId = useId();
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<SurfaceView | undefined>(undefined);
    const [unavailable, setUnavailable] = useState(false);
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    const name = text(FUNCTION_KEYS[graph.state.fn]);

    useEffect(() => {
        const host = hostRef.current;
        if (host === null) return undefined;
        let alive = true;
        let view: SurfaceView | undefined;
        let unsubscribe: (() => void) | undefined;
        try {
            view = graph.createSurfaceView();
            viewRef.current = view;
            unsubscribe = view.onEdit(edit => { if (alive && edit.kind === "camera") graph.setCamera(edit.camera); });
            view.reconcile(graph.surfaceScene());
            view.attach(host, {ariaLabel: text("levelsets_graph_surface_label", {value0: name}), description: text("surface_view_keys")})
                .catch((error: unknown) => {
                    console.warn("The surface view could not start.", error);
                    if (alive) setUnavailable(true);
                });
        } catch (error) {
            console.warn("The surface view could not start.", error);
            // A synchronous failure is reported from a microtask: the react-hooks lint rule forbids setting state directly in an effect body.
            // The ContourMapGraph test "the surface panel when the view cannot start" covers the console message and the note.
            queueMicrotask(() => { if (alive) setUnavailable(true); });
        }
        return () => {
            alive = false;
            unsubscribe?.();
            if (viewRef.current === view) viewRef.current = undefined;
            view?.dispose();
        };
        // One view per graph; the label and scene are refreshed by the effects below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graph]);

    const scene = graph.surfaceScene();
    useEffect(() => {
        viewRef.current?.reconcile(scene);
    }, [scene]);
    useEffect(() => {
        viewRef.current?.setAriaLabel(text("levelsets_graph_surface_label", {value0: name}), text("surface_view_keys"));
    }, [name, text]);

    return <div className="inspector-group" role="group" aria-labelledby={titleId}>
        <ReadoutHeading><span id={titleId}>{text("levelsets_graph_surface_title")}</span></ReadoutHeading>
        {unavailable
            ? <p role="alert">{text("levelsets_graph_surface_unavailable")}</p>
            : <div ref={hostRef} className="surface-view-host" data-contour-surface="" style={{minHeight: 220}}/>}
    </div>;
}
