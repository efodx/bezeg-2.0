import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import routes from './Routes';
import {getDemonstrationCatalog} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import * as lessonCatalog from './learning/runtime/lessonCatalog';
import {setLanguage} from './localization';

// Routes only hand a controller factory to GraphHost; mounting a real board is not what this suite checks.
vi.mock('./graphs/base/GraphHost', () => ({__esModule: true, GraphHost: () => <p>Opened Bézier graph</p>}));

beforeEach(() => {setLanguage('sl');});
let restoreMatchMedia: (() => void) | undefined;
let restoreDocumentHidden: (() => void) | undefined;
let restoreIntersectionObserver: (() => void) | undefined;
let restoreLessonAvailability: (() => void) | undefined;
afterEach(() => {
    restoreMatchMedia?.();
    restoreMatchMedia = undefined;
    restoreDocumentHidden?.();
    restoreDocumentHidden = undefined;
    restoreIntersectionObserver?.();
    restoreIntersectionObserver = undefined;
    restoreLessonAvailability?.();
    restoreLessonAvailability = undefined;
    vi.useRealTimers();
});

class TestIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = '0px';
    readonly thresholds: ReadonlyArray<number> = [0];
    private target: Element | undefined;
    disconnected = false;

    constructor(private callback: IntersectionObserverCallback) {}

    observe(target: Element) {
        this.target = target;
        this.emit(true);
    }

    unobserve(target: Element) {
        if (target === this.target) this.target = undefined;
    }

    disconnect() {
        this.disconnected = true;
        this.target = undefined;
    }

    takeRecords() {
        return [];
    }

    emit(isIntersecting: boolean) {
        const target = this.target;
        if (!target) return;
        const bounds = target.getBoundingClientRect();
        const entry: IntersectionObserverEntry = {
            boundingClientRect: bounds,
            intersectionRatio: isIntersecting ? 1 : 0,
            intersectionRect: bounds,
            isIntersecting,
            rootBounds: null,
            target,
            time: 0,
        };
        this.callback([entry], this);
    }
}

const openingIds = ['bezier', 'bernstein', 'rational', 'spline-c1', 'ph-cubic', 'derivative'] as const;

function openingDemonstrations() {
    const catalog = getDemonstrationCatalog();
    return openingIds.map(id => catalog.demonstrations.find(demonstration => demonstration.id === id)!);
}

test('the opening carousel advances on a six-second dwell and resets its interval after hover and focus pauses', () => {
    vi.useFakeTimers();
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const carousel = opening.querySelector('.demonstrations-opening')!;
    const choiceGroup = within(opening).getByRole('group', {name: 'Začetne demonstracije'});
    const choices = within(choiceGroup).getAllByRole('button');
    const currentTitle = () => within(opening).getByRole('heading', {level: 3}).textContent;

    expect(choices).toHaveLength(6);
    expect(choices[0]).toHaveAttribute('aria-pressed', 'true');
    expect(currentTitle()).toBe(openingDemonstrations()[0].catalogTitle);
    expect(opening.querySelector('[aria-live]')).toHaveAttribute('aria-live', 'off');

    act(() => {vi.advanceTimersByTime(5999);});
    expect(currentTitle()).toBe(openingDemonstrations()[0].catalogTitle);
    act(() => {vi.advanceTimersByTime(1);});
    expect(currentTitle()).toBe(openingDemonstrations()[1].catalogTitle);

    for (let interval = 0; interval < 5; interval += 1) {
        act(() => {vi.advanceTimersByTime(6000);});
    }
    expect(currentTitle()).toBe(openingDemonstrations()[0].catalogTitle);

    fireEvent.mouseEnter(carousel);
    act(() => {vi.advanceTimersByTime(12000);});
    expect(currentTitle()).toBe(openingDemonstrations()[0].catalogTitle);
    fireEvent.mouseLeave(carousel);
    act(() => {vi.advanceTimersByTime(5999);});
    expect(currentTitle()).toBe(openingDemonstrations()[0].catalogTitle);
    act(() => {vi.advanceTimersByTime(1);});
    expect(currentTitle()).toBe(openingDemonstrations()[1].catalogTitle);

    fireEvent.focus(choices[1]);
    act(() => {vi.advanceTimersByTime(12000);});
    expect(currentTitle()).toBe(openingDemonstrations()[1].catalogTitle);
    fireEvent.blur(choices[1], {relatedTarget: document.body});
    act(() => {vi.advanceTimersByTime(5999);});
    expect(currentTitle()).toBe(openingDemonstrations()[1].catalogTitle);
    act(() => {vi.advanceTimersByTime(1);});
    expect(currentTitle()).toBe(openingDemonstrations()[2].catalogTitle);

    view.unmount();
    vi.useRealTimers();
});

test('manual carousel actions and row scrolling take control for the page visit', () => {
    vi.useFakeTimers();
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const choiceGroup = within(opening).getByRole('group', {name: 'Začetne demonstracije'});
    const choices = within(choiceGroup).getAllByRole('button');

    // Scroll-snap settling fires scroll events without user input; it must not stop autoplay.
    fireEvent.scroll(choiceGroup);
    act(() => {vi.advanceTimersByTime(6000);});
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');

    fireEvent.wheel(choiceGroup);
    const heldIndex = choices.findIndex(choice => choice.getAttribute('aria-pressed') === 'true');
    act(() => {vi.advanceTimersByTime(18000);});
    expect(choices[heldIndex]).toHaveAttribute('aria-pressed', 'true');
    expect(opening.querySelector('[aria-live]')).toHaveAttribute('aria-live', 'off');

    fireEvent.click(choices[2]);
    expect(choices[2]).toHaveAttribute('aria-pressed', 'true');
    expect(opening.querySelector('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    const selected = openingDemonstrations()[2];
    expect(within(opening).getByRole('heading', {level: 3, name: selected.catalogTitle})).toBeVisible();
    expect(within(opening).getByRole('link', {name: `Odpri demonstracijo: ${selected.catalogTitle}`}))
        .toHaveAttribute('href', selected.path);
    if (isGuidedLessonAvailable(selected.id)) {
        expect(within(opening).getByRole('link', {name: `Vodena učna pot: ${selected.catalogTitle}`}))
            .toHaveAttribute('href', selected.path + '?learn=1');
    }
    act(() => {vi.advanceTimersByTime(18000);});
    expect(choices[2]).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(opening).getByRole('button', {name: `Naprej: ${openingDemonstrations()[3].catalogTitle}`}));
    expect(choices[3]).toHaveAttribute('aria-pressed', 'true');
    act(() => {choices[3].focus();});
    const previousChoiceFocus = vi.spyOn(choices[2], 'focus');
    fireEvent.keyDown(choices[3], {key: 'ArrowLeft'});
    expect(choices[2]).toHaveAttribute('aria-pressed', 'true');
    expect(previousChoiceFocus).toHaveBeenCalledWith({preventScroll: true});
    expect(document.activeElement).toBe(choices[2]);
    act(() => {vi.advanceTimersByTime(18000);});
    expect(choices[2]).toHaveAttribute('aria-pressed', 'true');

    view.unmount();
    vi.useRealTimers();
});

test('arrow keys on a focused action keep focus there when the choice row is below the viewport', () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const choiceGroup = within(opening).getByRole('group', {name: 'Začetne demonstracije'});
    const choices = within(choiceGroup).getAllByRole('button');
    const top = window.innerHeight + 200;
    const railBounds: DOMRect = {
        x: 0, y: top, width: 640, height: 80,
        top, right: 640, bottom: top + 80, left: 0,
        toJSON: () => ({}),
    };
    const belowViewport = vi.spyOn(choiceGroup, 'getBoundingClientRect')
        .mockReturnValue(railBounds);
    const nextControl = within(opening).getByRole('button', {
        name: `Naprej: ${openingDemonstrations()[1].catalogTitle}`,
    });
    const selectedChoiceFocus = vi.spyOn(choices[1], 'focus');

    expect(choiceGroup.getBoundingClientRect().top).toBeGreaterThan(window.innerHeight);
    act(() => {nextControl.focus();});
    fireEvent.keyDown(nextControl, {key: 'ArrowRight'});

    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(nextControl);
    expect(selectedChoiceFocus).not.toHaveBeenCalled();

    view.unmount();
    belowViewport.mockRestore();
    selectedChoiceFocus.mockRestore();
});

test('arrow selection from preview actions preserves focus and updates the selected links', () => {
    const originalLessonAvailability = lessonCatalog.isGuidedLessonAvailable;
    const lessonAvailability = vi.spyOn(lessonCatalog, 'isGuidedLessonAvailable')
        .mockImplementation(id => id !== 'rational' && originalLessonAvailability(id));
    restoreLessonAvailability = () => lessonAvailability.mockRestore();

    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const preview = opening.querySelector('.demonstrations-opening-preview');
    const bezier = openingDemonstrations()[0];
    const bernstein = openingDemonstrations()[1];
    const rational = openingDemonstrations()[2];
    const graphLink = within(opening).getByRole('link', {name: `Odpri demonstracijo: ${bezier.catalogTitle}`});

    act(() => {graphLink.focus();});
    fireEvent.keyDown(graphLink, {key: 'ArrowRight'});

    expect(within(opening).getByRole('heading', {level: 3, name: bernstein.catalogTitle})).toBeVisible();
    expect(document.activeElement).toBe(graphLink);
    expect(within(opening).getByRole('link', {name: `Odpri demonstracijo: ${bernstein.catalogTitle}`}))
        .toBe(graphLink);
    expect(graphLink).toHaveAttribute('href', bernstein.path);
    const lessonLink = within(opening).getByRole('link', {name: `Vodena učna pot: ${bernstein.catalogTitle}`});
    expect(lessonLink).toHaveAttribute('href', bernstein.path + '?learn=1');

    act(() => {lessonLink.focus();});
    fireEvent.keyDown(lessonLink, {key: 'ArrowRight'});

    expect(within(opening).getByRole('heading', {level: 3, name: rational.catalogTitle})).toBeVisible();
    expect(within(opening).queryByRole('link', {name: `Vodena učna pot: ${rational.catalogTitle}`})).toBeNull();
    const rationalGraphLink = within(opening).getByRole('link', {name: `Odpri demonstracijo: ${rational.catalogTitle}`});
    expect(rationalGraphLink).toBe(graphLink);
    expect(rationalGraphLink).toHaveAttribute('href', rational.path);
    expect(document.activeElement).toBe(rationalGraphLink);
    expect(opening.contains(document.activeElement)).toBe(true);
    expect(opening.querySelector('.demonstrations-opening-preview')).toBe(preview);

    view.unmount();
});

test('reduced-motion users get a manual-only carousel with the matching preview and catalog choices', () => {
    vi.useFakeTimers();
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (media: string): MediaQueryList => ({
            matches: true,
            media,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
    restoreMatchMedia = () => {
        if (originalDescriptor) Object.defineProperty(window, 'matchMedia', originalDescriptor);
        else Reflect.deleteProperty(window, 'matchMedia');
    };
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const choices = within(within(opening).getByRole('group', {name: 'Začetne demonstracije'})).getAllByRole('button');
    const first = openingDemonstrations()[0];

    expect(opening.querySelector('.demonstrations-opening-image')).toHaveAttribute('src', demonstrationPreviewAssets[first.id]);
    expect(choices.map(choice => choice.getAttribute('aria-label'))).toEqual(openingDemonstrations().map(demonstration => {
        const family = getDemonstrationCatalog().families.find(entry => entry.id === demonstration.family)!;
        return `${family.title}: ${demonstration.catalogTitle}`;
    }));
    act(() => {vi.advanceTimersByTime(30000);});
    expect(choices[0]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(choices[1]);
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');

    view.unmount();
});

test('autoplay pauses outside the viewport and while the page is hidden, then resumes with a full dwell', () => {
    vi.useFakeTimers();
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    const observerDescriptor = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    restoreDocumentHidden = () => {
        if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
        else Reflect.deleteProperty(document, 'hidden');
    };
    let routeObserver: TestIntersectionObserver | undefined;
    class RouteIntersectionObserver extends TestIntersectionObserver {
        constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
            super(callback);
            routeObserver = this;
        }
    }
    Object.defineProperty(window, 'IntersectionObserver', {configurable: true, value: RouteIntersectionObserver});
    restoreIntersectionObserver = () => {
        if (observerDescriptor) Object.defineProperty(window, 'IntersectionObserver', observerDescriptor);
        else Reflect.deleteProperty(window, 'IntersectionObserver');
    };

    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0/demonstrations']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const choices = within(within(opening).getByRole('group', {name: 'Začetne demonstracije'})).getAllByRole('button');
    const currentTitle = () => within(opening).getByRole('heading', {level: 3}).textContent;

    act(() => {vi.advanceTimersByTime(2000);});
    act(() => {routeObserver?.emit(false);});
    act(() => {vi.advanceTimersByTime(12000);});
    expect(currentTitle()).toBe(openingDemonstrations()[0].catalogTitle);
    act(() => {routeObserver?.emit(true);});
    act(() => {vi.advanceTimersByTime(5999);});
    expect(currentTitle()).toBe(openingDemonstrations()[0].catalogTitle);
    act(() => {vi.advanceTimersByTime(1);});
    expect(currentTitle()).toBe(openingDemonstrations()[1].catalogTitle);

    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    fireEvent(document, new Event('visibilitychange'));
    act(() => {vi.advanceTimersByTime(12000);});
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    fireEvent(document, new Event('visibilitychange'));
    act(() => {vi.advanceTimersByTime(5999);});
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');
    act(() => {vi.advanceTimersByTime(1);});
    expect(choices[2]).toHaveAttribute('aria-pressed', 'true');

    view.unmount();
    expect(routeObserver?.disconnected).toBe(true);
});

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

    const starting = screen.getByRole('region', {name: 'Začetne demonstracije'});
    expect(within(starting).getAllByRole('link', {name: /Vodena učna pot:/})[0]).toHaveAttribute('href', '/bezeg-2.0/bezier/curve?learn=1');
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

    const opening = screen.getByRole('region', {name: 'Starting demonstrations'});
    const openingChoices = within(within(opening).getByRole('group', {name: 'Starting demonstrations'})).getAllByRole('button');
    expect(openingChoices).toHaveLength(openingIds.length);
    expect(openingChoices.map(choice => choice.getAttribute('aria-label'))).toEqual(
        openingDemonstrations().map(demonstration => {
            const family = englishCatalogData.families.find(entry => entry.id === demonstration.family)!;
            return `${family.title}: ${demonstration.catalogTitle}`;
        }));

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
