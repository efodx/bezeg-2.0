import {Button} from "react-bootstrap";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import Slider from "../../inputs/Slider";
import {useT} from "../../localization";
import {defaultPatchPresets} from "./patchPresetCollections";
import type {PatchDensity} from "./patchSceneBuilder";
import type {CameraPresetName} from "./surface-view/surfaceMath";

/** What the tensor patch panels show; read from the scene store on every render. */
export interface TensorPatchPanelState {
    m: number;
    n: number;
    u: number;
    v: number;
    showControlNet: boolean;
    showIsoCurves: boolean;
    showBoundaryCurves: boolean;
    showShading: boolean;
    isoDensity: PatchDensity;
    shadingDensity: PatchDensity;
    zMode: boolean;
}

export type PatchVisibilityKey = "showControlNet" | "showIsoCurves" | "showBoundaryCurves" | "showShading";

/** What the controls ask the graph to do; the graph owns every change. */
export interface TensorPatchPanelActions {
    useStartingPatch(index: number): void;
    setDegree(direction: "u" | "v", degree: number): void;
    setParameter(parameter: "u" | "v", value: number): void;
    setVisibility(key: PatchVisibilityKey, visible: boolean): void;
    setDensity(kind: "iso" | "shading", density: PatchDensity): void;
    applyCameraPreset(name: CameraPresetName): void;
    resetView(): void;
    setZMode(zMode: boolean): void;
}

const DEGREES = [1, 2, 3, 4].map(degree => ({value: String(degree), text: String(degree)}));
const DENSITIES = [8, 16].map(density => ({value: String(density), text: String(density)}));
const asDensity = (value: string): PatchDensity => value === "16" ? 16 : 8;

export function TensorPatchEditPanel({state, actions}: {state: TensorPatchPanelState; actions: TensorPatchPanelActions}) {
    const t = useT();
    return <>
        <div className="inspector-group"><h3>{t("patch_starting_heading")}</h3>
            <div className="workspace-curve-picker">{defaultPatchPresets.map((preset, index) =>
                <Button key={preset.id} onClick={() => actions.useStartingPatch(index)}>{t(preset.name)}</Button>)}</div>
        </div>
        <div className="inspector-group"><h3>{t("patch_degree_heading")}</h3>
            <ChoiceSelect label={t("patch_degree_u")} value={String(state.m)} options={DEGREES}
                          onChange={value => actions.setDegree("u", Number(value))} help={t("patch_degree_help")}/>
            <ChoiceSelect label={t("patch_degree_v")} value={String(state.n)} options={DEGREES}
                          onChange={value => actions.setDegree("v", Number(value))}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_point_heading")}</h3>
            <Slider customText={t("patch_parameter_u")} min={0} max={1} step={0.01} value={state.u}
                    onChange={value => actions.setParameter("u", value)}/>
            <Slider customText={t("patch_parameter_v")} min={0} max={1} step={0.01} value={state.v}
                    onChange={value => actions.setParameter("v", value)}/>
        </div>
    </>;
}

export function TensorPatchDisplayPanel({state, actions}: {state: TensorPatchPanelState; actions: TensorPatchPanelActions}) {
    const t = useT();
    return <>
        <div className="inspector-group"><h3>{t("patch_visibility_heading")}</h3>
            <OnOffSwitch label={t("patch_show_control_net")} checked={state.showControlNet} onChange={on => actions.setVisibility("showControlNet", on)}/>
            <OnOffSwitch label={t("patch_show_iso_curves")} checked={state.showIsoCurves} onChange={on => actions.setVisibility("showIsoCurves", on)}/>
            <OnOffSwitch label={t("patch_show_boundary_curves")} checked={state.showBoundaryCurves} onChange={on => actions.setVisibility("showBoundaryCurves", on)}/>
            <OnOffSwitch label={t("patch_show_shading")} checked={state.showShading} onChange={on => actions.setVisibility("showShading", on)}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_density_heading")}</h3>
            <ChoiceSelect label={t("patch_iso_density")} value={String(state.isoDensity)} options={DENSITIES}
                          onChange={value => actions.setDensity("iso", asDensity(value))}/>
            <ChoiceSelect label={t("patch_shading_density")} value={String(state.shadingDensity)} options={DENSITIES}
                          onChange={value => actions.setDensity("shading", asDensity(value))}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_camera_heading")}</h3>
            <div className="workspace-curve-picker">
                <Button onClick={() => actions.applyCameraPreset("front")}>{t("patch_view_front")}</Button>
                <Button onClick={() => actions.applyCameraPreset("top")}>{t("patch_view_top")}</Button>
                <Button onClick={() => actions.applyCameraPreset("side")}>{t("patch_view_side")}</Button>
                <Button onClick={() => actions.applyCameraPreset("isometric")}>{t("patch_view_isometric")}</Button>
                <Button onClick={() => actions.resetView()}>{t("patch_view_reset")}</Button>
            </div>
            <OnOffSwitch label={t("patch_move_height")} checked={state.zMode} onChange={on => actions.setZMode(on)}/>
            <p className="inspector-help">{t("patch_move_height_help")}</p>
        </div>
    </>;
}
