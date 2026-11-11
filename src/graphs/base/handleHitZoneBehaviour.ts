/**
 * Test-only (never imported by app code): the shared hit-zone contract of draggable handles, modelled on
 * `selectedPointKeyBehaviour.tsx`. Called inside a graph's existing test, not registering one. For every handle:
 *
 *   touch  a pointer 25 px to the right or above still hits, one 40 px away does not;
 *   mouse  a pointer 25 px away misses (the mouse zone is narrower).
 *
 * `touchZoneRadius` is the graph's touch tolerance including the slack JSXGraph adds (`HANDLE_TOUCH_RADIUS + HIT_SLACK`);
 * the zone is asserted to be at least 44 px across. Which handles, and any special sizes, stay with the caller.
 */
import {expect} from 'vitest';

export interface HitZoneHandle {
    coords: {scrCoords: readonly (number | null)[]};
    hasPoint(x: number, y: number): boolean;
}

export function expectHandleHitZones(board: unknown, handles: Iterable<HitZoneHandle>, touchZoneRadius: number): void {
    const device = board as {_inputDevice: string};
    expect(2 * touchZoneRadius).toBeGreaterThanOrEqual(44);
    let count = 0;
    for (const handle of handles) {
        count++;
        const x = Number(handle.coords.scrCoords[1]), y = Number(handle.coords.scrCoords[2]);
        device._inputDevice = 'touch';
        expect(handle.hasPoint(x + 25, y)).toBe(true);
        expect(handle.hasPoint(x, y - 25)).toBe(true);
        expect(handle.hasPoint(x + 40, y)).toBe(false);
        device._inputDevice = 'mouse';
        expect(handle.hasPoint(x + 25, y)).toBe(false);
    }
    expect(count).toBeGreaterThan(0);
}
