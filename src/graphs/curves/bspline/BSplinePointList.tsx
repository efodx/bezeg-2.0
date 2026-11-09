import React from "react";
import {t} from "../../../localization";
import {PointListInput} from "../../../inputs/PointListInput";
import {CURVE_COORDINATE_LIMIT} from "../../base/CurvePointControls";
import type {ControlPoint} from "./bsplineDeBoorModel";

/**
 * The typed path to a B-spline board's control points: coordinates only, with no add or remove (these boards fix the count). A
 * typed value outside the curve coordinate limit is refused by the field; an accepted one goes to the same path as a board drag.
 */
export function BSplinePointList({points, onEdit}: {points: readonly ControlPoint[]; onEdit: (index: number, value: ControlPoint) => void}) {
    return <PointListInput title={t("bsp_point_list")} points={points} pointLabel={i => t("bsp_point_name", {value0: i + 1})}
                           min={-CURVE_COORDINATE_LIMIT} max={CURVE_COORDINATE_LIMIT}
                           onCommit={(index, value) => { onEdit(index, [value[0], value[1]]); }}/>;
}
