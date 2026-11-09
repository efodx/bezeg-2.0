import React, {useMemo} from "react";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {PointListInput, PointRow1} from "../../inputs/PointListInput";
import {useLanguage, useT} from "../../localization";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
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

const isExampleId = (id: string): id is CrossRatioExampleId => (CROSS_RATIO_EXAMPLE_IDS as readonly string[]).includes(id);

const EXAMPLE_LABELS = {
    default: "projective_k1_example_default", harmonic: "projective_k1_example_harmonic",
    infinity: "projective_k1_example_infinity", custom: "projective_k1_example_custom",
} as const;

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
    const nudgeText = nudged === undefined || nudgedAt === undefined ? "" : nudged < 4
        ? t("projective_k1_nudged_line", {value0: handleName(nudged), value1: String(nudgedAt.x)})
        : t("projective_k1_nudged_point", {value0: handleName(nudged), value1: String(nudgedAt.x), value2: String(nudgedAt.y)});
    // The one announcement: the status and ratios, then the stepped handle; settled, so a drag is not read frame by frame.
    const liveReadout = useStatusReadout([text.status, text.originalRatio, text.imageRatio, nudgeText].filter(Boolean).join("\n"), true);
    const exampleOptions = CROSS_RATIO_EXAMPLE_IDS.filter(id => id !== "custom" || model.example === "custom").map(id => ({value: id, text: t(EXAMPLE_LABELS[id])}));
    // Stable while the model is, so a refusal shown at a field stays until the points change.
    const [onLine, inPlane] = useMemo(() => {
        const positions = Array.from({length: HANDLE_COUNT}, (_, handle) => handlePosition(model, handle));
        return [positions.slice(0, 4).map(at => [at.x] as const), positions.slice(4).map(at => [at.x, at.y] as const)] as const;
    }, [model]);
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <ChoiceSelect label={t("projective_k1_example_label")} value={model.example} options={exampleOptions}
                          onChange={id => { if (isExampleId(id) && id !== "custom") actions.loadExample(id); }}/>
        </div>
        <div className="inspector-group">
            <div data-projective-status={text.statusKind}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
                {text.originalRatio && <p className="inspector-help" data-projective-line="original-ratio">{text.originalRatio}</p>}
                {text.imageRatio && <p className="inspector-help" data-projective-line="image-ratio">{text.imageRatio}</p>}
            </div>
            {text.limit && <p className="inspector-help" data-projective-line="limit">{text.limit}</p>}
            <p className="inspector-help" data-projective-line="originals">{t("projective_k1_originals", {value0: text.originals})}</p>
            {text.images && <p className="inspector-help" data-projective-line="images">{t("projective_k1_images", {value0: text.images})}</p>}
            <LiveReadout readout={liveReadout} dataAttribute="projective-live"/>
        </div>
        <div className="inspector-group">
            <p className="inspector-help" data-projective-selection>{selected === undefined ? t("projective_k1_no_selection") : t("projective_k1_selected", {value0: handleName(selected)})}</p>
            <PointListInput<PointRow1> title={t("projective_k1_points_line")} axisLabels={["x"]} pointLabel={handle => t("projective_point_named", {value0: handleName(handle)})}
                                       points={onLine} integer min={-CROSS_RATIO_COORD_LIMIT} max={CROSS_RATIO_COORD_LIMIT}
                                       selected={selected} onSelect={actions.select}
                                       onCommit={(handle, [x]) => { actions.move(handle, x, 0); }}/>
            <PointListInput title={t("projective_k1_points_plane")} pointLabel={at => t("projective_point_named", {value0: handleName(at + 4)})}
                            points={inPlane} integer min={-CROSS_RATIO_COORD_LIMIT} max={CROSS_RATIO_COORD_LIMIT}
                            selected={selected === undefined || selected < 4 ? undefined : selected - 4}
                            onSelect={at => actions.select(at === undefined ? undefined : at + 4)}
                            onCommit={(at, [x, y]) => { actions.move(at + 4, x, y); }}/>
        </div>
    </div>;
}
