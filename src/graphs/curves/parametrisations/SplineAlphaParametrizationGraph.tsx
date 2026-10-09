import {t} from "../../../localization";
import {BaseSplineCurveGraph} from "../spline/BaseSplineCurveGraph";
import {Color, Colors} from "../bezier/utilities/Colors";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {PointStyles} from "../../styles/PointStyles";
import React from "react";
import Slider from "../../../inputs/Slider";
import {SizeContext} from "../../context/SizeContext";
import {Preset} from "../../base/presets/Presets";

interface SplineAlphaParamGraphStates extends BaseGraphStates {
    numberOfPoints: number;
    alpha: number;
}

class Graph extends BaseSplineCurveGraph<SplineAlphaParamGraphStates> {
    override componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<SplineAlphaParamGraphStates>, snapshot?: any) {
        if (prevState === this.state && prevProps === this.props) { return; }
        if (this.graphJXGPoints.length !== this.state.numberOfPoints) {
            // Not sure if correct fix, but it works.
            this.generateParamPoints(this.state.numberOfPoints);
        }
    }

    override getInitialState() {
        return {
            ...super.getInitialState(),
            numberOfPoints: 25,
            alpha: 0.5,
        };
    }


    override presets(): string {
        return "alfaparametrizacije";
    }

    override importPreset(preset: Preset) {
        super.importPreset(preset);
        const presetState = preset.graphState as SplineAlphaParamGraphStates | undefined;
        if (presetState && typeof presetState.numberOfPoints === "number") {
            this.board.suspendUpdate();
            const alpha = typeof presetState.alpha === "number" ? presetState.alpha : this.state.alpha;
            this.getFirstCurve().setAlpha(alpha);
            this.setState({alpha, numberOfPoints: presetState.numberOfPoints});
            this.clearPoints();
            this.generateParamPoints(presetState.numberOfPoints);
            this.unsuspendBoardUpdate();
        }
    }

    protected override importFigurePresetData(preset: Preset): void {
        super.importFigurePresetData(preset);
        const alpha = (preset.graphState as Partial<SplineAlphaParamGraphStates> | undefined)?.alpha;
        if (typeof alpha === "number" && Number.isFinite(alpha)) this.getFirstCurve().setAlpha(alpha);
    }


    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat(this.alphaParamSlider(), this.numberOfPointsSlider()) : [];
    }

    setAlpha(alpha: number) {
        this.board.suspendUpdate();
        this.setState({...this.state, alpha: alpha});
        this.getFirstCurve().setAlpha(alpha);
        this.unsuspendBoardUpdate();
    }

    clearPoints() {
        this.board.removeObject(this.graphJXGPoints);
        this.graphJXGPoints = [];
    }

    setNumberOfPoints(numberOfPoints: number) {
        this.board.suspendUpdate();
        this.setState({...this.state, numberOfPoints: numberOfPoints});
        this.clearPoints();
        this.generateParamPoints(numberOfPoints);
        this.unsuspendBoardUpdate();
    }

    alphaParamSlider() {
        return <div>α<Slider min={0} max={1} step={0.01} initialValue={this.state.alpha}
                             onChange={(alpha) => this.setAlpha(alpha)}/></div>;
    }

    numberOfPointsSlider() {
        return <div>{t("number_of_points")}<Slider min={0} max={50} step={1}
                                         initialValue={this.state.numberOfPoints}
                                         onChange={(num) => this.setNumberOfPoints(num)}/>
        </div>;
    }

    defaultPreset(): any {
        return [["JSXQubicC2SplineCurve", {
            "points": [[-3.2, 0], [-4.2, -1], [-1.7, -1], [1.3, 1.8], [3.5, 1.9], [4.3, 0.5], [3.8, -1], [-0.5, -4], [-3.7, -4]],
            "state": {
                "showingJxgPoints": true, "showingControlPolygon": false, "showingConvexHull": false, hideFixed: true
            }
        }]];
    }

    generateParamPoints(numberOfPoints: number) {
        const dt = 1 / (numberOfPoints + 1);
        for (let i = 1; i <= numberOfPoints; i++) {
            let point = this.createJSXGraphPoint(() => this.getFirstCurve()!.eval(i * dt).X(), () => this.getFirstCurve()!.eval(i * dt).Y(), {
                ...PointStyles.default,
                size: () => SizeContext.pointSize * 0.5,
                color: Colors[3],
            });
            // For some reason you cant set color and stroke color at the same time through attributes....
            point.point.setAttribute({
                strokeWidth: () => SizeContext.pointSize / 5,
                strokeColor: Color.BLACK,
            });
        }
    }

}

export default Graph;
