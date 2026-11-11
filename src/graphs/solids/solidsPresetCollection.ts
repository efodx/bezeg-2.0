import {formatNumber} from '../../analysis/format';
import {message, type Message} from '../../localization';
import {isRecord, type PresetCollection} from '../base/presets/PresetCollection';
import {parseSolidsState, serializeSolidsState, type SolidsError, type SolidsState} from '../../solids/solidsModel';

/** Preset key of the solids graph. A file contract. */
export const SOLIDS_PRESET_KEY = 'solids';

/** One entry holding the whole stored state (the solid, the mode, the plane, the shear, the discs, the axis, the cursor and the camera). */
export type SolidsPresetData = ReadonlyArray<readonly ['Solids', SolidsState]>;

/** The name a file field has in a message; a component or a camera part is named by its field. */
function fieldName(field: string): Message | string {
    const name = field.replace(/\[\d+\]$/, '').replace(/^camera\..*/, 'camera');
    switch (name) {
        case 'state': return message('solids_graph_field_state');
        case 'solid': return message('solids_graph_field_solid');
        case 'mode': return message('solids_graph_field_mode');
        case 'normal': return message('solids_graph_field_normal');
        case 'offset': return message('solids_graph_field_offset');
        case 'shear': return message('solids_graph_field_shear');
        case 'discs': return message('solids_graph_field_discs');
        case 'axis': return message('solids_graph_field_axis');
        case 'cursor': return message('solids_graph_field_cursor');
        case 'camera': return message('solids_graph_field_camera');
        default: return field;
    }
}

/** An actionable rejection: which field, and the accepted values or range. */
export function solidsErrorMessage(error: SolidsError): Message {
    const name = fieldName(error.field);
    const range = {value1: formatNumber(error.min ?? 0, 'sl', 0), value2: formatNumber(error.max ?? 0, 'sl', 0)}; // whole numbers: the same text in both languages, with a true minus
    const choices = (error.choices ?? []).join(', ');
    switch (error.reason) {
        case 'not-an-object': return message('solids_graph_error_not_an_object', {value0: name});
        case 'not-finite': return message('solids_graph_error_not_finite', {value0: name});
        case 'missing': return message('solids_graph_error_missing', {value0: name});
        case 'off-grid': return message('solids_graph_error_off_grid', {value0: name, ...range});
        case 'out-of-range': return message('solids_graph_error_out_of_range', {value0: name, ...range});
        case 'unknown-value': return message('solids_graph_error_unknown_value', {value0: name, value1: choices});
        case 'inconsistent': return message('solids_graph_error_inconsistent', {value0: name, value1: choices});
        case 'zero-normal': return message('solids_graph_error_zero_normal');
    }
}

function check(data: unknown): {readonly data: SolidsPresetData} | {readonly rejection: Message} {
    if (!Array.isArray(data)) return {rejection: message('solids_graph_error_preset_shape')};
    if (data.length !== 1) return {rejection: message('solids_graph_error_preset_entries')};
    const entry: unknown = data[0];
    if (!Array.isArray(entry) || entry.length !== 2 || entry[0] !== 'Solids') return {rejection: message('solids_graph_error_preset_shape')};
    const parsed = parseSolidsState(entry[1]);
    return parsed.ok ? {data: [['Solids', serializeSolidsState(parsed.value)]]} : {rejection: solidsErrorMessage(parsed.error)};
}

/** The Preset collection of the solids graph. */
export const solidsPresetCollection: PresetCollection<SolidsPresetData> = Object.freeze({
    key: SOLIDS_PRESET_KEY,
    /** A solids Preset keeps its whole state in `data`; `graphState` only marks it initialized. */
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message('solids_graph_error_graph_state');
        const unknown = Object.keys(graphState).find(field => field !== 'initialized');
        if (unknown !== undefined) return message('solids_graph_error_graph_state');
        return graphState.initialized === undefined || typeof graphState.initialized === 'boolean' ? undefined : message('solids_graph_error_graph_state');
    },
    check,
});
