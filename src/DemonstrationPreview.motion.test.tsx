import React, {act} from 'react';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {DemonstrationPreview} from './DemonstrationPreview';
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

test('requests and loops its clip only while intersecting and returns to the poster offscreen', () => {
    const motion = {src: '/curve.webm', type: 'video/webm', duration: 3};
    const view = render(<DemonstrationPreview src="/curve.png" motion={motion} loading="eager"/>);
    expect(view.container.querySelector('video')).toBeNull();
    expect(play).not.toHaveBeenCalled();

    act(() => observerList[0].enter());
    const video = view.container.querySelector('video')!;
    expect(video.src).toContain('/curve.webm');
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(play).toHaveBeenCalledOnce();

    act(() => observerList[0].exit());
    expect(video).not.toHaveAttribute('src');
    expect(pause).toHaveBeenCalled();
    expect(view.container.querySelector('.demonstration-preview-poster')).toBeInTheDocument();
});

test('stops on hidden documents and reduced motion, then resumes when both allow it', () => {
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    act(() => observerList[0].enter());
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
    expect(video).not.toHaveAttribute('src');
    view.unmount();
});

test('unmount pauses, unloads the source, and disconnects observation', () => {
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    act(() => observerList[0].enter());
    const video = view.container.querySelector('video')!;
    view.unmount();
    expect(pause).toHaveBeenCalled();
    expect(observerList[0].disconnect).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalled();
    expect(video).not.toHaveAttribute('src');
});

test('a rejected play keeps the poster and late frame events cannot reveal the failed clip', async () => {
    play.mockRejectedValueOnce(new Error('autoplay unavailable'));
    const view = render(<DemonstrationPreview src="/curve.png" motion={{src: '/curve.webm', type: 'video/webm', duration: 3}}/>);
    act(() => observerList[0].enter());
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
    const oldVideo = view.container.querySelector('video')!;
    act(() => observerList[0].exit());
    act(() => observerList[0].enter());
    const nextVideo = view.container.querySelector('video')!;
    expect(nextVideo).not.toBe(oldVideo);
    fireEvent.loadedData(oldVideo);
    expect(nextVideo).not.toHaveClass('is-frame-ready');
});

test('the homepage carousel plays the exact shared catalog clip for its selected demonstration', () => {
    render(<MemoryRouter><HomeDemonstrationsCarousel/></MemoryRouter>);
    const selected = document.querySelector('.demonstrations-opening-image[data-selected="true"]')!;
    expect(selected.querySelector('.demonstration-preview-poster')).toHaveAttribute('src', expect.stringContaining('bezier'));
    const frame = selected.querySelector('.demonstration-preview-media')!;
    act(() => observerList.find(observer => observer.target === frame)?.enter());
    const video = selected.querySelector('video')!;
    const expected = demonstrationMotionAssets.bezier;
    if (expected) expect(video.src).toContain(expected.src);
    else expect(video).not.toHaveAttribute('src');
});
