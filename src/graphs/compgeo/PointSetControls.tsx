import React from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {GridPoint} from "../../compgeo/grid";
import {intervalLetter, intervalsOf, PointSetMode, PointSetModel} from "../../compgeo/pointSetModel";
import {PolygonSimplicity} from "../../compgeo/predicates";
import {BooleanField} from "../../inputs/BooleanField";
import {NumberInput} from "../../inputs/NumberInput";
import {PointCollection} from "../../inputs/PointCollection";
import {PointListInput, SelectablePointButton} from "../../inputs/PointListInput";

/** What the controls ask the graph to do; every handler is a synchronous model edit on the graph. */
export interface PointSetControlActions {
    /** Adds a point at `point`; without it the graph places the next one (decision 1). */
    addPoint(point?: GridPoint): void;
    /** Segments mode: adds a default short segment near the origin. */
    addSegment(): void;
    removeSegment(k: number): void;
    /** Intervals mode: adds a default interval near the origin. */
    addInterval(): void;
    removeInterval(k: number): void;
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
    readonly kind: "limit" | "range" | "segment-limit" | "interval-limit" | "fixed";
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
    /** False hides the closed-polygon checkbox for a graph that only works on closed polygons. */
    showClosedToggle?: boolean;
    /** True hides Add mode, Remove, Clear, the point count and the new-point form: the number of points is fixed. Default false. */
    fixedCount?: boolean;
    /** Whether the mode toggle also offers segments mode. Default false. */
    allowsSegments?: boolean;
    /** Segments mode: the most segments, and the first endpoint waiting for its second click. */
    segmentLimit?: number;
    pending?: GridPoint;
    /** Whether the mode toggle also offers intervals mode. Default false. */
    allowsIntervals?: boolean;
    /** Intervals mode: the most intervals. */
    intervalLimit?: number;
    /** The name of point `index` in the point list, its accessible names and the selection line. Default "P" and the 1-based number. */
    pointLabel?: (index: number) => string;
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
function SegmentList(props: {model: PointSetModel, selected: number | undefined, actions: PointSetControlActions, button: string, coordinateLimit: number}) {
    const t = useT();
    const {model, selected, actions, button, coordinateLimit} = props;
    const bounds = {min: -coordinateLimit, max: coordinateLimit};
    const field = (label: string, value: number, onCommit: (value: number) => void) =>
        <NumberInput label={label} hideLabel compact integer step={1} {...bounds} value={value} onChange={onCommit}/>;
    return <div className="inspector-group">
        <h3 className="inspector-reveals-title">{t("pointset_segment_list")}</h3>
        {model.points.length === 0 && <p className="inspector-help">{t("pointset_no_segments")}</p>}
        <ol className="pointset-list">
            {Array.from({length: model.points.length >> 1}, (_, k) => {
                const [a, b] = [model.points[2 * k], model.points[2 * k + 1]];
                const on = selected !== undefined && selected >> 1 === k;
                return <li key={k} className="pointset-row" data-selected={on}>
                    <SelectablePointButton label={`s${k + 1}`} pressed={on} onToggle={() => actions.select(on ? undefined : 2 * k)}/>
                    {field(t("pointset_segment_x", {value0: k + 1, value1: 1}), a.x, x => actions.movePoint(2 * k, {x, y: a.y}))}
                    {field(t("pointset_segment_y", {value0: k + 1, value1: 1}), a.y, y => actions.movePoint(2 * k, {x: a.x, y}))}
                    {field(t("pointset_segment_x", {value0: k + 1, value1: 2}), b.x, x => actions.movePoint(2 * k + 1, {x, y: b.y}))}
                    {field(t("pointset_segment_y", {value0: k + 1, value1: 2}), b.y, y => actions.movePoint(2 * k + 1, {x: b.x, y}))}
                    <button type="button" className={button} onClick={() => actions.removeSegment(k)}>
                        <span aria-hidden="true">&times;</span><span className="visually-hidden">{t("pointset_remove_segment_n", {value0: k + 1})}</span>
                    </button>
                </li>;
            })}
        </ol>
        <button type="button" className={button} onClick={() => actions.addSegment()}>{t("pointset_add_segment")}</button>
    </div>;
}

/** Intervals mode: one row per interval with its lo and hi fields (x only; the row is not editable), a select and a remove button. */
function IntervalList(props: {model: PointSetModel, selected: number | undefined, actions: PointSetControlActions, button: string, coordinateLimit: number}) {
    const t = useT();
    const {model, selected, actions, button, coordinateLimit} = props;
    const field = (label: string, value: number, onCommit: (value: number) => void) =>
        <NumberInput label={label} hideLabel compact integer step={1} min={-coordinateLimit} max={coordinateLimit} value={value} onChange={onCommit}/>;
    const intervals = intervalsOf(model);
    return <div className="inspector-group">
        <h3 className="inspector-reveals-title">{t("pointset_interval_list")}</h3>
        {intervals.length === 0 && <p className="inspector-help">{t("pointset_no_intervals")}</p>}
        <ol className="pointset-list">
            {intervals.map(({lo, hi}, k) => {
                const on = selected !== undefined && selected >> 1 === k;
                const letter = intervalLetter(k);
                // lo and hi are the sorted ends; each field edits the stored endpoint that currently has that value.
                const loIndex = model.points[2 * k].x <= model.points[2 * k + 1].x ? 2 * k : 2 * k + 1;
                const hiIndex = 4 * k + 1 - loIndex;
                return <li key={k} className="pointset-row" data-selected={on}>
                    <SelectablePointButton label={letter} pressed={on} onToggle={() => actions.select(on ? undefined : 2 * k)}/>
                    {field(t("pointset_interval_lo", {value0: letter}), lo, x => actions.movePoint(loIndex, {x, y: model.points[loIndex].y}))}
                    {field(t("pointset_interval_hi", {value0: letter}), hi, x => actions.movePoint(hiIndex, {x, y: model.points[hiIndex].y}))}
                    <button type="button" className={button} onClick={() => actions.removeInterval(k)}>
                        <span aria-hidden="true">&times;</span><span className="visually-hidden">{t("pointset_remove_interval_n", {value0: letter})}</span>
                    </button>
                </li>;
            })}
        </ol>
        <button type="button" className={button} onClick={() => actions.addInterval()}>{t("pointset_add_interval")}</button>
    </div>;
}

/**
 * The inspector of the point-set graph. Every pointer action has a keyboard one here: the numeric list moves points,
 * Add point appends one, Select/Remove pick and delete. Colour is never the only signal (selection also reads
 * "Selected point: N", simplicity is a sentence).
 */
export function PointSetControls(props: PointSetControlsProps) {
    /** The visible row label, and the name in sentences and accessible names: the graph's own label, else "P1" and the number 1. */
    const shortName = (index: number) => props.pointLabel ? props.pointLabel(index) : `P${index + 1}`;
    const pointName = (index: number) => props.pointLabel ? props.pointLabel(index) : index + 1;
    const t = useT();
    const {language} = useLanguage();
    const {model, selected, actions, notice} = props;
    const segments = model.mode === "segments";
    const intervals = model.mode === "intervals";
    const paired = segments || intervals;
    const fixed = props.fixedCount === true;
    const noticeText = !notice ? ""
        : notice.kind === "fixed" ? t("pointset_count_fixed")
        : notice.kind === "limit" ? t("pointset_limit_reached", {value0: props.pointLimit})
            : notice.kind === "segment-limit" ? t("pointset_segment_limit_reached", {value0: props.segmentLimit ?? 0})
                : notice.kind === "interval-limit" ? t("pointset_interval_limit_reached", {value0: props.intervalLimit ?? 0})
                    : t("pointset_out_of_range", {value0: props.coordinateLimit});
    const modes: readonly PointSetMode[] = ["points", "polygon", ...props.allowsSegments === true ? ["segments" as const] : [], ...props.allowsIntervals === true ? ["intervals" as const] : []];
    const modeLabel = {points: "pointset_mode_points", polygon: "pointset_mode_polygon", segments: "pointset_mode_segments", intervals: "pointset_mode_intervals"} as const;
    const button = "btn btn-outline-secondary btn-sm";
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            {props.showModeToggle !== false && <div role="group" aria-label={t("pointset_mode_label")}>
                {modes.map(mode =>
                    <button key={mode} type="button" className={button} aria-pressed={model.mode === mode}
                            onClick={() => actions.setMode(mode)}>{t(modeLabel[mode])}</button>)}
            </div>}
            {model.mode === "polygon" && props.showClosedToggle !== false && <BooleanField variant="checkbox" label={t("pointset_closed")} checked={model.closed}
                onChange={actions.setClosed}/>}
            {props.overlays.map(overlay => <BooleanField key={overlay.id} variant="checkbox" label={overlay.label} checked={overlay.shown}
                onChange={shown => actions.setOverlay(overlay.id, shown)}/>)}
            <p className="inspector-help">{t("pointset_grid_step", {value0: formatNumber(2 ** model.gridStepExponent, language, 8)})}</p>
        </div>
        <div className="inspector-group">
            {!fixed && !paired && <PointCollection label={t("pointset_collection_label")} count={model.points.length} min={0} max={props.pointLimit}
                onAdd={at => actions.addPoint(at && {x: at[0], y: at[1]})}
                removal={{kind: "selected", onRemove: actions.removeSelected, hasSelection: selected !== undefined}} onClear={actions.clear}
                typedEntry={{axisLabels: ["x", "y"], min: -props.coordinateLimit, max: props.coordinateLimit, integer: true}}
                addMode={{on: props.addMode, onToggle: () => actions.setAddMode(!props.addMode)}}/>}
            {!fixed && paired && <>
                <button type="button" className={button} aria-pressed={props.addMode} onClick={() => actions.setAddMode(!props.addMode)}>{t("pointset_add_mode")}</button>
                <button type="button" className={button} disabled={selected === undefined} onClick={() => actions.removeSelected()}>{t(segments ? "pointset_remove_segment" : "pointset_remove_interval")}</button>
                <button type="button" className={button} disabled={model.points.length === 0} onClick={() => actions.clear()}>{t("pointset_clear")}</button>
                <p className="inspector-help" data-pointset-count>{segments
                    ? t("pointset_segment_count", {value0: model.points.length >> 1, value1: props.segmentLimit ?? 0})
                    : t("pointset_interval_count", {value0: model.points.length >> 1, value1: props.intervalLimit ?? 0})}</p>
            </>}
            <p className="inspector-help" data-pointset-selection>{selected === undefined ? t("pointset_no_selection")
                : segments ? t("pointset_selected_segment", {value0: (selected >> 1) + 1})
                : intervals ? t("pointset_selected_interval", {value0: intervalLetter(selected >> 1)}) : t("pointset_selected_point", {value0: pointName(selected)})}</p>
            {paired && <p className="inspector-help" role="status" data-pointset-pending={props.pending ? "" : undefined}>
                {props.pending ? (intervals ? t("pointset_interval_pending", {value0: props.pending.x})
                    : t("pointset_segment_pending", {value0: props.pending.x, value1: props.pending.y})) : ""}</p>}
            <p className="inspector-help pointset-notice" role="status" aria-live="polite" data-pointset-notice={notice?.kind ?? ""}>{noticeText}</p>
        </div>
        <Status simplicity={props.simplicity} model={model}/>
        {segments ? <SegmentList model={model} selected={selected} actions={actions} button={button} coordinateLimit={props.coordinateLimit}/>
            : intervals ? <IntervalList model={model} selected={selected} actions={actions} button={button} coordinateLimit={props.coordinateLimit}/> : <div className="inspector-group">
            {model.points.length === 0 && <p className="inspector-help">{t("pointset_no_points")}</p>}
            <PointListInput title={t("pointset_point_list")} points={model.points.map(point => [point.x, point.y] as const)} pointLabel={shortName}
                            min={-props.coordinateLimit} max={props.coordinateLimit} integer selected={selected} onSelect={actions.select}
                            onCommit={(i, [x, y]) => {actions.movePoint(i, {x, y});}}/>
        </div>}
    </div>;
}
