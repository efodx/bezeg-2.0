import {useT} from "../../../localization";
import {Button} from "react-bootstrap";
import React, {useEffect, useReducer, useRef, useState} from "react";
import {JXGBezierCurve} from "../../curves/object/JXGBezierCurve";
import {EXTRAPOLATION_T_MAX, EXTRAPOLATION_T_MIN} from "../../curves/object/AbstractJXGBezierCurve";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import Slider from "../../../inputs/Slider";
import {InspectorDisclosure} from "../../../inputs/InspectorDisclosure";
import {CurveControlsProps} from "./CurveDisplayControls";
import {UnavailableButton} from "../../../inputs/UnavailableButton";

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

export type OperationTool = Exclude<BezierToolName, "decasteljau">;

/** What a preview toggle needs: which preview is shown and how to switch it. At most one preview is shown at a time. */
export interface CurvePreviews {
    readonly preview: PreviewName | undefined;
    readonly toggle: (name: PreviewName) => void;
    readonly clear: () => void;
}

/**
 * The pressed-preview state of one curve: explicit toggles (never hover), one preview at a time because previews share the board's
 * points. A preview changes only what is drawn. It is cleared when the curve changes and when the panel goes away.
 */
export function useCurvePreviews(curve: BezierAdapter): CurvePreviews {
    const [preview, setPreview] = useState<PreviewName>();
    // Mirrors `preview` for the cleanup, which must hide what this panel showed even after the state is gone.
    const activePreview = useRef<PreviewName>();
    useEffect(() => {
        setPreview(undefined);
        return () => {
            // A destroyed board has no renderer to update.
            if (!curve.board.renderer) return;
            if (activePreview.current) hidePreview(curve, activePreview.current);
            activePreview.current = undefined;
        };
    }, [curve]);
    const clear = () => {
        if (activePreview.current) hidePreview(curve, activePreview.current);
        activePreview.current = undefined;
        setPreview(undefined);
    };
    const toggle = (name: PreviewName) => {
        const previous = activePreview.current;
        clear();
        if (previous === name) return;
        showPreview(curve, name);
        activePreview.current = name;
        setPreview(name);
        curve.board.update();
    };
    return {preview, toggle, clear};
}

const TOOL_TITLES = {subdivision: "subdivide", extrapolation: "extrapolate", shrink: "shorten", elevation: "elevate_degree"} as const;

interface OperationToolProps {
    curve: BezierAdapter;
    tool: OperationTool;
    /** Called after a parameter changed or a preview was switched. */
    onChanged: () => void;
    /** Called after the operation changed the curve; defaults to `onChanged`. */
    onApplied?: () => void;
    /** The shared preview state, or null when the graph keeps the preview on the board permanently (no toggle is offered). */
    previews: CurvePreviews | null;
    /** Replaces the adapter's own parameter (a graph that keeps it in its own state); null when the operation has no free parameter. */
    parameter?: {value: number, min: number, max: number, onChange: (value: number) => void} | null;
    /** Replaces the adapter's own operation (a graph that rebuilds its scene around the result). */
    onApply?: () => void;
    /** Why Apply cannot act now; the button then stays focusable and says so. */
    applyReason?: string;
    applyClassName?: string;
    applyIcon?: React.ReactNode;
}

/**
 * One curve operation: its parameter `Slider`, a pressed Preview button and an Apply `UnavailableButton`. Applying clears the
 * preview first. Used by the selected-curve panel, the Edit tab and the operation graphs.
 */
export function OperationTool({curve, tool, onChanged, onApplied = onChanged, previews, parameter, onApply, applyReason, applyClassName, applyIcon}: OperationToolProps) {
    const t = useT();
    const apply = (action: () => void) => {
        previews?.clear();
        (onApply ?? action)();
        curve.board.update();
        onApplied();
    };
    const label = t(TOOL_TITLES[tool]);
    let slider: React.ReactNode = null;
    let action = () => curve.elevate();
    let previewLabel = t("preview_elevation");
    if (tool === "subdivision") {
        const p = parameter === undefined ? {value: curve.getSubdivisionT(), min: 0, max: 1,
            onChange: (value: number) => curve.setSubdivisionT(value)} : parameter;
        slider = p && <Slider min={p.min} max={p.max} value={p.value} customText={t("subdivision_parameter_t")}
                              onChange={value => {p.onChange(value); onChanged();}}/>;
        action = () => curve.subdivide();
        previewLabel = t("preview_subdivision");
    } else if (tool === "extrapolation") {
        const p = parameter === undefined ? {value: curve.getExtrapolationT(), min: EXTRAPOLATION_T_MIN, max: EXTRAPOLATION_T_MAX,
            onChange: (value: number) => curve.setExtrapolationT(value)} : parameter;
        slider = p && <Slider min={p.min} max={p.max} value={p.value} customText={t("extrapolation_parameter_t")}
                              onChange={value => {p.onChange(value); onChanged();}}/>;
        action = () => curve.extrapolate(curve.getExtrapolationT());
        previewLabel = t("preview_extrapolation");
    } else if (tool === "shrink") {
        const end = curve.getSubdivisionT();
        slider = <Slider min={0} max={1} value={end} customText={t("end_parameter_of_the_shortened_curve_t")}
                         onChange={value => {curve.setSubdivisionT(value); curve.board.update(); onChanged();}}/>;
        action = () => curve.extrapolate(end);
        previewLabel = t("preview_shortening");
    }
    return <>
        {slider}
        {previews && <Button aria-pressed={previews.preview === tool} onClick={() => previews.toggle(tool)}>{previewLabel}</Button>}
        <UnavailableButton className={applyClassName ?? "btn btn-primary"} reason={applyReason} onPress={() => apply(action)}>
            {applyIcon}{label}
        </UnavailableButton>
    </>;
}

/** An operation tool with its own preview state, for graphs that show one operation outside the selected-curve panel. */
export function CurveOperation(props: Omit<OperationToolProps, "previews"> & {permanentPreview?: boolean}) {
    const previews = useCurvePreviews(props.curve);
    return <OperationTool {...props} previews={props.permanentPreview ? null : previews}/>;
}

/**
 * Subdivision, extrapolation, shortening, De Casteljau and elevation tools of a Bézier curve adapter, each in its own disclosure.
 * Previews are switched on and off by explicit toggle buttons (never by hovering), one at a time, because they share the board's
 * points. Opening a disclosure shows nothing; applying an operation clears the preview first.
 */
export function BezierCurveControls({curve, onChanged, onApplied = onChanged}: CurveControlsProps<BezierAdapter> & {onApplied?: () => void}) {
    const t = useT();
    const [, rerender] = useReducer((count: number) => count + 1, 0);
    const previews = useCurvePreviews(curve);
    const tools = bezierTools(curve);
    const toggleScheme = (shown: boolean) => {
        if (shown) curve.showCurrentDecasteljauScheme(); else curve.hideDecasteljauScheme();
        curve.board.update();
        rerender();
    };

    return <>{tools.map(tool => {
        if (tool === "decasteljau") {
            return <InspectorDisclosure key={tool} title={t("de_casteljau_construction")}>
                <Button aria-pressed={curve.isShowingDecasteljauScheme()}
                        onClick={() => toggleScheme(!curve.isShowingDecasteljauScheme())}>{t("preview_decasteljau_scheme")}</Button>
                <Slider min={0} max={1} value={curve.getDecasteljauT()} customText={t("construction_parameter_t")}
                        onChange={value => {curve.setDecasteljauT(value); curve.board.update(); onChanged();}}/>
            </InspectorDisclosure>;
        }
        return <InspectorDisclosure key={tool} title={t(TOOL_TITLES[tool])} onToggle={open => {if (!open && previews.preview === tool) previews.clear();}}>
            <OperationTool curve={curve} tool={tool} onChanged={onChanged} previews={previews} onApplied={onApplied}/>
        </InspectorDisclosure>;
    })}</>;
}
