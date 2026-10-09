import {t, useLanguage} from "../../localization";
import React, {useContext} from "react";
import {RefreshContext} from "../context/react/RefreshContext";
import ToolTippedButton from "../../inputs/ToolTippedButton";

export function ResetButton() {
    useLanguage();
    let refreshContext = useContext(RefreshContext);
    return refreshContext ?
        <ToolTippedButton tooltip={t("reset_preset")} onClick={refreshContext}>{t("reset")}</ToolTippedButton> : null;
}
