import {describe, expect, it} from 'vitest';
import {normalizeTex, referencedCards, valueTokens} from './lessonRefs';

const cards = [
    {kind: 'text', readouts: true, text: 'y = −2 f(0,5(x − 3)) + 1 (u, f(u)) (2; 4) → (7; −7)'},
    {kind: 'legend', legend: true, text: 'modra: graf'},
    {kind: 'section-steps', title: 'Vrstni red operacij', text: 'premik znotraj: x − 3'},
];
const refs = (frame: string) => [...referencedCards(frame, cards)].sort();

describe('lessonRefs', () => {
    it('normalizes TeX', () => {
        expect(normalizeTex('\\(a{,}5\\) \\[b\\] −2')).toBe('a,5 b -2');
    });
    it('rule a: odčit stem opens the readouts card', () => {
        expect(refs('Odčitaj vrednost na kartici.')).toEqual(['text']);
        expect(refs('V odčitkih vidiš napako.')).toEqual(['text']);
    });
    it('rule b: legend', () => { expect(refs('Preberi legendo.')).toEqual(['legend']); });
    it('rule c: section title', () => { expect(refs('Sledi vrstnemu redu operacij: Vrstni red operacij.')).toEqual(['section-steps']); });
    it('rule d: a pair matches whatever its separator', () => {
        expect(refs('Poišči sledeno točko \((2, 4)\).')).toEqual(['text']);
        expect(refs('Točka (2;4).')).toEqual(['text']);
        expect(refs('Slika je (7; −7).')).toEqual(['text']);
    });
    it('rule d: decimals of 4+ characters; short ones like 0,5 are too common to count', () => {
        expect(refs('Raztegni z \(b = 0{,}5\).')).toEqual([]);
        expect(valueTokens('2{,}5 in 3')).toEqual(new Set());
        expect(valueTokens('1{,}4161 in 0{,}25')).toEqual(new Set(['1,4161', '0,25']));
    });
    it('negative: no reference, no card', () => {
        expect(refs('Povleci drsnik in opazuj graf; število 3 in 12.')).toEqual([]);
        expect(refs('Točka (5; 6) in 0,9.')).toEqual([]);
    });
});
