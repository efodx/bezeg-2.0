/**
 * Test-only (never imported by app code): the shared behaviour of the board arrow keys on a selected point, modelled on
 * `inputs/sharedControlBehaviour.tsx`. One call registers one test against a caller-supplied `mount`:
 *
 *   no selection  an arrow key leaves the whole model as it was (`snapshot`);
 *   selected      Right, Up, Left and Down each move the selected point by exactly one grid step (`step`), in that order,
 *                 so the point ends where it began;
 *   modified      each listed modifier press (Shift, Ctrl) moves the point by the stated delta, zero for a no-op.
 *
 * `extra` runs in the same test and mount after the shared part, with the point still selected and at the position the
 * shared part (and any modified presses) left it; graph-specific wiring assertions (what else redraws, what is announced,
 * which point takes the keys) go there.
 *
 * Positions are model values, not pixels. A graph-specific assertion (what else redraws, what is announced, which point
 */
import {act, fireEvent} from '@testing-library/react';
import {expect, test} from 'vitest';

/** The mounted graph, as the helper needs it. */
export interface SelectedPointKeyHandle {
    /** The element that receives the key events (the board container). */
    board(): HTMLElement;
    /** Selects the point under test; the helper wraps it in `act`. */
    select(): void;
    /** The selected point's position `[x, y]`; a one-dimensional point reports a constant 0 for y. */
    position(): readonly [number, number];
    /** Everything a key press could change, compared with `toEqual` before and after the no-selection presses. */
    snapshot(): unknown;
    /** Called after the test. */
    unmount?(): void;
}

export type ArrowKey = 'ArrowRight' | 'ArrowUp' | 'ArrowLeft' | 'ArrowDown';

export interface SelectedPointKeySpec<H extends SelectedPointKeyHandle = SelectedPointKeyHandle> {
    /** One grid step along x and y in model units; a zero axis is asserted to stay put. */
    step: readonly [number, number];
    /** The arrow keys the point answers to; default all four (a point on a line takes only Right and Left). */
    keys?: readonly ArrowKey[];
    /** Modifier presses with the expected delta from the position before the press. */
    modified?: ReadonlyArray<{key: ArrowKey; modifier: 'shiftKey' | 'ctrlKey'; delta: readonly [number, number]}>;
    /** Graph-specific assertions run after the shared part; `press` fires a key (in `act`) on the board. */
    extra?: (handle: H, press: (key: ArrowKey, modifier?: 'shiftKey' | 'ctrlKey') => void) => void;
}

const unit: Record<ArrowKey, readonly [number, number]> = {
    ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowLeft: [-1, 0], ArrowDown: [0, -1],
};
const ALL: readonly ArrowKey[] = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];

/** Registers the shared arrow-key test for one selected point of one graph; `name` identifies the graph and the point. */
export function selectedPointKeyBehaviour<H extends SelectedPointKeyHandle>(name: string, mount: () => H, spec: SelectedPointKeySpec<H>): void {
    test(`${name}: arrow keys move the selected point one grid step; with no selection they do nothing`, () => {
        const handle = mount();
        try {
            const press = (key: ArrowKey, modifier?: 'shiftKey' | 'ctrlKey') => act(() => {
                fireEvent.keyDown(handle.board(), modifier ? {key, [modifier]: true} : {key});
            });
            const before = JSON.parse(JSON.stringify(handle.snapshot()));
            for (const key of ALL) press(key);
            expect(handle.snapshot()).toEqual(before);
            act(() => handle.select());
            const start = handle.position();
            let expected = start;
            for (const key of spec.keys ?? ALL) {
                expected = [expected[0] + unit[key][0] * spec.step[0], expected[1] + unit[key][1] * spec.step[1]];
                press(key);
                expect([key, handle.position()]).toEqual([key, expected]);
            }
            for (const {key, modifier, delta} of spec.modified ?? []) {
                const from = handle.position();
                press(key, modifier);
                expect([key, modifier, handle.position()]).toEqual([key, modifier, [from[0] + delta[0], from[1] + delta[1]]]);
            }
            spec.extra?.(handle, press);
        } finally { handle.unmount?.(); }
    });
}
