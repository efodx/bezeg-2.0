import React from "react";
import {BooleanField} from "../../inputs/BooleanField";
import Slider from "../../inputs/Slider";
import {useLanguage, useT} from "../../localization";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {formatNumber} from "../../analysis/format";
import {
    THREE_VIEWS_ANGLE_STEPS, THREE_VIEWS_LIMIT, THREE_VIEWS_STEP_DEGREES, THREE_VIEWS_TENTHS, ThreeViewsModel, ThreeViewsScene,
} from "./threeViewsModel";
import {describeThreeViews} from "./threeViewsText";

export interface ThreeViewsControlActions {
    setC(tenths: number): void;
    setPointOn(on: boolean): void;
    setAngle(step: number): void;
}

export interface ThreeViewsControlsProps {
    model: ThreeViewsModel;
    scene: ThreeViewsScene;
    actions: ThreeViewsControlActions;
}

/**
 * The inspector of the "one conic, three views" graph: a slider for c in tenths (a native range input, so the arrow keys, Home, End
 * and Page keys work), the optional point with its angle, and the status, equation, discriminant, determinant and the points at infinity
 * as text. There is no Reset button here: the app-level Reset restores the default through `importPresetData`.
 */
export function ThreeViewsControls(props: ThreeViewsControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const {model, scene, actions} = props;
    const text = describeThreeViews(scene, t, language);
    // The one announcement: the type of the conic; settled, so a slider drag is not read frame by frame.
    const liveReadout = useStatusReadout(text.status, true);
    const angleDegrees = model.angle * THREE_VIEWS_STEP_DEGREES;
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <Slider customText={t("projective_three_views_slider_label")} min={-THREE_VIEWS_LIMIT / THREE_VIEWS_TENTHS} max={THREE_VIEWS_LIMIT / THREE_VIEWS_TENTHS}
                    step={1 / THREE_VIEWS_TENTHS} decimals={1} value={model.c / THREE_VIEWS_TENTHS} grid={1 / THREE_VIEWS_TENTHS}
                    valueText={c => t("projective_three_views_slider_value", {value0: formatNumber(c, language, 1)})}
                    onChange={c => { actions.setC(Math.round(c * THREE_VIEWS_TENTHS)); }}/>
            <p className="inspector-help" data-projective-line="c">{t("projective_three_views_slider_value", {value0: formatNumber(model.c / THREE_VIEWS_TENTHS, language, 1)})}</p>
        </div>
        <div className="inspector-group">
            <div data-projective-status={scene.type} data-projective-contact={scene.contact}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
            </div>
            <LiveReadout readout={liveReadout} dataAttribute="projective-live"/>
            <p className="inspector-help" data-projective-line="equation">{text.equation}</p>
            <p className="inspector-help" data-projective-line="discriminant">{text.discriminant}</p>
            <p className="inspector-help" data-projective-line="determinant">{text.determinant}</p>
            <p className="inspector-help" data-projective-line="infinity">{text.infinity}</p>
            {text.clipped && <p className="inspector-help" data-projective-line="clipped">{text.clipped}</p>}
        </div>
        <div className="inspector-group">
            <BooleanField variant="checkbox" checked={model.pointOn} label={t("projective_three_views_point_toggle")} onChange={actions.setPointOn}/>
            <Slider customText={t("projective_three_views_angle_label")} min={0} max={(THREE_VIEWS_ANGLE_STEPS - 1) * THREE_VIEWS_STEP_DEGREES}
                    step={THREE_VIEWS_STEP_DEGREES} grid={THREE_VIEWS_STEP_DEGREES} value={angleDegrees}
                    unavailableReason={model.pointOn ? undefined : t("projective_three_views_angle_unavailable")}
                    valueText={degrees => `${formatNumber(degrees, language, 0)}°`}
                    onChange={degrees => { actions.setAngle(Math.round(degrees / THREE_VIEWS_STEP_DEGREES)); }}/>
            {text.point && <p className="inspector-help" data-projective-line="point">{text.point}</p>}
        </div>
    </div>;
}
