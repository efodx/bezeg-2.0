import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {bezierActivityCopy, bezierChapter} from '../content/bezierChapter';
import {familyChapters} from '../content/familyChapters';
import type {LessonAction, LessonDefinition, LocalizedText} from '../model';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {GUIDED_LESSON_AVAILABLE_IDS} from '../runtime/lessonAvailability';
import {activities, findActivity} from './activities';
import {getGuidedLessonOwners, resolveGuidedLessonOwner} from './guidedLessonOwnership';

export type GuidedLessonOwner = Readonly<{chapterId: string; sectionId: string}>;
export type GuidedExampleLink = Readonly<{id: string; demonstrationId: DemonstrationId; title: LocalizedText; prompt?: LocalizedText; path: string}>;
export type ResolvedGuidedExample = {lesson: LessonDefinition; owner: GuidedLessonOwner};

const words = (sl: string, en: string): LocalizedText => ({sl, en});
const queryPath = (id: DemonstrationId, chapterId: string, sectionId: string, kind: string): string => {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=${encodeURIComponent(`${kind}.${chapterId}.${sectionId}.${id}`)}`;
};

function sectionTitle(chapterId: string, sectionId: string): LocalizedText | undefined {
    if (chapterId === 'bezier-curves') {
        const section = bezierChapter.en.sections.find(item => item.id === sectionId);
        const slSection = bezierChapter.sl.sections.find(item => item.id === sectionId);
        return section && slSection ? words(slSection.title, section.title) : undefined;
    }
    const section = familyChapters.find(item => item.id === chapterId)?.sections.find(item => item.id === sectionId);
    return section?.title;
}

function exampleId(chapterId: string, sectionId: string, id: DemonstrationId): string {
    return `${chapterId}.${sectionId}.${id}`;
}

function actionLesson(id: DemonstrationId, title: LocalizedText, prompt: LocalizedText, actions: readonly LessonAction[], lessonId: string): LessonDefinition {
    return {
        id: lessonId, demonstrationId: id, title,
        summary: words('', ''),
        steps: [{id: 'guided-example', title, body: prompt, prompt, frames: [
            {id: 'instruction', kind: 'explanation', title, body: prompt},
            {id: 'observe', kind: 'observation', title, prompt},
        ], scene: {actions}}],
    };
}

const shortLessonCache = new Map<string, LessonDefinition>();
function cachedShortLesson(key: string, create: () => LessonDefinition): LessonDefinition {
    let lesson = shortLessonCache.get(key);
    if (!lesson) { lesson = create(); shortLessonCache.set(key, lesson); }
    return lesson;
}

function preparedFamilyActions(id: DemonstrationId): readonly LessonAction[] {
    if (id === 'spline-c1') {
        return [{kind: 'prepared-scene', sceneId: 'worked-parabola-join', source: 'lesson-fixture',
            curve: {points: [[0, 0], [0.5, 0], [1.5, 2], [2, 4]], degree: 2, continuity: 1}, view: [-0.25, 4.5, 2.25, -0.5]}];
    }
    const authoredScene = getLessonForDemonstration(id)?.steps.find(step => step.scene?.actions.length)?.scene?.actions;
    if (authoredScene) {
        if (id === 'spline-cn' || id === 'spline-c2') return [...authoredScene, {kind: 'spline-label-points', visible: false}];
        return authoredScene;
    }
    return [{kind: 'prepared-scene', sceneId: `${id}-guided-example`, source: 'demonstration-default'}];
}

function familyPrompt(chapterId: string, sectionId: string, id: DemonstrationId, prompt: LocalizedText): LocalizedText {
    if (chapterId === 'splines' && sectionId === 'worked-join' && id === 'spline-c1') {
        return words(
            'Sledi levemu odseku \\(L(t)=(t,t^2)\\) in desnemu \\(R(s)=(1+s,1+2s+s^2)\\). Pri spoju \\((1,1)\\) primerjaj prve odvode \\((1,2)\\) in druge odvode \\((0,2)\\). Kaj se zgodi, če koeficient pri \\(s^2\\) spremeniš?',
            'Follow the left piece \\(L(t)=(t,t^2)\\) and right piece \\(R(s)=(1+s,1+2s+s^2)\\). At the join \\((1,1)\\), compare the first derivatives \\((1,2)\\) and second derivatives \\((0,2)\\). What changes if you change the coefficient of \\(s^2\\)?',
        );
    }
    return prompt;
}

function activityExample(search: string, id: DemonstrationId): ResolvedGuidedExample | undefined {
    const query = new URLSearchParams(search);
    const activityIds = query.getAll('activity');
    const chapters = query.getAll('chapter');
    if (activityIds.length !== 1 || chapters.length !== 1 || chapters[0] !== 'bezier-curves') return undefined;
    const activity = findActivity(activityIds[0]);
    if (!activity || activity.demonstrationId !== id) return undefined;
    const owner = {chapterId: 'bezier-curves', sectionId: activity.sectionId};
    const copy = bezierActivityCopy[activity.id as keyof typeof bezierActivityCopy];
    const title = words(copy.sl.title, copy.en.title);
    const prompt = words(copy.sl.prompt, copy.en.prompt);
    const lesson = cachedShortLesson(`activity:${activity.id}`, () => actionLesson(id, title, prompt, activity.actions, `activity-${activity.id}`));
    return {lesson, owner};
}

const activityPrompts = Object.fromEntries(Object.entries(bezierActivityCopy).map(([id, copy]) => [id, words(copy.sl.prompt, copy.en.prompt)])) as Readonly<Record<string, LocalizedText>>;
const activityTitles = Object.fromEntries(Object.entries(bezierActivityCopy).map(([id, copy]) => [id, words(copy.sl.title, copy.en.title)])) as Readonly<Record<string, LocalizedText>>;

function familyExample(search: string, id: DemonstrationId): ResolvedGuidedExample | undefined {
    const params = new URLSearchParams(search);
    const values = params.getAll('explore');
    if (values.length !== 1 || params.has('chapter') || params.has('activity')) return undefined;
    const identity = values[0].split('.');
    if (identity.length !== 3) return undefined;
    const [chapterId, sectionId, demo] = identity;
    if (demo !== id) return undefined;
    const chapter = familyChapters.find(item => item.id === chapterId);
    const section = chapter?.sections.find(item => item.id === sectionId && item.demonstrationIds?.includes(id));
    const sourcePrompt = section?.investigationPrompts?.[id];
    const prompt = sourcePrompt && familyPrompt(chapterId, sectionId, id, sourcePrompt);
    const title = sectionTitle(chapterId, sectionId);
    if (!section || !prompt || !title) return undefined;
    const lesson = cachedShortLesson(`family:${chapterId}.${sectionId}.${id}`, () => actionLesson(id, title, prompt, preparedFamilyActions(id), `explore-${chapterId}-${sectionId}-${id}`));
    return {owner: {chapterId, sectionId}, lesson};
}

function canonicalExample(search: string, id: DemonstrationId): ResolvedGuidedExample | undefined {
    const params = new URLSearchParams(search);
    const values = params.getAll('example');
    if (values.length !== 1) return undefined;
    const identity = values[0].split('.');
    if (identity.length !== 4) return undefined;
    const [kind, chapterId, sectionId, demo] = identity;
    if (demo !== id) return undefined;
    if (kind === 'lesson') {
        const owner = getGuidedLessonOwners(id).find(item => item.chapterId === chapterId && item.sectionId === sectionId);
        if (!owner) return undefined;
        const lesson = getLessonForDemonstration(id);
        return lesson ? {lesson, owner} : undefined;
    }
    if (kind === 'family') return familyExample(`?explore=${encodeURIComponent(`${chapterId}.${sectionId}.${id}`)}`, id);
    if (kind === 'activity') {
        if (chapterId !== 'bezier-curves') return undefined;
        const activity = activities.find(item => item.sectionId === sectionId && item.demonstrationId === id);
        return activity ? activityExample(`?chapter=bezier-curves&activity=${activity.id}`, id) : undefined;
    }
    return undefined;
}

export function resolveGuidedExample(search: string, demonstrationId: DemonstrationId): ResolvedGuidedExample | undefined {
    const params = new URLSearchParams(search);
    if (params.getAll('learn').length === 1 && params.get('learn') === '1') {
        const lesson = getLessonForDemonstration(demonstrationId);
        return lesson ? {lesson, owner: resolveGuidedLessonOwner(search, demonstrationId)} : undefined;
    }
    return canonicalExample(search, demonstrationId) ?? activityExample(search, demonstrationId) ?? familyExample(search, demonstrationId);
}

export function getChapterGuidedExamples(chapterId: string, sectionId: string): readonly GuidedExampleLink[] {
    const results: GuidedExampleLink[] = [];
    const seen = new Set<string>();
    const push = (id: DemonstrationId, title: LocalizedText, prompt?: LocalizedText, actions?: readonly LessonAction[], stableId?: string) => {
        const structural = actions ? JSON.stringify(actions) : `lesson:${id}`;
        const key = `${id}:${structural}`;
        if (seen.has(key)) return;
        seen.add(key);
        const kind = stableId && activities.some(activity => activity.id === stableId) ? 'activity' : stableId === 'family' ? 'family' : 'lesson';
        const linkId = kind === 'activity' ? stableId! : `${kind}.${exampleId(chapterId, sectionId, id)}`;
        results.push({id: linkId, demonstrationId: id, title, prompt, path: queryPath(id, chapterId, sectionId, kind)});
    };
    if (chapterId === 'bezier-curves') {
        for (const activity of activities.filter(item => item.sectionId === sectionId)) {
            push(activity.demonstrationId, activityTitles[activity.id], activityPrompts[activity.id], activity.actions, activity.id);
        }
    }
    const chapter = familyChapters.find(item => item.id === chapterId);
    const section = chapter?.sections.find(item => item.id === sectionId);
    for (const id of section?.demonstrationIds ?? []) {
        const sourcePrompt = section?.investigationPrompts?.[id];
        const prompt = sourcePrompt && familyPrompt(chapterId, sectionId, id, sourcePrompt);
        if (prompt) {
            const sectionName = sectionTitle(chapterId, sectionId)!;
            const demoName = getDemonstrationCatalog().demonstrations.find(demo => demo.id === id)!.workspaceTitle;
            push(id, words(`${sectionName.sl} · ${demoName}`, `${sectionName.en} · ${demoName}`), prompt, preparedFamilyActions(id), 'family');
        }
    }
    for (const id of GUIDED_LESSON_AVAILABLE_IDS) {
        if (!getGuidedLessonOwners(id).some(owner => owner.chapterId === chapterId && owner.sectionId === sectionId)) continue;
        const lesson = getLessonForDemonstration(id);
        if (lesson) push(id, lesson.title, undefined, undefined, 'lesson');
    }
    return results;
}
