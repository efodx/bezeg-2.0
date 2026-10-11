import {t} from "../../localization";
import React from "react";
import {PolynomialBezierCurve} from "../../bezeg/impl/curve/polynomial-bezier-curve";
import {PointImpl} from "../../bezeg/impl/point/point-impl";
import BaseGraph from "../base/BaseGraph";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {SizeContext} from "../context/SizeContext";
import {GraphPalette, basisCurveColor, basisCurveDash} from "../styles/GraphPalette";
import {CountSetter} from "../../inputs/CountSetter";
import {LessonAction} from "../../learning/model";

export const BERNSTEIN_MAX_DEGREE = 5;

function connectCurves(c1: [x1: (t: number) => number, y1: (t: number) => number], c2: [x2: (t: number) => number, y2: (t: number) => number]) {
    const x = (t: number) => {
        if (t < 1 / 2) {
            const c = t * 2;
            return c1[0](c);
        } else {
            const c = t * 2 - 1;
            return c2[0](c);
        }
    };
    const y = (t: number) => {
        if (t < 1 / 2) {
            const c = t * 2;
            return c1[1](c);
        } else {
            const c = t * 2 - 1;
            return c2[1](c);
        }
    };
    return [x, y];
}


export class BernsteinGraph extends BaseGraph<any, any> {
    override readonly state = {n: 2, isSumGraph: false, showLabels: false};
    private jxgObjects: any = [];
    private padding = 0.1;
    /** The (n, isSumGraph) pair the board objects were last generated for; null when nothing is generated. */
    private generatedFor: {n: number, isSumGraph: boolean} | null = null;

    override componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<any>, snapshot?: any) {
        if (!this.board || !this.graphSession?.isAlive) { return; }
        const {n, isSumGraph} = this.state;
        if (this.generatedFor?.n === n && this.generatedFor.isSumGraph === isSumGraph) { return; }
        this.generateBernsteinPolynomials(this.board, n, isSumGraph);
    }

    protected override lessonDefaultState(): any {
        return {n: 2, isSumGraph: false, showLabels: false};
    }

    protected override prepareLessonDefaultScene(): void {
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        // The Bernstein default preset is empty, so the scene is fully described by the graph state.
        const state = this.lessonDefaultState();
        this.setState(state);
        this.generateBernsteinPolynomials(this.board, state.n, state.isSumGraph);
        this.boardUpdate();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'bernstein-degree') {
            const degree = action.degree;
            if (!Number.isInteger(degree) || degree < 0 || degree > BERNSTEIN_MAX_DEGREE) {
                throw new Error(`The Bernstein degree must be an integer from 0 to ${BERNSTEIN_MAX_DEGREE}.`);
            }
            this.setState({n: degree + 1});
            this.generateBernsteinPolynomials(this.board, degree + 1, this.generatedFor?.isSumGraph ?? this.state.isSumGraph);
            return;
        }
        if (action.kind === 'bernstein-stacked-area') {
            this.setState({isSumGraph: action.visible});
            this.generateBernsteinPolynomials(this.board, this.generatedFor?.n ?? this.state.n, action.visible);
            return;
        }
        super.applyLessonAction(action);
    }

    private removeGeneratedObjects(): void {
        const objects = [...new Set<any>(this.jxgObjects)]
            .filter(object => object?.board === this.board && this.board.objectsList.includes(object))
            .reverse();
        if (objects.length) this.board.removeObject(objects);
        this.jxgObjects = [];
    }

    override presets() {
        return "bernstein-graph";
    }

    protected override disposeFigureScene(): void {
        if (this.graphSession?.isAlive) this.removeGeneratedObjects();
        this.jxgObjects = [];
        this.generatedFor = null;
    }

    initialize(): void {
        this.generateBernsteinPolynomials(this.board, this.state.n, this.state.isSumGraph);
        this.board.setBoundingBox([-this.padding, 1 + this.padding * 2, 1 + this.padding, -this.padding], true);
        this.board.fullUpdate();
    }

    setN(number: number) {
        if (this.state.n === number) {
            return;
        }
        this.setState({n: number});
        this.generateBernsteinPolynomials(this.board, number, this.state.isSumGraph);
    }

    generateBernsteinPolynomials(board: JXG.Board, n: number, isSumGraph: boolean) {
        this.removeGeneratedObjects();
        this.generatedFor = {n, isSumGraph};
        const numOfPolynoms = n;
        const polynoms: Array<(t: number) => number> = [];
        const jxgObjects = [];
        const curves: Array<JXG.Curve> = [];

        for (let i = 0; i < numOfPolynoms; i++) {
            const points = Array(numOfPolynoms - 1).fill([0, 0]);
            points.splice(i, 0, [1, 0]);
            const anchor = [(0.6 - numOfPolynoms * 0.10) + 0.20 * i, 1.05];
            const bezierCurve = new PolynomialBezierCurve(points.map(point => new PointImpl(point[0], point[1])));
            if (isSumGraph && i > 0) {
                polynoms.push((t: number) => polynoms[i - 1](t) + bezierCurve.eval(t).X());
                board.update();
            } else {
                polynoms.push((t: number) => bezierCurve.eval(t).X());
            }
            if (isSumGraph) {
                if (i === 0) {
                    let c1 = [(t: number) => t, (t: number) => polynoms[i](t), 0, 1];
                    let c2 = [(t: number) => 0, (t: number) => 1 - t, 0, 1];
                    let c3 = [(t: number) => t, (t: number) => 0, 0, 1];

                    // @ts-ignore
                    let c = connectCurves(connectCurves(c2, c3), c1);
                    if (n === 1) {
                        let c4 = [(t: number) => 1, (t: number) => 1 - t, 0, 1];
                        // @ts-ignore
                        c = connectCurves(c, c4);
                    }
                    let curve = board.create("curve", [(t: number) => c[0](t), (t: number) => c[1](t), 0, 1], {
                        strokeWidth: 0,
                        strokeColor: basisCurveColor(i),
                        fillColor: basisCurveColor(i),
                        fillOpacity: 0.42
                    });
                    curves.push(curve);
                } else if (i === numOfPolynoms - 1) {
                    let prevPolynom = polynoms[i - 1];
                    let c1 = [(t: number) => t, (t: number) => prevPolynom(t), 0, 1];
                    let c2 = [(t: number) => 1, (t: number) => t, 0, 1];
                    let c3 = [(t: number) => 1 - t, (t: number) => 1, 0, 1];

                    // @ts-ignore
                    let c = connectCurves(connectCurves(c2, c3), c1);
                    let curve = board.create("curve", [(t: number) => c[0](t), (t: number) => c[1](t), 0, 1], {
                        strokeWidth: 0,
                        strokeColor: basisCurveColor(i),
                        fillColor: basisCurveColor(i),
                        fillOpacity: 0.42
                    });
                    curves.push(curve);
                } else {
                    let prevPolynom = polynoms[i - 1];
                    let c1 = [(t: number) => t, (t: number) => prevPolynom(t)];
                    let c2 = [(t: number) => t, (t: number) => polynoms[i](t)];
                    // @ts-ignore
                    let c = connectCurves(c1, c2);
                    let curve = board.create("curve", [(t: number) => c[0](t), (t: number) => c[1](t), 0, 1], {
                        strokeWidth: 0,
                        strokeColor: basisCurveColor(i),
                        fillColor: basisCurveColor(i),
                        fillOpacity: 0.42
                    });
                    curves.push(curve);
                }

            } else {
                let curve = board.create("curve", [(t: number) => t, (t: number) => polynoms[i](t), 0, 1], {
                    strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.82),
                    strokeColor: basisCurveColor(i),
                    dash: basisCurveDash(i)
                });
                jxgObjects.push(curve);
                // let segment = board.create('segment', [[anchor[0], anchor[1]], [anchor[0] + 0.1, anchor[1]]], {
                //     strokeWidth: () => Contexts.strokeWidth,
                //     useMathJax: true,
                //     parse: false,
                //     color: basisCurveColor(i),
                //     fixed: true
                // })
                // jxgObjects.push(segment)

            }
            let text = board.create('text', [anchor[0] - 0.06, anchor[1], () => "$$B^{" + (n - 1) + "}_{" + i + "}(t)$$"], {
                useMathJax: true,
                color: GraphPalette.label,
                fontSize: () => SizeContext.fontSize - 5,
                visible: () => this.state.showLabels
            });
            jxgObjects.push(text);
        }
        this.jxgObjects.push(...curves, ...jxgObjects);

    }

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat(<CountSetter min={0} max={5} onPlus={() => this.setN(this.state.n + 1)}
                                                            onCenter={() => 1} n={this.state.n - 1}
                                                            onMinus={() => this.setN(this.state.n - 1)}/>,
            <OnOffSwitch initialState={this.state.isSumGraph} onChange={checked => this.setIsSumGraph(checked)}
                         label={t("stacked_area_chart")}/>);
    }

    defaultPreset(): string {
        return "[]";
    }

    private setIsSumGraph(checked: boolean) {
        this.setState({isSumGraph: checked});
        this.generateBernsteinPolynomials(this.board, this.state.n, checked);
    }
}
