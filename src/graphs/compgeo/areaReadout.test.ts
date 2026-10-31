import {describe, expect, it} from 'vitest';
import {PointSetModel, reverseVertices} from '../../compgeo/pointSetModel';
import {areaReadout, latticeMarkers, MAX_LATTICE_MARKERS} from './areaReadout';

const polygon = (xy: number[][], closed = true): PointSetModel =>
    ({mode: 'polygon', closed, gridStepExponent: 0, points: xy.map(([x, y]) => ({x, y}))});
const HULL = polygon([[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]]);
const NOTCHED = polygon([[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]]);
const CROSSED = polygon([[0, 0], [6, 0], [0, 6], [3, 6]]);

describe('areaReadout', () => {
    it('hull pentagon: doubled area 42, B = 8, I = 18, Pick holds', () => {
        expect(areaReadout(HULL)).toEqual({
            kind: 'simple', doubledSigned: 42n, doubledArea: 42n, orientation: 'ccw', boundary: 8, interior: 18,
            pick: {doubledValue: 42, holds: true},
        });
    });

    it('notched pentagon: doubled area 36, B = 16, I = 11', () => {
        expect(areaReadout(NOTCHED)).toMatchObject({kind: 'simple', doubledSigned: 36n, boundary: 16, interior: 11, pick: {doubledValue: 36, holds: true}});
    });

    it('reversing negates the signed area and keeps the area and the counts', () => {
        const a = areaReadout(HULL), b = areaReadout(reverseVertices(HULL));
        if (a.kind !== 'simple' || b.kind !== 'simple') throw new Error('not simple');
        expect(b.doubledSigned).toBe(-a.doubledSigned);
        expect(b.doubledArea).toBe(a.doubledArea);
        expect(b.orientation).toBe('cw');
        expect([b.boundary, b.interior]).toEqual([a.boundary, a.interior]);
    });

    it('the crossed quadrilateral has only a signed sum (18) and no Pick', () => {
        const readout = areaReadout(CROSSED);
        expect(readout).toEqual({kind: 'signed-sum', doubledSum: 18n});
        expect('pick' in readout).toBe(false);
    });

    it('open polylines, points mode and fewer than three vertices have no area', () => {
        expect(areaReadout(polygon([[0, 0], [1, 0], [0, 1]], false))).toEqual({kind: 'message', reason: 'open'});
        expect(areaReadout({...HULL, mode: 'points', closed: false})).toEqual({kind: 'message', reason: 'open'});
        expect(areaReadout(polygon([[0, 0], [1, 0]]))).toEqual({kind: 'message', reason: 'too-few-vertices'});
    });

    it('a huge simple polygon refuses the interior count but keeps the rest', () => {
        const big = polygon([[0, 0], [100000, 0], [0, 100000]]);
        expect(areaReadout(big)).toMatchObject({kind: 'simple', interior: undefined, boundary: 300000});
    });
});

describe('latticeMarkers', () => {
    it('lists exactly B boundary and I interior points on lattice nodes', () => {
        for (const [model, b, i] of [[HULL, 8, 18], [NOTCHED, 16, 11]] as const) {
            const markers = latticeMarkers(model);
            if (markers.kind !== 'points') throw new Error('no markers');
            expect([markers.boundary.length, markers.interior.length]).toEqual([b, i]);
            for (const point of [...markers.boundary, ...markers.interior]) {
                expect(Number.isInteger(point.x) && Number.isInteger(point.y)).toBe(true);
            }
            expect(new Set([...markers.boundary, ...markers.interior].map(point => `${point.x},${point.y}`)).size).toBe(b + i);
        }
    });

    it('draws nothing for non-simple, open or tiny models, and gives up above the marker cap', () => {
        expect(latticeMarkers(CROSSED)).toEqual({kind: 'none'});
        expect(latticeMarkers(polygon([[0, 0], [3, 0], [0, 3]], false))).toEqual({kind: 'none'});
        expect(latticeMarkers(polygon([[0, 0], [100, 0], [0, 100]]))).toEqual({kind: 'too-many'});
        expect(MAX_LATTICE_MARKERS).toBeGreaterThan(100);
    });
});
