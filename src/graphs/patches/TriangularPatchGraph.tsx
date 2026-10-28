import type React from "react";
import type {Polygon} from "jsxgraph";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {TransientState} from "../base/BaseGraph";
import BaseSurfaceGraph, {SurfaceGraphOptions, SurfaceGraphState} from "./BaseSurfaceGraph";
import {PatchCameraDto, PatchCollectionPresetData, PatchStateDto, Point3Dto, triangularPatchToDto} from "./patchDto";
import {defaultTriangularPatchPresets, patchPresetCollections} from "./patchPresetCollections";
import type {PatchDensity} from "./patchSceneBuilder";
import {barycentricW, TriangularPatchDisplayPanel, TriangularPatchEditPanel, TriangularPatchPanelActions, TriangularSelection, TriangularVisibilityKey} from "./TriangularPatchPanels";
import {triangularBernsteinWeight} from "./patchBernstein";
import {changeTriangularDegree, MAX_TRIANGULAR_DEGREE, MIN_TRIANGULAR_DEGREE, triangularFromNet} from "./TriangularPatchDegree";
import {parseTriangularPointId, triangularIndex, triangularPointId} from "./TriangularPatchLattice";
import {buildTriangularScene} from "./TriangularPatchScene";
import {mountParameterInset, ParameterInset} from "./parameterInset";
import {clampToTriangle} from "./triangleDomain";
import type {GraphSession} from "../base/GraphSession";
import {CAMERA_PRESETS, CameraPresetName, clamp, fitCameraTo, presetCamera} from "./surface-view/surfaceMath";
import type {SurfaceCamera, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

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
 * boundary curves and the point S(u, v, w), shown in a Three surface view. The scene store holds every piece of patch
 * state; Presets store it in the DTO `state`. The three-piece split preview is transient (not in a Preset).
 */
export default class TriangularPatchGraph extends BaseSurfaceGraph<TriangularPatchGraphState, PatchCollectionPresetData> {
    /** Transient: whether the split at (u, v, w) is drawn. */
    private subdivisionPreviewValue = false;
    /** Transient: whether the tensor patch derived from the net is drawn, and the unit square shown in the inset. */
    private tensorComparisonValue = false;

    constructor(options: SurfaceGraphOptions = {}) {
        super(options);
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

    // ---- Panels ------------------------------------------------------------------------------------------------

    private readonly panelActions: TriangularPatchPanelActions = {
        useStartingPatch: index => this.useStartingPatch(index),
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
                                                                 selection={this.selection()} actions={this.panelActions}/></>;
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
            onDrag: (u, v) => this.setParameters(u, v),
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
