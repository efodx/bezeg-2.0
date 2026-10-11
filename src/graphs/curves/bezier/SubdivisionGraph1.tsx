import {t} from "../../../localization";
import React from 'react';

import {GraphPalette} from "../../styles/GraphPalette";
import {Button} from "react-bootstrap";
import {BaseGraphStates} from '../../base/BaseCurveGraph';
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import Slider from "../../../inputs/Slider";
import {CurveStyles} from "../../styles/CurveStyles";
import {Attributes} from "../../attributes/Attributes";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonAction, LessonSceneCheckpoint} from "../../../learning/model";

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    showDecasteljau?: boolean
}

class SubdivisionGraph1 extends BaseBezierCurveGraph<any, DecasteljauGraphStates> {

    override getInitialState(): DecasteljauGraphStates {
        return {...super.getInitialState(), t: 0.5, v: 1};
    }

    override componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<DecasteljauGraphStates>, snapshot?: any) {
        this.pendingT = undefined;
        if (prevState === this.state && prevProps === this.props) { return; }
        this.board.suspendUpdate();
        this.getFirstJxgCurve().setDecasteljauT(this.state.t);
        this.unsuspendBoardUpdate();
    }

    /**
     * setState is asynchronous, but one lesson scene may apply 'subdivision-parameter' and 'subdivide' in the same
     * tick. The value written in this tick is kept here until the next render commits it into state.
     */
    private pendingT?: number;

    private currentT(): number {
        return this.pendingT ?? this.state.t;
    }

    private setT(value: number, extra?: Partial<DecasteljauGraphStates>) {
        this.pendingT = value;
        this.setState({...extra, t: value} as DecasteljauGraphStates);
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
            ], {...CurveStyles.default, strokeColor: GraphPalette.constructionAccent, highlightStrokeColor: GraphPalette.constructionAccent}
        ) as JXG.Curve;
    }

    protected override prepareLessonDefaultScene(): void {
        super.prepareLessonDefaultScene();
        this.pendingT = this.lessonDefaultState().t;
    }

    protected override restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        super.restoreLessonState(checkpoint);
        const t = (checkpoint.value as any)?.graphState?.t;
        if (typeof t === 'number') { this.pendingT = t; }
    }

    protected override lessonDefaultState(): DecasteljauGraphStates {
        return {...super.lessonDefaultState(), t: 0.5, v: 1, showDecasteljau: true};
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'subdivision-parameter') {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.01 || value > 0.99) {
                throw new Error('The subdivision parameter t must be a number from 0.01 to 0.99.');
            }
            this.setT(value);
            return;
        }
        if (action.kind === 'subdivide') {
            const t = this.currentT();
            if (!this.getFirstJxgCurve() || !(t >= 0.01 && t <= 0.99)) {
                throw new Error('Set the subdivision parameter t between 0.01 and 0.99 before subdividing.');
            }
            this.subdivide();
            return;
        }
        super.applyLessonAction(action);
        if (action.kind === 'curve-visibility' && action.target === 'decasteljau-scheme') {
            this.setState({showDecasteljau: action.visible});
        }
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([<OnOffSwitch
            key={this.state.showDecasteljau + ""}
            initialState={this.getFirstJxgCurve().isShowingDecasteljauScheme() || this.state.showDecasteljau}
            onChange={checked => {
                this.getFirstJxgCurve().showCurrentDecasteljauScheme(checked);
                this.setState({...this.state, showDecasteljau: checked});
                this.boardUpdate();
            }}
            label={t("show_scheme")}></OnOffSwitch>,
            <Slider customText={'t = ' + this.state.t.toFixed(2)} min={0.01} max={0.99}
                    fixedValue={this.state.t}
                    onChange={(t) => this.setT(t, this.state)}></Slider>,
            <Button onClick={() => this.subdivide()}>{t("subdivide")}</Button>]) : [];
    }

    private subdivide() {
        this.getFirstJxgCurve().setSubdivisionT(this.currentT());
        const newcurve = this.getFirstJxgCurve().subdivide();
        this.getFirstJxgCurve().showCurrentDecasteljauScheme(false);
        newcurve.getJxgCurve().setAttribute({strokeColor: GraphPalette.constructionAccent, highlightStrokeColor: GraphPalette.constructionAccent});
        this.boardUpdate();
        this.setT(1, {...this.state, showDecasteljau: false});
    }
}

export default SubdivisionGraph1;
