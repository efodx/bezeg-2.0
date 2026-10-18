import React, {act} from 'react';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {DemonstrationPreview} from './DemonstrationPreview';
import {DemonstrationCollection} from './DemonstrationCollection';
import {demonstrationMotionAssets} from './demonstrationMotionAssets';
import {HomeDemonstrationsCarousel} from './HomeDemonstrationsCarousel';
import {MemoryRouter} from 'react-router-dom';

let reduced = false;
let observerList: TestObserver[];
let motionListeners: Set<() => void>;
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
    enter() { this.callback([{target: this.target!, isIntersecting: true} as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    exit() { this.callback([{target: this.target!, isIntersecting: false} as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
}

beforeEach(() => {
    reduced = false;
    observerList = [];
    motionListeners = new Set();
    vi.stubGlobal('IntersectionObserver', TestObserver);
    vi.stubGlobal('matchMedia', vi.fn(() => ({get matches() { return reduced; }, addEventListener: (_: string, listener: () => void) => motionListeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => motionListeners.delete(listener)})));
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

    reduced = true;
    act(() => motionListeners.forEach(listener => listener()));
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
