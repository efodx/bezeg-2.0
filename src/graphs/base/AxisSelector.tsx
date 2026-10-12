import {useT} from "../../localization";
import React from "react";
import {Form} from "react-bootstrap";
import {AxisSelect} from "./DisplaySettings";


/** The coordinate-system picker; the graph owns the selection and redraws its board when `onChange` runs. */
export function AxisSelector(props: { selected: AxisSelect, onChange: (selected: AxisSelect) => void }) {
    const t = useT();

    const labels: Record<AxisSelect, string> = {
        [AxisSelect.NONE]: t("none"),
        [AxisSelect.ONLY_AXIS]: t("axes_only"),
        [AxisSelect.AXIS_AND_MAJOR]: t("axes_and_grid"),
        [AxisSelect.AXIS_AND_MINOR]: t("axes_grid_and_ticks"),
        [AxisSelect.EVERYTHING]: t("all")
    };

    return <Form.Group>
        <Form.Label>{t("coordinate_system")}</Form.Label>
        <Form.Select onChange={(value) => props.onChange(value.target.value as AxisSelect)}
                     aria-label={t("coordinate_system")}
                     value={props.selected}
        >
            {Object.values(AxisSelect).map(select =>
                <option key={select} value={select}>{labels[select]}</option>)}
        </Form.Select>
    </Form.Group>;

}
