import React from 'react';
import {act, render} from '@testing-library/react';
import {ReadoutHeading, ReadoutHelp, ReadoutList, ReadoutScrollTable} from './ReadoutParts';
import {StepCounter} from './StepCounter';
import {setLanguage} from '../../../localization';

beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

describe('StepCounter', () => {
    test('shows a 0-based index from 1, with the key of its noun', () => {
        const view = render(<StepCounter step={0} length={5}/>);
        expect(view.container.querySelector('[data-step-counter]')!.textContent).toBe('Korak 1 od 5');
        view.rerender(<StepCounter step={4} length={5} noun="event"/>);
        expect(view.container.querySelector('[data-step-counter]')!.textContent).toBe('Dogodek 5 od 5');
    });

    test('an empty run still counts one step, and English reads in English', () => {
        setLanguage('en');
        const view = render(<StepCounter step={0} length={0}/>);
        expect(view.container.textContent).toBe('Step 1 of 1');    });
});

describe('ReadoutList', () => {
    test('sentence rows are a named list of data-readout items', () => {
        const view = render(<ReadoutList label="Odčitki" hooks={{'data-demo': 'readout'}} rows={[{id: 'a', value: 'Eno.'}, {id: 'b', value: 'Dve.'}]}/>);
        const list = view.getByRole('list', {name: 'Odčitki'});
        expect(list.getAttribute('data-demo')).toBe('readout');
        expect([...list.querySelectorAll('li')].map(li => li.getAttribute('data-readout'))).toEqual(['a', 'b']);
    });

    test('labelled rows are a dl with a term and a value each', () => {
        const view = render(<ReadoutList label="Odčitki" rows={[{id: 'x', label: 'x', value: '1,5'}]}/>);
        const row = view.container.querySelector('dl [data-readout="x"]')!;
        expect(row.querySelector('dt')!.textContent).toBe('x');
        expect(row.querySelector('dd')!.textContent).toBe('1,5');
    });
});

test('the heading is an h3 and the help text carries no note role', () => {
    const view = render(<><ReadoutHeading>Naslov</ReadoutHeading><ReadoutHelp hooks={{'data-help': 'x'}}>Pomoč</ReadoutHelp></>);
    expect(view.getByRole('heading', {level: 3, name: 'Naslov'})).toBeTruthy();
    const help = view.container.querySelector('[data-help="x"]')!;
    expect(help.getAttribute('role')).toBeNull();
    expect(help.textContent).toBe('Pomoč');
});

describe('ReadoutScrollTable', () => {
    afterEach(() => { vi.unstubAllGlobals(); });

    test('is neither a tab stop nor a region while the table fits', () => {
        const view = render(<ReadoutScrollTable label="Tabela"><table><tbody><tr><td>1</td></tr></tbody></table></ReadoutScrollTable>);
        const wrapper = view.container.firstElementChild!;
        expect(wrapper.getAttribute('tabindex')).toBeNull();
        expect(wrapper.getAttribute('role')).toBeNull();
    });

    test('takes a tab stop and a name when it scrolls sideways', () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
        try {
            const view = render(<ReadoutScrollTable label="Tabela"><table><tbody><tr><td>1</td></tr></tbody></table></ReadoutScrollTable>);
            act(() => undefined);
            expect(view.getByRole('region', {name: 'Tabela'}).getAttribute('tabindex')).toBe('0');
        } finally {
            vi.restoreAllMocks();
        }
    });
});
