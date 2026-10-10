import {onlyParameterStateChanged} from './decasteljauParameter';

test('treats parameter playback fields as parameter-only changes', () => {
    expect(onlyParameterStateChanged({t: 0.1, v: 1, animationStatus: 'ready', a: 1}, {t: 0.2, v: 2, animationStatus: 'playing', a: 1})).toBe(true);
});

test('reports other graph state changes', () => {
    expect(onlyParameterStateChanged({t: 0.1, a: 1}, {t: 0.1, a: 2})).toBe(false);
    expect(onlyParameterStateChanged({t: 0.1}, {t: 0.1, added: true})).toBe(false);
});

test('accepts graph-owned keys that the caller handles', () => {
    expect(onlyParameterStateChanged({wholeCurve: false}, {wholeCurve: true}, ['wholeCurve'])).toBe(true);
});
