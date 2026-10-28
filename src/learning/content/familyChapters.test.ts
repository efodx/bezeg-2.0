import {describe, expect, test} from 'vitest';
import {getDemonstrationCatalog} from '../../demonstrations';
import {demonstrationPreviewAssets} from '../../demonstrationPreviewAssets';
import {familyChapters} from './familyChapters';
import {exampleReferences, hasEquivalentExampleOrder, validateOrderedChapterContent} from '../chapter/orderedContent';
import {retainedExampleHomes} from '../chapter/retainedExamples';
import {bezierChapter} from './bezierChapter';

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
    test('authors Foundations example placement in both languages with the audited graph meanings', () => {
        const foundations = familyChapters.find(chapter => chapter.id === 'foundations')!;
        const expected = {
            'reading-bernstein': ['foundations.reading-bernstein.bernstein'],
            'worked-weight': ['foundations.worked-weight.bernstein.degree-comparison'],
            'complex-plane': ['foundations.complex-plane.complex-multiplication'],
        } as const;
        const known = new Set(retainedExampleHomes.map(home => home[0]));
        for (const [sectionId, refs] of Object.entries(expected)) {
            const section = foundations.sections.find(item => item.id === sectionId)!;
            expect(section.orderedContent).toBeDefined();
            expect(exampleReferences(section.orderedContent!)).toEqual(refs);
            for (const block of section.orderedContent!) {
                if (block.kind === 'paragraph') expect(block.text.sl.trim()).not.toBe('');
                if (block.kind === 'paragraph') expect(block.text.en.trim()).not.toBe('');
            }
            expect(validateOrderedChapterContent(section.orderedContent!, known)).toEqual([]);
        }

        const worked = foundations.sections.find(item => item.id === 'worked-weight')!.orderedContent!;
        expect(worked.map(block => block.kind)).toEqual(['paragraph', 'example', 'paragraph']);
        expect(worked[2].kind === 'paragraph' && worked[2].text.sl).toContain('Uteži same ne povedo');
        const reading = foundations.sections.find(item => item.id === 'reading-bernstein')!.orderedContent!;
        expect(reading.map(block => block.kind)).toEqual(['paragraph', 'example', 'paragraph', 'figure']);
        const complex = foundations.sections.find(item => item.id === 'complex-plane')!.orderedContent!;
        expect(complex.map(block => block.kind)).toEqual(['paragraph', 'paragraph', 'example', 'paragraph', 'formula', 'figure']);
        expect(exampleReferences(foundations.sections.find(item => item.id === 'why-weights')?.orderedContent ?? [])).toEqual([]);
        expect(exampleReferences(foundations.sections.find(item => item.id === 'investigate-limits')?.orderedContent ?? [])).toEqual([]);
    });

    test('places every Bézier retained card at equivalent authored anchors in both languages', () => {
        const known = new Set(retainedExampleHomes.map(home => home[0]));
        for (const sectionId of bezierChapter.en.sections.map(section => section.id)) {
            const en = bezierChapter.en.sections.find(section => section.id === sectionId)!.orderedContent!;
            const sl = bezierChapter.sl.sections.find(section => section.id === sectionId)!.orderedContent!;
            expect(hasEquivalentExampleOrder(sl, en), sectionId).toBe(true);
            expect(validateOrderedChapterContent(en, known), sectionId).toEqual([]);
            expect(validateOrderedChapterContent(sl, known), sectionId).toEqual([]);
        }
        const expectedNext = [
            'bezier-curves.next-ideas.elevation', 'bezier-curves.next-ideas.subdivision',
            'bezier-curves.next-ideas.repeated-subdivision', 'bezier-curves.next-ideas.extrapolation',
        ];
        for (const language of ['en', 'sl'] as const) {
            const section = bezierChapter[language].sections.find(item => item.id === 'next-ideas')!;
            expect(exampleReferences(section.orderedContent!)).toEqual(expectedNext);
            expect(section.blocks.some(block => block.kind === 'paragraph' && block.text.includes(
                language === 'en' ? 'These are related demonstrations for further exploration' : 'Te povezave vodijo na povezane prikaze',
            ))).toBe(true);
        }
    });

    test('publishes eight bilingual chapters with stable section anchors and substantial prose', () => {
        expect(familyChapters.map(chapter => chapter.id)).toEqual([
            'foundations', 'rational-curves', 'splines', 'ph-curves', 'parametrization', 'bezier-patches', 'functions-and-calculus', 'analysis',
        ]);
        for (const chapter of familyChapters) {
            expect(chapter.sections.length).toBeGreaterThanOrEqual(5);
            // The patches chapter has eleven sections by spec (docs/specs/bezier-patches.md); every other chapter keeps the cap.
            expect(chapter.sections.length).toBeLessThanOrEqual(chapter.id === 'bezier-patches' ? 11 : 8);
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

    test('teaches spline chord allocation separately from the rational curve parameter warp', () => {
        const chapter = familyChapters.find(entry => entry.id === 'parametrization')!;
        const weighted = chapter.sections.find(section => section.id === 'weighted-knot')!;
        const worked = chapter.sections.find(section => section.id === 'worked-timing')!;
        const weightedText = weighted.paragraphs.map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ');
        const workedText = worked.paragraphs.map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ');
        expect(weighted.demonstrationIds).toEqual(['spline-parameterization']);
        expect(worked.demonstrationIds).toEqual(['spline-parameterization']);
        expect(weightedText).toContain('endpoints of each spline span');
        expect(weightedText).toContain('length of its chord');
        expect(workedText).toContain('\\frac15');
        expect(workedText).toContain('\\frac45');
        expect(workedText).toContain('\\frac13');
        expect(workedText).toContain('\\frac23');

        const trace = chapter.sections.find(section => section.id === 'trace-vs-parameter')!;
        expect(trace.paragraphs.map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ')).toContain('neutral');
        expect(trace.paragraphs.map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ')).toContain('\\frac12');

        for (const section of chapter.sections) {
            for (const id of section.demonstrationIds ?? []) {
                expect(section.investigationPrompts?.[id]?.sl, `${section.id}/${id} SL`).toBeTruthy();
                expect(section.investigationPrompts?.[id]?.en, `${section.id}/${id} EN`).toBeTruthy();
            }
        }
        const figures = chapter.sections.flatMap(section => section.figures ?? []);
        expect(figures.map(figure => figure.src)).toEqual([
            demonstrationPreviewAssets['spline-parameterization'],
            demonstrationPreviewAssets['weighted-parameterization'],
            demonstrationPreviewAssets['uniform-parameterization'],
        ]);
        const captions = figures.map(figure => `${figure.caption.sl} ${figure.caption.en}`).join(' ');
        expect(captions).toContain('0{,}7');
        expect(captions).toContain('12');
        expect(captions).toContain('0{,}25');
        expect(captions).toContain('weighted mode');
        expect(captions).toContain('not arc-length mode');
    });

    test('gives every calculus destination supported bilingual exploration and uses the captured calculus figures', () => {
        const chapter = familyChapters.find(entry => entry.id === 'functions-and-calculus')!;
        const occurrences = chapter.sections.flatMap(section => (section.demonstrationIds ?? []).map(id => ({section, id})));
        const supportedControls: Record<string, {sl: RegExp; en: RegExp}> = {
            'linear-function': {sl: /točk|naklon|presečišč/i, en: /point|slope|intercept/i},
            'exponential-function': {sl: /osnove|zrcal/i, en: /base|mirror/i},
            'trigonometric-functions': {sl: /sin|kosinus|tangens|amplitud|period|faz|srednj/i, en: /sin|cos|tan|amplitude|period|phase|midline/i},
            continuity: {sl: /drsnik|limita|vrednost/i, en: /slider|limit|value/i},
            derivative: {sl: /h|sekant|tangent|točk/i, en: /h|secant|tangent|point/i},
            'definite-integral': {sl: /mej|podinterval|pravokotnik|vsot/i, en: /bound|subinterval|rectangle|sum/i},
            'area-between-curves': {sl: /način|mej|krivulj|ploščin/i, en: /mode|bound|curve|area/i},
            'arc-length': {sl: /krajišč|število|lomljen|dolžin/i, en: /endpoint|segment|polyline|length/i},
        };
        expect([...new Set(occurrences.map(({id}) => id))].sort()).toEqual([
            'arc-length', 'area-between-curves', 'continuity', 'definite-integral', 'derivative',
            'exponential-function', 'linear-function', 'trigonometric-functions',
        ]);
        for (const {section, id} of occurrences) {
            const prompt = section.investigationPrompts?.[id];
            expect(prompt?.sl, `${section.id}/${id} Slovenian prompt`).toBeTruthy();
            expect(prompt?.en, `${section.id}/${id} English prompt`).toBeTruthy();
            expect(prompt!.sl.length, `${section.id}/${id} Slovenian prompt is specific`).toBeGreaterThan(90);
            expect(prompt!.en.length, `${section.id}/${id} English prompt is specific`).toBeGreaterThan(90);
            expect(prompt!.sl).toMatch(/spremeni|premakni|izberi|povečaj|zmanjšaj/i);
            expect(prompt!.en).toMatch(/change|move|select|increase|decrease/i);
            expect(prompt!.sl).toMatch(/opazuj|primerjaj|preveri|ugotovi/i);
            expect(prompt!.en).toMatch(/observe|compare|check|notice/i);
            expect(prompt!.sl).toContain('?');
            expect(prompt!.en).toContain('?');
            expect(prompt!.sl).toMatch(supportedControls[id].sl);
            expect(prompt!.en).toMatch(supportedControls[id].en);
        }

        const prose = chapter.sections.flatMap(section => section.paragraphs).map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ');
        expect(prose).toContain('\\forall\\varepsilon>0\\;\\exists\\delta>0\\;\\forall x\\in D');
        expect(prose).toContain('for every tolerance');
        expect(prose).toContain('for every domain point');
        expect(prose).toContain('h\\ne0');
        expect(prose).toContain('\\int_0^2 x\\,dx=2');

        const figures = chapter.sections.flatMap(section => section.figures ?? []);
        expect(figures.map(figure => figure.src)).toEqual([
            demonstrationPreviewAssets.continuity,
            demonstrationPreviewAssets.derivative,
            demonstrationPreviewAssets['definite-integral'],
        ]);
        for (const figure of figures) {
            expect(figure.alt.sl.trim()).not.toBe('');
            expect(figure.alt.en.trim()).not.toBe('');
            expect(figure.alt.sl).not.toMatch(/\\[A-Za-z]+/u);
            expect(figure.alt.en).not.toMatch(/\\[A-Za-z]+/u);
        }
        const captions = figures.map(figure => `${figure.caption.sl} ${figure.caption.en}`).join(' ');
        expect(captions).toContain('skok');
        expect(captions).toContain('jump');
        expect(captions).toContain('sekant');
        expect(captions).toContain('secant');
        expect(captions).toContain('šest');
        expect(captions).toContain('six');
        expect(captions).toContain('vsota');
        expect(captions).toContain('sum');
        expect(captions).toContain('signed integral');
        expect(captions).toContain('geometric area');
    });
    test('teaches Analysis with explicit uniform quantifiers, supported prompts, and the three inspected captures', () => {
        const chapter = familyChapters.find(entry => entry.id === 'analysis')!;
        const occurrences = chapter.sections.flatMap(section => (section.demonstrationIds ?? []).map(id => ({section, id})));
        const supportedControls: Record<string, {sl: RegExp; en: RegExp}> = {
            bisection: {sl: /korak|razpolovišče|interval/i, en: /step|midpoint|interval/i},
            'mean-value': {sl: /c|sekant|tangent/i, en: /c|secant|tangent/i},
            accumulation: {sl: /akumulacij|integral|mej/i, en: /accumulation|integral|bound/i},
            darboux: {sl: /razdelit|vsot|zgosti/i, en: /partition|sum|refine/i},
            extrema: {sl: /krajišč|interval|klasifikacij/i, en: /endpoint|interval|classification/i},
            convexity: {sl: /krajišč|tangent|drugi odvod/i, en: /endpoint|tangent|second derivative/i},
            taylor: {sl: /stopnj|točko|oceno napake/i, en: /degree|point|error bound/i},
            sequence: {sl: /člen|prag|certifikat/i, en: /term|threshold|certificate/i},
            'uniform-convergence': {sl: /suprem|indeks|epsilon/i, en: /suprem|index|epsilon/i},
            'fixed-point': {sl: /začetek|korak|ocen/i, en: /start|step|bound/i},
        };
        expect(occurrences).toHaveLength(21);
        expect([...new Set(occurrences.map(({id}) => id))].sort()).toEqual(Object.keys(supportedControls).sort());
        for (const {section, id} of occurrences) {
            const prompt = section.investigationPrompts?.[id];
            expect(prompt?.sl, `${section.id}/${id} Slovenian prompt`).toBeTruthy();
            expect(prompt?.en, `${section.id}/${id} English prompt`).toBeTruthy();
            expect(prompt!.sl.length, `${section.id}/${id} Slovenian prompt is specific`).toBeGreaterThan(70);
            expect(prompt!.en.length, `${section.id}/${id} English prompt is specific`).toBeGreaterThan(70);
            expect(prompt!.sl).toMatch(/spremeni|premakni|izberi|povečaj|zgosti|razkrij|pokaži/i);
            expect(prompt!.en).toMatch(/change|move|select|increase|refine|reveal|show/i);
            expect(prompt!.sl).toMatch(/opazuj|primerjaj|preveri|ugotovi|napovej/i);
            expect(prompt!.en).toMatch(/observe|compare|check|notice|predict/i);
            expect(prompt!.sl).toContain('?');
            expect(prompt!.en).toContain('?');
            expect(prompt!.sl).toMatch(supportedControls[id].sl);
            expect(prompt!.en).toMatch(supportedControls[id].en);
        }

        const convergence = chapter.sections.find(section => section.id === 'convergence')!.paragraphs
            .map(paragraph => `${paragraph.sl} ${paragraph.en}`).join(' ');
        expect(convergence).toContain('za vsak');
        expect(convergence).toContain('neodvisno od');
        expect(convergence).toContain('independent of');
        expect(convergence).toContain('for every');
        expect(convergence).toContain('0<r<1');
        expect(convergence).toContain('0.8');
        expect(convergence).toContain('0.32768');
        expect(convergence).toContain('not uniform');
        expect(convergence).toContain('not attained');

        const figures = chapter.sections.flatMap(section => section.figures ?? []);
        expect(figures.map(figure => figure.src)).toEqual([
            demonstrationPreviewAssets.bisection,
            demonstrationPreviewAssets.darboux,
            demonstrationPreviewAssets['uniform-convergence'],
        ]);
        expect(figures.every(figure => figure.alt.sl.trim() && figure.alt.en.trim())).toBe(true);
        const captions = figures.map(figure => `${figure.caption.sl} ${figure.caption.en}`).join(' ');
        expect(captions).toContain('1{,}5');
        expect(captions).toContain('n=4');
        expect(captions).toContain('0{,}8^5');
        expect(captions).toContain('0.8^5');
        expect(captions).toContain('nonuniform convergence case');
    });
});
