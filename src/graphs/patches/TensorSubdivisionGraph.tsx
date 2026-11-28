import type React from "react";
import type {TransientState} from "../base/BaseGraph";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {PatchDirection} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import {withSubdivisionPieces, pieceCorrespondence, type PieceCorrespondence} from "./TensorSubdivisionScene";
import {currentLanguage, message, t} from "../../localization";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, RangeParameter, ReadoutRow} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {DomainError} from "../functions/BaseFunctionGraph";
import {polylineStyle} from "./surface-view/jsxStyles";
import TensorPatchGraph, {TensorPatchGraphState, TensorPatchIds} from "./TensorPatchGraph";
import {SubdivisionElevateControls, SubdivisionReadout, SubdivisionSplitControls, SubdivisionVisibilityControls, tupleText} from "./TensorSubdivisionPanels";
import {TensorPatchDisplayPanel, TensorPatchEditPanel} from "./TensorPatchPanels";
import {PatchCollectionPresetData, PatchStateDto, Point3Dto} from "./patchDto";
import {defaultPatchPresets, type DerivativesStartingPatch, derivativesStartingPatches, patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import {canElevate, SUBDIVISION_RANGE} from "./tensorSubdivision";
import {clamp} from "./surface-view/surfaceMath";
import type {TensorSubdivisionLessonHost} from "./patchLessonActions";
import type {ScenePolyline, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

export const DEFAULT_SUBDIVISION_DIRECTION: PatchDirection = "u";
export const DEFAULT_SUBDIVISION_VALUE = 0.4;

/** The arbiter key of the split position `u0` or `v0` (a board puck). */
export const SPLIT_VALUE_KEY = "patch-split-value";

/** The Orodja actions of the subdivision: id, the elevation direction or the pieces switch, label. */
const ELEVATE_ACTIONS = [["elevate-u", "u", "patch_elevate_u"], ["elevate-v", "v", "patch_elevate_v"]] as const;

/** The legend entries the subdivision adds (id, also the drawn object's id), with the scene role each one is drawn in. */
const SUBDIVISION_LEGEND = [
    ["piece-left", "net", "line", "patch_pieces_legend_left"],
    ["piece-right", "net-2", "line", "patch_pieces_legend_right"],
    ["split", "highlight", "line", "patch_pieces_legend_split"],
    ["ghost", "compare", "dashed", "patch_pieces_legend_ghost"],
] as const;

/** The tensor workspace's ids plus the split position, the correspondence rows and note, the pieces' legend and the subdivision actions. */
export type SubdivisionIds = {
    param: TensorPatchIds["param"] | typeof SPLIT_VALUE_KEY;
    row: "piece" | "local" | "piece-point" | "point";
    note: "correspondence";
    legend: TensorPatchIds["legend"] | typeof SUBDIVISION_LEGEND[number][0];
    section: never;
    action: TensorPatchIds["action"] | typeof ELEVATE_ACTIONS[number][0] | "show-pieces";
};

const isDirection = (value: unknown): value is PatchDirection => value === "u" || value === "v";
const clampValue = (value: number) => clamp(value, SUBDIVISION_RANGE.min, SUBDIVISION_RANGE.max);

/**
 * Transient: the net before the last degree elevation, drawn as a ghost until the net next changes. `after` is the net
 * the elevation produced; the ghost is current only while the state still holds that very net.
 */
interface ElevationGhost {
    readonly before: ReadonlyArray<ReadonlyArray<Xyz>>;
    readonly after: ReadonlyArray<ReadonlyArray<Xyz>>;
}

const isXyz = (value: unknown): value is Xyz => Array.isArray(value) && value.length === 3 && value.every(c => typeof c === "number" && Number.isFinite(c));
const isNet = (value: unknown): value is Xyz[][] => Array.isArray(value) && value.length > 0
    && value.every(row => Array.isArray(row) && row.length === value[0].length && row.length > 0 && row.every(isXyz));

/**
 * The tensor-product patch Demonstration with a subdivision: split at `u0` or `v0`, the two piece nets drawn instead of
 * the control net, and exact degree elevation with the previous net kept as a ghost. The split settings are saved in
 * Presets; the ghost is transient (declared via `captureTransientState`, cleared by every net change, Preset load and Reset).
 * Starting patches are `derivativesStartingPatches` (the two tensor Presets and the two degenerate patches).
 */
export default class TensorSubdivisionGraph extends TensorPatchGraph {
    private ghost?: ElevationGhost;

    override presetCollection(): PresetCollection<PatchCollectionPresetData> {
        return patchPresetCollections["patch-subdivision"];
    }

    /** The bicubic dome split at `u0 = 0.4` with the pieces shown: the scene this Demonstration starts with. */
    override defaultPreset(): PatchCollectionPresetData {
        const entry = defaultPatchPresets[1].data()[0];
        if (entry[0] !== "TensorProductBezierPatch") throw new Error("The default patch Preset is not a tensor patch.");
        return [["TensorProductBezierPatch", {...entry[1], state: {...entry[1].state, subdivisionDirection: DEFAULT_SUBDIVISION_DIRECTION, subdivisionValue: DEFAULT_SUBDIVISION_VALUE, showPieces: true}}]];
    }

    override getInitialState(): TensorPatchGraphState {
        return {...super.getInitialState(), subdivisionDirection: DEFAULT_SUBDIVISION_DIRECTION, subdivisionValue: DEFAULT_SUBDIVISION_VALUE, showPieces: true};
    }

    protected override stateDto(): PatchStateDto {
        const s = this.state;
        return {
            ...super.stateDto(),
            subdivisionDirection: s.subdivisionDirection ?? DEFAULT_SUBDIVISION_DIRECTION,
            subdivisionValue: s.subdivisionValue ?? DEFAULT_SUBDIVISION_VALUE,
            showPieces: s.showPieces ?? true,
        };
    }

    /** A Preset without the split settings gets the defaults; a value outside the range is clamped, an unknown direction falls back to `u`. */
    protected override stateOf(dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>; state?: PatchStateDto}): Partial<TensorPatchGraphState> {
        const {subdivisionDirection, subdivisionValue, showPieces} = dto.state ?? {};
        return {
            ...super.stateOf(dto),
            subdivisionDirection: isDirection(subdivisionDirection) ? subdivisionDirection : DEFAULT_SUBDIVISION_DIRECTION,
            subdivisionValue: typeof subdivisionValue === "number" && Number.isFinite(subdivisionValue) ? clampValue(subdivisionValue) : DEFAULT_SUBDIVISION_VALUE,
            showPieces: typeof showPieces === "boolean" ? showPieces : true,
        };
    }

    protected override startingPatches(): ReadonlyArray<DerivativesStartingPatch> {
        return derivativesStartingPatches;
    }

    /** The starting patches replace the net, not the split the student chose. */
    protected override startingPatchKept(): Partial<TensorPatchGraphState> {
        const {subdivisionDirection, subdivisionValue, showPieces} = this.state;
        return {subdivisionDirection, subdivisionValue, showPieces};
    }

    // ---- Transient state ---------------------------------------------------------------------------------------

    protected override captureTransientState(): TransientState {
        const ghost = this.currentGhost();
        return {...super.captureTransientState(), elevationGhost: ghost === undefined ? undefined : ghost.before.map(row => row.map((p): Xyz => [...p]))};
    }

    /** No ghost for a freshly loaded scene (Preset load, Reset, mount); a captured one is read back only if it is a valid net. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const before = saved?.elevationGhost;
        this.ghost = isNet(before) ? {before, after: this.state.net} : undefined;
    }

    /** The ghost, if the net is still the one the elevation produced. */
    private currentGhost(): ElevationGhost | undefined {
        return this.ghost !== undefined && this.ghost.after === this.state.net ? this.ghost : undefined;
    }

    // ---- Operations the controls call --------------------------------------------------------------------------

    setSubdivisionDirection(direction: PatchDirection): void {
        if (isDirection(direction)) this.setState({subdivisionDirection: direction});
    }

    /** Sets the split value; non-finite values are ignored, others clamp to `SUBDIVISION_RANGE`. */
    setSubdivisionValue(value: number): void {
        if (Number.isFinite(value)) this.setState({subdivisionValue: clampValue(value)});
    }

    setShowPieces(showPieces: boolean): void {
        this.setState({showPieces});
    }

    protected override lessonSubdivision(): TensorSubdivisionLessonHost {
        return {
            kind: "tensor",
            canElevateIn: direction => this.canElevateIn(direction),
            showSplit: (direction, value) => this.setState({subdivisionDirection: direction, subdivisionValue: value, showPieces: true}),
            elevate: direction => this.elevate(direction),
        };
    }

    /** Whether `elevate(direction)` would act: the degree in that direction is below the maximum 4. */
    canElevateIn(direction: PatchDirection): boolean {
        return canElevate(patchFromNet(this.state.net), direction);
    }

    /** Where `S(u, v)` lies on the pieces for the current split and parameters, and the point the piece evaluates there. */
    correspondence(): PieceCorrespondence {
        const {net, u, v, subdivisionDirection, subdivisionValue} = this.state;
        return pieceCorrespondence(patchFromNet(net), subdivisionDirection ?? DEFAULT_SUBDIVISION_DIRECTION, subdivisionValue ?? DEFAULT_SUBDIVISION_VALUE, u, v);
    }

    /**
     * Raises the degree in `direction` by one, exactly (the surface does not change), and keeps the previous net as a
     * ghost until the net next changes (an edit, a degree change, a starting patch, a Preset load or Reset). Nothing
     * happens at degree 4.
     */
    elevate(direction: PatchDirection): void {
        if (!isDirection(direction) || !this.canElevateIn(direction)) return;
        const net = patchFromNet(this.state.net).elevate(direction).getControlNet().map(row => row.map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0]));
        this.ghost = {before: this.state.net, after: net};
        this.setState({m: net.length - 1, n: net[0].length - 1, net});
        this.selectPoint(this.selectedPointId);
    }

    /** The original control points are not editable while the pieces are shown. */
    protected override movePoint(pointId: string, position: Xyz): void {
        if (this.state.showPieces ?? true) return;
        super.movePoint(pointId, position);
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    protected override buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene {
        const scene = super.buildScene(revision, selectedPointId);
        const {net, showControlNet, subdivisionDirection, subdivisionValue, showPieces} = this.state;
        const shown = (showPieces ?? true)
            ? withSubdivisionPieces(scene, patchFromNet(net), subdivisionDirection ?? DEFAULT_SUBDIVISION_DIRECTION, subdivisionValue ?? DEFAULT_SUBDIVISION_VALUE, showControlNet)
            : scene;
        const ghost = this.currentGhost();
        if (ghost === undefined || !showControlNet) return shown;
        const lines: ScenePolyline[] = [
            ...ghost.before.map((row, i): ScenePolyline => ({id: `ghost-row-${i}`, role: "compare", points: row.map((p): Xyz => [...p])})),
            ...ghost.before[0].map((_, j): ScenePolyline => ({id: `ghost-col-${j}`, role: "compare", points: ghost.before.map(row => [...row[j]] as Xyz)})),
        ];
        return {...shown, polylines: [...shown.polylines, ...lines]};
    }

    protected override geometryChanged(previous: Readonly<TensorPatchGraphState>): boolean {
        const s = this.state;
        return super.geometryChanged(previous) || s.subdivisionDirection !== previous.subdivisionDirection
            || s.subdivisionValue !== previous.subdivisionValue || s.showPieces !== previous.showPieces;
    }

    // ---- Declaration -------------------------------------------------------------------------------------------

    protected override declaresTensorWorkspace(): boolean {
        return true;
    }

    /** The split position, bound to the panel's setter; a value outside `SUBDIVISION_RANGE` is refused. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            ...super.parameterBindings(),
            [SPLIT_VALUE_KEY]: {
                read: () => this.state.subdivisionValue ?? DEFAULT_SUBDIVISION_VALUE,
                apply: (value: unknown) => {
                    const number = Number(value);
                    if (!Number.isFinite(number) || number < SUBDIVISION_RANGE.min || number > SUBDIVISION_RANGE.max) {
                        throw new DomainError(message("invalid_patch_subdivision_value"));
                    }
                    this.setSubdivisionValue(number);
                },
            },
        };
    }

    /**
     * The tensor workspace (u, v pucks: the readout says on which piece and at which local parameters S(u, v) lies, read while
     * moving them) plus the split position as a board puck (the chapter prompt and `prompt_patch_subdivision_pieces` ask the
     * learner to set the split and compare the piece nets), the correspondence readout and note, the pieces' legend, and the
     * elevation and pieces switch as Orodja actions. The split direction (a setup choice) stays in Orodja undeclared.
     */
    protected override declaration(): GraphDeclaration<SubdivisionIds> {
        const base = this.tensorDeclaration();
        const s = this.state;
        const direction = s.subdivisionDirection ?? DEFAULT_SUBDIVISION_DIRECTION;
        const language = currentLanguage();
        const {location, point: piecePoint} = this.correspondence();
        const point = patchFromNet(s.net).eval(s.u, s.v);
        const tuple = (values: readonly number[]) => ({kind: "formatted" as const, text: tupleText(values, language)});
        const split: RangeParameter<SubdivisionIds["param"]> = {
            kind: "range", key: SPLIT_VALUE_KEY, label: message("patch_split_puck"), symbol: direction === "u" ? "u_0" : "v_0",
            placement: "board", min: SUBDIVISION_RANGE.min, max: SUBDIVISION_RANGE.max, step: 0.01, maxDecimals: 2,
        };
        const rows: ReadoutRow<SubdivisionIds>[] = [
            {id: "piece", name: message("patch_correspondence_piece"), value: message(location.piece === "left" ? "patch_correspondence_left" : "patch_correspondence_right")},
            {id: "local", name: message("patch_correspondence_local"), value: tuple([location.u, location.v])},
            {id: "piece-point", name: message("patch_correspondence_piece_point"), value: tuple(piecePoint)},
            {id: "point", symbol: "S(u, v)", value: tuple([point.X(), point.Y(), point.Z?.() ?? 0]), legend: "point"},
        ];
        const tools = (id: SubdivisionIds["action"], label: ActionDeclaration["label"], tab: "edit" | "display", section: string, enabled: boolean, pressed?: boolean): ActionDeclaration<SubdivisionIds> =>
            ({id, label, placement: "tools", tab, section, enabled, ...(pressed === undefined ? {} : {pressed})});
        const legend: LegendEntry<SubdivisionIds>[] = [...base.legend ?? [],
            ...SUBDIVISION_LEGEND.map(([id, , kind, label]) => ({id, label: message(label), kind, object: id}))];
        return {
            ...base,
            parameters: [...base.parameters ?? [], split],
            readouts: [{id: "correspondence", title: message("patch_correspondence_heading"), rows}],
            notes: [{id: "correspondence", text: message("patch_correspondence_note"), tone: "muted"}],
            legend,
            actions: [...base.actions ?? [],
                ...ELEVATE_ACTIONS.map(([id, elevation, label]) => tools(id, message(label), "edit", "elevate", this.canElevateIn(elevation))),
                tools("show-pieces", message("patch_show_pieces"), "display", "display", true, s.showPieces ?? true)],
        };
    }

    override performAction(id: string): void {
        const elevation = ELEVATE_ACTIONS.find(([candidate]) => candidate === id);
        if (elevation !== undefined) return runAs("learner", () => this.elevate(elevation[1]));
        if (id === "show-pieces") return runAs("learner", () => this.setShowPieces(!(this.state.showPieces ?? true)));
        super.performAction(id);
    }

    /**
     * While the pieces are shown, the original net and its points give way to the two piece nets (net switch on) and the split
     * curve; the ghost of the previous net is drawn while it is current and the net switch is on.
     */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const {showControlNet, surfaceUnavailable} = this.state;
        const pieces = this.state.showPieces ?? true;
        if (id === "net" || id === "points") {
            const drawn = super.drawnObject(id);
            return drawn === undefined ? undefined : {...drawn, visible: drawn.visible && !pieces};
        }
        const entry = SUBDIVISION_LEGEND.find(([candidate]) => candidate === id);
        if (entry === undefined) return super.drawnObject(id);
        const held = entry[0] === "split" ? pieces : entry[0] === "ghost" ? this.currentGhost() !== undefined && showControlNet : pieces && showControlNet;
        return {color: polylineStyle(entry[1]).stroke, visible: held && !surfaceUnavailable};
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        const {u, v, subdivisionDirection, subdivisionValue, showPieces} = this.state;
        const correspondence = this.correspondence();
        const point = patchFromNet(this.state.net).eval(u, v);
        return <>
            {this.unavailableNotice()}
            <SubdivisionSplitControls direction={subdivisionDirection ?? DEFAULT_SUBDIVISION_DIRECTION} value={subdivisionValue ?? DEFAULT_SUBDIVISION_VALUE}
                                      showPieces={showPieces ?? true} onDirection={direction => this.setSubdivisionDirection(direction)}
                                      onValue={value => this.setSubdivisionValue(value)} puckKey={SPLIT_VALUE_KEY}/>
            <SubdivisionElevateControls canElevateU={this.canElevateIn("u")} canElevateV={this.canElevateIn("v")} onElevate={direction => this.elevate(direction)}/>
            <TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions} startingPatches={this.startingPatches()}
                                  puckKeys={this.puckKeys()}
                                  pointExtra={<div data-declared-panel=""><SubdivisionReadout correspondence={correspondence} point={[point.X(), point.Y(), point.Z?.() ?? 0]}/></div>}
                                  pointLocked={(showPieces ?? true) ? t("patch_pieces_locked") : undefined}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}
            visibilityExtra={<SubdivisionVisibilityControls showPieces={this.state.showPieces ?? true} onChange={visible => this.setShowPieces(visible)}/>}/>;
    }
}
