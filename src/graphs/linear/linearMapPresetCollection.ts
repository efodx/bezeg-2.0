import {message, Message} from '../../localization';
import {LinearMapError, LinearMapState, parseLinearMapState} from '../../linear/linearMapModel';
import {isLinearMapGraphMode} from './linearMapScene';
import type {PresetCollection, PresetDataCheck} from '../base/presets/PresetCollection';

/** The localized reason for a rejected Preset: which field, and what it must be. */
export function linearMapRejection(error: LinearMapError): Message {
    switch (error.reason) {
        case 'not-an-object': return message('linear_map_invalid_data');
        case 'not-finite':
        case 'off-grid':
        case 'out-of-range':
        case 'not-a-matrix':
            return /^(matrix|secondMatrix)/.test(error.field)
                ? message('linear_map_invalid_entry', {value0: error.field})
                : message('linear_map_invalid_field', {value0: error.field});
        default: return message('linear_map_invalid_field', {value0: error.field});
    }
}

/**
 * The browser-local Preset collection of the linear map graph, stored and exported under `preset-linear-map`.
 * `parseLinearMapState` decides validity (strict: nothing is snapped or clamped); this adds the localized diagnosis.
 */
export const linearMapPresetCollection: PresetCollection<LinearMapState> = Object.freeze({
    key: 'linear-map',
    check(data: unknown): PresetDataCheck<LinearMapState> {
        const parsed = parseLinearMapState(data);
        if (!parsed.ok) return {rejection: linearMapRejection(parsed.error)};
        if (!isLinearMapGraphMode(parsed.value.mode)) return {rejection: message('linear_map_invalid_field', {value0: 'mode'})};
        return {data: parsed.value};
    },
});
