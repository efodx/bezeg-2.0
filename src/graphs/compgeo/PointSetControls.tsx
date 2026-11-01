import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {GridPoint} from "../../compgeo/grid";
import {PointSetMode, PointSetModel} from "../../compgeo/pointSetModel";
import {PolygonSimplicity} from "../../compgeo/predicates";

/** What the controls ask the graph to do; every handler is a synchronous model edit on the graph. */
export interface PointSetControlActions {
    addPoint(point: GridPoint): void;
    /** Segments mode: adds a default short segment near the origin. */
    addSegment(): void;
    removeSegment(k: number): void;
    removeSelected(): void;
    clear(): void;
    select(index: number | undefined): void;
    movePoint(index: number, point: GridPoint): void;
    setAddMode(on: boolean): void;
    setMode(mode: PointSetMode): void;
    setClosed(closed: boolean): void;
    setOverlay(id: string, shown: boolean): void;
}

export interface PointSetNotice {
    readonly kind: "limit" | "range" | "segment-limit";
}

export interface PointSetControlsProps {
    model: PointSetModel;
    selected: number | undefined;
    addMode: boolean;
    notice: PointSetNotice | undefined;
    pointLimit: number;
    /** Undefined in points mode (nothing to judge). */
    simplicity: PolygonSimplicity | undefined;
    coordinateLimit: number;
    overlays: readonly {readonly id: string; readonly label: string; readonly shown: boolean}[];
    actions: PointSetControlActions;
    /** Whether the points/polygon choice is offered; a graph that only works on points hides it. Default true. */
    showModeToggle?: boolean;
    /** Whether the mode toggle also offers segments mode. Default false. */
    allowsSegments?: boolean;
    /** Segments mode: the most segments, and the first endpoint waiting for its second click. */
    segmentLimit?: number;
    pending?: GridPoint;
}

/** A whole-number field that keeps what is being typed and commits every valid integer. */
function IntegerField(props: {label: string, value: number, onCommit: (value: number) => void, name?: string}) {
    const [draft, setDraft] = useState(String(props.value));
    // A new value from the graph (another edit, Reset, a preset) replaces the draft; adjusted during render, not in an effect.
    const [shownValue, setShownValue] = useState(props.value);
    if (shownValue !== props.value) {
        setShownValue(props.value);
        setDraft(String(props.value));
    }
    return <label className="pointset-field">
        <input type="number" step={1} inputMode="numeric" aria-label={props.label} name={props.name} value={draft}
               onBlur={() => setDraft(String(props.value))}
               onChange={event => {
                   setDraft(event.target.value);
                   const parsed = Number(event.target.value);
                   if (event.target.value.trim() !== "" && Number.isInteger(parsed)) props.onCommit(parsed);
               }}/>
    </label>;
}

function Status({simplicity, model}: {simplicity: PolygonSimplicity | undefined, model: PointSetModel}) {
    const t = useT();
    // The live region stays mounted so a change of its text is announced; it is empty outside polygon mode.
    if (model.mode !== "polygon") return <p className="inspector-help pointset-status" role="status" data-pointset-status=""></p>;
    const closed = model.closed;
    let text: string;
    if (closed && model.points.length < 3) text = t("pointset_status_too_few_vertices");
    else if (!simplicity || simplicity.simple) text = t(closed ? "pointset_status_simple_closed" : "pointset_status_simple_open");
    else if (simplicity.edges[0] === simplicity.edges[1]) text = t("pointset_status_degenerate_edge", {value0: simplicity.edges[0] + 1});
    else text = t(closed ? "pointset_status_not_simple_closed" : "pointset_status_not_simple_open",
        {value0: simplicity.edges[0] + 1, value1: simplicity.edges[1] + 1});
    const simple = simplicity?.simple === true && !(closed && model.points.length < 3);
    return <p className="inspector-help pointset-status" role="status" data-pointset-status={simple ? "simple" : "not-simple"}>{text}</p>;
}

/** Segments mode: one row per segment with its four endpoint fields, a select and a remove button, and the Add segment action. */
function SegmentList(props: {model: PointSetModel, selected: number | undefined, actions: PointSetControlActions, button: string}) {
    const t = useT();
    const {model, selected, actions, button} = props;
    return <div className="inspector-group">
        <h3 className="inspector-reveals-title">{t("pointset_segment_list")}</h3>
        {model.points.length === 0 && <p className="inspector-help">{t("pointset_no_segments")}</p>}
        <ol className="pointset-list">
            {Array.from({length: model.points.length >> 1}, (_, k) => {
                const [a, b] = [model.points[2 * k], model.points[2 * k + 1]];
                const on = selected !== undefined && selected >> 1 === k;
                return <li key={k} className="pointset-row" data-selected={on}>
                    <button type="button" className={button} aria-pressed={on} onClick={() => actions.select(on ? undefined : 2 * k)}>
                        <span aria-hidden="true">s{k + 1}</span><span className="visually-hidden">{t("pointset_select_segment", {value0: k + 1})}</span>
                    </button>
                    <IntegerField label={t("pointset_segment_x", {value0: k + 1, value1: 1})} value={a.x} onCommit={x => actions.movePoint(2 * k, {x, y: a.y})}/>
                    <IntegerField label={t("pointset_segment_y", {value0: k + 1, value1: 1})} value={a.y} onCommit={y => actions.movePoint(2 * k, {x: a.x, y})}/>
                    <IntegerField label={t("pointset_segment_x", {value0: k + 1, value1: 2})} value={b.x} onCommit={x => actions.movePoint(2 * k + 1, {x, y: b.y})}/>
                    <IntegerField label={t("pointset_segment_y", {value0: k + 1, value1: 2})} value={b.y} onCommit={y => actions.movePoint(2 * k + 1, {x: b.x, y})}/>
                    <button type="button" className={button} onClick={() => actions.removeSegment(k)}>
                        <span aria-hidden="true">&times;</span><span className="visually-hidden">{t("pointset_remove_segment_n", {value0: k + 1})}</span>
                    </button>
                </li>;
            })}
        </ol>
        <button type="button" className={button} onClick={() => actions.addSegment()}>{t("pointset_add_segment")}</button>
    </div>;
}

/**
 * The inspector of the point-set graph. Every pointer action has a keyboard one here: the numeric list moves points,
 * Add point appends one, Select/Remove pick and delete. Colour is never the only signal (selection also reads
 * "Selected point: N", simplicity is a sentence).
 */
export function PointSetControls(props: PointSetControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {model, selected, actions, notice} = props;
    const [newX, setNewX] = useState(0);
    const [newY, setNewY] = useState(0);
    const segments = model.mode === "segments";
    const noticeText = !notice ? ""
        : notice.kind === "limit" ? t("pointset_limit_reached", {value0: props.pointLimit})
            : notice.kind === "segment-limit" ? t("pointset_segment_limit_reached", {value0: props.segmentLimit ?? 0})
                : t("pointset_out_of_range", {value0: props.coordinateLimit});
    const modes = props.allowsSegments === true ? ["points", "polygon", "segments"] as const : ["points", "polygon"] as const;
    const modeLabel = {points: "pointset_mode_points", polygon: "pointset_mode_polygon", segments: "pointset_mode_segments"} as const;
    const button = "btn btn-outline-secondary btn-sm";
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            {props.showModeToggle !== false && <div role="group" aria-label={t("pointset_mode_label")}>
                {modes.map(mode =>
                    <button key={mode} type="button" className={button} aria-pressed={model.mode === mode}
                            onClick={() => actions.setMode(mode)}>{t(modeLabel[mode])}</button>)}
            </div>}
            {model.mode === "polygon" && <label className="pointset-check"><input type="checkbox" checked={model.closed}
                onChange={event => actions.setClosed(event.target.checked)}/> {t("pointset_closed")}</label>}
            {props.overlays.map(overlay => <label key={overlay.id} className="pointset-check"><input type="checkbox" checked={overlay.shown}
                onChange={event => actions.setOverlay(overlay.id, event.target.checked)}/> {overlay.label}</label>)}
            <p className="inspector-help">{t("pointset_grid_step", {value0: formatNumber(2 ** model.gridStepExponent, language, 8)})}</p>
        </div>
        <div className="inspector-group">
            <button type="button" className={button} aria-pressed={props.addMode} onClick={() => actions.setAddMode(!props.addMode)}>{t("pointset_add_mode")}</button>
            <button type="button" className={button} disabled={selected === undefined} onClick={() => actions.removeSelected()}>{t(segments ? "pointset_remove_segment" : "pointset_remove")}</button>
            <button type="button" className={button} disabled={model.points.length === 0} onClick={() => actions.clear()}>{t("pointset_clear")}</button>
            <p className="inspector-help" data-pointset-count>{segments
                ? t("pointset_segment_count", {value0: model.points.length >> 1, value1: props.segmentLimit ?? 0})
                : t("pointset_point_count", {value0: model.points.length, value1: props.pointLimit})}</p>
            <p className="inspector-help" data-pointset-selection>{selected === undefined ? t("pointset_no_selection")
                : segments ? t("pointset_selected_segment", {value0: (selected >> 1) + 1}) : t("pointset_selected_point", {value0: selected + 1})}</p>
            {segments && <p className="inspector-help" role="status" data-pointset-pending={props.pending ? "" : undefined}>
                {props.pending ? t("pointset_segment_pending", {value0: props.pending.x, value1: props.pending.y}) : ""}</p>}
            <p className="inspector-help pointset-notice" role="status" aria-live="polite" data-pointset-notice={notice?.kind ?? ""}>{noticeText}</p>
        </div>
        <Status simplicity={props.simplicity} model={model}/>
        {segments ? <SegmentList model={model} selected={selected} actions={actions} button={button}/> : <div className="inspector-group">
            <h3 className="inspector-reveals-title">{t("pointset_point_list")}</h3>
            {model.points.length === 0 && <p className="inspector-help">{t("pointset_no_points")}</p>}
            <ol className="pointset-list">
                {model.points.map((point, i) => <li key={i} className="pointset-row" data-selected={selected === i}>
                    <button type="button" className={button} aria-pressed={selected === i} onClick={() => actions.select(selected === i ? undefined : i)}>
                        <span aria-hidden="true">P{i + 1}</span><span className="visually-hidden">{t("pointset_select_point", {value0: i + 1})}</span>
                    </button>
                    <IntegerField label={t("pointset_point_x", {value0: i + 1})} value={point.x} onCommit={x => actions.movePoint(i, {x, y: point.y})}/>
                    <IntegerField label={t("pointset_point_y", {value0: i + 1})} value={point.y} onCommit={y => actions.movePoint(i, {x: point.x, y})}/>
                </li>)}
            </ol>
            <form className="pointset-add" onSubmit={event => {event.preventDefault(); actions.addPoint({x: newX, y: newY});}}>
                <IntegerField label={t("pointset_new_x")} value={newX} onCommit={setNewX}/>
                <IntegerField label={t("pointset_new_y")} value={newY} onCommit={setNewY}/>
                <button type="submit" className={button}>{t("pointset_add_point")}</button>
            </form>
        </div>}
    </div>;
}
