import {setLanguage} from '../../../localization';
import {weightTex} from './JXGRationalBezierCurve';

afterEach(() => setLanguage('sl'));

describe('the weight label of a rational curve', () => {
    it('writes the weight in the app number format, with the decimal comma as {,} in Slovenian', () => {
        setLanguage('sl');
        expect(weightTex(1)).toBe('1');
        expect(weightTex(2.5)).toBe('2{,}5');
        expect(weightTex(0.125)).toBe('0{,}13');
        setLanguage('en');
        expect(weightTex(2.5)).toBe('2.5');
    });
});
