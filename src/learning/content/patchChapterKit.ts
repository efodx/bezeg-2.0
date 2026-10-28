import type {DemonstrationId} from '../../demonstrations';
import type {LocalizedText} from '../model';
import type {FamilyChapterFigure, FamilyChapterSection} from './familyChapters';

// Local helpers: familyChapters.ts imports the patches chapter, so the chapter files must not import values from it.
export const text = (sl: string, en: string): LocalizedText => ({sl, en});

export const patchSection = (
    id: string,
    titleSl: string,
    titleEn: string,
    paragraphs: readonly LocalizedText[],
    options: {
        formula?: string;
        demonstrationIds?: readonly DemonstrationId[];
        figures?: readonly FamilyChapterFigure[];
        investigationPrompts?: Partial<Record<DemonstrationId, LocalizedText>>;
    } = {},
): FamilyChapterSection => ({id, title: text(titleSl, titleEn), paragraphs, ...options});
