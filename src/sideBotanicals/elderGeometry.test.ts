import {buildSide, ELDER_SETTINGS, ElderHead} from './elderGeometry';

const W = 520, H = 1440;
const motionOf = (h: ElderHead) => [h.baseX, h.baseY, h.duration, h.delay];

test('same settings and seed give identical branches', () => {
    expect(buildSide(ELDER_SETTINGS, 'left', W, H)).toEqual(buildSide(ELDER_SETTINGS, 'left', W, H));
});

test('a different seed or side gives different path data', () => {
    const base = buildSide(ELDER_SETTINGS, 'left', W, H);
    expect(buildSide({...ELDER_SETTINGS, seed: 8}, 'left', W, H)).not.toEqual(base);
    expect(buildSide(ELDER_SETTINGS, 'right', W, H)).not.toEqual(base);
});

test('branch counts follow the settings and zero gives none', () => {
    expect(buildSide({...ELDER_SETTINGS, left: 3}, 'left', W, H)).toHaveLength(3);
    expect(buildSide({...ELDER_SETTINGS, right: 1}, 'right', W, H)).toHaveLength(1);
    expect(buildSide({...ELDER_SETTINGS, left: 0}, 'left', W, H)).toEqual([]);
});

test('branches enter within the viewBox height and paint stems first and eyes last', () => {
    for (const b of buildSide(ELDER_SETTINGS, 'left', W, H)) {
        expect(b.hingeY).toBeGreaterThan(0);
        expect(b.hingeY).toBeLessThan(H);
        expect(b.paths[0].fill).toBe('#b4b79e');
        expect(b.heads).toHaveLength(ELDER_SETTINGS.heads);
        for (const h of b.heads) {
            expect(h.paths.length).toBeGreaterThanOrEqual(8); // twig plus one ray per cluster
            expect(h.subsets).toHaveLength(4);
            for (const s of h.subsets) {
                expect(s.paths.map((p) => p.fill)).toEqual(['#e9e1c6', '#fffdf4', '#dcc27a']);
                expect(s.paths.every((p) => p.d.length > 0)).toBe(true);
            }
        }
    }
});

test('head motion data is deterministic, finite, and differs between heads', () => {
    const heads = buildSide(ELDER_SETTINGS, 'left', W, H).flatMap((b) => b.heads);
    expect(heads.map(motionOf)).toEqual(buildSide(ELDER_SETTINGS, 'left', W, H).flatMap((b) => b.heads).map(motionOf));
    for (const h of heads) for (const v of [h.baseX, h.baseY, h.duration, h.delay]) expect(Number.isFinite(v)).toBe(true);
    expect(new Set(heads.map((h) => `${h.duration}/${h.delay}`)).size).toBeGreaterThan(1);
    expect(buildSide({...ELDER_SETTINGS, heads: 0}, 'left', W, H)[0].heads).toEqual([]);
});

test('floret subset motion is deterministic, finite, small, and differs between subsets', () => {
    const motion = () => buildSide(ELDER_SETTINGS, 'left', W, H).flatMap((b) => b.heads.flatMap((h) => h.subsets.map((s) => [s.dx, s.dy, s.turn, s.duration, s.delay])));
    const m = motion();
    expect(m).toEqual(motion());
    for (const row of m) for (const v of row) expect(Number.isFinite(v)).toBe(true);
    for (const row of m) { expect(Math.abs(row[0])).toBeLessThanOrEqual(2.5); expect(Math.abs(row[1])).toBeLessThanOrEqual(2.5); expect(Math.abs(row[0])).toBeGreaterThanOrEqual(1.5); }
    expect(new Set(m.slice(0, 4).map((row) => row[3])).size).toBe(4);
    expect(new Set(m.map((row) => `${row[0]}/${row[1]}/${row[4]}`)).size).toBeGreaterThan(5);
});

test('stems, leaves and heads carry their growth order along the limb', () => {
    for (const b of buildSide(ELDER_SETTINGS, 'left', W, H)) {
        expect(b.paths[0]).toMatchObject({at: 0, baseX: 0, baseY: b.hingeY});
        const leaves = b.paths.slice(1);
        expect(leaves).toHaveLength(ELDER_SETTINGS.leaves * 2);
        for (const leaf of leaves) {
            expect(leaf.at).toBeGreaterThan(0);
            expect(leaf.at).toBeLessThan(1);
            expect(Number.isFinite(leaf.baseX) && Number.isFinite(leaf.baseY)).toBe(true);
        }
        // Back and front leaflets of one leaf share the attachment point, so they appear together.
        expect(new Set(leaves.map((leaf) => `${leaf.at}/${leaf.baseX}/${leaf.baseY}`)).size).toBe(ELDER_SETTINGS.leaves);
        const order = b.heads.map((h) => h.at);
        expect(order[order.length - 1]).toBe(1); // the last head sits on the tip
        expect(order.every((at) => at > 0 && at <= 1)).toBe(true);
        // Further along the limb means further from the hinge.
        const byOrder = [...b.heads].sort((a, c) => a.at - c.at);
        expect(byOrder.map((h) => h.baseX)).toEqual([...byOrder.map((h) => h.baseX)].sort((a, c) => a - c));
    }
});
