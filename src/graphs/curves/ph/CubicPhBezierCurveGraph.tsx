import {LabelOptions} from "jsxgraph";
import {t} from "../../../localization";
import BasePhBezierCurveGraph, {BasePhBezierCurveGraphStates} from "./BasePhBezierCurveGraph";
import {GraphPalette} from "../../styles/GraphPalette";
import {dynamicAttributes} from "../../styles/dynamicAttributes";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

interface CubicPhBezierCurveGraphStates extends BasePhBezierCurveGraphStates {
    showingCurve: boolean
}

class CubicPhBezierCurveGraph extends BasePhBezierCurveGraph<CubicPhBezierCurveGraphStates> {
    protected override workspaceDescription() { return t("explore_the_hodograph_offsets_and_control_polygon_geometry"); }
    protected override workspaceGraphDisplay() {
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("ph_curve_geometry")}</h3>
            <OnOffSwitch checked={!this.state.showingCurve} onChange={checked => this.showControlyPolygonGeometry(checked)}
                label={t("control_polygon_geometry")}/></div></>;
    }
    protected override onStateChange(prevState: Readonly<CubicPhBezierCurveGraphStates>) {
        if (prevState === this.state) { return; }
        this.boardUpdate();
    }

    override getInitialState(): CubicPhBezierCurveGraphStates {
        return {...super.getInitialState(), showingCurve: true};
    }

    override initialize() {
        super.initialize();
        this.getFirstJxgCurve().getJxgCurve().setAttribute({visible: () => this.state.showingCurve});
        const points = this.getAllJxgPoints();

        const label = dynamicAttributes<LabelOptions>({...this.styles.point.default.label, visible: () => false});
        let attr = {
            radius: () => this.displaySettings.strokeWidth / 8,
            color: GraphPalette.constructionAccent,
            label: label,
            name: "$$\\theta_1$$",
            visible: () => !this.state.showingCurve
        };

        this.board.create('angle', [points[0], points[1], points[2]], attr);
        this.board.create('angle', [points[1], points[2], points[3]], attr);
        this.createLLabel(points, 0);
        this.createLLabel(points, 1);
        this.createLLabel(points, 2);
        this.board.create('segment', [points[0], points[2]], {
            ...this.styles.segment.controlPolygon,
            visible: () => !this.state.showingCurve
        });
        this.board.create('segment', [points[1], points[3]], {
            ...this.styles.segment.controlPolygon,
            visible: () => !this.state.showingCurve
        });

        this.board.create('polygon', [points[1], points[2], points[3]], {
            ...this.styles.segment.controlPolygon,
            visible: () => !this.state.showingCurve
        });
        this.board.create('polygon', [points[0], points[1], points[2]], {
            ...this.styles.segment.controlPolygon,
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

    private createLLabel(points: JXG.Point[], i: number) {
        let textattr = {
            useMathJax: true,
            fontSize: () => this.displaySettings.fontSize,
            visible: () => !this.state.showingCurve
        };

        this.board.create('text',
            [() => {
                var dx = (points[i].X() - points[i + 1].X());
                var dy = (points[i].Y() - points[i + 1].Y());
                var spd = Math.sqrt(dx ** 2 + dy ** 2);
                spd = spd * 1.8;//popravek
                dy = dy / spd;
                dy = dy * this.displaySettings.fontSize * 0.022;
                if (dx < 0) {
                    dy -= this.displaySettings.fontSize * 0.01;
                }
                //dy += dy / Math.abs(dy) * this.displaySettings.fontSize * 0.01;
                return (points[i].X() + points[i + 1].X()) / 2 + dy;
            }, () => {
                var dx = (points[i].X() - points[i + 1].X());
                var dy = (points[i].Y() - points[i + 1].Y());
                var spd = Math.sqrt(dx ** 2 + dy ** 2);
                spd = spd * 1.8;//popravek
                dx = dx / spd;
                dx = dx * this.displaySettings.fontSize * 0.022;
                //dx += dx / Math.abs(dx) * this.displaySettings.fontSize * 0.01;
                return (points[i].Y() + points[i + 1].Y()) / 2 - dx;
            },
                () => "$$L_" + (i + 1) + "$$"
            ],
            textattr
        );
    }

    private showControlyPolygonGeometry(checked: boolean) {
        this.setState({showingCurve: !checked});
        this.getFirstJxgCurve().showControllPolygon(checked);
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'ph-control-polygon', action => {
            this.showControlyPolygonGeometry(action.visible);
            this.boardUpdate();
        });
    }
}

export default CubicPhBezierCurveGraph;
