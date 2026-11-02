import {expect, test} from 'vitest';
import {bezierChapter} from './bezierChapter';
import {familyChapters} from './familyChapters';

const allowedKinds = new Set(['paragraph', 'formula', 'example', 'playground']);

type Probe = {chapter: string; section: string; kinds: string[]; keys: string[]};

/** Every ordered item of every chapter section, with the section's own keys. */
function collectProbes(): Probe[] {
    const probes: Probe[] = [];
    for (const language of ['sl', 'en'] as const) {
        for (const section of bezierChapter[language].sections) {
            probes.push({chapter: `bezier-curves/${language}`, section: section.id, kinds: (section.orderedContent ?? []).map(item => item.kind), keys: Object.keys(section)});
        }
    }
    for (const chapter of familyChapters) {
        for (const section of chapter.sections) {
            probes.push({chapter: chapter.id, section: section.id, kinds: (section.orderedContent ?? []).map(item => item.kind), keys: Object.keys(section)});
        }
    }
    return probes;
}

test('no chapter section carries a figure: only paragraph, formula, example and playground items', () => {
    const probes = collectProbes();
    expect(probes.length).toBeGreaterThan(50);
    const badKinds = probes.flatMap(p => p.kinds.filter(kind => !allowedKinds.has(kind)).map(kind => `${p.chapter}/${p.section}: ${kind}`));
    const figureKeys = probes.filter(p => p.keys.includes('figures')).map(p => `${p.chapter}/${p.section}`);
    expect(badKinds).toEqual([]);
    expect(figureKeys).toEqual([]);
});
