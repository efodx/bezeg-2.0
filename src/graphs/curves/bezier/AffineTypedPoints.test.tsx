/** The affine route's typed point fields follow every transformation button (they kept the old coordinates before). */
import {act, fireEvent, screen} from '@testing-library/react';
import {t} from '../../../localization';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../base/realGraphTestHarness';
import {createGraph} from '../../base/createTestGraph';
import {curveAccess} from '../../base/curveGraphTestAccess';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

const value = (name: string) => {
    const raw = (screen.getByRole('spinbutton', {name}) as HTMLInputElement).value;
    const parsed = Number(raw.replace(',', '.').replace('−', '-'));
    if (Number.isNaN(parsed)) throw new Error(`unreadable field ${name}: ${JSON.stringify(raw)}`);
    return parsed;
};
const press = (name: RegExp) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });

test.each([
    ['rotate', t('rotate_left')],
    ['move', t('right')],
    ['scale', t('scale_up')],
    ['reflect', t('reflect_across_x')],
])('after %s the typed coordinates show the moved control points', async (_, label) => {
    const graph = createGraph('affine');
    mountGraph(graph);
    await waitUntil(() => graph.state.initialized === true);
    await waitUntil(() => screen.queryByRole('spinbutton', {name: 'p₀, x'}) !== null);
    const points = curveAccess(graph).points;
    const before = points().map(p => [p.X(), p.Y()]);
    press(new RegExp(`^${label}:`));
    const after = points().map(p => [p.X(), p.Y()]);
    expect(after.some((p, i) => Math.hypot(p[0] - before[i][0], p[1] - before[i][1]) > 0.1)).toBe(true);
    after.forEach(([x, y], i) => {
        expect(value(`p${String.fromCharCode(0x2080 + i)}, x`)).toBeCloseTo(x, 1);
        expect(value(`p${String.fromCharCode(0x2080 + i)}, y`)).toBeCloseTo(y, 1);
    });
});
