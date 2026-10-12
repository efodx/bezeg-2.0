import {LabelOptions} from "jsxgraph";
import {t} from "../../../localization";
import BasePhBezierCurveGraph, {BasePhBezierCurveGraphStates} from "./BasePhBezierCurveGraph";
import {GraphPalette} from "../../styles/GraphPalette";
import {PointStyles} from "../../styles/PointStyles";
import {dynamicAttributes} from "../../styles/dynamicAttributes";
import {SizeContext} from "../../context/SizeContext";
import {SegmentStyles} from "../../styles/SegmentStyles";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonAction} from '../../../learning/model';

interface CubicPhBezierCurveGraphStates extends BasePhBezierCurveGraphStates {
    showingCurve: boolean
}

class CubicPhBezierCurveGraph extends BasePhBezierCurveGraph<any, CubicPhBezierCurveGraphStates> {
    protected override workspaceDescription() { return t("explore_the_hodograph_offsets_and_control_polygon_geometry"); }
    protected override workspaceDisplay() {
        return <>{super.workspaceDisplay()}<div className="inspector-group"><h3>{t("ph_curve_geometry")}</h3>
            <OnOffSwitch initialState={!this.state.showingCurve} onChange={checked => this.showControlyPolygonGeometry(checked)}
                label={t("control_polygon_geometry")}/></div></>;
    }
    override componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<CubicPhBezierCurveGraphStates>, snapshot?: any) {
        if (prevState === this.state && prevProps === this.props) { return; }
        this.boardUpdate();
    }

    override getInitialState(): CubicPhBezierCurveGraphStates {
        return {...super.getInitialState(), showingCurve: true};
    }

    override initialize() {
        super.initialize();
        this.getFirstJxgCurve().getJxgCurve().setAttribute({visible: () => this.state.showingCurve});
        const points = this.getAllJxgPoints();

        const label = dynamicAttributes<LabelOptions>({...PointStyles.default.label, visible: () => false});
        let attr = {
            radius: () => SizeContext.strokeWidth / 8,
            color: GraphPalette.constructionAccent,
            label: label,
            name: "$$\\theta_1$$",
            visible: () => !this.state.showingCurve
        };

        const angle1 = this.board.create('angle', [points[0], points[1], points[2]], attr);
        const angle2 = this.board.create('angle', [points[1], points[2], points[3]], attr);
        let textattr = {
            useMathJax: true,
            fontSize: () => SizeContext.fontSize * 0.7,
            label: label,
            name: "$$\\theta_1$$",
            visible: () => !this.state.showingCurve
        };
        this.createLLabel(points, 0);
        this.createLLabel(points, 1);
        this.createLLabel(points, 2);
        const segment1 = this.board.create('segment', [points[0], points[2]], {
            ...SegmentStyles.controlPolygon,
            visible: () => !this.state.showingCurve
        });
        const segment2 = this.board.create('segment', [points[1], points[3]], {
            ...SegmentStyles.controlPolygon,
            visible: () => !this.state.showingCurve
        });

        const s = this.board.create('polygon', [points[1], points[2], points[3]], {
            ...SegmentStyles.controlPolygon,
            visible: () => !this.state.showingCurve
        });
        const s2 = this.board.create('polygon', [points[0], points[1], points[2]], {
            ...SegmentStyles.controlPolygon,
            visible: () => !this.state.showingCurve
        });
    }

    defaultPreset(): any {
        return [["JSXPHBezierCurve", {
            "points": [[-4.2, -2]], "hodographs": [[-3.5, -1.7], [-2.6, 1.7]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2,
                "showOffsetCurveControlPoints": false,
                "showOffsetCurve": false
            }
        }]];
    }

    override presets(): string | undefined {
        return "cubic-ph";
    }

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([<OnOffSwitch initialState={!this.state.showingCurve}
                                                             key={"polygon-geometry"}
                                                             onChange={(checked) => this.showControlyPolygonGeometry(checked)}
                                                             label={t("control_polygon_geometry")}></OnOffSwitch>]);
    }

    private createLLabel(points: JXG.Point[], i: number) {
        let textattr = {
            useMathJax: true,
            fontSize: () => SizeContext.fontSize,
            visible: () => !this.state.showingCurve
        };

        var text = this.board.create('text',
            [() => {
                var dx = (points[i].X() - points[i + 1].X());
                var dy = (points[i].Y() - points[i + 1].Y());
                var spd = Math.sqrt(dx ** 2 + dy ** 2);
                spd = spd * 1.8;//popravek
                dy = dy / spd;
                dy = dy * SizeContext.fontSize * 0.022;
                if (dx < 0) {
                    dy -= SizeContext.fontSize * 0.01;
                }
                //dy += dy / Math.abs(dy) * SizeContext.fontSize * 0.01;
                return (points[i].X() + points[i + 1].X()) / 2 + dy;
            }, () => {
                var dx = (points[i].X() - points[i + 1].X());
                var dy = (points[i].Y() - points[i + 1].Y());
                var spd = Math.sqrt(dx ** 2 + dy ** 2);
                spd = spd * 1.8;//popravek
                dx = dx / spd;
                dx = dx * SizeContext.fontSize * 0.022;
                //dx += dx / Math.abs(dx) * SizeContext.fontSize * 0.01;
                return (points[i].Y() + points[i + 1].Y()) / 2 - dx;
            },
                () => "$$L_" + (i + 1) + "$$"
            ],
            textattr
        );
    }

    private showControlyPolygonGeometry(checked: boolean) {
        this.setState({...this.state, showingCurve: !checked});
        this.getFirstJxgCurve().showControllPolygon(checked);
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'curve-visibility' && action.target === 'ph-control-polygon') {
            this.showControlyPolygonGeometry(action.visible);
            this.boardUpdate();
            return;
        }
        super.applyLessonAction(action);
    }
}

export default CubicPhBezierCurveGraph;
