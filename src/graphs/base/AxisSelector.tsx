import {t, useLanguage} from "../../localization";
import React, {useState} from "react";
import {Form} from "react-bootstrap";
import {AxisContext, AxisSelect} from "../context/AxisContext";


export function AxisSelector(props: { board: () => JXG.Board }) {
    useLanguage();

    const labels: Record<AxisSelect, string> = {
        [AxisSelect.NONE]: t("none"),
        [AxisSelect.ONLY_AXIS]: t("axes_only"),
        [AxisSelect.AXIS_AND_MAJOR]: t("axes_and_grid"),
        [AxisSelect.AXIS_AND_MINOR]: t("axes_grid_and_ticks"),
        [AxisSelect.EVERYTHING]: t("all")
    };
    const [selectedAxis, setAxis] = useState(AxisContext.getSelected());

    return <Form.Group>
        <Form.Label>{t("coordinate_system")}</Form.Label>
        <Form.Select onChange={(value) => {
            AxisContext.setSelected(value.target.value as AxisSelect);
            setAxis(value.target.value as AxisSelect);
            props.board().fullUpdate();
        }} aria-label={t("coordinate_system")}
                     defaultValue={selectedAxis}
        >
            {Object.values(AxisSelect).map(select =>
                <option key={select} value={select}>{labels[select]}</option>)}
        </Form.Select>
    </Form.Group>;

}
