import React, {useMemo} from "react";
import {BooleanField} from "../../inputs/BooleanField";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {PointListInput} from "../../inputs/PointListInput";
import {useLanguage, useT} from "../../localization";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
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

const LIMIT = FIVE_POINT_NUMERATOR_LIMIT / FIVE_POINT_DENOMINATOR;
const isExampleId = (id: string): id is FivePointExampleId => (FIVE_POINT_EXAMPLE_IDS as readonly string[]).includes(id);

const INDICES = Array.from({length: FIVE_POINT_COUNT}, (_, i) => i);

/**
 * The inspector of the five-point graph. The status, the conic, the control points, the weight, the Farin points and the sampled
 * deviation are text as well as drawing; the points are placed with fields or selected for the arrow keys.
 */
export function FivePointControls(props: FivePointControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {model, scene, stale, selected, nudged, extrapolation, actions} = props;
    const text = describeFivePoint(scene, stale, t, language);
    const exampleOptions = FIVE_POINT_EXAMPLE_IDS.filter(id => id !== "custom" || model.example === "custom").map(id => ({value: id, text: t(EXAMPLE_LABELS[id])}));
    const choice = (i: number) => ({value: String(i), text: FIVE_POINT_NAMES[i]});
    // Stable while the model is, so a refusal shown at a field stays until the points change.
    const points = useMemo(() => model.points.map(p => [p.x / FIVE_POINT_DENOMINATOR, p.y / FIVE_POINT_DENOMINATOR] as const), [model]);
    const nameOf = (i: number) => FIVE_POINT_NAMES[i];
    const where = (i: number) => pointText(pointOf(model.points[i]));
    const nudgeText = nudged && selected !== undefined ? t("projective_five_point_nudged", {value0: nameOf(selected), value1: where(selected)}) : "";
    // The one announcement: the status sentence, then the stepped point; settled, so a drag is not read frame by frame.
    const liveReadout = useStatusReadout([text.status, nudgeText].filter(Boolean).join("\n"), true);
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <ChoiceSelect label={t("projective_five_point_example_label")} value={model.example} options={exampleOptions}
                          onChange={id => { if (isExampleId(id) && id !== "custom") actions.loadExample(id); }}/>
        </div>
        <div className="inspector-group">
            <div data-projective-status={text.kind} data-projective-stale={stale}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
            </div>
            {text.conic && <p className="inspector-help" data-projective-line="conic">{text.conic}</p>}
            {text.control && <p className="inspector-help" data-projective-line="control">{text.control}</p>}
            {text.weight && <p className="inspector-help" data-projective-line="weight">{text.weight}</p>}
            {text.weightKind && <p className="inspector-help" data-projective-line="weight-kind">{text.weightKind}</p>}
            {text.farin && <p className="inspector-help" data-projective-line="farin">{text.farin}</p>}
            {text.deviation && <p className="inspector-help" data-projective-line="deviation">{text.deviation}</p>}
            <LiveReadout readout={liveReadout} dataAttribute="projective-live"/>
        </div>
        <div className="inspector-group">
            <ChoiceSelect label={t("projective_five_point_end_a")} value={String(model.a)} options={INDICES.map(choice)}
                          onChange={value => actions.setEnd("a", Number(value))}/>
            <ChoiceSelect label={t("projective_five_point_end_b")} value={String(model.b)} options={INDICES.map(choice)}
                          onChange={value => actions.setEnd("b", Number(value))}/>
            <ChoiceSelect label={t("projective_five_point_third")} value={String(model.t)}
                          options={INDICES.filter(i => i !== model.a && i !== model.b).map(choice)}
                          onChange={value => actions.setThird(Number(value))}/>
            <BooleanField variant="checkbox" checked={extrapolation} label={t("projective_five_point_extrapolation")} onChange={actions.setExtrapolation}/>
        </div>
        <div className="inspector-group">
            <p className="inspector-help" data-projective-selection>
                {selected !== undefined ? t("projective_k1_selected", {value0: nameOf(selected)}) : t("projective_k1_no_selection")}
            </p>
            <PointListInput title={t("projective_five_point_points")} pointLabel={i => t("projective_point_named", {value0: nameOf(i)})}
                            points={points} min={-LIMIT} max={LIMIT} grid={1 / FIVE_POINT_DENOMINATOR} step={1 / FIVE_POINT_DENOMINATOR} decimals={4}
                            selected={selected} onSelect={actions.select}
                            onCommit={(i, [x, y]) => { actions.place(i, Math.round(x * FIVE_POINT_DENOMINATOR), Math.round(y * FIVE_POINT_DENOMINATOR)); }}/>
        </div>
    </div>;
}
