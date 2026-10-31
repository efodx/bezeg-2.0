import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {
    POLE_POLAR_CONIC_IDS, POLE_POLAR_DENOMINATOR, POLE_POLAR_DIRECTION_LIMIT, POLE_POLAR_EXAMPLE_IDS, POLE_POLAR_NUMERATOR_LIMIT, PolePolarConicId,
    PolePolarDirection, PolePolarExampleId, PolePolarModel, PolePolarScene, pointText,
} from "./polePolarModel";
import {describePolePolar} from "./polePolarText";

export interface PolePolarControlActions {
    loadExample(id: PolePolarExampleId): void;
    setConic(id: PolePolarConicId): void;
    /** Places the finite P by its numerators over 5. */
    place(x: number, y: number): void;
    /** Switches to the point at infinity of a direction, or back to the finite P. */
    setDirection(direction: PolePolarDirection | undefined): void;
    select(selected: boolean): void;
}

export interface PolePolarControlsProps {
    model: PolePolarModel;
    scene: PolePolarScene;
    selected: boolean;
    /** True after P was last stepped with the arrow keys; its new position is announced politely. */
    nudged?: boolean;
    actions: PolePolarControlActions;
}

const EXAMPLE_LABELS = {
    default: "projective_k3_example_default", on: "projective_k3_example_on", inside: "projective_k3_example_inside",
    infinity: "projective_k3_example_infinity", custom: "projective_k3_example_custom",
} as const;
const CONIC_LABELS = {
    ellipse: "projective_k3_conic_ellipse", circle: "projective_k3_conic_circle", parabola: "projective_k3_conic_parabola", hyperbola: "projective_k3_conic_hyperbola",
} as const;

/** A field for a value that is a whole multiple of `1 / scale`; it keeps what is being typed and commits every valid multiple. */
function StepField(props: {label: string, value: number, scale: number, limit: number, onCommit: (value: number) => void}) {
    const shown = (value: number) => String(value / props.scale);
    const [draft, setDraft] = useState(shown(props.value));
    const [shownValue, setShownValue] = useState(props.value);
    if (shownValue !== props.value) {
        setShownValue(props.value);
        setDraft(shown(props.value));
    }
    return <label className="pointset-field">
        <input type="number" step={1 / props.scale} min={-props.limit / props.scale} max={props.limit / props.scale} aria-label={props.label} value={draft}
               onBlur={() => setDraft(shown(props.value))}
               onChange={event => {
                   setDraft(event.target.value);
                   if (event.target.value.trim() === "") return;
                   const scaled = Number(event.target.value) * props.scale;
                   if (Number.isFinite(scaled) && Math.abs(scaled - Math.round(scaled)) < 1e-6) props.onCommit(Math.round(scaled));
               }}/>
    </label>;
}

/**
 * The inspector of the pole and polar graph. The region, the polar equation and the tangents are text as well as drawing; the
 * conic and the example are buttons; P is placed with fields (steps of 0.2) or selected for the arrow keys.
 */
export function PolePolarControls(props: PolePolarControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {model, scene, selected, nudged, actions} = props;
    const text = describePolePolar(scene, t, language);
    const button = "btn btn-outline-secondary btn-sm";
    const where = pointText(scene.p);
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <div role="group" aria-label={t("projective_k3_example_label")}>
                {POLE_POLAR_EXAMPLE_IDS.filter(id => id !== "custom").map(id =>
                    <button key={id} type="button" className={button} aria-pressed={model.example === id}
                            onClick={() => actions.loadExample(id)}>{t(EXAMPLE_LABELS[id])}</button>)}
            </div>
            {model.example === "custom" && <p className="inspector-help">{t(EXAMPLE_LABELS.custom)}</p>}
            <div role="group" aria-label={t("projective_k3_conic_label")}>
                {POLE_POLAR_CONIC_IDS.map(id =>
                    <button key={id} type="button" className={button} aria-pressed={model.conic === id}
                            onClick={() => actions.setConic(id)}>{t(CONIC_LABELS[id])}</button>)}
            </div>
        </div>
        <div className="inspector-group">
            <div role="status" data-projective-status={text.region}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
                {text.polar && <p className="inspector-help" data-projective-line="polar">{text.polar}</p>}
            </div>
            {text.tangents.map((line, i) => <p key={i} className="inspector-help" data-projective-line={`tangent-${i + 1}`}>{line}</p>)}
            {text.tangency.map((line, i) => <p key={i} className="inspector-help" data-projective-line={`tangency-${i + 1}`}>{line}</p>)}
            {text.numerical && <p className="inspector-help" data-projective-line="numerical">{text.numerical}</p>}
            <p className="inspector-help" data-projective-line="centre">{text.centre}</p>
            <p className="visually-hidden" role="status" data-projective-nudge>
                {!nudged ? "" : scene.ideal ? t("projective_k3_status_ideal", {value0: where}) : t("projective_k3_nudged", {value0: where})}
            </p>
        </div>
        <div className="inspector-group">
            <p className="inspector-help" data-projective-selection>{selected ? t("projective_k1_selected", {value0: "P"}) : t("projective_k1_no_selection")}</p>
            <div role="group" aria-label={t("projective_k3_mode_label")}>
                <button type="button" className={button} aria-pressed={!model.ideal} onClick={() => actions.setDirection(undefined)}>{t("projective_k3_mode_finite")}</button>
                <button type="button" className={button} aria-pressed={!!model.ideal} onClick={() => actions.setDirection(model.ideal ?? {dx: 1, dy: 0})}>{t("projective_k3_mode_ideal")}</button>
            </div>
            <div className="pointset-row" data-selected={selected}>
                <button type="button" className={button} aria-pressed={selected} onClick={() => actions.select(!selected)}>
                    <span aria-hidden="true">P</span><span className="visually-hidden">{t("projective_k1_select", {value0: "P"})}</span>
                </button>
                {model.ideal
                    ? <>
                        <StepField label={t("projective_k3_direction_x")} value={model.ideal.dx} scale={1} limit={POLE_POLAR_DIRECTION_LIMIT}
                                   onCommit={dx => actions.setDirection({dx, dy: model.ideal?.dy ?? 0})}/>
                        <StepField label={t("projective_k3_direction_y")} value={model.ideal.dy} scale={1} limit={POLE_POLAR_DIRECTION_LIMIT}
                                   onCommit={dy => actions.setDirection({dx: model.ideal?.dx ?? 0, dy})}/>
                    </>
                    : <>
                        <StepField label={t("projective_k3_coordinate_x")} value={model.p.x} scale={POLE_POLAR_DENOMINATOR} limit={POLE_POLAR_NUMERATOR_LIMIT}
                                   onCommit={x => actions.place(x, model.p.y)}/>
                        <StepField label={t("projective_k3_coordinate_y")} value={model.p.y} scale={POLE_POLAR_DENOMINATOR} limit={POLE_POLAR_NUMERATOR_LIMIT}
                                   onCommit={y => actions.place(model.p.x, y)}/>
                    </>}
            </div>
        </div>
    </div>;
}
