import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {afterEach, expect, test} from 'vitest';
import {setLanguage} from '../localization';
import {getChapterGuidedExamples} from './chapter/guidedExamples';
import {bezierChapter} from './content/bezierChapter';
import {familyChapters} from './content/familyChapters';
import {ChapterPage} from './ChapterPage';
import {FamilyChapterPage} from './FamilyChapterPage';

afterEach(() => setLanguage('sl'));

test('patch prerequisites link to the curve chapter in both languages', async () => {
    const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/bezier-patches']}>
        <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/></Routes>
    </MemoryRouter>);
    const prerequisiteLink = () => container.querySelector('.chapter-prerequisites a');
    expect(prerequisiteLink()).toHaveAttribute('href', '/bezeg-2.0/learn/bezier-curves');
    expect(prerequisiteLink()).toHaveTextContent('Bézierjeve krivulje');
    await act(async () => setLanguage('en'));
    expect(prerequisiteLink()).toHaveAttribute('href', '/bezeg-2.0/learn/bezier-curves');
    expect(prerequisiteLink()).toHaveTextContent('Bézier curves');
});

function renderedOrder(container: HTMLElement, sectionId: string): string[] {
    return [...container.querySelectorAll(`#${sectionId} .chapter-section-body > *`)].map(item => {
        if (item.matches('.chapter-paragraph')) return `paragraph:${item.textContent}`;
        const card = item.querySelector('.chapter-exploration--guided-example');
        if (card) return `example:${card.querySelector('a')?.getAttribute('href')}`;
        return `other:${item.textContent}`;
    });
}

test('Bézier renderer keeps two referenced cards in authored prose order in both languages', async () => {
    const slSection = bezierChapter.sl.sections.find(section => section.id === 'interpolation')!;
    const enSection = bezierChapter.en.sections.find(section => section.id === 'interpolation')!;
    const previousSl = slSection.orderedContent;
    const previousEn = enSection.orderedContent;
    const [first, second] = getChapterGuidedExamples('bezier-curves', 'interpolation');
    expect(second).toBeDefined();
    const sequence = (firstId: string, secondId: string, language: 'sl' | 'en') => [
        {kind: 'paragraph' as const, text: language === 'sl' ? 'Pred prvim primerom.' : 'Before the first example.'},
        {kind: 'example' as const, exampleId: firstId},
        {kind: 'paragraph' as const, text: language === 'sl' ? 'Med primeroma.' : 'Between the examples.'},
        {kind: 'example' as const, exampleId: secondId},
    ];
    slSection.orderedContent = sequence(first.id, second.id, 'sl');
    enSection.orderedContent = sequence(first.id, second.id, 'en');

    try {
        const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/bezier-curves']}><ChapterPage/></MemoryRouter>);
        expect(renderedOrder(container, 'interpolation')).toEqual([
            'paragraph:Pred prvim primerom.', `example:${first.path}`, 'paragraph:Med primeroma.', `example:${second.path}`,
        ]);
        await act(async () => setLanguage('en'));
        expect(renderedOrder(container, 'interpolation')).toEqual([
            'paragraph:Before the first example.', `example:${first.path}`, 'paragraph:Between the examples.', `example:${second.path}`,
        ]);
    } finally {
        slSection.orderedContent = previousSl;
        enSection.orderedContent = previousEn;
    }
});

test('family renderer puts its single authored card between the section paragraphs', async () => {
    const section = familyChapters.find(chapter => chapter.id === 'foundations')!.sections.find(item => item.id === 'reading-bernstein')!;
    const previous = section.orderedContent;
    const [example] = getChapterGuidedExamples('foundations', 'reading-bernstein');
    expect(example).toBeDefined();
    section.orderedContent = [
        {kind: 'paragraph', text: {sl: 'Pred primerom.', en: 'Before the example.'}},
        {kind: 'example', exampleId: example.id},
        {kind: 'paragraph', text: {sl: 'Po primeru.', en: 'After the example.'}},
    ];
    try {
        const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/foundations']}>
            <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/></Routes>
        </MemoryRouter>);
        expect(renderedOrder(container, 'reading-bernstein')).toEqual([
            'paragraph:Pred primerom.', `example:${example.path}`, 'paragraph:Po primeru.',
        ]);
        expect(container.querySelectorAll('#reading-bernstein .chapter-exploration--guided-example')).toHaveLength(1);
        await act(async () => setLanguage('en'));
        expect(renderedOrder(container, 'reading-bernstein')).toEqual([
            'paragraph:Before the example.', `example:${example.path}`, 'paragraph:After the example.',
        ]);
    } finally {
        section.orderedContent = previous;
    }
});
