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
