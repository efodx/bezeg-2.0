import {describe, expect, it} from 'vitest';
import audit from '../../../docs/reviews/illustrated-chapter-examples/baseline-examples.json';
import type {DemonstrationId} from '../../demonstrations';
import {getChapterGuidedExamples, resolveGuidedExample} from './guidedExamples';
import {
    getRetainedExampleForLegacyActivity,
    getRetainedExampleForLegacyIdentity,
    getRetainedExampleForLegacyOwner,
    getRetainedExampleHome,
    legacyExampleAliases,
    retainedExampleHomes,
} from './retainedExamples';

type AuditRow = {
    id: string;
    chapterId: string;
    sectionId: string;
    demonstrationId: string;
    sourceId: string;
    sourceKind: 'activity' | 'family' | 'lesson';
    retainedKey: string;
};
const rows = audit.rows as AuditRow[];

describe('retained guided example registry', () => {
    it('matches every baseline alias and retained home to its reviewed destination', () => {
        expect(rows).toHaveLength(175);
        expect(audit.retainedHomes).toHaveLength(56);
        expect(legacyExampleAliases).toHaveLength(175);
        expect(retainedExampleHomes).toHaveLength(56);

        for (const row of rows) {
            const identity = `${row.sourceKind}.${row.chapterId}.${row.sectionId}.${row.demonstrationId}`;
            const home = getRetainedExampleForLegacyIdentity(identity, row.demonstrationId as DemonstrationId);
            expect(home?.[0], row.id).toBe(row.retainedKey);
            expect(home, row.id).toBeDefined();
            if (row.sourceKind === 'activity') {
                expect(getRetainedExampleForLegacyActivity(row.sourceId, row.demonstrationId as DemonstrationId)?.[0], row.id).toBe(row.retainedKey);
            }
        }

        for (const row of rows.filter(candidate => candidate.sourceKind === 'lesson')) {
            expect(getRetainedExampleForLegacyOwner(row.chapterId, row.sectionId, row.demonstrationId as DemonstrationId)?.[0], row.id).toBe(row.retainedKey);
        }

        for (const baselineHome of audit.retainedHomes) {
            const home = getRetainedExampleHome(baselineHome.retainedKey);
            expect(home, baselineHome.retainedKey).toBeDefined();
            expect(home?.[1]).toBe(baselineHome.chapterId);
            expect(home?.[2]).toBe(baselineHome.sectionId);
            expect(home?.[6]).toBe(baselineHome.canonicalPath);
            const link = getChapterGuidedExamples(baselineHome.chapterId, baselineHome.sectionId)
                .find(candidate => candidate.id === baselineHome.retainedKey);
            expect(link?.path, baselineHome.retainedKey).toBe(baselineHome.canonicalPath);
        }
    });

    it('keeps each old activity, family, and lesson entry routed to its audited home and owner', () => {
        for (const row of rows) {
            const home = getRetainedExampleHome(row.retainedKey)!;
            const search = row.sourceKind === 'activity'
                ? `?chapter=bezier-curves&activity=${encodeURIComponent(row.sourceId)}`
                : row.sourceKind === 'family'
                    ? `?explore=${encodeURIComponent(`${row.chapterId}.${row.sectionId}.${row.demonstrationId}`)}`
                    : `?example=${encodeURIComponent(`lesson.${row.chapterId}.${row.sectionId}.${row.demonstrationId}`)}`;
            const resolved = resolveGuidedExample(search, row.demonstrationId as DemonstrationId);
            expect(resolved?.owner, row.id).toEqual({chapterId: home[1], sectionId: home[2]});
            expect(resolved?.lesson.demonstrationId, row.id).toBe(row.demonstrationId);
        }
    });
});
