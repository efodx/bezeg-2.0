import {renderMessage, setLanguage, t} from '../../localization';
import {DEFAULT_CONTOUR_STATE} from '../../levelsets/contourModel';
import {contourPresetCollection} from './contourPresetCollection';

beforeEach(() => setLanguage('sl'));

const entry = (patch: Record<string, unknown> = {}) => [['Contour', {...JSON.parse(JSON.stringify(DEFAULT_CONTOUR_STATE)), ...patch}]];
const rejection = (data: unknown): string => {
    const result = contourPresetCollection.check(data);
    if (!('rejection' in result)) throw new Error('accepted');
    return renderMessage(result.rejection);
};

describe('contourPresetCollection', () => {
    it('round-trips a changed state through JSON and the check', () => {
        const changed = entry({mode: 'descent', fn: 'valley', level: -9, levelCount: 4, probe: [-30, 5], start: [-8, 4], step: 30, numeric: true});
        const result = contourPresetCollection.check(JSON.parse(JSON.stringify(changed)));
        if (!('data' in result)) throw new Error('rejected');
        expect(JSON.parse(JSON.stringify(result.data))).toEqual(changed);
        expect(contourPresetCollection.check(JSON.parse(JSON.stringify(result.data)))).toEqual(result);
    });

    it('rejects an out-of-range or off-grid number naming the field and the range, with a true minus', () => {
        expect(rejection(entry({level: 1000}))).toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_field_level'), value1: '−360', value2: '360'}));
        expect(rejection(entry({step: 31}))).toContain(t('levelsets_graph_field_step'));
        expect(rejection(entry({probe: [12, 81]}))).toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_field_probe'), value1: '−80', value2: '80'}));
        expect(rejection(entry({levelCount: 2.5}))).toBe(t('levelsets_graph_error_off_grid', {value0: t('levelsets_graph_field_level_count'), value1: '1', value2: '9'}));
        expect(rejection(entry({lineParam: -13}))).toContain('−12');
    });

    it('rejects malformed values with the matching sentence', () => {
        expect(rejection(entry({level: Number.NaN}))).toBe(t('levelsets_graph_error_not_finite', {value0: t('levelsets_graph_field_level')}));
        expect(rejection(entry({level: '8'}))).toContain(t('levelsets_graph_field_level'));
        expect(rejection(entry({fn: 'torus'}))).toContain(t('levelsets_graph_field_fn'));
        expect(rejection(entry({mode: 'x'}))).toContain(t('levelsets_graph_field_mode'));
        expect(rejection(entry({probe: 5}))).toBe(t('levelsets_graph_error_not_an_object', {value0: t('levelsets_graph_field_probe')}));
        expect(rejection(entry({probe: undefined}))).toContain(t('levelsets_graph_field_probe'));
        expect(rejection(entry({fn: 'hills', constraint: 'line'}))).toContain(t('levelsets_graph_field_constraint'));
        expect(rejection(entry({fn: 'bowl', probe: [60, 0]}))).toContain(t('levelsets_graph_field_probe'));
        expect(rejection([['Contour', 7]])).toBe(t('levelsets_graph_error_not_an_object', {value0: t('levelsets_graph_field_state')}));
    });

    it('rejects a wrong file shape and a wrong graph state', () => {
        expect(rejection('nonsense')).toBe(t('levelsets_graph_error_preset_shape'));
        expect(rejection([])).toBe(t('levelsets_graph_error_preset_entries'));
        expect(rejection([entry()[0], entry()[0]])).toBe(t('levelsets_graph_error_preset_entries'));
        expect(rejection([['Other', entry()[0][1]]])).toBe(t('levelsets_graph_error_preset_shape'));
        expect(rejection([['Contour']])).toBe(t('levelsets_graph_error_preset_shape'));
        const checkGraphState = contourPresetCollection.checkGraphState!;
        expect(checkGraphState({initialized: true})).toBeUndefined();
        expect(checkGraphState({})).toBeUndefined();
        expect(checkGraphState({initialized: 1})).toBeDefined();
        expect(checkGraphState({initialized: true, mode: 'x'})).toBeDefined();
        expect(checkGraphState('x')).toBeDefined();
    });

    it('speaks English after a language switch', () => {
        setLanguage('en');
        expect(rejection(entry({level: 1000}))).toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_field_level'), value1: '−360', value2: '360'}));
        expect(rejection('x')).toBe(t('levelsets_graph_error_preset_shape'));
    });
});
