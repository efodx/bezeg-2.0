/**
 * Test-only (never imported by app code): the status region and inspector-selection behaviour the three projective graphs
 * with a selectable handle (cross ratio, Pascal, pole and polar) share. One call registers one test on one mount:
 *
 *   status region  not a role="status" itself, no per-readout live element, exactly one `data-readout-live` on the page;
 *                  the lines in `inStatus` are inside `[data-projective-status]`, those in `absent` are not;
 *   inspector      (first, while nothing is selected) pressing the "Izberi" button of `selectLabel` moves keyboard focus to the board container;
 *   arrow step     the separate `[data-projective-live]` nudge region does not yet hold `notYet`, and after each step
 *                  (select, press the key, wait out the readout settle time) it matches the step's `text`;
 *
 * Which lines are status, which handle moves and what is announced are the graph's; they are the spec.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {expect, test, vi} from 'vitest';
import {READOUT_SETTLE_MS} from '../base/controls/LiveReadout';

export interface ProjectiveInspectorSpec<G> {
    /** The board container that receives the keys. */
    container: (graph: G) => HTMLElement;
    /** `data-projective-line` names inside the status region, and names that must not be there. */
    inStatus: readonly string[];
    absent: readonly string[];
    /** A pattern the nudge region must not hold before any step. */
    notYet: RegExp;
    /** Each step selects a handle, presses one arrow key and expects the nudge text to match. */
    steps: ReadonlyArray<{select: (graph: G) => void; key: string; text: RegExp}>;
    /** Accessible name of the inspector's select button, and graph-specific assertions after pressing it. */
    selectLabel: string;
    afterSelect?: (graph: G) => void;
}

export function projectiveInspectorBehaviour<G>(name: string, mount: () => G, spec: ProjectiveInspectorSpec<G>): void {
    test(`${name}: the live region holds the status only, an arrow step announces just the position, and selecting from the inspector focuses the board`, () => {
        const graph = mount();
        const live = document.querySelector('[data-projective-status]')!;
        expect(live.getAttribute('role')).toBeNull();
        expect(live.closest('[role="status"]')).toBeNull();
        expect(document.querySelectorAll('[data-readout-live]')).toHaveLength(1);
        expect(live.querySelector('[data-readout-live]')).toBeNull();
        for (const line of spec.inStatus) expect(live.querySelector(`[data-projective-line="${line}"]`), line).not.toBeNull();
        for (const line of spec.absent) expect(live.querySelector(`[data-projective-line="${line}"]`), line).toBeNull();
        const button = screen.getByRole('button', {name: spec.selectLabel});
        button.focus();
        act(() => { fireEvent.click(button); });
        expect(document.activeElement).toBe(spec.container(graph));
        spec.afterSelect?.(graph);
        const nudge = () => document.querySelector('[data-projective-live]')!.textContent ?? '';
        expect(nudge()).not.toMatch(spec.notYet);
        vi.useFakeTimers();
        try {
            for (const step of spec.steps) {
                act(() => { step.select(graph); });
                act(() => { fireEvent.keyDown(spec.container(graph), {key: step.key}); });
                act(() => { vi.advanceTimersByTime(READOUT_SETTLE_MS + 50); });
                expect(nudge()).toMatch(step.text);
            }
        } finally { vi.useRealTimers(); }
    });
}
