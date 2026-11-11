import {formatNumber} from '../../analysis/format';
import {currentLanguage, message, type Message} from '../../localization';
import {isRecord, type PresetCollection} from '../base/presets/PresetCollection';
import {parseContourState, serializeContourState, type ContourError, type ContourState} from '../../levelsets/contourModel';

/** Preset key of the contour graph. A file contract. */
export const CONTOUR_PRESET_KEY = 'contour';

/** One entry holding the whole stored state (mode, function, level, probe, start, step, constraint and camera). */
export type ContourPresetData = ReadonlyArray<readonly ['Contour', ContourState]>;

/** The name a file field has in a message; a component or a camera part is named by its field. */
function fieldName(field: string): Message | string {
    const name = field.replace(/\[\d+\]$/, '').replace(/^camera\..*/, 'camera');
    switch (name) {
        case 'state': return message('levelsets_graph_field_state');
        case 'mode': return message('levelsets_graph_field_mode');
        case 'fn': return message('levelsets_graph_field_fn');
        case 'level': return message('levelsets_graph_field_level');
        case 'levelCount': return message('levelsets_graph_field_level_count');
        case 'probe': return message('levelsets_graph_field_probe');
        case 'numeric': return message('levelsets_graph_field_numeric');
        case 'start': return message('levelsets_graph_field_start');
        case 'step': return message('levelsets_graph_field_step');
        case 'constraint': return message('levelsets_graph_field_constraint');
        case 'lineParam': return message('levelsets_graph_field_line_param');
        case 'circleParam': return message('levelsets_graph_field_circle_param');
        case 'camera': return message('levelsets_graph_field_camera');
        default: return field;
    }
}

/** An actionable rejection: which field, and the accepted values or range. */
export function contourErrorMessage(error: ContourError): Message {
    const name = fieldName(error.field);
    const range = {value1: formatNumber(error.min ?? 0, currentLanguage(), 0), value2: formatNumber(error.max ?? 0, currentLanguage(), 0)}; // whole numbers, in the current language, with a true minus
    const choices = (error.choices ?? []).join(', ');
    switch (error.reason) {
        case 'not-an-object': return message('levelsets_graph_error_not_an_object', {value0: name});
        case 'not-finite': return message('levelsets_graph_error_not_finite', {value0: name});
        case 'missing': return message('levelsets_graph_error_missing', {value0: name});
        case 'off-grid': return message('levelsets_graph_error_off_grid', {value0: name, ...range});
        case 'out-of-range': return message('levelsets_graph_error_out_of_range', {value0: name, ...range});
        case 'unknown-value': return message('levelsets_graph_error_unknown_value', {value0: name, value1: choices});
        case 'inconsistent': return message('levelsets_graph_error_inconsistent', {value0: name, value1: choices});
    }
}

function check(data: unknown): {readonly data: ContourPresetData} | {readonly rejection: Message} {
    if (!Array.isArray(data)) return {rejection: message('levelsets_graph_error_preset_shape')};
    if (data.length !== 1) return {rejection: message('levelsets_graph_error_preset_entries')};
    const entry: unknown = data[0];
    if (!Array.isArray(entry) || entry.length !== 2 || entry[0] !== 'Contour') return {rejection: message('levelsets_graph_error_preset_shape')};
    const parsed = parseContourState(entry[1]);
    return parsed.ok ? {data: [['Contour', serializeContourState(parsed.value)]]} : {rejection: contourErrorMessage(parsed.error)};
}

/** The Preset collection of the contour graph. */
export const contourPresetCollection: PresetCollection<ContourPresetData> = Object.freeze({
    key: CONTOUR_PRESET_KEY,
    /** A contour Preset keeps its whole state in `data`; `graphState` only marks it initialized. */
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message('levelsets_graph_error_graph_state');
        const unknown = Object.keys(graphState).find(field => field !== 'initialized');
        if (unknown !== undefined) return message('levelsets_graph_error_graph_state');
        return graphState.initialized === undefined || typeof graphState.initialized === 'boolean' ? undefined : message('levelsets_graph_error_graph_state');
    },
    check,
});
