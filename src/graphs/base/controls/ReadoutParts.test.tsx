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

test('the heading is the readout title and the help text is muted plain text without a note role', () => {
    const view = render(<><ReadoutHeading>Naslov</ReadoutHeading><ReadoutHelp hooks={{'data-help': 'x'}}>Pomoč</ReadoutHelp></>);
    expect(view.getByRole('heading', {level: 3, name: 'Naslov'}).className).toBe('inspector-reveals-title');
    const help = view.container.querySelector('[data-help="x"]')!;
    expect(help.tagName).toBe('P');
    expect(help.className).toBe('inspector-help');
    expect(help.getAttribute('role')).toBeNull();
    expect(view.queryByRole('note')).toBeNull();
    expect(help.textContent).toBe('Pomoč');
});

describe('ReadoutScrollTable', () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

    /** The width of a table is its text length: a fixed 200 px wrapper, content that grows with its text. */
    const mockWidths = (client = 200) => {
        const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.textContent!.length * 10; });
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(client);
        return scrollWidth;
    };
    const table = (text: string) => <ReadoutScrollTable label="Tabela"><table><tbody><tr><td>{text}</td></tr></tbody></table></ReadoutScrollTable>;

    test('is neither a tab stop nor a region while the table fits', () => {
        const measured = mockWidths();
        const view = render(table('kratko'));
        const wrapper = view.container.firstElementChild!;
        expect(measured).toHaveBeenCalled();
        expect(wrapper.getAttribute('data-scrolls')).toBe('false');
        expect(wrapper.getAttribute('tabindex')).toBeNull();
        expect(wrapper.getAttribute('role')).toBeNull();
    });

    test('content that grows inside a fixed-width wrapper makes it a tab stop and a region, and shrinking undoes it', () => {
        mockWidths();
        const view = render(table('kratko'));
        expect(view.queryByRole('region')).toBeNull();
        view.rerender(table('zelo dolga vrstica, ki je širša od okvirja tabele'));
        expect(view.getByRole('region', {name: 'Tabela'}).getAttribute('tabindex')).toBe('0');
        view.rerender(table('kratko'));
        expect(view.queryByRole('region')).toBeNull();
    });

    test('observes the table itself, so a size change that no render announced is measured', () => {
        const callbacks: Array<() => void> = [];
        const observed: Element[] = [];
        vi.stubGlobal('ResizeObserver', class {
            constructor(callback: () => void) { callbacks.push(callback); }
            observe(target: Element) { observed.push(target); }
            disconnect() { /* nothing to release */ }
        });
        let width = 100;
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => width);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
        const view = render(table('x'));
        expect(observed).toContain(view.container.querySelector('table'));
        expect(view.queryByRole('region')).toBeNull();
        width = 400;
        act(() => { callbacks[callbacks.length - 1](); });
        expect(view.getByRole('region', {name: 'Tabela'})).toBeTruthy();
    });

    test('takes a tab stop and a name when a capped height makes it scroll down', () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(100);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
        vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(500);
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(224);
        const view = render(table('x'));
        expect(view.getByRole('region', {name: 'Tabela'}).getAttribute('tabindex')).toBe('0');
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
