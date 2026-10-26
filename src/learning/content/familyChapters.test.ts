import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {demonstrationPreviewAssets} from '../../demonstrationPreviewAssets';
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
                    for (const figure of section.figures ?? []) {
                        expect(withoutMath(figure.caption[language])).not.toMatch(/\\[A-Za-z]+/u);
                    }
                    for (const prompt of Object.values(section.investigationPrompts ?? {})) {
                        if (prompt) expect(withoutMath(prompt[language])).not.toMatch(/\\[A-Za-z]+/u);
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

    test('gives every rational graph link a bilingual investigation prompt and uses its catalog figures', () => {
        const chapter = familyChapters.find(entry => entry.id === 'rational-curves')!;
        for (const section of chapter.sections) {
            for (const id of section.demonstrationIds ?? []) {
                const prompt = section.investigationPrompts?.[id];
                expect(prompt?.sl, `${section.id}/${id} Slovenian prompt`).toBeTruthy();
                expect(prompt?.en, `${section.id}/${id} English prompt`).toBeTruthy();
            }
        }

        const figures = chapter.sections.flatMap(section => section.figures ?? []);
        expect(figures.map(figure => figure.src)).toEqual([
            demonstrationPreviewAssets.rational,
            demonstrationPreviewAssets.circle,
        ]);
        const captions = figures.map(figure => `${figure.caption.sl} ${figure.caption.en}`).join(' ');
        expect(captions).toContain('kubični');
        expect(captions).toContain('three');
        expect(captions).toContain('kvadratičen');
        expect(captions).toContain('quarter');
    });

    test('gives every spline graph link a bilingual control-specific prompt and uses the join figures', () => {
        const chapter = familyChapters.find(entry => entry.id === 'splines')!;
        expect(chapter.sections.map(section => section.id)).toEqual([
            'piecewise', 'continuity-levels', 'geometric-vs-parametric', 'worked-join', 'investigate-splines',
        ]);
        const linkedIds = chapter.sections.flatMap(section => section.demonstrationIds ?? []);
        expect([...new Set(linkedIds)].sort()).toEqual([
            'spline-c1', 'spline-c2', 'spline-cn', 'spline-g1', 'spline-g1-symmetric',
        ]);
        for (const section of chapter.sections) {
            for (const id of section.demonstrationIds ?? []) {
                const prompt = section.investigationPrompts?.[id];
                expect(prompt?.sl, `${section.id}/${id} Slovenian prompt`).toBeTruthy();
                expect(prompt?.en, `${section.id}/${id} English prompt`).toBeTruthy();
            }
        }

        const figures = chapter.sections.flatMap(section => section.figures ?? []);
        expect(figures.map(figure => figure.src)).toEqual([
            demonstrationPreviewAssets['spline-c1'], demonstrationPreviewAssets['spline-g1'],
        ]);
        expect(figures.every(figure => figure.alt.sl.trim() && figure.alt.en.trim())).toBe(true);
        const captions = figures.map(figure => `${figure.caption.sl} ${figure.caption.en}`).join(' ');
        expect(captions).toContain('parabol');
        expect(captions).toContain('parabolas');
        expect(captions).toContain('večdel');
        expect(captions).toContain('multi-piece');

        const workedJoin = chapter.sections.find(section => section.id === 'worked-join')!.paragraphs
            .map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ');
        expect(workedJoin).toContain('globalni parameter');
        expect(workedJoin).toContain('global parameter');
        expect(workedJoin).toContain('L(t)=(t,t^2)');
        expect(workedJoin).toContain('R(s)=(1+s,1+2s+as^2)');
        expect(workedJoin).toContain('dt/du=ds/du=1');
        expect(workedJoin).toContain('h^2');
        expect(workedJoin).toContain('h_L');
        expect(workedJoin).toContain('h_R');
        expect(workedJoin).toContain('a=1');
    });

    test('completes the PH worked curve and gives every graph link specific prompts and offset figures', () => {
        const chapter = familyChapters.find(entry => entry.id === 'ph-curves')!;
        for (const section of chapter.sections) {
            for (const id of section.demonstrationIds ?? []) {
                const prompt = section.investigationPrompts?.[id];
                expect(prompt?.sl, `${section.id}/${id} Slovenian prompt`).toBeTruthy();
                expect(prompt?.en, `${section.id}/${id} English prompt`).toBeTruthy();
                expect(prompt?.sl).toMatch(/opaz|spremeni|primerj|preveri|povež/i);
                expect(prompt?.en).toMatch(/observe|change|compare|check|connect/i);
            }
        }
        const worked = chapter.sections.find(section => section.id === 'worked-length')!.paragraphs
            .map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ');
        expect(worked).toContain('t-\\frac{t^3}{3}');
        expect(worked).toContain('r(0)=(0,0)');
        expect(worked).toContain('r(1)=(\\frac23,1)');
        expect(worked).toContain('1+t^2');
        expect(worked).toContain('\\frac43');
        expect(worked).toContain('initial point at the origin');
        expect(worked).toContain('translation');

        const figures = chapter.sections.flatMap(section => section.figures ?? []);
        expect(figures.map(figure => figure.src)).toEqual([
            demonstrationPreviewAssets['ph-cubic'], demonstrationPreviewAssets['ph-quintic'],
        ]);
        expect(figures.every(figure => figure.alt.sl.trim() && figure.alt.en.trim())).toBe(true);
        const captions = figures.map(figure => `${figure.caption.sl} ${figure.caption.en}`).join(' ');
        expect(captions).toContain('0{,}35');
        expect(captions).toContain('0.35');
        expect(captions).toContain('0{,}5');
        expect(captions).toContain('0.5');
        expect(captions).toContain('integrirana');
        expect(captions).toContain('integrated');

        const offsets = chapter.sections.find(section => section.id === 'offsets')!.paragraphs
            .map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ');
        expect(offsets).toContain('regular point');
        expect(offsets).toContain('opposite sides');
        expect(offsets).toContain('d=0');
        expect(offsets).toContain('not necessarily polynomial');
        expect(offsets).toContain('singularities');
        expect(offsets).toContain('self-intersection');
        expect(offsets).toContain('global regularity');
    });
});
