import {t, useLanguage} from "../../../localization";
import {Button} from "react-bootstrap";
import React from "react";
import {JXGBezierCurve} from "../../curves/object/JXGBezierCurve";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import Slider from "../../../inputs/Slider";
import {CurveControlsProps} from "./CurveDisplayControls";

export type BezierAdapter = JXGBezierCurve | JXGRationalBezierCurve;
export type BezierToolName = "subdivision" | "extrapolation" | "shrink" | "decasteljau" | "elevation";

/** The tools the adapter's attributes allow, in panel order. */
export function bezierTools(curve: BezierAdapter): BezierToolName[] {
    const attributes = curve.getAttributes();
    const tools: BezierToolName[] = [];
    if (attributes.allowSubdivision) tools.push("subdivision");
    if (attributes.allowExtrapolation) tools.push("extrapolation");
    if (attributes.allowShrink) tools.push("shrink");
    if (attributes.allowDecasteljau) tools.push("decasteljau");
    if (attributes.allowElevation) tools.push("elevation");
    return tools;
}

/** One tool of a Bézier curve adapter: its slider and button, read live from the adapter. */
export function BezierTool({curve, tool, onChanged}: CurveControlsProps<BezierAdapter> & { tool: BezierToolName }) {
    useLanguage();
    const apply = (action: () => void) => {
        action();
        curve.board.update();
        onChanged();
    };
    if (tool === "subdivision") {
        return <div onMouseEnter={() => {curve.createSubdivisionPoint(); curve.showSubdivisionPoint();}}
                    onMouseLeave={() => curve.hideSubdivisionPoint()}>
            <Slider min={0} max={1} value={curve.getSubdivisionT()} customText={t("subdivision_parameter_t")}
                    onChange={value => {curve.setSubdivisionT(value); onChanged();}}/>
            <Button onClick={() => apply(() => curve.subdivide())}>{t("subdivide")}</Button>
        </div>;
    }
    if (tool === "extrapolation") {
        return <div onMouseEnter={() => {curve.createExtrapolationPoint(); curve.showExtrapolationPoint();}}
                    onMouseLeave={() => curve.hideExtrapolationPoint()}>
            <Slider min={1} max={1.5} value={curve.getExtrapolationT()} customText={t("extrapolation_parameter_t")}
                    onChange={value => {curve.setExtrapolationT(value); onChanged();}}/>
            <Button onClick={() => apply(() => curve.extrapolate(curve.getExtrapolationT()))}>{t("extrapolate")}</Button>
        </div>;
    }
    if (tool === "shrink") {
        return <div onMouseEnter={() => curve.showCutPoint()} onMouseLeave={() => curve.hideCutPoint()}>
            <Slider min={0} max={1} value={curve.getSubdivisionT()} customText={t("end_parameter_of_the_shortened_curve_t")}
                    onChange={value => {curve.setSubdivisionT(value); onChanged();}}/>
            <Button onClick={() => apply(() => curve.extrapolate(curve.getSubdivisionT()))}>{t("shorten")}</Button>
        </div>;
    }
    if (tool === "decasteljau") {
        return <div onMouseEnter={() => curve.showCurrentDecasteljauScheme()} onMouseLeave={() => curve.hideDecasteljauScheme()}>
            <Slider min={0} max={1} value={curve.getDecasteljauT()} customText={t("construction_parameter_t")}
                    onChange={value => apply(() => curve.setDecasteljauT(value))}/>
        </div>;
    }
    return <div onMouseEnter={() => curve.showElevatePoints()} onMouseLeave={() => curve.hideElevatePoints()}>
        <Button onClick={() => apply(() => curve.elevate())}>{t("elevate_degree")}</Button></div>;
}

/** Subdivision, extrapolation, shortening, De Casteljau and elevation tools of a Bézier curve adapter. */
export function BezierCurveControls({curve, onChanged}: CurveControlsProps<BezierAdapter>) {
    return <>{bezierTools(curve).map(tool => <BezierTool key={tool} curve={curve} tool={tool} onChanged={onChanged}/>)}</>;
}
