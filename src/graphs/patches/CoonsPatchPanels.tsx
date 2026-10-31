import {Button} from "react-bootstrap";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import Slider from "../../inputs/Slider";
import {currentLanguage, useT} from "../../localization";
import type {CoonsCornerMismatch} from "../../bezeg/impl/kernels/coons";
import {FunctionReadout} from "../functions/FunctionReadout";
import {COONS_BOUNDARY_NAMES, COONS_SHOWN, type CoonsBoundaryName, type CoonsShown} from "./coonsScene";
import {azimuthDegrees, PointEditor, subscriptDigits} from "./TensorPatchPanels";
import {CAMERA_PRESETS, CameraPresetName} from "./surface-view/surfaceMath";
import type {Xyz} from "./surface-view/surfaceScene";

const NO_SELECTION = "";
const radToDeg = (radians: number) => radians * 180 / Math.PI;
const MAX_ELEVATION_DEGREES = radToDeg(CAMERA_PRESETS.top.el);

/** The selected boundary control point as the editor shows it. */
export interface CoonsSelection {
    name: CoonsBoundaryName;
    index: number;
    xyz: Xyz;
    /** A corner shared with another boundary while corners are linked. */
    shared: boolean;
}

export interface CoonsPanelState {
    linkedCorners: boolean;
    shown: CoonsShown;
    showControlNet: boolean;
    showShading: boolean;
    zMode: boolean;
    camera: {az: number; el: number};
}

export interface CoonsPanelActions {
    setShown(shown: CoonsShown): void;
    setLinkedCorners(linked: boolean): void;
    /** Both undefined clears the selection; one undefined keeps the selected point's other part. */
    selectBoundaryPoint(name: CoonsBoundaryName | undefined, index: number | undefined): void;
    setSelectedCoordinates(xyz: Xyz): void;
    setVisibility(key: "showControlNet" | "showShading", visible: boolean): void;
    applyCameraPreset(name: CameraPresetName): void;
    resetView(): void;
    setCameraAngle(angle: "az" | "el", degrees: number): void;
    setZMode(zMode: boolean): void;
}

/** The point name shown in the editor: P₁ of c₀ reads `P₁ (c₀)`. */
export const coonsPointName = (name: CoonsBoundaryName, index: number): string => `P${subscriptDigits(index)} (${name[0]}${subscriptDigits(Number(name[1]))})`;

const CORNER_COORDINATES: Record<CoonsCornerMismatch["corner"], string> = {u0v0: "(0, 0)", u1v0: "(1, 0)", u0v1: "(0, 1)", u1v1: "(1, 1)"};

export function CoonsEditPanel({state, selection, actions}: {state: CoonsPanelState; selection?: CoonsSelection; actions: CoonsPanelActions}) {
    const t = useT();
    const shownOptions = COONS_SHOWN.map(value => ({value, text: t(`coons_shown_${value}`)}));
    const boundaryOptions = [{value: NO_SELECTION, text: t("patch_no_selection")}, ...COONS_BOUNDARY_NAMES.map(value => ({value, text: t(`coons_boundary_${value}`)}))];
    const indexOptions = [{value: NO_SELECTION, text: t("patch_no_selection")}, ...[0, 1, 2, 3].map(k => ({value: String(k), text: String(k)}))];
    const asShown = (value: string): CoonsShown => COONS_SHOWN.find(name => name === value) ?? "s";
    const asBoundary = (value: string): CoonsBoundaryName | undefined => COONS_BOUNDARY_NAMES.find(name => name === value);
    return <>
        <div className="inspector-group"><h3>{t("coons_shown_heading")}</h3>
            <ChoiceSelect label={t("coons_shown")} value={state.shown} options={shownOptions} help={t("coons_shown_help")}
                          onChange={value => actions.setShown(asShown(value))}/>
        </div>
        <div className="inspector-group"><h3>{t("coons_corners_heading")}</h3>
            <OnOffSwitch label={t("coons_linked_corners")} checked={state.linkedCorners} onChange={on => actions.setLinkedCorners(on)}/>
            <p className="inspector-help">{t("coons_linked_help")}</p>
        </div>
        <div className="inspector-group"><h3>{t("coons_point_heading")}</h3>
            <ChoiceSelect label={t("coons_boundary")} value={selection?.name ?? NO_SELECTION} options={boundaryOptions}
                          onChange={value => actions.selectBoundaryPoint(asBoundary(value), asBoundary(value) ? selection?.index : undefined)}/>
            <ChoiceSelect label={t("coons_index")} value={selection ? String(selection.index) : NO_SELECTION} options={indexOptions}
                          onChange={value => value === NO_SELECTION ? actions.selectBoundaryPoint(undefined, undefined) : actions.selectBoundaryPoint(selection?.name, Number(value))}/>
            {selection
                ? <>
                    <PointEditor key={`${selection.name}-${selection.index}-${selection.xyz.join(",")}`} name={coonsPointName(selection.name, selection.index)} xyz={selection.xyz}
                                 onApply={coordinates => actions.setSelectedCoordinates(coordinates)}/>
                    {selection.shared && <p className="inspector-help" role="note">{t("coons_corner_shared")}</p>}
                </>
                : <p className="inspector-help">{t("coons_select_help")}</p>}
        </div>
    </>;
}

/** What the readouts need: the interior control points of the Coons net, its centre and the corner check, all derived from the boundaries. */
export interface CoonsReadouts {
    interior: ReadonlyArray<{i: number; j: number; xyz: Xyz}>;
    centre: Xyz;
    mismatches: ReadonlyArray<CoonsCornerMismatch>;
}

const triple = (xyz: Xyz): string => `(${xyz.map(value => formatNumber(value, currentLanguage(), 3)).join("; ")})`;

/** The interior net of the Coons patch and the corner status. A mismatch never reads as interpolation. */
export function CoonsReadoutPanel({readouts}: {readouts: CoonsReadouts}) {
    const t = useT();
    const rows = [
        ...readouts.interior.map(({i, j, xyz}) => ({id: `p-${i}-${j}`, label: `P${subscriptDigits(i)}${subscriptDigits(j)}`, value: triple(xyz)})),
        {id: "centre", label: t("coons_centre"), value: triple(readouts.centre)},
    ];
    const language = currentLanguage();
    return <>
        <FunctionReadout title={t("coons_interior_heading")} rows={rows} note={t("coons_interior_note")}/>
        <div className="inspector-group" data-corner-status={readouts.mismatches.length === 0 ? "met" : "mismatch"}>
            <h3>{t("coons_corner_status_heading")}</h3>
            {readouts.mismatches.length === 0
                ? <p className="inspector-help" role="status">{t("coons_corners_met")}</p>
                : <>
                    {readouts.mismatches.map(mismatch => <p key={mismatch.corner} className="inspector-help" role="status" data-corner={mismatch.corner}>
                        {t("coons_corner_mismatch", {value0: CORNER_COORDINATES[mismatch.corner], value1: formatNumber(mismatch.distance, language, 3)})}</p>)}
                    <p role="alert">{t("coons_no_interpolation")}</p>
                </>}
        </div>
    </>;
}

export function CoonsDisplayPanel({state, actions}: {state: CoonsPanelState; actions: CoonsPanelActions}) {
    const t = useT();
    return <>
        <div className="inspector-group"><h3>{t("patch_visibility_heading")}</h3>
            <OnOffSwitch label={t("patch_show_control_net")} checked={state.showControlNet} onChange={on => actions.setVisibility("showControlNet", on)}/>
            <OnOffSwitch label={t("patch_show_shading")} checked={state.showShading} onChange={on => actions.setVisibility("showShading", on)}/>
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
