import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {CROSS_RATIO_COORD_LIMIT, CROSS_RATIO_EXAMPLE_IDS, CrossRatioExampleId, CrossRatioModel, CrossRatioScene} from "./crossRatioModel";
import {handleName, handlePosition, HANDLE_COUNT} from "./crossRatioEdit";
import {describeCrossRatio} from "./crossRatioText";

export interface CrossRatioControlActions {
    loadExample(id: CrossRatioExampleId): void;
    select(handle: number | undefined): void;
    move(handle: number, x: number, y: number): void;
}

export interface CrossRatioControlsProps {
    model: CrossRatioModel;
    scene: CrossRatioScene;
    selected: number | undefined;
    /** The handle most recently stepped with the arrow keys; its new position is announced politely. */
    nudged?: number;
    actions: CrossRatioControlActions;
}

const EXAMPLE_LABELS = {
    default: "projective_k1_example_default", harmonic: "projective_k1_example_harmonic",
    infinity: "projective_k1_example_infinity", custom: "projective_k1_example_custom",
} as const;

/** A whole-number field that keeps what is being typed and commits every valid integer (same behaviour as the point-set field). */
function IntegerField(props: {label: string, value: number, onCommit: (value: number) => void}) {
    const [draft, setDraft] = useState(String(props.value));
    const [shownValue, setShownValue] = useState(props.value);
    if (shownValue !== props.value) {
        setShownValue(props.value);
        setDraft(String(props.value));
    }
    return <label className="pointset-field">
        <input type="number" step={1} min={-CROSS_RATIO_COORD_LIMIT} max={CROSS_RATIO_COORD_LIMIT} inputMode="numeric" aria-label={props.label} value={draft}
               onBlur={() => setDraft(String(props.value))}
               onChange={event => {
                   setDraft(event.target.value);
                   const parsed = Number(event.target.value);
                   if (event.target.value.trim() !== "" && Number.isInteger(parsed)) props.onCommit(parsed);
               }}/>
    </label>;
}

/**
 * The inspector of the cross-ratio graph. Every value the board draws is also text here (the status and ratios in a live region), and every
 * drag has a keyboard equivalent: Select picks a handle for the arrow keys, and the numeric fields place it exactly.
 */
export function CrossRatioControls(props: CrossRatioControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {model, scene, selected, nudged, actions} = props;
    const nudgedAt = nudged === undefined ? undefined : handlePosition(model, nudged);
    const text = describeCrossRatio(scene, t, language);
    const button = "btn btn-outline-secondary btn-sm";
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <div role="group" aria-label={t("projective_k1_example_label")}>
                {CROSS_RATIO_EXAMPLE_IDS.filter(id => id !== "custom").map(id =>
                    <button key={id} type="button" className={button} aria-pressed={model.example === id}
                            onClick={() => actions.loadExample(id)}>{t(EXAMPLE_LABELS[id])}</button>)}
            </div>
            {model.example === "custom" && <p className="inspector-help">{t(EXAMPLE_LABELS.custom)}</p>}
        </div>
        <div className="inspector-group">
            <div role="status" data-projective-status={text.statusKind}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
                {text.originalRatio && <p className="inspector-help" data-projective-line="original-ratio">{text.originalRatio}</p>}
                {text.imageRatio && <p className="inspector-help" data-projective-line="image-ratio">{text.imageRatio}</p>}
            </div>
            {text.limit && <p className="inspector-help" data-projective-line="limit">{text.limit}</p>}
            <p className="inspector-help" data-projective-line="originals">{t("projective_k1_originals", {value0: text.originals})}</p>
            {text.images && <p className="inspector-help" data-projective-line="images">{t("projective_k1_images", {value0: text.images})}</p>}
            <p className="visually-hidden" role="status" data-projective-nudge>
                {nudged === undefined || nudgedAt === undefined ? "" : nudged < 4
                    ? t("projective_k1_nudged_line", {value0: handleName(nudged), value1: String(nudgedAt.x)})
                    : t("projective_k1_nudged_point", {value0: handleName(nudged), value1: String(nudgedAt.x), value2: String(nudgedAt.y)})}
            </p>
        </div>
        <div className="inspector-group">
            <p className="inspector-help" data-projective-selection>{selected === undefined ? t("projective_k1_no_selection") : t("projective_k1_selected", {value0: handleName(selected)})}</p>
            <ol className="pointset-list">
                {Array.from({length: HANDLE_COUNT}, (_, handle) => {
                    const at = handlePosition(model, handle);
                    const name = handleName(handle);
                    return <li key={handle} className="pointset-row" data-selected={selected === handle}>
                        <button type="button" className={button} aria-pressed={selected === handle}
                                onClick={() => actions.select(selected === handle ? undefined : handle)}>
                            <span aria-hidden="true">{name}</span><span className="visually-hidden">{t("projective_k1_select", {value0: name})}</span>
                        </button>
                        <IntegerField label={t("projective_k1_coordinate_x", {value0: name})} value={at.x} onCommit={x => actions.move(handle, x, at.y)}/>
                        {handle >= 4 && <IntegerField label={t("projective_k1_coordinate_y", {value0: name})} value={at.y} onCommit={y => actions.move(handle, at.x, y)}/>}
                    </li>;
                })}
            </ol>
        </div>
    </div>;
}
