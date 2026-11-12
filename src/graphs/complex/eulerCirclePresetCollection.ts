import {formatNumber} from '../../analysis/format';
import {currentLanguage, message, type Message} from '../../localization';
import {isRecord, type PresetCollection} from '../base/presets/PresetCollection';
import {
    type EulerCircleError, type EulerCircleMode, type EulerCircleState, parseEulerCircleState, serializeEulerCircleState,
} from '../../complex/eulerCircleModel';

/** Preset key of the Euler-circle graph. A file contract. */
export const EULER_CIRCLE_PRESET_KEY = 'complex-euler';

/** The stored state of a Preset: the angle in degrees, omega, the series degree, the two arrow switches, the mode and the second angle (a Preset without the last two gets the defaults). */
export interface EulerCircleStored {
    readonly degrees: number;
    readonly omega: number;
    readonly degree: number;
    readonly velocity: boolean;
    readonly acceleration: boolean;
    readonly mode: EulerCircleMode;
    readonly b: number;
}
/** One entry holding the whole stored state. */
export type EulerCirclePresetData = ReadonlyArray<readonly ['EulerCircle', EulerCircleStored]>;

/** A range bound or step in the current language (a true minus in Slovenian). */
const bound = (value: number) => formatNumber(value, currentLanguage(), 0);

function fieldName(field: string): Message {
    switch (field) {
        case 'degrees': return message('euler_circle_graph_field_degrees');
        case 'omega': return message('euler_circle_graph_field_omega');
        case 'degree': return message('euler_circle_graph_field_degree');
        case 'velocity': return message('euler_circle_graph_field_velocity');
        case 'acceleration': return message('euler_circle_graph_field_acceleration');
        case 'b': return message('euler_circle_graph_field_b');
        case 'mode': return message('euler_circle_graph_field_mode');
        default: return message('euler_circle_graph_field_state');
    }
}

/** An actionable rejection: which field, and the accepted range or step. */
export function eulerCircleErrorMessage(error: EulerCircleError): Message {
    const name = fieldName(error.field);
    const min = bound(error.min ?? 0);
    const max = bound(error.max ?? 0);
    switch (error.reason) {
        case 'not-an-object': return message('euler_circle_graph_error_not_an_object');
        case 'not-finite': return message('euler_circle_graph_error_not_finite', {value0: name});
        case 'missing': return message('euler_circle_graph_error_missing', {value0: name});
        case 'not-boolean': return message('euler_circle_graph_error_not_boolean', {value0: name});
        case 'not-mode': return message('euler_circle_graph_error_not_mode', {value0: name});
        case 'off-grid': return error.step !== undefined && error.step > 1
            ? message('euler_circle_graph_error_off_step', {value0: name, value1: bound(error.step)})
            : message('euler_circle_graph_error_off_grid', {value0: name});
        case 'out-of-range': return message('euler_circle_graph_error_out_of_range', {value0: name, value1: min, value2: max});
    }
}

function check(data: unknown): {readonly data: EulerCirclePresetData} | {readonly rejection: Message} {
    if (!Array.isArray(data)) return {rejection: message('euler_circle_graph_error_preset_shape')};
    if (data.length !== 1) return {rejection: message('euler_circle_graph_error_preset_entries')};
    const entry: unknown = data[0];
    if (!Array.isArray(entry) || entry.length !== 2 || entry[0] !== 'EulerCircle') return {rejection: message('euler_circle_graph_error_preset_shape')};
    const parsed = parseEulerCircleState(entry[1]);
    return parsed.ok ? {data: [['EulerCircle', serializeEulerCircleState(parsed.value)]]} : {rejection: eulerCircleErrorMessage(parsed.error)};
}

/** The stored Preset data of a state. */
export const eulerCirclePresetData = (state: EulerCircleState): EulerCirclePresetData => [['EulerCircle', serializeEulerCircleState(state)]];

/** The Preset collection of the Euler-circle graph. */
export const eulerCirclePresetCollection: PresetCollection<EulerCirclePresetData> = Object.freeze({
    key: EULER_CIRCLE_PRESET_KEY,
    /** A Preset keeps its whole state in `data`; `graphState` only marks it initialized. */
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message('euler_circle_graph_error_graph_state');
        const unknown = Object.keys(graphState).find(field => field !== 'initialized');
        if (unknown !== undefined) return message('euler_circle_graph_error_graph_state');
        return graphState.initialized === undefined || typeof graphState.initialized === 'boolean' ? undefined : message('euler_circle_graph_error_graph_state');
    },
    check,
});
