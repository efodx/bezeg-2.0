import {t, useLanguage} from "../../localization";
import {Commands} from "./Commands";
import React from "react";

export function Tools({tools}: { tools: JSX.Element[] }) {
    useLanguage();
    return <Commands commands={tools} title={t("tools")}></Commands>;
}