import {assertFiniteScene} from '../patches/surface-view/surfaceScene';
import {isClosed, cube} from '../../solids/solid';
import {REVOLVE_K, kgonFactor} from '../../solids/revolve';
import {DEFAULT_SOLIDS_STATE, MODES, MODE_SOLIDS, type SolidsState} from '../../solids/solidsModel';
import {buildSolidsScene, drawable, drawSolids, shearSolid, type SolidsReadouts} from './solidsScene';
import {gridSolid, REVOLVE_PROFILES, washerSolid} from './solidsCatalog';
import {vertexCount} from '../../solids/solid';
const gridVertexCount = (id: Parameters<typeof gridSolid>[0]): number => vertexCount(gridSolid(id)!);
import {meshVolume, sliceAreaAt} from '../../solids/volume';

const state = (patch: Partial<SolidsState>): SolidsState => ({...DEFAULT_SOLIDS_STATE, ...patch});
const readouts = <M extends SolidsReadouts['mode']>(mode: M, patch: Partial<SolidsState>) => {
    const r = drawSolids(state({mode, ...patch})).readouts;
    if (r.mode !== mode) throw new Error('wrong mode');
    return r as Extract<SolidsReadouts, {mode: M}>;
};

describe('section readouts (SV1, SV2)', () => {
    it('cuts the cube in the spec polygons with their sides and areas', () => {
        const half = readouts('section', {});
        expect([half.kind, half.sides, half.area, half.coplanarFace]).toEqual(['polygon', 4, 1, false]);
        expect(half.keptVolume).toBeCloseTo(0.5, 12);
        const at = (D: number) => readouts('section', {normal: [1, 1, 1], offset: D});
        expect(at(2).sides).toBe(3);
        expect(at(2).area).toBeCloseTo(0.21651, 5);
        expect(at(4).sides).toBe(3);
        expect(at(4).area).toBeCloseTo(Math.sqrt(3) / 2, 12);
        expect(at(5).sides).toBe(6);
        expect(at(5).area).toBeCloseTo(1.19078, 5);
        expect(at(6).sides).toBe(6);
        expect(at(6).area).toBeCloseTo(1.29904, 5);
        expect(at(12)).toMatchObject({kind: 'point', sides: 1, area: undefined});
        expect(at(13)).toMatchObject({kind: 'empty', sides: 0, keptVolume: 1});
        expect(at(-1)).toMatchObject({kind: 'empty', keptVolume: 0});
    });

    it('reports a plane through a face, a pentagon and the corner kinds', () => {
        expect(readouts('section', {normal: [0, 0, 1], offset: 0}).coplanarFace).toBe(true);
        const pentagon = readouts('section', {normal: [2, 3, 4], offset: 16});
        expect(pentagon.sides).toBe(5);
        expect(pentagon.area).toBeCloseTo(1.2341, 4);
        expect(pentagon.corners.filter(c => c.kind === 'vertex')).toHaveLength(1);
        expect(pentagon.corners.filter(c => c.kind === 'edge')).toHaveLength(4);
    });

    it('reproduces the pyramid numbers 9, 4 and 8, and its volume 64/3', () => {
        const pyramid = (normal: [number, number, number], offset: number) => readouts('section', {solid: 'square-pyramid', normal, offset});
        expect(pyramid([0, 0, 1], -4)).toMatchObject({sides: 4});
        expect(pyramid([0, 0, 1], -4).area).toBeCloseTo(9, 12);
        expect(pyramid([0, 0, 1], 0).area).toBeCloseTo(4, 12);
        expect(pyramid([0, 1, 0], 0)).toMatchObject({sides: 3});
        expect(pyramid([0, 1, 0], 0).area).toBeCloseTo(8, 12);
        expect(pyramid([0, 0, 1], -8).solidVolume).toBeCloseTo(64 / 3, 12);
        expect(readouts('volume', {solid: 'square-pyramid'})).toMatchObject({exact: 64 / 3});
        expect(readouts('volume', {solid: 'square-pyramid'}).meshVolume).toBeCloseTo(21.3333, 4);
    });

    it('draws the axial triangle of the pyramid, and the chord of a horizontal cut, only for the pyramid (SV2)', () => {
        const lines = (solid: SolidsState['solid'], normal: [number, number, number], offset: number) =>
            drawSolids(state({solid, normal, offset})).scene.polylines;
        const triangle = lines('square-pyramid', [0, 0, 1], -4).find(p => p.id === 'axial')!;
        expect(triangle.points).toEqual([[-2, 0, -2], [2, 0, -2], [0, 0, 2], [-2, 0, -2]]);
        // z = -1 (height 1 above the base): the chord has half-width 3/2 (the section side is 3), and the cut square has area 9.
        const chord = lines('square-pyramid', [0, 0, 1], -4).find(p => p.id === 'axial-chord')!;
        expect(chord.points).toEqual([[-1.5, 0, -1], [1.5, 0, -1]]);
        expect(lines('square-pyramid', [0, 0, -2], 0).find(p => p.id === 'axial-chord')!.points).toEqual([[-1, 0, 0], [1, 0, 0]]);
        // A tilted plane and the planes at the base and the apex have no chord; the triangle stays.
        for (const [n, D] of [[[1, 0, 1], 0], [[0, 0, 1], -8], [[0, 0, 1], 8], [[0, 0, 1], 12]] as Array<[[number, number, number], number]>) {
            expect(lines('square-pyramid', n, D).some(p => p.id === 'axial')).toBe(true);
            expect(lines('square-pyramid', n, D).some(p => p.id === 'axial-chord')).toBe(false);
        }
        expect(lines('cube', [0, 0, 1], 2).some(p => p.id.startsWith('axial'))).toBe(false);
        assertFiniteScene(buildSolidsScene({...state({solid: 'square-pyramid', offset: -4}), camera: DEFAULT_SOLIDS_STATE.camera}, 1));
    });

    it('never reports a heptagon in the cube, nor more than five sides in the pyramid', () => {
        let cubeMax = 0;
        let pyramidMax = 0;
        for (const n of [[1, 1, 1], [2, 3, 4], [1, 2, 2], [4, -3, 1], [-4, 3, 2], [3, 3, 4]] as Array<[number, number, number]>) {
            for (let D = -48; D <= 48; D++) {
                cubeMax = Math.max(cubeMax, readouts('section', {normal: n, offset: D}).sides);
                pyramidMax = Math.max(pyramidMax, readouts('section', {solid: 'square-pyramid', normal: n, offset: D}).sides);
            }
        }
        expect(cubeMax).toBe(6);
        expect(pyramidMax).toBeLessThanOrEqual(5);
    });
});

describe('stack (SV3)', () => {
    it('keeps volume and slice area under a shear, and draws the slab outlines sheared', () => {
        const r = readouts('stack', {solid: 'square-prism', shear: 6, discs: 12});
        expect(r.meshVolume).toBeCloseTo(12, 12);
        expect(r.otherVolume).toBeCloseTo(r.meshVolume, 12);
        expect(r.sliceArea).toBeCloseTo(4, 12);
        expect(r.otherSliceArea).toBeCloseTo(4, 12);
        const drawing = drawSolids(state({mode: 'stack', solid: 'square-prism', shear: 6, discs: 12}));
        const slabs = drawing.scene.polylines.filter(p => p.id.startsWith('slab-'));
        expect(slabs).toHaveLength(13);
        expect(slabs[0].points[0][0]).toBeCloseTo(-1, 12);
        expect(slabs[12].points[0][0]).toBeCloseTo(-1 + 1.5, 12);
    });

    it('names the sheared pair and gives both exact volumes as 12', () => {
        const r = readouts('stack', {solid: 'square-prism', shear: 6});
        expect(r.pair).toBe('sheared');
        expect(r.exact).toBe(12);
        expect(r.otherExact).toBe(12);
        expect(Math.abs(r.meshVolume - r.otherVolume)).toBeLessThan(1e-12);
    });

    it('has equal slice areas of the straight and the sheared prism at 100 heights (SV3 acceptance 2)', () => {
        const straight = gridSolid('square-prism')!;
        const sheared = shearSolid(straight, 1.5);
        expect(Math.abs(meshVolume(straight) - meshVolume(sheared))).toBeLessThan(1e-12);
        for (let i = 1; i <= 100; i++) {
            const z = -1.5 + 3 * i / 101;
            expect(Math.abs(sliceAreaAt(straight, z) - sliceAreaAt(sheared, z))).toBeLessThan(1e-12);
            expect(sliceAreaAt(sheared, z)).toBeCloseTo(4, 12);
        }
    });

    it('puts the cursor strictly inside the solid and reports the slice areas there, for every cursor value', () => {
        for (let cursor = 1; cursor <= 39; cursor++) {
            const r = readouts('stack', {solid: 'square-prism', shear: 6, cursor});
            expect(r.sliceHeight).toBeCloseTo(-1.5 + 3 * cursor / 40, 12);
            expect(r.sliceArea).toBeCloseTo(4, 12);
            expect(r.otherSliceArea).toBeCloseTo(4, 12);
        }
        expect(readouts('stack', {solid: 'cube', cursor: 10}).sliceHeight).toBeCloseTo(0.25, 12);
    });

    it('draws the failing pair: a cone and a cylinder of equal height with different slice areas and volumes', () => {
        const drawing = drawSolids(state({mode: 'stack', solid: 'cone', shear: 12, cursor: 20}));
        const r = drawing.readouts;
        if (r.mode !== 'stack') throw new Error('wrong mode');
        expect(r.pair).toBe('failing');
        expect(drawing.solids).toHaveLength(2);
        expect(drawing.solids.every(isClosed)).toBe(true);
        // At the middle height the cone's radius is 1,5 and the cylinder's 3: the areas are in the ratio 1 : 4.
        const k = kgonFactor(REVOLVE_K);
        expect(r.sliceHeight).toBeCloseTo(2, 12);
        expect(r.sliceArea).toBeCloseTo(Math.PI * 2.25 * k, 10);
        expect(r.otherSliceArea).toBeCloseTo(Math.PI * 9 * k, 10);
        expect(r.otherSliceArea / r.sliceArea).toBeCloseTo(4, 10);
        expect(r.meshVolume).toBeCloseTo(12 * Math.PI * k, 10);
        expect(r.otherVolume).toBeCloseTo(36 * Math.PI * k, 10);
        expect(r.exact).toBeCloseTo(12 * Math.PI, 12);
        expect(r.otherExact).toBeCloseTo(36 * Math.PI, 12);
    });

    it('ignores the shear for the failing pair and keeps the two solids apart', () => {
        const a = drawSolids(state({mode: 'stack', solid: 'cone', shear: 12}));
        const b = drawSolids(state({mode: 'stack', solid: 'cone', shear: 0}));
        expect(a.scene.mesh?.positions).toEqual(b.scene.mesh?.positions);
        const [cone, cylinder] = a.solids;
        expect(Math.max(...Array.from(cone.vertices).filter((_, i) => i % 3 === 0))).toBeLessThan(Math.min(...Array.from(cylinder.vertices).filter((_, i) => i % 3 === 0)));
    });

    it('moves the top of the solid by exactly the shear', () => {
        const top = shearSolid(cube(), 1.5);
        expect(Array.from(top.vertices).slice(-3)).toEqual([1 + 1.5, 1, 1]);
        expect(meshVolume(top)).toBeCloseTo(1, 12);
    });
});

describe('volume and revolve (SV4, SV5)', () => {
    it('puts the k-gon mesh volume next to the exact value', () => {
        const sqrt = readouts('revolve', {solid: 'sqrt', discs: 4});
        expect(sqrt.exact).toBeCloseTo(25.1327, 4);
        expect(sqrt.meshVolume).toBeCloseTo(24.8629, 4);
        expect(sqrt.discSum).toBeCloseTo(8 * Math.PI, 12);
        const cone = readouts('volume', {solid: 'cone'});
        expect(cone.exact).toBeCloseTo(37.699, 3);
        expect(cone.meshVolume).toBeCloseTo(12 * Math.PI * kgonFactor(REVOLVE_K), 10);
    });

    it('reproduces the disc sums of the spec', () => {
        expect(readouts('revolve', {solid: 'parabola', discs: 5}).discSum).toBeCloseTo(0.60752, 5);
        expect(readouts('revolve', {solid: 'parabola'}).exact).toBeCloseTo(0.62832, 5);
        expect(readouts('revolve', {solid: 'sphere', discs: 6}).discSum).toBeCloseTo(114.668, 3);
        expect(readouts('revolve', {solid: 'sphere', discs: 60}).discSum).toBeCloseTo(113.113, 3);
        expect(readouts('revolve', {solid: 'sphere'}).exact).toBeCloseTo(113.097, 3);
        expect(readouts('revolve', {solid: 'cone', discs: 4}).exact).toBeCloseTo(37.699, 3);
    });

    it('turns x squared about the y-axis: pi/2 against pi/5 about x', () => {
        const x = readouts('revolve', {solid: 'parabola', axis: 'x', discs: 10});
        const y = readouts('revolve', {solid: 'parabola', axis: 'y', discs: 10});
        expect(x.exact).toBeCloseTo(Math.PI / 5, 12);
        expect(y.exact).toBeCloseTo(Math.PI / 2, 12);
        expect(y.axis).toBe('y');
        expect(y.discSum).toBeCloseTo(Math.PI / 2, 10);
        expect(y.meshVolume).toBeGreaterThan(1.4);
        expect(Math.abs(y.meshVolume / (Math.PI / 2) - 1)).toBeLessThan(0.02);
    });

    it('builds the y-axis solid from two revolve meshes, welded, closed, with the volume of cylinder minus bowl', () => {
        for (const id of ['cone', 'sqrt', 'parabola'] as const) {
            const profile = REVOLVE_PROFILES[id];
            const solid = washerSolid(profile);
            expect(isClosed(solid)).toBe(true);
            const washer = profile.aboutY!;
            expect(Math.abs(meshVolume(solid) / washer.exact - 1)).toBeLessThan(0.05);
        }
    });
});

describe('every drawn mesh is closed and every scene finite', () => {
    it('holds for every mode, solid, axis and a spread of settings', () => {
        for (const mode of MODES) {
            for (const solid of MODE_SOLIDS[mode]) {
                for (const axis of ['x', 'y'] as const) {
                    if (axis === 'y' && solid === 'sphere') continue;
                    for (const normal of [[0, 0, 1], [1, 1, 1], [-4, 3, 2]] as Array<[number, number, number]>) {
                        for (const [offset, shear, discs] of [[2, 0, 1], [-144, -12, 60], [144, 12, 17], [0, 5, 3]]) {
                            const s = state({mode, solid, axis, normal, offset, shear, discs});
                            const drawing = drawSolids(s);
                            expect(drawing.solids.every(isClosed)).toBe(true);
                            assertFiniteScene(buildSolidsScene(s, 1));
                            const mesh = buildSolidsScene(s, 1).mesh;
                            if (mesh) expect(mesh.faces.length).toBe(drawing.solids.reduce((n, m) => n + m.faces.reduce((t, f) => t + f.length - 2, 0) * 3, 0));
                        }
                    }
                }
            }
        }
    });

    it('does not draw an open mesh', () => {
        const open = cube();
        expect(drawable(open)).toBe(open);
        expect(drawable({vertices: open.vertices, faces: open.faces.slice(1)})).toBeUndefined();
        expect(drawable({vertices: open.vertices, faces: []})).toBeUndefined();
    });
});

describe('section labels and the y-axis washer', () => {
    it('numbers the vertices of the cut solid from 1, one label for each vertex, anchored on it', () => {
        for (const solid of ['cube', 'triangular-prism', 'square-pyramid'] as const) {
            const labels = drawSolids(state({mode: 'section', solid})).scene.labels;
            expect(labels.length, solid).toBe(gridVertexCount(solid));
            expect(labels.map(l => l.text), solid).toEqual(labels.map((_, i) => String(i + 1)));
            expect(new Set(labels.map(l => l.id)).size, solid).toBe(labels.length);
            labels.forEach(l => l.anchor.forEach(c => expect(Number.isFinite(c)).toBe(true)));
        }
        expect(drawSolids(state({mode: 'volume', solid: 'sphere'})).scene.labels).toEqual([]);
    });

    it('turns the bowl faces around: the washer volume is the cylinder minus the bowl, positive and near the exact one', () => {
        for (const id of ['cone', 'sqrt', 'parabola'] as const) {
            const profile = REVOLVE_PROFILES[id];
            const volume = meshVolume(washerSolid(profile));
            expect(volume, id).toBeGreaterThan(0);
            expect(Math.abs(volume / profile.aboutY!.exact - 1), id).toBeLessThan(0.02);
        }
    });
});
