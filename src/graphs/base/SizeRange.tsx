import {useT} from "../../localization";
import React from "react";
import Slider from "../../inputs/Slider";

/** The element size slider; the graph owns the size and redraws its board when `onChange` runs. */
export function SizeRange(props: { size: number, onChange: (size: number) => void }) {
    const t = useT();
    return <div><Slider customText={t("graph_element_size")} help={t("size_of_points_lines_and_labels_does_not_change_the_viewport_zoom")} min={0} max={25} value={props.size} step={1}
                        onChange={props.onChange}/></div>;
}
