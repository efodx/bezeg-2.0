import type React from "react";
import type {Polygon} from "jsxgraph";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {TransientState} from "../base/BaseGraph";
import type {LessonPatchFixture} from "../../learning/model";
import {lessonPatchPresetData} from "./lessonPatchFixture";
import {PatchSweeps} from "./patchSweep";
import {patchLessonActions, triangularComparisonLessonActions} from "./patchLessonActions";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import BaseSurfaceGraph, {SurfaceGraphOptions, SurfaceGraphState} from "./BaseSurfaceGraph";
import {PatchCameraDto, PatchCollectionPresetData, PatchStateDto, Point3Dto, triangularPatchToDto} from "./patchDto";
import {defaultTriangularPatchPresets, patchPresetCollections} from "./patchPresetCollections";
import type {PatchDensity} from "./patchSceneBuilder";
import {barycentricW, TriangularPatchDisplayPanel, TriangularPatchEditPanel, TriangularPatchPanelActions, TriangularSelection, TriangularVisibilityKey} from "./TriangularPatchPanels";
import {triangularBernsteinWeight} from "./patchBernstein";
import {changeTriangularDegree, defaultTriangularNet, MAX_TRIANGULAR_DEGREE, MIN_TRIANGULAR_DEGREE, triangularFromNet} from "./TriangularPatchDegree";
import {parseTriangularPointId, triangularIndex, triangularPointId} from "./TriangularPatchLattice";
import {buildTriangularScene, isInteriorPoint} from "./TriangularPatchScene";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, RangeParameter, ReadoutGroup, ReadoutNote} from "../base/declare/graphDeclaration";
import type {Lease, ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PATCH_PARAMETER_KEYS} from "./TensorPatchGraph";
import {formatNumber} from "../../analysis/format";
import {currentLanguage, message} from "../../localization";
import {subscriptDigits} from "./TensorPatchPanels";
import {cssColor, MESH_STYLE, markerColor, polylineStyle} from "./surface-view/jsxStyles";
import {SURFACE_COLORS} from "./surface-view/surfaceStyles";
import {mountParameterInset, ParameterInset} from "./parameterInset";
import {clampToTriangle} from "./triangleDomain";
import type {GraphSession} from "../base/GraphSession";
import {CAMERA_PRESETS, CameraPresetName, clamp, fitCameraTo, presetCamera} from "./surface-view/surfaceMath";
import type {SurfaceCamera, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

const TRIANGULAR_VISIBILITY_KEYS = {
    "control-net": "showControlNet", "iso-curves": "showIsoCurves", "boundary-curves": "showBoundaryCurves",
    "shading": "showShading", "decasteljau-scheme": "showDeCasteljau",
} as const;

/** The display switches the declaration names as Orodja actions: action id, state field, label key. */
const TRIANGULAR_SWITCHES = [
    ["control-net", "showControlNet", "patch_show_control_net"],
    ["iso-curves", "showIsoCurves", "patch_show_iso_curves"],
    ["boundary-curves", "showBoundaryCurves", "patch_show_boundary_curves"],
    ["decasteljau-scheme", "showDeCasteljau", "de_casteljau_construction"],
    ["shading", "showShading", "patch_show_shading"],
] as const satisfies ReadonlyArray<readonly [string, TriangularVisibilityKey, string]>;

/**
 * The ids of the triangular patch declaration (`DeclarationIds`). The parameters are u and v as board pucks: the demonstration
 * prompt `prompt_patch_barycentric` ("Premikaj u in v ter opazuj w") asks the learner to move them while reading w; the Uredi
 * sliders give way to them and the inset stays; the camera stays the graph's own Orodja panel. The rows are the old panel's
 * readouts (w, and the Bernstein weight of a selected point), the legend one entry per scene role.
 */
export type TriangularIds = {
    param: typeof PATCH_PARAMETER_KEYS["u" | "v"];
    row: "w" | "bernstein-weight";
    note: "w" | "bernstein";
    legend: "surface" | "net" | "points" | "highlight" | "iso-u" | "iso-v" | "iso-w" | "boundary" | "construction" | "compare" | "point";
    section: never;
    action: typeof TRIANGULAR_SWITCHES[number][0] | "subdivision-preview" | "tensor-comparison" | "height-mode";
};

export interface TriangularPatchGraphState extends SurfaceGraphState {
    /** The degree; the net has `(n + 1)(n + 2) / 2` points. */
    n: number;
    /** Canonical order (index 0 is `b_(n,0,0)`); replaced (never edited in place) on every change. */
    net: Xyz[];
    /** The barycentric parameters of the point `S(u, v, w)`; `w = 1 - u - v`, so `u, v >= 0` and `u + v <= 1`. */
    u: number;
    v: number;
    showControlNet: boolean;
    showIsoCurves: boolean;
    showBoundaryCurves: boolean;
    showShading: boolean;
    showDeCasteljau: boolean;
    isoDensity: PatchDensity;
    shadingDensity: PatchDensity;
    /** Vertical-drag mode of the view; a mode of the session, not saved in Presets. */
    zMode: boolean;
}

const DEFAULT_ISO_DENSITY: PatchDensity = 8;
const DEFAULT_SHADING_DENSITY: PatchDensity = 16;
const CENTROID = 1 / 3;
const INSET_BOUNDING_BOX: [number, number, number, number] = [-0.2, 1.2, 1.2, -0.2];
const INSET_TEXT = {fixed: true, fontSize: 13, strokeColor: "#2f3b2e", highlight: false};

const xyz = ([x, y, z]: Point3Dto): Xyz => [x, y, z];
const toCamera = (dto: PatchCameraDto): SurfaceCamera => ({az: dto.az, el: dto.el, distance: dto.distance, projection: dto.projection, target: xyz(dto.target)});
const fromCamera = (camera: SurfaceCamera): PatchCameraDto => ({az: camera.az, el: camera.el, distance: camera.distance, projection: camera.projection, target: [...camera.target]});

/** The cubic patch: the scene a fresh Demonstration starts with. */
const defaultDto = () => {
    const entry = defaultTriangularPatchPresets[2].data()[0];
    if (entry[0] !== "TriangularBezierPatch") throw new Error("The default triangular patch Preset is not a triangular patch.");
    return entry[1];
};

/**
 * The state a triangular patch DTO describes; fields the DTO omits take the defaults, and a lone `u` or `v` keeps `u + v <= 1`.
 * The DTO check tolerates rounding of a pair summing to 1 that the evaluation rejects, so `v` is clamped to `1 - u`.
 */
function stateFromDto(dto: {n: number; net: ReadonlyArray<Point3Dto>; state?: PatchStateDto}): Omit<TriangularPatchGraphState, "initialized" | "zMode" | "surfaceUnavailable"> {
    const fallback = defaultDto().state;
    const state = dto.state ?? {};
    const camera = state.camera ?? fallback?.camera;
    if (!camera) throw new Error("The default triangular patch Preset has no camera.");
    const u = state.u ?? Math.min(CENTROID, 1 - (state.v ?? 0));
    const v = Math.min(state.v ?? CENTROID, 1 - u);
    return {
        n: dto.n, net: dto.net.map(xyz), camera: toCamera(camera), u, v,
        showControlNet: state.showControlNet ?? true, showIsoCurves: state.showIsoCurves ?? true,
        showBoundaryCurves: state.showBoundaryCurves ?? true, showShading: state.showShading ?? true, showDeCasteljau: state.showDeCasteljau ?? false,
        isoDensity: state.isoDensity ?? DEFAULT_ISO_DENSITY, shadingDensity: state.shadingDensity ?? DEFAULT_SHADING_DENSITY,
    };
}

/**
 * The triangular Bezier patch Demonstration: a triangular control net, its surface, three iso-line families, the
 * boundary curves and the point S(u, v, w), shown in the JSXGraph surface view. The scene store holds every piece of patch
 * state; Presets store it in the DTO `state`. The three-piece split preview is transient (not in a Preset).
 */
export default class TriangularPatchGraph extends BaseSurfaceGraph<TriangularPatchGraphState, PatchCollectionPresetData> {
    /** Transient: whether the split at (u, v, w) is drawn. */
    private subdivisionPreviewValue = false;
    /** Transient: whether the tensor patch derived from the net is drawn, and the unit square shown in the inset. */
    private tensorComparisonValue = false;

    /**
     * The u and v sweep animations. A sweep of u runs from 0 to 1 - v with v fixed (and v from 0 to 1 - u), a segment
     * of the triangle that keeps w = 1 - u - v non-negative; the value is written through `setParameter`.
     */
    private readonly sweeps: PatchSweeps;

    constructor(options: SurfaceGraphOptions = {}) {
        super(options);
        this.sweeps = new PatchSweeps({
            read: parameter => this.state[parameter],
            range: parameter => [0, Math.max(0, 1 - this.state[parameter === "u" ? "v" : "u"])],
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

    // ---- Sweep writes under an animation lease (ADR 0064), as in TensorPatchGraph ------------------------------

    /** The lease a running sweep writes its parameter under, while the parameter is bound in the arbiter. */
    private sweepLease?: {parameter: "u" | "v"; lease: Lease};

    /**
     * A sweep frame's write. Where u and v are bound, the sweep leases its parameter and writes it as `animation`; a learner
     * or lesson write of that parameter ends the lease and stops the sweep. Elsewhere it is the plain setter.
     */
    private sweepWrite(parameter: "u" | "v", value: number): void {
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

    /** u and v, bound to `setParameter` (each clamped to `[0, 1 - other]`, so `u + v <= 1`). */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const binding = (parameter: "u" | "v"): ParameterBinding => ({
            read: () => this.state[parameter],
            apply: (value: unknown) => this.setParameter(parameter, Number(value)),
        });
        return {[PATCH_PARAMETER_KEYS.u]: binding("u"), [PATCH_PARAMETER_KEYS.v]: binding("v")};
    }

    override getInitialState(): TriangularPatchGraphState {
        return {initialized: false, surfaceUnavailable: false, zMode: false, ...stateFromDto(defaultDto())};
    }

    override presetCollection(): PresetCollection<PatchCollectionPresetData> {
        return patchPresetCollections["patch-triangular"];
    }

    override defaultPreset(): PatchCollectionPresetData {
        return defaultTriangularPatchPresets[2].data();
    }

    override exportPresetData(): PatchCollectionPresetData {
        const s = this.state;
        const dto = triangularPatchToDto(triangularFromNet(s.net), {
            camera: fromCamera(s.camera), u: s.u, v: s.v,
            showControlNet: s.showControlNet, showIsoCurves: s.showIsoCurves, showBoundaryCurves: s.showBoundaryCurves, showShading: s.showShading,
            showDeCasteljau: s.showDeCasteljau, isoDensity: s.isoDensity, shadingDensity: s.shadingDensity,
        });
        return [["TriangularBezierPatch", dto]];
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(patchLessonActions({
            kind: "triangular",
            visibilityTargets: () => new Set(["control-net", "iso-curves", "boundary-curves", "shading", "decasteljau-scheme"] as const),
            setVisibility: (target, visible) => this.setVisibility(TRIANGULAR_VISIBILITY_KEYS[target as keyof typeof TRIANGULAR_VISIBILITY_KEYS], visible),
            setParameters: (u, v) => this.setParameters(u, v),
            sweep: (parameter, command) => {
                this.sweeps.apply(parameter, command);
                if (command === "stop" || command === "pause") this.releaseSweepLease();
            },
            applyCameraPreset: view => this.applyCameraPreset(view),
            subdivision: () => ({
                kind: "triangular",
                degree: () => this.state.n,
                maxDegree: () => MAX_TRIANGULAR_DEGREE,
                elevate: () => this.setDegree(this.state.n + 1),
                showSplitPreview: () => this.setSubdivisionPreview(true),
            }),
        }));
        registry.use(triangularComparisonLessonActions({setComparison: visible => this.setTensorComparison(visible)}));
    }

    protected override lessonPatchData(patch: LessonPatchFixture): PatchCollectionPresetData {
        return lessonPatchPresetData(patch, "triangular");
    }

    override importPresetData(data: PatchCollectionPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "TriangularBezierPatch") return;
        this.setState(stateFromDto(entry[1]));
    }

    // ---- Transient state ---------------------------------------------------------------------------------------

    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), subdivisionPreview: this.subdivisionPreviewValue, tensorComparison: this.tensorComparisonValue};
    }

    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.subdivisionPreviewValue = saved?.subdivisionPreview === true;
        this.tensorComparisonValue = saved?.tensorComparison === true;
        this.syncInsetSquare();
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    protected override buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene {
        return buildTriangularScene({
            ...this.state, subdivisionPreview: this.subdivisionPreviewValue, compareTensor: this.tensorComparisonValue, ...(selectedPointId === undefined ? {} : {selectedPointId}),
        }, revision);
    }

    protected override geometryChanged(previous: Readonly<TriangularPatchGraphState>): boolean {
        const s = this.state;
        // The construction and the split follow (u, v), so they make a parameter change a geometry change too.
        return s.net !== previous.net || s.showControlNet !== previous.showControlNet || s.showIsoCurves !== previous.showIsoCurves
            || s.showBoundaryCurves !== previous.showBoundaryCurves || s.showShading !== previous.showShading || s.showDeCasteljau !== previous.showDeCasteljau
            || s.isoDensity !== previous.isoDensity || s.shadingDensity !== previous.shadingDensity
            || ((s.showDeCasteljau || this.subdivisionPreviewValue) && (s.u !== previous.u || s.v !== previous.v));
    }

    protected override hasPoint(pointId: string): boolean {
        const index = parseTriangularPointId(pointId);
        return index !== undefined && index[0] + index[1] + index[2] === this.state.n;
    }

    protected override movePoint(pointId: string, position: Xyz): void {
        const index = parseTriangularPointId(pointId);
        if (index === undefined || !this.hasPoint(pointId) || !position.every(Number.isFinite)) return;
        const at = triangularIndex(this.state.n, index[0], index[1]);
        // A drag's start repeats the point's own position; keeping the net avoids a pointless geometry rebuild.
        if (this.state.net[at].every((value, axis) => value === position[axis])) return;
        this.setState({net: this.state.net.map((p, k): Xyz => k === at ? [...position] : p)});
    }

    // ---- Operations the controls call --------------------------------------------------------------------------

    /**
     * Raising the degree is exact elevation. Lowering interpolates the surface at the lattice points `(i, j, k)/degree`:
     * exact when the surface already has the lower degree, otherwise an approximation that keeps the three corners.
     * A selected point of the old degree is cleared (its index names no point of the new net).
     */
    setDegree(degree: number): void {
        const current = this.state.n;
        if (!Number.isInteger(degree) || degree < MIN_TRIANGULAR_DEGREE || degree > MAX_TRIANGULAR_DEGREE || degree === current) return;
        this.setState({n: degree, net: changeTriangularDegree(this.state.net, current, degree)});
        this.selectPoint(this.selectedPointId);
    }

    /** Sets `u` or `v`, clamped so that `u, v >= 0` and `u + v <= 1` (`w = 1 - u - v` follows). Non-finite values are ignored. */
    setParameter(parameter: "u" | "v", value: number): void {
        if (!Number.isFinite(value)) return;
        const other = parameter === "u" ? this.state.v : this.state.u;
        const clamped = clamp(value, 0, Math.max(0, 1 - other));
        this.setState(parameter === "u" ? {u: clamped} : {v: clamped});
    }

    /** Sets both parameters in one write (the inset drag); non-finite values are ignored, others move to the nearest point of the triangle. */
    setParameters(u: number, v: number): void {
        if (!Number.isFinite(u) || !Number.isFinite(v)) return;
        const [clampedU, clampedV] = clampToTriangle(u, v);
        this.setState({u: clampedU, v: clampedV});
    }

    /** Selects control point `b_ijk` like a click in the view; an index outside the net, or undefined, clears the selection. */
    selectIndex(index: readonly [number, number, number] | undefined): void {
        this.selectPoint(index === undefined ? undefined : triangularPointId(...index));
    }

    /** Moves the selected control point to `xyz`; nothing happens without a selection or for a non-finite coordinate. */
    setSelectedCoordinates(position: Xyz): void {
        if (this.selectedPointId !== undefined) this.movePoint(this.selectedPointId, position);
    }

    /** Shows or hides the split of the patch into three at (u, v, w); transient. */
    setSubdivisionPreview(visible: boolean): void {
        if (visible === this.subdivisionPreviewValue) return;
        this.subdivisionPreviewValue = visible;
        this.redrawGeometry();
    }

    /** Shows or hides the tensor patch derived from the net and the unit square in the inset; transient. */
    setTensorComparison(visible: boolean): void {
        if (visible === this.tensorComparisonValue) return;
        this.tensorComparisonValue = visible;
        this.syncInsetSquare();
        this.redrawGeometry();
    }

    /** Sets the orbit az or el from degrees; el stays within the range of the preset views. */
    setCameraAngle(angle: "az" | "el", degrees: number): void {
        if (!Number.isFinite(degrees)) return;
        const radians = degrees * Math.PI / 180;
        const camera = this.state.camera;
        const maxElevation = CAMERA_PRESETS.top.el;
        this.setSurfaceState({camera: angle === "az" ? {...camera, az: radians} : {...camera, el: clamp(radians, -maxElevation, maxElevation)}});
    }

    setVisibility(key: TriangularVisibilityKey, visible: boolean): void {
        this.setState({[key]: visible});
    }

    setDensity(kind: "iso" | "shading", density: PatchDensity): void {
        this.setState(kind === "iso" ? {isoDensity: density} : {shadingDensity: density});
    }

    applyCameraPreset(name: CameraPresetName): void {
        this.setSurfaceState({camera: presetCamera(name, this.state.camera)});
    }

    /** The authored az/el again, fitted to the whole net for the host's current shape. */
    resetView(): void {
        const authored = toCamera(defaultDto().state?.camera ?? fromCamera(this.state.camera));
        this.setSurfaceState({camera: fitCameraTo(this.state.net, this.hostAspect(), authored)});
    }

    setZMode(zMode: boolean): void {
        this.setState({zMode});
    }

    /** Replaces the patch with the canonical default net of a degree (the Uredi "starting patch" buttons); the camera comes with it. */
    useStartingPatch(index: number): void {
        const preset = defaultTriangularPatchPresets[index];
        if (!preset) return;
        this.importPresetData(preset.data());
        this.selectPoint(this.selectedPointId);
    }

    /** The starting patch the current net equals exactly (degree and every point), or undefined for an edited or imported net. */
    startingPatchIndex(): number | undefined {
        const {n, net} = this.state;
        const index = defaultTriangularPatchPresets.findIndex(preset => preset.degree === n);
        if (index < 0) return undefined;
        const canonical = defaultTriangularNet(n);
        return net.length === canonical.length && net.every((point, k) => point.every((value, axis) => value === canonical[k][axis])) ? index : undefined;
    }

    // ---- Declaration (task 08, surface recipe) -----------------------------------------------------------------

    /**
     * u and v as board range pucks whose maximum follows `1 - other` (`prompt_patch_barycentric`: "Premikaj u in v ter opazuj w"),
     * the old panel's readouts as rows (the Bernstein weight of a selected point, then w) with their help sentences as notes, the
     * legend of what the surface view draws, and the switches as Orodja actions. No marks, view or camera: a surface view has no
     * `ViewAdapter`, so cards rely on placement.
     */
    protected override declaration(): GraphDeclaration<TriangularIds> {
        const s = this.state;
        const language = currentLanguage();
        const selection = this.selection();
        const readouts: ReadoutGroup<TriangularIds>[] = [];
        const notes: ReadoutNote<TriangularIds>[] = [];
        if (selection) {
            const [i, j, k] = selection.index;
            readouts.push({id: "bernstein", title: message("patch_bernstein_heading"), rows: [{
                id: "bernstein-weight", name: message("patch_triangular_bernstein_weight", {value0: subscriptDigits(i), value1: subscriptDigits(j), value2: subscriptDigits(k)}),
                value: {kind: "formatted", text: formatNumber(selection.weight, language, 4)},
            }]});
            notes.push({id: "bernstein", text: message("patch_triangular_bernstein_help"), tone: "muted"});
        }
        readouts.push({id: "w", title: message("patch_parameter_w"), rows: [{id: "w", symbol: "w", value: {kind: "formatted", text: formatNumber(barycentricW(s.u, s.v), language, 2)}}]});
        notes.push({id: "w", text: message("patch_parameter_w_help"), tone: "muted"});
        type LegendKey = "patch_tensor_legend_surface" | "patch_tensor_legend_net" | "patch_tensor_legend_points" | "patch_tensor_legend_boundary"
            | "patch_triangular_legend_highlight" | "patch_triangular_legend_iso_u" | "patch_triangular_legend_iso_v" | "patch_triangular_legend_iso_w"
            | "patch_triangular_legend_construction" | "patch_triangular_legend_compare" | "patch_triangular_legend_point";
        const entry = (id: TriangularIds["legend"], label: LegendKey, kind: LegendEntry["kind"]): LegendEntry<TriangularIds> =>
            ({id, label: message(label), kind, object: id});
        const legend: LegendEntry<TriangularIds>[] = [
            entry("surface", "patch_tensor_legend_surface", "area"),
            entry("net", "patch_tensor_legend_net", "line"),
            entry("points", "patch_tensor_legend_points", "point"),
            entry("highlight", "patch_triangular_legend_highlight", "line"),
            entry("iso-u", "patch_triangular_legend_iso_u", "line"),
            entry("iso-v", "patch_triangular_legend_iso_v", "dashed"),
            entry("iso-w", "patch_triangular_legend_iso_w", "dashed"),
            entry("boundary", "patch_tensor_legend_boundary", "line"),
            entry("construction", "patch_triangular_legend_construction", "line"),
            entry("compare", "patch_triangular_legend_compare", "dashed"),
            entry("point", "patch_triangular_legend_point", "point"),
        ];
        const tools = (id: TriangularIds["action"], label: ActionDeclaration["label"], tab: "edit" | "display", section: string, pressed: boolean): ActionDeclaration<TriangularIds> =>
            ({id, label, placement: "tools", tab, section, enabled: true, pressed});
        const actions: ActionDeclaration<TriangularIds>[] = [
            tools("subdivision-preview", message("patch_subdivision_show"), "edit", "subdivision", this.subdivisionPreviewValue),
            ...TRIANGULAR_SWITCHES.map(([id, key, label]) => tools(id, message(label), "display", "display", s[key])),
            tools("tensor-comparison", message("patch_compare_show"), "display", "display", this.tensorComparisonValue),
            tools("height-mode", message("patch_move_height"), "display", "display", s.zMode),
        ];
        const parameter = (direction: "u" | "v"): RangeParameter<TriangularIds["param"]> => ({
            kind: "range", key: PATCH_PARAMETER_KEYS[direction], label: message(direction === "u" ? "patch_parameter_u" : "patch_parameter_v"),
            placement: "board", min: 0, max: Math.max(0, 1 - s[direction === "u" ? "v" : "u"]), step: 0.01, maxDecimals: 2,
        });
        return {parameters: [parameter("u"), parameter("v")], readouts, notes, legend, actions};
    }

    /** A switch pressed as the learner: the method the panel's switch calls. */
    override performAction(id: string): void {
        const s = this.state;
        const visibility = TRIANGULAR_SWITCHES.find(([candidate]) => candidate === id);
        runAs("learner", () => {
            if (visibility !== undefined) this.setVisibility(visibility[1], !s[visibility[1]]);
            else if (id === "subdivision-preview") this.setSubdivisionPreview(!this.subdivisionPreviewValue);
            else if (id === "tensor-comparison") this.setTensorComparison(!this.tensorComparisonValue);
            else if (id === "height-mode") this.setZMode(!s.zMode);
            else throw new Error("Unknown action");
        });
    }

    /**
     * What the surface view draws for a legend entry: the colour its renderer gives the role (`jsxStyles`) and whether
     * `buildTriangularScene` holds it now. The net, its points and the lines through a selected point follow the net switch;
     * the iso and boundary families theirs (the split's three cut curves are drawn as boundary curves); the construction nets
     * are the de Casteljau levels (degree above 1) and the three pieces of an interior split; the tensor patch is its net and
     * curves while the comparison is on; the point S(u, v, w) is always drawn. Nothing is drawn while the view could not start.
     */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const {n, u, v, showControlNet, showIsoCurves, showBoundaryCurves, showShading, showDeCasteljau, surfaceUnavailable} = this.state;
        const split = this.subdivisionPreviewValue && isInteriorPoint(u, v);
        const drawn = (color: string, visible = true) => ({color, visible: visible && !surfaceUnavailable});
        switch (id) {
            case "surface": return drawn(MESH_STYLE.fill ?? cssColor(SURFACE_COLORS.surface), showShading);
            case "net": return drawn(polylineStyle("net").stroke, showControlNet);
            case "points": return drawn(cssColor(SURFACE_COLORS.point), showControlNet);
            case "highlight": return drawn(polylineStyle("highlight").stroke, showControlNet && this.selection() !== undefined);
            case "iso-u": return drawn(polylineStyle("iso").stroke, showIsoCurves);
            case "iso-v": return drawn(polylineStyle("iso-v").stroke, showIsoCurves);
            case "iso-w": return drawn(polylineStyle("iso-w").stroke, showIsoCurves);
            case "boundary": return drawn(polylineStyle("boundary").stroke, showBoundaryCurves || split);
            case "construction": return drawn(polylineStyle("construction").stroke, (showDeCasteljau && n > 1) || split);
            case "compare": return drawn(polylineStyle("compare").stroke, this.tensorComparisonValue && (showControlNet || showIsoCurves || showBoundaryCurves));
            case "point": return drawn(markerColor("evaluated"));
            default: return undefined;
        }
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    private readonly panelActions: TriangularPatchPanelActions = {
        useStartingPatch: index => this.useStartingPatch(index),
        startingPatchIndex: () => this.startingPatchIndex(),
        setDegree: degree => this.setDegree(degree),
        setParameter: (parameter, value) => this.setParameter(parameter, value),
        setSubdivisionPreview: visible => this.setSubdivisionPreview(visible),
        setTensorComparison: visible => this.setTensorComparison(visible),
        selectIndex: index => this.selectIndex(index),
        setSelectedCoordinates: coordinates => this.setSelectedCoordinates(coordinates),
        setVisibility: (key, visible) => this.setVisibility(key, visible),
        setDensity: (kind, density) => this.setDensity(kind, density),
        applyCameraPreset: name => this.applyCameraPreset(name),
        resetView: () => this.resetView(),
        setZMode: zMode => this.setZMode(zMode),
        setCameraAngle: (angle, degrees) => this.setCameraAngle(angle, degrees),
        setInsetContainer: container => this.setInsetContainer(container),
    };

    private selection(): TriangularSelection | undefined {
        const index = this.selectedPointId === undefined ? undefined : parseTriangularPointId(this.selectedPointId);
        if (index === undefined || index[0] + index[1] + index[2] !== this.state.n) return undefined;
        const {n, u, v, net} = this.state;
        return {index, xyz: net[triangularIndex(n, index[0], index[1])], weight: triangularBernsteinWeight(n, index, [u, v, barycentricW(u, v)])};
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.unavailableNotice()}<TriangularPatchEditPanel state={{...this.state, subdivisionPreview: this.subdivisionPreviewValue, compareTensor: this.tensorComparisonValue}}
                                                                 selection={this.selection()} actions={this.panelActions} puckKeys={PATCH_PARAMETER_KEYS}/></>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TriangularPatchDisplayPanel state={{...this.state, subdivisionPreview: this.subdivisionPreviewValue, compareTensor: this.tensorComparisonValue}} actions={this.panelActions}/>;
    }

    // ---- Parameter-domain inset --------------------------------------------------------------------------------

    private insetContainer?: HTMLElement;
    protected inset?: ParameterInset;
    /** The unit square of the tensor patch's domain around the triangle; drawn only while the comparison is on. */
    protected insetSquare?: Polygon;

    /**
     * Shows the reference triangle of (u, v) in `container`, a JSXGraph board owned by the session; null (or a new
     * container) releases the previous board. The panel calls this from a ref, so the board lives as long as the control does.
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
        this.insetSquare = undefined;
        inset?.release();
    }

    private mountInset(): void {
        const session = this.graphSession, container = this.insetContainer;
        if (!container || !session?.isAlive || this.inset) return;
        const inset = mountParameterInset(session, container, {
            boundingBox: INSET_BOUNDING_BOX,
            build: board => {
                // Below the triangle, so the filled triangle reads as the lower-left half of the square.
                this.insetSquare = board.create("polygon", [[0, 0], [1, 0], [1, 1], [0, 1]], {
                    vertices: {visible: false}, fixed: true, hasInnerPoints: false, fillColor: "none", highlight: false,
                    borders: {strokeColor: "#0b7a75", strokeWidth: 2, dash: 2, highlight: false, fixed: true},
                });
                this.syncInsetSquare();
                board.create("polygon", [[0, 0], [1, 0], [0, 1]], {
                    vertices: {visible: false}, fixed: true, hasInnerPoints: false, fillColor: "#eef2e6", fillOpacity: 1,
                    highlightFillColor: "#eef2e6", highlightFillOpacity: 1, borders: {strokeColor: "#526950", strokeWidth: 2, highlight: false, fixed: true},
                });
                // Each vertex is where one barycentric coordinate is 1.
                board.create("text", [0.8, -0.13, "u = 1"], INSET_TEXT);
                board.create("text", [0.05, 1.06, "v = 1"], INSET_TEXT);
                board.create("text", [-0.17, -0.13, "w = 1"], INSET_TEXT);
                return board.create("point", [this.state.u, this.state.v], {
                    name: "", size: 6, fillColor: "#ca5c37", strokeColor: "#ca5c37", highlightFillColor: "#ca5c37", highlightStrokeColor: "#ca5c37",
                    showInfobox: false, snapToGrid: false,
                });
            },
            constrain: clampToTriangle,
            onDrag: (u, v) => runAs("learner", () => this.setParameters(u, v)),
            onSessionEnd: () => { if (this.inset === inset) { this.inset = undefined; this.insetSquare = undefined; } },
        });
        this.inset = inset;
    }

    /** The square outline follows the comparison switch. */
    private syncInsetSquare(): void {
        this.insetSquare?.setAttribute({visible: this.tensorComparisonValue});
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

    protected override onStateChange(previous: Readonly<TriangularPatchGraphState>): void {
        super.onStateChange(previous);
        this.syncInset();
    }
}
