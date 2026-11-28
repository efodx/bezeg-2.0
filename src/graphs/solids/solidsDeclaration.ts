import {NOT_A_NUMBER_TEXT} from '../../analysis/format';
import {message, messageNumber, type Message} from '../../localization';
import type {LegendEntry, LegendKind, ReadoutNote, ReadoutRow} from '../base/declare/graphDeclaration';
import {markerColor, MESH_STYLE, PLANE_STYLE, polylineStyle} from '../patches/surface-view/jsxStyles';
import {SURFACE_LABEL_COLOR} from '../patches/SurfaceLabelOverlay';
import type {SurfaceScene} from '../patches/surface-view/surfaceScene';
import type {SolidId, SolidsMode} from '../../solids/solidsModel';
import type {SolidsReadouts} from './solidsScene';

/** The arbiter keys of the solids graph: the values a lesson step asks the learner to set (task 08 lane L53). */
export const SOLIDS_OFFSET_KEY = 'solids-offset';
export const SOLIDS_NORMAL_KEYS = ['solids-normal-x', 'solids-normal-y', 'solids-normal-z'] as const;
export const SOLIDS_SHEAR_KEY = 'solids-shear';
export const SOLIDS_CURSOR_KEY = 'solids-cursor';
/** The slabs of stack mode and the discs of revolve mode are the same stored count. */
export const SOLIDS_DISCS_KEY = 'solids-discs';
export const SOLIDS_AXIS_KEY = 'solids-axis';
/** The switch of the cube cut into three pyramids (an action: it has no arbiter key). */
export const SOLIDS_PYRAMIDS_ACTION = 'pyramids';

type SolidsParam = typeof SOLIDS_OFFSET_KEY | typeof SOLIDS_NORMAL_KEYS[number] | typeof SOLIDS_SHEAR_KEY | typeof SOLIDS_CURSOR_KEY | typeof SOLIDS_DISCS_KEY | typeof SOLIDS_AXIS_KEY;
type SolidsRow = 'kind' | 'sides' | 'area' | `corner-${number}` | 'kept-volume' | 'solid-volume' | `volume-${0 | 1}` | `exact-${0 | 1}` | 'height' | `slice-${0 | 1}`
    | `pyramid-${number}` | 'pyramids-sum' | 'volume-mesh' | 'volume-exact' | 'axis' | 'disc-sum';
type SolidsNote = 'units' | 'coplanar' | 'section' | 'failing' | 'sheared' | 'cavalieri' | 'mesh' | 'pyramids';

export type CaptionKey = 'solids_graph_caption_kept' | 'solids_graph_caption_plane' | 'solids_graph_caption_section' | 'solids_graph_caption_cut' | 'solids_graph_caption_corner' | 'solids_graph_caption_axial'
    | 'solids_graph_caption_straight' | 'solids_graph_caption_sheared' | 'solids_graph_caption_cone' | 'solids_graph_caption_cylinder' | 'solids_graph_caption_slabs'
    | 'solids_graph_caption_cursor' | 'solids_graph_caption_solid' | 'solids_graph_caption_profile' | 'solids_graph_caption_axis' | 'solids_graph_caption_discs' | 'solids_graph_caption_pyramids';

type SolidsLegend = CaptionKey extends `solids_graph_caption_${infer Id}` ? Id : never;

/** The ids of the solids declaration (`DeclarationIds`). */
export type SolidsIds = {
    param: SolidsParam;
    row: SolidsRow;
    note: SolidsNote;
    legend: SolidsLegend;
    section: never;
    action: typeof SOLIDS_PYRAMIDS_ACTION;
};

/** The axial triangle is drawn only for the pyramid (solidsScene `axialSection`), in every section state. */
const axialCaption = (solid: SolidId): readonly CaptionKey[] => solid === 'square-pyramid' ? ['solids_graph_caption_axial'] : [];

/** What the view draws, in words: one caption for every element the readouts and the view name (the legend's entries). */
export function captionKeys(mode: SolidsMode, solid: SolidId, readouts: SolidsReadouts): readonly CaptionKey[] {
    switch (mode) {
        case 'section': return readouts.mode === 'section' && readouts.kind === 'empty'
            ? ['solids_graph_caption_kept', 'solids_graph_caption_plane', 'solids_graph_caption_corner', ...axialCaption(solid)] // no section edge and no cut points are drawn
            : ['solids_graph_caption_kept', 'solids_graph_caption_plane', 'solids_graph_caption_section', 'solids_graph_caption_cut', 'solids_graph_caption_corner', ...axialCaption(solid)];
        case 'stack': return readouts.mode === 'stack' && readouts.pair === 'failing'
            ? ['solids_graph_caption_cone', 'solids_graph_caption_cylinder', 'solids_graph_caption_slabs', 'solids_graph_caption_cursor']
            : ['solids_graph_caption_straight', 'solids_graph_caption_sheared', 'solids_graph_caption_slabs', 'solids_graph_caption_cursor'];
        case 'volume': return readouts.mode === 'volume' && readouts.pyramids ? ['solids_graph_caption_pyramids'] : ['solids_graph_caption_solid'];
        case 'revolve': return ['solids_graph_caption_profile', 'solids_graph_caption_axis', 'solids_graph_caption_discs', 'solids_graph_caption_solid'];
    }
}

/** True when the mesh volume differs visibly from the exact one: the solid is a k-gon approximation. */
export const approximate = (mesh: number, exact: number) => Math.abs(mesh - exact) > 1e-9 * Math.max(1, Math.abs(exact));

/**
 * The mesh note. The direction is stated only for the cone, whose straight profile is exact so the inscribed 48-gon alone makes the
 * mesh smaller; for a curved profile (chord profile) the mesh can lie on either side of the exact value.
 */
export const meshNoteKey = (solid: SolidId, mesh: number, exact: number) =>
    solid === 'cone' && mesh < exact ? 'solids_graph_mesh_note_below' as const : 'solids_graph_mesh_note' as const;

const number5 = (value: number) => messageNumber(value, 5);

/**
 * The rows and notes of the readout panel (`SolidsReadoutPanel`) as declared data: the same catalog keys, order and rounding, so
 * the board card and the old panel say the same thing.
 */
export function solidsReadoutDeclaration(solid: SolidId, readouts: SolidsReadouts): {rows: ReadoutRow<SolidsIds>[]; notes: ReadoutNote<SolidsIds>[]} {
    const rows: ReadoutRow<SolidsIds>[] = [];
    const notes: ReadoutNote<SolidsIds>[] = [{id: 'units', text: message('solids_graph_units_note')}];
    const note = (id: SolidsNote, text: Message) => notes.push({id, text});
    if (readouts.mode === 'section') {
        rows.push(
            {id: 'kind', name: message('solids_graph_row_kind'), value: message(`solids_graph_kind_${readouts.kind}`)},
            {id: 'sides', name: message('solids_graph_row_sides'), value: messageNumber(readouts.sides)},
            {id: 'area', name: message('solids_graph_row_area'), value: readouts.area === undefined ? {kind: 'formatted', text: NOT_A_NUMBER_TEXT} : number5(readouts.area)},
        );
        readouts.corners.forEach((corner, i) => rows.push({
            id: `corner-${i}`, name: message('solids_graph_row_corner', {value0: i + 1}),
            value: corner.kind === 'vertex' ? message('solids_graph_corner_vertex', {value0: corner.vertices[0] + 1})
                : message('solids_graph_corner_edge', {value0: corner.vertices[0] + 1, value1: corner.vertices[1] + 1}),
        }));
        rows.push(
            {id: 'kept-volume', name: message('solids_graph_row_kept_volume'), value: number5(readouts.keptVolume)},
            {id: 'solid-volume', name: message('solids_graph_row_solid_volume'), value: number5(readouts.solidVolume)},
        );
        if (readouts.coplanarFace) note('coplanar', message('solids_graph_coplanar_note'));
        note('section', message('solids_graph_section_note'));
    } else if (readouts.mode === 'stack') {
        const names = readouts.pair === 'failing'
            ? [message('solids_graph_name_cone'), message('solids_graph_name_cylinder')] : [message('solids_graph_name_straight'), message('solids_graph_name_sheared')];
        const volumes: Array<[number, number]> = [[readouts.meshVolume, readouts.exact], [readouts.otherVolume, readouts.otherExact]];
        volumes.forEach(([mesh, exact], i) => rows.push(
            {id: i === 0 ? 'volume-0' : 'volume-1', name: message('solids_graph_row_volume_of_mesh', {value0: names[i]}), value: number5(mesh)},
            {id: i === 0 ? 'exact-0' : 'exact-1', name: message('solids_graph_row_volume_of_exact', {value0: names[i]}), value: number5(exact)},
        ));
        rows.push(
            {id: 'height', name: message('solids_graph_row_slice_height'), value: messageNumber(readouts.sliceHeight, 4)},
            {id: 'slice-0', name: message('solids_graph_row_slice_area', {value0: names[0]}), value: number5(readouts.sliceArea)},
            {id: 'slice-1', name: message('solids_graph_row_slice_area', {value0: names[1]}), value: number5(readouts.otherSliceArea)},
        );
        // The shear conclusion appears only once the stack is sheared, so a lesson can ask for it at shear 0 (SV3).
        if (readouts.pair === 'failing') note('failing', message('solids_graph_failing_note'));
        else if (readouts.shear !== 0) note('sheared', message('solids_graph_sheared_note'));
        note('cavalieri', message('solids_graph_cavalieri_note'));
        if (approximate(readouts.meshVolume, readouts.exact)) note('mesh', message(meshNoteKey(solid, readouts.meshVolume, readouts.exact)));
    } else if (readouts.mode === 'volume') {
        if (readouts.pyramids) {
            readouts.pyramids.forEach((volume, i) => rows.push({id: `pyramid-${i}`, name: message('solids_graph_row_pyramid', {value0: i + 1}), value: number5(volume)}));
            rows.push({id: 'pyramids-sum', name: message('solids_graph_row_pyramids_sum'), value: number5(readouts.meshVolume)});
            note('pyramids', message('solids_graph_pyramids_note'));
        } else rows.push(
            {id: 'volume-mesh', name: message('solids_graph_row_mesh_volume'), value: number5(readouts.meshVolume)},
            {id: 'volume-exact', name: message('solids_graph_row_exact_volume'), value: number5(readouts.exact)},
        );
        if (approximate(readouts.meshVolume, readouts.exact)) note('mesh', message(meshNoteKey(solid, readouts.meshVolume, readouts.exact)));
    } else {
        rows.push(
            {id: 'axis', name: message('solids_graph_row_axis'), value: message(`solids_graph_axis_${readouts.axis}`)},
            {id: 'volume-mesh', name: message('solids_graph_row_mesh_volume'), value: number5(readouts.meshVolume)},
            {id: 'volume-exact', name: message('solids_graph_row_exact_volume'), value: number5(readouts.exact)},
            {id: 'disc-sum', name: readouts.axis === 'y' ? message('solids_graph_row_washer_sum', {value0: readouts.discs}) : message('solids_graph_row_disc_sum', {value0: readouts.discs}), value: number5(readouts.discSum)},
        );
        note('mesh', message(meshNoteKey(solid, readouts.meshVolume, readouts.exact)));
    }
    return {rows, notes};
}

/** The swatch of each caption and the drawn object it names (`solid-0` / `solid-1`: the first and second mesh of the scene). */
const LEGEND: Readonly<Record<SolidsLegend, {kind: LegendKind; object: string}>> = {
    kept: {kind: 'area', object: 'solid-0'}, plane: {kind: 'area', object: 'plane'}, section: {kind: 'line', object: 'section'},
    cut: {kind: 'point', object: 'cut'}, corner: {kind: 'point', object: 'corner'}, axial: {kind: 'line', object: 'axial'},
    straight: {kind: 'area', object: 'solid-0'}, sheared: {kind: 'area', object: 'solid-1'}, cone: {kind: 'area', object: 'solid-0'}, cylinder: {kind: 'area', object: 'solid-1'},
    slabs: {kind: 'line', object: 'slabs'}, cursor: {kind: 'line', object: 'cursor'}, solid: {kind: 'area', object: 'solid-0'},
    profile: {kind: 'line', object: 'profile'}, axis: {kind: 'dashed', object: 'axis'}, discs: {kind: 'line', object: 'discs'}, pyramids: {kind: 'line', object: 'pyramids'},
};

const legendId = (key: CaptionKey): SolidsLegend => key.slice('solids_graph_caption_'.length) as SolidsLegend;

/** One legend entry per caption of the old "Kaj vidiš" list, with the caption's own words. */
export const solidsLegend = (captions: readonly CaptionKey[]): LegendEntry<SolidsIds>[] =>
    captions.map(key => ({id: legendId(key), label: message(key), ...LEGEND[legendId(key)]}));

type SceneParts = Pick<SurfaceScene, 'polylines' | 'mesh' | 'meshOwners' | 'markers' | 'labels'> & {readonly planes?: SurfaceScene['planes']};

/** The colour the surface view gives a legend object and whether the scene holds it now. */
export function solidsDrawnObject(id: string, scene: SceneParts): {color: string; visible: boolean} | undefined {
    const line = (prefix: string) => scene.polylines.some(polyline => polyline.id === prefix || polyline.id.startsWith(`${prefix}-`));
    const mesh = (owner: string) => scene.mesh !== undefined && (scene.meshOwners ?? []).some(candidate => candidate.id === owner);
    const meshFill = MESH_STYLE.fill ?? MESH_STYLE.stroke;
    switch (id) {
        case 'solid-0': case 'solid-1': return {color: meshFill, visible: mesh(id)};
        case 'plane': return {color: PLANE_STYLE.fill ?? PLANE_STYLE.stroke, visible: (scene.planes ?? []).length > 0};
        case 'section': return {color: polylineStyle('highlight').stroke, visible: line('section')};
        case 'cursor': return {color: polylineStyle('highlight').stroke, visible: line('cursor')};
        case 'cut': return {color: markerColor('construction'), visible: scene.markers.some(marker => marker.id.startsWith('cut-'))};
        case 'corner': return {color: SURFACE_LABEL_COLOR, visible: scene.labels.length > 0};
        case 'axial': return {color: polylineStyle('construction').stroke, visible: line('axial')};
        case 'axis': return {color: polylineStyle('construction').stroke, visible: line('axis')};
        case 'slabs': return {color: polylineStyle('iso').stroke, visible: scene.polylines.some(polyline => polyline.id.startsWith('slab-'))};
        case 'discs': return {color: polylineStyle('iso').stroke, visible: line('disc')};
        case 'profile': return {color: polylineStyle('boundary').stroke, visible: line('profile')};
        case 'pyramids': return {color: polylineStyle('iso-v').stroke, visible: line('pyramid-0')};
        default: return undefined;
    }
}
