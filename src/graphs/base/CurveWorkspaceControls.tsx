import {useT} from "../../localization";
import React, {useReducer} from "react";
import {JXGBezierCurve} from "../curves/object/JXGBezierCurve";
import {BezierCurveControls} from "./controls/BezierCurveControls";

/**
 * The Edit tab's curve operations. They are the selected-curve panel's operation tools (pressed Preview, Slider, Apply), so the
 * two places share one preview model; this wrapper only titles the group and reports a change to the workspace.
 */
export function CurveWorkspaceOperations({curve, onChanged}: {curve: JXGBezierCurve, onChanged: () => void}) {
    const t = useT();
    // A slider or preview only redraws this panel; the workspace is rebuilt only when an operation changed the curve.
    const [, rerender] = useReducer((count: number) => count + 1, 0);
    return <div className="inspector-group curve-operations"><h3>{t("selected_curve_operations")}</h3>
        <BezierCurveControls curve={curve} onChanged={rerender} onApplied={onChanged}/>
    </div>;
}
