import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {message} from '../../localization';
import {CountPuck} from './CountPuck';
import {RangePuck} from './RangePuck';
import {PuckSymbol, bareName, spokenName, symbolParts, symbolText} from './puckSymbol';

afterEach(cleanup);

describe('symbolParts', () => {
    it('understands a letter, a Greek letter and sub- and superscripts in either order', () => {
        expect(symbolParts('x')).toEqual({base: 'x', upright: false});
        expect(symbolParts(' t ')).toEqual({base: 't', upright: false});
        expect(symbolParts('\\alpha')).toEqual({base: 'α', upright: false});
        expect(symbolParts('\\varepsilon')).toEqual({base: 'ϵ', upright: false});
        expect(symbolParts('\\Omega')).toEqual({base: 'Ω', upright: true});
        expect(symbolParts('x_0')).toEqual({base: 'x', upright: false, sub: '0'});
        expect(symbolParts('a_{11}')).toEqual({base: 'a', upright: false, sub: '11'});
        expect(symbolParts('a_{1,2}')).toEqual({base: 'a', upright: false, sub: '1,2'});
        expect(symbolParts('T_n')).toEqual({base: 'T', upright: false, sub: 'n'});
        expect(symbolParts('\\lambda_1')).toEqual({base: 'λ', upright: false, sub: '1'});
        expect(symbolParts('x_{\\alpha}')).toEqual({base: 'x', upright: false, sub: 'α'});
        expect(symbolParts('t^2')).toEqual({base: 't', upright: false, sup: '2'});
        expect(symbolParts('x_0^2')).toEqual({base: 'x', upright: false, sub: '0', sup: '2'});
        expect(symbolParts('x^2_0')).toEqual({base: 'x', upright: false, sub: '0', sup: '2'});
    });

    it('rejects what needs typesetting', () => {
        for (const tex of ['\\frac{a}{b}', 'f(x)', 'ab', '', '\\foo', 'x_', 'x_{}', 'x_{a+b}', 'x_0_1', 'x_{0', 'x+1', 'x_0y']) {
            expect(symbolParts(tex), tex).toBeNull();
        }
    });
});

describe('symbolText', () => {
    it('flattens a simple symbol and returns the source of any other', () => {
        expect(symbolText('x_0')).toBe('x0');
        expect(symbolText('\\lambda_1')).toBe('λ1');
        expect(symbolText('x_0^2')).toBe('x02');
        expect(symbolText('\\frac{a}{b}')).toBe('\\frac{a}{b}');
        expect(symbolText('f(x)')).toBe('f(x)');
    });
    it('speaks a name with its symbol, or the name alone', () => {
        expect(spokenName('Središče', 'c')).toBe('Središče c');
        expect(spokenName('Središče', undefined)).toBe('Središče');
    });
});

describe('Unicode scripts and legacy labels', () => {
    it('reads Unicode subscript and superscript digits as sub and sup', () => {
        expect(symbolParts('x₀')).toEqual({base: 'x', upright: false, sub: '0'});
        expect(symbolParts('x²')).toEqual({base: 'x', upright: false, sup: '2'});
        expect(symbolParts('a₁₁')).toEqual({base: 'a', upright: false, sub: '11'});
        expect(symbolText('x₀')).toBe('x0');
    });
    it('drops a trailing symbol the label repeats', () => {
        expect(bareName('Središče c', 'c')).toBe('Središče');
        expect(bareName('Središče', 'c')).toBe('Središče');
        expect(bareName('Točka x na osi', 'x')).toBe('Točka x na osi');
        expect(bareName('Točka x', 'x')).toBe('Točka');
        expect(bareName('c', 'c')).toBe('c');
        expect(bareName(' c', 'c')).toBe(' c');
        expect(bareName('Središče c', undefined)).toBe('Središče c');
        expect(spokenName('Središče c', 'c')).toBe('Središče c');
        expect(spokenName('Središče', 'c')).toBe('Središče c');
    });
    it('shows the bare name and a no-break space before the symbol', () => {
        const {container} = render(<PuckSymbol tex="c"/>);
        expect(container).toBeTruthy();
        cleanup();
        const view = render(<RangePuck parameter={{kind: 'range', key: 'a', label: message('shell_card_tools'), symbol: 'x', placement: 'board', min: 0, max: 1, step: 0.1}} value={0} onWrite={() => undefined}/>);
        expect(view.container.querySelector('.puck-label')?.textContent).toBe('Orodja x');
    });
});

describe('PuckSymbol', () => {
    it('renders a simple symbol synchronously as var with sub and sup', () => {
        const {container} = render(<PuckSymbol tex="x_0^2"/>);
        expect(container.querySelector('.puck-symbol var')?.textContent).toBe('x');
        expect(container.querySelector('.puck-symbol sub')?.textContent).toBe('0');
        expect(container.querySelector('.puck-symbol sup')?.textContent).toBe('2');
        expect(container.querySelector('var')).not.toHaveAttribute('data-upright');
    });
    it('marks an uppercase Greek letter upright', () => {
        const {container} = render(<PuckSymbol tex={'\\Delta'}/>);
        expect(container.querySelector('var')).toHaveAttribute('data-upright');
    });
    it('falls back to Tex for a symbol it cannot place', () => {
        const {container} = render(<PuckSymbol tex="f(x)"/>);
        expect(container.querySelector('.puck-symbol.puck-symbol-tex')).not.toBeNull();
        expect(container.querySelector('var')).toBeNull();
    });
});

const range = (extra: Partial<RangeParameter> = {}): RangeParameter => ({
    kind: 'range', key: 'a', label: message('shell_card_tools'), placement: 'board', min: -2, max: 2, step: 0.25, ...extra,
});
const count = (min: number, max: number): CountParameter => ({kind: 'count', key: 'n', label: message('shell_card_legend'), placement: 'board', min, max});

describe('puck label with a symbol', () => {
    it('shows the name and the symbol, and names the slider "name symbol"', () => {
        const {container} = render(<RangePuck parameter={range({symbol: 'x_0'})} value={0} onWrite={() => undefined}/>);
        expect(container.querySelector('.puck-label .puck-name')?.textContent).toBe('Orodja');
        expect(container.querySelector('.puck-label .puck-symbol')).not.toBeNull();
        expect(screen.getByRole('slider', {name: 'Orodja x0'})).toBeInTheDocument();
    });
    it('shows only the name without a symbol', () => {
        const {container} = render(<RangePuck parameter={range()} value={0} onWrite={() => undefined}/>);
        expect(container.querySelector('.puck-label .puck-name')?.textContent).toBe('Orodja');
        expect(container.querySelector('.puck-symbol')).toBeNull();
        expect(screen.getByRole('slider', {name: 'Orodja'})).toBeInTheDocument();
    });
    it('names a count puck and its steppers with the symbol', () => {
        render(<CountPuck parameter={{...count(1, 12), symbol: 'n'}} value={3} onWrite={() => undefined}/>);
        expect(screen.getByRole('spinbutton', {name: 'Legenda n'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /Povečaj.*Legenda n/})).toBeInTheDocument();
    });
});

describe('count scale', () => {
    const scale = (container: HTMLElement) => container.querySelector<HTMLElement>('.puck-stepper > .puck-scale')!;
    const render3 = (min: number, max: number, value: number) =>
        scale(render(<CountPuck parameter={count(min, max)} value={value} onWrite={() => undefined}/>).container);

    it('carries the step count and the index of the value, at min, in the middle and at max', () => {
        for (const [value, index] of [[1, 0], [6, 5], [12, 11]]) {
            const el = render3(1, 12, value);
            expect(el.style.getPropertyValue('--puck-scale-steps')).toBe('12');
            expect(el.style.getPropertyValue('--puck-scale-index')).toBe(String(index));
            cleanup();
        }
    });
    it('is decorative: hidden from assistive technology, not focusable', () => {
        const el = render3(1, 5, 2);
        expect(el).toHaveAttribute('aria-hidden', 'true');
        expect(el).not.toHaveAttribute('tabindex');
        expect(el.childElementCount).toBe(0);
    });
    it('is dense above 13 steps only', () => {
        expect(render3(1, 13, 1)).not.toHaveAttribute('data-dense');
        cleanup();
        expect(render3(1, 14, 1)).toHaveAttribute('data-dense');
    });
});
