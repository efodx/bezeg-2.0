import React from 'react';
import {fireEvent, render} from '@testing-library/react';
import {expect, it} from 'vitest';
import {ChapterExploration} from './ChapterExploration';

it('keeps the example text and launch action when its preview image fails to load', () => {
    const {container, getByRole, getByText} = render(<ChapterExploration kind="guided-example" label="Guided example"
        title="A prepared curve" prompt="Inspect its control points."
        preview={{src: '/missing.png', alt: 'A curve', caption: 'A prepared curve.'}}
        action={<a href="/example">Open example</a>}/>);

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('.chapter-exploration--without-preview')).not.toBeNull();
    expect(getByText('A prepared curve')).toBeTruthy();
    expect(getByText('Inspect its control points.')).toBeTruthy();
    expect(getByRole('link', {name: 'Open example'}).getAttribute('href')).toBe('/example');
});
