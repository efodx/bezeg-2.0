import {t} from "../../../../localization";
import {Button} from "react-bootstrap";
import React from "react";
import {JXGBezierCurve} from "../JXGBezierCurve";
import Slider from "../../../../inputs/Slider";

export function BezierCurveCommands(curve: JXGBezierCurve): JSX.Element[] {
    const commands = [];
    if (curve.getAttributes().allowSubdivision) {
        commands.push(<div onMouseEnter={() => {curve.createSubdivisionPoint(); curve.showSubdivisionPoint();}}
                           onMouseLeave={() => curve.hideSubdivisionPoint()}>
            <Slider min={0} max={1}
                    initialValue={curve.getSubdivisionT()}
                    onChange={(t) => curve.setSubdivisionT(t)}></Slider>
            <Button onClick={() => {
                curve.subdivide();
                curve.board.update();
            }}>{t("subdivide")}</Button>
        </div>);
    }
    if (curve.getAttributes().allowExtrapolation) {
        commands.push(<div onMouseEnter={() => {curve.createExtrapolationPoint(); curve.showExtrapolationPoint();}}
                           onMouseLeave={() => curve.hideExtrapolationPoint()}>
            <Slider min={1} max={1.5}
                    initialValue={curve.getExtrapolationT()}
                    onChange={(t) => curve.setExtrapolationT(t)}></Slider>
            <Button
                onClick={() => {
                    curve.extrapolate(curve.getExtrapolationT());
                    curve.board.update();
                }}>{t("extrapolate")}</Button>
        </div>);
    }
    if (curve.getAttributes().allowShrink) {
        commands.push(<div onMouseEnter={() => curve.showCutPoint()}
                           onMouseLeave={() => curve.hideCutPoint()}>
            <Slider min={0} max={1}
                    initialValue={curve.getSubdivisionT()}
                    onChange={(t) => curve.setSubdivisionT(t)}></Slider>
            <Button onClick={() => {
                curve.extrapolate(curve.getSubdivisionT());
                curve.board.update();
            }}>{t("shorten")}</Button>
        </div>);
    }
    if (curve.getAttributes().allowDecasteljau) {
        commands.push(<div onMouseEnter={() => curve.showCurrentDecasteljauScheme()}
                           onMouseLeave={() => curve.hideDecasteljauScheme()}>
            <Slider min={0} max={1}
                    initialValue={curve.getDecasteljauT()}
                    onChange={(t) => {
                        curve.setDecasteljauT(t);
                        curve.board.update();
                    }}></Slider>
        </div>);
    }
    if (curve.getAttributes().allowElevation) {
        commands.push(<div onMouseEnter={() => curve.showElevatePoints()}
                           onMouseLeave={() => curve.hideElevatePoints()}>
            <Button onClick={() => {
                curve.elevate();
                curve.board.update();
            }}>{t("elevate_degree")}</Button></div>);
    }

    return commands;
}
