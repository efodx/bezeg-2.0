import React, {useMemo} from "react";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {PointListInput} from "../../inputs/PointListInput";
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

const LIMIT = POLE_POLAR_NUMERATOR_LIMIT / POLE_POLAR_DENOMINATOR;
const isExampleId = (id: string): id is PolePolarExampleId => (POLE_POLAR_EXAMPLE_IDS as readonly string[]).includes(id);
const isConicId = (id: string): id is PolePolarConicId => (POLE_POLAR_CONIC_IDS as readonly string[]).includes(id);

const EXAMPLE_LABELS = {
    default: "projective_k3_example_default", on: "projective_k3_example_on", inside: "projective_k3_example_inside",
    infinity: "projective_k3_example_infinity", custom: "projective_k3_example_custom",
} as const;
const CONIC_LABELS = {
    ellipse: "projective_k3_conic_ellipse", circle: "projective_k3_conic_circle", parabola: "projective_k3_conic_parabola", hyperbola: "projective_k3_conic_hyperbola",
} as const;

/**
 * The inspector of the pole and polar graph. The region, the polar equation and the tangents are text as well as drawing; the
 * conic, the example and the kind of P are choices; P is placed with fields (steps of 0.2) or selected for the arrow keys.
 */
export function PolePolarControls(props: PolePolarControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {model, scene, selected, nudged, actions} = props;
    const text = describePolePolar(scene, t, language);
    const exampleOptions = POLE_POLAR_EXAMPLE_IDS.filter(id => id !== "custom" || model.example === "custom").map(id => ({value: id, text: t(EXAMPLE_LABELS[id])}));
    // Stable while the model is, so a refusal shown at a field stays until P changes.
    const finite = useMemo(() => [[model.p.x / POLE_POLAR_DENOMINATOR, model.p.y / POLE_POLAR_DENOMINATOR] as const], [model]);
    const direction = useMemo(() => [[model.ideal?.dx ?? 0, model.ideal?.dy ?? 0] as const], [model]);
    const where = pointText(scene.p);
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <ChoiceSelect label={t("projective_k3_example_label")} value={model.example} options={exampleOptions}
                          onChange={id => { if (isExampleId(id) && id !== "custom") actions.loadExample(id); }}/>
            <ChoiceSelect label={t("projective_k3_conic_label")} value={model.conic}
                          options={POLE_POLAR_CONIC_IDS.map(id => ({value: id, text: t(CONIC_LABELS[id])}))}
                          onChange={id => { if (isConicId(id)) actions.setConic(id); }}/>
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
            <ChoiceSelect label={t("projective_k3_mode_label")} value={model.ideal ? "ideal" : "finite"}
                          options={[{value: "finite", text: t("projective_k3_mode_finite")}, {value: "ideal", text: t("projective_k3_mode_ideal")}]}
                          onChange={mode => actions.setDirection(mode === "finite" ? undefined : model.ideal ?? {dx: 1, dy: 0})}/>
            {model.ideal
                ? <PointListInput title={t("projective_k3_direction_title")} pointLabel={() => "P"} axisLabels={["dx", "dy"]}
                                  points={direction} integer min={-POLE_POLAR_DIRECTION_LIMIT} max={POLE_POLAR_DIRECTION_LIMIT}
                                  selected={selected ? 0 : undefined} onSelect={at => actions.select(at !== undefined)}
                                  onCommit={(_, [dx, dy]) => dx === 0 && dy === 0 ? t("projective_k3_direction_zero") : void actions.setDirection({dx, dy})}/>
                : <PointListInput title={t("projective_k3_point_title")} pointLabel={() => "P"}
                                  points={finite} min={-LIMIT} max={LIMIT} grid={1 / POLE_POLAR_DENOMINATOR} step={1 / POLE_POLAR_DENOMINATOR} decimals={3}
                                  selected={selected ? 0 : undefined} onSelect={at => actions.select(at !== undefined)}
                                  onCommit={(_, [x, y]) => { actions.place(Math.round(x * POLE_POLAR_DENOMINATOR), Math.round(y * POLE_POLAR_DENOMINATOR)); }}/>}
        </div>
    </div>;
}
