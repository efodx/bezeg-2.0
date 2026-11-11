import {act, render} from '@testing-library/react';
import React from 'react';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {prefersReducedMotion, ReducedMotion, subscribeReducedMotion} from './reducedMotion';

function stubMedia(initial: boolean) {
    const listeners = new Set<() => void>();
    const state = {matches: initial};
    vi.stubGlobal('matchMedia', vi.fn(() => ({
        get matches() { return state.matches; },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })));
    return {listeners, set: (value: boolean) => { state.matches = value; listeners.forEach(listener => listener()); }};
}

afterEach(() => vi.unstubAllGlobals());

describe('reduced motion', () => {
    test('without matchMedia it is off and subscribing is harmless', () => {
        vi.stubGlobal('matchMedia', undefined);
        expect(prefersReducedMotion()).toBe(false);
        expect(() => subscribeReducedMotion(() => {})()).not.toThrow();
    });

    test('a function child follows a system change and leaves no listener after unmount', () => {
        const media = stubMedia(false);
        const view = render(<ReducedMotion>{() => <p data-reduced={String(prefersReducedMotion())}/>}</ReducedMotion>);
        const flag = () => view.container.querySelector('p')!.getAttribute('data-reduced');
        expect(flag()).toBe('false');
        expect(media.listeners.size).toBe(1);
        act(() => media.set(true));
        expect(flag()).toBe('true');
        view.unmount();
        expect(media.listeners.size).toBe(0);
    });
});
