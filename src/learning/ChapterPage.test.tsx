import React from 'react';
import {act, render, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {setLanguage} from '../localization';
import {bezierChapter} from './content/bezierChapter';
import {getChapterGuidedExamples} from './chapter/guidedExamples';
import {exampleReferences} from './chapter/orderedContent';
import {ChapterPage} from './ChapterPage';

vi.mock('./playground/DrawingPlayground', () => ({default: ({mode}: {mode: string}) => <div data-testid="stub-playground" data-mode={mode}/>}));
vi.mock('./playground/LookUnderneath', () => ({default: () => <div data-testid="stub-playground" data-mode="inspect"/>}));

vi.mock('./chapter/guidedExamplePreviews', async importOriginal => ({
    ...await importOriginal<typeof import('./chapter/guidedExamplePreviews')>(),
    resolveGuidedExamplePreview: (id: string, _demonstrationId: string, language: 'sl' | 'en') => ({
        src: `/preview/${id}.png`,
        alt: `${language}:${id} alt`,
        caption: `${language}:${id} caption`,
    }),
}));

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

test('Bézier sections show all retained cards with stable bilingual preview bindings', async () => {
    const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/bezier-curves']}>
        <ChapterPage/>
    </MemoryRouter>);
    const figures = [...container.querySelectorAll('.chapter-activity-figure')];
    const explorations = [...container.querySelectorAll('.chapter-exploration--guided-example')];
    const expectedExamples = bezierChapter.sl.sections.flatMap(section => {
        const links = getChapterGuidedExamples('bezier-curves', section.id);
        return exampleReferences(section.orderedContent ?? []).map(id => links.find(example => example.id === id)!);
    });
    expect(expectedExamples).toHaveLength(12);
    expect(figures).toHaveLength(expectedExamples.length);
    expect(explorations).toHaveLength(expectedExamples.length);
    expect(explorations.every(item => item.getAttribute('aria-label') === `Vodeni primer: ${item.querySelector('h3')?.textContent}`)).toBe(true);
    expect(explorations.map(item => item.getAttribute('aria-label'))).toEqual(expectedExamples.map(example => `Vodeni primer: ${example.title.sl}`));
    expect(explorations.every(item => item.querySelector('.chapter-open-activity')?.textContent?.includes('Vodeni primer'))).toBe(true);
    expect(container.querySelectorAll('.chapter-guided-lessons .chapter-exploration--guided-example')).toHaveLength(expectedExamples.length);
    expect(container.querySelectorAll('.chapter-activity-list, .learning-lessons')).toHaveLength(0);
    const exampleLinks = [...container.querySelectorAll('.chapter-guided-lessons a')];
    expect(exampleLinks.map(link => link.getAttribute('href'))).toEqual(expectedExamples.map(example => example.path));
    expect(new Set(exampleLinks.map(link => link.getAttribute('href'))).size).toBe(exampleLinks.length);
    const images = figures.map(figure => figure.querySelector('img')!);
    expect(images.map(image => image.getAttribute('src'))).toEqual(expectedExamples.map(example => `/preview/${example.id}.png`));
    for (const [index, image] of images.entries()) {
        expect(image).toHaveAttribute('width', '720');
        expect(image).toHaveAttribute('height', '440');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image.alt).toBe(`sl:${expectedExamples[index].id} alt`);
        expect(image.closest('figure')?.querySelector('figcaption')?.textContent).toBe(`sl:${expectedExamples[index].id} caption`);
    }
    setLanguage('en');
    await waitFor(() => {
        expect(explorations.map(item => item.getAttribute('aria-label'))).toEqual(expectedExamples.map(example => `Guided example: ${example.title.en}`));
        expect(exampleLinks.every(link => link.textContent?.includes('Guided example'))).toBe(true);
        expect(images.map(image => image.alt)).toEqual(expectedExamples.map(example => `en:${example.id} alt`));
        expect(figures.map(figure => figure.querySelector('figcaption')?.textContent)).toEqual(expectedExamples.map(example => `en:${example.id} caption`));
    });
});

test.each(['sl', 'en'] as const)('draws the playground in motivation and inspects it in next-ideas (%s)', async language => {
    setLanguage(language);
    const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/bezier-curves']}>
        <ChapterPage/>
    </MemoryRouter>);
    await waitFor(() => expect(container.querySelectorAll('[data-testid="stub-playground"]')).toHaveLength(2));
    const draw = container.querySelector('#motivation [data-testid="stub-playground"]');
    const inspect = container.querySelector('#next-ideas [data-testid="stub-playground"]');
    expect(draw?.getAttribute('data-mode')).toBe('draw');
    expect(inspect?.getAttribute('data-mode')).toBe('inspect');
    expect(draw?.previousElementSibling?.className).toBe('chapter-paragraph');
    expect(inspect?.nextElementSibling?.textContent).toContain(language === 'sl' ? 'Te zamisli' : 'These ideas');
});
