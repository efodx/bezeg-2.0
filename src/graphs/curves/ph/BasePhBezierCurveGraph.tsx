import {t} from "../../../localization";
import {HodographInputbox} from "./HodographInputBox";
import {JXGPointWrapper} from "../object/JXGPointWrapper";
import React from "react";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {JXGPHBezierCurve} from "../object/JXGPHBezierCurve";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {CountSetter} from "../../../inputs/CountSetter";
import {SizeContext} from "../../context/SizeContext";
import {PointAttributes} from "jsxgraph";
import {PhBezierCurveCommands} from "../object/inputs/PhBezierCurveCommands";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {PointCoordinateEditor} from "../../base/PointCoordinateEditor";
import {LessonAction} from '../../../learning/model';

export interface BasePhBezierCurveGraphStates extends BaseGraphStates {
    showOffsetCurve: boolean,
    showOffsetCurveControlPoints: boolean
}

abstract class BasePhBezierCurveGraph<P, S extends BasePhBezierCurveGraphStates> extends BaseBezierCurveGraph<P, S> {

    private hodographBoard!: JXG.Board;

    protected override workspaceUsesStructuredEditing() { return true; }
    protected override workspacePointEditing() { return false; }
    protected override workspaceDescription() { return t("explore_the_hodograph_offsets_and_their_geometry"); }
    protected override workspaceEdit(): React.ReactNode {
        const parentBoard = this.board;
        return <>{super.workspaceEdit()}{this.getSelectedCurve() && <div className="inspector-group">
            <h3>{t("hodograph")}</h3><p>{t("drag_points_w0_and_w1_to_change_the_shape_of_the_ph_curve")}</p>
            <HodographInputbox setRef={board => {
                this.setHodographBoard(board);
                this.initializeHodographs(this.getFirstCurveAsPHBezierCurve().w.map(p => [p.X(), p.Y()]));
            }} onDispose={() => {
                const curve = this.getFirstCurveAsPHBezierCurve();
                curve.w = curve.w.map(point => new PointImpl(point.X(), point.Y()));
                if (this.hodographBoard) { parentBoard.removeChild(this.hodographBoard); }
                this.hodographBoard = undefined as unknown as JXG.Board;
            }}/><PointCoordinateEditor prefix="w" points={() => this.getFirstCurveAsPHBezierCurve().w}
                board={this.board} observeBoard={() => this.hodographBoard} onChange={() => this.boardUpdate()}/></div>}</>;
    }
    protected override workspaceDisplay(): React.ReactNode {
        return <>{super.workspaceDisplay()}<div className="inspector-group"><h3>{t("curve_offsets")}</h3>
            {PhBezierCurveCommands(this.getFirstJxgCurveAsPHCurve())}</div></>;
    }

    override getInitialState(): S {
        return {
            ...super.getInitialState(),
            showOffsetCurve: false,
            showOffsetCurveControlPoints: false
        };
    }

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) {
            return [];
        }
        const commands = [];
        commands.push(<OnOffSwitch
            initialState={this.getFirstJxgCurveAsPHCurve().isShowingOffsetCurve()}
            onChange={checked => {
                this.getFirstJxgCurveAsPHCurve().setShowOffsetCurve(checked);
                this.setState({...this.state, showOffsetCurve: checked});
            }}
            label={t("curve_offsets")}/>);

        if (this.getFirstJxgCurveAsPHCurve().isShowingOffsetCurve()) {
            commands.push(<Slider min={-3}
                                  max={3}
                                  initialValue={this.getFirstCurveAsPHBezierCurve()?.getOffsetCurveDistance() ? this.getFirstCurveAsPHBezierCurve()?.getOffsetCurveDistance() : 0}
                                  step={0.01}
                                  onChange={e => this.setOffsetCurveDistance(e)}/>);
            commands.push(<OnOffSwitch
                onChange={checked => {
                    this.getFirstJxgCurveAsPHCurve().setShowOffsetCurveControlPoints(checked);
                    this.setState({...this.state, showOffsetCurveControlPoints: checked});
                }}
                label={t("offset_curve_control_points")}
                initialState={this.state.showOffsetCurveControlPoints}/>);
            commands.push(<div>
                <div>{t("number_of_offsets")}</div>
                <CountSetter onPlus={() => {
                    this.getFirstJxgCurveAsPHCurve().addOffsetCurve();
                }} onCenter={() => 1} n={this.getFirstJxgCurveAsPHCurve().getNumberOfOffsetCurves()}
                             onMinus={() => {
                                 this.getFirstJxgCurveAsPHCurve().removeOffsetCurve();
                             }}
                             min={1}
                ></CountSetter></div>);
        }
        return super.getGraphCommands().concat(commands);
    }

    override getSelectedCurveCommands(): JSX.Element[] {
        const parentBoard = this.board;
        return super.getSelectedCurveCommands().concat(<HodographInputbox
            setRef={board => {
                this.setHodographBoard(board);
                this.initializeHodographs(this.getFirstCurveAsPHBezierCurve().w.map(p => [p.X(), p.Y()]));
            }} onDispose={() => {
                const curve = this.getFirstCurveAsPHBezierCurve();
                curve.w = curve.w.map(point => new PointImpl(point.X(), point.Y()));
                if (this.hodographBoard) {parentBoard.removeChild(this.hodographBoard);}
                this.hodographBoard = undefined as unknown as JXG.Board;
            }}/>);
    }

    getFirstCurveAsPHBezierCurve() {
        return this.getFirstCurve() as PhBezierCurve;
    }

    override getFirstJxgCurve(): JXGBezierCurve {
        return super.getFirstJxgCurve() as JXGBezierCurve;
    }

    getFirstJxgCurveAsPHCurve(): JXGPHBezierCurve {
        return super.getFirstJxgCurve() as JXGPHBezierCurve;
    }

    override getSelect() {
        // TODO curve selection should be refactored
        return <div></div>;
    }

    private initializeHodographs(hodographs: number[][]) {
        const jxgGraphPoints = hodographs.map(((w, i) => this.hodographBoard.create('point', [w[0], w[1]], {
            label: {
                fontSize: () => Math.max(20, 0.5 * SizeContext.fontSize),
                useMathJax: true,
                parse: false
            },
            size: () => Math.max(4, 0.5 * SizeContext.pointSize),
            name: "$$w_{" + i + "}$$"
        } as unknown as PointAttributes)));
        const hodographPoints = jxgGraphPoints.map(point => new JXGPointWrapper(point));

        jxgGraphPoints.forEach(point => point.on("drag", () => {
            this.boardUpdate();
        }));
        this.board.addChild(this.hodographBoard);
        this.getFirstCurveAsPHBezierCurve().w = hodographPoints;
    }

    private setOffsetCurveDistance(e: number) {
        this.board.suspendUpdate();
        this.getFirstCurveAsPHBezierCurve().setOffsetCurveDistance(e);
        this.unsuspendBoardUpdate();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'curve-visibility' && action.target === 'offset-curve') {
            this.getFirstJxgCurveAsPHCurve().setShowOffsetCurve(action.visible);
            this.setState({...this.state, showOffsetCurve: action.visible});
            this.boardUpdate();
            return;
        }
        if (action.kind === 'parameter' && action.name === 'offset-distance') {
            if (!Number.isFinite(action.value) || action.value < -3 || action.value > 3) {
                throw new Error('The PH offset distance must be between -3 and 3.');
            }
            this.setOffsetCurveDistance(action.value);
            return;
        }
        super.applyLessonAction(action);
    }

    private setHodographBoard(board: JXG.Board) {
        if (this.hodographBoard) {
            this.board.removeChild(this.hodographBoard);
        }
        this.hodographBoard = board;
    }

    private scale(number: number) {
        this.board.suspendUpdate();
        this.getSelectedCurve().getCurve().scale(number, number);
        this.unsuspendBoardUpdate();
    }
}

export default BasePhBezierCurveGraph;
