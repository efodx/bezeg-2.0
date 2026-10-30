import {describe, expect, it} from 'vitest';
import {computeLabelLayout, isAnchorOccluded, labelLayoutKey} from './jsxLabels';
import {cameraPosition} from './surfaceMath';
import {ORACLE_PROBES, ORACLE_VIEWPORTS, pinholeProject, randomOracleCameras} from './pinholeOracle.test-helper';
import type {SceneLabel, SceneMesh, SurfaceCamera, Xyz} from './surfaceScene';

const camera = (over: Partial<SurfaceCamera> = {}): SurfaceCamera =>
    ({az: 0, el: 0.6, distance: 12, projection: 'perspective', target: [0, 0, 0], ...over});
const VIEWPORT = {width: 800, height: 600};
/** One big facet at z = 0, seen from above; the label sits on the "true" surface just behind it. */
const facet = (extra: Partial<SceneMesh> = {}): SceneMesh =>
    ({positions: [-20, -20, 0, 20, -20, 0, 0, 20, 0], faces: [0, 1, 2], visible: true, ...extra});
const layoutOf = (labels: SceneLabel[], mesh: SceneMesh | undefined, cam = camera()) =>
    computeLabelLayout({labels, mesh, camera: cam}, VIEWPORT);
const surfaceLabel = (z: number): SceneLabel => ({id: 'surface', text: 'S', anchor: [0, 0, z]});

describe('label positions', () => {
    it('every anchor is the projection of its scene coordinate (independent pinhole oracle, several cameras and viewports)', () => {
        let checked = 0;
        for (const {camera: cam, viewport} of randomOracleCameras(2 * ORACLE_VIEWPORTS.length, 4321)) {
            {
                const labels = ORACLE_PROBES.map((anchor, i) => ({id: `l${i}`, text: `T_${i}`, anchor: anchor as Xyz}));
                const layout = computeLabelLayout({labels, mesh: undefined, camera: cam}, viewport);
                expect(layout).toHaveLength(ORACLE_PROBES.length);
                layout.forEach((entry, i) => {
                    const expected = pinholeProject(cam, viewport, ORACLE_PROBES[i]);
                    expect(entry.id).toBe(`l${i}`);
                    expect(entry.text).toBe(`T_${i}`);
                    expect(entry.x).toBeCloseTo(expected.x, 6);
                    expect(entry.y).toBeCloseTo(expected.y, 6);
                    checked++;
                });
            }
        }
        expect(checked).toBeGreaterThan(50);
    });

    it('returns nothing for a scene without labels and one entry per label otherwise', () => {
        expect(layoutOf([], facet())).toEqual([]);
        expect(layoutOf([surfaceLabel(1), {id: 'b', text: 'B', anchor: [1, 1, 1]}], facet())).toHaveLength(2);
    });
});

describe('label occlusion', () => {
    it('hides a label behind a facet, shows one above it', () => {
        expect(layoutOf([surfaceLabel(-1)], facet())[0].visible).toBe(false);
        expect(layoutOf([surfaceLabel(1)], facet())[0].visible).toBe(true);
    });

    it('a surface label tolerates the chord tolerance and no more; a control point label is strict', () => {
        expect(layoutOf([surfaceLabel(-0.05)], facet())[0].visible).toBe(false);
        expect(layoutOf([surfaceLabel(-0.05)], facet({chordTolerance: 0.1}))[0].visible).toBe(true);
        expect(layoutOf([surfaceLabel(-0.5)], facet({chordTolerance: 0.1}))[0].visible).toBe(false);
        const pointLabel: SceneLabel = {id: 'p', text: 'P', anchor: [0, 0, -0.05], pointId: 'p00'};
        expect(layoutOf([pointLabel], facet({chordTolerance: 0.1}))[0].visible).toBe(false);
    });

    it('sees the back of a triangle too (camera below the surface)', () => {
        const below = camera({el: -0.6});
        expect(layoutOf([surfaceLabel(1)], facet(), below)[0].visible).toBe(false);
        expect(layoutOf([surfaceLabel(-1)], facet(), below)[0].visible).toBe(true);
    });

    it('does not lose a ray that passes through the shared edge of two triangles', () => {
        // A quad split along its diagonal y = x; the anchor lies on the line from the eye through a point of that diagonal.
        const quad = {positions: [-2, -2, 0, 2, -2, 0, 2, 2, 0, -2, 2, 0], faces: [0, 1, 2, 0, 2, 3], visible: true};
        const eye = cameraPosition(0, 1.2, 10, [0, 0, 0]);
        for (const s of [-1, 0, 0.7]) {
            const anchor = eye.map((e, i) => e + ([s, s, 0][i] - e) * 1.4) as Xyz;
            expect(isAnchorOccluded(quad, eye, anchor)).toBe(true);
        }
    });

    it('ignores a hidden or missing mesh', () => {
        expect(layoutOf([surfaceLabel(-1)], facet({visible: false}))[0].visible).toBe(true);
        expect(layoutOf([surfaceLabel(-1)], undefined)[0].visible).toBe(true);
    });

    it('hides a label outside the viewport or behind the eye', () => {
        const layout = layoutOf([
            {id: 'in', text: 'I', anchor: [0, 0, 1]},
            {id: 'far', text: 'F', anchor: [500, 0, 0]},
            {id: 'behind', text: 'B', anchor: cameraPosition(0, 0.6, 14, [0, 0, 0])},
        ], undefined);
        expect(Object.fromEntries(layout.map(l => [l.id, l.visible]))).toEqual({in: true, far: false, behind: false});
    });
});

describe('label layout key', () => {
    const base = [{id: 'a', text: 'A', x: 10.01, y: 20, visible: true}];
    it('is equal below a tenth of a pixel and differs for text, position and visibility', () => {
        expect(labelLayoutKey(base)).toBe(labelLayoutKey([{...base[0], x: 10.02}]));
        expect(labelLayoutKey(base)).not.toBe(labelLayoutKey([{...base[0], x: 10.2}]));
        expect(labelLayoutKey(base)).not.toBe(labelLayoutKey([{...base[0], visible: false}]));
        expect(labelLayoutKey(base)).not.toBe(labelLayoutKey([{...base[0], text: 'B'}]));
    });
});

