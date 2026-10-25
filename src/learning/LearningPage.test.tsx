import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {beforeEach, expect, test, vi} from 'vitest';
import {setLanguage} from '../localization';
import {getDemonstrationCatalog} from '../demonstrations';
import {LearningPage} from './LearningPage';
import {FamilyChapterPage} from './FamilyChapterPage';
import {familyChapters} from './content/familyChapters';
import {learningChapters} from './learningChapters';
import {GUIDED_LESSON_AVAILABLE_IDS} from './runtime/lessonAvailability';

vi.mock('../mathjax/loadMathJax', () => ({typesetMath: async () => undefined}));

beforeEach(() => {
    setLanguage('sl');
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
});

test('Learn contains every family chapter and every available guided lesson exactly once', () => {
    const {container} = render(<MemoryRouter><LearningPage/></MemoryRouter>);
    expect(learningChapters.map(chapter => chapter.family).sort()).toEqual(getDemonstrationCatalog().families.map(family => family.id).sort());
    expect(container.querySelectorAll('.learning-family')).toHaveLength(8);
    for (const chapter of learningChapters) {
        expect(screen.getByRole('link', {name: chapter.title.sl})).toHaveAttribute('href', `/bezeg-2.0/learn/${chapter.id}`);
    }
    const lessonLinks = [...container.querySelectorAll('a')].filter(link => link.search === '?learn=1');
    expect(lessonLinks.map(link => link.pathname).sort()).toEqual(getDemonstrationCatalog().demonstrations
        .filter(demo => GUIDED_LESSON_AVAILABLE_IDS.includes(demo.id)).map(demo => demo.path).sort());
    expect(container.querySelector('#jgbox')).toBeNull();
});

test('chapter reading navigates between topics and translates without a graph mount', async () => {
    const first = familyChapters.find(chapter => chapter.id === 'foundations')!;
    const {container} = render(<MemoryRouter initialEntries={[`/bezeg-2.0/learn/${first.id}`]}>
        <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/><Route path="/bezeg-2.0/learn" element={<LearningPage/>}/></Routes>
    </MemoryRouter>);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(first.title.sl);
    expect(container.querySelectorAll('.chapter-section')).toHaveLength(first.sections.length);
    await act(async () => { setLanguage('en'); });
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(first.title.en);
    expect(container.querySelector('#jgbox')).toBeNull();
    fireEvent.click(screen.getByRole('link', {name: /All learning content/}));
    await waitFor(() => expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Learn through reading'));
    const next = familyChapters.find(chapter => chapter.id === 'rational-curves')!;
    fireEvent.click(within(screen.getByRole('heading', {name: next.title.en, level: 3})).getByRole('link'));
    await waitFor(() => expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(next.title.en));
    expect(container.querySelectorAll('.chapter-section')).toHaveLength(next.sections.length);
});

test.each(familyChapters.map(chapter => [chapter.id, chapter] as const))('%s has readable sections, stable anchors and valid graph targets', async (id, chapter) => {
    const {container} = render(<MemoryRouter initialEntries={[`/bezeg-2.0/learn/${id}#${chapter.sections[0].id}`]}>
        <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/></Routes>
    </MemoryRouter>);
    for (const section of chapter.sections) {
        expect(container.querySelector(`[id="${section.id}"]`)).toBeTruthy();
        expect(screen.getAllByRole('link', {name: section.title.sl})[0]).toHaveAttribute('href', `#${section.id}`);
    }
    const graphLinks = [...container.querySelectorAll('.learning-investigations a')];
    expect(graphLinks.length).toBeGreaterThan(0);
    for (const link of graphLinks) expect(getDemonstrationCatalog().demonstrations.some(demo => demo.path === link.getAttribute('href')?.split('?')[0])).toBe(true);
    await waitFor(() => expect(document.getElementById(`${chapter.sections[0].id}-heading`)).toHaveFocus());
});
