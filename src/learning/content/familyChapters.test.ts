import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {familyChapters} from './familyChapters';

function withoutMath(source: string) {
    let outside = '';
    let index = 0;
    while (index < source.length) {
        const delimiter = source.slice(index, index + 2);
        if (delimiter === '\\(' || delimiter === '\\[') {
            const close = delimiter === '\\(' ? '\\)' : '\\]';
            const end = source.indexOf(close, index + 2);
            if (end < 0) throw new Error('Unclosed ' + delimiter + ' in ' + source);
            const body = source.slice(index + 2, end);
            if (body.includes('\\(') || body.includes('\\[')) throw new Error('Nested math delimiter in ' + source);
            outside += ' ';
            index = end + 2;
        } else if (delimiter === '\\)' || delimiter === '\\]') {
            throw new Error('Unmatched ' + delimiter + ' in ' + source);
        } else {
            outside += source[index++];
        }
    }
    return outside;
}

const wordCount = (value: string) => value.trim().split(/\s+/u).filter(Boolean).length;

describe('family reading chapters', () => {
    test('publishes seven bilingual chapters with stable section anchors and substantial prose', () => {
        expect(familyChapters.map(chapter => chapter.id)).toEqual([
            'foundations', 'rational-curves', 'splines', 'ph-curves', 'parametrization', 'functions-and-calculus', 'analysis',
        ]);
        for (const chapter of familyChapters) {
            expect(chapter.sections.length).toBeGreaterThanOrEqual(5);
            expect(chapter.sections.length).toBeLessThanOrEqual(8);
            expect(new Set(chapter.sections.map(section => section.id)).size).toBe(chapter.sections.length);
            expect(chapter.sections.every(section => /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(section.id))).toBe(true);
            for (const language of ['sl', 'en'] as const) {
                expect(chapter.title[language].trim()).not.toBe('');
                expect(chapter.purpose[language].trim()).not.toBe('');
                expect(chapter.prerequisites[language].trim()).not.toBe('');
                expect(chapter.sections.every(section => section.title[language].trim() && section.paragraphs.length > 0)).toBe(true);
                const prose = [
                    chapter.title[language], chapter.purpose[language], chapter.prerequisites[language],
                    ...chapter.sections.flatMap(section => [section.title[language], ...section.paragraphs.map(paragraph => paragraph[language])]),
                ].join(' ');
                expect(wordCount(prose)).toBeGreaterThanOrEqual(450);
                for (const section of chapter.sections) {
                    for (const paragraph of section.paragraphs) {
                        expect(withoutMath(paragraph[language])).not.toMatch(/\\[A-Za-z]+/u);
                    }
                    if (section.formula) expect(section.formula).not.toMatch(/\\[()[\]]/u);
                }
            }
        }
    });

    test('links every existing demonstration from its matching family chapter', () => {
        const demonstrations = getDemonstrationCatalog().demonstrations;
        for (const chapter of familyChapters) {
            const ids = chapter.sections.flatMap(section => section.demonstrationIds ?? []);
            const expected = demonstrations.filter(demo => demo.family === chapter.family).map(demo => demo.id).sort();
            expect([...new Set(ids)].sort()).toEqual(expected);
            for (const section of chapter.sections) {
                for (const id of section.demonstrationIds ?? []) {
                    expect(demonstrations.find(demo => demo.id === id)?.family).toBe(chapter.family);
                }
            }
        }
    });
});
