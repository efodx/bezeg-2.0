import React from 'react';
import {render} from '@testing-library/react';
import {FunctionReadout} from './FunctionReadout';
import {setLanguage} from '../../localization';

beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

describe('FunctionReadout', () => {
    it('renders no list when there are no rows, but keeps the heading and notes', () => {
        const view = render(<FunctionReadout title="Rezultat" rows={[]} note="Opomba"/>);
        expect(view.container.querySelector('ul, dl')).toBeNull();
        expect(view.getByRole('heading', {name: 'Rezultat'})).toBeTruthy();
        expect(view.getByText('Opomba')).toBeTruthy();
    });

    it('renders the labelled rows as a named list', () => {
        const view = render(<FunctionReadout title="Rezultat" rows={[{id: 'a', label: 'f(1)', value: '2'}]}/>);
        expect(view.getByLabelText('Rezultat').querySelector('[data-readout="a"]')).toBeTruthy();
    });
});
