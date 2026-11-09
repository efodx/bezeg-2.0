import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, useT} from "../../localization";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {FunctionReadout} from "../functions/FunctionReadout";
import type {NormalDegeneracy, TensorDifferentials} from "./tensorDerivatives";
import type {Xyz} from "./surface-view/surfaceScene";

export const DERIVATIVES_CORNERS: ReadonlyArray<readonly [0 | 1, 0 | 1]> = [[0, 0], [1, 0], [0, 1], [1, 1]];

const NOT_A_CORNER = "";
const cornerId = (u: number, v: number) => `${u}${v}`;

/**
 * The Uredi select that sets (u, v) to a corner of the parameter square. It shows the corner (u, v) is at, and a "none" entry
 * while (u, v) is elsewhere; choosing the corner already shown does nothing.
 */
export function DerivativesCornerSelect({u, v, onCorner}: {u: number; v: number; onCorner: (u: 0 | 1, v: 0 | 1) => void}) {
    const t = useT();
    const atCorner = DERIVATIVES_CORNERS.find(([cornerU, cornerV]) => cornerU === u && cornerV === v);
    const shown = atCorner ? cornerId(...atCorner) : NOT_A_CORNER;
    const options = [...(atCorner ? [] : [{value: NOT_A_CORNER, text: t("patch_derivatives_corner_none")}]),
        ...DERIVATIVES_CORNERS.map(([cornerU, cornerV]) => ({value: cornerId(cornerU, cornerV), text: `(${cornerU}, ${cornerV})`,
            ariaLabel: t("patch_derivatives_corner", {value0: String(cornerU), value1: String(cornerV)})}))];
    return <div className="patch-derivatives-corners">
        <ChoiceSelect label={t("patch_derivatives_corners")} value={shown} options={options}
                      onChange={value => {
                          const corner = DERIVATIVES_CORNERS.find(([cornerU, cornerV]) => cornerId(cornerU, cornerV) === value);
                          if (corner && value !== shown) onCorner(...corner);
                      }}/>
    </div>;
}

const REASON_KEYS = {
    "parallel": "patch_derivatives_degenerate_parallel",
    "zero-su": "patch_derivatives_degenerate_zero_su",
    "zero-sv": "patch_derivatives_degenerate_zero_sv",
    "both-zero": "patch_derivatives_degenerate_both_zero",
} as const satisfies Record<NormalDegeneracy, string>;

function vectorText(vector: Xyz, language: NumberLanguage): string {
    const parts = vector.map(value => formatNumber(value, language, 3));
    return language === "sl" ? `(${parts.join("; ")})` : `(${parts.join(", ")})`;
}

/**
 * The numeric `S_u`, `S_v`, `S_uv` and unit normal at the current (u, v), with the legend of the arrows; where the
 * normal is undefined, the normal row says so and a status message gives the reason.
 */
export function DerivativesReadout({differentials}: {differentials: TensorDifferentials}) {
    const t = useT();
    const language = currentLanguage();
    const {normal} = differentials;
    const reason = normal.kind === "degenerate" ? t(REASON_KEYS[normal.reason]) : "";
    // Dragging u or v can cross a degenerate point many times a second, so a change is announced only once it settles.
    const liveReadout = useStatusReadout(reason, true);
    const rows = [
        {id: "su", label: <var>S<sub>u</sub></var>, value: vectorText(differentials.su, language)},
        {id: "sv", label: <var>S<sub>v</sub></var>, value: vectorText(differentials.sv, language)},
        {id: "twist", label: <var>S<sub>uv</sub></var>, value: vectorText(differentials.twist, language)},
        {id: "normal", label: t("patch_derivatives_normal_label"), value: normal.kind === "defined" ? vectorText(normal.unit, language) : t("patch_derivatives_normal_undefined")},
    ];
    return <>
        <FunctionReadout title={t("patch_derivatives_readout_heading")} rows={rows} note={t("patch_derivatives_legend")}/>
        {normal.kind === "degenerate" && <p className="inspector-help patch-derivatives-status" data-reason={normal.reason}>{reason}</p>}
        <LiveReadout readout={liveReadout} dataAttribute="derivatives-live"/>
    </>;
}

/** The Prikaz switches of the derivative scene, shown at the end of the "Shown elements" group. */
export function DerivativesVisibilityControls({showTangentPlane, showNormal, showTwist, onChange}: {
    showTangentPlane: boolean; showNormal: boolean; showTwist: boolean;
    onChange: (key: "showTangentPlane" | "showNormal" | "showTwist", visible: boolean) => void;
}) {
    const t = useT();
    return <>
        <OnOffSwitch label={t("patch_show_tangent_plane")} checked={showTangentPlane} onChange={on => onChange("showTangentPlane", on)}/>
        <OnOffSwitch label={t("patch_show_normal")} checked={showNormal} onChange={on => onChange("showNormal", on)}/>
        <OnOffSwitch label={t("patch_show_twist")} checked={showTwist} onChange={on => onChange("showTwist", on)}/>
    </>;
}
