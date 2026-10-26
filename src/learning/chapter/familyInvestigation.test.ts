import {familyInvestigationQuery, readFamilyInvestigation, removeFamilyInvestigation} from './familyInvestigation';
import {getDemonstrationCatalog} from '../../demonstrations';
import {familyChapters} from '../content/familyChapters';

test('only a catalogued chapter section and its own demonstration recover bilingual instructions', () => {
    const query = familyInvestigationQuery('foundations', 'why-weights', 'bernstein');
    const resolved = readFamilyInvestigation(query, '/bezeg-2.0/bernstein');
    expect(resolved.invalid).toBe(false);
    expect(resolved.context).toMatchObject({
        chapterId: 'foundations', sectionId: 'why-weights', demonstrationId: 'bernstein',
        returnPath: '/bezeg-2.0/learn/foundations#why-weights',
    });
    expect(resolved.context?.prompt.sl).toBeTruthy();
    expect(resolved.context?.prompt.en).toBeTruthy();
});

test.each([
    '?explore=missing.section.bernstein',
    '?explore=foundations.multiplication.bernstein',
    '?explore=foundations.why-weights.complex-multiplication',
    '?explore=foundations.why-weights.bernstein&explore=foundations.why-weights.bernstein',
    '?chapter=bezier-curves&activity=shape-control&explore=foundations.why-weights.bernstein',
])('rejects invalid or duplicate family context %s', search => {
    expect(readFamilyInvestigation(search, '/bezeg-2.0/bernstein').invalid).toBe(true);
});

test('a context cannot be attached to another graph and cleanup preserves unrelated URL state', () => {
    expect(readFamilyInvestigation('?explore=foundations.why-weights.bernstein', '/bezeg-2.0/complex-multiplication').context).toBeUndefined();
    expect(removeFamilyInvestigation('?school=west&explore=broken&learn=1')).toBe('?school=west&learn=1');
});

test('every authored family investigation has a resolvable prompt for its destination route', () => {
    const demonstrations = getDemonstrationCatalog().demonstrations;
    const unresolved: string[] = [];
    for (const chapter of familyChapters) for (const section of chapter.sections) for (const demonstrationId of section.demonstrationIds ?? []) {
        const demonstration = demonstrations.find(entry => entry.id === demonstrationId);
        if (!demonstration || !readFamilyInvestigation(familyInvestigationQuery(chapter.id, section.id, demonstrationId), demonstration.path).context) {
            unresolved.push(`${chapter.id}/${section.id}/${demonstrationId}`);
        }
    }
    expect(unresolved).toEqual([]);
});
