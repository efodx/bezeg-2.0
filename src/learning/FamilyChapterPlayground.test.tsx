import React from 'react';
import {render, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {expect, test, vi} from 'vitest';
import {familyChapters} from './content/familyChapters';
import {FamilyChapterPage} from './FamilyChapterPage';

vi.mock('./playground/collisions/CollisionPlayground', () => ({default: () => <div data-testid="collision-run"/>}));
vi.mock('./playground/collisions/CollisionInspect', () => ({default: () => <div data-testid="collision-inspect"/>}));

test('a family chapter renders its playground blocks lazily, in authored order', async () => {
    const section = familyChapters.find(chapter => chapter.id === 'sweep-algorithms')!.sections[0];
    const previous = section.orderedContent;
    section.orderedContent = [
        {kind: 'paragraph', text: {sl: 'Pred.', en: 'Before.'}},
        {kind: 'playground', playground: 'collisions', mode: 'run'},
        {kind: 'playground', playground: 'collisions', mode: 'inspect'},
    ];
    try {
        const {container} = render(<MemoryRouter initialEntries={['/bezeg-2.0/learn/sweep-algorithms']}>
            <Routes><Route path="/bezeg-2.0/learn/:chapterId" element={<FamilyChapterPage/>}/></Routes>
        </MemoryRouter>);
        await waitFor(() => expect(container.querySelectorAll(`#${section.id} [data-testid^="collision-"]`)).toHaveLength(2), {timeout: 10000});
        const body = [...container.querySelectorAll(`#${section.id} .chapter-section-body > *`)];
        expect(body.map(node => node.matches('.chapter-paragraph') ? 'p' : node.getAttribute('data-testid')))
            .toEqual(['p', 'collision-run', 'collision-inspect']);
    } finally {
        section.orderedContent = previous;
    }
});
