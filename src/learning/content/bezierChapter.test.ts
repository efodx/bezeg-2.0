import {describe, expect, test} from 'vitest';
import {bezierActivityCopy, bezierChapter} from './bezierChapter';
import type {BezierActivityId, BezierSectionId} from './bezierChapter';

const sectionIds: readonly BezierSectionId[] = ['motivation', 'control-points', 'parameter', 'interpolation', 'bernstein-form', 'geometric-properties', 'affine-transformations', 'next-ideas'];
const activityIds: readonly BezierActivityId[] = ['shape-control', 'curve-parameter', 'repeated-interpolation', 'blending-coefficients', 'geometric-bounds', 'transform-shape'];

function withoutMath(text: string) {
    let outside = '';
    let index = 0;
    while (index < text.length) {
        const delimiter = text.slice(index, index + 2);
        if (delimiter === '\\(' || delimiter === '\\[') {
            const close = delimiter === '\\(' ? '\\)' : '\\]';
            const end = text.indexOf(close, index + 2);
            if (end < 0) throw new Error(`Unclosed ${delimiter}: ${text}`);
            if (text.slice(index + 2, end).includes('\\(') || text.slice(index + 2, end).includes('\\[')) throw new Error(`Nested math delimiter: ${text}`);
            index = end + 2;
            outside += ' ';
        } else if (delimiter === '\\)' || delimiter === '\\]') {
            throw new Error(`Unmatched ${delimiter}: ${text}`);
        } else {
            outside += text[index++];
        }
    }
    return outside;
}

describe('Bézier chapter static content', () => {
    test('keeps eight stable sections and six activities in both languages', () => {
        for (const language of ['sl', 'en'] as const) {
            const chapter = bezierChapter[language];
            expect(chapter.id).toBe('bezier-curves');
            expect(chapter.sections.map(section => section.id)).toEqual(sectionIds);
            const authoredActivities = chapter.sections.flatMap(section => section.blocks.filter(block => block.kind === 'activity').map(block => block.kind === 'activity' ? block.id : ''));
            expect(authoredActivities.sort()).toEqual([...activityIds].sort());
            for (const section of chapter.sections) {
                for (const block of section.blocks) {
                    if (block.kind === 'formula') expect(block.latex).not.toMatch(/\\[()[\]]/);
                    if (block.kind === 'paragraph') {
                        const prose = withoutMath(block.text);
                        expect(prose).not.toMatch(/\\[A-Za-z]+/);
                        for (const link of block.links ?? []) expect(block.text).toContain(link.label);
                    }
                }
            }
        }
    });

    test('activity prompts are bilingual and map to existing demonstration routes and sections', () => {
        for (const id of activityIds) {
            const sl = bezierActivityCopy[id].sl;
            const en = bezierActivityCopy[id].en;
            expect(sl.title.trim()).not.toBe('');
            expect(sl.prompt.trim()).not.toBe('');
            expect(en.title.trim()).not.toBe('');
            expect(en.prompt.trim()).not.toBe('');
            expect(sl.sectionId).toBe(en.sectionId);
            expect(sectionIds).toContain(sl.sectionId);
            expect(sl.demoHref.split('?')[0]).toBe(en.demoHref.split('?')[0]);
            expect(sl.demoHref).toContain(`activity=${id}`);
            expect(en.demoHref).toContain(`activity=${id}`);
            expect(withoutMath(sl.prompt)).not.toMatch(/\\[A-Za-z]+/);
            expect(withoutMath(en.prompt)).not.toMatch(/\\[A-Za-z]+/);
        }
    });
});
