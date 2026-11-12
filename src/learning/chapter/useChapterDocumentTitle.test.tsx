import React from 'react';
import {render} from '@testing-library/react';
import {afterEach, beforeEach, expect, test} from 'vitest';
import {useChapterDocumentTitle} from './useChapterDocumentTitle';

function Reader({title}: {title: string}) {
    useChapterDocumentTitle(title);
    return null;
}

let original = '';
beforeEach(() => { original = document.title; document.title = 'Bezeg'; });
afterEach(() => { document.title = original; });

test('an open chapter names itself in the document title and restores the previous title on leaving', () => {
    const view = render(<Reader title="Konveksnost in ovojnice"/>);
    expect(document.title).toBe('Konveksnost in ovojnice · Bezeg');

    view.rerender(<Reader title="Convexity and hulls"/>);
    expect(document.title).toBe('Convexity and hulls · Bezeg');

    view.unmount();
    expect(document.title).toBe('Bezeg');
});
