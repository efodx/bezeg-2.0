import React from "react";
import BaseFunctionGraph, {COMPACT_BOARD_WIDTH, DomainError, LabelPlacement} from "../functions/BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "../functions/FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {LessonAction} from "../../learning/model";
import {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {GraphPalette} from "../styles/GraphPalette";
import {
    applySetExample, applySetMatrix, applySetMode, applySetTestVector, changeMode, DEFAULT_LINEAR_MAP_STATE, editMatrixEntry,
    LinearMapExampleChoice, LinearMapResult, LinearMapState, selectExample, serializeLinearMapState, snapEntryInput,
    validateSetExample, validateSetMatrix, validateSetMode, validateSetTestVector,
} from "../../linear/linearMapModel";
import {
    apply, det, IDENTITY, isLinearMapExampleId, MATRIX_ENTRY_STEP, type Mat2, orientationSign, unitSquareImage, type Vec2,
} from "../../linear/matrix2";
import {
    bezierPoint, closedPolyline, Collapse, collapseOf, FIXTURE_CONTROL_POINTS, gridPolyline, imageControlPoints, isLinearMapGraphMode, LINEAR_MAP_GRAPH_MODES, LinearMapGraphMode, openPolyline, PROBE_POINT, Polyline,
    shoelace, sourceGridPolyline,
} from "./linearMapScene";
import {linearMapPresetCollection} from "./linearMapPresetCollection";

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * The default view: the grid covers [-6, 6]^2, and the default example's image of the fixture curve reaches (11, 4). The units of the
 * two axes are equal (the default), so shears and rotations look like what they are.
 */
const BOARD_VIEW: BoundingBox = [-12, 9, 12, -9];

type Column = 0 | 1;
type Row = 0 | 1;
type StatusKind = "positive" | "negative" | "zero" | "collapse-line" | "collapse-point";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    matrix: Mat2;
    a1: Vec2;
    a2: Vec2;
    determinant: number;
    area: number;
    shoelaceArea: number;
    sign: -1 | 0 | 1;
    collapse: Collapse;
    square: readonly [Vec2, Vec2, Vec2, Vec2];
    probeImage: Vec2;
    imageControl: Vec2[];
    grid: Polyline;
}

/** What the last numeric entry did to the typed value; shown under the fields until the next exact edit. */
interface EntryNotice {
    row: Row;
    column: Column;
    kind: "clamped" | "snapped";
}

const EXAMPLE_IDS_OFFERED = ["identity", "basis-default", "orientation-reversing", "singular"] as const;
const SOURCE_GRID = sourceGridPolyline();

const sameMatrix = (a: Mat2, b: Mat2): boolean => a[0][0] === b[0][0] && a[0][1] === b[0][1] && a[1][0] === b[1][0] && a[1][1] === b[1][1];

/**
 * The linear map graph, basis and determinant modes (linear maps lessons L1 and L2). The model is `LinearMapState`
 * (`src/linear/linearMapModel`); the determinant, areas and images are recomputed from it with `src/linear/matrix2` and never stored.
 * Entries are multiples of 1/4 in [-4, 4] (exact in doubles). Dragging a handle, the four number fields, Reset, examples and lesson
 * actions all write the model through the kernel (`editMatrixEntry`, `selectExample`, `applySet*`), so every path snaps the same way.
 * Typed or dragged input is snapped or clamped with a message; a singular matrix is accepted and drawn collapsed (nothing divides by
 * the determinant, and no inverse is offered). The image of the fixture Bezier curve is drawn from the images of its control
 * points (the curve API's transforms are never called). The grid image is one polyline curve with NaN breaks (ADR 0032).
 * No route, catalog entry or Demonstration is registered here (task 06).
 */
export class LinearMapGraph extends BaseFunctionGraph<LinearMapState> {
    protected handle1?: JXG.Point;
    protected handle2?: JXG.Point;
    private notice?: EntryNotice;

    override presetCollection() {
        return linearMapPresetCollection;
    }

    protected defaultModel(): LinearMapState {
        return {...DEFAULT_LINEAR_MAP_STATE};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEW];
    }

    override exportPresetData(): LinearMapState {
        return serializeLinearMapState(this.model);
    }

    override importPresetData(data: LinearMapState): void {
        this.notice = undefined;
        super.importPresetData(data);
    }

    // ---- View ------------------------------------------------------------------------------------------------------

    private viewOf(model: LinearMapState): View {
        return this.memoView(model, () => {
            const m = model.matrix;
            const square = unitSquareImage(m);
            const determinant = det(m);
            return {
                matrix: m,
                a1: [m[0][0], m[1][0]] as Vec2,
                a2: [m[0][1], m[1][1]] as Vec2,
                determinant,
                area: Math.abs(determinant),
                shoelaceArea: shoelace(square),
                sign: orientationSign(m),
                collapse: collapseOf(m),
                square,
                probeImage: apply(m, PROBE_POINT),
                imageControl: imageControlPoints(m),
                grid: gridPolyline(m),
            };
        });
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    /** Writes one entry from typed input: snaps to 1/4, clamps to [-4, 4] and records the message. */
    protected setEntryFromInput(row: Row, column: Column, input: number): void {
        const edited = editMatrixEntry(this.model, "matrix", row, column, input);
        if (!edited.ok) throw new DomainError(edited.error.message);
        const {state, clamped, adjusted} = edited.value;
        this.notice = adjusted ? {row, column, kind: clamped ? "clamped" : "snapped"} : undefined;
        // An unchanged matrix keeps its example label; the commit still refreshes the notice.
        this.commitModel(sameMatrix(state.matrix, this.model.matrix) ? {...this.model} : state);
    }

    /** Both entries of one column in one commit (a drag moves both); each is snapped and clamped. */
    protected setColumn(column: Column, x: number, y: number, options: { syncScene?: boolean } = {}): void {
        const snapped = [snapEntryInput(x, "x"), snapEntryInput(y, "y")];
        if (!snapped[0].ok || !snapped[1].ok) throw new DomainError("The handle position must be finite.");
        const [sx, sy] = [snapped[0].value.value, snapped[1].value.value];
        const m = this.model.matrix;
        const next: Mat2 = column === 0 ? [[sx, m[0][1]], [sy, m[1][1]]] : [[m[0][0], sx], [m[1][0], sy]];
        this.notice = undefined;
        if (sameMatrix(next, m)) return;
        this.commitModel({...this.model, matrix: next, exampleId: "custom"}, options);
    }

    /** Reset: the identity map (and its example label); the view mode and the display switches stay. */
    protected resetToIdentity(): void {
        this.notice = undefined;
        this.commitModel({...this.model, matrix: IDENTITY, exampleId: "identity"});
    }

    protected setExample(id: string): void {
        if (!isLinearMapExampleId(id)) throw new DomainError(`The example must be one of the closed list, not ${id}.`);
        this.notice = undefined;
        this.commitModel(selectExample(this.model, id));
    }

    protected setMode(mode: string): void {
        if (!isLinearMapGraphMode(mode)) throw new DomainError(`The mode ${mode} is unknown.`);
        this.commitModel(changeMode(this.model, mode));
    }

    protected setToggle(field: "probeVisible" | "curveVisible" | "squareVisible", visible: boolean): void {
        if (this.model[field] !== visible) this.commitModel({...this.model, [field]: visible});
    }

    // ---- Lessons ----------------------------------------------------------------------------------------------------

    /**
     * Applies one `linear-map` scene action. The payload is validated strictly by the kernel (scene data is never snapped);
     * an invalid payload is a lesson-content error and throws a `DomainError` naming the field.
     */
    applyLinearMapAction(action: Extract<LessonAction, { kind: "linear-map" }>): void {
        const unwrap = <P,>(result: LinearMapResult<P>): P => {
            if (!result.ok) throw new DomainError(`${result.error.field}: ${result.error.message}`);
            return result.value;
        };
        this.notice = undefined;
        // The typed action is re-validated as data: the types are compile-time only and lesson content may be hand-written JSON.
        const payload: unknown = action;
        switch (action.operation) {
            case "set-matrix": return this.commitModel(applySetMatrix(this.model, unwrap(validateSetMatrix(payload))));
            case "set-mode": {
                const {mode} = unwrap(validateSetMode(payload));
                if (!isLinearMapGraphMode(mode)) throw new DomainError(`mode: this graph does not draw the mode ${mode}.`);
                return this.commitModel(applySetMode(this.model, {mode}));
            }
            case "set-test-vector": return this.commitModel(applySetTestVector(this.model, unwrap(validateSetTestVector(payload))));
            case "set-example": return this.commitModel(applySetExample(this.model, unwrap(validateSetExample(payload))));
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("linear-map", action => this.applyLinearMapAction(action));
    }

    // ---- Texts (shared by the board and the inspector) --------------------------------------------------------------

    private language(): NumberLanguage {
        return currentLanguage();
    }

    private num(value: number, decimals = 2): string {
        return formatNumber(value, this.language(), decimals);
    }

    private vector(v: Vec2): string {
        return `(${this.num(v[0])}, ${this.num(v[1])})`;
    }

    /** A factor in a product: a negative number gets parentheses. */
    private factor(value: number): string {
        return value < 0 ? `(${this.num(value)})` : this.num(value);
    }

    /** "a·d − b·c = 2·1 − (−1)·1 = 3" */
    private formula(view: View): string {
        const [[a, b], [c, d]] = view.matrix;
        return `a·d − b·c = ${this.factor(a)}·${this.factor(d)} − ${this.factor(b)}·${this.factor(c)} = ${this.num(view.determinant, 4)}`;
    }

    private orientationText(sign: -1 | 0 | 1): string {
        return sign > 0 ? t("linear_map_orientation_kept") : sign < 0 ? t("linear_map_orientation_reversed") : t("linear_map_orientation_none");
    }

    private exampleLabel(choice: LinearMapExampleChoice): string {
        switch (choice) {
            case "identity": return t("linear_map_example_identity");
            case "basis-default": return t("linear_map_example_basis_default");
            case "orientation-reversing": return t("linear_map_example_orientation_reversing");
            case "singular": return t("linear_map_example_singular");
            case "custom": return t("linear_map_example_custom");
            default: return t("linear_map_example_other");
        }
    }

    private modeLabel(mode: LinearMapGraphMode): string {
        switch (mode) {
            case "basis": return t("linear_map_mode_basis");
            case "determinant": return t("linear_map_mode_determinant");
        }
    }

    private entryLabel(row: Row, column: Column): string {
        if (column === 0) return row === 0 ? t("linear_map_a1_x_label") : t("linear_map_a1_y_label");
        return row === 0 ? t("linear_map_a2_x_label") : t("linear_map_a2_y_label");
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const squareShown = () => model().squareVisible;
        const curveShown = () => model().curveVisible;
        const probeShown = () => model().probeVisible;
        const colors = {
            source: GraphPalette.tick, image: GraphPalette.primaryCurve, square: GraphPalette.additionalCurves[1],
            curve: GraphPalette.referenceCurve, curveImage: GraphPalette.comparisonCurve, polygon: GraphPalette.controlPolygon,
        };

        // A curve whose points come from a function; NaN entries break the polyline (grid), finite everywhere else.
        const polyline = (points: () => Polyline, attributes: object) => {
            const curve = this.own(board.create("curve", [[], []], {
                highlight: false, fixed: true, withLabel: false, ...attributes,
            })) as unknown as { updateDataArray: () => void; dataX: number[]; dataY: number[] };
            curve.updateDataArray = () => {
                const {x, y} = points();
                curve.dataX = x;
                curve.dataY = y;
            };
        };

        // Layers, lowest first: the source grid, the image grid (one curve), the square, the Bezier curves and polygons, the points.
        polyline(() => SOURCE_GRID, {strokeColor: colors.source, strokeWidth: thin});
        polyline(() => view().grid, {strokeColor: colors.image, strokeWidth: thin});

        polyline(() => closedPolyline(unitSquareImage(IDENTITY)), {strokeColor: colors.source, strokeWidth: strokeWidth, visible: squareShown});
        polyline(() => closedPolyline(view().square), {
            strokeColor: colors.square, strokeWidth, fillColor: colors.square, fillOpacity: 0.18, visible: squareShown,
        });

        polyline(() => openPolyline(FIXTURE_CONTROL_POINTS), {strokeColor: colors.polygon, strokeWidth: thin, dash: 2, visible: curveShown});
        polyline(() => openPolyline(view().imageControl), {strokeColor: colors.polygon, strokeWidth: thin, dash: 2, visible: curveShown});
        const bezier = (controls: () => readonly Vec2[], color: string) =>
            this.own(board.create("curve", [
                (s: number) => bezierPoint(controls(), s)[0], (s: number) => bezierPoint(controls(), s)[1], 0, 1,
            ], {strokeColor: color, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: curveShown}));
        bezier(() => FIXTURE_CONTROL_POINTS, colors.curve);
        bezier(() => view().imageControl, colors.curveImage);

        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const fixedPoint = (x: () => number, y: () => number, name: string, placement: LabelPlacement, color: string, shown: () => boolean) =>
            this.own(board.create("point", [x, y], {
                ...this.styles.point.fixed, name, label: this.pointLabel(placement, 0.9, shown), size: markerSize, fillColor: color,
                highlightFillColor: color, strokeColor: color, fixed: true, visible: shown,
            }));
        // The source basis vectors, the image of the origin and of e1 + e2 (the other vertices of the image square are the handles).
        fixedPoint(() => 1, () => 0, "$$e_1$$", "below-right", colors.source, squareShown);
        fixedPoint(() => 0, () => 1, "$$e_2$$", "above-left", colors.source, squareShown);
        fixedPoint(() => 0, () => 0, "$$O$$", "below-left", colors.square, squareShown);
        fixedPoint(() => view().square[2][0], () => view().square[2][1], "$$A(e_1+e_2)$$", "above-right", colors.square, squareShown);
        fixedPoint(() => PROBE_POINT[0], () => PROBE_POINT[1], "$$p$$", "below-right", colors.curve, probeShown);
        fixedPoint(() => view().probeImage[0], () => view().probeImage[1], "$$Ap$$", "above-right", colors.image, probeShown);

        // a1 and a2 are dragged on the 1/4 grid inside [-4, 4]^2; each drag event writes the model once with both coordinates.
        const handle = (column: Column, name: string, placement: LabelPlacement, color: string) => {
            const m = this.model.matrix;
            const point = this.own(board.create("point", [m[0][column], m[1][column]], {
                ...this.styles.point.default, name, label: this.pointLabel(placement, 1.1), size: markerSize,
                fillColor: color, highlightFillColor: color, strokeColor: GraphPalette.pointOutline,
            })) as JXG.Point;
            point.on("drag", () => {
                if (!Number.isFinite(point.X()) || !Number.isFinite(point.Y())) return;
                this.ignoreOutOfDomain(() => this.setColumn(column, point.X(), point.Y(), {syncScene: false}));
                const current = this.model.matrix;
                point.moveTo([current[0][column], current[1][column]]);
            });
            return point;
        };
        this.handle1 = handle(0, "$$a_1=Ae_1$$", "below-right", colors.image);
        this.handle2 = handle(1, "$$a_2=Ae_2$$", "above-left", colors.curveImage);

        // The basis images and the determinant stay on the board; the narrow board drops the orientation line.
        this.caption("bottom-left", [
            {text: () => t("linear_map_board_columns", {value0: this.vector(view().a1), value1: this.vector(view().a2)}), scale: 1.1, math: true},
            {text: () => t("linear_map_board_det", {value0: this.num(view().determinant, 4)}), visible: () => model().mode === "determinant", math: true},
            {
                text: () => t("linear_map_board_orientation", {value0: this.orientationText(view().sign)}),
                visible: () => model().mode === "determinant", minBoardWidth: COMPACT_BOARD_WIDTH,
            },
        ]);
    }

    protected override syncSceneToModel(): void {
        const m = this.model.matrix;
        this.handle1?.moveTo([m[0][0], m[1][0]]);
        this.handle2?.moveTo([m[0][1], m[1][1]]);
    }

    protected override onSceneRemoved(): void {
        this.handle1 = undefined;
        this.handle2 = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const exampleOptions: LinearMapExampleChoice[] = [...EXAMPLE_IDS_OFFERED];
        if (!exampleOptions.includes(state.exampleId)) exampleOptions.push(state.exampleId);
        const entry = (row: Row, column: Column) => (
            <NumberInput label={this.entryLabel(row, column)} value={state.matrix[row][column]} step={MATRIX_ENTRY_STEP} decimals={2} applyOn="confirm"
                         describedBy="linear-map-entries-help linear-map-notice"
                         onChange={next => this.ignoreOutOfDomain(() => this.setEntryFromInput(row, column, next))}/>
        );
        const notice = this.notice;
        const toggle = (field: "probeVisible" | "curveVisible" | "squareVisible", action: string, label: string) => (
            <button type="button" data-action={action} aria-pressed={state[field]} onClick={() => this.setToggle(field, !this.model[field])}>
                {label}
            </button>
        );
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("linear_map_example_label")} value={state.exampleId} help={t("linear_map_example_help")}
                              options={exampleOptions.map(id => ({value: id, text: this.exampleLabel(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => { if (next !== "custom") this.setExample(next); })}/>
                <ChoiceSelect label={t("linear_map_mode_label")} value={state.mode}
                              options={LINEAR_MAP_GRAPH_MODES.map(mode => ({value: mode, text: this.modeLabel(mode)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMode(next))}/>
            </div>
            <div className="inspector-group">
                <div className="function-points-grid">
                    {entry(0, 0)}
                    {entry(1, 0)}
                    {entry(0, 1)}
                    {entry(1, 1)}
                </div>
                <p id="linear-map-entries-help" className="inspector-help">{t("linear_map_entries_help")}</p>
                <div id="linear-map-notice" role="status" aria-live="polite">
                    {notice && <p className="inspector-help" data-linear-map-notice={notice.kind}>
                        {t(notice.kind === "clamped" ? "linear_map_notice_clamped" : "linear_map_notice_snapped", {value0: this.entryLabel(notice.row, notice.column)})}
                    </p>}
                </div>
                <div className="demo-actions" role="group" aria-label={t("linear_map_actions_label")}>
                    <button type="button" data-action="linear-map-reset" onClick={() => this.resetToIdentity()}>{t("linear_map_reset")}</button>
                    {toggle("squareVisible", "toggle-linear-map-square", t("linear_map_toggle_square"))}
                    {toggle("probeVisible", "toggle-linear-map-probe", t("linear_map_toggle_probe"))}
                    {toggle("curveVisible", "toggle-linear-map-curve", t("linear_map_toggle_curve"))}
                </div>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "source-grid", color: GraphPalette.tick, label: t("linear_map_legend_source_grid"), kind: "line"},
            {id: "image-grid", color: GraphPalette.primaryCurve, label: t("linear_map_legend_image_grid"), kind: "line"},
            {id: "square", color: GraphPalette.additionalCurves[1], label: t("linear_map_legend_square"), kind: "line"},
            {id: "curve", color: GraphPalette.referenceCurve, label: t("linear_map_legend_curve"), kind: "line"},
            {id: "curve-image", color: GraphPalette.comparisonCurve, label: t("linear_map_legend_curve_image"), kind: "line"},
        ]}/>;
    }

    /** The statuses to state in words; each has a stable id for tests and assistive technology. Zero never says positive or negative. */
    private statuses(model: LinearMapState, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        if (model.mode === "determinant") {
            if (view.sign > 0) result.push({id: "positive", text: t("linear_map_status_positive")});
            else if (view.sign < 0) result.push({id: "negative", text: t("linear_map_status_negative")});
            else result.push({id: "zero", text: t("linear_map_status_zero")});
        }
        if (view.collapse === "line") result.push({id: "collapse-line", text: t("linear_map_status_collapse_line")});
        if (view.collapse === "point") result.push({id: "collapse-point", text: t("linear_map_status_collapse_point")});
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const view = this.viewOf(model);
        const [[a, b], [c, d]] = view.matrix;
        const rows = [
            {id: "row1", label: t("linear_map_readout_row1"), value: `${this.num(a)}   ${this.num(b)}`},
            {id: "row2", label: t("linear_map_readout_row2"), value: `${this.num(c)}   ${this.num(d)}`},
            {id: "a1", label: t("linear_map_readout_a1"), value: this.vector(view.a1)},
            {id: "a2", label: t("linear_map_readout_a2"), value: this.vector(view.a2)},
            {id: "probe", label: t("linear_map_readout_probe"), value: this.vector(view.probeImage)},
            ...(model.mode === "determinant" ? [
                {id: "det-formula", label: t("linear_map_readout_det_formula"), value: this.formula(view)},
                {id: "det", label: t("linear_map_readout_det"), value: this.num(view.determinant, 4)},
                {id: "area", label: t("linear_map_readout_area"), value: this.num(view.area, 4)},
                {id: "orientation", label: t("linear_map_readout_orientation"), value: this.orientationText(view.sign)},
            ] : []),
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("linear_map_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-linear-map-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default LinearMapGraph;
