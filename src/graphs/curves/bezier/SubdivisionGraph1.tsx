import {message, t} from "../../../localization";
import React from 'react';

import {GraphPalette} from "../../styles/GraphPalette";
import {CurveOperation} from "../../base/controls/BezierCurveControls";
import {usePuckOwns} from "../../base/controls/PuckOwnership";
import {BaseGraphStates, type BaseCurveIds} from '../../base/BaseCurveGraph';
import type {GraphDeclaration, LegendEntry, ViewMarks} from "../../base/declare/graphDeclaration";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {runAs} from "../../base/writes/writeSource";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";

import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";
import {subdivisionPresetCollection} from "./collections";

/** The subdivision parameter t stays strictly inside (0, 1) so both pieces are real curves. The lesson action, the slider and subdivide all use these. */
export const SUBDIVISION_T_MIN = 0.01;
export const SUBDIVISION_T_MAX = 0.99;

interface DecasteljauGraphStates extends BaseGraphStates {
    t: number,
    v: number,
    showDecasteljau?: boolean
}

/** The ids of the subdivision declaration: the common curve ids plus the cut parameter, the orange remainder, the scheme and its switch. */
export type SubdivisionIds = Omit<BaseCurveIds, "param" | "action" | "legend"> & {
    param: "subdivision-t";
    action: BaseCurveIds["action"] | "decasteljau-scheme";
    legend: BaseCurveIds["legend"] | "rest" | "scheme";
};

/** The subdivision operation of the Construction card: its t slider is left out once the board's cut-parameter puck owns it. */
function SubdivisionOperation(props: React.ComponentProps<typeof CurveOperation>) {
    return <CurveOperation {...props} parameter={usePuckOwns("subdivision-t") ? null : props.parameter}/>;
}

class SubdivisionGraph1 extends BaseBezierCurveGraph<DecasteljauGraphStates> {
    /**
     * Task 08 (lane L41): the board workspace (legend, view marks, cut-parameter puck, scheme switch). A hook, because
     * `RationalSubdivisionGraph2` shares this class and is converted in its own session; it answers false until then.
     */
    protected declaresSubdivisionWorkspace(): boolean { return true; }
    protected override declaresCurveWorkspace(): boolean { return this.declaresSubdivisionWorkspace(); }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "subdivision-t": {
                read: () => this.state.t,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !Number.isFinite(value) || value < SUBDIVISION_T_MIN || value > SUBDIVISION_T_MAX) throw new DomainError(message("subdivision_t_refused"));
                    this.setT(value);
                },
            },
        };
    }

    protected override declaration(): GraphDeclaration<SubdivisionIds> | undefined {
        if (!this.declaresSubdivisionWorkspace()) return undefined;
        const common = this.commonCurveDeclaration();
        const legend: LegendEntry<SubdivisionIds>[] = [...(common.legend ?? []),
            {id: "rest", label: message("decasteljau_legend_rest"), kind: "line", object: "rest"},
            {id: "scheme", label: message("decasteljau_legend_scheme"), kind: "point", object: "scheme"}];
        return {...common, legend, followView: this.watchedBox(common.marks),
            parameters: [{key: "subdivision-t", kind: "range", label: message("subdivision_t_name"), symbol: "t", placement: "board", min: SUBDIVISION_T_MIN, max: SUBDIVISION_T_MAX, step: 0.01, maxDecimals: 2}],
            actions: [...(common.actions ?? []), {id: "decasteljau-scheme", label: message("show_scheme"), placement: "tools", section: "display", enabled: true, pressed: this.schemeShown()}]};
    }

    /**
     * The box the view frames: the control points and curve samples with a fifth of room around and double room above for the
     * point tags. Without it the lesson scene's wide box is widened to the canvas and the curve is a speck in the card-free strip.
     */
    private watchedBox(marks: ViewMarks | undefined): [number, number, number, number] | undefined {
        const points = [...(marks?.must ?? []), ...(marks?.nice ?? [])].flatMap(mark => mark.kind === "point" ? [[mark.x, mark.y]] : mark.kind === "polyline" ? mark.points.map(p => [p[0], p[1]]) : []);
        if (points.length === 0) return undefined;
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.5);
        return [left - pad, top + 2 * pad, right + pad, bottom - pad];
    }

    private schemeShown(): boolean {
        return !!this.getFirstJxgCurve()?.isShowingDecasteljauScheme() || !!this.state.showDecasteljau;
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== "rest" && id !== "scheme") return super.drawnObject(id);
        const curve = this.getFirstJxgCurve();
        if (!curve) return undefined;
        const element: JXG.GeometryElement | undefined = id === "rest" ? this.remainderCurve : curve.getJXGDecasteljauPoints()[0];
        if (!element) return id === "rest" ? {color: GraphPalette.constructionAccent, visible: false} : undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        // The remainder always exists; it is empty once t is 1 (after a cut), so it is shown only while it has an arc.
        return {color: String(drawn.evalVisProp(id === "rest" ? "strokecolor" : "fillcolor")), visible: Boolean(drawn.evalVisProp("visible")) && (id !== "rest" || this.state.t < 1)};
    }

    override performAction(id: string): void {
        if (id !== "decasteljau-scheme") { super.performAction(id); return; }
        runAs("learner", () => this.setScheme(!this.schemeShown()));
    }

    private setScheme(checked: boolean) {
        this.getFirstJxgCurve().showCurrentDecasteljauScheme(checked);
        this.setState({showDecasteljau: checked});
        this.boardUpdate();
    }

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
            <OnOffSwitch checked={this.schemeShown()} onChange={checked => this.setScheme(checked)}
                label={t("show_scheme")}/></div></>;
    }

    override getGraphCommands(): JSX.Element[] {
        return this.state.initialized ? super.getGraphCommands().concat([
            <SubdivisionOperation key="subdivision" curve={this.getFirstJxgCurve()} tool="subdivision" permanentPreview
                            parameter={{value: this.state.t, min: SUBDIVISION_T_MIN, max: SUBDIVISION_T_MAX, onChange: value => this.setT(value, this.state)}}
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
