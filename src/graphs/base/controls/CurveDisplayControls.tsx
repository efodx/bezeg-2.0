import {t, useLanguage} from "../../../localization";
import React from "react";
import {AbstractJXGPointControlledCurve, PointControlledCurveAttributes} from "../../curves/object/AbstractJXGPointControlledCurve";
import {PointControlledCurve} from "../../../bezeg/api/curve/point-controlled-curve";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";

export type DisplayedCurve = AbstractJXGPointControlledCurve<PointControlledCurve, PointControlledCurveAttributes>;

export interface CurveControlsProps<C> {
    curve: C;
    /** Called after the controls changed the adapter, so the host re-renders them from the adapter's flags. */
    onChanged: () => void;
}

export type DisplayToggle = "control-polygon" | "convex-hull" | "control-points";

/** The display toggles the adapter's attributes allow, in panel order. */
export function displayToggles(curve: DisplayedCurve): DisplayToggle[] {
    const {allowShowControlPolygon, allowShowConvexHull, allowShowPoints} = curve.getAttributes();
    const toggles: DisplayToggle[] = [];
    if (allowShowControlPolygon) toggles.push("control-polygon");
    if (allowShowConvexHull) toggles.push("convex-hull");
    if (allowShowPoints) toggles.push("control-points");
    return toggles;
}

/** One display switch of a curve, read live from the adapter. */
export function CurveDisplayToggle({curve, toggle, onChanged}: CurveControlsProps<DisplayedCurve> & { toggle: DisplayToggle }) {
    useLanguage();
    if (toggle === "control-polygon") {
        return <OnOffSwitch checked={curve.isShowingControlPolygon()} label={t("control_polygon")}
                            onChange={checked => {curve.showControllPolygon(checked); onChanged();}}/>;
    }
    if (toggle === "convex-hull") {
        return <OnOffSwitch checked={curve.isShowingConvexHull()} label={t("convex_hull")}
                            onChange={checked => {curve.showConvexHull(checked); onChanged();}}/>;
    }
    return <OnOffSwitch checked={curve.isShowingJxgPoints()} label={t("control_points")}
                        onChange={checked => {curve.showJxgPointss(checked); onChanged();}}/>;
}

/** Control polygon, convex hull and control point switches of one curve, each in its own inspector row. */
export function CurveDisplayControls({curve, onChanged}: CurveControlsProps<DisplayedCurve>) {
    return <>{displayToggles(curve).map(toggle =>
        <div className="inspector-control" key={toggle}><CurveDisplayToggle curve={curve} toggle={toggle} onChanged={onChanged}/></div>)}</>;
}
