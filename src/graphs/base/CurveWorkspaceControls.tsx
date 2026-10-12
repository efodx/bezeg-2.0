import {useT} from "../../localization";
import React, {useEffect, useState} from "react";
import Slider from "../../inputs/Slider";
import {JXGBezierCurve} from "../curves/object/JXGBezierCurve";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";

function OperationGroup({title, children}: {title: string, children: React.ReactNode}) {
    return <details className="inspector-control operation-group"><summary>{title}</summary>{children}</details>;
}

export function CurveWorkspaceOperations({curve, onChanged}: {curve: JXGBezierCurve, onChanged: () => void}) {
    const t = useT();
    const [subdivision, setSubdivision] = useState(curve.getSubdivisionT());
    const [extrapolation, setExtrapolation] = useState(curve.getExtrapolationT());
    const [shrink, setShrink] = useState(curve.getSubdivisionT());
    const [decasteljau, setDecasteljau] = useState(curve.getDecasteljauT());
    const [preview, setPreview] = useState(curve.isShowingDecasteljauScheme());
    const [operationPreview, setOperationPreview] = useState<string>();
    const attributes = curve.getAttributes();
    useEffect(() => {
        if (attributes.allowSubdivision) { curve.createSubdivisionPoint(); }
        if (attributes.allowExtrapolation) { curve.createExtrapolationPoint(); }
        return () => {
            if (curve.board.renderer) {
                curve.hideSubdivisionPoint(); curve.hideExtrapolationPoint(); curve.hideCutPoint(); curve.hideDecasteljauScheme();
            }
        };
    }, [curve, attributes.allowSubdivision, attributes.allowExtrapolation]);
    const redraw = (action: () => void) => { action(); curve.board.update(); };
    const clearOperationPreview = () => {curve.hideSubdivisionPoint(); curve.hideExtrapolationPoint(); curve.hideCutPoint();};
    const operate = (action: () => void) => {
        clearOperationPreview();
        setOperationPreview(undefined);
        action();
        curve.board.update();
        onChanged();
    };
    const togglePreview = (name: string) => {
        redraw(() => {
            clearOperationPreview();
            if (operationPreview === name) {setOperationPreview(undefined); return;}
            setOperationPreview(name);
            if (name === "subdivision") {curve.setSubdivisionT(subdivision); curve.showSubdivisionPoint();}
            if (name === "extrapolation") {curve.setExtrapolationT(extrapolation); curve.showExtrapolationPoint();}
            if (name === "shrink") {curve.setSubdivisionT(shrink); curve.showCutPoint();}
        });
    };
    return <div className="inspector-group curve-operations"><h3>{t("selected_curve_operations")}</h3>
        {attributes.allowSubdivision && <OperationGroup title={t('subdivide')}>
            <Slider customText={t("subdivision_parameter_t")} min={0} max={1} value={subdivision}
                help={t("split_the_curve_into_two_parts_at_the_selected_parameter")}
                onChange={t => {setSubdivision(t); curve.setSubdivisionT(t);}}/>
            <button aria-pressed={operationPreview === "subdivision"} onClick={() => togglePreview("subdivision")}>{t("preview_subdivision")}</button>
            <button onClick={() => operate(() => {curve.setSubdivisionT(subdivision); curve.subdivide();})}>{t("subdivide")}</button></OperationGroup>}
        {attributes.allowExtrapolation && <OperationGroup title={t('extrapolate')}>
            <Slider customText={t("extrapolation_parameter_t")} min={1} max={1.5} value={extrapolation}
                help={t("extend_the_curve_beyond_its_end_parameter")}
                onChange={t => {setExtrapolation(t); curve.setExtrapolationT(t);}}/>
            <button aria-pressed={operationPreview === "extrapolation"} onClick={() => togglePreview("extrapolation")}>{t("preview_extrapolation")}</button>
            <button onClick={() => operate(() => curve.extrapolate(extrapolation))}>{t("extrapolate")}</button></OperationGroup>}
        {attributes.allowShrink && <OperationGroup title={t('shorten')}>
            <Slider customText={t("end_parameter_of_the_shortened_curve_t")} min={0} max={1} value={shrink}
                help={t("keep_the_curve_from_the_start_to_the_selected_parameter")} onChange={t => {setShrink(t); if (operationPreview === "shrink") {curve.setSubdivisionT(t);}}}/>
            <button aria-pressed={operationPreview === "shrink"} onClick={() => togglePreview("shrink")}>{t("preview_shortening")}</button>
            <button onClick={() => operate(() => curve.extrapolate(shrink))}>{t("shorten")}</button></OperationGroup>}
        {attributes.allowDecasteljau && <OperationGroup title={t('de_casteljau_construction')}>
            <OnOffSwitch label={t("de_casteljau_construction")} checked={preview} onChange={checked => {
                setPreview(checked); redraw(() => checked ? curve.showCurrentDecasteljauScheme() : curve.hideDecasteljauScheme());
            }}/>
            <Slider customText={t("construction_parameter_t")} min={0} max={1} value={decasteljau}
                help={t("show_intermediate_construction_steps_at_the_selected_parameter")}
                onChange={t => {setDecasteljau(t); redraw(() => {curve.setDecasteljauT(t); if (preview) {curve.showCurrentDecasteljauScheme();}});}}/>
        </OperationGroup>}
        {attributes.allowElevation && <button onClick={() => operate(() => curve.elevate())}>{t("elevate_degree")}</button>}
    </div>;
}
