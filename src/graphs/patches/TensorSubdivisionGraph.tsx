import type React from "react";
import type {TransientState} from "../base/BaseGraph";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {PatchDirection} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import {withSubdivisionPieces, pieceCorrespondence, type PieceCorrespondence} from "./TensorSubdivisionScene";
import TensorPatchGraph, {TensorPatchGraphState} from "./TensorPatchGraph";
import {SubdivisionElevateControls, SubdivisionReadout, SubdivisionSplitControls, SubdivisionVisibilityControls} from "./TensorSubdivisionPanels";
import {TensorPatchDisplayPanel, TensorPatchEditPanel} from "./TensorPatchPanels";
import {PatchCollectionPresetData, PatchStateDto, Point3Dto} from "./patchDto";
import {defaultPatchPresets, type DerivativesStartingPatch, derivativesStartingPatches, patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import {canElevate, SUBDIVISION_RANGE} from "./tensorSubdivision";
import {clamp} from "./surface-view/surfaceMath";
import type {ScenePolyline, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

export const DEFAULT_SUBDIVISION_DIRECTION: PatchDirection = "u";
export const DEFAULT_SUBDIVISION_VALUE = 0.4;

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

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        const {u, v, subdivisionDirection, subdivisionValue, showPieces} = this.state;
        const correspondence = this.correspondence();
        const point = patchFromNet(this.state.net).eval(u, v);
        return <>
            {this.unavailableNotice()}
            <SubdivisionSplitControls direction={subdivisionDirection ?? DEFAULT_SUBDIVISION_DIRECTION} value={subdivisionValue ?? DEFAULT_SUBDIVISION_VALUE}
                                      showPieces={showPieces ?? true} onDirection={direction => this.setSubdivisionDirection(direction)}
                                      onValue={value => this.setSubdivisionValue(value)}/>
            <SubdivisionElevateControls canElevateU={this.canElevateIn("u")} canElevateV={this.canElevateIn("v")} onElevate={direction => this.elevate(direction)}/>
            <TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions} startingPatches={this.startingPatches()}
                                  pointExtra={<SubdivisionReadout correspondence={correspondence} point={[point.X(), point.Y(), point.Z?.() ?? 0]}/>}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}
            visibilityExtra={<SubdivisionVisibilityControls showPieces={this.state.showPieces ?? true} onChange={visible => this.setShowPieces(visible)}/>}/>;
    }
}
