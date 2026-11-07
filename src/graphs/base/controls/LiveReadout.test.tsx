import React from 'react';
import {act, render} from '@testing-library/react';
import {LiveReadout, READOUT_SETTLE_MS, SettledReadout} from './LiveReadout';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('SettledReadout', () => {
    test('the first report publishes at once, with no timer', () => {
        const readout = new SettledReadout();
        readout.report('κ = 2');
        expect(readout.getSnapshot()).toBe('κ = 2.');
        expect(vi.getTimerCount()).toBe(0);
    });

    test('a change is published only after the quiet period of the last report', () => {
        const readout = new SettledReadout();
        readout.report('a');
        for (let i = 0; i < 20; i++) { readout.report(`b${i}`); vi.advanceTimersByTime(READOUT_SETTLE_MS - 1); }
        expect(readout.getSnapshot()).toBe('a.');
        vi.advanceTimersByTime(1);
        expect(readout.getSnapshot()).toBe('b19.');
        expect(vi.getTimerCount()).toBe(0);
    });

    test('a report equal to the published text cancels a pending change', () => {
        const readout = new SettledReadout();
        readout.report('a');
        readout.report('b');
        readout.report('a');
        expect(vi.getTimerCount()).toBe(0);
        vi.advanceTimersByTime(READOUT_SETTLE_MS * 2);
        expect(readout.getSnapshot()).toBe('a.');
    });

    test('lines become sentences, and an empty report empties the text after the quiet period', () => {
        const readout = new SettledReadout();
        readout.report('κ = 2\nR = 0,5.\n');
        expect(readout.getSnapshot()).toBe('κ = 2. R = 0,5.');
        readout.report('');
        expect(readout.getSnapshot()).toBe('κ = 2. R = 0,5.');
        vi.advanceTimersByTime(READOUT_SETTLE_MS);
        expect(readout.getSnapshot()).toBe('');
    });

    test('cancel leaves no timer and keeps the published text', () => {
        const readout = new SettledReadout();
        readout.report('a');
        readout.report('b');
        expect(vi.getTimerCount()).toBe(1);
        readout.cancel();
        expect(vi.getTimerCount()).toBe(0);
        vi.advanceTimersByTime(READOUT_SETTLE_MS);
        expect(readout.getSnapshot()).toBe('a.');
    });
});

test('the component is a polite status region that follows the published text', () => {
    const readout = new SettledReadout();
    readout.report('a');
    const view = render(<LiveReadout readout={readout}/>);
    const region = view.container.querySelector('[data-readout-live]')!;
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('a.');
    readout.report('b');
    expect(region.textContent).toBe('a.');
    act(() => { vi.advanceTimersByTime(READOUT_SETTLE_MS); });
    expect(region.textContent).toBe('b.');
});

describe('mute rule', () => {
    const region = (view: ReturnType<typeof render>) => view.container.querySelector('[data-readout-live]')!;

    test('muted: the region is present and empty, the readout keeps tracking, unmute shows the current text at once', () => {
        const readout = new SettledReadout();
        readout.report('a');
        const view = render(<LiveReadout readout={readout} muted/>);
        expect(region(view).textContent).toBe('');
        expect(readout.getSnapshot()).toBe('a.');
        readout.report('b');
        act(() => { vi.advanceTimersByTime(READOUT_SETTLE_MS); });
        expect(readout.getSnapshot()).toBe('b.');
        expect(region(view).textContent).toBe('');
        readout.report('c');
        view.rerender(<LiveReadout readout={readout} muted={false}/>);
        expect(region(view).textContent).toBe('c.');
        expect(vi.getTimerCount()).toBe(0);
    });

    test('unmuted it still settles for the quiet period', () => {
        const readout = new SettledReadout();
        readout.report('a');
        const view = render(<LiveReadout readout={readout} muted={false}/>);
        readout.report('b');
        act(() => { vi.advanceTimersByTime(READOUT_SETTLE_MS - 1); });
        expect(region(view).textContent).toBe('a.');
        act(() => { vi.advanceTimersByTime(1); });
        expect(region(view).textContent).toBe('b.');
    });

    test('an optional data attribute is added to the region', () => {
        const view = render(<LiveReadout readout={new SettledReadout()} dataAttribute="x-live"/>);
        expect(region(view).hasAttribute('data-x-live')).toBe(true);
    });
});
