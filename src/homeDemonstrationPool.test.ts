import {getDemonstrationCatalog} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {
    drawHomeDemonstrationIds, getVisitDemonstrationIds, homeDemonstrationPool, resetVisitDemonstrationIds,
} from './homeDemonstrationPool';

const catalog = getDemonstrationCatalog();
const familyOf = (id: string) => catalog.demonstrations.find(entry => entry.id === id)?.family;

function seeded(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

afterEach(() => resetVisitDemonstrationIds());

test('every pool id is in the catalogue with a preview asset, across at least six families', () => {
    expect(new Set(homeDemonstrationPool).size).toBe(homeDemonstrationPool.length);
    for (const id of homeDemonstrationPool) {
        expect(familyOf(id), id).toBeDefined();
        expect(demonstrationPreviewAssets[id], id).toBeTruthy();
    }
    expect(new Set(homeDemonstrationPool.map(familyOf)).size).toBeGreaterThanOrEqual(6);
});

test('a draw has six pool entries from six different families', () => {
    for (let seed = 1; seed <= 25; seed += 1) {
        const drawn = drawHomeDemonstrationIds(seeded(seed));
        expect(drawn).toHaveLength(6);
        expect(new Set(drawn).size).toBe(6);
        expect(new Set(drawn.map(familyOf)).size).toBe(6);
        for (const id of drawn) expect(homeDemonstrationPool).toContain(id);
    }
});

test('a draw is deterministic for one random source and differs for another', () => {
    expect(drawHomeDemonstrationIds(seeded(7))).toEqual(drawHomeDemonstrationIds(seeded(7)));
    const draws = new Set([1, 2, 3, 4, 5].map(seed => drawHomeDemonstrationIds(seeded(seed)).join()));
    expect(draws.size).toBeGreaterThan(1);
});

test('with fewer than six families the draw still returns six without the family rule', () => {
    const [firstFamily, ...others] = [...new Set(homeDemonstrationPool.map(familyOf))];
    const narrow = homeDemonstrationPool.filter(id => [firstFamily, others[0], others[1]].includes(familyOf(id)));
    expect(new Set(narrow.map(familyOf)).size).toBe(3);
    expect(narrow.length).toBeGreaterThanOrEqual(6);
    const drawn = drawHomeDemonstrationIds(seeded(3), narrow);
    expect(drawn).toHaveLength(6);
    expect(new Set(drawn).size).toBe(6);
    // The first three come from distinct families before the rule is dropped.
    expect(new Set(drawn.slice(0, 3).map(familyOf)).size).toBe(3);
});

test('the visit draw is remembered until reset or pinned', () => {
    const first = [...getVisitDemonstrationIds()];
    expect(getVisitDemonstrationIds()).toEqual(first);
    resetVisitDemonstrationIds(['bezier', 'bernstein']);
    expect(getVisitDemonstrationIds()).toEqual(['bezier', 'bernstein']);
});
