import React from "react";
import {JXGBezierCurve} from "../../curves/object/JXGBezierCurve";
import {JXGPHBezierCurve} from "../../curves/object/JXGPHBezierCurve";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import {DisplayedCurve} from "./CurveDisplayControls";
import {BezierCurveControls} from "./BezierCurveControls";
import {RationalBezierCurveControls} from "./RationalBezierCurveControls";
import {PhBezierCurveControls} from "./PhBezierCurveControls";

/**
 * The controls the selected-curve panel lists for an adapter, one element per panel row. Which controls an adapter
 * has is decided here from its type, so the adapters themselves stay free of React. Every element reads the
 * adapter's flags while rendering and calls `onChanged` after it changed them. The display switches are not listed
 * here: the Display tab owns them for every curve. `curveNumber` is the curve's number in the graph, counted from 1.
 */
export function selectedCurveControls(curve: DisplayedCurve, onChanged: () => void, curveNumber: number): JSX.Element[] {
    const controls: JSX.Element[] = [];
    if (curve instanceof JXGBezierCurve || curve instanceof JXGRationalBezierCurve) {
        controls.push(<BezierCurveControls key="bezier" curve={curve} onChanged={onChanged}/>);
    }
    if (curve instanceof JXGRationalBezierCurve) {
        controls.push(<RationalBezierCurveControls key="rational" curve={curve} curveNumber={curveNumber} onChanged={onChanged}/>);
    }
    if (curve instanceof JXGPHBezierCurve) {
        controls.push(<PhBezierCurveControls key="ph" curve={curve} onChanged={onChanged}/>);
    }
    return controls;
}

