import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {HomeDemonstrationsCarousel} from './HomeDemonstrationsCarousel';
import {getDemonstrationCatalog} from './demonstrations';
import {resetVisitDemonstrationIds} from './homeDemonstrationPool';
import {setLanguage} from './localization';

const ids = ['voronoi', 'epicycles', 'linear-map', 'decasteljau', 'fortune', 'curve-comb'] as const;
const titleOf = (id: string) => getDemonstrationCatalog().demonstrations.find(entry => entry.id === id)!.catalogTitle;

beforeEach(() => {
    setLanguage('sl');
    resetVisitDemonstrationIds(ids);
});
afterEach(() => resetVisitDemonstrationIds());

function mount() {
    return render(<MemoryRouter><HomeDemonstrationsCarousel/></MemoryRouter>);
}
const choiceGroup = () => screen.getByRole('group');
const currentTitle = () => screen.getByRole('heading', {level: 3}).textContent;

test('the cards are the only navigation: no arrow buttons or counter', () => {
    const view = mount();
    expect(view.container.querySelector('.demonstrations-opening-controls')).toBeNull();
    expect(screen.queryByRole('button', {name: /^(Naprej|Nazaj):/})).toBeNull();
    expect(within(choiceGroup()).getAllByRole('button')).toHaveLength(6);
});

test('clicking a card selects it and updates the preview title', () => {
    mount();
    const choices = within(choiceGroup()).getAllByRole('button');
    expect(currentTitle()).toBe(titleOf('voronoi'));
    fireEvent.click(choices[3]);
    expect(choices[3]).toHaveAttribute('aria-pressed', 'true');
    expect(choices[0]).toHaveAttribute('aria-pressed', 'false');
    expect(currentTitle()).toBe(titleOf('decasteljau'));
});

test('ArrowRight on the carousel still advances the selection', () => {
    mount();
    const choices = within(choiceGroup()).getAllByRole('button');
    fireEvent.keyDown(choices[0], {key: 'ArrowRight'});
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');
    expect(currentTitle()).toBe(titleOf('epicycles'));
});

test('remounting keeps the same six in the same order', () => {
    const labels = () => within(choiceGroup()).getAllByRole('button').map(button => button.getAttribute('aria-label'));
    resetVisitDemonstrationIds();
    const first = mount();
    const before = labels();
    first.unmount();
    mount();
    expect(labels()).toEqual(before);
    expect(before).toHaveLength(6);
});
