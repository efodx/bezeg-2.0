import type React from "react";
import type {PresetCollection} from "../base/presets/PresetCollection";
import BaseSurfaceGraph, {type SurfaceGraphOptions, type SurfaceGraphState} from "./BaseSurfaceGraph";
import {
    type CoonsPanelActions, CoonsDisplayPanel, CoonsEditPanel, CoonsReadoutPanel, type CoonsSelection,
} from "./CoonsPatchPanels";
import {
    buildCoonsScene, type CoonsBoundaryName, type CoonsBoundaryPoints, type CoonsShown, cloneCoonsBoundaries, coonsInteriorPoints, coonsMismatches,
    coonsNet, coonsPointId, coonsSurfacePoint, defaultCoonsBoundaries, isCoonsCornerPoint, moveCoonsPoint, parseCoonsPointId, snapCoonsCorners,
} from "./coonsScene";
import {coonsPresetCollection, type CoonsPatchDto, type CoonsPresetData} from "./coonsPresetCollection";
import type {PatchCameraDto, Point3Dto} from "./patchDto";
import {CAMERA_PRESETS, CameraPresetName, clamp, fitCameraTo, presetCamera} from "./surface-view/surfaceMath";
import type {SurfaceCamera, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

export interface CoonsGraphState extends SurfaceGraphState {
    /** The four cubic boundaries; replaced (never edited in place) on every change. */
    boundaries: CoonsBoundaryPoints;
    /** Each corner is shared by the two boundaries that meet there; off, every end point moves alone. */
    linkedCorners: boolean;
    /** Which surface the single mesh shows. */
    shown: CoonsShown;
    showControlNet: boolean;
    showShading: boolean;
    /** Vertical-drag mode of the view; a mode of the session, not saved in Presets. */
    zMode: boolean;
}

/** The authored view, fitted to the default example like the other patch Presets (a 0.45 host aspect). */
const AUTHORED_CAMERA: SurfaceCamera = {az: -0.9, el: 0.5, distance: 1, projection: "perspective", target: [0, 0, 0]};
const fittedCamera = (b: CoonsBoundaryPoints): SurfaceCamera =>
    fitCameraTo([...b.c0, ...b.c1, ...b.d0, ...b.d1], 0.45, AUTHORED_CAMERA);

const xyz = ([x, y, z]: Point3Dto): Xyz => [x, y, z];
const toCamera = (dto: PatchCameraDto): SurfaceCamera => ({az: dto.az, el: dto.el, distance: dto.distance, projection: dto.projection, target: xyz(dto.target)});
const fromCamera = (camera: SurfaceCamera): PatchCameraDto => ({az: camera.az, el: camera.el, distance: camera.distance, projection: camera.projection, target: [...camera.target]});
const points = (list: ReadonlyArray<Point3Dto>): Xyz[] => list.map(xyz);

function defaultDto(): CoonsPatchDto {
    const b = defaultCoonsBoundaries();
    return {...b, linkedCorners: true, shown: "s", state: {camera: fromCamera(fittedCamera(b)), showControlNet: true, showShading: true}};
}

/** The state a Coons DTO describes; fields the DTO omits take the defaults. */
function stateFromDto(dto: CoonsPatchDto): Omit<CoonsGraphState, "initialized" | "surfaceUnavailable" | "zMode"> {
    const boundaries: CoonsBoundaryPoints = {c0: points(dto.c0), c1: points(dto.c1), d0: points(dto.d0), d1: points(dto.d1)};
    return {
        boundaries, linkedCorners: dto.linkedCorners, shown: dto.shown,
        camera: dto.state?.camera ? toCamera(dto.state.camera) : fittedCamera(boundaries),
        showControlNet: dto.state?.showControlNet ?? true, showShading: dto.state?.showShading ?? true,
    };
}

/**
 * The Coons patch Demonstration (D4): four editable cubic boundary curves with shared corners and the surface their
 * blend `Lc + Ld - B` makes, drawn as the exact bicubic net in the surface view. Unregistered: the `patch-coons`
 * Preset collection stays local to this module until the lesson route exists.
 */
export default class CoonsPatchGraph extends BaseSurfaceGraph<CoonsGraphState, CoonsPresetData> {
    constructor(options: SurfaceGraphOptions = {}) {
        super(options);
    }

    override getInitialState(): CoonsGraphState {
        return {initialized: false, surfaceUnavailable: false, zMode: false, ...stateFromDto(defaultDto())};
    }

    override presetCollection(): PresetCollection<CoonsPresetData> {
        return coonsPresetCollection;
    }

    override defaultPreset(): CoonsPresetData {
        return [["CoonsPatch", defaultDto()]];
    }

    override exportPresetData(): CoonsPresetData {
        const s = this.state;
        const b = cloneCoonsBoundaries(s.boundaries);
        return [["CoonsPatch", {
            c0: b.c0, c1: b.c1, d0: b.d0, d1: b.d1, linkedCorners: s.linkedCorners, shown: s.shown,
            state: {camera: fromCamera(s.camera), showControlNet: s.showControlNet, showShading: s.showShading},
        }]];
    }

    override importPresetData(data: CoonsPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== "CoonsPatch") return;
        this.setState(stateFromDto(entry[1]));
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    protected override buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene {
        return buildCoonsScene({...this.state, ...(selectedPointId === undefined ? {} : {selectedPointId})}, revision);
    }

    protected override geometryChanged(previous: Readonly<CoonsGraphState>): boolean {
        const s = this.state;
        return s.boundaries !== previous.boundaries || s.linkedCorners !== previous.linkedCorners || s.shown !== previous.shown
            || s.showControlNet !== previous.showControlNet || s.showShading !== previous.showShading;
    }

    protected override hasPoint(pointId: string): boolean {
        return parseCoonsPointId(pointId) !== undefined;
    }

    protected override movePoint(pointId: string, position: Xyz): void {
        const parsed = parseCoonsPointId(pointId);
        if (parsed === undefined || !position.every(Number.isFinite)) return;
        const [name, index] = parsed;
        // A drag's start repeats the point's own position; keeping the boundaries avoids a pointless geometry rebuild.
        if (this.state.boundaries[name][index].every((value, axis) => value === position[axis])) return;
        this.setState({boundaries: moveCoonsPoint(this.state.boundaries, this.state.linkedCorners, name, index, position)});
    }

    // ---- Operations the controls call --------------------------------------------------------------------------

    setShown(shown: CoonsShown): void {
        this.setState({shown});
    }

    /** Turning linking on moves each corner pair to its average in the same update; turning it off keeps every point where it is. */
    setLinkedCorners(linkedCorners: boolean): void {
        if (linkedCorners === this.state.linkedCorners) return;
        this.setState(linkedCorners ? {linkedCorners, boundaries: snapCoonsCorners(this.state.boundaries)} : {linkedCorners});
    }

    setVisibility(key: "showControlNet" | "showShading", visible: boolean): void {
        this.setState({[key]: visible});
    }

    setZMode(zMode: boolean): void {
        this.setState({zMode});
    }

    /** Selects a boundary control point like a click in the view; both undefined clears it, one undefined keeps the selected point's part (or 0 / c0). */
    selectBoundaryPoint(name: CoonsBoundaryName | undefined, index: number | undefined): void {
        if (name === undefined && index === undefined) {
            this.selectPoint(undefined);
            return;
        }
        const current = this.selectedPointId === undefined ? undefined : parseCoonsPointId(this.selectedPointId);
        this.selectPoint(coonsPointId(name ?? current?.[0] ?? "c0", index ?? current?.[1] ?? 0));
    }

    /** Moves the selected control point; nothing happens without a selection or for a non-finite coordinate. */
    setSelectedCoordinates(position: Xyz): void {
        if (this.selectedPointId !== undefined) this.movePoint(this.selectedPointId, position);
    }

    setCameraAngle(angle: "az" | "el", degrees: number): void {
        if (!Number.isFinite(degrees)) return;
        const radians = degrees * Math.PI / 180;
        const camera = this.state.camera;
        const maxElevation = CAMERA_PRESETS.top.el;
        this.setSurfaceState({camera: angle === "az" ? {...camera, az: radians} : {...camera, el: clamp(radians, -maxElevation, maxElevation)}});
    }

    applyCameraPreset(name: CameraPresetName): void {
        this.setSurfaceState({camera: presetCamera(name, this.state.camera)});
    }

    /** The points the view is fitted to: the boundary control points and the shown surface's net. */
    protected framedPoints(): Xyz[] {
        const {boundaries: b, shown} = this.state;
        return [...b.c0, ...b.c1, ...b.d0, ...b.d1, ...coonsNet(b, shown).flat()];
    }

    /** The authored az/el again, fitted to everything the view shows for the host's current shape. */
    resetView(): void {
        this.setSurfaceState({camera: fitCameraTo(this.framedPoints(), this.hostAspect(), toCamera(defaultDto().state?.camera ?? fromCamera(this.state.camera)))});
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected readonly panelActions: CoonsPanelActions = {
        setShown: shown => this.setShown(shown),
        setLinkedCorners: linked => this.setLinkedCorners(linked),
        selectBoundaryPoint: (name, index) => this.selectBoundaryPoint(name, index),
        setSelectedCoordinates: position => this.setSelectedCoordinates(position),
        setVisibility: (key, visible) => this.setVisibility(key, visible),
        applyCameraPreset: name => this.applyCameraPreset(name),
        resetView: () => this.resetView(),
        setCameraAngle: (angle, degrees) => this.setCameraAngle(angle, degrees),
        setZMode: zMode => this.setZMode(zMode),
    };

    protected selection(): CoonsSelection | undefined {
        const parsed = this.selectedPointId === undefined ? undefined : parseCoonsPointId(this.selectedPointId);
        if (parsed === undefined) return undefined;
        const [name, index] = parsed;
        return {name, index, xyz: this.state.boundaries[name][index], shared: this.state.linkedCorners && isCoonsCornerPoint(name, index)};
    }

    protected override workspaceEdit(): React.ReactNode {
        const {boundaries} = this.state;
        return <>{this.unavailableNotice()}
            <CoonsEditPanel state={this.state} selection={this.selection()} actions={this.panelActions}/>
            <CoonsReadoutPanel readouts={{
                interior: coonsInteriorPoints(boundaries), centre: coonsSurfacePoint(boundaries, "s", 0.5, 0.5), mismatches: coonsMismatches(boundaries),
            }}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <CoonsDisplayPanel state={this.state} actions={this.panelActions}/>;
    }
}
