import {Button} from "react-bootstrap";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, useT} from "../../localization";
import {FunctionReadout} from "../functions/FunctionReadout";
import type {NormalDegeneracy, TensorDifferentials} from "./tensorDerivatives";
import type {Xyz} from "./surface-view/surfaceScene";

export const DERIVATIVES_CORNERS: ReadonlyArray<readonly [0 | 1, 0 | 1]> = [[0, 0], [1, 0], [0, 1], [1, 1]];

/** The Uredi buttons that set (u, v) to a corner of the parameter square. */
export function DerivativesCornerButtons({onCorner}: {onCorner: (u: 0 | 1, v: 0 | 1) => void}) {
    const t = useT();
    return <div className="patch-derivatives-corners" role="group" aria-label={t("patch_derivatives_corners")}>
        <div className="workspace-curve-picker">{DERIVATIVES_CORNERS.map(([u, v]) =>
            <Button key={`${u}${v}`} data-corner={`${u}${v}`} aria-label={t("patch_derivatives_corner", {value0: String(u), value1: String(v)})}
                    onClick={() => onCorner(u, v)}>{`(${u}, ${v})`}</Button>)}</div>
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
    const rows = [
        {id: "su", label: <var>S<sub>u</sub></var>, value: vectorText(differentials.su, language)},
        {id: "sv", label: <var>S<sub>v</sub></var>, value: vectorText(differentials.sv, language)},
        {id: "twist", label: <var>S<sub>uv</sub></var>, value: vectorText(differentials.twist, language)},
        {id: "normal", label: t("patch_derivatives_normal_label"), value: normal.kind === "defined" ? vectorText(normal.unit, language) : t("patch_derivatives_normal_undefined")},
    ];
    return <>
        <FunctionReadout title={t("patch_derivatives_readout_heading")} rows={rows} note={t("patch_derivatives_legend")}/>
        {normal.kind === "degenerate" && <p className="inspector-help patch-derivatives-status" role="status" data-reason={normal.reason}>{t(REASON_KEYS[normal.reason])}</p>}
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
