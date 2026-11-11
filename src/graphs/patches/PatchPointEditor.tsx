import {useMemo} from "react";
import {PointListInput, type PointRow3} from "../../inputs/PointListInput";
import {useT} from "../../localization";
import type {Xyz} from "./surface-view/surfaceScene";

/**
 * The coordinates of the selected control point `name`, typed. Each field commits on Enter or blur (decision 2, no Apply button); an
 * axis left as shown keeps its exact unrounded value, because the field writes nothing for an unedited draft and the other axes come
 * from `xyz`. An empty or non-finite draft is refused in the field's own hint. It is `PointListInput` with one row and three axes,
 * which already gives the name legend, the per-field names ("P12, x") and the refusal channel. Shared by the tensor, join, Coons and
 * triangular patch panels, which all use it.
 */
export function PatchPointEditor({name, xyz, onCommit}: {name: string; xyz: Xyz; onCommit: (xyz: Xyz) => void}) {
    const t = useT();
    // Stable while the point is unchanged: PointListInput clears a shown refusal when the list it gets changes identity.
    const [x, y, z] = xyz;
    const points = useMemo(() => [[x, y, z] as PointRow3], [x, y, z]);
    return <div className="point-coordinate-editor patch-point-editor">
        <PointListInput<PointRow3> title={t("point_coordinates_keyboard_editing")} points={points} pointLabel={() => name} axisLabels={["x", "y", "z"]}
                                  decimals={4} step={0.1} onCommit={(_, next) => { onCommit([next[0], next[1], next[2]]); }}/>
    </div>;
}
