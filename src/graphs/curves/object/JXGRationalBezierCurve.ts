/**
 * Class that wraps a BezierCurve with methods for dealing with JSXGraph
 */
import {Board} from "jsxgraph";
import {AbstractJXGBezierCurve, BezierCurveAttributes} from "./AbstractJXGBezierCurve";
import {RationalBezierCurveCommands} from "./inputs/RationalBezierCurveCommands";
import {JXGBezierCurveState} from "./JXGBezierCurve";
import {RationalBezierCurve} from "../../../bezeg/impl/curve/rational-bezier-curve";
import {PointStyles} from "../../styles/PointStyles";
import {SizeContext} from "../../context/SizeContext";
import {geometryCache} from "../../../bezeg/cache/GeometryCache";

interface JSXRationalBezierCurveConstructorParams {
    points: number[][],
    weights: number[],
    state: JSXRationalBezierCurveState
}

interface JSXRationalBezierCurveState extends JXGBezierCurveState {
    weightNumber: number
    showingWeights: boolean
    showingFarinPoints: boolean
}

export class JXGRationalBezierCurve extends AbstractJXGBezierCurve<RationalBezierCurve, BezierCurveAttributes> {
    weightNumber: number = 1;
    private weightLabels: JXG.GeometryElement[] = [];
    private showingWeights: boolean = false;
    private sliders: JXG.Slider[] = [];
    private showingFarinPoints: boolean = false;

    constructor(points: number[][], weights: number[], board: Board) {
        super(points, board);
        this.pointControlledCurve.setWeights(weights);
    }

    static toDto(curve: JXGRationalBezierCurve): JSXRationalBezierCurveConstructorParams {
        return {
            points: curve.pointControlledCurve.getPoints().map(point => [point.X(), point.Y()]),
            weights: curve.pointControlledCurve.getWeights(),
            state: curve.exportState()
        };
    }

    static fromDto(params: JSXRationalBezierCurveConstructorParams, board: Board): JXGRationalBezierCurve {
        const curve = new JXGRationalBezierCurve(params.points, params.weights, board);
        if (params.state) {
            curve.importState(params.state);
        }
        return curve;
    }

    override getDefaultAttributes(): BezierCurveAttributes {
        return {
            ...super.getDefaultAttributes(),
            allowSubdivision: true,
            allowShowControlPolygon: true,
            allowDecasteljau: true,
            allowElevation: true,
            allowExtrapolation: true,
            allowShowPoints: true,
            allowShrink: true
        };
    }

    override exportState(): JSXRationalBezierCurveState {
        return {
            ...super.exportState(),
            showingWeights: this.showingWeights,
            weightNumber: this.weightNumber,
            showingFarinPoints: this.showingFarinPoints
        } as JSXRationalBezierCurveState;
    }

    override importState(state: JSXRationalBezierCurveState) {
        super.importState(state);
        this.setSubdivisionT(state.subdivisionT);
        this.setExtrapolationT(state.extrapolationT);
        this.showwWeights(state.showingWeights);
        if (!state.showingDecasteljauScheme) {
            this.hideDecasteljauScheme();
        } else {
            this.showCurrentDecasteljauScheme(state.showingDecasteljauScheme);
        }
        this.weightNumber = state.weightNumber;
        this.showFarinPoints(state.showingFarinPoints);
    }

    override dispose(): void {
        if (this.weightLabels.length > 0) {
            this.board.removeObject(this.weightLabels);
        }
        if (this.sliders.length > 0) {
            this.board.removeObject(this.sliders);
        }
        this.weightLabels = [];
        this.sliders = [];
        this.showingWeights = false;
        this.showingFarinPoints = false;
        this.pointControlledCurve.setReactiveWeights(undefined);
        super.dispose();
    }

    override addPoint(x: number, y: number) {
        const weights = this.pointControlledCurve.getEffectiveWeights().slice();
        const showingFarinPoints = this.showingFarinPoints;
        if (showingFarinPoints) {
            this.showFarinPoints(false);
        }
        super.addPoint(x, y);
        weights.push(1);
        this.pointControlledCurve.setWeights(weights);
        if (showingFarinPoints) {
            this.showFarinPoints(true);
        }
        if (this.showingWeights) {
            this.hideWeights();
            this.showWeights();
        }
    }

    override removePoint(i: number) {
        const pointCount = this.pointControlledCurve.getPoints().length;
        if (pointCount <= 1 || i < 0 || i >= pointCount) return;
        const weights = this.pointControlledCurve.getEffectiveWeights().slice();
        const showingFarinPoints = this.showingFarinPoints;
        if (showingFarinPoints) {
            this.showFarinPoints(false);
        }
        super.removePoint(i);
        if (this.pointControlledCurve.getPoints().length !== pointCount - 1) {
            if (showingFarinPoints) this.showFarinPoints(true);
            return;
        }
        weights.splice(i, 1);
        this.pointControlledCurve.setWeights(weights);
        if (this.weightNumber > i) {
            this.weightNumber -= 1;
        } else if (this.weightNumber === i) {
            this.weightNumber = Math.min(i, weights.length - 1);
        }
        if (showingFarinPoints) {
            this.showFarinPoints(true);
        }
        if (this.showingWeights) {
            this.hideWeights();
            this.showWeights();
        }
        if (this.isSelected()) {
            this.getJxgPoints()[this.weightNumber].setAttribute({color: "yellow"});
        }
    }

    subdivide(t?: number): this {
        if (t === undefined) {
            t = this.subdivisionT;
        }
        const [curve1, curve2]: RationalBezierCurve[] = this.pointControlledCurve.subdivide(t);
        // Move this curve
        this.movePointsToNewPoints(curve1.getPoints());
        this.pointControlledCurve.setWeights(curve1.getWeights());

        // Create second curve
        let curve2pointArray = curve2.getPoints().map(point => [point.X(), point.Y()]);
        const newJsxCurve = new JXGRationalBezierCurve(curve2pointArray, curve2.getWeights(), this.board) as this;
        // The new piece inherits what the source shows, so both pieces stay comparable on screen.
        newJsxCurve.setAttributes(this.getAttributes());
        if (this.showingWeights) {
            newJsxCurve.showWeights();
        }
        if (this.subdivisionResultConsumer !== undefined) {
            this.subdivisionResultConsumer(newJsxCurve);
        }
        return newJsxCurve;
    }

    elevate() {
        const showingFarinPoints = this.showingFarinPoints;
        if (showingFarinPoints) {
            // Bake slider-driven weights into the curve and drop sliders sized for the old degree.
            this.showFarinPoints(false);
        }
        const elevated = this.pointControlledCurve.elevate();
        this.replaceEditablePoints(elevated.getPoints());
        this.pointControlledCurve.setWeights(elevated.getEffectiveWeights());
        if (showingFarinPoints) {
            this.showFarinPoints(true);
        }
        if (this.showingWeights) {
            this.hideWeights();
            this.showWeights();
        }
        if (this.isShowingControlPolygon()) {
            this.showControlPolygon();
        }
    }

    extrapolate(t: number) {
        const extrapolatedBezier: RationalBezierCurve = this.pointControlledCurve.extrapolate(t);
        this.pointControlledCurve.setWeights(extrapolatedBezier.getWeights());
        this.movePointsToNewPoints(extrapolatedBezier.getPoints());
    }

    showwWeights(show: boolean) {
        if (show) {
            this.showWeights();
        } else {
            this.hideWeights();
        }

    }

    showWeights() {
        if (this.weightLabels.length !== 0) {
            this.hideWeights();
        }
        // @ts-ignore
        this.weightLabels = this.getJxgPoints().map((point, i) =>
            // @ts-ignore
            this.board.create('smartlabel', [point, () => "$$w_{" + i + "}=" + this.getCurve().getWeights()[i].toFixed(2) + "$$"], {
                fontSize: () => SizeContext.fontSize,
                size: () => SizeContext.fontSize,
                cssClass: "smart-label-point2",
                highlightCssClass: "smart-label-point2",
                useMathJax: true,
                parse: false,
                anchorY: 'top',
                anchorX: 'middle',
                autoPosition: true
            }));
        this.showingWeights = true;
    }

    hideWeights() {
        this.board.removeObject(this.weightLabels);
        this.weightLabels = [];
        this.showingWeights = false;
    }

    isShowingWeights(): boolean {
        return this.showingWeights;
    }

    inStandardForm() {
        return this.getCurve().inStandardForm();
    }

    isShowingFarinPoints(): boolean {
        return this.showingFarinPoints;
    }

    showFarinPoints(show: boolean) {
        if (show === this.showingFarinPoints) return;
        if (show) {
            const weights = this.getCurve().getEffectiveWeights();
            const points = this.getJxgPoints();

            const reactiveWeights: Array<() => number> = [];
            reactiveWeights.push(() => 1);
            for (let i = 0; i < weights.length - 1; i++) {
                const startingRatio = weights[i + 1] / weights[i];
                const p0 = points[i];
                const p1 = points[i + 1];
                // The slider follows its control points. JSXGraph treats slider endpoints, baseline
                // and ticks as static (needsRegularUpdate: false), so re-enable their updates.
                // moveOnUp would jump the glider to a control point released on the baseline end.
                const slider: JXG.Slider = this.board.create('slider', [[() => p0.X(), () => p0.Y()], [() => p1.X(), () => p1.Y()], [0, startingRatio / (1 + startingRatio), 1]],
                    {
                        size: () => SizeContext.pointSize,
                        moveOnUp: false,
                        point1: {needsRegularUpdate: true},
                        point2: {needsRegularUpdate: true},
                        ticks: {needsRegularUpdate: true},
                        baseline: {
                            needsRegularUpdate: true,
                            strokeColor: '#0b9ef8',
                            strokeOpacity: 1,
                            strokeWidth: () => SizeContext.strokeWidth
                        },
                        highline: {
                            strokeColor: '#F8650B',
                            strokeOpacity: 1,
                            strokeWidth: () => SizeContext.strokeWidth
                        },
                        label: {fontSize: 0}
                    });
                this.sliders.push(slider);
                let over = (p: JXG.Slider) => {
                    // @ts-ignore
                    if (!p.visProp.fixed) {
                        this.board.containerObj.style.cursor = 'pointer';
                    }
                };
                let out = (p: JXG.Slider) => {
                    if (!p.visProp.fixed) {
                        this.board.containerObj.style.cursor = 'default';
                    }
                };

                slider.on('over', () => over(slider));
                slider.on('out', () => out(slider));
                slider.on('drag', (e) => {
                    geometryCache.invalidate();
                });
                const ratio = () => slider.Value() / (1 - slider.Value());
                const weight = () => reactiveWeights[i]() * ratio();
                reactiveWeights.push(weight);
            }
            this.pointControlledCurve.setReactiveWeights(reactiveWeights);
        } else {
            this.board.removeObject(this.sliders);
            this.sliders = [];
            this.pointControlledCurve.setWeights(this.pointControlledCurve.getEffectiveWeights().slice());
            this.pointControlledCurve.setReactiveWeights(undefined);
        }
        this.showingFarinPoints = show;
    }

    override getCurveCommands(): JSX.Element[] {
        return super.getCurveCommands().concat(...RationalBezierCurveCommands(this));
    }

    setStandardForm(standard: boolean) {
        this.pointControlledCurve.setStandardForm(standard);
        this.board.update();
    }

    override select() {
        super.select();
        this.getJxgPoints()[this.weightNumber].setAttribute({
            color: "yellow"
        });
    }

    override deselect() {
        this.getJxgPoints()[this.weightNumber].setAttribute({
            color: "#D55E00"
        });
        super.deselect();
    }

    nextWeight() {
        this.setSelectedWeight(this.weightNumber + 1);
    }

    prevWeight() {
        this.setSelectedWeight(this.weightNumber - 1);
    }

    setSelectedWeight(i: number) {
        this.getJxgPoints()[this.weightNumber].setAttribute({
            color: "#D55E00"
        });
        if (i > this.getCurve().getWeights().length - 1) {
            this.weightNumber = 0;
        } else if (i < 0) {
            this.weightNumber = this.getCurve().getWeights().length - 1;
        } else {
            this.weightNumber = i;
        }
        this.getJxgPoints()[this.weightNumber].setAttribute({
            color: "yellow  "
        });
        this.board.update();
    }

    changeWeight(dw: number) {
        this.setWeight(this.getCurve().getWeights()[this.weightNumber] + dw);
    }

    setWeight(w: number) {
        let newWeights = this.getCurve().getWeights().map(i => i);
        newWeights[this.weightNumber] = w;
        this.getCurve().setWeights(newWeights);
        this.board.update();
    }

    getWeightNumber() {
        return this.weightNumber;
    }

    getCurrentWeight() {
        return this.getCurve().getWeights()[this.getWeightNumber()];
    }

    resetWeight() {
        this.setWeight(1);
    }

    protected getInitialCurve(points: number[][]): RationalBezierCurve {
        const modelPoints = points.map((point, i) => this.createEditableInputPoint(point[0], point[1], PointStyles.pi(i, () => this.isShowingJxgPoints())));
        return new RationalBezierCurve(modelPoints, modelPoints.map(() => 1));
    }
}
