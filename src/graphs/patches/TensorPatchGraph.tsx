import type React from "react";
import {message} from "../../localization";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, RangeParameter} from "../base/declare/graphDeclaration";
import type {Lease, ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {cssColor, MESH_STYLE, markerColor, polylineStyle} from "./surface-view/jsxStyles";
import {SURFACE_COLORS} from "./surface-view/surfaceStyles";
import type {GraphSession} from "../base/GraphSession";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {PatchSelection, TensorPatchDisplayPanel, TensorPatchEditPanel, TensorPatchPanelActions} from "./TensorPatchPanels";
import {mountParameterInset, ParameterInset} from "./parameterInset";
import {patchBernsteinWeight} from "./patchBernstein";
import {lowerNetDegree} from "./patchDegree";
import type {LessonPatchFixture} from "../../learning/model";
import {lessonPatchPresetData} from "./lessonPatchFixture";
import {PatchSweeps} from "./patchSweep";
import {patchLessonActions, type PatchVisibilityTarget, type TensorSubdivisionLessonHost} from "./patchLessonActions";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import BaseSurfaceGraph, {SurfaceGraphOptions, SurfaceGraphState} from "./BaseSurfaceGraph";
import {DecasteljauOrder, type JoinCapstone, PatchCameraDto, PatchCollectionPresetData, PatchStateDto, Point3Dto, tensorPatchToDto} from "./patchDto";
import {defaultPatchPresets, type DerivativesStartingPatch, patchPresetCollections} from "./patchPresetCollections";
import {buildTensorScene, patchFromNet, patchPointId, PatchDensity, parsePatchPointId} from "./patchSceneBuilder";
import {CAMERA_PRESETS, CameraPresetName, clamp, fitCameraTo, presetCamera} from "./surface-view/surfaceMath";
import type {JoinContinuity} from "./tensorJoins";
import type {SurfaceCamera, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

export const MIN_PATCH_DEGREE = 1;
export const MAX_PATCH_DEGREE = 4;

export type PatchVisibility = "showControlNet" | "showIsoCurves" | "showBoundaryCurves" | "showShading";
export type PatchDirection = "u" | "v";

export interface TensorPatchGraphState extends SurfaceGraphState {
    m: number;
    n: number;
    /** `net[i][j]` is `b_ij`; replaced (never edited in place) on every change. */
    net: Xyz[][];
    u: number;
    v: number;
    showControlNet: boolean;
    showIsoCurves: boolean;
    showBoundaryCurves: boolean;
    showShading: boolean;
    /** Lesson-only current-v section overlay, enabled while the patch-v-sweep is shown; not stored in Presets. */
    showMovingVSection: boolean;
    isoDensity: PatchDensity;
    shadingDensity: PatchDensity;
    /** Vertical-drag mode of the view; a mode of the session, not saved in Presets. */
    zMode: boolean;
    /** Only the `patch-decasteljau` Demonstration sets these (see {@link TensorDeCasteljauGraph}); `patch-tensor` leaves them out of its state and Presets. */
    showDeCasteljau?: boolean;
    decasteljauOrder?: DecasteljauOrder;
    /** Only the `patch-derivatives` Demonstration sets these (see {@link TensorDerivativesGraph}); absent there means shown. */
    showTangentPlane?: boolean;
    showNormal?: boolean;
    showTwist?: boolean;
    /** Only the `patch-subdivision` Demonstration sets these (see `TensorSubdivisionGraph`). */
    subdivisionDirection?: PatchDirection;
    subdivisionValue?: number;
    showPieces?: boolean;
    /** Only the `patch-joins` Demonstration sets these (see `TensorJoinGraph`); `B` is the second patch, joined along `A`'s `u = 1` boundary. */
    joinContinuity?: JoinContinuity;
    joinAlpha?: number;
    joinV?: number;
    mB?: number;
    nB?: number;
    netB?: Xyz[][];
    /** Only `patch-joins` sets this: the read-only capstone scene shown instead of the pair `A` and `B`; absent means the pair. */
    joinCapstone?: JoinCapstone;
}

/** The arbiter keys of the evaluation parameters (u, v), bound only on the Demonstrations that declare the workspace. */
export const PATCH_PARAMETER_KEYS = {u: "patch-u", v: "patch-v"} as const;

/** The display switches of the tensor workspace, declared as Orodja actions (with `pressed`). */
const TENSOR_SWITCHES = [
    ["control-net", "showControlNet", "patch_show_control_net"],
    ["iso-curves", "showIsoCurves", "patch_show_iso_curves"],
    ["boundary-curves", "showBoundaryCurves", "patch_show_boundary_curves"],
    ["shading", "showShading", "patch_show_shading"],
] as const satisfies ReadonlyArray<readonly [string, PatchVisibility, string]>;

/**
 * The ids of the tensor workspace declaration (`DeclarationIds`). The evaluation parameters u and v are pucks; the control
 * points stay the chooser and editor of Orodja (no point-valued parameter kind), the display switches are Orodja actions
 * and the camera stays the graph's own Orodja panel (a surface view has no view director). No readouts: the panels show none.
 */
export type TensorPatchIds = {
    param: typeof PATCH_PARAMETER_KEYS[PatchDirection];
    row: never;
    note: never;
    legend: "net" | "points" | "iso" | "boundary" | "surface" | "point";
    section: never;
    action: typeof TENSOR_SWITCHES[number][0] | "height-mode";
};

const INSET_BOUNDING_BOX:[number, number, number, number] = [-0.14, 1.14, 1.14, -0.14];

const DEFAULT_ISO_DENSITY: PatchDensity = 8;
const DEFAULT_SHADING_DENSITY: PatchDensity = 16;

const xyz = ([x, y, z]: Point3Dto): Xyz => [x, y, z];
const toCamera = (dto: PatchCameraDto): SurfaceCamera => ({az: dto.az, el: dto.el, distance: dto.distance, projection: dto.projection, target: xyz(dto.target)});
const fromCamera = (camera: SurfaceCamera): PatchCameraDto => ({az: camera.az, el: camera.el, distance: camera.distance, projection: camera.projection, target: [...camera.target]});
const netOf = (dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>}): Xyz[][] =>
    Array.from({length: dto.m + 1}, (_, i) => dto.net.slice(i * (dto.n + 1), (i + 1) * (dto.n + 1)).map(xyz));

/** The bicubic dome: the scene a fresh Demonstration starts with. */
const defaultDto = () => {
    const entry = defaultPatchPresets[1].data()[0];
    if (entry[0] !== "TensorProductBezierPatch") throw new Error("The default patch Preset is not a tensor patch.");
    return entry[1];
};

/**
 * `net` at `degree` in `direction`. Raising is exact elevation. Lowering replaces each row or column curve by the
 * lower-degree curve that interpolates it at k/degree (exact when the surface already has that degree, corners kept).
 */
export function netWithDegree(net: ReadonlyArray<ReadonlyArray<Xyz>>, direction: PatchDirection, degree: number): Xyz[][] {
    const current = direction === "u" ? net.length - 1 : net[0].length - 1;
    if (degree <= current) return degree === current ? net.map(row => row.map((p): Xyz => [...p])) : lowerNetDegree(net, direction, degree);
    let raised = patchFromNet(net);
    for (let d = current; d < degree; d++) raised = raised.elevate(direction);
    return raised.getControlNet().map(row => row.map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0]));
}

/** The state a tensor patch DTO describes; fields the DTO omits take the defaults. */
function stateFromDto(dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>; state?: PatchStateDto}): Omit<TensorPatchGraphState, "initialized" | "zMode" | "surfaceUnavailable"> {
    const fallback = defaultDto().state;
    const state = dto.state ?? {};
    const camera = state.camera ?? fallback?.camera;
    if (!camera) throw new Error("The default patch Preset has no camera.");
    return {
        m: dto.m, n: dto.n, net: netOf(dto), camera: toCamera(camera),
        u: state.u ?? 0.5, v: state.v ?? 0.5,
        showControlNet: state.showControlNet ?? true, showIsoCurves: state.showIsoCurves ?? true,
        showBoundaryCurves: state.showBoundaryCurves ?? true, showShading: state.showShading ?? true,
        showMovingVSection: false,
        isoDensity: state.isoDensity ?? DEFAULT_ISO_DENSITY, shadingDensity: state.shadingDensity ?? DEFAULT_SHADING_DENSITY,
    };
}

/**
 * The tensor-product Bezier patch Demonstration: a control net, its surface, iso-parameter curves and the point
 * S(u,v), shown in the JSXGraph surface view. The scene store holds every piece of patch state; Presets store it in the
 * DTO `state`.
 */
export default class TensorPatchGraph extends BaseSurfaceGraph<TensorPatchGraphState, PatchCollectionPresetData> {
    /** The u and v sweep animations; they write through `setParameter`, the parameters stay in the scene store. */
    private readonly sweeps: PatchSweeps;

    constructor(options: SurfaceGraphOptions = {}) {
        super(options);
        this.sweeps = new PatchSweeps({
            read: parameter => this.state[parameter],
            range: () => [0, 1],
            write: (parameter, value) => this.sweepWrite(parameter, value),
        }, options.scheduler);
    }

    protected override stopSweeps(): void {
        this.sweeps.stopAll();
        this.releaseSweepLease();
    }

    protected override pauseSweeps(): void {
        this.sweeps.pauseAll();
        this.releaseSweepLease();
    }

    // ---- Sweep writes under an animation lease (ADR 0064) ------------------------------------------------------

    /** The lease a running sweep writes its parameter under, while the parameter is bound in the arbiter. */
    private sweepLease?: {parameter: PatchDirection; lease: Lease};

    /**
     * A sweep frame's write. Where u and v are bound, the sweep leases its parameter and writes it as `animation`; a learner
     * or lesson write of that parameter ends the lease and stops the sweep. Elsewhere it is the plain setter.
     */
    private sweepWrite(parameter: PatchDirection, value: number): void {
        const arbiter = this.parameters, key = PATCH_PARAMETER_KEYS[parameter];
        if (!arbiter || !arbiter.keys().includes(key)) {
            this.setParameter(parameter, value);
            return;
        }
        if (this.sweepLease?.parameter !== parameter) {
            this.releaseSweepLease();
            let lease: Lease | undefined = undefined;
            lease = arbiter.lease([key], reason => {
                if (this.sweepLease?.lease === lease) this.sweepLease = undefined;
                if (reason !== "released") this.sweeps.apply(parameter, "stop");
            });
            if (!lease) {
                // The learner holds the parameter: the sweep does not run over it.
                this.sweeps.apply(parameter, "stop");
                return;
            }
            this.sweepLease = {parameter, lease};
        }
        this.sweepLease.lease.write(key, value);
    }

    private releaseSweepLease(): void {
        const held = this.sweepLease;
        this.sweepLease = undefined;
        held?.lease.release();
    }

    override getInitialState(): TensorPatchGraphState {
        return {initialized: false, surfaceUnavailable: false, zMode: false, ...stateFromDto(defaultDto())};
    }

    override presetCollection(): PresetCollection<PatchCollectionPresetData> {
        return patchPresetCollections["patch-tensor"];
    }

    override defaultPreset(): PatchCollectionPresetData {
        return defaultPatchPresets[1].data();
    }

    /** The `state` a Preset stores; a Demonstration with more state adds to it. */
    protected stateDto(): PatchStateDto {
        const s = this.state;
        return {
            camera: fromCamera(s.camera), u: s.u, v: s.v,
            showControlNet: s.showControlNet, showIsoCurves: s.showIsoCurves, showBoundaryCurves: s.showBoundaryCurves, showShading: s.showShading,
            isoDensity: s.isoDensity, shadingDensity: s.shadingDensity,
        };
    }

    /** The state a Preset's patch DTO sets; a Demonstration with more state adds to it. */
    protected stateOf(dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>; state?: PatchStateDto}): Partial<TensorPatchGraphState> {
        return stateFromDto(dto);
    }

    override exportPresetData(): PatchCollectionPresetData {
        return [["TensorProductBezierPatch", tensorPatchToDto(patchFromNet(this.state.net), this.stateDto())]];
    }

    /** The visibility switches this demonstration has; subclasses add theirs. */
    protected lessonVisibilitySetters(): Partial<Record<PatchVisibilityTarget, (visible: boolean) => void>> {
        return {
            "control-net": visible => this.setVisibility("showControlNet", visible),
            "iso-curves": visible => this.setVisibility("showIsoCurves", visible),
            "boundary-curves": visible => this.setVisibility("showBoundaryCurves", visible),
            "shading": visible => this.setVisibility("showShading", visible),
        };
    }

    /** The split and elevation operations of the demonstrations that have them. */
    protected lessonSubdivision(): TensorSubdivisionLessonHost | undefined {
        return undefined;
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(patchLessonActions({
            kind: "tensor",
            visibilityTargets: () => new Set(Object.keys(this.lessonVisibilitySetters()) as PatchVisibilityTarget[]),
            setVisibility: (target, visible) => this.lessonVisibilitySetters()[target]?.(visible),
            setParameters: (u, v) => this.setParameters(u, v),
            sweep: (parameter, command) => {
                if (command === "play" || command === "replay") this.setState({showMovingVSection: parameter === "v"});
                else if (command === "stop" && parameter === "v") this.setState({showMovingVSection: false});
                this.sweeps.apply(parameter, command);
                if (command === "stop" || command === "pause") this.releaseSweepLease();
            },
            applyCameraPreset: view => this.applyCameraPreset(view),
            subdivision: () => this.lessonSubdivision(),
        }));
    }

    protected override lessonPatchData(patch: LessonPatchFixture): PatchCollectionPresetData {
        return lessonPatchPresetData(patch, "tensor");
    }

    override importPresetData(data: PatchCollectionPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "TensorProductBezierPatch") return;
        this.setState(this.stateOf(entry[1]));
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    protected override buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene {
        return buildTensorScene({...this.state, ...(selectedPointId === undefined ? {} : {selectedPointId})}, revision);
    }

    protected override geometryChanged(previous: Readonly<TensorPatchGraphState>): boolean {
        const s = this.state;
        return s.net !== previous.net || s.showControlNet !== previous.showControlNet || s.showIsoCurves !== previous.showIsoCurves
            || s.showBoundaryCurves !== previous.showBoundaryCurves || s.showShading !== previous.showShading
            || s.isoDensity !== previous.isoDensity || s.shadingDensity !== previous.shadingDensity
            || s.showMovingVSection !== previous.showMovingVSection
            || ((s.showMovingVSection || previous.showMovingVSection) && s.v !== previous.v);
    }

    protected override hasPoint(pointId: string): boolean {
        const index = parsePatchPointId(pointId);
        return index !== undefined && index[0] <= this.state.m && index[1] <= this.state.n;
    }

    protected override movePoint(pointId: string, position: Xyz): void {
        const index = parsePatchPointId(pointId);
        if (index === undefined || !position.every(Number.isFinite)) return;
        const [i, j] = index;
        // A drag's start repeats the point's own position; keeping the net avoids a pointless geometry rebuild.
        if (this.state.net[i]?.[j]?.every((value, axis) => value === position[axis])) return;
        this.setState(this.settleNet({net: this.state.net.map((row, r) => r === i ? row.map((p, c): Xyz => c === j ? [...position] : p) : row)}));
    }

    /**
     * The state patch to write for a change of the control net (a point move or a degree change), with whatever a
     * Demonstration derives from the new net added in the same update; `patch.net` is the new net. Nothing by default.
     */
    protected settleNet(patch: Partial<TensorPatchGraphState> & {net: Xyz[][]}): Partial<TensorPatchGraphState> {
        return patch;
    }

    // ---- Operations the controls call --------------------------------------------------------------------------

    /**
     * Raising a degree is exact elevation. Lowering changes only the chosen direction: each row or column curve is
     * replaced by the lower-degree curve that interpolates it at k/degree. That is exact when the surface already has
     * the lower degree and keeps the corners; the other direction's control points are untouched.
     */
    setDegree(direction: PatchDirection, degree: number): void {
        const current = direction === "u" ? this.state.m : this.state.n;
        if (!Number.isInteger(degree) || degree < MIN_PATCH_DEGREE || degree > MAX_PATCH_DEGREE || degree === current) return;
        const net = netWithDegree(this.state.net, direction, degree);
        this.setState(this.settleNet({m: net.length - 1, n: net[0].length - 1, net}));
        this.selectPoint(this.selectedPointId);
    }

    setParameter(parameter: "u" | "v", value: number): void {
        if (!Number.isFinite(value)) return;
        const clamped = Math.min(1, Math.max(0, value));
        this.setState(parameter === "u" ? {u: clamped} : {v: clamped});
    }

    /** Sets both parameters in one write (the inset drag); non-finite values are ignored, others clamp to [0, 1]. */
    setParameters(u: number, v: number): void {
        if (!Number.isFinite(u) || !Number.isFinite(v)) return;
        this.setState({u: clamp(u, 0, 1), v: clamp(v, 0, 1)});
    }

    /** Selects control point `b_ij` like a click in the view; an index outside the net, or undefined, clears the selection. */
    selectIndex(i: number | undefined, j: number | undefined): void {
        if (i === undefined && j === undefined) {
            this.selectPoint(undefined);
            return;
        }
        const current = this.selectedPointId === undefined ? undefined : parsePatchPointId(this.selectedPointId);
        this.selectPoint(patchPointId(i ?? current?.[0] ?? 0, j ?? current?.[1] ?? 0));
    }

    /** Moves the selected control point to `xyz`; nothing happens without a selection or for a non-finite coordinate. */
    setSelectedCoordinates(xyz: Xyz): void {
        if (this.selectedPointId !== undefined) this.movePoint(this.selectedPointId, xyz);
    }

    /** Sets the orbit az or el from degrees; el stays within the range of the preset views. */
    setCameraAngle(angle: "az" | "el", degrees: number): void {
        if (!Number.isFinite(degrees)) return;
        const radians = degrees * Math.PI / 180;
        const camera = this.state.camera;
        const maxElevation = CAMERA_PRESETS.top.el;
        this.setSurfaceState({camera: angle === "az" ? {...camera, az: radians} : {...camera, el: clamp(radians, -maxElevation, maxElevation)}});
    }

    setVisibility(key: PatchVisibility, visible: boolean): void {
        this.setState({[key]: visible});
    }

    setDensity(kind: "iso" | "shading", density: PatchDensity): void {
        this.setState(kind === "iso" ? {isoDensity: density} : {shadingDensity: density});
    }

    applyCameraPreset(name: CameraPresetName): void {
        this.setSurfaceState({camera: presetCamera(name, this.state.camera)});
    }

    /** The points the view is fitted to: the control net; a Demonstration with a second net adds it. */
    protected framedPoints(): Xyz[] {
        return this.state.net.flat();
    }

    /** The authored az/el again, fitted to everything the view shows for the host's current shape. */
    resetView(): void {
        const authored = toCamera(defaultDto().state?.camera ?? fromCamera(this.state.camera));
        this.setSurfaceState({camera: fitCameraTo(this.framedPoints(), this.hostAspect(), authored)});
    }

    setZMode(zMode: boolean): void {
        this.setState({zMode});
    }

    /** The starting patches the Uredi buttons offer, in button order; a Demonstration may offer more. */
    protected startingPatches(): ReadonlyArray<DerivativesStartingPatch> {
        return defaultPatchPresets;
    }

    /** State a starting patch leaves as the student chose it; a Demonstration returns its switches here, written in the same update as the net. */
    protected startingPatchKept(): Partial<TensorPatchGraphState> {
        return {};
    }

    /** Replaces the patch with one of the starting patches (the Uredi buttons); the camera comes with it. */
    useStartingPatch(index: number): void {
        const preset = this.startingPatches()[index];
        if (!preset) return;
        const entry = preset.data()[0];
        if (entry?.[0] !== "TensorProductBezierPatch") return;
        this.setState({...this.stateOf(entry[1]), ...this.startingPatchKept()});
        this.selectPoint(this.selectedPointId);
    }

    /** The starting patch whose net, with its degrees, the patch has now; undefined (the "custom" entry) when it matches none. */
    startingPatchIndex(): number | undefined {
        const {m, n, net} = this.state;
        const index = this.startingPatches().findIndex(preset => {
            const entry = preset.data()[0];
            if (entry?.[0] !== "TensorProductBezierPatch" || entry[1].m !== m || entry[1].n !== n) return false;
            return entry[1].net.every((point, k) => point.every((coordinate, axis) => coordinate === net[Math.floor(k / (n + 1))][k % (n + 1)][axis]));
        });
        return index < 0 ? undefined : index;
    }

    // ---- Declaration (task 08, surface recipe) -----------------------------------------------------------------

    /**
     * Whether this Demonstration declares the board workspace. `patch-tensor` and the subclasses converted with it opt in; the
     * other subclasses (patch-subdivision, patch-joins) stay undeclared, with nothing bound, until their own conversion.
     */
    protected declaresTensorWorkspace(): boolean {
        return this.constructor === TensorPatchGraph;
    }

    /** u and v, bound to the panel's setter (clamped to [0, 1]), on the Demonstrations that declare the workspace. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        if (!this.declaresTensorWorkspace()) return {};
        const binding = (parameter: PatchDirection): ParameterBinding => ({
            read: () => this.state[parameter],
            apply: (value: unknown) => this.setParameter(parameter, Number(value)),
        });
        return {[PATCH_PARAMETER_KEYS.u]: binding("u"), [PATCH_PARAMETER_KEYS.v]: binding("v")};
    }

    /**
     * The tensor workspace's part of the declaration: u and v as board pucks (lessons ask the learner to move them while
     * watching the point and the sections), the legend of what the surface view draws, and the display switches as Orodja
     * actions. No marks, view or camera: a surface view has no `ViewAdapter`, so cards rely on placement.
     */
    protected tensorDeclaration(): GraphDeclaration<TensorPatchIds> {
        const s = this.state;
        const parameter = (direction: PatchDirection): RangeParameter<TensorPatchIds["param"]> => ({
            kind: "range", key: PATCH_PARAMETER_KEYS[direction], label: message(direction === "u" ? "patch_parameter_u" : "patch_parameter_v"),
            placement: "board", min: 0, max: 1, step: 0.01, maxDecimals: 2,
        });
        const legend: LegendEntry<TensorPatchIds>[] = [
            {id: "surface", label: message("patch_tensor_legend_surface"), kind: "area", object: "surface"},
            {id: "net", label: message("patch_tensor_legend_net"), kind: "line", object: "net"},
            {id: "points", label: message("patch_tensor_legend_points"), kind: "point", object: "points"},
            {id: "iso", label: message("patch_tensor_legend_iso"), kind: "line", object: "iso"},
            {id: "boundary", label: message("patch_tensor_legend_boundary"), kind: "line", object: "boundary"},
            {id: "point", label: message("patch_tensor_legend_point"), kind: "point", object: "point"},
        ];
        const tools = (id: TensorPatchIds["action"], label: ActionDeclaration["label"], pressed: boolean): ActionDeclaration<TensorPatchIds> =>
            ({id, label, placement: "tools", tab: "display", section: "display", enabled: true, pressed});
        const actions: ActionDeclaration<TensorPatchIds>[] = [
            ...TENSOR_SWITCHES.map(([id, key, label]) => tools(id, message(label), s[key])),
            tools("height-mode", message("patch_move_height"), s.zMode),
        ];
        return {parameters: [parameter("u"), parameter("v")], legend, actions};
    }

    protected override declaration(): GraphDeclaration | undefined {
        return this.declaresTensorWorkspace() ? this.tensorDeclaration() : undefined;
    }

    /** A display switch pressed as the learner: the method the panel's switch calls. A subclass hands the ids it does not own here. */
    override performAction(id: string): void {
        const s = this.state;
        const tensorSwitch = TENSOR_SWITCHES.find(([candidate]) => candidate === id);
        runAs("learner", () => {
            if (tensorSwitch !== undefined) this.setVisibility(tensorSwitch[1], !s[tensorSwitch[1]]);
            else if (id === "height-mode") this.setZMode(!s.zMode);
            else throw new Error("Unknown action");
        });
    }

    /**
     * What the surface view draws for a legend entry: the colour its renderer gives the role (`jsxStyles`) and whether the
     * scene holds it now (`buildTensorScene`). The net and its points follow the net switch, the iso and boundary curves and the
     * shaded mesh theirs; the point S(u, v) is always drawn. Nothing is drawn while the view could not start.
     */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (!this.declaresTensorWorkspace()) return undefined;
        const {showControlNet, showIsoCurves, showBoundaryCurves, showShading, surfaceUnavailable} = this.state;
        const drawn = (color: string, visible = true) => ({color, visible: visible && !surfaceUnavailable});
        switch (id) {
            case "surface": return drawn(MESH_STYLE.fill ?? cssColor(SURFACE_COLORS.surface), showShading);
            case "net": return drawn(polylineStyle("net").stroke, showControlNet);
            case "points": return drawn(cssColor(SURFACE_COLORS.point), showControlNet);
            case "iso": return drawn(polylineStyle("iso").stroke, showIsoCurves);
            case "boundary": return drawn(polylineStyle("boundary").stroke, showBoundaryCurves);
            case "point": return drawn(markerColor("evaluated"));
            default: return undefined;
        }
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected readonly panelActions: TensorPatchPanelActions = {
        useStartingPatch: index => this.useStartingPatch(index),
        startingPatchIndex: () => this.startingPatchIndex(),
        setDegree: (direction, degree) => this.setDegree(direction, degree),
        setParameter: (parameter, value) => this.setParameter(parameter, value),
        setVisibility: (key, visible) => this.setVisibility(key, visible),
        setDensity: (kind, density) => this.setDensity(kind, density),
        applyCameraPreset: name => this.applyCameraPreset(name),
        resetView: () => this.resetView(),
        setZMode: zMode => this.setZMode(zMode),
        selectIndex: (i, j) => this.selectIndex(i, j),
        setSelectedCoordinates: coordinates => this.setSelectedCoordinates(coordinates),
        setCameraAngle: (angle, degrees) => this.setCameraAngle(angle, degrees),
        setInsetContainer: container => this.setInsetContainer(container),
    };

    protected selection(): PatchSelection | undefined {
        const index = this.selectedPointId === undefined ? undefined : parsePatchPointId(this.selectedPointId);
        if (index === undefined || index[0] > this.state.m || index[1] > this.state.n) return undefined;
        const [i, j] = index;
        const {m, n, u, v, net} = this.state;
        return {i, j, xyz: net[i][j], weight: patchBernsteinWeight(m, n, i, j, u, v)};
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.unavailableNotice()}<TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions} netFirst puckKeys={this.puckKeys()}/></>;
    }

    /** The u and v keys the board pucks own, on a Demonstration that declares the workspace (the Uredi sliders then give way). */
    protected puckKeys(): typeof PATCH_PARAMETER_KEYS | undefined {
        return this.declaresTensorWorkspace() ? PATCH_PARAMETER_KEYS : undefined;
    }

    // ---- Parameter-domain inset --------------------------------------------------------------------------------

    private insetContainer?: HTMLElement;
    protected inset?: ParameterInset;

    /**
     * Shows the unit square of (u, v) in `container`, a JSXGraph board owned by the session; null (or a new container)
     * releases the previous board. The panel calls this from a ref, so the board lives as long as the control does.
     */
    protected setInsetContainer(container: HTMLElement | null): void {
        if (container === (this.insetContainer ?? null) && this.inset) return;
        this.releaseInset();
        this.insetContainer = container ?? undefined;
        this.mountInset();
    }

    private releaseInset(): void {
        const inset = this.inset;
        this.inset = undefined;
        inset?.release();
    }

    private mountInset(): void {
        const session = this.graphSession, container = this.insetContainer;
        if (!container || !session?.isAlive || this.inset) return;
        const inset = mountParameterInset(session, container, {
            boundingBox: INSET_BOUNDING_BOX,
            build: board => {
                board.create("polygon", [[0, 0], [1, 0], [1, 1], [0, 1]], {
                    vertices: {visible: false}, fixed: true, hasInnerPoints: false, fillColor: "#eef2e6", fillOpacity: 1,
                    highlightFillColor: "#eef2e6", highlightFillOpacity: 1, borders: {strokeColor: "#526950", strokeWidth: 2, highlight: false, fixed: true},
                });
                board.create("text", [1.04, -0.09, "u"], {fixed: true, fontSize: 14, strokeColor: "#2f3b2e", highlight: false});
                board.create("text", [-0.09, 1.04, "v"], {fixed: true, fontSize: 14, strokeColor: "#2f3b2e", highlight: false});
                return board.create("point", [this.state.u, this.state.v], {
                    name: "", size: 6, fillColor: "#ca5c37", strokeColor: "#ca5c37", highlightFillColor: "#ca5c37", highlightStrokeColor: "#ca5c37",
                    showInfobox: false, snapToGrid: false,
                });
            },
            constrain: (u, v) => [clamp(u, 0, 1), clamp(v, 0, 1)],
            // A JSXGraph drag is outside the DOM handlers the learner-input tagging sees.
            onDrag: (u, v) => runAs("learner", () => this.setParameters(u, v)),
            onSessionEnd: () => { if (this.inset === inset) this.inset = undefined; },
        });
        this.inset = inset;
    }

    /** The inset dot follows the store: sliders, Reset, Presets and lesson scene writes all move it. */
    private syncInset(): void {
        const point = this.inset?.point;
        if (!point || (point.X() === this.state.u && point.Y() === this.state.v)) return;
        point.moveTo([this.state.u, this.state.v]);
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        // A panel that stayed mounted across a remount asks again for its board.
        this.mountInset();
    }

    protected override onStateChange(previous: Readonly<TensorPatchGraphState>): void {
        super.onStateChange(previous);
        this.syncInset();
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}/>;
    }
}
