import React from "react";
import {JXGBezierCurve} from "../../curves/object/JXGBezierCurve";
import {JXGPHBezierCurve} from "../../curves/object/JXGPHBezierCurve";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import {CurveDisplayToggle, displayToggles, DisplayedCurve} from "./CurveDisplayControls";
import {BezierTool, bezierTools} from "./BezierCurveControls";
import {RationalBezierCurveControls} from "./RationalBezierCurveControls";
import {PhBezierCurveControls} from "./PhBezierCurveControls";

/**
 * The controls the selected-curve panel lists for an adapter, one element per panel row. Which controls an adapter
 * has is decided here from its type, so the adapters themselves stay free of React. Every element reads the
 * adapter's flags while rendering and calls `onChanged` after it changed them.
 */
export function selectedCurveControls(curve: DisplayedCurve, onChanged: () => void): JSX.Element[] {
    const controls: JSX.Element[] = [];
    if (curve.getAttributes().allowShowControlPolygon) {
        for (const toggle of displayToggles(curve)) {
            controls.push(<CurveDisplayToggle key={toggle} curve={curve} toggle={toggle} onChanged={onChanged}/>);
        }
    }
    if (curve instanceof JXGBezierCurve || curve instanceof JXGRationalBezierCurve) {
        for (const tool of bezierTools(curve)) {
            controls.push(<BezierTool key={tool} curve={curve} tool={tool} onChanged={onChanged}/>);
        }
    }
    if (curve instanceof JXGRationalBezierCurve) {
        controls.push(<RationalBezierCurveControls key="rational" curve={curve} onChanged={onChanged}/>);
    }
    if (curve instanceof JXGPHBezierCurve) {
        controls.push(<PhBezierCurveControls key="ph" curve={curve} onChanged={onChanged}/>);
    }
    return controls;
}

