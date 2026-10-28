import type React from "react";
import type {GraphSession} from "../base/GraphSession";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {PatchSelection, TensorPatchDisplayPanel, TensorPatchEditPanel, TensorPatchPanelActions} from "./TensorPatchPanels";
import {mountParameterInset, ParameterInset} from "./parameterInset";
import {patchBernsteinWeight} from "./patchBernstein";
import {lowerNetDegree} from "./patchDegree";
import BaseSurfaceGraph, {SurfaceGraphOptions, SurfaceGraphState} from "./BaseSurfaceGraph";
import {DecasteljauOrder, PatchCameraDto, PatchCollectionPresetData, PatchStateDto, Point3Dto, tensorPatchToDto} from "./patchDto";
import {defaultPatchPresets, type DerivativesStartingPatch, patchPresetCollections} from "./patchPresetCollections";
import {buildTensorScene, patchFromNet, patchPointId, PatchDensity, parsePatchPointId} from "./patchSceneBuilder";
import {CAMERA_PRESETS, CameraPresetName, clamp, fitCameraTo, presetCamera} from "./surface-view/surfaceMath";
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
}

const INSET_BOUNDING_BOX: [number, number, number, number] = [-0.14, 1.14, 1.14, -0.14];

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
        isoDensity: state.isoDensity ?? DEFAULT_ISO_DENSITY, shadingDensity: state.shadingDensity ?? DEFAULT_SHADING_DENSITY,
    };
}

/**
 * The tensor-product Bezier patch Demonstration: a control net, its surface, iso-parameter curves and the point
 * S(u,v), shown in a Three surface view. The scene store holds every piece of patch state; Presets store it in the
 * DTO `state`.
 */
export default class TensorPatchGraph extends BaseSurfaceGraph<TensorPatchGraphState, PatchCollectionPresetData> {
    constructor(options: SurfaceGraphOptions = {}) {
        super(options);
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
            || s.isoDensity !== previous.isoDensity || s.shadingDensity !== previous.shadingDensity;
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
        this.setState({net: this.state.net.map((row, r) => r === i ? row.map((p, c): Xyz => c === j ? [...position] : p) : row)});
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
        const source = patchFromNet(this.state.net);
        let net: Xyz[][];
        if (degree > current) {
            let raised = source;
            for (let d = current; d < degree; d++) raised = raised.elevate(direction);
            net = raised.getControlNet().map(row => row.map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0]));
        } else {
            net = lowerNetDegree(this.state.net, direction, degree);
        }
        this.setState({m: net.length - 1, n: net[0].length - 1, net});
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

    /** The authored az/el again, fitted to the whole net for the host's current shape. */
    resetView(): void {
        const authored = toCamera(defaultDto().state?.camera ?? fromCamera(this.state.camera));
        this.setSurfaceState({camera: fitCameraTo(this.state.net.flat(), this.hostAspect(), authored)});
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

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected readonly panelActions: TensorPatchPanelActions = {
        useStartingPatch: index => this.useStartingPatch(index),
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
        return <>{this.unavailableNotice()}<TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions}/></>;
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
            onDrag: (u, v) => this.setParameters(u, v),
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
