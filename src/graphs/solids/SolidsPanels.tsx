import {Button} from 'react-bootstrap';
import {formatNumber, NOT_A_NUMBER_TEXT} from '../../analysis/format';
import {ChoiceSelect} from '../../inputs/ChoiceSelect';
import {OnOffSwitch} from '../../inputs/OnOffSwitch';
import Slider from '../../inputs/Slider';
import {currentLanguage, useT} from '../../localization';
import {
    AXES, CURSOR_RANGE, CURSOR_SCALE, DISC_RANGE, MODES, MODE_SOLIDS, NORMAL_RANGE, OFFSET_RANGE, OFFSET_SCALE, SHEAR_RANGE, SHEAR_SCALE,
    axisAccepts, pyramidsApply, stackPair, type SolidId, type SolidsAxis, type SolidsMode, type SolidsState,
} from '../../solids/solidsModel';
import {LiveReadout} from '../base/controls/LiveReadout';
import {useStatusReadout} from '../base/controls/useStatusReadout';
import {FunctionReadout, type ReadoutRow} from '../functions/FunctionReadout';
import {azimuthDegrees, type SurfaceCameraActions} from '../patches/SurfaceCameraPanel';
import {CAMERA_PRESETS} from '../patches/surface-view/surfaceMath';
import type {SolidsReadouts} from './solidsScene';
import {PuckOwned, PuckOwnedGroup} from '../base/controls/PuckOwnership';
import {
    approximate, captionKeys, meshNoteKey, SOLIDS_AXIS_KEY, SOLIDS_CURSOR_KEY, SOLIDS_DISCS_KEY, SOLIDS_NORMAL_KEYS, SOLIDS_OFFSET_KEY, SOLIDS_PYRAMIDS_ACTION, SOLIDS_SHEAR_KEY,
} from './solidsDeclaration';

export interface SolidsPanelActions extends SurfaceCameraActions {
    setMode(mode: SolidsMode): void;
    setSolid(solid: SolidId): void;
    /** False when the value is refused (the zero normal), so the slider says so. */
    setNormal(index: 0 | 1 | 2, value: number): boolean;
    /** Offset, shear and cursor arrive in their stored integer units. */
    setOffset(units: number): void;
    setShear(units: number): void;
    setCursor(units: number): void;
    setDiscs(count: number): void;
    setAxis(axis: SolidsAxis): void;
    setPyramids(on: boolean): void;
}

export type SolidsPanelState = Pick<SolidsState, 'solid' | 'mode' | 'normal' | 'offset' | 'shear' | 'discs' | 'axis' | 'cursor' | 'pyramids' | 'camera'>;

const NORMAL_LETTERS = ['x', 'y', 'z'] as const;

const asMode = (value: string): SolidsMode => MODES.find(mode => mode === value) ?? 'section';
const asAxis = (value: string): SolidsAxis => AXES.find(axis => axis === value) ?? 'x';

export function SolidsEditPanel({state, actions}: {state: SolidsPanelState; actions: SolidsPanelActions}) {
    const t = useT();
    const modeOptions = MODES.map(value => ({value, text: t(`solids_graph_mode_${value}`)}));
    const solidOptions = MODE_SOLIDS[state.mode].map(value => ({value, text: t(`solids_graph_solid_${value}`)}));
    const asSolid = (value: string): SolidId => MODE_SOLIDS[state.mode].find(solid => solid === value) ?? MODE_SOLIDS[state.mode][0];
    const axisOptions = AXES.filter(axis => axisAccepts(state.solid, axis)).map(value => ({value, text: t(`solids_graph_axis_${value}`)}));
    const failing = state.mode === 'stack' && stackPair(state.solid) === 'failing';
    const solidChoice = <div className="inspector-group"><h3>{t('solids_graph_heading')}</h3>
            <ChoiceSelect label={t('solids_graph_mode')} value={state.mode} options={modeOptions} help={t(`solids_graph_mode_help_${state.mode}`)}
                          onChange={value => actions.setMode(asMode(value))}/>
            <ChoiceSelect label={t('solids_graph_solid')} value={state.solid} options={solidOptions} help={t('solids_graph_solid_help')}
                          onChange={value => actions.setSolid(asSolid(value))}/>
        </div>;
    // On the board workspace every control a lesson step asks for is a puck (`SolidsGraph.declaration`): `PuckOwned` hides its
    // slider here, and `PuckOwnedGroup` the group once all of its controls are pucks, so no empty heading is left.
    const sectionPlane = state.mode === 'section' && <PuckOwnedGroup params={[SOLIDS_OFFSET_KEY, ...SOLIDS_NORMAL_KEYS]} className="inspector-group"><h3>{t('solids_graph_plane_heading')}</h3>
            <PuckOwned param={SOLIDS_OFFSET_KEY}>
                <Slider customText={t('solids_graph_offset')} min={OFFSET_RANGE.min / OFFSET_SCALE} max={OFFSET_RANGE.max / OFFSET_SCALE} step={1 / OFFSET_SCALE}
                        grid={1 / OFFSET_SCALE} decimals={2} value={state.offset / OFFSET_SCALE}
                        onChange={value => { actions.setOffset(Math.round(value * OFFSET_SCALE)); }}/>
            </PuckOwned>
            {NORMAL_LETTERS.map((letter, index) => <PuckOwned key={letter} param={SOLIDS_NORMAL_KEYS[index]}>
                <Slider customText={t('solids_graph_normal', {value0: letter})} min={NORMAL_RANGE.min} max={NORMAL_RANGE.max} step={1} decimals={0}
                        value={state.normal[index]}
                        rejectedHint={t('solids_graph_normal_zero')} onChange={value => actions.setNormal(index as 0 | 1 | 2, value)}/>
            </PuckOwned>)}
        </PuckOwnedGroup>;
    return <>
        {solidChoice}
        {sectionPlane}
        {state.mode === 'stack' && failing && <p className="inspector-help" data-solids-shear-reason="">{t('solids_graph_shear_unavailable')}</p>}
        {state.mode === 'stack' && <PuckOwnedGroup params={[...(failing ? [] : [SOLIDS_SHEAR_KEY]), SOLIDS_CURSOR_KEY, SOLIDS_DISCS_KEY]} className="inspector-group"><h3>{t('solids_graph_stack_heading')}</h3>
            {!failing && <PuckOwned param={SOLIDS_SHEAR_KEY}>
                <Slider customText={t('solids_graph_shear')} min={SHEAR_RANGE.min / SHEAR_SCALE} max={SHEAR_RANGE.max / SHEAR_SCALE} step={1 / SHEAR_SCALE}
                        grid={1 / SHEAR_SCALE} decimals={2} value={state.shear / SHEAR_SCALE}
                        onChange={value => { actions.setShear(Math.round(value * SHEAR_SCALE)); }}/>
            </PuckOwned>}
            <PuckOwned param={SOLIDS_CURSOR_KEY}>
                <Slider customText={t('solids_graph_cursor')} valueText={value => `${fmt(value, 1)} %`} min={100 * CURSOR_RANGE.min / CURSOR_SCALE} max={100 * CURSOR_RANGE.max / CURSOR_SCALE} step={100 / CURSOR_SCALE}
                        grid={100 / CURSOR_SCALE} decimals={1} value={100 * state.cursor / CURSOR_SCALE}
                        onChange={value => { actions.setCursor(Math.round(value * CURSOR_SCALE / 100)); }}/>
            </PuckOwned>
            <PuckOwned param={SOLIDS_DISCS_KEY}>
                <Slider customText={t('solids_graph_slabs')} min={DISC_RANGE.min} max={DISC_RANGE.max} step={1} decimals={0} value={state.discs}
                        onChange={value => { actions.setDiscs(value); }}/>
            </PuckOwned>
        </PuckOwnedGroup>}
        {state.mode === 'volume' && <PuckOwnedGroup params={[SOLIDS_PYRAMIDS_ACTION]} className="inspector-group"><h3>{t('solids_graph_volume_heading')}</h3>
            <OnOffSwitch label={t('solids_graph_pyramids')} checked={state.pyramids && pyramidsApply(state)} help={t('solids_graph_pyramids_help')}
                         unavailableReason={pyramidsApply(state) ? undefined : t('solids_graph_pyramids_unavailable')}
                         onChange={actions.setPyramids}/>
        </PuckOwnedGroup>}
        {state.mode === 'revolve' && <PuckOwnedGroup params={[SOLIDS_AXIS_KEY, SOLIDS_DISCS_KEY]} className="inspector-group"><h3>{t('solids_graph_revolve_heading')}</h3>
            <PuckOwned param={SOLIDS_AXIS_KEY}>
                <ChoiceSelect label={t('solids_graph_axis')} value={state.axis} options={axisOptions} help={t('solids_graph_axis_help')}
                              reason={state.solid === 'sphere' ? t('solids_graph_axis_sphere_only_x') : undefined}
                              onChange={value => actions.setAxis(asAxis(value))}/>
            </PuckOwned>
            <PuckOwned param={SOLIDS_DISCS_KEY}>
                <Slider customText={t('solids_graph_discs')} min={DISC_RANGE.min} max={DISC_RANGE.max} step={1} decimals={0} value={state.discs}
                        onChange={value => { actions.setDiscs(value); }}/>
            </PuckOwned>
        </PuckOwnedGroup>}
    </>;
}

const fmt = (value: number, digits: number) => formatNumber(value, currentLanguage(), digits);

export function SolidsReadoutPanel({mode, solid, readouts}: {mode: SolidsMode; solid: SolidId; readouts: SolidsReadouts}) {
    const t = useT();
    const rows: ReadoutRow[] = [];
    const notes: string[] = [t('solids_graph_units_note')];
    let summary = '';
    if (readouts.mode === 'section') {
        rows.push(
            {id: 'kind', label: t('solids_graph_row_kind'), value: t(`solids_graph_kind_${readouts.kind}`)},
            {id: 'sides', label: t('solids_graph_row_sides'), value: String(readouts.sides)},
            {id: 'area', label: t('solids_graph_row_area'), value: readouts.area === undefined ? NOT_A_NUMBER_TEXT : fmt(readouts.area, 5)},
        );
        readouts.corners.forEach((corner, i) => rows.push({
            id: `corner-${i}`, label: t('solids_graph_row_corner', {value0: i + 1}),
            value: corner.kind === 'vertex' ? t('solids_graph_corner_vertex', {value0: corner.vertices[0] + 1})
                : t('solids_graph_corner_edge', {value0: corner.vertices[0] + 1, value1: corner.vertices[1] + 1}),
        }));
        rows.push(
            {id: 'kept-volume', label: t('solids_graph_row_kept_volume'), value: fmt(readouts.keptVolume, 5)},
            {id: 'solid-volume', label: t('solids_graph_row_solid_volume'), value: fmt(readouts.solidVolume, 5)},
        );
        if (readouts.coplanarFace) notes.push(t('solids_graph_coplanar_note'));
        notes.push(t('solids_graph_section_note'));
        summary = readouts.kind === 'polygon'
            ? t('solids_graph_summary_polygon', {value0: readouts.sides, value1: fmt(readouts.area ?? 0, 5)}) : t(`solids_graph_kind_${readouts.kind}`);
    } else if (readouts.mode === 'stack') {
        const names = readouts.pair === 'failing'
            ? [t('solids_graph_name_cone'), t('solids_graph_name_cylinder')] : [t('solids_graph_name_straight'), t('solids_graph_name_sheared')];
        const volumes: Array<[number, number]> = [[readouts.meshVolume, readouts.exact], [readouts.otherVolume, readouts.otherExact]];
        volumes.forEach(([mesh, exact], i) => rows.push(
            {id: `volume-${i}`, label: t('solids_graph_row_volume_of_mesh', {value0: names[i]}), value: fmt(mesh, 5)},
            {id: `exact-${i}`, label: t('solids_graph_row_volume_of_exact', {value0: names[i]}), value: fmt(exact, 5)},
        ));
        rows.push(
            {id: 'height', label: t('solids_graph_row_slice_height'), value: fmt(readouts.sliceHeight, 4)},
            {id: 'slice-0', label: t('solids_graph_row_slice_area', {value0: names[0]}), value: fmt(readouts.sliceArea, 5)},
            {id: 'slice-1', label: t('solids_graph_row_slice_area', {value0: names[1]}), value: fmt(readouts.otherSliceArea, 5)},
        );
        // The shear conclusion appears only once the stack is sheared, so a lesson can ask for it at shear 0 (SV3).
        if (readouts.pair === 'failing') notes.push(t('solids_graph_failing_note'));
        else if (readouts.shear !== 0) notes.push(t('solids_graph_sheared_note'));
        notes.push(t('solids_graph_cavalieri_note'));
        if (approximate(readouts.meshVolume, readouts.exact)) notes.push(t(meshNoteKey(solid, readouts.meshVolume, readouts.exact)));
        summary = t('solids_graph_summary_slices', {value0: fmt(readouts.sliceArea, 4), value1: fmt(readouts.otherSliceArea, 4)});
    } else if (readouts.mode === 'volume') {
        if (readouts.pyramids) {
            readouts.pyramids.forEach((volume, i) => rows.push({id: `pyramid-${i}`, label: t('solids_graph_row_pyramid', {value0: i + 1}), value: fmt(volume, 5)}));
            rows.push({id: 'pyramids-sum', label: t('solids_graph_row_pyramids_sum'), value: fmt(readouts.meshVolume, 5)});
            notes.push(t('solids_graph_pyramids_note'));
        } else rows.push(
            {id: 'volume-mesh', label: t('solids_graph_row_mesh_volume'), value: fmt(readouts.meshVolume, 5)},
            {id: 'volume-exact', label: t('solids_graph_row_exact_volume'), value: fmt(readouts.exact, 5)},
        );
        if (approximate(readouts.meshVolume, readouts.exact)) notes.push(t(meshNoteKey(solid, readouts.meshVolume, readouts.exact)));
        summary = t('solids_graph_summary_volume', {value0: fmt(readouts.meshVolume, 4), value1: fmt(readouts.exact, 4)});
    } else {
        rows.push(
            {id: 'axis', label: t('solids_graph_row_axis'), value: t(`solids_graph_axis_${readouts.axis}`)},
            {id: 'volume-mesh', label: t('solids_graph_row_mesh_volume'), value: fmt(readouts.meshVolume, 5)},
            {id: 'volume-exact', label: t('solids_graph_row_exact_volume'), value: fmt(readouts.exact, 5)},
            {id: 'disc-sum', label: t(readouts.axis === 'y' ? 'solids_graph_row_washer_sum' : 'solids_graph_row_disc_sum', {value0: readouts.discs}), value: fmt(readouts.discSum, 5)},
        );
        notes.push(t(meshNoteKey(solid, readouts.meshVolume, readouts.exact)));
        summary = t('solids_graph_summary_revolve', {value0: fmt(readouts.discSum, 4), value1: fmt(readouts.exact, 4)});
    }
    // One localized sentence per mode. Revolve names the axis (a program change can move it) and leaves the mode word out, because
    // the solid names there already begin with it ("Vrtenina funkcije x²").
    const liveText = readouts.mode === 'revolve'
        ? t('solids_graph_live_revolve', {value0: t(`solids_graph_solid_${solid}`), value1: t(`solids_graph_axis_${readouts.axis}`), value2: summary})
        : t('solids_graph_live', {value0: t(`solids_graph_mode_${mode}`), value1: t(`solids_graph_solid_${solid}`), value2: summary});
    const live = useStatusReadout(liveText, true);
    // The readouts and the captions are the declared rows, notes and legend on the board cards (`data-declared-panel`).
    return <>
        <FunctionReadout title={t('solids_graph_readout_heading')} rows={rows} note={notes} declaredPanel/>
        <div className="inspector-group" data-solids-captions="" data-declared-panel=""><h3>{t('solids_graph_captions_heading')}</h3>
            <ul>{captionKeys(mode, solid, readouts).map(key => <li key={key} data-caption={key}>{t(key)}</li>)}</ul>
        </div>
        <LiveReadout readout={live} dataAttribute="solids-live"/>
    </>;
}

const MAX_ELEVATION_DEGREES = CAMERA_PRESETS.top.el * 180 / Math.PI;

/** The azimuth the slider shows: whole degrees in [-180, 179], so a full turn has one value at each end of the range, not two. */
export const shownAzimuth = (radians: number): number => ((Math.round(azimuthDegrees(radians)) + 180) % 360 + 360) % 360 - 180;
/** The elevation the slider holds: tenths of a degree, the precision its field shows, so the field and the slider agree. */
export const shownElevation = (radians: number): number => Math.round(radians * 1800 / Math.PI) / 10;

/**
 * The "View" group of the surface graphs with its own azimuth range: the shared panel spans -180 to 180, where both ends are the same
 * direction and read -180. The view buttons and the elevation range are the same.
 */
export function SolidsDisplayPanel({state, actions}: {state: Pick<SolidsPanelState, 'camera'>; actions: SurfaceCameraActions}) {
    const t = useT();
    const {camera} = state;
    return <div className="inspector-group"><h3>{t('patch_camera_heading')}</h3>
        <div className="workspace-curve-picker workspace-view-buttons">
            <Button onClick={() => actions.applyCameraPreset('front')}>{t('patch_view_front')}</Button>
            <Button onClick={() => actions.applyCameraPreset('top')}>{t('patch_view_top')}</Button>
            <Button onClick={() => actions.applyCameraPreset('side')}>{t('patch_view_side')}</Button>
            <Button onClick={() => actions.applyCameraPreset('isometric')}>{t('patch_view_isometric')}</Button>
            <Button onClick={() => actions.resetView()}>{t('patch_view_reset')}</Button>
        </div>
        <Slider customText={t('patch_camera_azimuth')} min={-180} max={179} step={1} decimals={0} value={shownAzimuth(camera.az)}
                onChange={degrees => actions.setCameraAngle('az', degrees)}/>
        <Slider customText={t('patch_camera_elevation')} min={-MAX_ELEVATION_DEGREES} max={MAX_ELEVATION_DEGREES} step={1} decimals={1}
                value={shownElevation(camera.el)} onChange={degrees => actions.setCameraAngle('el', degrees)}/>
    </div>;
}
