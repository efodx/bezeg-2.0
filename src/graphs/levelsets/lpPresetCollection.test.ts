import {renderMessage, setLanguage, t} from '../../localization';
import {DEFAULT_LP_STATE} from '../../optimization/lpModel';
import {lpPresetCollection} from './lpPresetCollection';

beforeEach(() => setLanguage('sl'));

const state = (patch: Record<string, unknown> = {}) => ({...JSON.parse(JSON.stringify(DEFAULT_LP_STATE)), ...patch});
const entry = (patch: Record<string, unknown> = {}) => [['LinearProgram', state(patch)]];
const rejection = (data: unknown): string => {
    const result = lpPresetCollection.check(data);
    if (!('rejection' in result)) throw new Error('accepted');
    return renderMessage(result.rejection);
};
const row = (n: number) => String(n);

describe('lpPresetCollection', () => {
    it('round-trips a changed state through JSON and the check, and drops unknown fields', () => {
        const changed = entry({constraints: [{a: -9, b: 9, c: -30}, {a: 0, b: 1, c: 30}, {a: 4, b: 0, c: 0}], objective: {p: -9, q: 0}, sweep: -100});
        const result = lpPresetCollection.check(JSON.parse(JSON.stringify(changed)));
        if (!('data' in result)) throw new Error('rejected');
        expect(JSON.parse(JSON.stringify(result.data))).toEqual(changed);
        expect(lpPresetCollection.check(JSON.parse(JSON.stringify(result.data)))).toEqual(result);
        const extra = lpPresetCollection.check([['LinearProgram', {...state(), optimum: 99}]]);
        if (!('data' in extra)) throw new Error('rejected');
        expect(extra.data[0][1]).not.toHaveProperty('optimum');
    });

    it('rejects an out-of-range, off-grid or malformed number naming the field, the row and the range, with a true minus', () => {
        expect(rejection(entry({sweep: 101}))).toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_lp_field_sweep'), value1: '−100', value2: '100'}));
        expect(rejection(entry({constraints: [{a: 10, b: 1, c: 1}]})))
            .toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_lp_field_row_a', {value0: row(1)}), value1: '−9', value2: '9'}));
        expect(rejection(entry({constraints: [{a: 1, b: 1, c: 1}, {a: 1, b: 1, c: 31}]})))
            .toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_lp_field_row_c', {value0: row(2)}), value1: '−30', value2: '30'}));
        expect(rejection(entry({objective: {p: 1.5, q: 1}})))
            .toBe(t('levelsets_graph_error_off_grid', {value0: t('levelsets_graph_lp_field_objective_p'), value1: '−9', value2: '9'}));
        expect(rejection(entry({objective: {p: 1, q: Number.NaN}}))).toBe(t('levelsets_graph_error_not_finite', {value0: t('levelsets_graph_lp_field_objective_q')}));
        expect(rejection(entry({constraints: []})))
            .toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_lp_field_constraints'), value1: '1', value2: '5'}));
        expect(rejection(entry({constraints: Array.from({length: 6}, () => ({a: 1, b: 1, c: 1}))}))).toContain('5');
    });

    it('rejects a missing field, a wrong shape and a zero row with the matching sentence', () => {
        expect(rejection(entry({sweep: undefined}))).toBe(t('levelsets_graph_error_missing', {value0: t('levelsets_graph_lp_field_sweep')}));
        expect(rejection(entry({objective: undefined}))).toBe(t('levelsets_graph_error_missing', {value0: t('levelsets_graph_lp_field_objective')}));
        expect(rejection(entry({constraints: 5}))).toBe(t('levelsets_graph_error_not_an_object', {value0: t('levelsets_graph_lp_field_constraints')}));
        expect(rejection(entry({constraints: [7]}))).toBe(t('levelsets_graph_error_not_an_object', {value0: t('levelsets_graph_lp_field_row', {value0: row(1)})}));
        expect(rejection(entry({constraints: [{a: 1, b: 1, c: 1}, {a: 0, b: 0, c: 3}]})))
            .toBe(t('levelsets_graph_lp_error_zero_row', {value0: t('levelsets_graph_lp_field_row', {value0: row(2)})}));
        expect(rejection([['LinearProgram', 7]])).toBe(t('levelsets_graph_error_not_an_object', {value0: t('levelsets_graph_lp_field_state')}));
    });

    it('rejects a wrong file shape and a wrong graph state', () => {
        expect(rejection('nonsense')).toBe(t('levelsets_graph_lp_error_preset_shape'));
        expect(rejection([])).toBe(t('levelsets_graph_lp_error_preset_entries'));
        expect(rejection([entry()[0], entry()[0]])).toBe(t('levelsets_graph_lp_error_preset_entries'));
        expect(rejection([['Contour', state()]])).toBe(t('levelsets_graph_lp_error_preset_shape'));
        expect(rejection([['LinearProgram']])).toBe(t('levelsets_graph_lp_error_preset_shape'));
        const checkGraphState = lpPresetCollection.checkGraphState!;
        expect(checkGraphState({initialized: true})).toBeUndefined();
        expect(checkGraphState({})).toBeUndefined();
        expect(checkGraphState({initialized: 1})).toBeDefined();
        expect(checkGraphState({initialized: true, sweep: 3})).toBeDefined();
        expect(checkGraphState('x')).toBeDefined();
    });

    it('speaks English after a language switch', () => {
        setLanguage('en');
        expect(rejection(entry({sweep: 101}))).toBe(t('levelsets_graph_error_out_of_range', {value0: t('levelsets_graph_lp_field_sweep'), value1: '−100', value2: '100'}));
        expect(rejection(entry({constraints: [{a: 0, b: 0, c: 3}]}))).toContain('constraint 1');
        expect(rejection('x')).toBe(t('levelsets_graph_lp_error_preset_shape'));
    });
});
