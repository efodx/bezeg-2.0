import type React from 'react';
import {
    AXES, CURSOR_RANGE, DEFAULT_SOLIDS_STATE, DISC_RANGE, MODES, NORMAL_RANGE, OFFSET_RANGE, SHEAR_RANGE, SOLID_IDS, axisAccepts, parseSolidsState,
    serializeSolidsState, withMode, withSolid, type IntegerRange, type SolidId, type SolidsAxis, type SolidsMode, type SolidsState,
} from '../../solids/solidsModel';
import type {PresetCollection} from '../base/presets/PresetCollection';
import BaseSurfaceGraph, {type SurfaceGraphOptions, type SurfaceGraphState} from '../patches/BaseSurfaceGraph';
import {CAMERA_PRESETS, type CameraPresetName, clamp, fitCameraTo, presetCamera} from '../patches/surface-view/surfaceMath';
import type {SurfaceCamera, SurfaceScene, Xyz} from '../patches/surface-view/surfaceScene';
import {SolidsDisplayPanel, SolidsEditPanel, SolidsReadoutPanel, type SolidsPanelActions} from './SolidsPanels';
import {solidsPresetCollection, type SolidsPresetData} from './solidsPresetCollection';
import {buildSolidsScene, drawSolids, type SolidsDrawing, type SolidsGeometry} from './solidsScene';

/** The stored fields beside the camera, which the surface graph state carries as a `SurfaceCamera`. */
export interface SolidsGraphState extends SurfaceGraphState, Omit<SolidsState, 'camera'> {
}

const authoredCamera = (): SurfaceCamera => {
    const {az, el, distance, projection, target} = DEFAULT_SOLIDS_STATE.camera;
    return {az, el, distance, projection, target: [target[0], target[1], target[2]]};
};

function stateFromSolids(s: SolidsState): Omit<SolidsGraphState, 'initialized' | 'surfaceUnavailable'> {
    const {camera, ...rest} = s;
    return {...rest, normal: [rest.normal[0], rest.normal[1], rest.normal[2]], camera: {az: camera.az, el: camera.el, distance: camera.distance, projection: camera.projection, target: [camera.target[0], camera.target[1], camera.target[2]]}};
}

const inRange = (value: number, range: IntegerRange): boolean => Number.isInteger(value) && value >= range.min && value <= range.max;

const geometryOf = (s: SolidsGeometry): SolidsGeometry => ({
    solid: s.solid, mode: s.mode, normal: s.normal, offset: s.offset, shear: s.shear, discs: s.discs, axis: s.axis, cursor: s.cursor,
});

const sameGeometry = (a: SolidsGeometry, b: SolidsGeometry): boolean =>
    a.solid === b.solid && a.mode === b.mode && a.offset === b.offset && a.shear === b.shear && a.discs === b.discs && a.axis === b.axis && a.cursor === b.cursor
    && a.normal[0] === b.normal[0] && a.normal[1] === b.normal[1] && a.normal[2] === b.normal[2];

/**
 * The solids graph (docs/specs/solids-volumes-lessons.md, SV1 to SV5): plane sections of the convex grid solids, Cavalieri slabs
 * with a shear, volumes of the solids, and solids of revolution as stacks of discs, all drawn as closed meshes in the surface view.
 * Every stored field comes from the pure `solidsModel`; the view and the readouts come from `solidsScene`. There are no points to
 * drag, no animation and no lesson scenes yet, so nothing is playing that a change would pause.
 */
export default class SolidsGraph extends BaseSurfaceGraph<SolidsGraphState, SolidsPresetData> {
    /** The last drawing with the fields it was made from (values, never language-resolved text). */
    private drawn?: {geometry: SolidsGeometry; drawing: SolidsDrawing};

    constructor(options: SurfaceGraphOptions = {}) {
        super(options);
    }

    override getInitialState(): SolidsGraphState {
        return {initialized: false, surfaceUnavailable: false, ...stateFromSolids(DEFAULT_SOLIDS_STATE)};
    }

    override presetCollection(): PresetCollection<SolidsPresetData> {
        return solidsPresetCollection;
    }

    override defaultPreset(): SolidsPresetData {
        return [['Solids', serializeSolidsState(DEFAULT_SOLIDS_STATE)]];
    }

    override exportPresetData(): SolidsPresetData {
        return [['Solids', serializeSolidsState(this.state)]];
    }

    override importPresetData(data: SolidsPresetData): void {
        const entry = data[0];
        if (entry?.[0] !== 'Solids') return;
        const parsed = parseSolidsState(entry[1]);
        if (parsed.ok) this.setState(stateFromSolids(parsed.value));
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    /** The drawing of the current geometry fields; the camera is not one of them, so an orbit reuses it. */
    private drawing(): SolidsDrawing {
        const geometry = geometryOf(this.state);
        if (this.drawn === undefined || !sameGeometry(this.drawn.geometry, geometry)) this.drawn = {geometry, drawing: drawSolids(geometry)};
        return this.drawn.drawing;
    }

    protected override buildScene(revision: number): SurfaceScene {
        return buildSolidsScene(this.state, revision, this.drawing());
    }

    protected override geometryChanged(previous: Readonly<SolidsGraphState>): boolean {
        return !sameGeometry(this.state, previous);
    }

    protected override hasPoint(): boolean {
        return false;
    }

    protected override movePoint(): void {
    }

    // ---- Operations the controls call --------------------------------------------------------------------------

    setMode(mode: SolidsMode): void {
        if (!MODES.includes(mode)) return;
        const next = withMode(this.state, mode);
        if (next !== this.state) {
            this.setState({mode: next.mode, solid: next.solid});
            this.frameSolid();
        }
    }

    setSolid(solid: SolidId): void {
        if (!SOLID_IDS.includes(solid)) return;
        const next = withSolid(this.state, solid);
        if (next !== this.state) {
            this.setState({solid: next.solid, mode: next.mode, axis: next.axis});
            this.frameSolid();
        }
    }

    /** One component of the plane normal; the zero normal is refused (no plane), as is a value off the grid. */
    setNormal(index: 0 | 1 | 2, value: number): boolean {
        if (!inRange(value, NORMAL_RANGE)) return false;
        const normal: [number, number, number] = [this.state.normal[0], this.state.normal[1], this.state.normal[2]];
        normal[index] = value === 0 ? 0 : value;
        if (normal.every(component => component === 0)) return false;
        this.setState({normal});
        return true;
    }

    setOffset(offset: number): void {
        if (inRange(offset, OFFSET_RANGE)) this.setState({offset: offset === 0 ? 0 : offset});
    }

    setShear(shear: number): void {
        if (inRange(shear, SHEAR_RANGE)) this.setState({shear: shear === 0 ? 0 : shear});
    }

    setCursor(cursor: number): void {
        if (inRange(cursor, CURSOR_RANGE)) this.setState({cursor});
    }

    setDiscs(discs: number): void {
        if (inRange(discs, DISC_RANGE)) this.setState({discs});
    }

    setAxis(axis: SolidsAxis): void {
        if (AXES.includes(axis) && axisAccepts(this.state.solid, axis) && axis !== this.state.axis) {
            this.setState({axis});
            this.frameSolid();
        }
    }

    /**
     * A new solid, mode or axis is framed like a fresh open, from the viewing angles the learner has now: the camera of the old
     * solid (its target and distance) would show a solid of another size cut at the board edge.
     */
    private frameSolid(): void {
        const framed: Xyz[] = this.drawing().framed.map((p): Xyz => [p[0], p[1], p[2]]);
        this.setSurfaceState({camera: fitCameraTo(framed, this.hostAspect(), this.state.camera)});
    }

    setCameraAngle(angle: 'az' | 'el', degrees: number): void {
        if (!Number.isFinite(degrees)) return;
        const radians = degrees * Math.PI / 180;
        const camera = this.state.camera;
        this.setSurfaceState({camera: angle === 'az' ? {...camera, az: radians} : {...camera, el: clamp(radians, -CAMERA_PRESETS.top.el, CAMERA_PRESETS.top.el)}});
    }

    applyCameraPreset(name: CameraPresetName): void {
        this.setSurfaceState({camera: presetCamera(name, this.state.camera)});
    }

    /** The authored az/el again, fitted to everything the view shows for the host's current shape. */
    resetView(): void {
        const framed: Xyz[] = [...this.drawing().framed.map((p): Xyz => [p[0], p[1], p[2]])];
        this.setSurfaceState({camera: fitCameraTo(framed, this.hostAspect(), authoredCamera())});
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected readonly panelActions: SolidsPanelActions = {
        setMode: mode => this.setMode(mode),
        setSolid: solid => this.setSolid(solid),
        setNormal: (index, value) => this.setNormal(index, value),
        setOffset: units => this.setOffset(units),
        setShear: units => this.setShear(units),
        setCursor: units => this.setCursor(units),
        setDiscs: count => this.setDiscs(count),
        setAxis: axis => this.setAxis(axis),
        applyCameraPreset: name => this.applyCameraPreset(name),
        resetView: () => this.resetView(),
        setCameraAngle: (angle, degrees) => this.setCameraAngle(angle, degrees),
    };

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.unavailableNotice()}
            <SolidsEditPanel state={this.state} actions={this.panelActions}/>
            <SolidsReadoutPanel mode={this.state.mode} solid={this.state.solid} readouts={this.drawing().readouts}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <SolidsDisplayPanel state={this.state} actions={this.panelActions}/>;
    }
}
