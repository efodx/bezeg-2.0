import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import routes from './Routes';
import {getDemonstrationCatalog} from './demonstrations';
import {POSTER_PENDING} from './demonstrationPosterPending';
import {isGuidedLessonAvailable} from './learning/runtime/lessonAvailability';
import {setLanguage, t} from './localization';

vi.mock('./graphs/base/GraphRoute', () => ({__esModule: true, GraphRoute: () => <p>Opened Bézier graph</p>}));
// Registered routes load their real graph module; these tests cover catalog navigation, so the loader resolves a stub at once.
vi.mock('./graphs/graphLoaders', async () => {
    const actual = await vi.importActual<typeof import('./graphs/graphLoaders')>('./graphs/graphLoaders');
    return {...actual, loadRegisteredGraphFactory: vi.fn(async () => () => undefined)};
});
vi.mock('./learning/runtime/lessonAvailability', async () => {
    const actual = await vi.importActual<typeof import('./learning/runtime/lessonAvailability')>('./learning/runtime/lessonAvailability');
    return {...actual, isGuidedLessonAvailable: vi.fn(actual.isGuidedLessonAvailable)};
});

beforeEach(() => {setLanguage('sl');});

test('a demonstration without a reviewed lesson retains graph entry and omits lesson entry', () => {
    vi.mocked(isGuidedLessonAvailable).mockImplementation(id => id !== 'bernstein');
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations?topic=basics']});
    render(<RouterProvider router={router}/>);
    const card = document.getElementById('demonstration-card-bernstein')!;
    expect(card.querySelector('.demonstrations-catalog-graph')).toHaveAttribute('href', '/bezeg-2.0/bernstein');
    expect(card.querySelector('.demonstrations-catalog-lesson')).toBeNull();
});

test('the catalogue shows the ordered collection and only supported lesson destinations', async () => {
    const catalog = getDemonstrationCatalog();
    const expectedLessons = catalog.demonstrations.filter(entry => isGuidedLessonAvailable(entry.id));
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    const view = render(<RouterProvider router={router}/>);

    expect(screen.getByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(`Prikazanih ${catalog.demonstrations.length} od ${catalog.demonstrations.length}`);
    const cards = [...view.container.querySelectorAll<HTMLLIElement>('.demonstrations-catalog-card')];
    expect(cards).toHaveLength(catalog.demonstrations.length);
    // Teaching order is family by family, also for rows registered feature-locally (listed last in the flat registry).
    const ordered = catalog.families.flatMap(family => family.demonstrations);
    expect(ordered).toHaveLength(catalog.demonstrations.length);
    cards.forEach((card, index) => {
        const entry = ordered[index];
        expect(card.querySelector('.demonstrations-catalog-family')).toHaveTextContent(
            catalog.families.find(family => family.id === entry.family)!.title,
        );
        expect(card.querySelector('.demonstrations-catalog-title')).toHaveTextContent(entry.catalogTitle);
        expect(card.querySelector('.demonstrations-catalog-copy p')).not.toBeEmptyDOMElement();
        // Posters are a partial record: ids in POSTER_PENDING have none until their capture.
        if (!POSTER_PENDING.includes(entry.id)) {
            expect(card.querySelector('.demonstrations-catalog-preview')).toHaveAttribute('src');
            expect(card.querySelector('.demonstrations-catalog-preview')).toHaveAttribute('alt', '');
        }
        expect(card.querySelector('.demonstrations-catalog-lesson') !== null).toBe(isGuidedLessonAvailable(entry.id));
    });
    expect(view.container.querySelectorAll('.demonstrations-catalog-graph')).toHaveLength(catalog.demonstrations.length);
    expect(expectedLessons.length).toBeGreaterThan(0);
});

test('family and diacritic-insensitive search filters combine and survive URL history', async () => {
    const catalog = getDemonstrationCatalog();
    const family = catalog.families.find(entry => entry.id === '/bezeg-2.0/ph')!;
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations?campaign=class#cards']});
    render(<RouterProvider router={router}/>);

    const search = screen.getByRole('searchbox', {name: 'Poišči demonstracijo'});
    fireEvent.change(search, {target: {value: 'krívulja'}});
    expect(router.state.location.search).toContain('campaign=class');
    expect(router.state.location.hash).toBe('#cards');
    expect(router.state.location.search).toContain('q=kr%C3%ADvulja');
    const searchCount = screen.getByRole('status').textContent;
    expect(searchCount).toContain('od');
    expect(document.querySelectorAll('.demonstrations-catalog-graph').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('navigation', {name: 'Tema'}).querySelector(`button[aria-pressed="false"]:nth-child(${catalog.families.indexOf(family) + 2})`)!);
    expect(router.state.location.search).toContain(`topic=${encodeURIComponent(family.id)}`);
    expect(router.state.location.search).toContain('q=kr%C3%ADvulja');
    const cards = screen.getAllByRole('listitem');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(within(card).getByText(family.title)).toBeVisible();

    await act(async () => {await router.navigate(-1);});
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('krívulja');
    expect(router.state.location.search).not.toContain('topic=');
});

test('whitespace-only input remains visible without adding an empty q parameter', () => {
    const count = getDemonstrationCatalog().demonstrations.length;
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations?camp=class']});
    render(<RouterProvider router={router}/>);
    const search = screen.getByRole('searchbox', {name: 'Poišči demonstracijo'});
    fireEvent.change(search, {target: {value: '   '}});
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('   ');
    expect(router.state.location.search).toBe('?camp=class');
    expect(screen.getByRole('status')).toHaveTextContent(`Prikazanih ${count} od ${count}`);
    fireEvent.click(screen.getByRole('button', {name: t('catalog_clear_query')}));
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
    expect(router.state.location.search).toBe('?camp=class');
});

test('encoded and malformed topics resolve safely, while zero results offer clear actions', () => {
    const catalog = getDemonstrationCatalog();
    const encodedFamily = encodeURIComponent(catalog.families[1].id);
    const router = createMemoryRouter(routes, {initialEntries: [`/bezeg-2.0/demonstrations?topic=${encodedFamily}`]});
    render(<RouterProvider router={router}/>);
    expect(screen.getAllByRole('listitem')).toHaveLength(catalog.families[1].demonstrations.length);

    act(() => {void router.navigate('/bezeg-2.0/demonstrations?topic=%E0%A4%A');});
    expect(screen.getAllByRole('listitem')).toHaveLength(catalog.demonstrations.length);
    act(() => {void router.navigate('/bezeg-2.0/demonstrations?topic=not-a-family&q=impossible');});
    expect(screen.getByRole('heading', {name: t('catalog_no_results')})).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', {name: t('catalog_clear_query')})[0]);
    expect(screen.getAllByRole('listitem')).toHaveLength(catalog.demonstrations.length);
});

test('graph and lesson entry carry a validated return context and unrelated page navigation remains available', async () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations?topic=analysis&q=integral&school=west#focus']});
    render(<RouterProvider router={router}/>);
    const graphAction = document.querySelector<HTMLAnchorElement>('.demonstrations-catalog-graph')!;
    fireEvent.click(graphAction);
    expect(await screen.findByText('Opened Bézier graph')).toBeVisible();
    expect(router.state.location.pathname).toBe('/bezeg-2.0/analysis/accumulation');
    expect(router.state.location.state.demonstrationReturn).toMatchObject({
        kind: 'demonstration-return',
        location: {pathname: '/bezeg-2.0/demonstrations', search: '?topic=analysis&q=integral&school=west', hash: '#focus'},
        cardId: 'demonstration-card-accumulation',
        focusTarget: 'demonstration-card-accumulation-graph',
    });
    await act(async () => {await router.navigate(-1);});
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
    expect(router.state.location.search).toBe('?topic=analysis&q=integral&school=west');
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('integral');
});

test('the shared catalogue copy and filters translate with the selected language', () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    render(<RouterProvider router={router}/>);
    expect(screen.getByRole('searchbox', {name: 'Poišči demonstracijo'})).toBeVisible();
    act(() => setLanguage('en'));
    expect(screen.getByRole('searchbox', {name: 'Find a demonstration'})).toBeVisible();
    expect(screen.getByRole('button', {name: /All topics/})).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Showing');
});
