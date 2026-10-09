import {t} from "../../../localization";
import React from "react";
import {BaseSplineCurveGraph} from "./BaseSplineCurveGraph";
import {Button} from "react-bootstrap";
import {BaseGraphStates} from "../../base/BaseCurveGraph";

class Graph extends BaseSplineCurveGraph<BaseGraphStates> {

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([<div><Button onClick={() => this.povecajB1()}>{t("increase_b1")}</Button>
            <Button onClick={() => this.zmanjsajB1()}>{t("decrease_b1")}</Button></div>,
            <div><Button onClick={() => this.povecajB2()}>{t("increase_b2")}</Button>
                <Button onClick={() => this.zmanjsajB2()}>{t("decrease_b2")}</Button>
                <Button onClick={() => this.scale(1.2)}>{t("scale_up")}</Button>
                <Button onClick={() => this.scale(0.8)}>{t("scale_down")}</Button></div>,
            <div><Button onClick={() => this.moveFor(-0.5, 0)}>{t("left")}</Button>
                <Button onClick={() => this.moveFor(0.5, 0)}>{t("right")}</Button></div>,
            <div><Button onClick={() => this.moveFor(0, 0.5)}>{t("up")}</Button>
                <Button onClick={() => this.moveFor(0, -0.5)}>{t("down")}</Button></div>,
            <div><Button onClick={() => this.rotate(0.10 * Math.PI)}>{t("rotate_left")}</Button>
                <Button onClick={() => this.rotate(-0.10 * Math.PI)}>{t("rotate_right")}</Button></div>,
            <div><Button onClick={() => this.flip(true, false)}>{t("reflect_across_y")}</Button>
                <Button onClick={() => this.flip(false, true)}>{t("reflect_across_x")}</Button></div>]);
    }

    override presets() {
        return "g1-spline";
    }

    defaultPreset(): any {
        return [["JSXQuadraticG1SplineCurve", {
            "points": [[-3, 2], [-4, -1], [-3, -2], [-1, 1], [1, 2]], "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false
            }
        }]];
    }

    private povecajB1() {
        this.getFirstCurve().setB(0, this.getFirstCurve().getB(0) * 1.1);
        this.boardUpdate();
    }

    private zmanjsajB1() {
        this.getFirstCurve().setB(0, this.getFirstCurve().getB(0) * 0.9);
        this.boardUpdate();
    }

    private povecajB2() {
        this.getFirstCurve().setB(1, this.getFirstCurve().getB(1) * 1.1);
        this.boardUpdate();
    }

    private zmanjsajB2() {
        this.getFirstCurve().setB(1, this.getFirstCurve().getB(1) * 0.9);
        this.boardUpdate();
    }

    private moveFor(x: number, y: number) {
        this.getFirstCurve().moveFor(x, y);
        this.boardUpdate();
    }

    private scale(scale: number) {
        this.getFirstCurve().scale(scale);
        this.boardUpdate();
    }

    private rotate(number: number) {
        this.getFirstCurve().rotate(number);
        this.boardUpdate();
    }

    private flip(b: boolean, b2: boolean) {
        this.getFirstCurve().flip(b, b2);
        this.boardUpdate();
    }

}

export default Graph;
