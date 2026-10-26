import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {familyChapters} from '../content/familyChapters';
import type {LocalizedText} from '../model';

export const FAMILY_INVESTIGATION_PARAM = 'explore';

export type FamilyInvestigationContext = {
    chapterId: string;
    chapterTitle: LocalizedText;
    sectionId: string;
    sectionTitle: LocalizedText;
    demonstrationId: DemonstrationId;
    prompt: LocalizedText;
    returnPath: string;
};

export function familyInvestigationQuery(chapterId: string, sectionId: string, demonstrationId: string, separator: '?' | '&' = '?'): string {
    return `${separator}${FAMILY_INVESTIGATION_PARAM}=${encodeURIComponent(`${chapterId}.${sectionId}.${demonstrationId}`)}`;
}

/** Resolve only catalog-authored chapter/section/demo triples on their matching graph route. */
export function readFamilyInvestigation(search: string, pathname: string): {context?: FamilyInvestigationContext; invalid: boolean} {
    const params = new URLSearchParams(search);
    const values = params.getAll(FAMILY_INVESTIGATION_PARAM);
    if (!values.length) return {invalid: false};
    if (params.has('chapter') || params.has('activity')) return {invalid: true};
    if (values.length !== 1) return {invalid: true};
    const parts = values[0].split('.');
    if (parts.length !== 3 || parts.some(part => !part)) return {invalid: true};
    const [chapterId, sectionId, requestedDemo] = parts;
    const demonstrationId = catalogId(requestedDemo);
    if (!demonstrationId) return {invalid: true};
    const catalog = getDemonstrationCatalog();
    const demonstration = catalog.demonstrations.find(entry => entry.id === demonstrationId);
    const chapter = familyChapters.find(entry => entry.id === chapterId);
    const section = chapter?.sections.find(entry => entry.id === sectionId && entry.demonstrationIds?.includes(demonstrationId));
    const prompt = section?.investigationPrompts?.[demonstrationId];
    if (!chapter || !section || !prompt || !demonstration || demonstration.path !== pathname) return {invalid: true};
    return {
        invalid: false,
        context: {
            chapterId, chapterTitle: chapter.title, sectionId, sectionTitle: section.title,
            demonstrationId, prompt, returnPath: `/bezeg-2.0/learn/${chapterId}#${sectionId}`,
        },
    };
}

function catalogId(value: string): DemonstrationId | undefined {
    return getDemonstrationCatalog().demonstrations.find(entry => entry.id === value)?.id;
}

export function removeFamilyInvestigation(search: string): string {
    const params = new URLSearchParams(search);
    params.delete(FAMILY_INVESTIGATION_PARAM);
    const rest = params.toString();
    return rest ? `?${rest}` : '';
}
