import type React from "react";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {TensorPatchDisplayPanel, TensorPatchEditPanel, TensorPatchPanelActions} from "./TensorPatchPanels";
import BaseSurfaceGraph, {SurfaceGraphOptions, SurfaceGraphState} from "./BaseSurfaceGraph";
import {PatchCameraDto, PatchCollectionPresetData, PatchStateDto, Point3Dto, tensorPatchToDto} from "./patchDto";
import {defaultPatchPresets, patchPresetCollections} from "./patchPresetCollections";
import {buildTensorScene, patchFromNet, PatchDensity, parsePatchPointId} from "./patchSceneBuilder";
import {CameraPresetName, fitCameraTo, presetCamera} from "./surface-view/surfaceMath";
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
}

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

    override exportPresetData(): PatchCollectionPresetData {
        const s = this.state;
        const dto = tensorPatchToDto(patchFromNet(s.net), {
            camera: fromCamera(s.camera), u: s.u, v: s.v,
            showControlNet: s.showControlNet, showIsoCurves: s.showIsoCurves, showBoundaryCurves: s.showBoundaryCurves, showShading: s.showShading,
            isoDensity: s.isoDensity, shadingDensity: s.shadingDensity,
        });
        return [["TensorProductBezierPatch", dto]];
    }

    override importPresetData(data: PatchCollectionPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "TensorProductBezierPatch") return;
        this.setState(stateFromDto(entry[1]));
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
        this.setState({net: this.state.net.map((row, r) => r === i ? row.map((p, c): Xyz => c === j ? [...position] : p) : row)});
    }

    // ---- Operations the controls call --------------------------------------------------------------------------

    /**
     * Raising a degree is exact elevation. Lowering resamples the current surface at (i/m', j/n'): the corners are
     * kept, the interior is an approximation.
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
            const m = direction === "u" ? degree : this.state.m, n = direction === "v" ? degree : this.state.n;
            net = Array.from({length: m + 1}, (_, i) => Array.from({length: n + 1}, (_, j): Xyz => {
                const p = source.eval(i / m, j / n);
                return [p.X(), p.Y(), p.Z()];
            }));
        }
        this.setState({m: net.length - 1, n: net[0].length - 1, net});
        this.selectPoint(this.selectedPointId);
    }

    setParameter(parameter: "u" | "v", value: number): void {
        if (!Number.isFinite(value)) return;
        const clamped = Math.min(1, Math.max(0, value));
        this.setState(parameter === "u" ? {u: clamped} : {v: clamped});
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

    /** Replaces the patch with one of the default Presets (the Uredi "starting patch" buttons); the camera comes with it. */
    useStartingPatch(index: number): void {
        const preset = defaultPatchPresets[index];
        if (!preset) return;
        this.importPresetData(preset.data());
        this.selectPoint(this.selectedPointId);
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    private readonly panelActions: TensorPatchPanelActions = {
        useStartingPatch: index => this.useStartingPatch(index),
        setDegree: (direction, degree) => this.setDegree(direction, degree),
        setParameter: (parameter, value) => this.setParameter(parameter, value),
        setVisibility: (key, visible) => this.setVisibility(key, visible),
        setDensity: (kind, density) => this.setDensity(kind, density),
        applyCameraPreset: name => this.applyCameraPreset(name),
        resetView: () => this.resetView(),
        setZMode: zMode => this.setZMode(zMode),
    };

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.unavailableNotice()}<TensorPatchEditPanel state={this.state} actions={this.panelActions}/></>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}/>;
    }
}
