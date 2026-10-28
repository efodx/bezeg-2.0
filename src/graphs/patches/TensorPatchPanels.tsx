import {useCallback, useState} from "react";
import {Button} from "react-bootstrap";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import Slider from "../../inputs/Slider";
import {currentLanguage, useT} from "../../localization";
import {FunctionReadout} from "../functions/FunctionReadout";
import {defaultPatchPresets} from "./patchPresetCollections";
import type {PatchDensity} from "./patchSceneBuilder";
import {CAMERA_PRESETS, CameraPresetName} from "./surface-view/surfaceMath";
import type {Xyz} from "./surface-view/surfaceScene";

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
    /** Orbit angles in radians; the Prikaz controls show them in degrees. */
    camera: {az: number; el: number};
}

/** The selected control point `b_ij` as the Uredi editor shows it. */
export interface PatchSelection {
    i: number;
    j: number;
    xyz: Xyz;
    /** The Bernstein weight B_i^m(u) B_j^n(v) at the current (u, v). */
    weight: number;
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
    /** Selects `b_ij`; both undefined clears the selection, and one undefined index takes the selected point's (or 0). */
    selectIndex(i: number | undefined, j: number | undefined): void;
    /** Moves the selected point to the (finite) coordinates. */
    setSelectedCoordinates(xyz: Xyz): void;
    setCameraAngle(angle: "az" | "el", degrees: number): void;
    /** The element that shows the parameter-domain inset, or null when it goes away. */
    setInsetContainer(container: HTMLElement | null): void;
}

const radToDeg = (radians: number) => radians * 180 / Math.PI;
/** The azimuth in degrees, wrapped to [-180, 180) so repeated orbiting stays on the slider. */
export const azimuthDegrees = (radians: number) => ((radToDeg(radians) + 180) % 360 + 360) % 360 - 180;
const MAX_ELEVATION_DEGREES = radToDeg(CAMERA_PRESETS.top.el);

const DEGREES = [1, 2, 3, 4].map(degree => ({value: String(degree), text: String(degree)}));
const DENSITIES = [8, 16].map(density => ({value: String(density), text: String(density)}));
const asDensity = (value: string): PatchDensity => value === "16" ? 16 : 8;

/** Renders a non-negative integer index with Unicode subscript digits (P₁₂), matching the P_{ij} scene labels. */
export const subscriptDigits = (index: number): string => String(index).replace(/[0-9]/g, digit => String.fromCharCode(0x2080 + Number(digit)));

/** The square the graph draws its parameter board in; the graph owns the board and frees it when this goes away. */
export function ParameterInset({attach, label}: {attach: (container: HTMLElement | null) => void; label: string}) {
    const ref = useCallback((container: HTMLDivElement | null) => attach(container), [attach]);
    return <div className="patch-parameter-inset" ref={ref} role="group" aria-label={label}/>;
}

const AXES = ["x", "y", "z"] as const;
const NO_INDEX = "";

/** The coordinates of the selected point; remounts (and so shows the store's values) whenever they change elsewhere. */
function PointEditor({selection, actions}: {selection: PatchSelection; actions: TensorPatchPanelActions}) {
    const t = useT();
    const [error, setError] = useState(false);
    const name = `b${selection.i}${selection.j}`;
    return <div className="point-coordinate-editor patch-point-editor"><form className="point-coordinate-form" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next = AXES.map(axis => Number(data.get(axis)));
        // An empty field is Number("") = 0, so it is checked as text as well.
        if (next.some(value => !Number.isFinite(value)) || AXES.some(axis => String(data.get(axis)).trim() === "")) {
            setError(true);
            return;
        }
        setError(false);
        actions.setSelectedCoordinates([next[0], next[1], next[2]]);
    }}>
        <fieldset className="point-coordinate-row"><legend><span className="point-coordinate-name" aria-hidden="true">{name}</span><span className="visually-hidden">{name}</span></legend>
            <div className="point-coordinate-values patch-xyz-values">
                {AXES.map((axis, k) => <label key={axis}><span className="point-coordinate-axis" aria-hidden="true">{axis}</span>
                    <input aria-label={`${name} ${axis}`} name={axis} type="number" step="any" required defaultValue={selection.xyz[k]}/></label>)}
            </div>
        </fieldset>
        <button className="point-coordinate-submit" type="submit">{t("apply_coordinates")}</button>
        {error && <p role="alert">{t("enter_finite_numeric_coordinates")}</p>}
    </form></div>;
}

export function TensorPatchEditPanel({state, selection, actions}: {state: TensorPatchPanelState; selection?: PatchSelection; actions: TensorPatchPanelActions}) {
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
            <ParameterInset attach={actions.setInsetContainer} label={t("patch_parameter_inset_label")}/>
            <p className="inspector-help">{t("patch_parameter_inset_help")}</p>
        </div>
        <div className="inspector-group"><h3>{t("patch_control_point_heading")}</h3>
            <ChoiceSelect label={t("patch_index_i")} value={selection ? String(selection.i) : NO_INDEX} options={indexOptions(state.m, t("patch_no_selection"))}
                          onChange={value => value === NO_INDEX ? actions.selectIndex(undefined, undefined) : actions.selectIndex(Number(value), selection?.j)}/>
            <ChoiceSelect label={t("patch_index_j")} value={selection ? String(selection.j) : NO_INDEX} options={indexOptions(state.n, t("patch_no_selection"))}
                          onChange={value => value === NO_INDEX ? actions.selectIndex(undefined, undefined) : actions.selectIndex(selection?.i, Number(value))}/>
            {selection
                ? <PointEditor key={`${selection.i}-${selection.j}-${selection.xyz.join(",")}`} selection={selection} actions={actions}/>
                : <p className="inspector-help">{t("patch_select_point_help")}</p>}
        </div>
        {selection && <FunctionReadout title={t("patch_bernstein_heading")} rows={[{
            id: "bernstein-weight", label: t("patch_bernstein_weight", {value0: subscriptDigits(selection.i), value1: subscriptDigits(selection.j)}),
            value: formatNumber(selection.weight, currentLanguage(), 4),
        }]} note={t("patch_bernstein_help")}/>}
    </>;
}

const indexOptions = (degree: number, none: string) =>
    [{value: NO_INDEX, text: none}, ...Array.from({length: degree + 1}, (_, k) => ({value: String(k), text: String(k)}))];

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
            <Slider customText={t("patch_camera_azimuth")} min={-180} max={180} step={1} decimals={0} value={azimuthDegrees(state.camera.az)}
                    onChange={degrees => actions.setCameraAngle("az", degrees)}/>
            <Slider customText={t("patch_camera_elevation")} min={-MAX_ELEVATION_DEGREES} max={MAX_ELEVATION_DEGREES} step={1} decimals={1}
                    value={radToDeg(state.camera.el)} onChange={degrees => actions.setCameraAngle("el", degrees)}/>
            <OnOffSwitch label={t("patch_move_height")} checked={state.zMode} onChange={on => actions.setZMode(on)}/>
            <p className="inspector-help">{t("patch_move_height_help")}</p>
        </div>
    </>;
}
