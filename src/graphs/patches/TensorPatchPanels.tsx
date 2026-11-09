import {type ReactNode, useCallback} from "react";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import Slider from "../../inputs/Slider";
import {currentLanguage, useT} from "../../localization";
import {FunctionReadout} from "../functions/FunctionReadout";
import {PatchPointChooser} from "./PatchPointChooser";
import {PatchPointEditor} from "./PatchPointEditor";
import {defaultPatchPresets, type DerivativesStartingPatch} from "./patchPresetCollections";
import type {PatchDensity} from "./patchSceneBuilder";
import {SurfaceCameraPanel} from "./SurfaceCameraPanel";
import type {CameraPresetName} from "./surface-view/surfaceMath";
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
    /** The index of the starting patch whose net the patch has now, or undefined while it matches none (the "custom" entry). */
    startingPatchIndex(): number | undefined;
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

const MIN_DEGREE = 1;
const MAX_DEGREE = 4;
/** The select value of the "custom" starting-patch entry; the others are indices into the starting patches. */
const CUSTOM_PATCH = "custom";
const DENSITIES = [8, 16].map(density => ({value: String(density), text: String(density)}));
const asDensity = (value: string): PatchDensity => value === "16" ? 16 : 8;

/** Renders a non-negative integer index with Unicode subscript digits (P₁₂), matching the P_{ij} scene labels. */
export const subscriptDigits = (index: number): string => String(index).replace(/[0-9]/g, digit => String.fromCharCode(0x2080 + Number(digit)));

/** The square the graph draws its parameter board in; the graph owns the board and frees it when this goes away. */
export function ParameterInset({attach, label}: {attach: (container: HTMLElement | null) => void; label: string}) {
    const ref = useCallback((container: HTMLDivElement | null) => attach(container), [attach]);
    return <div className="patch-parameter-inset" ref={ref} role="group" aria-label={label}/>;
}


const startingPatchOptions = (patches: ReadonlyArray<Pick<DerivativesStartingPatch, "id" | "name">>, t: ReturnType<typeof useT>, custom: boolean) =>
    [...patches.map((preset, index) => ({value: String(index), text: t(preset.name)})), ...(custom ? [{value: CUSTOM_PATCH, text: t("patch_starting_custom")}] : [])];

/**
 * `pointExtra` is shown in the "Point on the patch" group, below the u and v sliders. `startingPatches` are the entries of the "Starting
 * patch" select (the two tensor Presets unless the Demonstration offers more); a "custom" entry shows only while the net matches none
 * of them (`actions.startingPatchIndex`), and choosing the entry already shown does nothing. `pointLocked` is the reason the selected
 * point cannot be edited right now; it replaces the coordinate editor so that nothing is offered that does nothing.
 */
export function TensorPatchEditPanel({state, selection, actions, pointExtra, pointLocked, startingPatches = defaultPatchPresets}: {
    state: TensorPatchPanelState; selection?: PatchSelection; actions: TensorPatchPanelActions; pointExtra?: ReactNode; pointLocked?: string;
    startingPatches?: ReadonlyArray<Pick<DerivativesStartingPatch, "id" | "name">>;
}) {
    const t = useT();
    const matching = actions.startingPatchIndex();
    const shownPatch = matching === undefined ? CUSTOM_PATCH : String(matching);
    const typedDegree = (direction: "u" | "v", degree: number) => {
        if (!Number.isInteger(degree) || degree < MIN_DEGREE || degree > MAX_DEGREE) return false;
        actions.setDegree(direction, degree);
    };
    return <>
        <div className="inspector-group"><h3>{t("patch_starting_heading")}</h3>
            <ChoiceSelect label={t("patch_starting_heading")} value={shownPatch} options={startingPatchOptions(startingPatches, t, matching === undefined)}
                          onChange={value => { if (value !== shownPatch && value !== CUSTOM_PATCH) actions.useStartingPatch(Number(value)); }}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_degree_heading")}</h3>
            <CountSetter label={t("patch_degree_u")} n={state.m} min={MIN_DEGREE} max={MAX_DEGREE} help={t("patch_degree_help")}
                         onMinus={() => actions.setDegree("u", state.m - 1)} onPlus={() => actions.setDegree("u", state.m + 1)}
                         onSet={degree => typedDegree("u", degree)}/>
            <CountSetter label={t("patch_degree_v")} n={state.n} min={MIN_DEGREE} max={MAX_DEGREE}
                         onMinus={() => actions.setDegree("v", state.n - 1)} onPlus={() => actions.setDegree("v", state.n + 1)}
                         onSet={degree => typedDegree("v", degree)}/>
        </div>
        <div className="inspector-group"><h3>{t("patch_point_heading")}</h3>
            <Slider customText={t("patch_parameter_u")} min={0} max={1} step={0.01} value={state.u}
                    onChange={value => actions.setParameter("u", value)}/>
            <Slider customText={t("patch_parameter_v")} min={0} max={1} step={0.01} value={state.v}
                    onChange={value => actions.setParameter("v", value)}/>
            {pointExtra}
            <ParameterInset attach={actions.setInsetContainer} label={t("patch_parameter_inset_label")}/>
            <p className="inspector-help">{t("patch_parameter_inset_help")}</p>
        </div>
        <div className="inspector-group"><h3>{t("patch_control_point_heading")}</h3>
            <PatchPointChooser noneText={t("patch_no_selection")} selection={selection && [String(selection.i), String(selection.j)]}
                               axes={[{label: t("patch_index_i"), options: indexOptions(state.m)}, {label: t("patch_index_j"), options: indexOptions(state.n)}]}
                               onChange={chosen => chosen === undefined ? actions.selectIndex(undefined, undefined)
                                   : actions.selectIndex(chosen[0] === undefined ? undefined : Number(chosen[0]), chosen[1] === undefined ? undefined : Number(chosen[1]))}/>
            {selection && pointLocked !== undefined
                ? <p className="inspector-help patch-point-locked" role="note">{pointLocked}</p>
                : selection
                ? <PatchPointEditor key={`${selection.i}-${selection.j}`} name={`P${subscriptDigits(selection.i)}${subscriptDigits(selection.j)}`} xyz={selection.xyz}
                                    onCommit={coordinates => actions.setSelectedCoordinates(coordinates)}/>
                : <p className="inspector-help">{t("patch_select_point_help")}</p>}
        </div>
        {selection && <FunctionReadout title={t("patch_bernstein_heading")} rows={[{
            id: "bernstein-weight", label: t("patch_bernstein_weight", {value0: subscriptDigits(selection.i), value1: subscriptDigits(selection.j)}),
            value: formatNumber(selection.weight, currentLanguage(), 4),
        }]} note={t("patch_bernstein_help")}/>}
    </>;
}

const indexOptions = (degree: number) => Array.from({length: degree + 1}, (_, k) => ({value: String(k), text: String(k)}));

/** `visibilityExtra` is shown at the end of the "Shown elements" group. */
export function TensorPatchDisplayPanel({state, actions, visibilityExtra, readOnly = false}: {
    state: TensorPatchPanelState; actions: TensorPatchPanelActions; visibilityExtra?: ReactNode;
    /** The read-only capstone: only the boundary-curve and shading switches and the camera (no net, iso curves, density or height-drag mode). */
    readOnly?: boolean;
}) {
    const t = useT();
    return <>
        <div className="inspector-group"><h3>{t("patch_visibility_heading")}</h3>
            {readOnly ? null : <>
                <OnOffSwitch label={t("patch_show_control_net")} checked={state.showControlNet} onChange={on => actions.setVisibility("showControlNet", on)}/>
                <OnOffSwitch label={t("patch_show_iso_curves")} checked={state.showIsoCurves} onChange={on => actions.setVisibility("showIsoCurves", on)}/>
            </>}
            <OnOffSwitch label={t("patch_show_boundary_curves")} checked={state.showBoundaryCurves} onChange={on => actions.setVisibility("showBoundaryCurves", on)}/>
            <OnOffSwitch label={t("patch_show_shading")} checked={state.showShading} onChange={on => actions.setVisibility("showShading", on)}/>
            {visibilityExtra}
        </div>
        {readOnly ? null : <div className="inspector-group"><h3>{t("patch_density_heading")}</h3>
            <ChoiceSelect label={t("patch_iso_density")} value={String(state.isoDensity)} options={DENSITIES}
                          onChange={value => actions.setDensity("iso", asDensity(value))}/>
            <ChoiceSelect label={t("patch_shading_density")} value={String(state.shadingDensity)} options={DENSITIES}
                          onChange={value => actions.setDensity("shading", asDensity(value))}/>
        </div>}
        <SurfaceCameraPanel camera={state.camera} actions={actions}>
            {readOnly ? null : <>
                <OnOffSwitch label={t("patch_move_height")} checked={state.zMode} onChange={on => actions.setZMode(on)}/>
                <p className="inspector-help">{t("patch_move_height_help")}</p>
            </>}
        </SurfaceCameraPanel>
    </>;
}
