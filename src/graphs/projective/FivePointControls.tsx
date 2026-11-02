import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {
    FIVE_POINT_COUNT, FIVE_POINT_DENOMINATOR, FIVE_POINT_EXAMPLE_IDS, FIVE_POINT_NAMES, FIVE_POINT_NUMERATOR_LIMIT, FivePointExampleId, FivePointModel, FivePointScene, pointOf,
} from "./fivePointModel";
import {describeFivePoint} from "./fivePointText";
import {pointText} from "./polePolarModel";

export interface FivePointControlActions {
    loadExample(id: FivePointExampleId): void;
    setEnd(which: "a" | "b", index: number): void;
    setThird(index: number): void;
    /** Places point `index` by its numerators over 15. */
    place(index: number, x: number, y: number): void;
    select(index: number | undefined): void;
    setExtrapolation(on: boolean): void;
}

export interface FivePointControlsProps {
    model: FivePointModel;
    scene: FivePointScene;
    /** True while the conic on the board is the last unique one (the current position is degenerate). */
    stale: boolean;
    selected: number | undefined;
    /** True after a point was last stepped with the arrow keys; its new position is announced politely. */
    nudged?: boolean;
    extrapolation: boolean;
    actions: FivePointControlActions;
}

const EXAMPLE_LABELS = {
    ellipse: "projective_five_point_example_ellipse", hyperbola: "projective_five_point_example_hyperbola", parabola: "projective_five_point_example_parabola",
    "three-collinear": "projective_five_point_example_three_collinear", "four-collinear": "projective_five_point_example_four_collinear",
    custom: "projective_five_point_example_custom",
} as const;

const INDICES = Array.from({length: FIVE_POINT_COUNT}, (_, i) => i);

/** A coordinate field: every typed multiple of 1/15 is committed; the spinner steps by 1/5. */
function CoordinateField(props: {label: string, value: number, onCommit: (numerator: number) => void}) {
    const shown = (value: number) => String(Math.round(value / FIVE_POINT_DENOMINATOR * 1e6) / 1e6);
    const [draft, setDraft] = useState(shown(props.value));
    const [shownValue, setShownValue] = useState(props.value);
    if (shownValue !== props.value) {
        setShownValue(props.value);
        setDraft(shown(props.value));
    }
    const limit = FIVE_POINT_NUMERATOR_LIMIT / FIVE_POINT_DENOMINATOR;
    return <label className="pointset-field">
        <input type="number" step={0.2} min={-limit} max={limit} aria-label={props.label} value={draft}
               onBlur={() => setDraft(shown(props.value))}
               onChange={event => {
                   setDraft(event.target.value);
                   if (event.target.value.trim() === "") return;
                   const scaled = Number(event.target.value) * FIVE_POINT_DENOMINATOR;
                   if (Number.isFinite(scaled) && Math.abs(scaled - Math.round(scaled)) < 1e-6) props.onCommit(Math.round(scaled));
               }}/>
    </label>;
}

/**
 * The inspector of the five-point graph. The status, the conic, the control points, the weight, the Farin points and the sampled
 * deviation are text as well as drawing; the points are placed with fields or selected for the arrow keys.
 */
export function FivePointControls(props: FivePointControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {model, scene, stale, selected, nudged, extrapolation, actions} = props;
    const text = describeFivePoint(scene, stale, t, language);
    const button = "btn btn-outline-secondary btn-sm";
    const nameOf = (i: number) => FIVE_POINT_NAMES[i];
    const where = (i: number) => pointText(pointOf(model.points[i]));
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <div role="group" aria-label={t("projective_five_point_example_label")}>
                {FIVE_POINT_EXAMPLE_IDS.filter(id => id !== "custom").map(id =>
                    <button key={id} type="button" className={button} aria-pressed={model.example === id}
                            onClick={() => actions.loadExample(id)}>{t(EXAMPLE_LABELS[id])}</button>)}
            </div>
            {model.example === "custom" && <p className="inspector-help">{t(EXAMPLE_LABELS.custom)}</p>}
        </div>
        <div className="inspector-group">
            <div role="status" data-projective-status={text.kind} data-projective-stale={stale}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
            </div>
            {text.conic && <p className="inspector-help" data-projective-line="conic">{text.conic}</p>}
            {text.control && <p className="inspector-help" data-projective-line="control">{text.control}</p>}
            {text.weight && <p className="inspector-help" data-projective-line="weight">{text.weight}</p>}
            {text.weightKind && <p className="inspector-help" data-projective-line="weight-kind">{text.weightKind}</p>}
            {text.farin && <p className="inspector-help" data-projective-line="farin">{text.farin}</p>}
            {text.deviation && <p className="inspector-help" data-projective-line="deviation">{text.deviation}</p>}
            <p className="visually-hidden" role="status" data-projective-nudge>
                {nudged && selected !== undefined ? t("projective_five_point_nudged", {value0: nameOf(selected), value1: where(selected)}) : ""}
            </p>
        </div>
        <div className="inspector-group">
            <label className="inspector-help">{t("projective_five_point_end_a")}
                <select value={model.a} onChange={event => actions.setEnd("a", Number(event.target.value))}>
                    {INDICES.map(i => <option key={i} value={i}>{nameOf(i)}</option>)}
                </select>
            </label>
            <label className="inspector-help">{t("projective_five_point_end_b")}
                <select value={model.b} onChange={event => actions.setEnd("b", Number(event.target.value))}>
                    {INDICES.map(i => <option key={i} value={i}>{nameOf(i)}</option>)}
                </select>
            </label>
            <label className="inspector-help">{t("projective_five_point_third")}
                <select value={model.t} onChange={event => actions.setThird(Number(event.target.value))}>
                    {INDICES.filter(i => i !== model.a && i !== model.b).map(i => <option key={i} value={i}>{nameOf(i)}</option>)}
                </select>
            </label>
            <label className="inspector-help">
                <input type="checkbox" checked={extrapolation} onChange={event => actions.setExtrapolation(event.target.checked)}/> {t("projective_five_point_extrapolation")}
            </label>
        </div>
        <div className="inspector-group">
            <p className="inspector-help" data-projective-selection>
                {selected !== undefined ? t("projective_k1_selected", {value0: nameOf(selected)}) : t("projective_k1_no_selection")}
            </p>
            {INDICES.map(i => <div key={i} className="pointset-row" data-selected={selected === i}>
                <button type="button" className={button} aria-pressed={selected === i} onClick={() => actions.select(selected === i ? undefined : i)}>
                    <span aria-hidden="true">{nameOf(i)}</span><span className="visually-hidden">{t("projective_k1_select", {value0: nameOf(i)})}</span>
                </button>
                <CoordinateField label={t("projective_five_point_coordinate_x", {value0: nameOf(i)})} value={model.points[i].x}
                                 onCommit={x => actions.place(i, x, model.points[i].y)}/>
                <CoordinateField label={t("projective_five_point_coordinate_y", {value0: nameOf(i)})} value={model.points[i].y}
                                 onCommit={y => actions.place(i, model.points[i].x, y)}/>
            </div>)}
        </div>
    </div>;
}
