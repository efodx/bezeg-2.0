import {currentLanguage, t} from "../../../localization";
import React from 'react';

import {GraphPalette} from "../../styles/GraphPalette";
import {CurveOperation} from "../../base/controls/BezierCurveControls";
import {BaseGraphStates} from '../../base/BaseCurveGraph';
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";

import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {subdivisionPresetCollection} from "./collections";
import {pickOn} from "../../../uxPicks/picks";
import type {GraphUx} from "../../../uxPicks/declare/graphUx";
import {formatNumber} from "../../../analysis/format";

/** The subdivision parameter t stays strictly inside (0, 1) so both pieces are real curves. The lesson action, the slider and subdivide all use these. */
export const SUBDIVISION_T_MIN = 0.01;
export const SUBDIVISION_T_MAX = 0.99;

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    showDecasteljau?: boolean
}

class SubdivisionGraph1 extends BaseBezierCurveGraph<DecasteljauGraphStates> {
    /** The split parameter and Subdivide lead Edit and stay while a curve is selected (graph-control first use). */
    protected override workspaceConstructionFirst() { return true; }
    /** Typed coordinates for the draggable control points (shared edit-only list). */
    protected override workspaceTypedPoints() { return true; }

    override getInitialState(): DecasteljauGraphStates {
        return {...super.getInitialState(), t: 0.5, v: 1};
    }

    protected override onStateChange(prevState: Readonly<DecasteljauGraphStates>) {
        if (prevState === this.state) { return; }
        this.board.suspendUpdate();
        this.getFirstJxgCurve().setDecasteljauT(this.state.t);
        this.unsuspendBoardUpdate();
    }

    /** The imported curve's scheme stands at its stored value; draw the restored parameter before the host commits. */
    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.getFirstJxgCurve()?.setDecasteljauT(this.state.t);
    }

    private setT(value: number, extra?: Partial<DecasteljauGraphStates>) {
        this.setState({...extra, t: value});
    }

    defaultPreset(): CurveCollectionPresetData {
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

    override presetCollection() {
        return subdivisionPresetCollection;
    }

    /** Orange remainder [t, 1] of the first curve; owned by this graph and rebuilt whenever the curve set is replaced. */
    private remainderCurve?: JXG.Curve;

    /** Every scene replacement imports its curves through here, so the scene is bound to the imported curves. */
    override importPresetData(data: CurveCollectionPresetData) {
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
        // Pieces inherit the disabled operations from the curve they were subdivided from.
        this.jxgCurves.forEach(piece => piece.setAttributes(Attributes.bezierDisabled));
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
            if (typeof value !== 'number' || !Number.isFinite(value) || value < SUBDIVISION_T_MIN || value > SUBDIVISION_T_MAX) {
                throw new Error(`The subdivision parameter t must be a number from ${SUBDIVISION_T_MIN} to ${SUBDIVISION_T_MAX}.`);
            }
            this.setT(value);
        });
        registry.on('subdivide', () => {
            const t = this.state.t;
            if (!this.getFirstJxgCurve() || !(t >= SUBDIVISION_T_MIN && t <= SUBDIVISION_T_MAX)) {
                throw new Error(`Set the subdivision parameter t between ${SUBDIVISION_T_MIN} and ${SUBDIVISION_T_MAX} before subdividing.`);
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

    /** The cards' declaration: the cut parameter, the point where the curve is cut, the number of pieces and what is drawn. */
    protected override workspaceUx(): GraphUx | undefined {
        if (!pickOn("boardText")) return undefined;
        if (!this.state.initialized || !this.getFirstJxgCurve()) return undefined;
        const language = currentLanguage();
        const number = (value: number) => formatNumber(value, language, 3);
        const separator = language === "sl" ? "; " : ", ";
        const pieces = this.jxgCurves.length;
        const cut = this.getFirstCurve().eval(pieces === 1 ? this.state.t : 1);
        const schemeShown = this.getFirstJxgCurve().isShowingDecasteljauScheme() || !!this.state.showDecasteljau;
        return {
            pucks: [{param: "subdivision.t", help: "Parameter t določa, kje krivuljo razrežemo: levi del je krivulja na [0, t], desni del pa na [t, 1]."}],
            readouts: [
                {id: "cut", title: "Rez", rows: [
                    ...(pieces === 1 ? [{id: "t", name: t("subdivision_parameter_t"), value: number(this.state.t)}] : []),
                    {id: "cut-point", name: "točka reza", symbol: "B(t)", value: `(${number(cut.X())}${separator}${number(cut.Y())})`},
                    {id: "pieces", name: "odsekov", value: String(pieces)},
                ]},
            ],
            notes: [{id: "pieces-are-bezier", text: "Oba dela sta spet Bézierjevi krivulji iste stopnje.", tone: "muted"}],
            legend: [
                {id: "left", label: "Levi del [0, t]", kind: "line", color: GraphPalette.comparisonCurve},
                ...(pieces === 1 && this.state.t >= 1 ? [] : [{id: "right", label: "Desni del [t, 1]", kind: "line" as const, color: GraphPalette.constructionAccent}]),
                ...(schemeShown ? [{id: "scheme", label: "Točke sheme", kind: "point" as const, color: GraphPalette.constructionAccent}] : []),
            ],
        };
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([
            <CurveOperation key="subdivision" curve={this.getFirstJxgCurve()} tool="subdivision" permanentPreview
                            parameter={{value: this.state.t, min: SUBDIVISION_T_MIN, max: SUBDIVISION_T_MAX, onChange: value => this.setT(value, this.state)}}
                            paramKey="subdivision.t"
                            onChanged={() => undefined} onApply={() => this.subdivide()}/>]) : [];
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
