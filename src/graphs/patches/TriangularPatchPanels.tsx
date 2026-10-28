import {Button} from "react-bootstrap";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import Slider from "../../inputs/Slider";
import {currentLanguage, useT} from "../../localization";
import {FunctionReadout} from "../functions/FunctionReadout";
import {defaultTriangularPatchPresets} from "./patchPresetCollections";
import type {PatchDensity} from "./patchSceneBuilder";
import {azimuthDegrees, ParameterInset, PointEditor, subscriptDigits} from "./TensorPatchPanels";
import {parseTriangularPointId, triangularIndices, triangularPointId} from "./TriangularPatchLattice";
import {isInteriorPoint} from "./TriangularPatchScene";
import {CAMERA_PRESETS, CameraPresetName} from "./surface-view/surfaceMath";
import type {Xyz} from "./surface-view/surfaceScene";

/** What the triangular patch panels show; read from the scene store on every render. */
export interface TriangularPatchPanelState {
    n: number;
    u: number;
    v: number;
    showControlNet: boolean;
    showIsoCurves: boolean;
    showBoundaryCurves: boolean;
    showShading: boolean;
    showDeCasteljau: boolean;
    isoDensity: PatchDensity;
    shadingDensity: PatchDensity;
    zMode: boolean;
    /** Transient (not in a Preset): whether the three-piece split at (u, v, w) is drawn. */
    subdivisionPreview: boolean;
    /** Transient (not in a Preset): whether the tensor patch derived from the net is drawn beside the triangular patch. */
    compareTensor: boolean;
    /** Orbit angles in radians; the Prikaz controls show them in degrees. */
    camera: {az: number; el: number};
}

/** The selected control point `b_ijk` as the Uredi editor shows it. */
export interface TriangularSelection {
    index: readonly [number, number, number];
    xyz: Xyz;
    /** The Bernstein weight `n!/(i! j! k!) u^i v^j w^k` at the current `(u, v, w)`. */
    weight: number;
}

export type TriangularVisibilityKey = "showControlNet" | "showIsoCurves" | "showBoundaryCurves" | "showShading" | "showDeCasteljau";

/** What the controls ask the graph to do; the graph owns every change. */
export interface TriangularPatchPanelActions {
    useStartingPatch(index: number): void;
    setDegree(degree: number): void;
    setParameter(parameter: "u" | "v", value: number): void;
    setSubdivisionPreview(visible: boolean): void;
    setTensorComparison(visible: boolean): void;
    /** Selects `b_ijk`; undefined clears the selection. */
    selectIndex(index: readonly [number, number, number] | undefined): void;
    /** Moves the selected point to the (finite) coordinates. */
    setSelectedCoordinates(xyz: Xyz): void;
    setVisibility(key: TriangularVisibilityKey, visible: boolean): void;
    setDensity(kind: "iso" | "shading", density: PatchDensity): void;
    applyCameraPreset(name: CameraPresetName): void;
    resetView(): void;
    setZMode(zMode: boolean): void;
    setCameraAngle(angle: "az" | "el", degrees: number): void;
    /** The element that shows the parameter-domain inset, or null when it goes away. */
    setInsetContainer(container: HTMLElement | null): void;
}

const radToDeg = (radians: number) => radians * 180 / Math.PI;
const MAX_ELEVATION_DEGREES = radToDeg(CAMERA_PRESETS.top.el);
const DEGREES = [1, 2, 3, 4].map(degree => ({value: String(degree), text: String(degree)}));
const DENSITIES = [8, 16].map(density => ({value: String(density), text: String(density)}));
const asDensity = (value: string): PatchDensity => value === "16" ? 16 : 8;

/** The third barycentric coordinate; the clamp absorbs a rounding error of `1 - u - v` just below 0. */
export const barycentricW = (u: number, v: number): number => Math.max(0, 1 - u - v);

const NO_INDEX = "";

/** One option per valid triple `(i, j, k)` with `i + j + k = n`, in the canonical net order, after the "none" choice. */
const indexOptions = (degree: number, none: string) =>
    [{value: NO_INDEX, text: none}, ...triangularIndices(degree).map(index => ({value: triangularPointId(...index), text: `(${index.join(", ")})`}))];

export function TriangularPatchEditPanel({state, selection, actions}: {state: TriangularPatchPanelState; selection?: TriangularSelection; actions: TriangularPatchPanelActions}) {
    const t = useT();
    const interior = isInteriorPoint(state.u, state.v);
    return <>
        <div className="inspector-group"><h3>{t("patch_starting_heading")}</h3>
            <div className="workspace-curve-picker">{defaultTriangularPatchPresets.map((preset, index) =>
                <Button key={preset.id} onClick={() => actions.useStartingPatch(index)}>{t(preset.name)}</Button>)}</div>
        </div>
        <div className="inspector-group"><h3>{t("patch_degree_heading")}</h3>
            <ChoiceSelect label={t("patch_triangular_degree")} value={String(state.n)} options={DEGREES}
                          onChange={value => actions.setDegree(Number(value))} help={t("patch_triangular_degree_help")}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_point_heading")}</h3>
            <Slider customText={t("patch_parameter_u")} min={0} max={Math.max(0, 1 - state.v)} step={0.01} value={state.u}
                    onChange={value => actions.setParameter("u", value)}/>
            <Slider customText={t("patch_parameter_v")} min={0} max={Math.max(0, 1 - state.u)} step={0.01} value={state.v}
                    onChange={value => actions.setParameter("v", value)}/>
            <ParameterInset attach={actions.setInsetContainer} label={t("patch_parameter_inset_label")}/>
            <p className="inspector-help">{t("patch_triangular_inset_help")}</p>
        </div>
        <FunctionReadout title={t("patch_parameter_w")} rows={[{id: "parameter-w", label: "w", value: formatNumber(barycentricW(state.u, state.v), currentLanguage(), 2)}]}
                         note={t("patch_parameter_w_help")}/>
        <div className="inspector-group"><h3>{t("patch_control_point_heading")}</h3>
            <ChoiceSelect label={t("patch_triangular_index")} value={selection ? triangularPointId(...selection.index) : NO_INDEX}
                          options={indexOptions(state.n, t("patch_no_selection"))} help={t("patch_triangular_index_help")}
                          onChange={value => actions.selectIndex(value === NO_INDEX ? undefined : parseTriangularPointId(value))}/>
            {selection
                ? <PointEditor key={`${selection.index.join("-")}-${selection.xyz.join(",")}`} name={`P${selection.index.map(subscriptDigits).join("")}`} xyz={selection.xyz}
                               onApply={coordinates => actions.setSelectedCoordinates(coordinates)}/>
                : <p className="inspector-help">{t("patch_triangular_select_point_help")}</p>}
        </div>
        {selection && <FunctionReadout title={t("patch_bernstein_heading")} rows={[{
            id: "bernstein-weight", label: t("patch_triangular_bernstein_weight", {
                value0: subscriptDigits(selection.index[0]), value1: subscriptDigits(selection.index[1]), value2: subscriptDigits(selection.index[2]),
            }),
            value: formatNumber(selection.weight, currentLanguage(), 4),
        }]} note={t("patch_triangular_bernstein_help")}/>}
        <div className="inspector-group"><h3>{t("patch_subdivision_heading")}</h3>
            <OnOffSwitch label={t("patch_subdivision_show")} checked={state.subdivisionPreview} onChange={on => actions.setSubdivisionPreview(on)}/>
            <p className="inspector-help">{t("patch_subdivision_help")}</p>
            {state.subdivisionPreview && !interior && <p className="inspector-help" role="note">{t("patch_subdivision_interior_required")}</p>}
        </div>
    </>;
}

export function TriangularPatchDisplayPanel({state, actions}: {state: TriangularPatchPanelState; actions: TriangularPatchPanelActions}) {
    const t = useT();
    return <>
        <div className="inspector-group"><h3>{t("patch_visibility_heading")}</h3>
            <OnOffSwitch label={t("patch_show_control_net")} checked={state.showControlNet} onChange={on => actions.setVisibility("showControlNet", on)}/>
            <OnOffSwitch label={t("patch_show_iso_curves")} checked={state.showIsoCurves} onChange={on => actions.setVisibility("showIsoCurves", on)}/>
            <p className="inspector-help">{t("patch_triangular_iso_help")}</p>
            <OnOffSwitch label={t("patch_show_boundary_curves")} checked={state.showBoundaryCurves} onChange={on => actions.setVisibility("showBoundaryCurves", on)}/>
            <OnOffSwitch label={t("de_casteljau_construction")} checked={state.showDeCasteljau} onChange={on => actions.setVisibility("showDeCasteljau", on)}/>
            <OnOffSwitch label={t("patch_show_shading")} checked={state.showShading} onChange={on => actions.setVisibility("showShading", on)}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_compare_heading")}</h3>
            <OnOffSwitch label={t("patch_compare_show")} checked={state.compareTensor} onChange={on => actions.setTensorComparison(on)}/>
            <p className="inspector-help">{t("patch_compare_help")}</p>
            {state.compareTensor && <>
                <p className="inspector-help" role="note">{t("patch_compare_domains")}</p>
                <p className="inspector-help" role="note">{t("patch_compare_boundaries")}</p>
            </>}
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
