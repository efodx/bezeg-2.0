import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import routes from './Routes';
import {getDemonstrationCatalog} from './demonstrations';
import {setLanguage} from './localization';

jest.mock('./graphs/curves/bezier/BezierCurveGraph', () => ({__esModule: true, default: () => <p>Opened Bézier graph</p>}));

beforeEach(() => {setLanguage('sl');});

test('Explore opens the catalog, whose topics expand independently and expose every route and preview', async () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    const view = render(<RouterProvider router={router}/>);
    expect(screen.queryByRole('region', {name: 'Začetne demonstracije'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', {name: /Začni raziskovati/}));
    expect(await screen.findByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
    expect(router.state.location.pathname).toBe('/bezeg-2.0/demonstrations');

    const all = screen.getByRole('region', {name: 'Vse demonstracije'});
    const topicButtons = within(all).getAllByRole('button');
    expect(topicButtons).toHaveLength(7);
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(within(all).getAllByRole('link')).toHaveLength(2);

    topicButtons.slice(1).forEach(button => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
        const panel = document.getElementById(button.getAttribute('aria-controls')!);
        expect(panel).toHaveAttribute('hidden');
        expect(within(panel!).queryByRole('link')).not.toBeInTheDocument();
    });

    fireEvent.click(topicButtons[1]);
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(topicButtons[1]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(topicButtons[1]);
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'true');

    topicButtons.forEach(button => {
        if (button.getAttribute('aria-expanded') === 'false') fireEvent.click(button);
    });
    expect(within(all).getAllByRole('link')).toHaveLength(68);
    expect(within(all).getAllByRole('link', {name: /Vodena učna pot:/})).toHaveLength(34);

    const graphLinks = [...view.container.querySelectorAll<HTMLAnchorElement>('.demonstrations-catalog-main')];
    expect(graphLinks.map(link => link.getAttribute('href')).sort()).toEqual(
        getDemonstrationCatalog().demonstrations.map(demonstration => demonstration.path).sort());
    const previews = view.container.querySelectorAll<HTMLImageElement>('.demonstrations-catalog-preview');
    expect(previews).toHaveLength(34);
    previews.forEach(preview => {
        expect(preview).toHaveAttribute('width', '360');
        expect(preview).toHaveAttribute('height', '220');
        expect(preview).toHaveAttribute('alt', '');
        expect(preview).toHaveAttribute('loading', 'lazy');
    });
    expect(screen.queryByText(/Variant [ABC]/)).not.toBeInTheDocument();

    const starting = screen.getByRole('region', {name: 'Začetne demonstracije'});
    expect(within(starting).getAllByRole('link', {name: /Spoznaj to demonstracijo/})[0]).toHaveAttribute('href', '/bezeg-2.0/bezier/curve?learn=1');
    fireEvent.click(within(starting).getAllByRole('link')[0]);
    expect(await screen.findByText('Opened Bézier graph')).toBeVisible();
    await act(async () => {await router.navigate(-1);});
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
});

test('direct catalog entry and header navigation work in both languages', async () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    render(<RouterProvider router={router}/>);
    const all = screen.getByRole('region', {name: 'Vse demonstracije'});
    expect(all).toBeVisible();
    expect(screen.getByText('7 tem · 34 prikazov')).toBeVisible();
    expect(within(all).getAllByRole('button')).toHaveLength(7);
    expect(within(all).getAllByRole('link')).toHaveLength(2);
    expect(screen.queryByRole('group', {name: /prototype/i})).not.toBeInTheDocument();

    act(() => setLanguage('en'));
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    const englishCatalog = screen.getByRole('region', {name: 'All demonstrations'});
    for (const button of within(englishCatalog).getAllByRole('button')) {
        if (button.getAttribute('aria-expanded') === 'false') fireEvent.click(button);
    }
    expect(within(englishCatalog).getAllByRole('link')).toHaveLength(68);
    expect(within(englishCatalog).getAllByRole('link', {name: /Guided lesson:/})).toHaveLength(34);
    expect(screen.getByText('7 families · 34 demonstrations')).toBeVisible();
    expect(screen.getByText(/01 · 1 demonstration$/)).toBeVisible();

    fireEvent.click(screen.getByRole('link', {name: 'Bezeg · home'}));
    expect(await screen.findByRole('link', {name: /Start exploring/})).toBeVisible();
    fireEvent.click(screen.getByRole('link', {name: 'Demonstrations', exact: true}));
    expect(await screen.findByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
});

test('graph entry retains query/hash and unsupported routes retain the error view', async () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/bezier/curve?example=classroom#figure']});
    const view = render(<RouterProvider router={router}/>);
    expect(await screen.findByText('Opened Bézier graph')).toBeVisible();
    expect(router.state.location).toMatchObject({pathname: '/bezeg-2.0/bezier/curve', search: '?example=classroom', hash: '#figure'});
    await act(async () => {await router.navigate('/bezeg-2.0/ph/unknown');});
    expect(screen.getByText(/Strani ni mogoče odpreti/)).toBeVisible();
    expect(screen.queryByText('Opened Bézier graph')).not.toBeInTheDocument();
    view.unmount();
});
