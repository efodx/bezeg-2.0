import React, {act} from 'react';
import {BrowserRouter} from 'react-router-dom';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {DemonstrationCollection} from './DemonstrationCollection';
import type {Demonstration} from './demonstrations';

const mocks = vi.hoisted(() => ({
    entries: [] as Array<{id: string; family: string; catalogTitle: string; path: string; prompts: readonly [string, string]}>,
}));

vi.mock('./demonstrations', () => ({
    getDemonstrationCatalog: () => ({demonstrations: mocks.entries, families: [{id: 'basics', title: 'Basics', demonstrations: mocks.entries}]}),
}));
vi.mock('./demonstrationPreviewAssets', () => ({demonstrationPreviewAssets: {
    bezier: '/bezier.png', 'repeated-subdivision': '/subdivision.png',
}}));
vi.mock('./demonstrationMotionAssets', () => ({demonstrationMotionAssets: {
    bezier: {src: '/bezier.webm', type: 'video/webm', duration: 3},
    'repeated-subdivision': {src: '/subdivision.webm', type: 'video/webm', duration: 3},
}}));
vi.mock('./learning/runtime/lessonCatalog', () => ({isGuidedLessonAvailable: () => false}));

const entries = [
    {id: 'bezier', family: 'basics', catalogTitle: 'Bézier curve', path: '/bezier', prompts: ['catalog_investigation_affine', 'catalog_investigation_affine']},
    {id: 'repeated-subdivision', family: 'basics', catalogTitle: 'Repeated subdivision', path: '/subdivision', prompts: ['catalog_investigation_affine', 'catalog_investigation_affine']},
] as unknown as Demonstration[];

let reducedMotion = true;
let mediaChange: (() => void) | undefined;
let mediaListeners: Set<() => void>;
let observers: Array<{callback: IntersectionObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>}>;
let play: ReturnType<typeof vi.fn<() => Promise<void>>>;
let pause: ReturnType<typeof vi.fn<() => void>>;

class TestIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observers.push(this);
    }
}

function renderCollection(query = '', onQueryChange = vi.fn()) {
    return render(<BrowserRouter><DemonstrationCollection topic={null} query={query} onTopicChange={vi.fn()}
        onQueryChange={onQueryChange}/></BrowserRouter>);
}

function card(id: string) { return document.querySelector(`#demonstration-card-${id}`)!; }
function playButton(id: string) { return card(id).querySelector('.demonstration-preview-control') as HTMLButtonElement; }

beforeEach(() => {
    mocks.entries = entries;
    reducedMotion = true;
    observers = [];
    mediaListeners = new Set();
    mediaChange = undefined;
    vi.stubGlobal('matchMedia', vi.fn(() => ({
        get matches() { return reducedMotion; },
        addEventListener: (_: string, listener: () => void) => { mediaListeners.add(listener); mediaChange = listener; },
        removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
    })));
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    play = vi.fn<() => Promise<void>>(() => Promise.resolve());
    pause = vi.fn<() => void>();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => play());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => pause());
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

test('mounts no clip source before activation and returns to the poster after one pass', async () => {
    reducedMotion = false;
    const view = renderCollection();
    expect(view.container.querySelector('video, video source')).toBeNull();
    const initialControlText = playButton('bezier').textContent;
    fireEvent.click(playButton('bezier'));

    const video = card('bezier').querySelector('video')!;
    expect(video.querySelector('source')?.getAttribute('src')).toBe('/bezier.webm');
    expect(video.preload).toBe('none');
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.loop).toBe(false);
    expect(video).toHaveAttribute('aria-hidden', 'true');
    await act(async () => { await Promise.resolve(); });
    expect(play).toHaveBeenCalledOnce();

    fireEvent.loadedData(video);
    expect(video).toHaveClass('is-frame-ready');
    fireEvent.ended(video);
    expect(card('bezier').querySelector('video')).toBeNull();
    expect(playButton('bezier').textContent).not.toBe(initialControlText);
    expect(card('bezier').querySelector('img')).toBeInTheDocument();
    fireEvent.pointerLeave(card('bezier'), {pointerType: 'mouse'});
    fireEvent.pointerEnter(card('bezier'), {pointerType: 'mouse'});
    expect(card('bezier').querySelector('video')).toBeNull();
    fireEvent.click(playButton('bezier'));
    expect(card('bezier').querySelector('video source')).toHaveAttribute('src', '/bezier.webm');
    expect(play).toHaveBeenCalledTimes(2);
});

test('rapid replacement ignores an old completion and a rejected play promise', async () => {
    let rejectOld!: (error: Error) => void;
    play.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    const view = renderCollection();
    fireEvent.click(playButton('bezier'));
    const oldVideo = card('bezier').querySelector('video')!;
    fireEvent.click(playButton('repeated-subdivision'));
    const currentVideo = card('repeated-subdivision').querySelector('video')!;

    fireEvent.ended(oldVideo);
    await act(async () => { rejectOld(new Error('late failure')); await Promise.resolve(); });
    expect(card('repeated-subdivision').querySelector('video')).toBe(currentVideo);
    expect(card('bezier').querySelector('video')).toBeNull();
    view.unmount();
});

test('focus within a card does not retrigger playback, while a preference change stops it', () => {
    reducedMotion = false;
    const view = renderCollection();
    const title = card('bezier').querySelector('.demonstrations-catalog-title a')!;
    fireEvent.focus(title);
    const originalVideo = card('bezier').querySelector('video');
    expect(originalVideo).toBeInTheDocument();
    fireEvent.blur(title, {relatedTarget: playButton('bezier')});
    fireEvent.focus(playButton('bezier'));
    expect(card('bezier').querySelector('video')).toBe(originalVideo);

    reducedMotion = true;
    act(() => { mediaChange?.(); });
    expect(card('bezier').querySelector('video')).toBeNull();
    expect(playButton('bezier')).toBeInTheDocument();
    view.unmount();
});

test('stops offscreen, filtered, and unmounted media and disconnects its observer', () => {
    const view = renderCollection();
    fireEvent.click(playButton('bezier'));
    const observer = observers[0];
    expect(observer.observe).toHaveBeenCalledOnce();
    act(() => { observer.callback([{isIntersecting: false} as IntersectionObserverEntry], observer as unknown as IntersectionObserver); });
    expect(card('bezier').querySelector('video')).toBeNull();
    expect(observer.disconnect).toHaveBeenCalledOnce();

    fireEvent.click(playButton('bezier'));
    view.rerender(<BrowserRouter><DemonstrationCollection topic={null} query="no-match" onTopicChange={vi.fn()} onQueryChange={vi.fn()}/></BrowserRouter>);
    expect(view.container.querySelector('video')).toBeNull();
    view.rerender(<BrowserRouter><DemonstrationCollection topic={null} query="" onTopicChange={vi.fn()} onQueryChange={vi.fn()}/></BrowserRouter>);
    fireEvent.click(playButton('repeated-subdivision'));
    const activeVideo = card('repeated-subdivision').querySelector('video');
    view.unmount();
    expect(activeVideo).not.toBeNull();
    expect(pause).toHaveBeenCalled();
    expect(observers.at(-1)?.disconnect).toHaveBeenCalledOnce();
});

test('touch pointer entry does not auto-activate; its explicit control does', () => {
    reducedMotion = false;
    const view = renderCollection();
    fireEvent.pointerDown(card('bezier'), {pointerType: 'touch'});
    fireEvent.pointerEnter(card('bezier'), {pointerType: 'touch'});
    fireEvent.focus(playButton('bezier'));
    expect(card('bezier').querySelector('video')).toBeNull();
    fireEvent.click(playButton('bezier'));
    fireEvent.pointerLeave(card('bezier'), {pointerType: 'touch'});
    expect(card('bezier').querySelector('video source')).toHaveAttribute('src', '/bezier.webm');
    view.unmount();
});

test('hiding the document cancels the pass and removes its visibility listener', () => {
    const descriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    const remove = vi.spyOn(document, 'removeEventListener');
    const view = renderCollection();
    try {
        fireEvent.click(playButton('bezier'));
        expect(card('bezier').querySelector('video')).toBeInTheDocument();
        Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
        fireEvent(document, new Event('visibilitychange'));
        expect(card('bezier').querySelector('video')).toBeNull();
        expect(pause).toHaveBeenCalled();
        expect(remove.mock.calls.some(([event]) => event === 'visibilitychange')).toBe(true);
    } finally {
        if (descriptor) Object.defineProperty(document, 'visibilityState', descriptor);
        else Reflect.deleteProperty(document, 'visibilityState');
        view.unmount();
    }
});

test('rejected playback and a decode error both leave the still and explicit control usable', async () => {
    play.mockRejectedValueOnce(new Error('unsupported codec'));
    const view = renderCollection();
    await act(async () => { fireEvent.click(playButton('bezier')); });
    expect(card('bezier').querySelector('video')).toBeNull();
    expect(playButton('bezier')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(playButton('bezier'));
    const video = card('bezier').querySelector('video')!;
    expect(video).not.toHaveClass('is-frame-ready');
    fireEvent.error(video);
    expect(card('bezier').querySelector('video')).toBeNull();
    expect(card('bezier').querySelector('img')).toBeInTheDocument();
    expect(playButton('bezier')).toHaveAttribute('aria-pressed', 'false');
    view.unmount();
});

test('the Stop control cancels a pass that started automatically', () => {
    reducedMotion = false;
    const view = renderCollection();
    fireEvent.focus(card('bezier').querySelector('.demonstrations-catalog-title a')!);
    expect(card('bezier').querySelector('video')).toBeInTheDocument();
    expect(playButton('bezier')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(playButton('bezier'));
    expect(card('bezier').querySelector('video')).toBeNull();
    expect(playButton('bezier')).toHaveAttribute('aria-pressed', 'false');
    view.unmount();
});

test('keyboard focus on the explicit control does not consume its activation', () => {
    reducedMotion = false;
    const view = renderCollection();
    fireEvent.focus(playButton('bezier'));
    expect(card('bezier').querySelector('video')).toBeNull();
    fireEvent.click(playButton('bezier'));
    expect(card('bezier').querySelector('video source')).toHaveAttribute('src', '/bezier.webm');
    view.unmount();
});

test('an explicit pass is not restarted by moving focus to another descendant', () => {
    reducedMotion = false;
    const view = renderCollection();
    fireEvent.focus(playButton('bezier'));
    fireEvent.click(playButton('bezier'));
    const video = card('bezier').querySelector('video');
    fireEvent.blur(playButton('bezier'), {relatedTarget: card('bezier').querySelector('.demonstrations-catalog-title a')});
    fireEvent.focus(card('bezier').querySelector('.demonstrations-catalog-title a')!);
    expect(card('bezier').querySelector('video')).toBe(video);
    view.unmount();
});
