import React from 'react';
import {act, render} from '@testing-library/react';
import {READOUT_SETTLE_MS} from '../base/controls/LiveReadout';
import {FunctionStatus} from './FunctionStatus';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const lines = (x: string) => [{id: 'value', text: `f(x) = ${x}`}, {id: 'note', text: 'Jump at 0'}];

describe('FunctionStatus', () => {
    test('the visible lines carry no live role; the one live region reads them as one sentence', () => {
        const {container} = render(<FunctionStatus className="taylor-status" lines={lines('1')} dataAttribute="taylor-status"/>);
        const group = container.querySelector('.function-status')!;
        expect(group.getAttribute('role')).toBeNull();
        expect(group.getAttribute('aria-live')).toBeNull();
        expect(group.classList.contains('taylor-status')).toBe(true);
        expect([...group.querySelectorAll('[data-taylor-status]')].map(p => p.getAttribute('data-taylor-status'))).toEqual(['value', 'note']);
        const live = container.querySelectorAll('[aria-live]');
        expect(live).toHaveLength(1);
        expect(live[0].textContent).toBe('f(x) = 1. Jump at 0.');
    });

    test('a drag changes the visible lines at once and the announcement only after it settles', () => {
        const {container, rerender} = render(<FunctionStatus lines={lines('1')}/>);
        for (const x of ['2', '3', '4']) rerender(<FunctionStatus lines={lines(x)}/>);
        const live = container.querySelector('[data-readout-live]')!;
        expect(container.querySelector('.function-status')!.textContent).toContain('f(x) = 4');
        expect(live.textContent).toBe('f(x) = 1. Jump at 0.');
        act(() => { vi.advanceTimersByTime(READOUT_SETTLE_MS); });
        expect(live.textContent).toBe('f(x) = 4. Jump at 0.');
    });

    test('muted while playing, the region is empty; on unmute it shows the current text at once', () => {
        const {container, rerender} = render(<FunctionStatus lines={lines('1')} muted/>);
        const live = container.querySelector('[data-readout-live]')!;
        expect(live.textContent).toBe('');
        rerender(<FunctionStatus lines={lines('5')} muted/>);
        rerender(<FunctionStatus lines={lines('5')}/>);
        expect(live.textContent).toBe('f(x) = 5. Jump at 0.');
    });
});
