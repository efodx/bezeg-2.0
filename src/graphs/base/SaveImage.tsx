import {t, useLanguage} from "../../localization";
import React, {useContext} from "react";
import {SiteContext} from "../context/react/SiteContext";
import {Button, Form} from "react-bootstrap";

export function SaveImage(props: { saveAsSVG: (name: string) => void, saveAsPNG: (name: string) => void, showLabel?: boolean }) {
    useLanguage();
    return <>
        {props.showLabel !== false && <Form.Label>{t("export_figure")}</Form.Label>}
        <div className="figure-export-actions">
            <SaveAsSvg onClick={props.saveAsSVG}/>
            <SaveAsPng onClick={props.saveAsPNG}/>
        </div>
    </>;
}

function SaveAsPng(props: { onClick: (fileName: string) => void }) {
    const {exporting} = useLanguage();
    const siteContext = useContext(SiteContext);
    const fileName = siteContext.preset.selected === "" ? t("export") : siteContext.preset.selected;
    return <Button disabled={exporting} onClick={() => props.onClick(fileName + ".png")}>PNG</Button>;
}

function SaveAsSvg(props: { onClick: (fileName: string) => void }) {
    const {exporting} = useLanguage();
    const siteContext = useContext(SiteContext);
    const fileName = siteContext.preset.selected === "" ? t("export") : siteContext.preset.selected;
    return <Button disabled={exporting} onClick={() => props.onClick(fileName + ".svg")}>SVG</Button>;
}
