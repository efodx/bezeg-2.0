import {idealMarker, orientedUnit} from './idealMarker';

test('the unit vector points along the ray whichever sign the ideal point is stored with', () => {
    expect(orientedUnit([-40n, -20n], [-10, -5])).toEqual([-40 / Math.hypot(40, 20), -20 / Math.hypot(40, 20)]);
    const flipped = orientedUnit([40n, 20n], [-10, -5]);
    expect(flipped?.[0]).toBeLessThan(0);
    expect(flipped?.[1]).toBeLessThan(0);
});

test('the zero direction has no marker, and huge integer directions stay finite and unit length', () => {
    expect(orientedUnit([0n, 0n], [1, 0])).toBeUndefined();
    const huge = orientedUnit([10n ** 40n, -(10n ** 39n)], [1, 0]);
    expect(huge).toBeDefined();
    expect(Math.hypot(huge![0], huge![1])).toBeCloseTo(1, 12);
});

test('the marker is a short arrow at a fixed distance, never a far point', () => {
    const marker = idealMarker([0, 1], [0.6, 0.8], 6, 2);
    expect(marker.from[0]).toBeCloseTo(3.6, 12);
    expect(marker.from[1]).toBeCloseTo(5.8, 12);
    expect(marker.to[0]).toBeCloseTo(4.8, 12);
    expect(marker.to[1]).toBeCloseTo(7.4, 12);
    expect(Math.hypot(marker.to[0], marker.to[1] - 1)).toBeLessThan(10);
});
