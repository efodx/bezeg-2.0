import {formatNumber} from '../../analysis/format';
import {currentLanguage, message, type Message} from '../../localization';
import {isRecord, type PresetCollection} from '../base/presets/PresetCollection';
import {parseLpState, serializeLpState, type LpError, type LpState} from '../../optimization/lpModel';

/** Preset key of the linear-programming graph. A file contract. */
export const LP_PRESET_KEY = 'linear-program';

/** One entry holding the whole stored state (the constraint rows, the objective and the sweep value). */
export type LpPresetData = ReadonlyArray<readonly ['LinearProgram', LpState]>;

/** The name a file field has in a message; a row or one of its coefficients is named with the row number. */
function fieldName(field: string): Message | string {
    const row = /^constraints\[(\d+)\](?:\.([abc]))?$/.exec(field);
    if (row) {
        const value0 = String(Number(row[1]) + 1);
        switch (row[2]) {
            case 'a': return message('levelsets_graph_lp_field_row_a', {value0});
            case 'b': return message('levelsets_graph_lp_field_row_b', {value0});
            case 'c': return message('levelsets_graph_lp_field_row_c', {value0});
            default: return message('levelsets_graph_lp_field_row', {value0});
        }
    }
    switch (field) {
        case 'state': return message('levelsets_graph_lp_field_state');
        case 'constraints': return message('levelsets_graph_lp_field_constraints');
        case 'objective': return message('levelsets_graph_lp_field_objective');
        case 'objective.p': return message('levelsets_graph_lp_field_objective_p');
        case 'objective.q': return message('levelsets_graph_lp_field_objective_q');
        case 'sweep': return message('levelsets_graph_lp_field_sweep');
        default: return field;
    }
}

/** An actionable rejection: which field, and the accepted whole numbers or count. */
export function lpErrorMessage(error: LpError): Message {
    const name = fieldName(error.field);
    const range = {value1: formatNumber(error.min ?? 0, currentLanguage(), 0), value2: formatNumber(error.max ?? 0, currentLanguage(), 0)}; // whole numbers, in the current language, with a true minus
    switch (error.reason) {
        case 'not-an-object': return message('levelsets_graph_error_not_an_object', {value0: name});
        case 'not-finite': return message('levelsets_graph_error_not_finite', {value0: name});
        case 'missing': return message('levelsets_graph_error_missing', {value0: name});
        case 'off-grid': return message('levelsets_graph_error_off_grid', {value0: name, ...range});
        case 'out-of-range': return message('levelsets_graph_error_out_of_range', {value0: name, ...range});
        case 'zero-row': return message('levelsets_graph_lp_error_zero_row', {value0: name});
    }
}

function check(data: unknown): {readonly data: LpPresetData} | {readonly rejection: Message} {
    if (!Array.isArray(data)) return {rejection: message('levelsets_graph_lp_error_preset_shape')};
    if (data.length !== 1) return {rejection: message('levelsets_graph_lp_error_preset_entries')};
    const entry: unknown = data[0];
    if (!Array.isArray(entry) || entry.length !== 2 || entry[0] !== 'LinearProgram') return {rejection: message('levelsets_graph_lp_error_preset_shape')};
    const parsed = parseLpState(entry[1]);
    return parsed.ok ? {data: [['LinearProgram', serializeLpState(parsed.value)]]} : {rejection: lpErrorMessage(parsed.error)};
}

/** The Preset collection of the linear-programming graph. */
export const lpPresetCollection: PresetCollection<LpPresetData> = Object.freeze({
    key: LP_PRESET_KEY,
    /** An LP Preset keeps its whole state in `data`; `graphState` only marks it initialized. */
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message('levelsets_graph_lp_error_graph_state');
        const unknown = Object.keys(graphState).find(field => field !== 'initialized');
        if (unknown !== undefined) return message('levelsets_graph_lp_error_graph_state');
        return graphState.initialized === undefined || typeof graphState.initialized === 'boolean' ? undefined : message('levelsets_graph_lp_error_graph_state');
    },
    check,
});
