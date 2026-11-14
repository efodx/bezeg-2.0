import React from 'react';
import {render} from '@testing-library/react';
import {WORKSPACE_ELDER_BOX, WorkspaceElder} from './WorkspaceElder';

describe('WorkspaceElder', () => {
    it('draws one decorative branch that assistive technology and the pointer skip', () => {
        const {container} = render(<WorkspaceElder/>);
        const svg = container.querySelector('svg.workspace-elder')!;
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.getAttribute('focusable')).toBe('false');
        expect(svg.getAttribute('viewBox')).toBe(`0 0 ${WORKSPACE_ELDER_BOX.width} ${WORKSPACE_ELDER_BOX.height}`);
        expect(svg.querySelectorAll(':scope > g')).toHaveLength(1);
        expect(svg.querySelectorAll('path').length).toBeGreaterThan(3);
        expect(svg.querySelector('[style*="animation"], [class*="side-botanicals"]')).toBeNull();
    });

    it('draws the same branch on every render', () => {
        const first = render(<WorkspaceElder/>).container.innerHTML;
        expect(render(<WorkspaceElder/>).container.innerHTML).toBe(first);
    });
});
