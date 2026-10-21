import {useT} from "../../../localization";
import {Button} from "react-bootstrap";
import React, {useEffect, useReducer, useRef, useState} from "react";
import {JXGBezierCurve} from "../../curves/object/JXGBezierCurve";
import {EXTRAPOLATION_T_MAX, EXTRAPOLATION_T_MIN} from "../../curves/object/AbstractJXGBezierCurve";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import Slider from "../../../inputs/Slider";
import {InspectorDisclosure} from "../../../inputs/InspectorDisclosure";
import {CurveControlsProps} from "./CurveDisplayControls";

export type BezierAdapter = JXGBezierCurve | JXGRationalBezierCurve;
export type BezierToolName = "subdivision" | "extrapolation" | "shrink" | "decasteljau" | "elevation";
/** The tools whose preview draws a point or polyline on the board. The De Casteljau scheme has its own switch. */
type PreviewName = Exclude<BezierToolName, "decasteljau">;

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

/** Shows the board drawing of a preview. It changes only what is drawn, never the curve's geometry. */
function showPreview(curve: BezierAdapter, name: PreviewName) {
    if (name === "subdivision") {
        curve.createSubdivisionPoint();
        curve.showSubdivisionPoint();
    } else if (name === "extrapolation") {
        curve.createExtrapolationPoint();
        curve.showExtrapolationPoint();
    } else if (name === "shrink") {
        // The cut point is the subdivision point, so it has to exist before the shortening preview shows it.
        curve.createSubdivisionPoint();
        curve.showCutPoint();
    } else {
        curve.showElevatePoints();
    }
}

function hidePreview(curve: BezierAdapter, name: PreviewName) {
    if (name === "subdivision") curve.hideSubdivisionPoint();
    else if (name === "extrapolation") curve.hideExtrapolationPoint();
    else if (name === "shrink") curve.hideCutPoint();
    else curve.hideElevatePoints();
}

/**
 * Subdivision, extrapolation, shortening, De Casteljau and elevation tools of a Bézier curve adapter, each in its own disclosure.
 * Previews are switched on and off by explicit toggle buttons (never by hovering), one at a time, because they share the board's
 * points. Opening a disclosure shows nothing; applying an operation clears the preview first.
 */
export function BezierCurveControls({curve, onChanged}: CurveControlsProps<BezierAdapter>) {
    const t = useT();
    const [, rerender] = useReducer((count: number) => count + 1, 0);
    const [preview, setPreview] = useState<PreviewName>();
    // Mirrors `preview` for the cleanup, which must hide what this panel showed even after the state is gone.
    const activePreview = useRef<PreviewName>();
    const tools = bezierTools(curve);

    useEffect(() => {
        setPreview(undefined);
        return () => {
            // Guarded like CurveWorkspaceControls: a destroyed board has no renderer to update.
            if (!curve.board.renderer) return;
            if (activePreview.current) hidePreview(curve, activePreview.current);
            activePreview.current = undefined;
            if (curve.isShowingDecasteljauScheme()) curve.hideDecasteljauScheme();
        };
    }, [curve]);

    const clearPreview = () => {
        if (activePreview.current) hidePreview(curve, activePreview.current);
        activePreview.current = undefined;
        setPreview(undefined);
    };
    const togglePreview = (name: PreviewName) => {
        const previous = activePreview.current;
        clearPreview();
        if (previous === name) return;
        showPreview(curve, name);
        activePreview.current = name;
        setPreview(name);
        curve.board.update();
    };
    const toggleScheme = (shown: boolean) => {
        if (shown) curve.showCurrentDecasteljauScheme(); else curve.hideDecasteljauScheme();
        curve.board.update();
        rerender();
    };
    const apply = (action: () => void) => {
        clearPreview();
        action();
        curve.board.update();
        onChanged();
    };
    const previewButton = (name: PreviewName, label: string) =>
        <Button aria-pressed={preview === name} onClick={() => togglePreview(name)}>{label}</Button>;

    return <>{tools.map(tool => {
        if (tool === "subdivision") {
            return <InspectorDisclosure key={tool} title={t("subdivide")}>
                <Slider min={0} max={1} value={curve.getSubdivisionT()} customText={t("subdivision_parameter_t")}
                        onChange={value => {curve.setSubdivisionT(value); onChanged();}}/>
                {previewButton("subdivision", t("preview_subdivision"))}
                <Button onClick={() => apply(() => curve.subdivide())}>{t("subdivide")}</Button>
            </InspectorDisclosure>;
        }
        if (tool === "extrapolation") {
            return <InspectorDisclosure key={tool} title={t("extrapolate")}>
                <Slider min={EXTRAPOLATION_T_MIN} max={EXTRAPOLATION_T_MAX} value={curve.getExtrapolationT()} customText={t("extrapolation_parameter_t")}
                        onChange={value => {curve.setExtrapolationT(value); onChanged();}}/>
                {previewButton("extrapolation", t("preview_extrapolation"))}
                <Button onClick={() => apply(() => curve.extrapolate(curve.getExtrapolationT()))}>{t("extrapolate")}</Button>
            </InspectorDisclosure>;
        }
        if (tool === "shrink") {
            return <InspectorDisclosure key={tool} title={t("shorten")}>
                <Slider min={0} max={1} value={curve.getSubdivisionT()} customText={t("end_parameter_of_the_shortened_curve_t")}
                        onChange={value => {curve.setSubdivisionT(value); onChanged();}}/>
                {previewButton("shrink", t("preview_shortening"))}
                <Button onClick={() => apply(() => curve.extrapolate(curve.getSubdivisionT()))}>{t("shorten")}</Button>
            </InspectorDisclosure>;
        }
        if (tool === "decasteljau") {
            return <InspectorDisclosure key={tool} title={t("de_casteljau_construction")}>
                <Button aria-pressed={curve.isShowingDecasteljauScheme()}
                        onClick={() => toggleScheme(!curve.isShowingDecasteljauScheme())}>{t("preview_decasteljau_scheme")}</Button>
                <Slider min={0} max={1} value={curve.getDecasteljauT()} customText={t("construction_parameter_t")}
                        onChange={value => {curve.setDecasteljauT(value); curve.board.update(); onChanged();}}/>
            </InspectorDisclosure>;
        }
        return <InspectorDisclosure key={tool} title={t("elevate_degree")}>
            {previewButton("elevation", t("preview_elevation"))}
            <Button onClick={() => apply(() => curve.elevate())}>{t("elevate_degree")}</Button>
        </InspectorDisclosure>;
    })}</>;
}
