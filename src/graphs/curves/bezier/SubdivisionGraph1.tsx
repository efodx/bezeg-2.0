import {t} from "../../../localization";
import React from 'react';

import {GraphPalette} from "../../styles/GraphPalette";
import {Button} from "react-bootstrap";
import {BaseGraphStates} from '../../base/BaseCurveGraph';
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import Slider from "../../../inputs/Slider";
import {Attributes} from "../../attributes/Attributes";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";

import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    showDecasteljau?: boolean
}

class SubdivisionGraph1 extends BaseBezierCurveGraph<DecasteljauGraphStates> {

    override getInitialState(): DecasteljauGraphStates {
        return {...super.getInitialState(), t: 0.5, v: 1};
    }

    protected override onStateChange(prevState: Readonly<DecasteljauGraphStates>) {
        if (prevState === this.state) { return; }
        this.board.suspendUpdate();
        this.getFirstJxgCurve().setDecasteljauT(this.state.t);
        this.unsuspendBoardUpdate();
    }

    private setT(value: number, extra?: Partial<DecasteljauGraphStates>) {
        this.setState({...extra, t: value});
    }

    defaultPreset(): any {
        return [["JSXBezierCurve", {
            "points": [[-4, -3], [-3, 3], [3, 3], [4, -3]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": true,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2
            }
        }]];
    }

    override presets(): string {
        return "subdivision-1";
    }

    /** Orange remainder [t, 1] of the first curve; owned by this graph and rebuilt whenever the curve set is replaced. */
    private remainderCurve?: JXG.Curve;

    override initialize() {
        super.initialize();
        this.bindSceneToFirstCurve();
        this.boardUpdate();
    }

    /** Presets, lesson scenes and checkpoints replace the curve objects without calling initialize(). */
    override importPresetData(data: any) {
        super.importPresetData(data);
        this.bindSceneToFirstCurve();
    }

    protected override disposeFigureSceneResources(): void {
        super.disposeFigureSceneResources();
        this.removeRemainderCurve();
    }

    private removeRemainderCurve() {
        const remainder = this.remainderCurve;
        this.remainderCurve = undefined;
        if (remainder && this.board && this.board.objectsList.includes(remainder)) {
            this.board.removeObject(remainder);
        }
    }

    /** Idempotent: (re)applies display settings to the current first curve and rebinds the orange remainder to it. */
    private bindSceneToFirstCurve() {
        this.removeRemainderCurve();
        const jxgCurve = this.getFirstJxgCurve();
        if (!jxgCurve) { return; }
        this.jxgCurves.forEach((curve, index) => {
            if (index === 0) {
                curve.getJxgCurve().setAttribute({strokeColor: GraphPalette.comparisonCurve, highlightStrokeColor: GraphPalette.comparisonCurve});
            } else if (index === 1) {
                curve.getJxgCurve().setAttribute({strokeColor: GraphPalette.constructionAccent, highlightStrokeColor: GraphPalette.constructionAccent});
            } else {
                this.applyCurveVisualRole(curve, index);
            }
        });
        this.graphJXGPoints = jxgCurve.getJxgPoints();
        jxgCurve.setIntervalEnd(() => this.state.showDecasteljau ? 1 : this.state.t);
        jxgCurve.setAttributes(Attributes.bezierDisabled);
        // The subdivision lesson describes the retained left piece as blue.
        jxgCurve.showDecasteljauPoints();

        const curve = jxgCurve.getCurve();
        this.remainderCurve = this.board.create('curve',
            [(t: number) => curve.eval(t).X(),
                (t: number) => curve.eval(t).Y(),
                () => this.state.t,
                1
            ], {...this.styles.curve.default, strokeColor: GraphPalette.constructionAccent, highlightStrokeColor: GraphPalette.constructionAccent}
        ) as JXG.Curve;
    }



    protected override lessonDefaultState(): DecasteljauGraphStates {
        return {...super.lessonDefaultState(), t: 0.5, v: 1, showDecasteljau: true};
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('subdivision-parameter', action => {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.01 || value > 0.99) {
                throw new Error('The subdivision parameter t must be a number from 0.01 to 0.99.');
            }
            this.setT(value);
        });
        registry.on('subdivide', () => {
            const t = this.state.t;
            if (!this.getFirstJxgCurve() || !(t >= 0.01 && t <= 0.99)) {
                throw new Error('Set the subdivision parameter t between 0.01 and 0.99 before subdividing.');
            }
            this.subdivide();
        });
        // The scheme switch also drives the drawn interval, so it extends the shared curve visibility handler.
        registry.onDiscriminated('curve-visibility', 'decasteljau-scheme', (action, shared) => {
            shared(action);
            this.setState({showDecasteljau: action.visible});
        });
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("construction")}</h3>
            <OnOffSwitch checked={this.getFirstJxgCurve().isShowingDecasteljauScheme() || !!this.state.showDecasteljau}
                onChange={checked => {
                    this.getFirstJxgCurve().showCurrentDecasteljauScheme(checked);
                    this.setState({showDecasteljau: checked});
                    this.boardUpdate();
                }}
                label={t("show_scheme")}/></div></>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([
            <Slider customText={t("subdivision_parameter_t")} min={0.01} max={0.99}
                    value={this.state.t}
                    onChange={(t) => this.setT(t, this.state)}></Slider>,
            <Button onClick={() => this.subdivide()}>{t("subdivide")}</Button>]) : [];
    }

    private subdivide() {
        this.getFirstJxgCurve().setSubdivisionT(this.state.t);
        const newcurve = this.getFirstJxgCurve().subdivide();
        this.getFirstJxgCurve().showCurrentDecasteljauScheme(false);
        newcurve.getJxgCurve().setAttribute({strokeColor: GraphPalette.constructionAccent, highlightStrokeColor: GraphPalette.constructionAccent});
        this.boardUpdate();
        this.setT(1, {...this.state, showDecasteljau: false});
    }
}

export default SubdivisionGraph1;
