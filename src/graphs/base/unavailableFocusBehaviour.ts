/**
 * Test-only (never imported by app code): the shared end state of a focused control that has become unavailable.
 * Generic half: inputs/UnavailableButton.test.tsx. Not a test of its own: a graph calls it inside its host test after it
 * has focused the control and driven the scene to the condition that makes it unavailable (the end of the trace, the
 * threshold, the last term; that condition and the model value are the graph's).
 *
 *   the control is aria-disabled and never natively disabled, and still has keyboard focus;
 *   a click changes nothing in `value()` (the graph's model position, as one comparable value).
 */
import {act, fireEvent} from '@testing-library/react';
import {expect} from 'vitest';

export function expectUnavailableKeepsFocus(control: () => HTMLElement, value: () => unknown): void {
    expect(control().getAttribute('aria-disabled')).toBe('true');
    expect(control().hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(control());
    const before = value();
    act(() => { fireEvent.click(control()); });
    expect(value()).toEqual(before);
}
