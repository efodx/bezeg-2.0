import {useId} from "react";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, useT} from "../../localization";
import type {CoonsCornerMismatch} from "../../bezeg/impl/kernels/coons";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {FunctionReadout} from "../functions/FunctionReadout";
import {COONS_BOUNDARY_NAMES, COONS_SHOWN, type CoonsBoundaryName, type CoonsShown} from "./coonsScene";
import {PatchPointChooser} from "./PatchPointChooser";
import {PatchPointEditor} from "./PatchPointEditor";
import {subscriptDigits} from "./TensorPatchPanels";
import {SurfaceCameraPanel} from "./SurfaceCameraPanel";
import type {CameraPresetName} from "./surface-view/surfaceMath";
import type {Xyz} from "./surface-view/surfaceScene";


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
    const linkedHelpId = useId();
    const shownOptions = COONS_SHOWN.map(value => ({value, text: t(`coons_shown_${value}`)}));
    const asShown = (value: string): CoonsShown => COONS_SHOWN.find(name => name === value) ?? "s";
    const asBoundary = (value: string): CoonsBoundaryName | undefined => COONS_BOUNDARY_NAMES.find(name => name === value);
    return <>
        <div className="inspector-group"><h3>{t("coons_shown_heading")}</h3>
            <ChoiceSelect label={t("coons_shown")} value={state.shown} options={shownOptions} help={t("coons_shown_help")}
                          onChange={value => actions.setShown(asShown(value))}/>
        </div>
        <div className="inspector-group"><h3>{t("coons_corners_heading")}</h3>
            <OnOffSwitch label={t("coons_linked_corners")} checked={state.linkedCorners} onChange={on => actions.setLinkedCorners(on)} describedBy={linkedHelpId}/>
            <p id={linkedHelpId} className="inspector-help">{t("coons_linked_help")}</p>
        </div>
        <div className="inspector-group"><h3>{t("coons_point_heading")}</h3>
            <PatchPointChooser noneText={t("patch_no_selection")} selection={selection && [selection.name, String(selection.index)]}
                               axes={[{label: t("coons_boundary"), options: COONS_BOUNDARY_NAMES.map(value => ({value, text: t(`coons_boundary_${value}`)}))},
                                   {label: t("coons_index"), options: [0, 1, 2, 3].map(k => ({value: String(k), text: String(k)}))}]}
                               onChange={chosen => chosen === undefined ? actions.selectBoundaryPoint(undefined, undefined)
                                   : actions.selectBoundaryPoint(asBoundary(chosen[0] ?? ""), chosen[1] === undefined ? undefined : Number(chosen[1]))}/>
            {selection
                ? <>
                    <PatchPointEditor key={`${selection.name}-${selection.index}`} name={coonsPointName(selection.name, selection.index)} xyz={selection.xyz}
                                 onCommit={coordinates => actions.setSelectedCoordinates(coordinates)}/>
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
    const mismatchLines = readouts.mismatches.map(mismatch =>
        t("coons_corner_mismatch", {value0: CORNER_COORDINATES[mismatch.corner], value1: formatNumber(mismatch.distance, language, 3)}));
    // A corner mismatch changes while a boundary point is dragged, so the announcement waits until it settles; a met status is not announced.
    const liveReadout = useStatusReadout(mismatchLines.length === 0 ? "" : [...mismatchLines, t("coons_no_interpolation")].join(" "), true);
    return <>
        <FunctionReadout title={t("coons_interior_heading")} rows={rows} note={t("coons_interior_note")}/>
        <div className="inspector-group" data-corner-status={readouts.mismatches.length === 0 ? "met" : "mismatch"}>
            <h3>{t("coons_corner_status_heading")}</h3>
            <div>
                {readouts.mismatches.length === 0
                    ? <p className="inspector-help">{t("coons_corners_met")}</p>
                    : <>
                        {readouts.mismatches.map((mismatch, k) => <p key={mismatch.corner} className="inspector-help" data-corner={mismatch.corner}>{mismatchLines[k]}</p>)}
                        <p className="inspector-help">{t("coons_no_interpolation")}</p>
                    </>}
            </div>
        </div>
        <LiveReadout readout={liveReadout} dataAttribute="coons-live"/>
    </>;
}

export function CoonsDisplayPanel({state, actions}: {state: CoonsPanelState; actions: CoonsPanelActions}) {
    const t = useT();
    return <>
        <div className="inspector-group"><h3>{t("patch_visibility_heading")}</h3>
            <OnOffSwitch label={t("patch_show_control_net")} checked={state.showControlNet} onChange={on => actions.setVisibility("showControlNet", on)}/>
            <OnOffSwitch label={t("patch_show_shading")} checked={state.showShading} onChange={on => actions.setVisibility("showShading", on)}/>
        </div>
        <SurfaceCameraPanel camera={state.camera} actions={actions}>
            <OnOffSwitch label={t("patch_move_height")} checked={state.zMode} onChange={on => actions.setZMode(on)}/>
            <p className="inspector-help">{t("patch_move_height_help")}</p>
        </SurfaceCameraPanel>
    </>;
}
