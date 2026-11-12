import {CONTROL_ROW_LEAD} from "../../inputs/controlRow";
import React from "react";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {SelectablePointButton} from "../../inputs/PointListInput";
import {useT} from "../../localization";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import Slider from "../../inputs/Slider";
import {PASCAL_CONIC_IDS, PASCAL_EXAMPLE_IDS, PASCAL_ORDER_IDS, PascalConicId, PascalExampleId, PascalModel, PascalOrderId, PascalScene, handlePoint, orderIdOf, reachableIndices} from "./pascalModel";
import {describePascal} from "./pascalText";
import {SHIFT_STEP} from "./pascalEdit";
import {pointText} from "./polePolarModel";

export interface PascalControlActions {
    loadExample(id: PascalExampleId): void;
    setConic(id: PascalConicId): void;
    setOrder(id: PascalOrderId): void;
    select(handle: number | undefined): void;
    /** Puts a handle at the `position`-th reachable table index (what the point's slider shows). */
    setPosition(handle: number, position: number): void;
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

interface PascalPointSliderProps {
    model: PascalModel;
    scene: PascalScene;
    handle: number;
    onPosition(position: number): void;
}

/** One point's slider over its reachable positions; it shows and announces the point's coordinates, never the table index. */
function PascalPointSlider({model, scene, handle, onPosition}: PascalPointSliderProps) {
    const t = useT();
    const list = reachableIndices(model.conic, handle);
    const value = Math.max(0, list.indexOf(model.indices[handle]));
    const name = scene.names[handle];
    // The scene holds the current position only; the other positions are those of the reachable table entries.
    const at = (position: number) => pointText(handlePoint(model.conic, handle, list[position]) ?? scene.handles[handle]);
    return <Slider customText={t("projective_point_named", {value0: name})} min={0} max={Math.max(0, list.length - 1)} step={1} bigStep={SHIFT_STEP}
                   cyclic={list.length} hideBounds value={value} onChange={onPosition} formatValue={at}
                   valueText={position => t("projective_k2_handle_at", {value0: name, value1: at(position)})}/>;
}

/**
 * The inspector of the Pascal and Pappus graph. The state sentence is the only text in the live region; the determinant, the
 * three intersections and the line are text as well as drawing. The conic, the example and the hexagon order are choices;
 * every point is selected for the arrow keys or stepped with its own buttons.
 */
export function PascalControls(props: PascalControlsProps) {
    const t = useT();
    const {model, scene, selected, nudged, actions} = props;
    const text = describePascal(scene, t);
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
                <div key={name} className={CONTROL_ROW_LEAD} data-selected={selected === handle} data-pascal-handle={handle}>
                    <SelectablePointButton label={name} pressed={selected === handle} onToggle={() => actions.select(selected === handle ? undefined : handle)}/>
                    <PascalPointSlider model={model} scene={scene} handle={handle} onPosition={position => actions.setPosition(handle, position)}/>
                </div>)}
        </div>
    </div>;
}
