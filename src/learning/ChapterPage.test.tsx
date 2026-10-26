import React from 'react';
import {act, render, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {setLanguage} from '../localization';
import {ChapterPage} from './ChapterPage';

type TestMathJax = {
    startup: {promise: Promise<void>};
    typesetClear: ReturnType<typeof vi.fn>;
    typesetPromise: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
    setLanguage('sl');
    delete (window as Window & {MathJax?: TestMathJax}).MathJax;
    document.getElementById('MathJax-script')?.remove();
});

afterEach(() => {
    document.getElementById('MathJax-script')?.remove();
    delete (window as Window & {MathJax?: TestMathJax}).MathJax;
});

test('direct chapter entry loads MathJax and typesets again after a language change', async () => {
    const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/bezier-curves']}>
        <ChapterPage/>
    </MemoryRouter>);
    const article = container.querySelector('article')!;
    const script = document.getElementById('MathJax-script') as HTMLScriptElement;
    expect(article.textContent).toContain('Bézier');

    const api: TestMathJax = {
        startup: {promise: Promise.resolve()},
        typesetClear: vi.fn(),
        typesetPromise: vi.fn().mockResolvedValue(undefined),
    };
    (window as Window & {MathJax?: TestMathJax}).MathJax = api;
    await act(async () => { script.dispatchEvent(new Event('load')); });
    await waitFor(() => expect(api.typesetPromise).toHaveBeenCalledWith([article]));
    expect(api.typesetClear).toHaveBeenCalledWith([article]);

    setLanguage('en');
    await waitFor(() => expect(api.typesetPromise).toHaveBeenCalledTimes(2));
    expect(document.getElementById('MathJax-script')).toBe(script);
});

test('activity figures use full-size captures with bilingual alternatives and captions', async () => {
    const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/bezier-curves']}>
        <ChapterPage/>
    </MemoryRouter>);
    const figures = [...container.querySelectorAll('.chapter-activity-figure')];
    expect(figures).toHaveLength(6);
    const images = figures.map(figure => figure.querySelector('img')!);
    expect(images.map(image => image.getAttribute('src'))).toEqual(expect.arrayContaining([
        expect.stringMatching(/shape-control/), expect.stringMatching(/curve-parameter/),
        expect.stringMatching(/repeated-interpolation/), expect.stringMatching(/blending-coefficients/),
        expect.stringMatching(/geometric-bounds/), expect.stringMatching(/transform-shape/),
    ]));
    for (const image of images) {
        expect(image).toHaveAttribute('width', '720');
        expect(image).toHaveAttribute('height', '440');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image.alt).toBeTruthy();
        expect(image.closest('figure')?.querySelector('figcaption')?.textContent).toBeTruthy();
    }
    expect(container.textContent).toContain('Začetni kubični primer');
    setLanguage('en');
    await waitFor(() => {
        expect(images[0].alt).toContain('cubic Bézier curve');
        expect(figures[5].querySelector('figcaption')?.textContent).toContain('starting cubic example');
    });
});
