import {t, useLanguage} from "../../localization";
import React from "react";
import ToolTippedButton from "../../inputs/ToolTippedButton";

export function ResetButton({onReset, disabled}: { onReset: () => void, disabled?: boolean }) {
    useLanguage();
    return <ToolTippedButton tooltip={t("reset_preset")} onClick={onReset} disabled={disabled}>{t("reset")}</ToolTippedButton>;
}
