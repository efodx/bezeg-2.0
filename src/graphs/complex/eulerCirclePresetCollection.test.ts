import {describe, expect, test} from 'vitest';
import {renderMessage, setLanguage} from '../../localization';
import {DEFAULT_EULER_CIRCLE_STATE} from '../../complex/eulerCircleModel';
import {
    EULER_CIRCLE_PRESET_KEY, eulerCircleErrorMessage, eulerCirclePresetCollection, eulerCirclePresetData,
} from './eulerCirclePresetCollection';

const entry = (stored: unknown) => [['EulerCircle', stored]];
const rejection = (data: unknown): string | undefined => {
    const result = eulerCirclePresetCollection.check(data);
    return 'rejection' in result ? renderMessage(result.rejection) : undefined;
};

describe('Euler circle Preset collection', () => {
    test('the key is a file contract and the default state round trips through check', () => {
        expect(EULER_CIRCLE_PRESET_KEY).toBe('complex-euler');
        const data = eulerCirclePresetData(DEFAULT_EULER_CIRCLE_STATE);
        expect(data).toEqual([['EulerCircle', {degrees: 30, omega: 2, degree: 5, velocity: true, acceleration: false, mode: 'motion', b: 45}]]);
        expect(eulerCirclePresetCollection.check(JSON.parse(JSON.stringify(data)))).toEqual({data});
    });

    test('unknown fields of an entry are dropped', () => {
        const result = eulerCirclePresetCollection.check(entry({...DEFAULT_EULER_CIRCLE_STATE, extra: true}));
        expect(result).toEqual({data: eulerCirclePresetData(DEFAULT_EULER_CIRCLE_STATE)});
    });

    test('each rejection names the field and the accepted range, in Slovenian and in English', () => {
        const stored = (patch: Record<string, unknown>) => entry({...DEFAULT_EULER_CIRCLE_STATE, ...patch});
        setLanguage('sl');
        expect(rejection(stored({degrees: 361}))).toBe('Kot θ mora biti med 0 in 360.');
        expect(rejection(stored({omega: 1.5}))).toBe('Kotna hitrost ω mora biti celo število.');
        expect(rejection(stored({degree: undefined}))).toBe('Stopnja vrste N manjka.');
        expect(rejection(stored({velocity: 1}))).toBe('Stikalo za hitrost mora biti true ali false.');
        expect(rejection(stored({degrees: NaN}))).toBe('Kot θ mora biti končno število.');
        expect(rejection([])).toBe('Datoteka mora vsebovati natanko eno stanje Eulerjeve krožnice.');
        expect(rejection('x')).toBe('Datoteka ne vsebuje stanja Eulerjeve krožnice.');
        expect(rejection(entry(null))).toBe('Datoteka mora vsebovati objekt s polji degrees, omega, degree, velocity in acceleration.');
        setLanguage('en');
        expect(rejection(stored({degrees: 361}))).toBe('The angle θ must be between 0 and 360.');
        expect(rejection(stored({omega: 5}))).toBe('The angular speed ω must be between 1 and 4.');
        expect(rejection(stored({acceleration: 'x'}))).toBe('The acceleration switch must be true or false.');
        expect(rejection([['Other', {}]])).toBe('The file does not hold an Euler circle state.');
        expect(rejection([entry({})[0], entry({})[0]])).toBe('The file must hold exactly one Euler circle state.');
        setLanguage('sl');
    });

    test('a Preset without the mode and the second angle gets the defaults; a present one must be valid', () => {
        const {mode, b, ...old} = DEFAULT_EULER_CIRCLE_STATE;
        expect(mode).toBe('motion');
        expect(b).toBe(45);
        expect(eulerCirclePresetCollection.check(entry(old))).toEqual({data: eulerCirclePresetData(DEFAULT_EULER_CIRCLE_STATE)});
        setLanguage('en');
        expect(rejection(entry({...old, b: 47}))).toBe('The second angle φ must be a multiple of 5.');
        expect(rejection(entry({...old, b: 365}))).toBe('The second angle φ must be between 0 and 360.');
        expect(rejection(entry({...old, mode: 'x'}))).toBe('The mode must be motion or product.');
        setLanguage('sl');
        expect(rejection(entry({...old, b: 47}))).toBe('Drugi kot φ mora biti večkratnik števila 5.');
        expect(rejection(entry({...old, mode: 'x'}))).toBe('Način mora biti motion ali product.');
        expect(eulerCirclePresetCollection.check(entry({...old, mode: 'product', b: 355}))).toEqual({data: [['EulerCircle', {...old, mode: 'product', b: 355}]]});
    });

    test('an unknown field name falls back to the state, and the message of an error is a catalog message', () => {
        setLanguage('en');
        expect(renderMessage(eulerCircleErrorMessage({field: 'other', reason: 'missing'}))).toBe('The state is missing.');
        setLanguage('sl');
    });

    test('the graph state holds only the initialized flag', () => {
        const c = eulerCirclePresetCollection;
        expect(c.checkGraphState).toBeDefined();
        expect(c.checkGraphState?.({})).toBeUndefined();
        expect(c.checkGraphState?.({initialized: true})).toBeUndefined();
        expect(c.checkGraphState?.({initialized: 1})).toBeDefined();
        expect(c.checkGraphState?.({degrees: 30})).toBeDefined();
        expect(c.checkGraphState?.(null)).toBeDefined();
    });
});
