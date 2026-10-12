import {t, useLanguage} from "../../localization";
import React from "react";
import {Button, Form} from "react-bootstrap";

/** `presetId` is the selected preset ("" for none); it names the downloaded file. */
export function SaveImage(props: { saveAsSVG: (name: string) => void, saveAsPNG: (name: string) => void, showLabel?: boolean, presetId?: string }) {
    useLanguage();
    return <>
        {props.showLabel !== false && <Form.Label>{t("export_figure")}</Form.Label>}
        <div className="figure-export-actions">
            <SaveAsSvg onClick={props.saveAsSVG} presetId={props.presetId ?? ""}/>
            <SaveAsPng onClick={props.saveAsPNG} presetId={props.presetId ?? ""}/>
        </div>
    </>;
}

function SaveAsPng(props: { onClick: (fileName: string) => void, presetId: string }) {
    const {exporting} = useLanguage();
    const fileName = props.presetId === "" ? t("export") : props.presetId;
    return <Button disabled={exporting} onClick={() => props.onClick(fileName + ".png")}>PNG</Button>;
}

function SaveAsSvg(props: { onClick: (fileName: string) => void, presetId: string }) {
    const {exporting} = useLanguage();
    const fileName = props.presetId === "" ? t("export") : props.presetId;
    return <Button disabled={exporting} onClick={() => props.onClick(fileName + ".svg")}>SVG</Button>;
}
