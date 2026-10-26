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
import {bezierChapter} from './content/bezierChapter';
import {learningChapters} from './learningChapters';
import {getChapterGuidedExamples, resolveGuidedExample} from './chapter/guidedExamples';

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

test('Learn contains every family chapter and keeps guided activities inside chapters', () => {
    const {container} = render(<MemoryRouter><LearningPage/></MemoryRouter>);
    expect(learningChapters.map(chapter => chapter.family).sort()).toEqual(getDemonstrationCatalog().families.map(family => family.id).sort());
    expect(container.querySelectorAll('.learning-family')).toHaveLength(8);
    expect(container.querySelectorAll('.learning-topic-heading')).toHaveLength(8);
    expect(container.querySelectorAll('.learning-preview img[loading="lazy"]')).toHaveLength(8);
    for (const chapter of learningChapters) {
        expect(screen.getByRole('heading', {name: chapter.title.sl, level: 2})).toBeInTheDocument();
        expect(within(container.querySelector(`#${chapter.id}`)!).getByRole('link', {name: 'Preberi poglavje'})).toHaveAttribute('href', `/bezeg-2.0/learn/${chapter.id}`);
    }
    expect(container.querySelectorAll('.learning-lessons')).toHaveLength(0);
    expect([...container.querySelectorAll('a')].filter(link => link.search.includes('learn=1'))).toHaveLength(0);
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
    const graphLinks = [...container.querySelectorAll('.chapter-guided-lessons a')];
    const expected = chapter.sections.flatMap(section => {
        const examples = getChapterGuidedExamples(id, section.id);
        const byId = new Map(examples.map(example => [example.id, example]));
        return (section.orderedContent ?? [])
            .filter((block): block is Extract<NonNullable<typeof section.orderedContent>[number], {kind: 'example'}> => block.kind === 'example')
            .map(block => {
                const example = byId.get(block.exampleId);
                expect(example, `${id}#${section.id} has a published reference for ${block.exampleId}`).toBeDefined();
                return example?.path ?? '';
            });
    });
    expect(graphLinks).toHaveLength(expected.length);
    expect(graphLinks.map(link => link.getAttribute('href'))).toEqual(expected);
    expect(graphLinks.every(link => link.textContent?.includes('Vodeni primer'))).toBe(true);
    expect(container.querySelectorAll('.learning-lessons, .chapter-activity-list')).toHaveLength(0);
    await waitFor(() => expect(document.getElementById(`${chapter.sections[0].id}-heading`)).toHaveFocus());
});

test('every chapter example link resolves to its precise owner in the unified guided model', () => {
    const sections = [
        ...familyChapters.map(chapter => ({id: chapter.id, sections: chapter.sections.map(section => section.id)})),
        {id: 'bezier-curves', sections: bezierChapter.sl.sections.map(section => section.id)},
    ];
    let total = 0;
    let multiFrameOwner: {chapterId: string; sectionId: string} | undefined;
    for (const chapter of sections) for (const sectionId of chapter.sections) {
        const entries = getChapterGuidedExamples(chapter.id, sectionId);
        const paths = entries.map(entry => entry.path);
        expect(new Set(paths).size, `${chapter.id}#${sectionId} has duplicate example destinations`).toBe(paths.length);
        for (const entry of entries) {
            const search = entry.path.slice(entry.path.indexOf('?'));
            const resolved = resolveGuidedExample(search, entry.demonstrationId);
            expect(resolved, entry.path).toBeDefined();
            expect(resolved?.owner).toEqual({chapterId: chapter.id, sectionId});
            expect(resolved?.lesson.demonstrationId).toBe(entry.demonstrationId);
            expect(resolved?.lesson.steps.length).toBeGreaterThan(0);
            if (resolved && resolved.lesson.steps.length > 1) multiFrameOwner = {chapterId: chapter.id, sectionId};
            total += 1;
        }
    }
    expect(total).toBeGreaterThan(0);

    const shortPath = getChapterGuidedExamples('bezier-curves', 'parameter').find(entry => entry.demonstrationId === 'decasteljau')!.path;
    const short = resolveGuidedExample(`?${shortPath.split('?')[1]}`, 'decasteljau');
    expect(short?.lesson.steps).toHaveLength(1);
    expect(multiFrameOwner).toBeDefined();
});

test('Foundations renders bilingual unified example labels and keeps its explanatory figures', async () => {
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
    const cards = [...container.querySelectorAll('.chapter-exploration--guided-example')];
    const guidedLinks = [...container.querySelectorAll('.chapter-guided-lessons a')];
    const foundation = familyChapters.find(chapter => chapter.id === 'foundations')!;
    const expectedFoundations = foundation.sections.flatMap(section => getChapterGuidedExamples('foundations', section.id));
    expect(cards.length).toBeGreaterThan(0);
    expect(guidedLinks).toHaveLength(cards.length);
    expect(guidedLinks.map(link => link.getAttribute('href'))).toEqual(expectedFoundations.map(example => example.path));
    expect(cards.every(card => card.getAttribute('aria-label')?.startsWith('Vodeni primer: '))).toBe(true);

    setLanguage('en');
    await waitFor(() => {
        expect(container.querySelector('.chapter-exploration--guided-example')?.getAttribute('aria-label')).toMatch(/^Guided example: /);
        expect(container.textContent).toContain('four cubic weights');
        expect(container.textContent).toContain('quadratic weights');
        expect([...container.querySelectorAll('.chapter-exploration--guided-example')].every(card => card.getAttribute('aria-label')?.startsWith('Guided example: '))).toBe(true);
        expect(guidedLinks.every(link => link.textContent?.includes('Guided example'))).toBe(true);
    });
});
