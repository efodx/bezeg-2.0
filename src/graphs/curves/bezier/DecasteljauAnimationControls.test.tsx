import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {setLanguage} from '../../../localization';
import {DecasteljauAnimationControls, DecasteljauAnimationStatus} from './DecasteljauAnimationControls';

const button = (action: string) => document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;

function controls(status: DecasteljauAnimationStatus, parameter: number, handlers: Partial<Record<'onPlay' | 'onPause' | 'onStop', () => void>> = {}) {
    return <DecasteljauAnimationControls status={status} parameter={parameter} speed={1} onPlay={() => {}} onPause={() => {}} onStop={() => {}}
                                         onParameterChange={() => {}} onSpeedChange={() => {}} {...handlers}/>;
}

afterEach(() => setLanguage('sl'));

describe('DecasteljauAnimationControls', () => {
    test('the shared playback group has Play and Reset only: no Next step, Stop or Replay', () => {
        const {rerender} = render(controls('paused', 0.5));
        expect([...document.querySelectorAll<HTMLButtonElement>('.inspector-playback button')].map(element => element.dataset.action)).toEqual(['play-pause', 'reset']);
        expect(button('reset').textContent).toBe('Ponastavi');
        expect(button('reset').getAttribute('aria-disabled')).toBe('false');
        rerender(controls('ready', 0));
        expect(button('reset').getAttribute('aria-disabled')).toBe('true');
        expect(button('reset').title).toBe('Prikaz je že na začetku.');
    });

    test('Play starts, then the same button pauses; Reset runs the stop action', () => {
        const onPlay = vi.fn(), onPause = vi.fn(), onStop = vi.fn();
        const {rerender} = render(controls('paused', 0.5, {onPlay, onPause, onStop}));
        fireEvent.click(button('play-pause'));
        expect(onPlay).toHaveBeenCalledTimes(1);
        fireEvent.click(button('reset'));
        expect(onStop).toHaveBeenCalledTimes(1);
        rerender(controls('playing', 0.5, {onPlay, onPause, onStop}));
        expect(button('play-pause').textContent).toBe('Premor');
        fireEvent.click(button('play-pause'));
        expect(onPause).toHaveBeenCalledTimes(1);
    });

    test('the t readout uses the language decimal separator and is silent while playing', () => {
        const {rerender} = render(controls('paused', 0.25));
        expect(document.querySelector('output')!.textContent).toBe('t = 0,25');
        const live = () => document.querySelector('[data-readout-live]')!;
        expect(live().textContent).toBe('t = 0,25.');
        rerender(controls('playing', 0.5));
        expect(live().textContent).toBe('');
        expect(document.querySelector('output')!.getAttribute('aria-live')).toBe('off');
        rerender(controls('paused', 0.5));
        expect(live().textContent).not.toBe('');
        setLanguage('en');
        rerender(controls('paused', 0.75));
        expect(document.querySelector('output')!.textContent).toBe('t = 0.75');
        expect(screen.getAllByRole('group').length).toBeGreaterThan(0);
    });
});
