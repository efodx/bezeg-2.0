import React from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expect, it} from 'vitest';
import {ChapterGuidedLessons} from './ChapterGuidedLessons';

it('renders only the referenced stable example ID and accepts injected preview metadata', () => {
    const {container} = render(<MemoryRouter>
        <ChapterGuidedLessons chapterId="bezier-curves" sectionId="parameter" language="en" exampleId="bezier-curves.parameter.decasteljau-parameter"
            previewFor={id => id === 'bezier-curves.parameter.decasteljau-parameter' ? {src: '/exact-scene.png', alt: 'Exact parameter scene', caption: 'The curve has five controls.'} : undefined}/>
    </MemoryRouter>);

    const cards = [...container.querySelectorAll('.chapter-exploration--guided-example')];
    expect(cards).toHaveLength(1);
    const image = cards[0].querySelector('img');
    expect(image?.getAttribute('src')).toBe('/exact-scene.png');
    expect(image?.alt).toBe('Exact parameter scene');
    expect(cards[0].querySelector('figcaption')?.textContent).toBe('The curve has five controls.');
    expect(cards[0].querySelector('a')?.id).toBe('example-bezier-curves-parameter-bezier-curves.parameter.decasteljau-parameter');
});
