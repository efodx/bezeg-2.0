import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import routes from './Routes';
import {getDemonstrationCatalog} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {isGuidedLessonAvailable} from './learning/runtime/lessonAvailability';
import * as lessonCatalog from './learning/runtime/lessonAvailability';
import {setLanguage, t} from './localization';

// Routes only hand a controller factory to GraphHost; mounting a real board is not what this suite checks.
vi.mock('./graphs/base/GraphHost', () => ({__esModule: true, GraphHost: () => <p>Opened Bézier graph</p>}));

beforeEach(() => {
    setLanguage('sl');
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});
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
    vi.restoreAllMocks();
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


test('the homepage presents its introduction and catalogue shortcut before the carousel and keeps the localized footer', () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    render(<RouterProvider router={router}/>);

    for (const language of ['sl', 'en'] as const) {
        act(() => setLanguage(language));
        expect(screen.getByText(t('bezeg_explore_curves'))).toBeVisible();
        expect(screen.getByRole('heading', {level: 1, name: t('home_headline')})).toBeVisible();
        expect(screen.getByText(t('home_introduction'))).toBeVisible();

        const shortcut = screen.getByRole('link', {name: new RegExp(t('all_demonstrations'))});
        expect(shortcut).toHaveAttribute('href', '/bezeg-2.0/demonstrations');
        const carousel = screen.getByRole('region', {name: t('starting_demonstrations')});
        expect(shortcut.compareDocumentPosition(carousel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        const footer = document.querySelector('main footer')!;
        expect(footer).toBeVisible();
        expect(footer).toHaveTextContent(t('bezeg_is_a_web_tool_for_exploring_the_properties_of_bezier_and_ph_curves_graphically'));
        expect(footer).toHaveTextContent(t('i_kevin_stampar_developed_bezeg_for_my_masters_thesis_with_guidance_from_my_supervisor_prof_dr_emil_zagar'));
        expect(footer).toHaveTextContent(t('send_suggestions_or_bug_reports_to_clovekkevingmailcom'));
        expect(carousel.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByRole('img', {name: t('curve_illustration')})).not.toBeInTheDocument();
        expect(screen.queryByText(t('control_points_shape'))).not.toBeInTheDocument();
    }
});
test('the opening carousel advances on a six-second dwell and resets its interval after hover and focus pauses', () => {
    vi.useFakeTimers();
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
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
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const choiceGroup = within(opening).getByRole('group', {name: 'Začetne demonstracije'});
    const choices = within(choiceGroup).getAllByRole('button');

    // Scroll-snap settling fires scroll events without user input; it must not stop autoplay.
    fireEvent.scroll(choiceGroup);
    act(() => {vi.advanceTimersByTime(6000);});
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');

    // Scrolling the page vertically while the pointer crosses the row must not stop autoplay.
    fireEvent.wheel(choiceGroup, {deltaY: 120});
    act(() => {vi.advanceTimersByTime(6000);});
    expect(choices[2]).toHaveAttribute('aria-pressed', 'true');

    // Horizontal wheel input scrolls the row and takes control.
    fireEvent.wheel(choiceGroup, {deltaX: 120});
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
        expect(within(opening).getByRole('link', {name: `Vodeni primer: ${selected.catalogTitle}`}))
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

test('shift plus vertical wheel scrolls the choice row horizontally and takes control', () => {
    vi.useFakeTimers();
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const choiceGroup = within(opening).getByRole('group', {name: 'Začetne demonstracije'});
    const choices = within(choiceGroup).getAllByRole('button');

    fireEvent.wheel(choiceGroup, {deltaY: 120});
    act(() => {vi.advanceTimersByTime(6000);});
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');

    fireEvent.wheel(choiceGroup, {deltaY: 120, shiftKey: true});
    act(() => {vi.advanceTimersByTime(18000);});
    expect(choices[1]).toHaveAttribute('aria-pressed', 'true');

    view.unmount();
    vi.useRealTimers();
});

test('arrow keys on a focused action keep focus there when the choice row is below the viewport', () => {
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
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

    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
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
    const lessonLink = within(opening).getByRole('link', {name: `Vodeni primer: ${bernstein.catalogTitle}`});
    expect(lessonLink).toHaveAttribute('href', bernstein.path + '?learn=1');

    act(() => {lessonLink.focus();});
    fireEvent.keyDown(lessonLink, {key: 'ArrowRight'});

    expect(within(opening).getByRole('heading', {level: 3, name: rational.catalogTitle})).toBeVisible();
    expect(within(opening).queryByRole('link', {name: `Vodeni primer: ${rational.catalogTitle}`})).toBeNull();
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
    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
    const view = render(<RouterProvider router={router}/>);
    const opening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const choices = within(within(opening).getByRole('group', {name: 'Začetne demonstracije'})).getAllByRole('button');
    const first = openingDemonstrations()[0];

    expect(opening.querySelector('.demonstrations-opening-image img')).toHaveAttribute('src', demonstrationPreviewAssets[first.id]);
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

test('autoplay pauses for visibility, disposes on navigation, and resets on a fresh homepage visit', async () => {
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

    const router = createMemoryRouter(routes, {initialEntries: ['/bezeg-2.0']});
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

    const previousObserver = routeObserver;
    await act(async () => {await router.navigate('/bezeg-2.0/demonstrations');});
    expect(previousObserver?.disconnected).toBe(true);
    expect(screen.queryByRole('region', {name: 'Začetne demonstracije'})).not.toBeInTheDocument();
    act(() => {vi.advanceTimersByTime(30000);});

    await act(async () => {await router.navigate('/bezeg-2.0');});
    const revisitedOpening = screen.getByRole('region', {name: 'Začetne demonstracije'});
    const revisitedChoices = within(within(revisitedOpening).getByRole('group', {name: 'Začetne demonstracije'})).getAllByRole('button');
    expect(revisitedChoices[0]).toHaveAttribute('aria-pressed', 'true');
    act(() => {vi.advanceTimersByTime(5999);});
    expect(revisitedChoices[0]).toHaveAttribute('aria-pressed', 'true');
    act(() => {vi.advanceTimersByTime(1);});
    expect(revisitedChoices[1]).toHaveAttribute('aria-pressed', 'true');

    const currentObserver = routeObserver;
    view.unmount();
    expect(currentObserver?.disconnected).toBe(true);
});
