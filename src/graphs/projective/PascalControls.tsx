import React from "react";
import {useT} from "../../localization";
import {PASCAL_CONIC_IDS, PASCAL_EXAMPLE_IDS, PASCAL_ORDER_IDS, PASCAL_ORDERS, PascalConicId, PascalExampleId, PascalModel, PascalOrderId, PascalScene, orderIdOf} from "./pascalModel";
import {describePascal} from "./pascalText";
import {pointText} from "./polePolarModel";

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

const EXAMPLE_LABELS = {
    default: "projective_k2_example_default", pappus: "projective_k2_example_pappus", infinity: "projective_k2_example_infinity", custom: "projective_k2_example_custom",
} as const;
const CONIC_LABELS = {
    ellipse: "projective_k2_conic_ellipse", parabola: "projective_k2_conic_parabola", hyperbola: "projective_k2_conic_hyperbola", linePair: "projective_k2_conic_line_pair",
} as const;
const ORDER_LABELS = {natural: "projective_k2_order_natural", pappus: "projective_k2_order_pappus", star: "projective_k2_order_star"} as const;

/**
 * The inspector of the Pascal and Pappus graph. The state sentence is the only text in the live region; the determinant, the
 * three intersections and the line are text as well as drawing. The conic, the example and the hexagon order are buttons;
 * every point is selected for the arrow keys or stepped with its own buttons.
 */
export function PascalControls(props: PascalControlsProps) {
    const t = useT();
    const {model, scene, selected, nudged, actions} = props;
    const text = describePascal(scene, t);
    const button = "btn btn-outline-secondary btn-sm";
    const currentOrder = orderIdOf(model.order);
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <div role="group" aria-label={t("projective_k2_example_label")}>
                {PASCAL_EXAMPLE_IDS.filter(id => id !== "custom").map(id =>
                    <button key={id} type="button" className={button} aria-pressed={model.example === id}
                            onClick={() => actions.loadExample(id)}>{t(EXAMPLE_LABELS[id])}</button>)}
            </div>
            {model.example === "custom" && <p className="inspector-help">{t(EXAMPLE_LABELS.custom)}</p>}
            <div role="group" aria-label={t("projective_k2_conic_label")}>
                {PASCAL_CONIC_IDS.map(id =>
                    <button key={id} type="button" className={button} aria-pressed={model.conic === id}
                            onClick={() => actions.setConic(id)}>{t(CONIC_LABELS[id])}</button>)}
            </div>
            <div role="group" aria-label={t("projective_k2_order_label")}>
                {PASCAL_ORDER_IDS.map(id =>
                    <button key={id} type="button" className={button} aria-pressed={currentOrder === id} data-pascal-order={PASCAL_ORDERS[id].join("")}
                            onClick={() => actions.setOrder(id)}>{t(ORDER_LABELS[id])}</button>)}
            </div>
        </div>
        <div className="inspector-group">
            <div role="status" data-projective-status={text.kind}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
            </div>
            <p className="inspector-help" data-projective-line="hexagon">{text.hexagon}</p>
            {text.determinant && <p className="inspector-help" data-projective-line="determinant">{text.determinant}</p>}
            {text.points.map((line, i) => <p key={i} className="inspector-help" data-projective-line={`point-${i + 1}`}>{line}</p>)}
            {text.line && <p className="inspector-help" data-projective-line="line">{text.line}</p>}
            <p className="visually-hidden" role="status" data-projective-nudge>
                {nudged === undefined ? "" : t("projective_k2_handle_at", {value0: scene.names[nudged], value1: pointText(scene.handles[nudged])})}
            </p>
        </div>
        <div className="inspector-group">
            <p className="inspector-help" data-projective-selection>
                {selected === undefined ? t("projective_k1_no_selection") : t("projective_k1_selected", {value0: scene.names[selected]})}
            </p>
            {scene.names.map((name, handle) =>
                <div key={name} className="pointset-row" data-selected={selected === handle} data-pascal-handle={handle}>
                    <button type="button" className={button} aria-pressed={selected === handle} onClick={() => actions.select(selected === handle ? undefined : handle)}>
                        <span aria-hidden="true">{name}</span><span className="visually-hidden">{t("projective_k1_select", {value0: name})}</span>
                    </button>
                    <button type="button" className={button} aria-label={t("projective_k2_step_back", {value0: name})} onClick={() => actions.step(handle, -1)}>◀</button>
                    <button type="button" className={button} aria-label={t("projective_k2_step_forward", {value0: name})} onClick={() => actions.step(handle, 1)}>▶</button>
                    <span data-pascal-position>{pointText(scene.handles[handle])}</span>
                </div>)}
        </div>
    </div>;
}
