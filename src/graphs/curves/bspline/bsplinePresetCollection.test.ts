import {afterEach, describe, expect, it} from 'vitest';
import {BSPLINE_COLLECTION_KEY, bsplinePresetCollection} from './bsplinePresetCollection';
import {Language, Message, renderMessage, setLanguage} from '../../../localization';

const valid = () => ({degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 0]], weights: [1, 2, 1, 1]});

const rejection = (data: unknown): Message => {
    const result = bsplinePresetCollection.check(data);
    if (!('rejection' in result)) throw new Error('accepted');
    return result.rejection;
};

afterEach(() => setLanguage('sl'));

describe('bspline Preset collection', () => {
    it('uses the frozen key and round-trips valid data, with and without weights', () => {
        expect(bsplinePresetCollection.key).toBe(BSPLINE_COLLECTION_KEY);
        expect(bsplinePresetCollection.check(valid())).toEqual({data: valid()});
        const {weights: _weights, ...plain} = valid();
        expect(bsplinePresetCollection.check(plain)).toEqual({data: plain});
        expect(bsplinePresetCollection.check(JSON.parse(JSON.stringify(valid())))).toEqual({data: valid()});
    });

    it('accepts unclamped uniform knots and an interior break of multiplicity k + 1', () => {
        expect('data' in bsplinePresetCollection.check({degree: 2, knots: [0, 1, 2, 3, 4, 5, 6], points: valid().points})).toBe(true);
        const six = [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [5, 1]];
        expect('data' in bsplinePresetCollection.check({degree: 2, knots: [0, 0, 0, 1, 1, 1, 2, 2, 2], points: six})).toBe(true);
    });

    const cases: [string, unknown, string, string][] = [
        ['wrong length', {...valid(), knots: [0, 0, 0, 1, 2, 2]}, 'bspline_knots_wrong_length', 'vozelni vektor mora imeti 7 vozlov (število točk + stopnja + 1), prednastavitev jih ima 6'],
        ['decreasing', {...valid(), knots: [0, 0, 0, 2, 1, 2, 2]}, 'bspline_knots_decreasing', 'vozli ne smejo padati: vozel 5 je manjši od prejšnjega'],
        ['multiplicity too high', {...valid(), knots: [0, 0, 0, 0, 0, 2, 2]}, 'bspline_knots_multiplicity_too_high', 'vozel se sme ponoviti največ 3-krat; zmanjšaj večkratnost vozla'],
        ['empty domain', {...valid(), knots: [0, 0, 1, 1, 1, 2, 2]}, 'bspline_knots_empty_domain', 'definicijsko območje je prazno: prvi in zadnji upoštevani vozel sta enaka'],
        ['not finite knot', {...valid(), knots: [0, 0, 0, 1, '2', 2, 2]}, 'bspline_knots_not_finite', 'vsi vozli morajo biti končna števila'],
        ['nonpositive weight', {...valid(), weights: [1, 0, 1, 1]}, 'bspline_weight_nonpositive', 'utež 2 mora biti pozitivna'],
        ['non-finite weight', {...valid(), weights: [1, 1, 1, Infinity]}, 'bspline_weight_not_finite', 'utež 4 mora biti končno število'],
        ['wrong weight count', {...valid(), weights: [1, 1, 1]}, 'bspline_weights_wrong_count', 'uteži mora biti toliko kot kontrolnih točk (4)'],
        ['degree', {...valid(), degree: 0}, 'bspline_invalid_degree', 'stopnja B-zlepka mora biti celo število, vsaj 1'],
        ['too few points', {...valid(), degree: 4, knots: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]}, 'bspline_too_few_points', 'B-zlepek stopnje 4 potrebuje vsaj 5 kontrolnih točk, prednastavitev jih ima 4'],
        ['bad point', {...valid(), points: [[0, 0], [1], [3, 2], [4, 0]]}, 'control_points_must_be_pairs_of_finite_numbers', 'kontrolne točke morajo biti pari končnih števil'],
        ['not a record', [1, 2], 'bspline_invalid_data', 'podatki B-zlepka morajo biti zapis s stopnjo, vozli in točkami'],
    ];

    it.each(cases)('rejects %s with an actionable reason in Slovenian and English', (_name, data, key, slovenian) => {
        const reason = rejection(data);
        expect(reason.key).toBe(key);
        const languages: Language[] = ['sl', 'en'];
        const rendered = languages.map(language => {
            setLanguage(language);
            return renderMessage(reason);
        });
        expect(rendered[0]).toBe(slovenian);
        expect(rendered[1]).not.toBe(rendered[0]);
        expect(rendered[1]).not.toMatch(/\{value\d\}/);
    });

    it('checks the shape of the stored blossom arguments, with the reason in Slovenian and English', () => {
        expect(bsplinePresetCollection.checkGraphState!({args: [0, 0.5, 1]})).toBeUndefined();
        for (const args of [0.5, [0, '1'], [0, Infinity]]) {
            const reason = bsplinePresetCollection.checkGraphState!({args})!;
            expect(reason.key).toBe('invalid_value');
            expect(renderMessage(reason)).toBe('neveljavna vrednost args');
            setLanguage('en');
            expect(renderMessage(reason)).toBe('invalid value args');
            setLanguage('sl');
        }
    });
});
