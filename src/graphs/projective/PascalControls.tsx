import React from "react";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {SelectablePointButton} from "../../inputs/PointListInput";
import {useT} from "../../localization";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {DIRECTION_TABLE_SIZE} from "../../projective/conicPencil";
import {PASCAL_CONIC_IDS, PASCAL_EXAMPLE_IDS, PASCAL_ORDER_IDS, PascalConicId, PascalExampleId, PascalModel, PascalOrderId, PascalScene, orderIdOf} from "./pascalModel";
import {describePascal} from "./pascalText";
import {pointText} from "./polePolarModel";
import "./PascalControls.css";

export interface PascalControlActions {
    loadExample(id: PascalExampleId): void;
    setConic(id: PascalConicId): void;
    setOrder(id: PascalOrderId): void;
    select(handle: number | undefined): void;
    /** Steps a handle along the direction table. */
    step(handle: number, steps: number): void;
}

export interface PascalControlsProps {
    model: PascalModel;
    scene: PascalScene;
    selected: number | undefined;
    /** The handle last stepped with the arrow keys; its new position is announced politely. */
    nudged?: number;
    actions: PascalControlActions;
}

const isExampleId = (id: string): id is PascalExampleId => (PASCAL_EXAMPLE_IDS as readonly string[]).includes(id);
const isConicId = (id: string): id is PascalConicId => (PASCAL_CONIC_IDS as readonly string[]).includes(id);
const isOrderId = (id: string): id is PascalOrderId => (PASCAL_ORDER_IDS as readonly string[]).includes(id);

const EXAMPLE_LABELS = {
    default: "projective_k2_example_default", pappus: "projective_k2_example_pappus", infinity: "projective_k2_example_infinity", custom: "projective_k2_example_custom",
} as const;
const CONIC_LABELS = {
    ellipse: "projective_k2_conic_ellipse", parabola: "projective_k2_conic_parabola", hyperbola: "projective_k2_conic_hyperbola", linePair: "projective_k2_conic_line_pair",
} as const;
const ORDER_LABELS = {natural: "projective_k2_order_natural", pappus: "projective_k2_order_pappus", star: "projective_k2_order_star"} as const;

/**
 * The inspector of the Pascal and Pappus graph. The state sentence is the only text in the live region; the determinant, the
 * three intersections and the line are text as well as drawing. The conic, the example and the hexagon order are choices;
 * every point is selected for the arrow keys or stepped with its own buttons.
 */
export function PascalControls(props: PascalControlsProps) {
    const t = useT();
    const {model, scene, selected, nudged, actions} = props;
    const text = describePascal(scene, t);
    const button = "btn btn-outline-secondary btn-sm";
    const nudgeText = nudged === undefined ? "" : t("projective_k2_handle_at", {value0: scene.names[nudged], value1: pointText(scene.handles[nudged])});
    // The one announcement: the state sentence, then the stepped point; settled, so a drag is not read frame by frame.
    const liveReadout = useStatusReadout([text.status, nudgeText].filter(Boolean).join("\n"), true);
    const currentOrder = orderIdOf(model.order);
    // An imported file may hold any permutation; it is shown as a disabled entry that cannot be chosen.
    const orderOptions = [...PASCAL_ORDER_IDS.map(id => ({value: id as string, text: t(ORDER_LABELS[id])})),
        ...(currentOrder === undefined ? [{value: "", text: t("projective_k2_order_custom"), disabled: true}] : [])];
    const exampleOptions = PASCAL_EXAMPLE_IDS.filter(id => id !== "custom" || model.example === "custom").map(id => ({value: id, text: t(EXAMPLE_LABELS[id])}));
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <ChoiceSelect label={t("projective_k2_example_label")} value={model.example} options={exampleOptions}
                          onChange={id => { if (isExampleId(id) && id !== "custom") actions.loadExample(id); }}/>
            <ChoiceSelect label={t("projective_k2_conic_label")} value={model.conic}
                          options={PASCAL_CONIC_IDS.map(id => ({value: id, text: t(CONIC_LABELS[id])}))}
                          onChange={id => { if (isConicId(id)) actions.setConic(id); }}/>
            <ChoiceSelect label={t("projective_k2_order_label")} value={currentOrder ?? ""}
                          options={orderOptions}
                          onChange={id => { if (isOrderId(id)) actions.setOrder(id); }}/>
        </div>
        <div className="inspector-group">
            <div data-projective-status={text.kind}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
            </div>
            <p className="inspector-help" data-projective-line="hexagon">{text.hexagon}</p>
            {text.determinant && <p className="inspector-help" data-projective-line="determinant">{text.determinant}</p>}
            {text.points.map((line, i) => <p key={i} className="inspector-help" data-projective-line={`point-${i + 1}`}>{line}</p>)}
            {text.line && <p className="inspector-help" data-projective-line="line">{text.line}</p>}
            <LiveReadout readout={liveReadout} dataAttribute="projective-live"/>
        </div>
        <div className="inspector-group">
            <p className="inspector-help" data-projective-selection>
                {selected === undefined ? t("projective_k1_no_selection") : t("projective_k1_selected", {value0: scene.names[selected]})}
            </p>
            {scene.names.map((name, handle) =>
                <div key={name} className="pointset-row" data-selected={selected === handle} data-pascal-handle={handle}>
                    <SelectablePointButton label={name} pressed={selected === handle} onToggle={() => actions.select(selected === handle ? undefined : handle)}/>
                    <button type="button" className={button} aria-label={t("projective_k2_step_back", {value0: name})} onClick={() => actions.step(handle, -1)}>◀</button>
                    <button type="button" className={button} aria-label={t("projective_k2_step_forward", {value0: name})} onClick={() => actions.step(handle, 1)}>▶</button>
                    <span data-pascal-position>{pointText(scene.handles[handle])}</span>
                    <span data-pascal-index={model.indices[handle]}>{t("projective_k2_table_index", {value0: String(model.indices[handle] + 1), value1: String(DIRECTION_TABLE_SIZE)})}</span>
                </div>)}
        </div>
    </div>;
}
