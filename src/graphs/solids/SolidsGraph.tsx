import type React from 'react';
import type {LessonAction} from '../../learning/model';
import type {LessonActionRegistry} from '../base/lesson/LessonActionRegistry';
import {
    AXES, CURSOR_RANGE, CURSOR_SCALE, DEFAULT_SOLIDS_STATE, DISC_RANGE, MODES, NORMAL_RANGE, OFFSET_RANGE, OFFSET_SCALE, SHEAR_RANGE, SHEAR_SCALE, SOLID_IDS, axisAccepts, parseSolidsState,
    pyramidsApply, stackPair, serializeSolidsState, withMode, withSolid, type IntegerRange, type SolidId, type SolidsAxis, type SolidsMode, type SolidsState,
} from '../../solids/solidsModel';
import {message} from '../../localization';
import type {ActionDeclaration, GraphDeclaration, ParameterDeclaration} from '../base/declare/graphDeclaration';
import type {ParameterBinding} from '../base/writes/parameterArbiter';
import {runAs} from '../base/writes/writeSource';
import {DomainError} from '../functions/BaseFunctionGraph';
import {
    captionKeys, solidsDrawnObject, solidsLegend, solidsReadoutDeclaration, SOLIDS_AXIS_KEY, SOLIDS_CURSOR_KEY, SOLIDS_DISCS_KEY, SOLIDS_NORMAL_KEYS, SOLIDS_OFFSET_KEY,
    SOLIDS_PYRAMIDS_ACTION, SOLIDS_SHEAR_KEY, type SolidsIds,
} from './solidsDeclaration';
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

const AXIS_LETTERS = ['x', 'y', 'z'] as const;

const inRange = (value: number, range: IntegerRange): boolean => Number.isInteger(value) && value >= range.min && value <= range.max;

const geometryOf = (s: SolidsGeometry): SolidsGeometry => ({
    solid: s.solid, mode: s.mode, normal: s.normal, offset: s.offset, shear: s.shear, discs: s.discs, axis: s.axis, cursor: s.cursor, pyramids: s.pyramids,
});

const sameGeometry = (a: SolidsGeometry, b: SolidsGeometry): boolean =>
    a.solid === b.solid && a.mode === b.mode && a.offset === b.offset && a.shear === b.shear && a.discs === b.discs && a.axis === b.axis && a.cursor === b.cursor && a.pyramids === b.pyramids
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

    /** The switch of the cube cut into three pyramids; stored always, drawn only for the cube in volume mode. */
    setPyramids(pyramids: boolean): void {
        if (!pyramidsApply(this.state) || typeof pyramids !== 'boolean' || pyramids === this.state.pyramids) return;
        this.setState({pyramids});
        this.frameSolid();
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

    // ---- Lesson actions ----------------------------------------------------------------------------------------

    /**
     * Lesson actions (`solids`), each equal to the control of the same name: `set-solid` and `set-mode` go through `withSolid` / `withMode` (the other field falls back as the chooser
     * does) and reframe the camera, `set-plane` writes the normal (and the offset if given), `set-offset` the offset, `set-camera` a camera preset, `set-shear` (units 1/4), `set-discs`, `set-cursor` (units 1/40), `set-pyramids` (the cube in volume mode only) and `set-axis` the stored field of the same control (`set-axis` reframes; `set-shear`
     * is refused for the cone and cylinder pair, `set-axis` for a solid without that axis); none changes the mode or solid and none snaps. The merged state goes through
     * `parseSolidsState` (strict, nothing snapped or clamped) before the write, so a bad value is a lesson-content error and nothing is written; unknown fields are refused.
     * A scene reads the state its earlier actions wrote.
     */
    applySolidsAction(action: Extract<LessonAction, {kind: 'solids'}>): void {
        const {kind: _kind, operation: _operation, ...fields} = action;
        const state = serializeSolidsState(this.state);
        switch (action.operation) {
            case 'set-solid': {
                this.refuseUnknown('set-solid', fields, ['solid']);
                const known = SOLID_IDS.find(id => id === action.solid);
                this.commitSolids('set-solid', known ? withSolid(state, known) : {...state, solid: action.solid}, true);
                return;
            }
            case 'set-mode': {
                this.refuseUnknown('set-mode', fields, ['mode']);
                const known = MODES.find(id => id === action.mode);
                this.commitSolids('set-mode', known ? withMode(state, known) : {...state, mode: action.mode}, true);
                return;
            }
            case 'set-plane':
                this.refuseUnknown('set-plane', fields, ['normal', 'offset']);
                this.commitSolids('set-plane', {...state, normal: action.normal, ...(action.offset === undefined ? {} : {offset: action.offset})}, false);
                return;
            case 'set-offset':
                this.refuseUnknown('set-offset', fields, ['offset']);
                this.commitSolids('set-offset', {...state, offset: action.offset}, false);
                return;
            case 'set-shear':
                this.refuseUnknown('set-shear', fields, ['shear']);
                if (state.mode === 'stack' && stackPair(state.solid) === 'failing') throw new Error('solids set-shear: the cone and the cylinder are not sheared (the control is refused for this pair).');
                this.commitSolids('set-shear', {...state, shear: action.shear}, false);
                return;
            case 'set-discs':
                this.refuseUnknown('set-discs', fields, ['discs']);
                this.commitSolids('set-discs', {...state, discs: action.discs}, false);
                return;
            case 'set-cursor':
                this.refuseUnknown('set-cursor', fields, ['cursor']);
                this.commitSolids('set-cursor', {...state, cursor: action.cursor}, false);
                return;
            case 'set-axis':
                this.refuseUnknown('set-axis', fields, ['axis']);
                this.commitSolids('set-axis', {...state, axis: action.axis}, true);
                return;
            case 'set-pyramids':
                this.refuseUnknown('set-pyramids', fields, ['pyramids']);
                if (!pyramidsApply(state)) throw new Error('solids set-pyramids: the cube is cut into pyramids only for the cube in volume mode (the control is refused otherwise).');
                this.commitSolids('set-pyramids', {...state, pyramids: action.pyramids}, true);
                return;
            case 'set-camera':
                this.refuseUnknown('set-camera', fields, ['view']);
                if (!Object.keys(CAMERA_PRESETS).includes(action.view)) throw new Error(`solids set-camera: view is not one of ${Object.keys(CAMERA_PRESETS).join(', ')}.`);
                this.applyCameraPreset(action.view);
                return;
            default: {
                const unsupported: never = action;
                throw new Error(`solids: no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    private refuseUnknown(operation: string, fields: Readonly<Record<string, unknown>>, allowed: readonly string[]): void {
        const unknown = Object.keys(fields).filter(key => !allowed.includes(key));
        if (unknown.length) throw new Error(`solids ${operation}: no such field ${unknown.join(', ')}.`);
    }

    /** Validates the merged state first, then writes only the fields that change; a new solid or mode is reframed like the chooser does. */
    private commitSolids(operation: string, merged: unknown, reframe: boolean): void {
        const parsed = parseSolidsState(merged);
        if (!parsed.ok) throw new Error(`solids ${operation}: ${parsed.error.field} ${parsed.error.reason}.`);
        const next = parsed.value;
        const patch: Partial<SolidsGraphState> = {
            ...(next.solid === this.state.solid ? {} : {solid: next.solid}),
            ...(next.mode === this.state.mode ? {} : {mode: next.mode}),
            ...(next.axis === this.state.axis ? {} : {axis: next.axis}),
            ...(next.shear === this.state.shear ? {} : {shear: next.shear}),
            ...(next.discs === this.state.discs ? {} : {discs: next.discs}),
            ...(next.cursor === this.state.cursor ? {} : {cursor: next.cursor}),
            ...(next.pyramids === this.state.pyramids ? {} : {pyramids: next.pyramids}),
            ...(next.offset === this.state.offset ? {} : {offset: next.offset}),
            ...(next.normal.every((c, i) => c === this.state.normal[i]) ? {} : {normal: [next.normal[0], next.normal[1], next.normal[2]] as [number, number, number]}),
        };
        if (!Object.keys(patch).length) return;
        this.setState(patch);
        if (reframe) this.frameSolid();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('solids', action => this.applySolidsAction(action));
    }

    // ---- Declaration (board workspace, task 08 lane L53) --------------------------------------------------------

    /**
     * The values a lesson step asks the learner to set, in the units the old sliders showed, through the setters those sliders call.
     * A value off the stored grid snaps to it as the slider did; the zero normal, the shear of the cone and cylinder pair and the
     * y-axis of the sphere are refused with the panel's reason.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const normal = (index: 0 | 1 | 2): ParameterBinding => ({
            read: () => this.state.normal[index],
            apply: (value: unknown) => {
                if (!this.setNormal(index, Math.round(Number(value)))) throw new DomainError(message('solids_graph_normal_zero'));
            },
        });
        return {
            [SOLIDS_OFFSET_KEY]: {read: () => this.state.offset / OFFSET_SCALE, apply: (value: unknown) => { this.setOffset(Math.round(Number(value) * OFFSET_SCALE)); }},
            [SOLIDS_NORMAL_KEYS[0]]: normal(0),
            [SOLIDS_NORMAL_KEYS[1]]: normal(1),
            [SOLIDS_NORMAL_KEYS[2]]: normal(2),
            [SOLIDS_SHEAR_KEY]: {
                read: () => this.state.shear / SHEAR_SCALE,
                apply: (value: unknown) => {
                    if (this.state.mode === 'stack' && stackPair(this.state.solid) === 'failing') throw new DomainError(message('solids_graph_shear_unavailable'));
                    this.setShear(Math.round(Number(value) * SHEAR_SCALE));
                },
            },
            [SOLIDS_CURSOR_KEY]: {read: () => 100 * this.state.cursor / CURSOR_SCALE, apply: (value: unknown) => { this.setCursor(Math.round(Number(value) * CURSOR_SCALE / 100)); }},
            [SOLIDS_DISCS_KEY]: {read: () => this.state.discs, apply: (value: unknown) => { this.setDiscs(Math.round(Number(value))); }},
            [SOLIDS_AXIS_KEY]: {
                read: () => this.state.axis,
                apply: (value: unknown) => {
                    const axis = AXES.find(candidate => candidate === value);
                    if (axis === undefined || !axisAccepts(this.state.solid, axis)) throw new DomainError(message('solids_graph_axis_sphere_only_x'));
                    this.setAxis(axis);
                },
            },
        };
    }

    /**
     * The pucks of the mode's lesson controls: section the offset and the three normal components (SV1, SV2), stack the shear (not for
     * the cone and cylinder pair), the slice height and the slabs (SV3), volume the switch of the cube's pyramids (SV4, the cube only),
     * revolve the axis (not for the sphere) and the discs (SV4, SV5).
     */
    private solidsParameters(): ParameterDeclaration<SolidsIds['param']>[] {
        const s = this.state;
        switch (s.mode) {
            case 'section': return [
                {key: SOLIDS_OFFSET_KEY, kind: 'range', label: message('solids_graph_offset'), symbol: 'd', placement: 'board',
                    min: OFFSET_RANGE.min / OFFSET_SCALE, max: OFFSET_RANGE.max / OFFSET_SCALE, step: 1 / OFFSET_SCALE, maxDecimals: 2},
                ...SOLIDS_NORMAL_KEYS.map((key, index): ParameterDeclaration<SolidsIds['param']> => ({
                    key, kind: 'range', label: message('solids_decl_normal_name', {value0: AXIS_LETTERS[index]}), symbol: `n_${index + 1}`, placement: 'board',
                    min: NORMAL_RANGE.min, max: NORMAL_RANGE.max, step: 1, bigStep: 1, maxDecimals: 0, morph: false,
                })),
            ];
            case 'stack': return [
                ...(stackPair(s.solid) === 'failing' ? [] : [{key: SOLIDS_SHEAR_KEY, kind: 'range', label: message('solids_graph_shear'), placement: 'board',
                    min: SHEAR_RANGE.min / SHEAR_SCALE, max: SHEAR_RANGE.max / SHEAR_SCALE, step: 1 / SHEAR_SCALE, maxDecimals: 2} as const]),
                {key: SOLIDS_CURSOR_KEY, kind: 'range', label: message('solids_decl_cursor_name'), unit: message('solids_decl_unit_percent'), placement: 'board',
                    min: 100 * CURSOR_RANGE.min / CURSOR_SCALE, max: 100 * CURSOR_RANGE.max / CURSOR_SCALE, step: 100 / CURSOR_SCALE, maxDecimals: 1},
                {key: SOLIDS_DISCS_KEY, kind: 'count', label: message('solids_graph_slabs'), placement: 'board', min: DISC_RANGE.min, max: DISC_RANGE.max},
            ];
            case 'volume': return [];
            case 'revolve': return [
                ...(axisAccepts(s.solid, 'y') ? [{key: SOLIDS_AXIS_KEY, kind: 'choice', label: message('solids_graph_axis'), placement: 'board', puck: true,
                    options: AXES.map(axis => ({value: axis, label: message(`solids_graph_axis_${axis}`)}))} as const] : []),
                {key: SOLIDS_DISCS_KEY, kind: 'count', label: message('solids_graph_discs'), placement: 'board', min: DISC_RANGE.min, max: DISC_RANGE.max},
            ];
        }
    }

    /**
     * Pure data from the state: the readout panel's rows and notes, the "Kaj vidiš" captions as the legend, the pucks and the switch
     * of the cube's pyramids. No marks, view or `followView`: the surface view has no `ViewAdapter`, so the view director does not run
     * and the camera stays the graph's own controls in Orodja (task 08 "3D camera", as the Coons pilot).
     */
    protected override declaration(): GraphDeclaration<SolidsIds> {
        const s = this.state;
        const {readouts} = this.drawing();
        const {rows, notes} = solidsReadoutDeclaration(s.solid, readouts);
        const actions: ActionDeclaration<SolidsIds>[] = pyramidsApply(s)
            ? [{id: SOLIDS_PYRAMIDS_ACTION, label: message('solids_decl_pyramids_name'), help: message('solids_graph_pyramids_help'), placement: 'board', enabled: true, pressed: s.pyramids, puck: true}]
            : [];
        return {parameters: this.solidsParameters(), readouts: [{id: 'measurements', rows}], notes, legend: solidsLegend(captionKeys(s.mode, s.solid, readouts)), actions};
    }

    /** The switch of the cube's pyramids, pressed as the learner: the method the panel's switch calls. */
    override performAction(id: string): void {
        if (id !== SOLIDS_PYRAMIDS_ACTION) throw new Error('Unknown action');
        runAs('learner', () => this.setPyramids(!this.state.pyramids));
    }

    /** What the surface view draws for a legend object; nothing while the view could not start. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = solidsDrawnObject(id, this.drawing().scene);
        return drawn && {color: drawn.color, visible: drawn.visible && !this.state.surfaceUnavailable};
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
        setPyramids: on => this.setPyramids(on),
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
