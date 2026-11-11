/**
 * Test-only (never imported by app code): the Reset-example availability cycle every graph with a shared Reset repeats.
 * Not a test of its own: a graph calls it inside its existing Reset test, in the same mount.
 *
 *   at the example   Reset is aria-disabled (generic half: inputs/ResetExampleButton.test.tsx);
 *   after `edit`     Reset is available (the "differs from the example" predicate is the graph's, so `edit` is its trigger);
 *   after the click  the scene is back at the example and Reset is aria-disabled again.
 *
 * `afterEdit` and `afterReset` hold the graph's own assertions made at those moments.
 */
import {act, fireEvent} from '@testing-library/react';
import {expect} from 'vitest';

export interface ResetCycleSpec {
    /** The Reset button, looked up afresh each time. */
    reset: () => HTMLElement;
    /** The graph's edit that makes the scene differ from the example. */
    edit: () => void;
    afterEdit?: () => void;
    afterReset?: () => void;
}

export function expectResetCycle({reset, edit, afterEdit, afterReset}: ResetCycleSpec): void {
    expect(reset().getAttribute('aria-disabled')).toBe('true');
    act(edit);
    expect(reset().getAttribute('aria-disabled')).toBe('false');
    afterEdit?.();
    act(() => { fireEvent.click(reset()); });
    afterReset?.();
    expect(reset().getAttribute('aria-disabled')).toBe('true');
}
