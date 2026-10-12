import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import routes from './Routes';
import {getDemonstrationCatalog} from './demonstrations';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {setLanguage} from './localization';

jest.mock('./graphs/curves/bezier/BezierCurveGraph', () => ({__esModule: true, default: () => <p>Opened Bézier graph</p>}));

beforeEach(() => {setLanguage('sl');});

test('Explore opens the catalog, whose topics expand independently and expose every route and preview', async () => {
    const catalog = getDemonstrationCatalog();
    const catalogDemonstrations = catalog.families.flatMap(family => family.demonstrations);
    const expectedLessons = catalog.demonstrations.filter(demonstration => isGuidedLessonAvailable(demonstration.id));
    const initiallyVisibleFamily = catalog.families[0];
    const initiallyVisibleLinkCount = initiallyVisibleFamily.demonstrations.length
        + initiallyVisibleFamily.demonstrations.filter(demonstration => isGuidedLessonAvailable(demonstration.id)).length;
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    const view = render(<RouterProvider router={router}/>);
    expect(screen.queryByRole('region', {name: 'Začetne demonstracije'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', {name: /Začni raziskovati/}));
    expect(await screen.findByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
    expect(router.state.location.pathname).toBe('/bezeg-2.0/demonstrations');

    const all = screen.getByRole('region', {name: 'Vse demonstracije'});
    const topicButtons = within(all).getAllByRole('button');
    expect(topicButtons).toHaveLength(catalog.families.length);
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(within(all).getAllByRole('link')).toHaveLength(initiallyVisibleLinkCount);

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
    expect(within(all).getAllByRole('link')).toHaveLength(catalog.demonstrations.length + expectedLessons.length);
    expect(within(all).getAllByRole('link', {name: /Vodena učna pot:/})).toHaveLength(expectedLessons.length);

    const cards = [...view.container.querySelectorAll<HTMLLIElement>('.demonstrations-catalog-card')];
    expect(cards).toHaveLength(catalog.demonstrations.length);
    cards.forEach((card, index) => {
        const demonstration = catalogDemonstrations[index];
        const graphLink = card.querySelector<HTMLAnchorElement>('.demonstrations-catalog-graph');
        const lessonLink = card.querySelector<HTMLAnchorElement>('.demonstrations-catalog-lesson');
        const preview = card.querySelector<HTMLElement>('.demonstrations-catalog-preview');
        expect(card.querySelector('.demonstrations-catalog-title')).toHaveTextContent(demonstration.catalogTitle);
        expect(preview).toBeInTheDocument();
        if (demonstration.id === 'spline-g1-symmetric' || demonstration.id === 'rational-elevation') {
            expect(preview?.tagName.toLowerCase()).toBe('svg');
            expect(preview).toHaveAttribute('data-preview-schematic', demonstration.id);
            expect(preview).toHaveAttribute('aria-hidden', 'true');
        } else {
            expect(preview?.tagName.toLowerCase()).toBe('img');
            expect(preview).toHaveAttribute('alt', '');
            expect(preview).toHaveAttribute('loading', 'lazy');
        }
        expect(graphLink).toHaveAttribute('href', demonstration.path);
        expect(graphLink).toHaveAttribute('aria-label', `Odpri demonstracijo: ${demonstration.catalogTitle}`);
        expect(graphLink).toHaveAttribute('data-tooltip', `Preizkusi in opazuj: ${demonstration.catalogTitle}`);
        expect(lessonLink !== null).toBe(isGuidedLessonAvailable(demonstration.id));
        if (lessonLink) {
            expect(lessonLink).toHaveAttribute('href', demonstration.path + '?learn=1');
            expect(lessonLink).toHaveAttribute('aria-label', `Vodena učna pot: ${demonstration.catalogTitle}`);
            expect(lessonLink).toHaveAttribute('data-tooltip', `Spoznaj to demonstracijo: ${demonstration.catalogTitle}`);
        }
    });
    const previews = view.container.querySelectorAll<HTMLElement>('.demonstrations-catalog-preview');
    expect(previews).toHaveLength(catalog.demonstrations.length);
    expect(view.container.querySelectorAll('.demonstrations-catalog-svg-preview')).toHaveLength(2);
    const imagePreviews = view.container.querySelectorAll<HTMLImageElement>('img.demonstrations-catalog-preview');
    expect(imagePreviews).toHaveLength(catalog.demonstrations.length - 2);
    expect(new Set(Array.from(imagePreviews, preview => preview.getAttribute('src'))).size).toBe(imagePreviews.length);
    imagePreviews.forEach(preview => {
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
    const catalog = getDemonstrationCatalog();
    const availableLessonCount = catalog.demonstrations.filter(demonstration => isGuidedLessonAvailable(demonstration.id)).length;
    const initialFamily = catalog.families[0];
    const initialLinkCount = initialFamily.demonstrations.length
        + initialFamily.demonstrations.filter(demonstration => isGuidedLessonAvailable(demonstration.id)).length;
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    render(<RouterProvider router={router}/>);
    const all = screen.getByRole('region', {name: 'Vse demonstracije'});
    expect(all).toBeVisible();
    expect(screen.getByText(`${catalog.families.length} tem · ${catalog.demonstrations.length} prikazov`)).toBeVisible();
    expect(within(all).getAllByRole('button')).toHaveLength(catalog.families.length);
    expect(within(all).getAllByRole('link')).toHaveLength(initialLinkCount);
    expect(screen.queryByRole('group', {name: /prototype/i})).not.toBeInTheDocument();

    act(() => setLanguage('en'));
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    const englishCatalog = screen.getByRole('region', {name: 'All demonstrations'});
    for (const button of within(englishCatalog).getAllByRole('button')) {
        if (button.getAttribute('aria-expanded') === 'false') fireEvent.click(button);
    }
    const englishCatalogData = getDemonstrationCatalog();
    expect(within(englishCatalog).getAllByRole('link')).toHaveLength(catalog.demonstrations.length + availableLessonCount);
    expect(within(englishCatalog).getAllByRole('link', {name: /Guided lesson:/})).toHaveLength(availableLessonCount);
    expect(screen.getByText(`${catalog.families.length} families · ${catalog.demonstrations.length} demonstrations`)).toBeVisible();
    const firstCatalogCard = englishCatalog.querySelector<HTMLLIElement>('.demonstrations-catalog-card')!;
    const firstGraphAction = firstCatalogCard.querySelector<HTMLAnchorElement>('.demonstrations-catalog-graph')!;
    const firstDemonstration = englishCatalogData.families[0].demonstrations[0];
    const firstTitle = firstDemonstration.catalogTitle;
    expect(firstGraphAction).toHaveAttribute('aria-label', `Open demonstration: ${firstTitle}`);
    expect(firstGraphAction).toHaveAttribute('data-tooltip', `Try and observe: ${firstTitle}`);
    firstGraphAction.focus();
    expect(document.activeElement).toBe(firstGraphAction);
    if (isGuidedLessonAvailable(firstDemonstration.id)) {
        const firstLessonAction = firstCatalogCard.querySelector<HTMLAnchorElement>('.demonstrations-catalog-lesson')!;
        expect(firstLessonAction).toHaveAttribute('aria-label', `Guided lesson: ${firstTitle}`);
        expect(firstLessonAction).toHaveAttribute('data-tooltip', `Learn this demonstration: ${firstTitle}`);
    }

    const startingCards = document.querySelectorAll('.demonstrations-starting-card');
    expect(startingCards).toHaveLength(catalog.starting.length);
    expect([...startingCards].map(card => card.querySelector<HTMLAnchorElement>('a')?.getAttribute('href')).sort()).toEqual(
        catalog.starting.map(example => example.demonstration.path).sort());

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
