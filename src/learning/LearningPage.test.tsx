import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {beforeEach, expect, test, vi} from 'vitest';
import {setLanguage} from '../localization';
import {getDemonstrationCatalog} from '../demonstrations';
import {demonstrationPreviewAssets} from '../demonstrationPreviewAssets';
import {LearningPage} from './LearningPage';
import {FamilyChapterPage} from './FamilyChapterPage';
import {ChapterPage} from './ChapterPage';
import {familyChapters} from './content/familyChapters';
import {learningChapters} from './learningChapters';
import {GUIDED_LESSON_AVAILABLE_IDS} from './runtime/lessonAvailability';

function RouterLocationProbe() {
    const location = useLocation();
    return <output data-testid="router-location" data-hash={location.hash} data-key={location.key}/>;
}

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
    expect(container.querySelectorAll('.learning-topic-heading')).toHaveLength(8);
    expect(container.querySelectorAll('.learning-preview img[loading="lazy"]')).toHaveLength(8);
    for (const chapter of learningChapters) {
        expect(screen.getByRole('heading', {name: chapter.title.sl, level: 2})).toBeInTheDocument();
        expect(within(container.querySelector(`#${chapter.id}`)!).getByRole('link', {name: 'Preberi poglavje'})).toHaveAttribute('href', `/bezeg-2.0/learn/${chapter.id}`);
    }
    expect(container.querySelectorAll('.learning-lessons:not([open]) summary')).toHaveLength(8);
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
    fireEvent.click(within(container.querySelector(`#${next.id}`)!).getByRole('link', {name: 'Read the chapter'}));
    await waitFor(() => expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(next.title.en));
    expect(container.querySelectorAll('.chapter-section')).toHaveLength(next.sections.length);
});

test.each(learningChapters.map((chapter, index) => [chapter.id, chapter, learningChapters[index - 1], learningChapters[index + 1]] as const))(
    '%s exposes explicitly labeled neighbors in Learn order', (id, chapter, previous, next) => {
        const route = id === 'bezier-curves'
            ? <ChapterPage/>
            : <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/></Routes>;
        const {container} = render(<MemoryRouter initialEntries={[`/bezeg-2.0/learn/${id}`]}>{route}</MemoryRouter>);
        const nav = screen.getByRole('navigation', {name: 'Poglavja po vrsti'});
        const links = within(nav).getAllByRole('link');
        expect(links.map(link => link.textContent)).toEqual([
            ...(previous ? [`Prejšnje poglavje: ${previous.title.sl}`] : []),
            ...(next ? [`Naslednje poglavje: ${next.title.sl}`] : []),
        ]);
        expect(container.querySelector('#jgbox')).toBeNull();
    },
);

test('family contents follows scrolling without changing the hash and closes with heading focus after selection', async () => {
    const chapter = familyChapters.find(entry => entry.id === 'foundations')!;
    const {container} = render(<MemoryRouter initialEntries={[`/bezeg-2.0/learn/${chapter.id}`]}>
        <RouterLocationProbe/>
        <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/></Routes>
    </MemoryRouter>);
    const initialLocation = container.querySelector('[data-testid="router-location"]')!;
    const initialHash = initialLocation.getAttribute('data-hash');
    const initialKey = initialLocation.getAttribute('data-key');
    const [, second] = chapter.sections;
    chapter.sections.forEach((section, index) => {
        document.getElementById(section.id)!.getBoundingClientRect = () => ({top: index === 0 ? -40 : index === 1 ? 100 : 5000} as DOMRect);
    });
    fireEvent.scroll(window);
    await waitFor(() => expect(container.querySelector('.chapter-sidebar [aria-current="location"]')).toHaveAttribute('href', `#${second.id}`));
    expect(container.querySelector('[data-testid="router-location"]')).toHaveAttribute('data-hash', initialHash);
    expect(container.querySelector('[data-testid="router-location"]')).toHaveAttribute('data-key', initialKey);

    const disclosure = container.querySelector('.learning-mobile-contents') as HTMLDetailsElement;
    fireEvent.click(within(disclosure).getByText('Vsebina poglavja'));
    const destination = within(disclosure).getByRole('link', {name: second.title.sl});
    fireEvent.click(destination);
    expect(disclosure.open).toBe(false);
    expect(document.getElementById(`${second.id}-heading`)).toHaveFocus();
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

test('Foundations renders bilingual app figures, specific graph prompts and accurate guided-lesson links', async () => {
    const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/foundations']}>
        <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/></Routes>
    </MemoryRouter>);
    const figures = [...container.querySelectorAll('.chapter-activity-figure')];
    expect(figures).toHaveLength(2);
    const imageSources = figures.map(figure => figure.querySelector('img')?.getAttribute('src'));
    expect(imageSources).toContain(demonstrationPreviewAssets.bernstein);
    expect(imageSources).toContain(demonstrationPreviewAssets['complex-multiplication']);
    for (const figure of figures) {
        const image = figure.querySelector('img')!;
        expect(image.alt).toBeTruthy();
        expect(image.alt).not.toMatch(/\\[()[\]]/u);
        expect(image).toHaveAttribute('width', '720');
        expect(image).toHaveAttribute('height', '440');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(figure.querySelector('figcaption')?.textContent).toBeTruthy();
    }
    expect(container.textContent).toContain('štiri kubične uteži');
    expect(container.textContent).toContain('kvadratne uteži');
    expect(container.textContent).toContain('Vodena učna ura');
    expect(container.querySelector('.learning-investigation-prompt')?.textContent).toContain('stopnjo');
    const links = [...container.querySelectorAll('.learning-investigations a')];
    expect(links.length).toBeGreaterThan(2);
    expect(links.every(link => link.getAttribute('href')?.endsWith('?learn=1'))).toBe(true);

    setLanguage('en');
    await waitFor(() => {
        expect(container.textContent).toContain('four cubic weights');
        expect(container.textContent).toContain('quadratic weights');
        expect(container.textContent).toContain('Guided graph lesson');
        expect(container.querySelector('.learning-investigation-prompt')?.textContent).toContain('degree');
    });
});
