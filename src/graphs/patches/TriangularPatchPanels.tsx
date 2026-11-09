import {formatNumber} from "../../analysis/format";
import {CountSetter} from "../../inputs/CountSetter";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import Slider from "../../inputs/Slider";
import {currentLanguage, useT} from "../../localization";
import {FunctionReadout} from "../functions/FunctionReadout";
import {defaultTriangularPatchPresets} from "./patchPresetCollections";
import type {PatchDensity} from "./patchSceneBuilder";
import {PatchPointChooser} from "./PatchPointChooser";
import {PatchPointEditor} from "./PatchPointEditor";
import {ParameterInset, subscriptDigits} from "./TensorPatchPanels";
import {parseTriangularPointId, triangularIndices, triangularPointId} from "./TriangularPatchLattice";
import {MAX_TRIANGULAR_DEGREE, MIN_TRIANGULAR_DEGREE} from "./TriangularPatchDegree";
import {isInteriorPoint} from "./TriangularPatchScene";
import {SurfaceCameraPanel} from "./SurfaceCameraPanel";
import type {CameraPresetName} from "./surface-view/surfaceMath";
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
    /** The index of the starting patch the net equals (degree and every point), or undefined while it matches none. */
    startingPatchIndex(): number | undefined;
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

const CUSTOM_PATCH = "custom";
const startingPatchOptions = (t: ReturnType<typeof useT>, custom: boolean) =>
    [...defaultTriangularPatchPresets.map((preset, index) => ({value: String(index), text: t(preset.name)})),
        ...(custom ? [{value: CUSTOM_PATCH, text: t("patch_starting_custom")}] : [])];
const DENSITIES = [8, 16].map(density => ({value: String(density), text: String(density)}));
const asDensity = (value: string): PatchDensity => value === "16" ? 16 : 8;

/** The third barycentric coordinate; the clamp absorbs a rounding error of `1 - u - v` just below 0. */
export const barycentricW = (u: number, v: number): number => Math.max(0, 1 - u - v);


/** One option per valid triple `(i, j, k)` with `i + j + k = n`, in the canonical net order, after the "none" choice. */
const indexOptions = (degree: number) =>
    [...triangularIndices(degree).map(index => ({value: triangularPointId(...index), text: `(${index.join(", ")})`}))];

export function TriangularPatchEditPanel({state, selection, actions}: {state: TriangularPatchPanelState; selection?: TriangularSelection; actions: TriangularPatchPanelActions}) {
    const t = useT();
    const interior = isInteriorPoint(state.u, state.v);
    const matching = actions.startingPatchIndex();
    const shownPatch = matching === undefined ? CUSTOM_PATCH : String(matching);
    return <>
        <div className="inspector-group"><h3>{t("patch_starting_heading")}</h3>
            <ChoiceSelect label={t("patch_starting_heading")} value={shownPatch} options={startingPatchOptions(t, matching === undefined)}
                          onChange={value => { if (value !== shownPatch && value !== CUSTOM_PATCH) actions.useStartingPatch(Number(value)); }}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_degree_heading")}</h3>
            <CountSetter label={t("patch_triangular_degree")} n={state.n} min={MIN_TRIANGULAR_DEGREE} max={MAX_TRIANGULAR_DEGREE} help={t("patch_triangular_degree_help")}
                         onMinus={() => actions.setDegree(state.n - 1)} onPlus={() => actions.setDegree(state.n + 1)}
                         onSet={degree => {
                             if (!Number.isInteger(degree) || degree < MIN_TRIANGULAR_DEGREE || degree > MAX_TRIANGULAR_DEGREE) return false;
                             actions.setDegree(degree);
                         }}/>
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
            <PatchPointChooser noneText={t("patch_no_selection")} selection={selection && [triangularPointId(...selection.index)]}
                               axes={[{label: t("patch_triangular_index"), help: t("patch_triangular_index_help"), options: indexOptions(state.n)}]}
                               onChange={chosen => actions.selectIndex(chosen?.[0] === undefined ? undefined : parseTriangularPointId(chosen[0]))}/>
            {selection
                ? <PatchPointEditor key={selection.index.join("-")} name={`P${selection.index.map(subscriptDigits).join("")}`} xyz={selection.xyz}
                               onCommit={coordinates => actions.setSelectedCoordinates(coordinates)}/>
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
        <SurfaceCameraPanel camera={state.camera} actions={actions}>
            <OnOffSwitch label={t("patch_move_height")} checked={state.zMode} onChange={on => actions.setZMode(on)}/>
            <p className="inspector-help">{t("patch_move_height_help")}</p>
        </SurfaceCameraPanel>
    </>;
}
