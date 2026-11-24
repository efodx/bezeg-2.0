import type React from "react";
import {message, messageNumber} from "../../localization";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ReadoutNote, ReadoutRow, StatusLine} from "../base/declare/graphDeclaration";
import {runAs} from "../base/writes/writeSource";
import {cssColor, MESH_STYLE, markerColor, polylineStyle} from "./surface-view/jsxStyles";
import {SURFACE_COLORS} from "./surface-view/surfaceStyles";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import BaseSurfaceGraph, {type SurfaceGraphOptions, type SurfaceGraphState} from "./BaseSurfaceGraph";
import {
    type CoonsPanelActions, CoonsDisplayPanel, CoonsEditPanel, CoonsReadoutPanel, type CoonsSelection, CORNER_COORDINATES, triple,
} from "./CoonsPatchPanels";
import {subscriptDigits} from "./TensorPatchPanels";
import {
    buildCoonsScene, COONS_BOUNDARY_NAMES, COONS_SHOWN, type CoonsBoundaryName, type CoonsBoundaryPoints, type CoonsShown, cloneCoonsBoundaries, coonsInteriorPoints, coonsMismatches,
    coonsNet, coonsPointId, coonsSurfacePoint, defaultCoonsBoundaries, isCoonsCornerPoint, isCoonsShown, moveCoonsPoint, parseCoonsPointId, snapCoonsCorners,
} from "./coonsScene";
import {coonsPresetCollection, type CoonsPatchDto, type CoonsPresetData} from "./coonsPresetCollection";
import type {PatchCameraDto, Point3Dto} from "./patchDto";
import {CAMERA_PRESETS, CameraPresetName, clamp, DEFAULT_FIT_ASPECT, fitCameraTo, presetCamera} from "./surface-view/surfaceMath";
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

/**
 * The ids of the declaration (`DeclarationIds`). No parameters: the shown surface, the switches, the view angles and the
 * boundary points are not bound in the arbiter, so the switches and the surface choice are actions (with `pressed`) and
 * the points are the legend only. The interior net is the readout rows; the corner check is the status lines.
 */
export type CoonsIds = {
    param: never;
    row: "p-1-1" | "p-1-2" | "p-2-1" | "p-2-2" | "centre";
    note: "interior";
    legend: "boundary" | "polygon" | "net" | "surface" | "centre" | "points";
    section: never;
    /** One per shown surface, then the corner linking and the display switches. */
    action: `shown-${CoonsShown}` | "linked-corners" | "control-net" | "shading" | "height-mode";
};

/** The authored view, fitted to the default example for a landscape host (`DEFAULT_FIT_ASPECT`), so the patch fills the board. */
const AUTHORED_CAMERA: SurfaceCamera = {az: -0.9, el: 0.5, distance: 1, projection: "perspective", target: [0, 0, 0]};
const fittedCamera = (b: CoonsBoundaryPoints): SurfaceCamera =>
    fitCameraTo([...b.c0, ...b.c1, ...b.d0, ...b.d1], DEFAULT_FIT_ASPECT, AUTHORED_CAMERA);

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
 * blend `Lc + Ld - B` makes, drawn as the exact bicubic net in the surface view. Its `patch-coons` Preset collection
 * is registered beside, not inside, the tensor patch collections.
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

    // ---- Lesson actions ----------------------------------------------------------------------------------------

    // A lesson default scene keeps the default Preset's fitted camera (`defaultDto`), so it equals a fresh graph's scene; refitting
    // to the host's shape here broke the transient-state contract ("the lesson default scene drops every earlier change").

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("coons", action => {
            if (action.operation === "set-shown") {
                if (!isCoonsShown(action.shown)) throw new Error('The shown surface must be "lc", "ld", "b" or "s".');
                this.setShown(action.shown);
            } else if (action.operation === "set-linked-corners") {
                if (typeof action.linked !== "boolean") throw new Error("A coons set-linked-corners action needs a boolean linked.");
                this.setLinkedCorners(action.linked);
            } else if (action.operation === "move-point") {
                const name = COONS_BOUNDARY_NAMES.find(candidate => candidate === action.name);
                if (name === undefined) throw new Error('The boundary must be "c0", "c1", "d0" or "d1".');
                if (!Number.isInteger(action.index) || action.index < 0 || action.index > 3) throw new Error("The control point index must be 0, 1, 2 or 3.");
                if (!Array.isArray(action.xyz) || action.xyz.length !== 3 || !action.xyz.every(Number.isFinite)) throw new Error("A coons move-point action needs xyz as three finite numbers.");
                this.movePoint(coonsPointId(name, action.index), [action.xyz[0], action.xyz[1], action.xyz[2]]);
            } else {
                throw new Error("A coons action needs the operation set-shown, set-linked-corners or move-point.");
            }
        });
    }

    // ---- Declaration (task 02: nothing renders it yet) ---------------------------------------------------------

    /**
     * Pure data from the scene state: the interior control net and the centre as rows, the interior note, the corner
     * check as status lines, the legend of what the surface view draws and the switches as actions. No view or camera
     * is declared (a surface view has no `ViewAdapter` marks yet).
     */
    protected override declaration(): GraphDeclaration<CoonsIds> {
        const {boundaries, shown, linkedCorners, showControlNet, showShading, zMode} = this.state;
        const rows: ReadoutRow<CoonsIds>[] = [
            ...coonsInteriorPoints(boundaries).map(({i, j, xyz}) => ({
                id: `p-${i}-${j}` as "p-1-1" | "p-1-2" | "p-2-1" | "p-2-2",
                name: message("coons_interior_point_name", {value0: subscriptDigits(i), value1: subscriptDigits(j)}),
                value: {kind: "formatted" as const, text: triple(xyz)},
            })),
            {id: "centre", name: message("coons_centre"), value: {kind: "formatted", text: triple(coonsSurfacePoint(boundaries, "s", 0.5, 0.5))}, legend: "centre"},
        ];
        const notes: ReadoutNote<CoonsIds>[] = [{id: "interior", text: message("coons_interior_note"), tone: "muted"}];
        const mismatches = coonsMismatches(boundaries);
        const status: StatusLine[] = mismatches.length === 0
            ? [{id: "corners", text: message("coons_corners_met"), tone: "success"}]
            : [
                ...mismatches.map(mismatch => ({
                    id: `corner-${mismatch.corner}`,
                    text: message("coons_corner_mismatch", {value0: CORNER_COORDINATES[mismatch.corner], value1: messageNumber(mismatch.distance, 3)}),
                    tone: "warning" as const,
                })),
                {id: "no-interpolation", text: message("coons_no_interpolation"), tone: "warning"},
            ];
        const legend: LegendEntry<CoonsIds>[] = [
            {id: "boundary", label: message("coons_legend_boundary"), kind: "line", object: "boundary"},
            {id: "polygon", label: message("coons_legend_polygon"), kind: "line", object: "polygon"},
            {id: "net", label: message("coons_legend_net"), kind: "line", object: "net"},
            {id: "surface", label: message("coons_legend_surface"), kind: "area", object: "surface"},
            {id: "centre", label: message("coons_centre"), kind: "point", object: "centre"},
            {id: "points", label: message("coons_legend_points"), kind: "point", object: "points"},
        ];
        // The surface choice and the corner linking are used while watching the surface: the board. The display switches are Orodja.
        const board = (id: CoonsIds["action"], label: ActionDeclaration["label"], pressed: boolean, puck: ActionDeclaration["puck"], help?: ActionDeclaration["help"]): ActionDeclaration<CoonsIds> =>
            ({id, label, help, placement: "board", enabled: true, pressed, puck});
        const shownGroup = {key: "coons-shown", label: message("coons_shown"), help: message("coons_shown_help")};
        const tools = (id: CoonsIds["action"], label: ActionDeclaration["label"], pressed: boolean): ActionDeclaration<CoonsIds> =>
            ({id, label, placement: "tools", section: "display", enabled: true, pressed});
        const actions: ActionDeclaration<CoonsIds>[] = [
            ...COONS_SHOWN.map(value => board(`shown-${value}`, message(`coons_shown_${value}`), shown === value, {group: shownGroup, short: message(`coons_shown_short_${value}`)})),
            board("linked-corners", message("coons_linked_corners"), linkedCorners, true, message("coons_linked_help")),
            tools("control-net", message("patch_show_control_net"), showControlNet),
            tools("shading", message("patch_show_shading"), showShading),
            tools("height-mode", message("patch_move_height"), zMode),
        ];
        return {readouts: [{id: "interior", rows}], notes, status, legend, actions};
    }

    /** An action pressed as the learner: the method the panel's control calls. */
    override performAction(id: string): void {
        const s = this.state;
        const shownId = COONS_SHOWN.find(value => `shown-${value}` === id);
        runAs("learner", () => {
            if (shownId !== undefined) this.setShown(shownId);
            else if (id === "linked-corners") this.setLinkedCorners(!s.linkedCorners);
            else if (id === "control-net") this.setVisibility("showControlNet", !s.showControlNet);
            else if (id === "shading") this.setVisibility("showShading", !s.showShading);
            else if (id === "height-mode") this.setZMode(!s.zMode);
            else throw new Error("Unknown action");
        });
    }

    /**
     * What the surface view draws for a legend entry: the colour its renderer gives the role (`jsxStyles`) and whether the
     * scene holds it now. The boundary curves, their polygons, the centre marker and the points are always in the scene; the
     * net and the shaded mesh follow their switches. Nothing is drawn while the view could not start.
     */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const {showControlNet, showShading, surfaceUnavailable} = this.state;
        const drawn = (color: string, visible = true) => ({color, visible: visible && !surfaceUnavailable});
        switch (id) {
            case "boundary": return drawn(polylineStyle("boundary").stroke);
            case "polygon": return drawn(polylineStyle("construction").stroke);
            case "net": return drawn(polylineStyle("net").stroke, showControlNet);
            case "surface": return drawn(MESH_STYLE.fill ?? cssColor(SURFACE_COLORS.surface), showShading);
            case "centre": return drawn(markerColor("evaluated"));
            case "points": return drawn(cssColor(SURFACE_COLORS.point));
            default: return undefined;
        }
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
            <div data-declared-panel=""><CoonsReadoutPanel readouts={{
                interior: coonsInteriorPoints(boundaries), centre: coonsSurfacePoint(boundaries, "s", 0.5, 0.5), mismatches: coonsMismatches(boundaries),
            }}/></div>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <CoonsDisplayPanel state={this.state} actions={this.panelActions}/>;
    }
}
