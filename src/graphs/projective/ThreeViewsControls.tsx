import React from "react";
import {useLanguage, useT} from "../../localization";
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
    const angleDegrees = model.angle * THREE_VIEWS_STEP_DEGREES;
    return <div className="function-inspector pointset-inspector">
        <div className="inspector-group">
            <label className="inspector-help">{t("projective_three_views_slider_label")}
                <input type="range" min={-THREE_VIEWS_LIMIT} max={THREE_VIEWS_LIMIT} step={1} value={model.c}
                       aria-valuetext={t("projective_three_views_slider_value", {value0: text.cText})}
                       onChange={event => actions.setC(Number(event.target.value))}/>
            </label>
            <p className="inspector-help" data-projective-line="c">{t("projective_three_views_slider_value", {value0: formatNumber(model.c / THREE_VIEWS_TENTHS, language, 1)})}</p>
        </div>
        <div className="inspector-group">
            <div role="status" data-projective-status={scene.type} data-projective-contact={scene.contact}>
                <p className="inspector-help" data-projective-line="status">{text.status}</p>
            </div>
            <p className="inspector-help" data-projective-line="equation">{text.equation}</p>
            <p className="inspector-help" data-projective-line="discriminant">{text.discriminant}</p>
            <p className="inspector-help" data-projective-line="determinant">{text.determinant}</p>
            <p className="inspector-help" data-projective-line="infinity">{text.infinity}</p>
        </div>
        <div className="inspector-group">
            <label className="inspector-help">
                <input type="checkbox" checked={model.pointOn} onChange={event => actions.setPointOn(event.target.checked)}/> {t("projective_three_views_point_toggle")}
            </label>
            <label className="inspector-help">{t("projective_three_views_angle_label")}
                <input type="range" min={0} max={THREE_VIEWS_ANGLE_STEPS - 1} step={1} value={model.angle} disabled={!model.pointOn}
                       aria-valuetext={`${angleDegrees}°`} onChange={event => actions.setAngle(Number(event.target.value))}/>
            </label>
            {text.point && <p className="inspector-help" data-projective-line="point">{text.point}</p>}
        </div>
    </div>;
}
