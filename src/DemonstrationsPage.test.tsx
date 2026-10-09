import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import routes from './Routes';
import {setLanguage} from './localization';

jest.mock('./graphs/curves/bezier/BezierCurveGraph', () => ({__esModule: true, default: () => <p>Opened Bézier graph</p>}));

beforeEach(() => {setLanguage('sl');});

test('Explore opens the catalog, its graph links open demonstrations, and back restores the catalog', async () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    render(<RouterProvider router={router}/>);
    expect(screen.queryByRole('region', {name: 'Začetne demonstracije'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', {name: /Začni raziskovati/}));
    expect(await screen.findByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
    expect(router.state.location.pathname).toBe('/bezeg-2.0/demonstrations');
    const all = screen.getByRole('region', {name: 'Vse demonstracije'});
    expect(within(all).getAllByRole('link')).toHaveLength(34);
    expect(within(all).getAllByRole('link', {name: /Spoznaj to demonstracijo/})).toHaveLength(8);
    expect(within(screen.getByRole('region', {name: 'Začetne demonstracije'})).getAllByRole('link', {name: /Spoznaj to demonstracijo/})[0]).toHaveAttribute('href', '/bezeg-2.0/bezier/curve?learn=1');
    expect(within(all).queryByRole('link', {name: 'Demonstracije'})).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('region', {name: 'Začetne demonstracije'})).getAllByRole('link')[0]);
    expect(await screen.findByText('Opened Bézier graph')).toBeVisible();
    await act(async () => {await router.navigate(-1);});
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
});

test('direct catalog entry and header navigation work in both languages', async () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations?prototype=previews&variant=C']});
    render(<RouterProvider router={router}/>);
    expect(screen.getByRole('region', {name: 'Vse demonstracije'})).toBeVisible();
    expect(screen.getByText('6 tem · 26 prikazov')).toBeVisible();
    expect(screen.queryByRole('button', {name: 'Next prototype'})).not.toBeInTheDocument();
    act(() => setLanguage('en'));
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    expect(within(screen.getByRole('region', {name: 'All demonstrations'})).getAllByRole('link')).toHaveLength(34);
    expect(within(screen.getByRole('region', {name: 'All demonstrations'})).getAllByRole('link', {name: /Learn this demonstration/})).toHaveLength(8);
    expect(screen.getByText('6 families · 26 demonstrations')).toBeVisible();
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
