import React, {act} from 'react';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {DemonstrationPreview} from './DemonstrationPreview';
import {DemonstrationCollection} from './DemonstrationCollection';
import {demonstrationMotionAssets} from './demonstrationMotionAssets';
import {HomeDemonstrationsCarousel} from './HomeDemonstrationsCarousel';
import {MemoryRouter} from 'react-router-dom';

let reduced = false;
let hoverNone = false;
let observerList: TestObserver[];
let mediaListeners: Map<string, Set<() => void>>;
let play: ReturnType<typeof vi.fn<() => Promise<void>>>;
let pause: ReturnType<typeof vi.fn<() => void>>;
let load: ReturnType<typeof vi.fn<() => void>>;

class TestObserver {
    target: Element | null = null;
    disconnect = vi.fn();
    observe = vi.fn((target: Element) => { this.target = target; });
    unobserve = vi.fn();
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) { this.callback = callback; observerList.push(this); }
    enter(intersectionRatio = 1) { this.callback([{target: this.target!, isIntersecting: intersectionRatio > 0, intersectionRatio} as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    exit() { this.enter(0); }
}

function updateMedia(query: string, matches: boolean) {
    if (query === '(hover: none)') hoverNone = matches;
    if (query === '(prefers-reduced-motion: reduce)') reduced = matches;
    act(() => mediaListeners.get(query)?.forEach(listener => listener()));
}

beforeEach(() => {
    reduced = false;
    hoverNone = false;
    observerList = [];
    mediaListeners = new Map();
    vi.stubGlobal('IntersectionObserver', TestObserver);
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({get matches() { return query === '(hover: none)' ? hoverNone : query === '(prefers-reduced-motion: reduce)' && reduced; },
        addEventListener: (_: string, listener: () => void) => { const listeners = mediaListeners.get(query) ?? new Set(); listeners.add(listener); mediaListeners.set(query, listeners); },
        removeEventListener: (_: string, listener: () => void) => mediaListeners.get(query)?.delete(listener)})));
    play = vi.fn<() => Promise<void>>(() => Promise.resolve());
    pause = vi.fn<() => void>();
    load = vi.fn<() => void>();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => play());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(load);
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('visibility alone does not request a clip; hovering starts playback and leaving restores the poster', () => {
    const motion = {src: '/curve.webm', type: 'video/webm', duration: 3};
    const view = render(<DemonstrationPreview src="/curve.png" motion={motion} loading="eager"/>);
    expect(view.container.querySelector('video')).toBeNull();
    expect(play).not.toHaveBeenCalled();

    act(() => observerList[0].enter());
    expect(view.container.querySelector('video')).toBeNull();
    expect(play).not.toHaveBeenCalled();

    const frame = view.container.querySelector('.demonstration-preview-media')!;
    fireEvent.pointerEnter(frame, {pointerType: 'mouse'});
    const video = view.container.querySelector('video')!;
    expect(video.src).toContain('/curve.webm');
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(play).toHaveBeenCalledOnce();

    fireEvent.pointerLeave(frame, {pointerType: 'mouse'});
    expect(view.container.querySelector('video')).toBeNull();
    act(() => observerList[0].exit());
    expect(video).not.toHaveAttribute('src');
    expect(pause).toHaveBeenCalled();
    expect(view.container.querySelector('.demonstration-preview-poster')).toBeInTheDocument();
});

test('desktop hover still activates when any part of the preview intersects', () => {
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    const frame = view.container.querySelector('.demonstration-preview-media')!;
    act(() => observerList[0].enter(0.2));
    expect(view.container.querySelector('video')).toBeNull();
    fireEvent.pointerEnter(frame, {pointerType: 'mouse'});
    expect(view.container.querySelector('video')).not.toBeNull();
    expect(play).toHaveBeenCalledOnce();
});

test('touch autoplay starts at 50 percent visibility, stops below it, and restarts on re-entry', () => {
    hoverNone = true;
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    const observer = observerList[0];
    act(() => observer.enter(0.49));
    expect(view.container.querySelector('video')).toBeNull();
    act(() => observer.enter(0.5));
    const firstVideo = view.container.querySelector('video')!;
    expect(firstVideo.src).toContain('/curve.webm');
    expect(play).toHaveBeenCalledOnce();

    act(() => observer.enter(0.49));
    expect(view.container.querySelector('video')).toBeNull();
    expect(firstVideo).not.toHaveAttribute('src');
    act(() => observer.enter(0.5));
    expect(view.container.querySelector('video')).not.toBe(firstVideo);
    expect(play).toHaveBeenCalledTimes(2);
});

test('touch autoplay follows live input capability changes and keeps the visibility threshold for focus', () => {
    const view = render(<a href="/graph"><DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/></a>);
    const observer = observerList[0];
    act(() => observer.enter(0.49));
    updateMedia('(hover: none)', true);
    expect(view.container.querySelector('video')).toBeNull();
    fireEvent.focus(view.getByRole('link'));
    expect(view.container.querySelector('video')).toBeNull();

    act(() => observer.enter(0.5));
    expect(view.container.querySelector('video')).not.toBeNull();
    updateMedia('(hover: none)', false);
    expect(view.container.querySelector('video')).not.toBeNull();
    fireEvent.blur(view.getByRole('link'));
    expect(view.container.querySelector('video')).toBeNull();
});

test('touch autoplay remains suppressed while hidden or reduced motion is enabled', () => {
    hoverNone = true;
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    const observer = observerList[0];
    try {
        Object.defineProperty(document, 'hidden', {configurable: true, value: true});
        act(() => document.dispatchEvent(new Event('visibilitychange')));
        act(() => observer.enter(0.5));
        expect(view.container.querySelector('video')).toBeNull();

        Object.defineProperty(document, 'hidden', {configurable: true, value: false});
        act(() => document.dispatchEvent(new Event('visibilitychange')));
        expect(view.container.querySelector('video')).not.toBeNull();
        updateMedia('(prefers-reduced-motion: reduce)', true);
        expect(view.container.querySelector('video')).toBeNull();
        updateMedia('(prefers-reduced-motion: reduce)', false);
        expect(view.container.querySelector('video')).not.toBeNull();
    } finally {
        if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
        else Reflect.deleteProperty(document, 'hidden');
    }
});

test('focus activates through an existing link and hidden documents and reduced motion stop playback', () => {
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    const view = render(<a href="/graph"><DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/></a>);
    const link = view.getByRole('link');
    act(() => observerList[0].enter());
    expect(view.container.querySelector('video')).toBeNull();
    fireEvent.focus(link);
    const video = view.container.querySelector('video')!;
    expect(video.src).toContain('/curve.webm');

    try {
        Object.defineProperty(document, 'hidden', {configurable: true, value: true});
        act(() => { document.dispatchEvent(new Event('visibilitychange')); });
        expect(video).not.toHaveAttribute('src');
        Object.defineProperty(document, 'hidden', {configurable: true, value: false});
        act(() => { document.dispatchEvent(new Event('visibilitychange')); });
        expect(view.container.querySelector('video')?.src).toContain('/curve.webm');
    } finally {
        if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
        else Reflect.deleteProperty(document, 'hidden');
    }

    updateMedia('(prefers-reduced-motion: reduce)', true);
    expect(view.container.querySelector('video')).toBeNull();
    view.unmount();
});

test('unmount pauses, unloads the source, and disconnects observation', () => {
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    act(() => observerList[0].enter());
    fireEvent.pointerEnter(view.container.querySelector('.demonstration-preview-media')!, {pointerType: 'mouse'});
    const video = view.container.querySelector('video')!;
    view.unmount();
    expect(pause).toHaveBeenCalled();
    expect(observerList[0].disconnect).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalled();
    expect(video).not.toHaveAttribute('src');
});

test('offscreen previews release their clip and start a fresh loop when re-entered while hovered', () => {
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    const frame = view.container.querySelector('.demonstration-preview-media')!;
    act(() => observerList[0].enter());
    fireEvent.pointerEnter(frame, {pointerType: 'mouse'});
    const firstVideo = view.container.querySelector('video')!;
    act(() => observerList[0].exit());
    expect(view.container.querySelector('video')).toBeNull();
    expect(firstVideo).not.toHaveAttribute('src');
    act(() => observerList[0].enter());
    expect(view.container.querySelector('video')).not.toBe(firstVideo);
    expect(play).toHaveBeenCalledTimes(2);
});

test('touch pointer activation does not intercept ordinary link navigation', () => {
    const view = render(<a href="/graph"><DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/></a>);
    act(() => observerList[0].enter());
    fireEvent.pointerEnter(view.container.querySelector('.demonstration-preview-media')!, {pointerType: 'touch'});
    expect(view.container.querySelector('video')).toBeNull();
    expect(play).not.toHaveBeenCalled();
    expect(view.getByRole('link')).toHaveAttribute('href', '/graph');
});

test('a rejected play keeps the poster and late frame events cannot reveal the failed clip', async () => {
    play.mockRejectedValueOnce(new Error('autoplay unavailable'));
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    act(() => observerList[0].enter());
    fireEvent.pointerEnter(view.container.querySelector('.demonstration-preview-media')!, {pointerType: 'mouse'});
    const video = view.container.querySelector('video')!;
    await act(async () => { await Promise.resolve(); });
    fireEvent.loadedData(video);
    expect(video).not.toHaveClass('is-frame-ready');
    expect(video).not.toHaveAttribute('src');
    expect(view.container.querySelector('.demonstration-preview-poster')).toBeInTheDocument();
});

test('a delayed event from a closed visible session cannot reveal its reopened clip', () => {
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    act(() => observerList[0].enter());
    const frame = view.container.querySelector('.demonstration-preview-media')!;
    fireEvent.pointerEnter(frame, {pointerType: 'mouse'});
    const oldVideo = view.container.querySelector('video')!;
    fireEvent.pointerLeave(frame, {pointerType: 'mouse'});
    fireEvent.pointerEnter(frame, {pointerType: 'mouse'});
    const nextVideo = view.container.querySelector('video')!;
    expect(nextVideo).not.toBe(oldVideo);
    fireEvent.loadedData(oldVideo);
    expect(nextVideo).not.toHaveClass('is-frame-ready');
});

test('the homepage graph action focuses the selected preview and blur restores its poster', () => {
    render(<MemoryRouter><HomeDemonstrationsCarousel/></MemoryRouter>);
    const selected = document.querySelector('.demonstrations-opening-image[data-selected="true"]')!;
    expect(selected.querySelector('.demonstration-preview-poster')).toHaveAttribute('src', expect.stringContaining('bezier'));
    const frame = selected.querySelector('.demonstration-preview-media')!;
    act(() => observerList.find(observer => observer.target === frame)?.enter());
    expect(selected.querySelector('video')).toBeNull();
    const graphAction = document.querySelector('.demonstrations-opening-actions a')!;
    fireEvent.focus(graphAction);
    const video = selected.querySelector('video')!;
    const expected = demonstrationMotionAssets.bezier;
    if (expected) expect(video.src).toContain(expected.src);
    else expect(video).not.toHaveAttribute('src');
    fireEvent.blur(graphAction);
    expect(selected.querySelector('video')).toBeNull();
});

test('hover and focus overlap without restarting playback, including picker buttons', () => {
    const view = render(<button type="button"><DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/></button>);
    const frame = view.container.querySelector('.demonstration-preview-media')!;
    const button = view.getByRole('button');
    act(() => observerList[0].enter());
    fireEvent.pointerEnter(frame, {pointerType: 'mouse'});
    const video = view.container.querySelector('video')!;
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.focus(button);
    fireEvent.pointerLeave(frame, {pointerType: 'mouse'});
    expect(view.container.querySelector('video')).toBe(video);
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.pointerEnter(frame, {pointerType: 'mouse'});
    fireEvent.blur(button);
    expect(view.container.querySelector('video')).toBe(video);
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.pointerLeave(frame, {pointerType: 'mouse'});
    expect(view.container.querySelector('video')).toBeNull();
});

test.each(['catalogue', 'picker'] as const)('%s graph navigation focus activates its wrapped preview', mode => {
    const view = render(<MemoryRouter><DemonstrationCollection topic={null} query="" onTopicChange={() => {}}
        onQueryChange={() => {}} mode={mode} onSelect={mode === 'picker' ? vi.fn() : undefined}/></MemoryRouter>);
    const frame = view.container.querySelector('#demonstration-card-bezier .demonstration-preview-media')!;
    const navigation = frame.closest<HTMLElement>('a, button')!;
    act(() => observerList.find(observer => observer.target === frame)?.enter());
    expect(view.container.querySelector('#demonstration-card-bezier video')).toBeNull();
    fireEvent.focus(navigation);
    const video = view.container.querySelector<HTMLVideoElement>('#demonstration-card-bezier video')!;
    expect(video.src).toContain(demonstrationMotionAssets.bezier!.src);
    fireEvent.blur(navigation);
    expect(view.container.querySelector('#demonstration-card-bezier video')).toBeNull();
});

test('a preview without a capture renders its frame and no image', () => {
    const view = render(<DemonstrationPreview/>);
    expect(view.container.querySelector('.demonstration-preview-media')).not.toBeNull();
    expect(view.container.querySelector('img')).toBeNull();
});

