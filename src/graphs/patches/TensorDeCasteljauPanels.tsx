import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {useT} from "../../localization";
import type {DecasteljauOrder} from "./patchDto";

/** The construction order select of the Uredi "point" group, with a help line naming each stage's colour and dash. */
export function DeCasteljauOrderControl({order, onChange}: {order: DecasteljauOrder; onChange: (order: DecasteljauOrder) => void}) {
    const t = useT();
    const options = [
        {value: "rows", text: t("patch_decasteljau_order_rows")},
        {value: "columns", text: t("patch_decasteljau_order_columns")},
        {value: "bilinear", text: t("patch_decasteljau_order_bilinear")},
    ];
    const help = order === "rows" ? t("patch_decasteljau_help_rows") : order === "columns" ? t("patch_decasteljau_help_columns") : t("patch_decasteljau_help_bilinear");
    return <ChoiceSelect label={t("patch_decasteljau_order")} value={order} options={options} help={help}
                         onChange={value => onChange(value === "columns" ? "columns" : value === "bilinear" ? "bilinear" : "rows")}/>;
}

/** The Prikaz switch that draws the construction. */
export function DeCasteljauVisibilityControl({checked, onChange}: {checked: boolean; onChange: (checked: boolean) => void}) {
    const t = useT();
    return <OnOffSwitch label={t("de_casteljau_construction")} checked={checked} onChange={onChange}/>;
}
