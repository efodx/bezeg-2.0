import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {DemonstrationPreview} from './DemonstrationPreview';

const originalDecode = HTMLImageElement.prototype.decode;

beforeEach(() => {
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
        configurable: true,
        value: vi.fn(() => Promise.resolve()),
    });
});

afterEach(() => {
    if (originalDecode) {
        Object.defineProperty(HTMLImageElement.prototype, 'decode', {configurable: true, value: originalDecode});
    } else {
        delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
    }
});

function setNaturalWidth(image: HTMLImageElement, width: number) {
    Object.defineProperty(image, 'naturalWidth', {configurable: true, value: width});
}

test('keeps the reserved preview hidden until its image decodes', async () => {
    let finishDecode!: () => void;
    vi.mocked(HTMLImageElement.prototype.decode).mockImplementation(() => new Promise(resolve => { finishDecode = resolve; }));
    const view = render(<DemonstrationPreview src="/preview.png" loading="eager"/>);
    const image = view.container.querySelector('img')!;
    setNaturalWidth(image, 360);

    fireEvent.load(image);
    expect(image).not.toHaveClass('is-ready');
    expect(view.container.querySelector('.demonstration-preview-media')).toBeInTheDocument();
    await act(async () => { finishDecode(); });
    expect(image).toHaveClass('is-ready');
});

test('reveals a warm cached image after checking its completed decode', async () => {
    const completeDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
    const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {configurable: true, get: () => true});
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {configurable: true, get: () => 360});
    try {
        const view = render(<DemonstrationPreview src="/cached.png" loading="lazy"/>);
        const image = view.container.querySelector('img')!;
        await act(async () => { await Promise.resolve(); });
        expect(image).toHaveClass('is-ready');
        expect(HTMLImageElement.prototype.decode).toHaveBeenCalled();
        view.unmount();
    } finally {
        if (completeDescriptor) Object.defineProperty(HTMLImageElement.prototype, 'complete', completeDescriptor);
        else Reflect.deleteProperty(HTMLImageElement.prototype, 'complete');
        if (widthDescriptor) Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', widthDescriptor);
        else Reflect.deleteProperty(HTMLImageElement.prototype, 'naturalWidth');
    }
});

test('reveals a successfully loaded image when decode is unavailable', () => {
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {configurable: true, value: undefined});
    const view = render(<DemonstrationPreview src="/no-decode.png" loading="eager"/>);
    const image = view.container.querySelector('img')!;
    setNaturalWidth(image, 360);

    fireEvent.load(image);
    expect(image).toHaveClass('is-ready');
});

test('shows an image whose decode promise rejects after a successful load', async () => {
    vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValue(new Error('decode rejected'));
    const view = render(<DemonstrationPreview src="/loaded.png" loading="eager"/>);
    const image = view.container.querySelector('img')!;
    setNaturalWidth(image, 360);

    await act(async () => { fireEvent.load(image); await Promise.resolve(); });
    expect(image).toHaveClass('is-ready');
});

test('keeps the pale frame and hides the broken image after a request failure', () => {
    const view = render(<DemonstrationPreview src="/missing.png" loading="eager"/>);
    const image = view.container.querySelector('img')!;

    fireEvent.error(image);
    expect(image).toHaveClass('is-failed');
    expect(view.container.querySelector('.demonstration-preview-media')).toBeInTheDocument();
});

test('ignores a stale decode when the preview source changes', async () => {
    const pending: Array<() => void> = [];
    vi.mocked(HTMLImageElement.prototype.decode).mockImplementation(() => new Promise(resolve => { pending.push(resolve); }));
    const view = render(<DemonstrationPreview src="/old.png" loading="eager"/>);
    const oldImage = view.container.querySelector('img')!;
    setNaturalWidth(oldImage, 360);
    fireEvent.load(oldImage);

    view.rerender(<DemonstrationPreview src="/new.png" loading="eager"/>);
    const newImage = view.container.querySelector('img')!;
    setNaturalWidth(newImage, 360);
    fireEvent.load(newImage);

    await act(async () => { pending[0](); await Promise.resolve(); });
    expect(newImage).not.toHaveClass('is-ready');
    await act(async () => { pending[1](); await Promise.resolve(); });
    expect(newImage).toHaveClass('is-ready');
});

test('a decode completing after unmount is ignored', async () => {
    let finishDecode!: () => void;
    vi.mocked(HTMLImageElement.prototype.decode).mockImplementation(() => new Promise(resolve => { finishDecode = resolve; }));
    const view = render(<DemonstrationPreview src="/late.png" loading="eager"/>);
    const image = view.container.querySelector('img')!;
    setNaturalWidth(image, 360);
    fireEvent.load(image);
    view.unmount();

    await act(async () => { finishDecode(); });
    expect(view.container).toBeEmptyDOMElement();
});
