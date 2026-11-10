import {CONTROL_ROW} from "../../inputs/controlRow";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {useLanguage, useT} from "../../localization";
import {ReadoutHeading} from "../base/controls/ReadoutParts";
import {formatNumber} from "../../analysis/format";
import {GridPoint} from "../../compgeo/grid";
import {intervalLetter, intervalsOf, PointSetMode, PointSetModel} from "../../compgeo/pointSetModel";
import {PolygonSimplicity} from "../../compgeo/predicates";
import {BooleanField} from "../../inputs/BooleanField";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {RefusalChannel, RefusalNotice} from "../../inputs/RefusalChannel";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {NumberInput} from "../../inputs/NumberInput";
import {PointCollection} from "../../inputs/PointCollection";
import {PointListInput, SelectablePointButton, useRemoveFocus} from "../../inputs/PointListInput";

/** What the controls ask the graph to do; every handler is a synchronous model edit on the graph. */
export interface PointSetControlActions {
    /** Adds a point at `point`; without it the graph places the next one (decision 1). A refusal returns its notice. */
    addPoint(point?: GridPoint): PointSetNotice | undefined;
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

/**
 * A notice region for a visible status sentence: empty at mount, then it speaks the sentence each time it changes. It is not
 * `data-readout-live`, so it stays outside the graph's one readout region (decision 18) and never speaks on state alone.
 */
function ChangeNotice({text}: {text: string}) {
    const [spoken, setSpoken] = useState("");
    const previous = useRef(text);
    useEffect(() => {
        if (previous.current === text) return;
        previous.current = text;
        setSpoken(text);
    }, [text]);
    return <p className="visually-hidden" role="status" aria-live="polite" data-pointset-announce="">{spoken}</p>;
}

function Status({simplicity, model}: {simplicity: PolygonSimplicity | undefined, model: PointSetModel}) {
    const t = useT();
    // The announcement region stays mounted so a change of the text is announced; it is empty outside polygon mode.
    if (model.mode !== "polygon") return <><p className="inspector-help pointset-status" data-pointset-status=""></p><ChangeNotice text=""/></>;
    const closed = model.closed;
    let text: string;
    if (closed && model.points.length < 3) text = t("pointset_status_too_few_vertices");
    else if (!simplicity || simplicity.simple) text = t(closed ? "pointset_status_simple_closed" : "pointset_status_simple_open");
    else if (simplicity.edges[0] === simplicity.edges[1]) text = t("pointset_status_degenerate_edge", {value0: simplicity.edges[0] + 1});
    else text = t(closed ? "pointset_status_not_simple_closed" : "pointset_status_not_simple_open",
        {value0: simplicity.edges[0] + 1, value1: simplicity.edges[1] + 1});
    const simple = simplicity?.simple === true && !(closed && model.points.length < 3);
    return <><p className="inspector-help pointset-status" data-pointset-status={simple ? "simple" : "not-simple"}>{text}</p><ChangeNotice text={text}/></>;
}

/** Segments mode: one row per segment with its four endpoint fields, a select and a remove button, and the Add segment action. */
function SegmentList(props: {model: PointSetModel, selected: number | undefined, actions: PointSetControlActions, button: string, coordinateLimit: number, limit: number, limitReason: string}) {
    const t = useT();
    const {model, selected, actions, button, coordinateLimit, limit, limitReason} = props;
    const bounds = {min: -coordinateLimit, max: coordinateLimit};
    const field = (label: string, value: number, onCommit: (value: number) => void) =>
        <NumberInput label={label} hideLabel compact integer step={1} {...bounds} value={value} onChange={onCommit}/>;
    const root = useRef<HTMLDivElement>(null);
    const requestRemoveFocus = useRemoveFocus(root, ".pointset-remove", () => root.current?.querySelector<HTMLElement>(":scope > button"));
    return <div className="inspector-group" ref={root}>
        <ReadoutHeading>{t("pointset_segment_list")}</ReadoutHeading>
        {model.points.length === 0 && <p className="inspector-help">{t("pointset_no_segments")}</p>}
        <ol className="pointset-list">
            {Array.from({length: model.points.length >> 1}, (_, k) => {
                const [a, b] = [model.points[2 * k], model.points[2 * k + 1]];
                const on = selected !== undefined && selected >> 1 === k;
                return <li key={k} className={CONTROL_ROW} data-selected={on}>
                    <SelectablePointButton label={`s${k + 1}`} accessibleName={t("pointset_select_segment", {value0: k + 1})} pressed={on} onToggle={() => actions.select(on ? undefined : 2 * k)}/>
                    {field(t("pointset_segment_x", {value0: k + 1, value1: 1}), a.x, x => actions.movePoint(2 * k, {x, y: a.y}))}
                    {field(t("pointset_segment_y", {value0: k + 1, value1: 1}), a.y, y => actions.movePoint(2 * k, {x: a.x, y}))}
                    {field(t("pointset_segment_x", {value0: k + 1, value1: 2}), b.x, x => actions.movePoint(2 * k + 1, {x, y: b.y}))}
                    {field(t("pointset_segment_y", {value0: k + 1, value1: 2}), b.y, y => actions.movePoint(2 * k + 1, {x: b.x, y}))}
                    <button type="button" className={`${button} pointset-remove`} onClick={() => { requestRemoveFocus(k); actions.removeSegment(k); }}>
                        <span aria-hidden="true">&times;</span><span className="visually-hidden">{t("pointset_remove_segment_n", {value0: k + 1})}</span>
                    </button>
                </li>;
            })}
        </ol>
        <UnavailableButton className={button} reason={model.points.length >> 1 >= limit ? limitReason : undefined} onPress={() => actions.addSegment()}
                           onBlockedPress={() => actions.addSegment()}>{t("pointset_add_segment")}</UnavailableButton>
    </div>;
}

/** Intervals mode: one row per interval with its lo and hi fields (x only; the row is not editable), a select and a remove button. */
function IntervalList(props: {model: PointSetModel, selected: number | undefined, actions: PointSetControlActions, button: string, coordinateLimit: number, limit: number, limitReason: string}) {
    const t = useT();
    const {model, selected, actions, button, coordinateLimit, limit, limitReason} = props;
    const field = (label: string, value: number, onCommit: (value: number) => void) =>
        <NumberInput label={label} hideLabel compact integer step={1} min={-coordinateLimit} max={coordinateLimit} value={value} onChange={onCommit}/>;
    const intervals = intervalsOf(model);
    const root = useRef<HTMLDivElement>(null);
    const requestRemoveFocus = useRemoveFocus(root, ".pointset-remove", () => root.current?.querySelector<HTMLElement>(":scope > button"));
    return <div className="inspector-group" ref={root}>
        <ReadoutHeading>{t("pointset_interval_list")}</ReadoutHeading>
        {intervals.length === 0 && <p className="inspector-help">{t("pointset_no_intervals")}</p>}
        <ol className="pointset-list">
            {intervals.map(({lo, hi}, k) => {
                const on = selected !== undefined && selected >> 1 === k;
                const letter = intervalLetter(k);
                // lo and hi are the sorted ends; each field edits the stored endpoint that currently has that value.
                const loIndex = model.points[2 * k].x <= model.points[2 * k + 1].x ? 2 * k : 2 * k + 1;
                const hiIndex = 4 * k + 1 - loIndex;
                return <li key={k} className={CONTROL_ROW} data-selected={on}>
                    <SelectablePointButton label={letter} accessibleName={t("pointset_select_interval", {value0: letter})} pressed={on} onToggle={() => actions.select(on ? undefined : 2 * k)}/>
                    {field(t("pointset_interval_lo", {value0: letter}), lo, x => actions.movePoint(loIndex, {x, y: model.points[loIndex].y}))}
                    {field(t("pointset_interval_hi", {value0: letter}), hi, x => actions.movePoint(hiIndex, {x, y: model.points[hiIndex].y}))}
                    <button type="button" className={`${button} pointset-remove`} onClick={() => { requestRemoveFocus(k); actions.removeInterval(k); }}>
                        <span aria-hidden="true">&times;</span><span className="visually-hidden">{t("pointset_remove_interval_n", {value0: letter})}</span>
                    </button>
                </li>;
            })}
        </ol>
        <UnavailableButton className={button} reason={model.points.length >> 1 >= limit ? limitReason : undefined} onPress={() => actions.addInterval()}
                           onBlockedPress={() => actions.addInterval()}>{t("pointset_add_interval")}</UnavailableButton>
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
    const textOf = (notice: PointSetNotice | undefined) => !notice ? ""
        : notice.kind === "fixed" ? t("pointset_count_fixed")
        : notice.kind === "limit" ? t("pointset_limit_reached", {value0: props.pointLimit})
            : notice.kind === "segment-limit" ? t("pointset_segment_limit_reached", {value0: props.segmentLimit ?? 0})
                : notice.kind === "interval-limit" ? t("pointset_interval_limit_reached", {value0: props.intervalLimit ?? 0})
                    : t("pointset_out_of_range", {value0: props.coordinateLimit});
    const noticeText = textOf(notice);
    const pendingText = !paired || !props.pending ? "" : intervals ? t("pointset_interval_pending", {value0: props.pending.x})
        : t("pointset_segment_pending", {value0: props.pending.x, value1: props.pending.y});
    // The graph's refusal, or the reason of a press that was unavailable (until the points or the selection change), alone in the refusal region.
    const [blocked, setBlocked] = useState<{reason: string; points: number; selected: number | undefined; serial: number}>();
    const blockedPress = (reason: string) => setBlocked(current => ({reason, points: model.points.length, selected, serial: (current?.serial ?? 0) + 1}));
    const blockedNow = blocked && blocked.points === model.points.length && blocked.selected === selected ? blocked : undefined;
    const channel = useMemo(() => {
        const next = new RefusalChannel();
        if (blockedNow) next.refuse(blockedNow.reason, true);
        else if (noticeText) next.refuse(noticeText, true);
        return next;
    }, [noticeText, blockedNow]);
    const modes: readonly PointSetMode[] = ["points", "polygon", ...props.allowsSegments === true ? ["segments" as const] : [], ...props.allowsIntervals === true ? ["intervals" as const] : []];
    const modeLabel = {points: "pointset_mode_points", polygon: "pointset_mode_polygon", segments: "pointset_mode_segments", intervals: "pointset_mode_intervals"} as const;
    const button = "btn btn-outline-secondary btn-sm";
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            {props.showModeToggle !== false && <ChoiceSelect label={t("pointset_mode_label")} value={model.mode}
                options={modes.map(mode => ({value: mode, text: t(modeLabel[mode])}))} onChange={value => actions.setMode(value as PointSetMode)}/>}
            {model.mode === "polygon" && props.showClosedToggle !== false && <BooleanField variant="checkbox" label={t("pointset_closed")} checked={model.closed}
                onChange={actions.setClosed}/>}
            {props.overlays.map(overlay => <BooleanField key={overlay.id} variant="checkbox" label={overlay.label} checked={overlay.shown}
                onChange={shown => actions.setOverlay(overlay.id, shown)}/>)}
            <p className="inspector-help">{t("pointset_grid_step", {value0: formatNumber(2 ** model.gridStepExponent, language, 8)})}</p>
        </div>
        <div className="inspector-group">
            {!fixed && !paired && <PointCollection label={t("pointset_collection_label")} count={model.points.length} min={0} max={props.pointLimit}
                onAdd={at => { const refusal = actions.addPoint(at && {x: at[0], y: at[1]}); return refusal && textOf(refusal); }}
                removal={{kind: "selected", onRemove: actions.removeSelected, hasSelection: selected !== undefined}} onClear={actions.clear}
                typedEntry={{axisLabels: ["x", "y"], min: -props.coordinateLimit, max: props.coordinateLimit, integer: true}}
                addMode={{on: props.addMode, onToggle: () => actions.setAddMode(!props.addMode)}}/>}
            {!fixed && paired && <>
                <button type="button" className={button} aria-pressed={props.addMode} onClick={() => actions.setAddMode(!props.addMode)}>{t("pointset_add_mode")}</button>
                <UnavailableButton className={button} reason={selected === undefined ? t(segments ? "pointset_no_segment_selected" : "pointset_no_interval_selected") : undefined} onPress={() => actions.removeSelected()}
                                   onBlockedPress={reason => blockedPress(reason)}>{t(segments ? "pointset_remove_segment" : "pointset_remove_interval")}</UnavailableButton>
                <UnavailableButton className={button} reason={model.points.length === 0 ? t("pointset_no_points") : undefined} onPress={() => actions.clear()}
                                   onBlockedPress={reason => blockedPress(reason)}>{t("clear")}</UnavailableButton>
                <p className="inspector-help" data-pointset-count>{segments
                    ? t("pointset_segment_count", {value0: model.points.length >> 1, value1: props.segmentLimit ?? 0})
                    : t("pointset_interval_count", {value0: model.points.length >> 1, value1: props.intervalLimit ?? 0})}</p>
            </>}
            <p className="inspector-help" data-pointset-selection>{selected === undefined
                ? t(segments ? "pointset_no_segment_selected" : intervals ? "pointset_no_interval_selected" : "pointset_no_selection")
                : segments ? t("pointset_selected_segment", {value0: (selected >> 1) + 1})
                : intervals ? t("pointset_selected_interval", {value0: intervalLetter(selected >> 1)}) : t("pointset_selected_point", {value0: pointName(selected)})}</p>
            {paired && <><p className="inspector-help" data-pointset-pending={props.pending ? "" : undefined}>{pendingText}</p><ChangeNotice text={pendingText}/></>}
            <div data-pointset-notice={notice?.kind ?? ""}><RefusalNotice channel={channel}/></div>
        </div>
        <Status simplicity={props.simplicity} model={model}/>
        {segments ? <SegmentList model={model} selected={selected} actions={actions} button={button} coordinateLimit={props.coordinateLimit}
                                  limit={props.segmentLimit ?? 0} limitReason={t("pointset_segment_limit_reached", {value0: props.segmentLimit ?? 0})}/>
            : intervals ? <IntervalList model={model} selected={selected} actions={actions} button={button} coordinateLimit={props.coordinateLimit}
                                    limit={props.intervalLimit ?? 0} limitReason={t("pointset_interval_limit_reached", {value0: props.intervalLimit ?? 0})}/> : <div className="inspector-group">
            {model.points.length === 0 && <p className="inspector-help">{t("pointset_no_points")}</p>}
            <PointListInput title={t("pointset_point_list")} points={model.points.map(point => [point.x, point.y] as const)} pointLabel={shortName}
                            min={-props.coordinateLimit} max={props.coordinateLimit} integer selected={selected} onSelect={actions.select}
                            onCommit={(i, [x, y]) => {actions.movePoint(i, {x, y});}}/>
        </div>}
    </div>;
}
