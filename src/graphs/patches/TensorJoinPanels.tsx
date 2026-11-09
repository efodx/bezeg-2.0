import {useState} from "react";
import {Button} from "react-bootstrap";
import {CountSetter} from "../../inputs/CountSetter";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import Slider from "../../inputs/Slider";
import {currentLanguage, useT} from "../../localization";
import {ReadoutHelp} from "../base/controls/ReadoutParts";
import {FunctionReadout} from "../functions/FunctionReadout";
import {PatchPointChooser} from "./PatchPointChooser";
import {PatchPointEditor} from "./PatchPointEditor";
import {subscriptDigits} from "./TensorPatchPanels";
import type {JoinStartingScene} from "./patchPresetCollections";
import {JOIN_ALPHA_RANGE, type JoinContinuity, type JoinReport} from "./tensorJoins";
import type {Xyz} from "./surface-view/surfaceScene";

const MIN_DEGREE = 1;
const MAX_DEGREE = 4;
const CUSTOM_SCENE = "custom";

/** The "Join examples" group of Uredi: whole scenes (both patches, continuity and ratio). */
export function JoinScenesControls({scenes, current, onUse}: {
    scenes: ReadonlyArray<Pick<JoinStartingScene, "id" | "name">>;
    /** The index of the scene the model equals, or undefined while it matches none (an edited or imported pair). */
    current: number | undefined; onUse: (index: number) => void;
}) {
    const t = useT();
    const shown = current === undefined ? CUSTOM_SCENE : String(current);
    const options = [...scenes.map((scene, index) => ({value: String(index), text: t(scene.name)})),
        ...(current === undefined ? [{value: CUSTOM_SCENE, text: t("patch_join_scene_custom")}] : [])];
    return <div className="inspector-group patch-join-scenes"><h3>{t("patch_join_scenes_heading")}</h3>
        <ChoiceSelect label={t("patch_join_scenes_heading")} value={shown} options={options}
                      onChange={value => { if (value !== shown && value !== CUSTOM_SCENE) onUse(Number(value)); }}/>
    </div>;
}

/**
 * The Uredi panel of the read-only capstone (the Utah teapot): what the scene is, why it has no net or parameter domain,
 * where the data comes from, and the way back to the default pair of patches.
 */
export function JoinCapstonePanel({onBack}: {onBack: () => void}) {
    const t = useT();
    return <div className="inspector-group patch-join-capstone"><h3>{t("patch_join_capstone_heading")}</h3>
        <p className="inspector-help">{t("patch_join_capstone_text")}</p>
        <p className="inspector-help">{t("patch_join_capstone_source")}</p>
        <Button data-join-capstone-back onClick={onBack}>{t("patch_join_capstone_back")}</Button>
    </div>;
}

/**
 * The "Join" group of Uredi: the continuity mode, the ratio `alpha` (usable only in G1, with the reason stated otherwise)
 * and the `v` of the boundary point where the two cross-boundary arrows are drawn.
 */
export function JoinModeControls({mode, alpha, joinV, onMode, onAlpha, onJoinV}: {
    mode: JoinContinuity; alpha: number; joinV: number;
    onMode: (mode: JoinContinuity) => void; onAlpha: (alpha: number) => void; onJoinV: (v: number) => void;
}) {
    const t = useT();
    const options = [
        {value: "none", text: t("patch_join_mode_none")}, {value: "c0", text: t("patch_join_mode_c0")},
        {value: "c1", text: t("patch_join_mode_c1")}, {value: "g1", text: t("patch_join_mode_g1")},
    ];
    const g1 = mode === "g1";
    return <div className="inspector-group patch-join-controls"><h3>{t("patch_join_heading")}</h3>
        <ChoiceSelect label={t("patch_join_mode")} value={mode} options={options} help={t("patch_join_mode_help")}
                      onChange={next => onMode(next === "c0" || next === "c1" || next === "g1" ? next : "none")}/>
        <Slider customText={t("patch_join_alpha")} min={JOIN_ALPHA_RANGE.min} max={JOIN_ALPHA_RANGE.max} step={0.05} value={alpha}
                unavailableReason={g1 ? undefined : t("patch_join_alpha_disabled")} help={t("patch_join_alpha_help")}
                onChange={onAlpha}/>
        <Slider customText={t("patch_join_v")} min={0} max={1} step={0.01} value={joinV} help={t("patch_join_v_help")} onChange={onJoinV}/>
    </div>;
}

/** The degrees of patch `B`; `v` is shared with `A` in every mode but `none`, and the group says so. */
export function JoinBDegreeControls({mode, mB, nB, onDegree}: {
    mode: JoinContinuity; mB: number; nB: number; onDegree: (direction: "u" | "v", degree: number) => void;
}) {
    const t = useT();
    const setDegree = (direction: "u" | "v", degree: number) => {
        if (!Number.isInteger(degree) || degree < MIN_DEGREE || degree > MAX_DEGREE) return false;
        onDegree(direction, degree);
    };
    return <div className="inspector-group patch-join-degree"><h3>{t("patch_join_b_heading")}</h3>
        <CountSetter label={t("patch_join_b_degree_u")} n={mB} min={MIN_DEGREE} max={MAX_DEGREE}
                     onMinus={() => onDegree("u", mB - 1)} onPlus={() => onDegree("u", mB + 1)} onSet={degree => setDegree("u", degree)}/>
        <CountSetter label={t("patch_join_b_degree_v")} n={nB} min={MIN_DEGREE} max={MAX_DEGREE} help={t(mode === "none" ? "patch_join_b_degree_free" : "patch_join_b_degree_shared")}
                     onMinus={() => onDegree("v", nB - 1)} onPlus={() => onDegree("v", nB + 1)} onSet={degree => setDegree("v", degree)}/>
    </div>;
}

/**
 * Selecting a control point `Q_ij` of patch `B` (the `A` points are the inherited group). A derived row can be chosen to be
 * explained, but it has no editor: it follows `A` and is not movable. `selected` is the graph's selection (a movable point).
 */
export function JoinBPointControls(props: JoinBPointControlsProps) {
    // Choosing a point of `A` leaves the explanation of the derived `B` point that was chosen before: the keyed remount drops
    // the remembered choice, so it neither shows meanwhile nor comes back when the `A` selection is cleared.
    return <JoinBPointControlsBody key={props.aSelected ? "a-selected" : "b"} {...props}/>;
}

interface JoinBPointControlsProps {
    netB: ReadonlyArray<ReadonlyArray<Xyz>>; isDerivedRow: (row: number) => boolean; selected: readonly [number, number] | undefined; aSelected: boolean;
    onSelect: (i: number | undefined, j: number | undefined) => void; onApply: (xyz: Xyz) => void;
}

function JoinBPointControlsBody({netB, isDerivedRow, selected, onSelect, onApply}: JoinBPointControlsProps) {
    const t = useT();
    // A derived point is never the graph's selection, so the chosen index is remembered here to explain it.
    const [chosen, setChosen] = useState<readonly [number, number] | undefined>();
    const mB = netB.length - 1, nB = netB[0].length - 1;
    const focus = chosen && chosen[0] <= mB && chosen[1] <= nB && isDerivedRow(chosen[0]) ? chosen : undefined;
    const index = selected ?? focus;
    const nameOf = (i: number, j: number) => `Q${subscriptDigits(i)}${subscriptDigits(j)}`;
    const rowOptions = netB.map((_, k) =>
        ({value: String(k), text: isDerivedRow(k) ? t("patch_join_b_option_derived", {value0: String(k)}) : String(k)}));
    const columnOptions = netB[0].map((_, k) => ({value: String(k), text: String(k)}));
    const choose = (i: number | undefined, j: number | undefined) => {
        if (i === undefined && j === undefined) {
            setChosen(undefined);
            onSelect(undefined, undefined);
            return;
        }
        const next: readonly [number, number] = [i ?? index?.[0] ?? 0, j ?? index?.[1] ?? 0];
        setChosen(next);
        onSelect(next[0], next[1]);
    };
    return <div className="inspector-group patch-join-b-point"><h3>{t("patch_join_b_point_heading")}</h3>
        <PatchPointChooser noneText={t("patch_no_selection")} selection={index && [String(index[0]), String(index[1])]}
                           axes={[{label: t("patch_join_b_index_i"), options: rowOptions}, {label: t("patch_join_b_index_j"), options: columnOptions}]}
                           onChange={picked => picked === undefined ? choose(undefined, undefined)
                               : choose(picked[0] === undefined ? undefined : Number(picked[0]), picked[1] === undefined ? undefined : Number(picked[1]))}/>
        {selected
            ? <PatchPointEditor key={selected.join("-")} name={nameOf(selected[0], selected[1])}
                           xyz={netB[selected[0]][selected[1]]} onCommit={onApply}/>
            : focus
                ? <ReadoutHelp hooks={{"data-patch-note": "join-derived"}}>{t("patch_join_b_derived_note", {value0: nameOf(focus[0], focus[1])})}</ReadoutHelp>
                : <p className="inspector-help">{t("patch_join_b_point_help")}</p>}
    </div>;
}

/**
 * What the report says, from the displayed nets alone. C1 (equal derivatives across the boundary) implies G1, but G1 with a
 * ratio other than 1 is not C1. When both derivatives vanish C1 holds formally and the tangent plane is not determined by them.
 */
export type JoinReportCase = "no-c0" | "vanish" | "c1" | "g1" | "c0-no-ratio" | "c0-planes" | "c0";
/**
 * Largest normal angle (radians) still read as "the tangent planes coincide". The report has no angular tolerance, and
 * `acos` of a rounded dot product of equal unit normals is already about 1.5e-8, so this is far above rounding yet below
 * the 0.001 degree shown in the report.
 */
const COINCIDENT_PLANES_ANGLE = 1e-6;
export function joinReportCase(report: JoinReport): JoinReportCase {
    if (!report.c0) return "no-c0";
    if (report.derivativesVanish) return "vanish";
    if (report.c1) return "c1";
    if (report.g1) return "g1";
    if (report.alphaStar === undefined) return "c0-no-ratio";
    return report.maxNormalAngle !== undefined && report.maxNormalAngle <= COINCIDENT_PLANES_ANGLE ? "c0-planes" : "c0";
}

const STATE_KEYS = {
    "no-c0": "patch_join_state_none", vanish: "patch_join_state_vanish", c1: "patch_join_state_c1",
    g1: "patch_join_state_g1", "c0-no-ratio": "patch_join_state_c0", "c0-planes": "patch_join_state_c0_planes", c0: "patch_join_state_c0",
} as const satisfies Record<JoinReportCase, "patch_join_state_none" | "patch_join_state_vanish" | "patch_join_state_c1" | "patch_join_state_g1" | "patch_join_state_c0" | "patch_join_state_c0_planes">;

/** The measured join of the displayed patches, stated honestly: C1 is equal derivatives, G1 only agreeing tangent planes. */
export function JoinReportPanel({report}: {report: JoinReport}) {
    const t = useT();
    const language = currentLanguage();
    const kind = joinReportCase(report);
    const number = (value: number) => formatNumber(value, language, 3);
    const rows = [
        {id: "state", label: t("patch_join_report_state"), value: t(STATE_KEYS[kind])},
        {id: "position-gap", label: t("patch_join_report_position_gap"), value: number(report.positionGap)},
        {id: "derivative-gap", label: t("patch_join_report_derivative_gap"), value: number(report.derivativeGap)},
        {id: "normal-angle", label: t("patch_join_report_normal_angle"),
            value: report.maxNormalAngle === undefined ? t("patch_join_report_undefined") : `${number(report.maxNormalAngle * 180 / Math.PI)}°`},
        {id: "alpha-star", label: t("patch_join_report_alpha_star"), value: report.alphaStar === undefined ? t("patch_join_report_undefined") : number(report.alphaStar)},
    ];
    const note = kind === "no-c0" ? t("patch_join_report_no_c0", {value0: number(report.positionGap)})
        : kind === "vanish" ? t("patch_join_report_vanish")
        : kind === "c1" ? t("patch_join_report_c1", {value0: number(report.derivativeGap)})
        : kind === "g1" ? t("patch_join_report_g1", {value0: number(report.alphaStar ?? 0)})
        : kind === "c0-no-ratio" ? t("patch_join_report_c0_no_ratio")
        : kind === "c0-planes" ? t("patch_join_report_c0_planes") : t("patch_join_report_c0");
    return <>
        <FunctionReadout title={t("patch_join_report_heading")} rows={rows} note={note}/>
        <p className="inspector-help patch-join-legend">{t("patch_join_legend")}</p>
    </>;
}
