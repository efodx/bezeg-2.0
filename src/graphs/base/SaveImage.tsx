import {t, useLanguage} from "../../localization";
import React, {useContext} from "react";
import {SiteContext} from "../context/react/SiteContext";
import {Button, Form} from "react-bootstrap";

export function SaveImage(props: { saveAsSVG: (name: string) => void, saveAsPNG: (name: string) => void }) {
    useLanguage();
    return <div>
        <Form.Label>{t("export_figure")}</Form.Label>
        <div>
            <SaveAsSvg onClick={props.saveAsSVG}/>
            <SaveAsPng onClick={props.saveAsPNG}/>
        </div>
    </div>;
}

function SaveAsPng(props: { onClick: (fileName: string) => void }) {
    const {exporting} = useLanguage();
    const siteContext = useContext(SiteContext);
    const fileName = siteContext.preset.selected === "" ? t("export") : siteContext.preset.selected;
    return <Button disabled={exporting} className="ms-1" onClick={() => props.onClick(fileName + ".png")}>PNG</Button>;
}

function SaveAsSvg(props: { onClick: (fileName: string) => void }) {
    const {exporting} = useLanguage();
    const siteContext = useContext(SiteContext);
    const fileName = siteContext.preset.selected === "" ? t("export") : siteContext.preset.selected;
    return <Button disabled={exporting} onClick={() => props.onClick(fileName + ".svg")}>SVG</Button>;
}
