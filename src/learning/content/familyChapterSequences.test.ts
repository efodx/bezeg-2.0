import {describe, expect, it} from 'vitest';
import {familyChapters} from './familyChapters';
import {authorFamilyChapterSequence} from './familyChapterSequences';
import {exampleReferences} from '../chapter/orderedContent';

const expected: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
    'rational-curves': {
        'why-rational': ['rational-curves.why-rational.rational-weight'],
        homogeneous: ['rational-curves.homogeneous.rational-decasteljau'],
        'worked-conic': ['rational-curves.worked-conic.circle'],
        operations: ['rational-curves.operations.rational-elevation', 'rational-curves.operations.rational-subdivision', 'rational-curves.operations.farin'],
        'investigate-rational': ['rational-curves.investigate-rational.rational-extrapolation'],
    },
    splines: {
        piecewise: ['splines.piecewise.spline-cn'],
        'continuity-levels': ['splines.continuity-levels.spline-c1', 'splines.continuity-levels.spline-c2'],
        'geometric-vs-parametric': ['splines.geometric-vs-parametric.spline-g1', 'splines.geometric-vs-parametric.spline-g1-symmetric'],
        'worked-join': ['splines.worked-join.spline-c1.parabola-derivatives'],
    },
    'ph-curves': {
        'arc-length-problem': ['ph-curves.arc-length-problem.ph-cubic-speed', 'ph-curves.arc-length-problem.ph-quintic-comparison'],
        'complex-hodograph': ['ph-curves.complex-hodograph.ph-cubic-generator'],
        'worked-length': ['ph-curves.worked-length.ph-cubic-offset-length'],
        offsets: ['ph-curves.offsets.ph-quintic-offsets'],
        'investigate-ph': ['ph-curves.investigate-ph.ph-cubic-singularity', 'ph-curves.investigate-ph.ph-quintic-singularity'],
    },
    parametrization: {
        'trace-vs-parameter': [],
        'weighted-knot': ['parametrization.weighted-knot.spline-parameterization', 'parametrization.weighted-knot.weighted-parameterization'],
        'worked-timing': [],
        'uniform-timing': ['parametrization.uniform-timing.uniform-parameterization'],
        'investigate-param': [],
    },
    'functions-and-calculus': {
        'function-rules': ['functions-and-calculus.function-rules.linear-function', 'functions-and-calculus.function-rules.exponential-function', 'functions-and-calculus.function-rules.trigonometric-functions'],
        continuity: ['functions-and-calculus.continuity.continuity'],
        derivatives: ['functions-and-calculus.derivatives.derivative'],
        integrals: ['functions-and-calculus.integrals.definite-integral', 'functions-and-calculus.integrals.accumulation'],
        applications: ['functions-and-calculus.applications.area-between-curves', 'functions-and-calculus.applications.arc-length'],
    },
    analysis: {
        existence: ['analysis.existence.bisection'],
        integrability: ['analysis.integrability.darboux'],
        'derivative-results': ['analysis.derivative-results.mean-value', 'analysis.derivative-results.extrema', 'analysis.derivative-results.convexity'],
        taylor: ['analysis.taylor.taylor'],
        convergence: ['analysis.convergence.sequence', 'analysis.convergence.uniform-convergence', 'analysis.convergence.fixed-point'],
        investigate: [],
    },
};

const auditAnchors: readonly {chapterId: string; sectionId: string; paragraphIndexes: readonly number[]; firstExample: string; beforeFirstParagraph?: boolean}[] = [
    {chapterId: 'rational-curves', sectionId: 'why-rational', paragraphIndexes: [0, 1], firstExample: 'rational-curves.why-rational.rational-weight'},
    {chapterId: 'rational-curves', sectionId: 'homogeneous', paragraphIndexes: [0, 1], firstExample: 'rational-curves.homogeneous.rational-decasteljau'},
    {chapterId: 'splines', sectionId: 'piecewise', paragraphIndexes: [0, 1], firstExample: 'splines.piecewise.spline-cn'},
    {chapterId: 'splines', sectionId: 'continuity-levels', paragraphIndexes: [0, 1], firstExample: 'splines.continuity-levels.spline-c1'},
    {chapterId: 'functions-and-calculus', sectionId: 'derivatives', paragraphIndexes: [0, 1], firstExample: 'functions-and-calculus.derivatives.derivative'},
    {chapterId: 'analysis', sectionId: 'convergence', paragraphIndexes: [], firstExample: 'analysis.convergence.sequence', beforeFirstParagraph: true},
];

const chaptersById = new Map(familyChapters.map(chapter => [chapter.id, chapter]));

describe('authored family chapter sequences', () => {
    it('places exactly the audit-approved examples in each authored section', () => {
        for (const [chapterId, sections] of Object.entries(expected)) {
            const chapter = chaptersById.get(chapterId);
            expect(chapter, chapterId).toBeDefined();
            for (const [sectionId, ids] of Object.entries(sections)) {
                const section = chapter!.sections.find(candidate => candidate.id === sectionId);
                expect(section, `${chapterId}.${sectionId}`).toBeDefined();
                const content = authorFamilyChapterSequence(chapterId, section!);
                expect(content, `${chapterId}.${sectionId} is explicitly ordered`).toBeDefined();
                const references = exampleReferences(content!);
                expect(references, `${chapterId}.${sectionId}`).toEqual(ids);
                expect(new Set(references).size, `${chapterId}.${sectionId} has no repeated card`).toBe(references.length);
            }
        }
    });

    it('puts bilingual teaching prose before and between multiple cards', () => {
        for (const [chapterId, sections] of Object.entries(expected)) {
            const chapter = chaptersById.get(chapterId)!;
            for (const [sectionId, ids] of Object.entries(sections)) {
                if (ids.length < 2) continue;
                const section = chapter.sections.find(candidate => candidate.id === sectionId)!;
                const content = authorFamilyChapterSequence(chapterId, section)!;
                const cardIndexes = content.flatMap((item, index) => item.kind === 'example' ? [index] : []);
                expect(content.slice(0, cardIndexes[0]).some(item => item.kind === 'paragraph'), `${chapterId}.${sectionId} has lead-in`).toBe(true);
                for (let i = 1; i < cardIndexes.length; i++) {
                    const bridge = content.slice(cardIndexes[i - 1] + 1, cardIndexes[i]).find(item => item.kind === 'paragraph');
                    expect(bridge?.kind, `${chapterId}.${sectionId} has reflection between cards`).toBe('paragraph');
                    if (bridge?.kind === 'paragraph') {
                        expect(bridge.text.sl.trim()).not.toBe('');
                        expect(bridge.text.en.trim()).not.toBe('');
                    }
                }
            }
        }
    });

    it('honors the audit reading anchors for representative sections', () => {
        for (const anchor of auditAnchors) {
            const section = chaptersById.get(anchor.chapterId)!.sections.find(candidate => candidate.id === anchor.sectionId)!;
            const content = authorFamilyChapterSequence(anchor.chapterId, section)!;
            const cardIndex = content.findIndex(item => item.kind === 'example' && item.exampleId === anchor.firstExample);
            const paragraphIndexes = anchor.paragraphIndexes.map(index => content.findIndex(item => item.kind === 'paragraph' && item.text === section.paragraphs[index]));
            expect(paragraphIndexes.every(index => index >= 0), `${anchor.chapterId}.${anchor.sectionId} paragraphs remain`).toBe(true);
            if (anchor.beforeFirstParagraph) {
                expect(cardIndex).toBeGreaterThanOrEqual(0);
                expect(paragraphIndexes.every(index => cardIndex < index)).toBe(true);
            } else {
                expect(paragraphIndexes.every(index => index < cardIndex), `${anchor.chapterId}.${anchor.sectionId} card follows its audited explanation`).toBe(true);
            }
        }
    });

    it('retains every source paragraph, formula, and figure as an explicit sequence item', () => {
        for (const [chapterId, sections] of Object.entries(expected)) {
            const chapter = chaptersById.get(chapterId)!;
            for (const sectionId of Object.keys(sections)) {
                const section = chapter.sections.find(candidate => candidate.id === sectionId)!;
                const content = authorFamilyChapterSequence(chapterId, section)!;
                const paragraphs = content.filter(item => item.kind === 'paragraph').map(item => item.kind === 'paragraph' ? item.text : undefined);
                for (const sourceParagraph of section.paragraphs) expect(paragraphs).toContain(sourceParagraph);
                expect(content.filter(item => item.kind === 'formula')).toHaveLength(section.formula ? 1 : 0);
                expect(content.filter(item => item.kind === 'figure')).toHaveLength(section.figures?.length ?? 0);
            }
        }
    });

    it('returns undefined for foundations and unassigned chapters or sections', () => {
        const section = familyChapters[0].sections[0];
        expect(authorFamilyChapterSequence('foundations', section)).toBeUndefined();
        expect(authorFamilyChapterSequence('unknown', section)).toBeUndefined();
        expect(authorFamilyChapterSequence('analysis', {...section, id: 'unknown'})).toBeUndefined();
    });
});
