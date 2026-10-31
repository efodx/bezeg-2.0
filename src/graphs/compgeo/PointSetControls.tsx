import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {GridPoint} from "../../compgeo/grid";
import {PointSetMode, PointSetModel} from "../../compgeo/pointSetModel";
import {PolygonSimplicity} from "../../compgeo/predicates";

/** What the controls ask the graph to do; every handler is a synchronous model edit on the graph. */
export interface PointSetControlActions {
    addPoint(point: GridPoint): void;
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
    readonly kind: "limit" | "range";
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
    const noticeText = notice
        ? notice.kind === "limit" ? t("pointset_limit_reached", {value0: props.pointLimit}) : t("pointset_out_of_range", {value0: props.coordinateLimit})
        : "";
    const button = "btn btn-outline-secondary btn-sm";
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            {props.showModeToggle !== false && <div role="group" aria-label={t("pointset_mode_label")}>
                {(["points", "polygon"] as const).map(mode =>
                    <button key={mode} type="button" className={button} aria-pressed={model.mode === mode}
                            onClick={() => actions.setMode(mode)}>{t(mode === "points" ? "pointset_mode_points" : "pointset_mode_polygon")}</button>)}
            </div>}
            {model.mode === "polygon" && <label className="pointset-check"><input type="checkbox" checked={model.closed}
                onChange={event => actions.setClosed(event.target.checked)}/> {t("pointset_closed")}</label>}
            {props.overlays.map(overlay => <label key={overlay.id} className="pointset-check"><input type="checkbox" checked={overlay.shown}
                onChange={event => actions.setOverlay(overlay.id, event.target.checked)}/> {overlay.label}</label>)}
            <p className="inspector-help">{t("pointset_grid_step", {value0: formatNumber(2 ** model.gridStepExponent, language, 8)})}</p>
        </div>
        <div className="inspector-group">
            <button type="button" className={button} aria-pressed={props.addMode} onClick={() => actions.setAddMode(!props.addMode)}>{t("pointset_add_mode")}</button>
            <button type="button" className={button} disabled={selected === undefined} onClick={() => actions.removeSelected()}>{t("pointset_remove")}</button>
            <button type="button" className={button} disabled={model.points.length === 0} onClick={() => actions.clear()}>{t("pointset_clear")}</button>
            <p className="inspector-help" data-pointset-count>{t("pointset_point_count", {value0: model.points.length, value1: props.pointLimit})}</p>
            <p className="inspector-help" data-pointset-selection>{selected === undefined ? t("pointset_no_selection") : t("pointset_selected_point", {value0: selected + 1})}</p>
            <p className="inspector-help pointset-notice" role="status" aria-live="polite" data-pointset-notice={notice?.kind ?? ""}>{noticeText}</p>
        </div>
        <Status simplicity={props.simplicity} model={model}/>
        <div className="inspector-group">
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
        </div>
    </div>;
}
