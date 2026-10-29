import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {bezierActivityCopy, bezierChapter} from '../content/bezierChapter';
import {familyChapters} from '../content/familyChapters';
import {patchChapter} from '../content/patchChapter';
import {patchGuidedExamplePath, patchGuidedExampleRegistry} from '../content/patchGuidedExampleRegistry';
import type {LessonAction, LessonDefinition, LocalizedText} from '../model';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {activities, findActivity} from './activities';
import {getGuidedLessonOwners, resolveGuidedLessonOwner} from './guidedLessonOwnership';
import {
    getRetainedExampleForLegacyActivity,
    getRetainedExampleForLegacyIdentity,
    getRetainedExampleHome,
    legacyExampleAliases,
    retainedExampleHomes,
} from './retainedExamples';

export type GuidedLessonOwner = Readonly<{chapterId: string; sectionId: string}>;
export type GuidedExampleLink = Readonly<{id: string; demonstrationId: DemonstrationId; title: LocalizedText; prompt?: LocalizedText; path: string}>;
export type ResolvedGuidedExample = {lesson: LessonDefinition; owner: GuidedLessonOwner};

const words = (sl: string, en: string): LocalizedText => ({sl, en});
function sectionTitle(chapterId: string, sectionId: string): LocalizedText | undefined {
    if (chapterId === 'bezier-curves') {
        const section = bezierChapter.en.sections.find(item => item.id === sectionId);
        const slSection = bezierChapter.sl.sections.find(item => item.id === sectionId);
        return section && slSection ? words(slSection.title, section.title) : undefined;
    }
    const section = (chapterId === 'bezier-patches' ? patchChapter : familyChapters.find(item => item.id === chapterId))?.sections.find(item => item.id === sectionId);
    return section?.title;
}

function patchLesson(sectionId: string): LessonDefinition | undefined {
    return Object.prototype.hasOwnProperty.call(patchGuidedExampleRegistry, sectionId)
        ? patchGuidedExampleRegistry[sectionId as keyof typeof patchGuidedExampleRegistry]
        : undefined;
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

function preparedFamilyActions(id: DemonstrationId, chapterId: string, sectionId: string): readonly LessonAction[] {
    if (id === 'bernstein' && chapterId === 'foundations' && sectionId === 'worked-weight') {
        return [{kind: 'bernstein-degree', degree: 2}, {kind: 'bernstein-stacked-area', visible: false}];
    }
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
            'Sledi levemu odseku \\(L(t)=(t,t^2)\\) in desnemu \\(R(s)=(1+s,1+2s+s^2)\\). Pri spoju \\((1,1)\\) primerjaj prve odvode \\((1,2)\\) in druge odvode \\((0,2)\\). Nato na papirju spremeni koeficient pri \\(s^2\\) in ponovno izračunaj odvode; graf tega koeficienta nima kot krmilnika.',
            'Follow the left piece \\(L(t)=(t,t^2)\\) and right piece \\(R(s)=(1+s,1+2s+s^2)\\). At the join \\((1,1)\\), compare the first derivatives \\((1,2)\\) and second derivatives \\((0,2)\\). Then change the coefficient of \\(s^2\\) on paper and recompute the derivatives; the graph has no control for this coefficient.',
        );
    }
    return prompt;
}

function activityExample(search: string, id: DemonstrationId): ResolvedGuidedExample | undefined {
    const query = new URLSearchParams(search);
    if (query.has('example') || query.has('explore') || query.has('learn')) return undefined;
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
const retainedLessonPrompts: Readonly<Record<string, LocalizedText>> = {
    'bezier-curves.interpolation.alternative-recursion': words(
        'Spremljaj alternativno rekurzijo in primerjaj, kako se zaporedje vmesnih točk konča v točki krivulje pri izbranem parametru.',
        'Follow the alternative recursion and compare how its sequence of intermediate points ends at the curve point for the chosen parameter.',
    ),
    'bezier-curves.interpolation.decasteljau': words(
        'Premikaj parameter in spremljaj zaporedne interpolacije. Katera končna točka leži na krivulji pri izbranem parametru?',
        'Move the parameter and follow the successive interpolations. Which final point lies on the curve at the selected parameter?',
    ),
    'bezier-curves.next-ideas.elevation': words(
        'Primerjaj krmilne točke pred in po višanju stopnje. Kaj se spremeni v predstavitvi in kaj ostane enako na krivulji?',
        'Compare the control points before and after degree elevation. What changes in the representation, and what stays the same on the curve?',
    ),
    'bezier-curves.next-ideas.extrapolation': words(
        'Premakni parameter zunaj intervala od nič do ena. Opazuj ekstrapolacijsko točko in preveri, ali zanjo še velja lastnost konveksne ovojnice.',
        'Move the parameter outside the interval from zero to one. Watch the extrapolated point and check whether the convex-hull property still applies.',
    ),
    'bezier-curves.next-ideas.repeated-subdivision': words(
        'Povečuj število korakov subdivizije in primerjaj nove kontrolne poligone. Kako se približujejo nespremenjeni krivulji?',
        'Increase the number of subdivision steps and compare the refined control polygons. How do they approach the unchanged curve?',
    ),
    'bezier-curves.next-ideas.subdivision': words(
        'Premakni parameter delitve in primerjaj oba nova kontrolna poligona. Katera točka je skupni konec obeh delov na prvotni krivulji?',
        'Move the subdivision parameter and compare the two new control polygons. Which point is the shared endpoint of both pieces on the original curve?',
    ),
    'ph-curves.arc-length-problem.ph-cubic-speed': words(
        'Opazuj hitrost kubične PH-krivulje. Pojasni, kako pogoj za PH-krivuljo omogoči, da je hitrost polinom in je dolžino loka mogoče izračunati z integracijo.',
        'Inspect the cubic PH curve’s speed. Explain how the PH condition makes speed a polynomial, so its arc length can be computed by integration.',
    ),
};
function familyExample(search: string, id: DemonstrationId): ResolvedGuidedExample | undefined {
    const params = new URLSearchParams(search);
    if (params.has('example') || params.has('learn')) return undefined;
    const values = params.getAll('explore');
    if (values.length !== 1 || params.has('chapter') || params.has('activity')) return undefined;
    const identity = values[0].split('.');
    if (identity.length !== 3) return undefined;
    const [chapterId, sectionId, demo] = identity;
    if (demo !== id) return undefined;
    if (chapterId === 'bezier-patches') {
        const lesson = patchLesson(sectionId);
        return lesson && id === lesson.demonstrationId ? {owner: {chapterId, sectionId}, lesson} : undefined;
    }
    const chapter = familyChapters.find(item => item.id === chapterId);
    const section = chapter?.sections.find(item => item.id === sectionId && item.demonstrationIds?.includes(id));
    const sourcePrompt = section?.investigationPrompts?.[id];
    const prompt = sourcePrompt && familyPrompt(chapterId, sectionId, id, sourcePrompt);
    const title = sectionTitle(chapterId, sectionId);
    if (!section || !prompt || !title) return undefined;
    const lesson = cachedShortLesson(`family:${chapterId}.${sectionId}.${id}`, () => actionLesson(id, title, prompt, preparedFamilyActions(id, chapterId, sectionId), `explore-${chapterId}-${sectionId}-${id}`));
    return {owner: {chapterId, sectionId}, lesson};
}

function canonicalExample(search: string, id: DemonstrationId): ResolvedGuidedExample | undefined {
    const params = new URLSearchParams(search);
    if (params.has('explore') || params.has('activity') || params.has('chapter') || params.has('learn')) return undefined;
    const values = params.getAll('example');
    if (values.length !== 1) return undefined;
    const identity = values[0].split('.');
    if (identity.length !== 4) return undefined;
    const [kind, chapterId, sectionId, demo] = identity;
    if (demo !== id) return undefined;
    if (kind === 'lesson') {
        if (chapterId === 'bezier-patches') {
            const lesson = patchLesson(sectionId);
            return lesson && id === lesson.demonstrationId ? {lesson, owner: {chapterId, sectionId}} : undefined;
        }
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

function retainedHomeFromSearch(search: string, demonstrationId: DemonstrationId) {
    const params = new URLSearchParams(search);
    const examples = params.getAll('example');
    if (examples.length === 1 && !params.has('explore') && !params.has('activity') && !params.has('chapter')) {
        return getRetainedExampleForLegacyIdentity(examples[0], demonstrationId);
    }
    const explores = params.getAll('explore');
    if (explores.length === 1 && !params.has('example') && !params.has('activity') && !params.has('chapter')) {
        return getRetainedExampleForLegacyIdentity(`family.${explores[0]}`, demonstrationId);
    }
    const activities = params.getAll('activity');
    const chapters = params.getAll('chapter');
    if (activities.length === 1 && chapters.length === 1 && chapters[0] === 'bezier-curves'
        && !params.has('example') && !params.has('explore')) {
        return getRetainedExampleForLegacyActivity(activities[0], demonstrationId);
    }
    return undefined;
}

// Session ownership depends on definition identity. Re-resolving a route during a
// graph update must reuse the merged definition rather than restart its session.
const retainedLessonCache = new WeakMap<LessonDefinition, Map<string, LessonDefinition>>();
function addRetainedExploration(lesson: LessonDefinition, home: ReturnType<typeof getRetainedExampleHome>): LessonDefinition {
    if (!home || home[5] !== 'lesson') return lesson;
    const cached = retainedLessonCache.get(lesson)?.get(home[0]);
    if (cached) return cached;
    const mergedAliases = legacyExampleAliases.filter(alias => alias[6] === home[0] && alias[5] !== 'lesson');
    if (!mergedAliases.length) return lesson;
    const first = lesson.steps[0];
    if (!first) return lesson;
    const frames = [...(first.frames ?? [])];
    for (const [index, alias] of mergedAliases.entries()) {
        const prompt = alias[4] === 'shape-control' ? activityPrompts['shape-control']
            : alias[4] === 'blending-coefficients' ? activityPrompts['blending-coefficients']
                : alias[4] === 'transform-shape' ? activityPrompts['transform-shape']
                    : alias[5] === 'family' ? familyChapters.find(chapter => chapter.id === alias[1])?.sections.find(section => section.id === alias[2])?.investigationPrompts?.[home[3]]
                        : undefined;
        if (!prompt) continue;
        frames.push({
            id: `retained-exploration-${index + 1}`,
            kind: 'observation',
            title: words('Razišči še to opažanje', 'Explore this observation'),
            prompt,
        });
    }
    if (frames.length === (first.frames?.length ?? 0)) return lesson;
    const merged = {
        ...lesson,
        steps: [{...first, frames}, ...lesson.steps.slice(1)],
    };
    let definitions = retainedLessonCache.get(lesson);
    if (!definitions) { definitions = new Map(); retainedLessonCache.set(lesson, definitions); }
    definitions.set(home[0], merged);
    return merged;
}

function resolveRetainedHome(home: ReturnType<typeof getRetainedExampleHome>): ResolvedGuidedExample | undefined {
    if (!home) return undefined;
    const [, chapterId, sectionId, demonstrationId, sourceId, sourceKind] = home;
    if (sourceKind === 'lesson') {
        const lesson = getLessonForDemonstration(demonstrationId);
        return lesson ? {lesson: addRetainedExploration(lesson, home), owner: {chapterId, sectionId}} : undefined;
    }
    if (sourceKind === 'activity') return activityExample(`?chapter=bezier-curves&activity=${encodeURIComponent(sourceId)}`, demonstrationId);
    return familyExample(`?explore=${encodeURIComponent(`${chapterId}.${sectionId}.${demonstrationId}`)}`, demonstrationId);
}

export function resolveGuidedExample(search: string, demonstrationId: DemonstrationId): ResolvedGuidedExample | undefined {
    const params = new URLSearchParams(search);
    if (!params.has('learn') && (params.has('learnChapter') || params.has('learnSection'))) return undefined;
    if (params.has('learn')) {
        if (params.getAll('learn').length !== 1 || params.get('learn') !== '1'
            || params.has('example') || params.has('explore') || params.has('activity') || params.has('chapter')
            || params.getAll('learnChapter').length > 1 || params.getAll('learnSection').length > 1) return undefined;
        if (params.get('learnChapter') === 'bezier-patches'
            && !(patchLesson(params.get('learnSection') ?? '')?.demonstrationId === demonstrationId)) return undefined;
        const owner = resolveGuidedLessonOwner(search, demonstrationId);
        const lesson = owner.chapterId === 'bezier-patches' ? patchLesson(owner.sectionId) : getLessonForDemonstration(demonstrationId);
        if (!lesson) return undefined;
        const home = getRetainedExampleForLegacyIdentity(`lesson.${owner.chapterId}.${owner.sectionId}.${demonstrationId}`, demonstrationId);
        return {lesson: home ? addRetainedExploration(lesson, home) : lesson, owner};
    }
    return resolveRetainedHome(retainedHomeFromSearch(search, demonstrationId))
        ?? canonicalExample(search, demonstrationId)
        ?? activityExample(search, demonstrationId)
        ?? familyExample(search, demonstrationId);
}

export function getChapterGuidedExamples(chapterId: string, sectionId: string): readonly GuidedExampleLink[] {
    const retained = retainedExampleHomes.filter(home => home[1] === chapterId && home[2] === sectionId).flatMap((home): GuidedExampleLink[] => {
        const [, , , id, sourceId, sourceKind, path] = home;
        if (sourceKind === 'lesson') {
            const lesson = getLessonForDemonstration(id);
            return lesson ? [{id: home[0], demonstrationId: id, title: lesson.title, prompt: retainedMergedPrompt(home[0]), path}] : [];
        }
        if (sourceKind === 'activity') {
            const copy = bezierActivityCopy[sourceId as keyof typeof bezierActivityCopy];
            return copy ? [{id: home[0], demonstrationId: id, title: words(copy.sl.title, copy.en.title), prompt: words(copy.sl.prompt, copy.en.prompt), path}] : [];
        }
        const sectionName = sectionTitle(chapterId, sectionId);
        const demoName = getDemonstrationCatalog().demonstrations.find(demo => demo.id === id)?.workspaceTitle;
        const prompt = familyChapters.find(chapter => chapter.id === chapterId)?.sections.find(section => section.id === sectionId)?.investigationPrompts?.[id];
        return sectionName && demoName && prompt
            ? [{id: home[0], demonstrationId: id, title: words(`${sectionName.sl} · ${demoName}`, `${sectionName.en} · ${demoName}`), prompt: familyPrompt(chapterId, sectionId, id, prompt), path}]
            : [];
    });
    const patch = chapterId === 'bezier-patches' ? patchLesson(sectionId) : undefined;
    if (!patch) return retained;
    return [...retained, {
        id: `bezier-patches.${sectionId}.${patch.demonstrationId}`, demonstrationId: patch.demonstrationId, title: patch.title,
        prompt: patch.steps[0]?.frames?.find(frame => frame.kind === 'observation')?.prompt ?? patch.steps[0]?.body,
        path: patchGuidedExamplePath(sectionId as keyof typeof patchGuidedExampleRegistry),
    }];
}

function retainedMergedPrompt(key: string): LocalizedText | undefined {
    const authoredPrompt = retainedLessonPrompts[key];
    if (authoredPrompt) return authoredPrompt;
    const alias = legacyExampleAliases.find(entry => entry[6] === key && entry[5] !== 'lesson');
    if (!alias) return undefined;
    if (alias[4] === 'shape-control' || alias[4] === 'blending-coefficients' || alias[4] === 'transform-shape') {
        return activityPrompts[alias[4]];
    }
    return alias[5] === 'family'
        ? familyChapters.find(chapter => chapter.id === alias[1])?.sections.find(section => section.id === alias[2])?.investigationPrompts?.[alias[3]]
        : undefined;
}
