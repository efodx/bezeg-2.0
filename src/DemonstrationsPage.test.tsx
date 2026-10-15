import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import routes from './Routes';
import {getDemonstrationCatalog} from './demonstrations';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {setLanguage, t} from './localization';

// Route checks exercise page navigation without mounting a mathematical board.
vi.mock('./graphs/base/GraphHost', () => ({__esModule: true, GraphHost: () => <p>Opened Bézier graph</p>}));

beforeEach(() => {setLanguage('sl');});
test('the homepage shortcut opens the catalogue, whose topics expand independently and expose every route and preview', async () => {
    const catalog = getDemonstrationCatalog();
    const catalogDemonstrations = catalog.families.flatMap(family => family.demonstrations);
    const expectedLessons = catalog.demonstrations.filter(demonstration => isGuidedLessonAvailable(demonstration.id));
    const initiallyVisibleFamily = catalog.families[0];
    const initiallyVisibleLinkCount = initiallyVisibleFamily.demonstrations.length
        + initiallyVisibleFamily.demonstrations.filter(demonstration => isGuidedLessonAvailable(demonstration.id)).length;
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    const view = render(<RouterProvider router={router}/>);
    fireEvent.click(screen.getByRole('link', {name: /Vse demonstracije/}));
    expect(await screen.findByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
    expect(router.state.location.pathname).toBe('/bezeg-2.0/demonstrations');

    const all = screen.getByRole('region', {name: 'Vse demonstracije'});
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByText(t('explore_by_topic'))).toBeVisible();
    expect(screen.queryByRole('heading', {name: 'Vse demonstracije'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Začetne demonstracije'})).not.toBeInTheDocument();
    const topicButtons = within(all).getAllByRole('button');
    expect(topicButtons).toHaveLength(catalog.families.length);
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'true');
    topicButtons.forEach(button => {
        const illustration = button.querySelector('img');
        expect(illustration).toHaveAttribute('alt', '');
        expect(illustration).not.toHaveAttribute('tabindex');
    });
    const firstTopicIllustration = topicButtons[0].querySelector('img')!;
    fireEvent.click(firstTopicIllustration);
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(firstTopicIllustration);
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
        expect(preview?.tagName.toLowerCase()).toBe('img');
        expect(preview).toHaveAttribute('alt', '');
        expect(preview).toHaveAttribute('loading', 'lazy');
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
    expect(view.container.querySelectorAll('.demonstrations-catalog-svg-preview')).toHaveLength(0);
    const imagePreviews = view.container.querySelectorAll<HTMLImageElement>('img.demonstrations-catalog-preview');
    expect(imagePreviews).toHaveLength(catalog.demonstrations.length);
    expect(new Set(Array.from(imagePreviews, preview => preview.getAttribute('src'))).size).toBe(imagePreviews.length);
    imagePreviews.forEach(preview => {
        expect(preview).toHaveAttribute('width', '360');
        expect(preview).toHaveAttribute('height', '220');
        expect(preview).toHaveAttribute('alt', '');
        expect(preview).toHaveAttribute('loading', 'lazy');
    });
    expect(screen.queryByText(/Variant [ABC]/)).not.toBeInTheDocument();

    const firstGraphLink = cards[0].querySelector<HTMLAnchorElement>('.demonstrations-catalog-graph')!;
    fireEvent.click(firstGraphLink);
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
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstracije'})).toBeVisible();
    expect(screen.getByText(t('explore_by_topic'))).toBeVisible();
    expect(screen.queryByRole('heading', {name: 'Vse demonstracije'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Začetne demonstracije'})).not.toBeInTheDocument();
    expect(screen.getByText(`${catalog.families.length} tem · ${catalog.demonstrations.length} prikazov`)).toBeVisible();
    expect(within(all).getAllByRole('button')).toHaveLength(catalog.families.length);
    expect(within(all).getAllByRole('link')).toHaveLength(initialLinkCount);
    expect(screen.queryByRole('group', {name: /prototype/i})).not.toBeInTheDocument();

    act(() => setLanguage('en'));
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByText(t('explore_by_topic'))).toBeVisible();
    expect(screen.queryByRole('heading', {name: 'All demonstrations'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Starting demonstrations'})).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('link', {name: 'Bezeg · home'}));
    const shortcut = await screen.findByRole('link', {name: /All demonstrations/});
    expect(shortcut).toHaveAttribute('href', '/bezeg-2.0/demonstrations');
    expect(screen.getByRole('region', {name: 'Starting demonstrations'})).toBeVisible();
    expect(screen.queryByRole('region', {name: 'All demonstrations'})).not.toBeInTheDocument();
    fireEvent.click(shortcut);
    expect(await screen.findByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    fireEvent.click(screen.getByRole('link', {name: 'Demonstrations', exact: true}));
    expect(await screen.findByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
});

test('catalogue disclosure state returns to its default after a fresh mount', async () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    render(<RouterProvider router={router}/>);
    let all = screen.getByRole('region', {name: 'Vse demonstracije'});
    let topicButtons = within(all).getAllByRole('button');

    fireEvent.click(topicButtons[0]);
    fireEvent.click(topicButtons[1]);
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(topicButtons[1]).toHaveAttribute('aria-expanded', 'true');

    await act(async () => {await router.navigate('/bezeg-2.0');});
    expect(screen.queryByRole('region', {name: 'Vse demonstracije'})).not.toBeInTheDocument();
    await act(async () => {await router.navigate('/bezeg-2.0/demonstrations');});

    all = screen.getByRole('region', {name: 'Vse demonstracije'});
    topicButtons = within(all).getAllByRole('button');
    expect(topicButtons[0]).toHaveAttribute('aria-expanded', 'true');
    topicButtons.slice(1).forEach(button => expect(button).toHaveAttribute('aria-expanded', 'false'));
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
