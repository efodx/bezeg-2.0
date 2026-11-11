import {formatNumber} from '../../analysis/format';
import {currentLanguage, message, type Message} from '../../localization';
import {isRecord, type PresetCollection} from '../base/presets/PresetCollection';
import {
    type ComplexPowerError, type ComplexPowerState, parseComplexPowerState, serializeComplexPowerState,
} from '../../complex/complexPowerModel';

/** Preset key of the complex-power graph. A file contract. */
export const COMPLEX_POWER_PRESET_KEY = 'complex-power';

/** The stored state of a Preset: z as its two coordinates and the exponent. */
export interface ComplexPowerStored {
    readonly re: number;
    readonly im: number;
    readonly n: number;
}
/** One entry holding the whole stored state. */
export type ComplexPowerPresetData = ReadonlyArray<readonly ['ComplexPower', ComplexPowerStored]>;

/** A range bound or step in the current language (a decimal comma and a true minus in Slovenian). */
const bound = (value: number) => formatNumber(value, currentLanguage(), 2);

function fieldName(field: string): Message {
    switch (field) {
        case 're': return message('complex_power_graph_field_re');
        case 'im': return message('complex_power_graph_field_im');
        case 'n': return message('complex_power_graph_field_n');
        default: return message('complex_power_graph_field_state');
    }
}

/** An actionable rejection: which field, and the accepted range or step. */
export function complexPowerErrorMessage(error: ComplexPowerError): Message {
    const name = fieldName(error.field);
    const min = bound(error.min ?? 0);
    const max = bound(error.max ?? 0);
    switch (error.reason) {
        case 'not-an-object': return message('complex_power_graph_error_not_an_object');
        case 'not-finite': return message('complex_power_graph_error_not_finite', {value0: name});
        case 'missing': return message('complex_power_graph_error_missing', {value0: name});
        case 'off-grid': return message('complex_power_graph_error_off_grid', {value0: name, value1: bound(error.step ?? 1)});
        case 'out-of-range': return message('complex_power_graph_error_out_of_range', {value0: name, value1: min, value2: max});
    }
}

function check(data: unknown): {readonly data: ComplexPowerPresetData} | {readonly rejection: Message} {
    if (!Array.isArray(data)) return {rejection: message('complex_power_graph_error_preset_shape')};
    if (data.length !== 1) return {rejection: message('complex_power_graph_error_preset_entries')};
    const entry: unknown = data[0];
    if (!Array.isArray(entry) || entry.length !== 2 || entry[0] !== 'ComplexPower') return {rejection: message('complex_power_graph_error_preset_shape')};
    const parsed = parseComplexPowerState(entry[1]);
    return parsed.ok ? {data: [['ComplexPower', serializeComplexPowerState(parsed.value)]]} : {rejection: complexPowerErrorMessage(parsed.error)};
}

/** The stored Preset data of a state. */
export const complexPowerPresetData = (state: ComplexPowerState): ComplexPowerPresetData => [['ComplexPower', serializeComplexPowerState(state)]];

/** The Preset collection of the complex-power graph. */
export const complexPowerPresetCollection: PresetCollection<ComplexPowerPresetData> = Object.freeze({
    key: COMPLEX_POWER_PRESET_KEY,
    /** A Preset keeps its whole state in `data`; `graphState` only marks it initialized. */
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message('complex_power_graph_error_graph_state');
        const unknown = Object.keys(graphState).find(field => field !== 'initialized');
        if (unknown !== undefined) return message('complex_power_graph_error_graph_state');
        return graphState.initialized === undefined || typeof graphState.initialized === 'boolean' ? undefined : message('complex_power_graph_error_graph_state');
    },
    check,
});
