import type React from "react";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {buildJoinScene, joinPointId, parseJoinPointId} from "./TensorJoinScene";
import {JoinBDegreeControls, JoinBPointControls, JoinCapstonePanel, JoinModeControls, JoinReportPanel, JoinScenesControls} from "./TensorJoinPanels";
import {TensorPatchDisplayPanel, TensorPatchEditPanel} from "./TensorPatchPanels";
import TensorPatchGraph, {MAX_PATCH_DEGREE, MIN_PATCH_DEGREE, netWithDegree, type PatchDirection, TensorPatchGraphState} from "./TensorPatchGraph";
import {isJoinCapstone, PatchCollectionPresetData, PatchStateDto, Point3Dto, TensorPatchDto, tensorPatchToDto} from "./patchDto";
import {defaultPatchPresets, joinStartingScenes, patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import {classifyJoin, enforceJoin, JOIN_ALPHA_RANGE, type JoinContinuity, type JoinReport, matchBoundaryDegree} from "./tensorJoins";
import {buildTeapotScene} from "./TensorTeapotScene";
import {teapotControlPoints} from "./teapot/utahTeapot";
import {fitCameraTo} from "./surface-view/surfaceMath";
import type {SurfaceScene, Xyz} from "./surface-view/surfaceScene";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {patchJoinLessonActions} from "./patchLessonActions";

export const JOIN_CONTINUITIES: readonly JoinContinuity[] = ["none", "c0", "c1", "g1"];
const isJoinContinuity = (value: unknown): value is JoinContinuity => JOIN_CONTINUITIES.some(mode => mode === value);

export const DEFAULT_JOIN_CONTINUITY: JoinContinuity = "c1";
export const DEFAULT_JOIN_ALPHA = 2;
export const DEFAULT_JOIN_V = 0.5;

/** The `state` of a `patch-joins` Preset: `PatchStateDto` with patch `B` (`netB` row-major, `(mB + 1) * (nB + 1)` points) and the join settings. */
export type JoinStateDto = PatchStateDto;

type Net = Xyz[][];

const xyz = ([x, y, z]: Point3Dto): Xyz => [x, y, z];
const copyNet = (net: ReadonlyArray<ReadonlyArray<Xyz>>): Net => net.map(row => row.map((p): Xyz => [...p]));
const netFrom = (rows: number, columns: number, flat: ReadonlyArray<Point3Dto>): Net =>
    Array.from({length: rows}, (_, i) => flat.slice(i * columns, (i + 1) * columns).map(xyz));

/** `A` shifted by its own `u` extent, so `B`'s row 0 starts where `A`'s last row is: a patch continuing `A`. */
function continuationOf(net: ReadonlyArray<ReadonlyArray<Xyz>>): Net {
    const last = net[net.length - 1], first = net[0];
    return net.map(row => row.map((p, j): Xyz => [p[0] + last[j][0] - first[j][0], p[1] + last[j][1] - first[j][1], p[2] + last[j][2] - first[j][2]]));
}

/** Rows of `B` that `mode` derives from `A` (and that cannot be dragged): none, row 0, or rows 0 and 1; never more than `B` has. */
export function derivedRows(mode: JoinContinuity, mB: number): number {
    return Math.min(mB + 1, mode === "none" ? 0 : mode === "c0" ? 1 : 2);
}

/**
 * The displayed pair for `mode`. In `none` both nets are exactly as given (independent degrees; `B` is not elevated). Otherwise
 * the `v` degrees are made equal by exact elevation of the lower net and `B`'s derived rows are set from `A`.
 */
export function joinedNets(a: ReadonlyArray<ReadonlyArray<Xyz>>, b: ReadonlyArray<ReadonlyArray<Xyz>>, mode: JoinContinuity, alpha: number): {net: Net; netB: Net} {
    if (mode === "none") return {net: copyNet(a), netB: copyNet(b)};
    const matched = matchBoundaryDegree(a, b);
    return {net: matched.a, netB: enforceJoin(matched.a, matched.b, mode, alpha)};
}

const joinedPatch = (net: Net, netB: Net, mode: JoinContinuity, alpha: number): Partial<TensorPatchGraphState> => {
    // In none both nets stay exactly as given (the same arrays, so an unchanged B is not a geometry change).
    const joined = mode === "none" ? {net, netB} : joinedNets(net, netB, mode, alpha);
    return {net: joined.net, m: joined.net.length - 1, n: joined.net[0].length - 1, netB: joined.netB, mB: joined.netB.length - 1, nB: joined.netB[0].length - 1};
};

/** Patch `A` and `B` and the join settings a `patch-joins` DTO describes; a DTO without `B` gets a continuation of `A`, one without settings the defaults. */
function joinStateOf(dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>; state?: JoinStateDto}) {
    const s = dto.state;
    const joinContinuity = isJoinContinuity(s?.joinContinuity) ? s.joinContinuity : DEFAULT_JOIN_CONTINUITY;
    const joinAlpha = Number.isFinite(s?.joinAlpha) ? Math.min(JOIN_ALPHA_RANGE.max, Math.max(JOIN_ALPHA_RANGE.min, s?.joinAlpha ?? DEFAULT_JOIN_ALPHA)) : DEFAULT_JOIN_ALPHA;
    const joinV = Number.isFinite(s?.joinV) ? Math.min(1, Math.max(0, s?.joinV ?? DEFAULT_JOIN_V)) : DEFAULT_JOIN_V;
    const net = netFrom(dto.m + 1, dto.n + 1, dto.net);
    const hasB = s?.netB !== undefined && Number.isInteger(s.mB) && Number.isInteger(s.nB) && s.netB.length === ((s.mB ?? 0) + 1) * ((s.nB ?? 0) + 1);
    const netB = hasB && s?.netB && s.mB !== undefined && s.nB !== undefined ? netFrom(s.mB + 1, s.nB + 1, s.netB) : continuationOf(net);
    // Written even when absent, so a Preset of the pair replaces a capstone state.
    const joinCapstone = isJoinCapstone(s?.joinCapstone) ? s.joinCapstone : undefined;
    return {joinContinuity, joinAlpha, joinV, joinCapstone, ...joinedPatch(net, netB, joinContinuity, joinAlpha)};
}

const defaultDto = (): TensorPatchDto => {
    const entry = defaultPatchPresets[1].data()[0];
    if (entry[0] !== "TensorProductBezierPatch") throw new Error("The default patch Preset is not a tensor patch.");
    return entry[1];
};

/**
 * Two tensor-product patches `A` and `B` joined along `A`'s `u = 1` boundary and `B`'s `u = 0` boundary, with the
 * continuity (`none`, C0, C1, G1 with ratio `alpha`) enforced by deriving `B`'s first rows from `A`. `A` is the inherited
 * `net`/`m`/`n` (edited as in `patch-tensor`); `B` is `netB`/`mB`/`nB`, its points `b-i-j`. The derived rows are drawn but
 * not draggable; every `A` edit, degree change and mode or ratio change re-derives them in the same state write. In `none`
 * the two `v` degrees are independent and `B` is stored as edited; in the other modes they are shared. The cross-boundary
 * readout uses the inherited-style parameter `joinV` (a separate field: `v` stays the parameter of `A`'s point `S(u, v)`).
 *
 * With `joinCapstone` set (`"teapot"`) the Demonstration shows a read-only scene of the 32 Utah teapot patches instead:
 * no point exists or can be moved, the join and degree controls are hidden, and `net` is only the Preset's placeholder patch.
 */
export default class TensorJoinGraph extends TensorPatchGraph {
    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(patchJoinLessonActions({
            isCapstone: () => this.capstone(),
            supportsScene: scene => joinStartingScenes.some(entry => entry.id === scene),
            showScene: (scene, view3d) => {
                const index = joinStartingScenes.findIndex(entry => entry.id === scene);
                if (index >= 0) {
                    this.useJoinScene(index);
                    if (view3d) this.applyLessonView3D(view3d);
                }
            },
            setMode: mode => this.setJoinContinuity(mode),
            setAlpha: alpha => this.setJoinAlpha(alpha),
        }));
    }

    override getInitialState(): TensorPatchGraphState {
        const state = {...super.getInitialState(), ...this.stateOf(defaultDto())};
        return {...state, camera: fitCameraTo([...state.net.flat(), ...(state.netB ?? []).flat()], 1, state.camera)};
    }

    override presetCollection(): PresetCollection<PatchCollectionPresetData> {
        return patchPresetCollections["patch-joins"];
    }

    override defaultPreset(): PatchCollectionPresetData {
        const state = this.getInitialState();
        const {camera} = state;
        const patch = tensorPatchToDto(patchFromNet(state.net), {
            ...defaultDto().state, camera: {az: camera.az, el: camera.el, distance: camera.distance, projection: camera.projection, target: [...camera.target]},
            ...this.joinFieldsOf(state),
        });
        return [["TensorProductBezierPatch", patch]];
    }

    private joinFieldsOf(s: Pick<TensorPatchGraphState, "joinContinuity" | "joinAlpha" | "joinV" | "netB">): JoinStateDto {
        const netB = s.netB ?? [];
        return {
            joinContinuity: s.joinContinuity ?? DEFAULT_JOIN_CONTINUITY, joinAlpha: s.joinAlpha ?? DEFAULT_JOIN_ALPHA, joinV: s.joinV ?? DEFAULT_JOIN_V,
            mB: netB.length - 1, nB: (netB[0]?.length ?? 1) - 1, netB: netB.flatMap(row => row.map((p): Point3Dto => [p[0], p[1], p[2]])),
        };
    }

    protected override stateDto(): JoinStateDto {
        if (this.capstone()) return {...super.stateDto(), joinCapstone: this.state.joinCapstone};
        return {...super.stateDto(), ...this.joinFieldsOf({...this.state, netB: this.bNet()})};
    }

    protected override stateOf(dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>; state?: JoinStateDto}): Partial<TensorPatchGraphState> {
        return {...super.stateOf(dto), ...joinStateOf(dto)};
    }

    // ---- State -------------------------------------------------------------------------------------------------

    /** Whether the read-only capstone scene replaces the pair of patches. */
    capstone(): boolean {
        return this.state.joinCapstone !== undefined;
    }

    /** Leaves the capstone for the default pair (the Reset state). */
    useDefaultPair(): void {
        this.importPresetData(this.defaultPreset());
    }

    private mode(): JoinContinuity {
        return this.state.joinContinuity ?? DEFAULT_JOIN_CONTINUITY;
    }

    private alpha(): number {
        return this.state.joinAlpha ?? DEFAULT_JOIN_ALPHA;
    }

    /** `B`'s net; a state written without one (an old scene) shows a continuation of `A`. */
    bNet(): Net {
        return this.state.netB ?? continuationOf(this.state.net);
    }

    /** Selects `Q_ij` of `B` like a click; a derived point (or an index outside `B`), or both undefined, clears the selection. */
    selectBIndex(i: number | undefined, j: number | undefined): void {
        this.selectPoint(i === undefined && j === undefined ? undefined : joinPointId(i ?? 0, j ?? 0));
    }

    /** The selected point of `B`, if the selection is one. */
    selectedBIndex(): [number, number] | undefined {
        return this.selectedPointId === undefined ? undefined : parseJoinPointId(this.selectedPointId);
    }

    /** The join of the displayed pair, classified from the nets themselves (never from the chosen mode). */
    joinReport(): JoinReport {
        return classifyJoin(this.state.net, this.bNet());
    }

    /** Whether row `i` of `B` is derived from `A` in the current mode (drawn, not draggable). */
    isDerivedRow(i: number): boolean {
        return i < derivedRows(this.mode(), this.bNet().length - 1);
    }

    // ---- Operations the controls call --------------------------------------------------------------------------

    /** Switching from `none` with unequal `v` degrees elevates the lower net (exact: the surfaces do not change). */
    setJoinContinuity(mode: JoinContinuity): void {
        if (this.capstone() || !isJoinContinuity(mode) || mode === this.mode()) return;
        this.setState({joinContinuity: mode, ...joinedPatch(this.state.net, this.bNet(), mode, this.alpha())});
        this.selectPoint(this.selectedPointId);
    }

    /** Non-finite values are ignored; others clamp to `JOIN_ALPHA_RANGE`. Only G1 uses it, but it is kept in every mode. */
    setJoinAlpha(alpha: number): void {
        if (this.capstone() || !Number.isFinite(alpha)) return;
        const clamped = Math.min(JOIN_ALPHA_RANGE.max, Math.max(JOIN_ALPHA_RANGE.min, alpha));
        if (clamped === this.alpha()) return;
        this.setState({joinAlpha: clamped, ...joinedPatch(this.state.net, this.bNet(), this.mode(), clamped)});
    }

    /** The `v` of the cross-boundary arrows; non-finite values are ignored, others clamp to [0, 1]. */
    setJoinV(v: number): void {
        if (!Number.isFinite(v)) return;
        this.setState({joinV: Math.min(1, Math.max(0, v))});
    }

    /**
     * `B`'s degree. `u` is `B`'s own. `v` is shared with `A` outside `none` (both nets change, as `setDegree("v", …)` does);
     * in `none` it is `B`'s own.
     */
    setBDegree(direction: PatchDirection, degree: number): void {
        if (this.capstone() || !Number.isInteger(degree) || degree < MIN_PATCH_DEGREE || degree > MAX_PATCH_DEGREE) return;
        if (direction === "v" && this.mode() !== "none") {
            this.setDegree("v", degree);
            return;
        }
        const netB = this.bNet();
        if (degree === (direction === "u" ? netB.length - 1 : netB[0].length - 1)) return;
        this.setState(joinedPatch(this.state.net, netWithDegree(netB, direction, degree), this.mode(), this.alpha()));
        this.selectPoint(this.selectedPointId);
    }

    /** Replaces both patches and the join settings with a starting scene (the "Join examples" buttons); the camera comes with it. */
    useJoinScene(index: number): void {
        const entry = joinStartingScenes[index]?.data()[0];
        if (entry?.[0] !== "TensorProductBezierPatch") return;
        this.setState(this.stateOf(entry[1]));
        this.selectPoint(this.selectedPointId);
    }

    /** The starting patches replace `A`; the join settings stay and `B` becomes the continuation of the new `A`, joined in the current mode. */
    override useStartingPatch(index: number): void {
        const entry = this.startingPatches()[index]?.data()[0];
        if (entry?.[0] !== "TensorProductBezierPatch") return;
        const dto: TensorPatchDto = entry[1];
        const {joinContinuity, joinAlpha, joinV} = this.state;
        const state = {...this.stateOf({...dto, state: {...dto.state, ...(joinContinuity === undefined ? {} : {joinContinuity}), ...(joinAlpha === undefined ? {} : {joinAlpha}), ...(joinV === undefined ? {} : {joinV})}})};
        const camera = state.camera && state.net ? fitCameraTo([...state.net.flat(), ...(state.netB ?? []).flat()], this.hostAspect(), state.camera) : state.camera;
        this.setState({...state, ...(camera ? {camera} : {})});
        this.selectPoint(this.selectedPointId);
    }

    /** `A`'s degree; read-only in the capstone, whose patch is a placeholder. */
    override setDegree(direction: PatchDirection, degree: number): void {
        if (!this.capstone()) super.setDegree(direction, degree);
    }

    /** The view frames both patches, or the whole teapot. */
    protected override framedPoints(): Xyz[] {
        if (this.capstone()) return teapotControlPoints();
        return [...this.state.net.flat(), ...this.bNet().flat()];
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    protected override buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene {
        if (this.capstone()) return buildTeapotScene(this.state, revision);
        return buildJoinScene({
            ...this.state, netB: this.bNet(), joinV: this.state.joinV ?? DEFAULT_JOIN_V,
            ...(selectedPointId === undefined ? {} : {selectedPointId}),
        }, revision);
    }

    protected override geometryChanged(previous: Readonly<TensorPatchGraphState>): boolean {
        const s = this.state;
        return super.geometryChanged(previous) || s.netB !== previous.netB || s.joinV !== previous.joinV || s.joinCapstone !== previous.joinCapstone;
    }

    protected override hasPoint(pointId: string): boolean {
        if (this.capstone()) return false;
        const index = parseJoinPointId(pointId);
        if (index === undefined) return super.hasPoint(pointId);
        const netB = this.bNet();
        return index[0] < netB.length && index[1] < netB[0].length && !this.isDerivedRow(index[0]);
    }

    protected override movePoint(pointId: string, position: Xyz): void {
        if (this.capstone()) return;
        const index = parseJoinPointId(pointId);
        if (index === undefined) {
            super.movePoint(pointId, position);
            return;
        }
        if (!this.hasPoint(pointId) || !position.every(Number.isFinite)) return;
        const [i, j] = index;
        const netB = this.bNet();
        if (netB[i][j].every((value, axis) => value === position[axis])) return;
        this.setState({netB: netB.map((row, r) => r === i ? row.map((p, c): Xyz => c === j ? [...position] : p) : row)});
    }

    /** An `A` edit or a degree change re-derives `B` in the same write; a new `v` degree of `A` is `B`'s too outside `none`. */
    protected override settleNet(patch: Partial<TensorPatchGraphState> & {net: Xyz[][]}): Partial<TensorPatchGraphState> {
        const mode = this.mode();
        let netB = this.bNet();
        if (patch.n !== undefined && patch.n !== this.state.n && mode !== "none") netB = netWithDegree(netB, "v", patch.n);
        return {...patch, ...joinedPatch(patch.net, netB, mode, this.alpha())};
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        if (this.capstone()) return <>{this.unavailableNotice()}<JoinCapstonePanel onBack={() => this.useDefaultPair()}/></>;
        const netB = this.bNet();
        return <>
            {this.unavailableNotice()}
            <JoinScenesControls scenes={joinStartingScenes} onUse={index => this.useJoinScene(index)}/>
            <JoinModeControls mode={this.mode()} alpha={this.alpha()} joinV={this.state.joinV ?? DEFAULT_JOIN_V}
                              onMode={mode => this.setJoinContinuity(mode)} onAlpha={alpha => this.setJoinAlpha(alpha)} onJoinV={v => this.setJoinV(v)}/>
            <JoinReportPanel report={this.joinReport()}/>
            <JoinBDegreeControls mode={this.mode()} mB={netB.length - 1} nB={netB[0].length - 1} onDegree={(direction, degree) => this.setBDegree(direction, degree)}/>
            <TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions} startingPatches={this.startingPatches()}/>
            <JoinBPointControls netB={netB} isDerivedRow={row => this.isDerivedRow(row)} selected={this.selectedBIndex()} aSelected={this.selection() !== undefined}
                                onSelect={(i, j) => this.selectBIndex(i, j)} onApply={xyz => this.setSelectedCoordinates(xyz)}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions} readOnly={this.capstone()}/>;
    }
}
