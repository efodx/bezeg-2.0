import {useT} from "../../localization";
import React, {useCallback, useContext, useEffect, useLayoutEffect, useRef, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {SiteContext} from "../context/react/SiteContext";
import {PresetLockContext} from "../context/react/PresetLockContext";
import {JGBox} from "../../JGBox";
import {findDemonstration, getDemonstrationCatalog, NavigationAction, Demonstration} from "../../demonstrations";
import {DemonstrationPicker} from '../../DemonstrationPicker';
import {readDemonstrationReturnContext} from '../../demonstrationNavigation';
import "./DemonstrationWorkspace.css";
import "./WorkspaceControls.css";
import "./DemonstrationWorkspaceIdentity.css";
import {LearningPrompt} from './LearningPrompt';
import {GuidedLesson} from '../../learning/runtime/GuidedLesson';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import type {LessonGraphCapabilities} from '../../learning/model';
import {useChapterActivity} from '../../learning/chapter/useChapterActivity';
import {chapterActivityVisit} from '../../learning/chapter/ChapterActivityVisit';
import {useLanguage} from '../../localization';
import '../../learning/chapter/ActivityContext.css';
import {getGuidedLessonChapterTitle, getGuidedLessonSectionTitle, guidedLessonReturnPath, resolveGuidedLessonOwner} from '../../learning/chapter/guidedLessonOwnership';
import {resolveGuidedExample} from '../../learning/chapter/guidedExamples';
import {readFamilyInvestigation, removeFamilyInvestigation} from '../../learning/chapter/familyInvestigation';

type Section = "edit" | "display" | "save";
type LessonMode = "content" | "explore" | "complete" | "closed";


export function DemonstrationWorkspace(props: {
    description: string, edit: React.ReactNode, display: React.ReactNode,
    save: React.ReactNode, navigate: (action: string) => void, lessonCapabilities?: LessonGraphCapabilities,
    graphBusy?: boolean, pickerUnavailable?: boolean, pausePlayback?: () => void, graphContainerRef?: React.Ref<HTMLDivElement>,
    beforeDispose?: React.MutableRefObject<(() => void) | undefined>,
    disposeFailedGraph?: () => void,
}) {
    const t = useT();
    const {language} = useLanguage();
    const closeLesson = useRef<(() => void) | undefined>();
    const registerLessonClose = useCallback((close: (() => void) | undefined) => { closeLesson.current = close; }, []);
    const exitLesson = useRef<(() => void) | undefined>();
    const registerLessonExit = useCallback((exit: (() => void) | undefined) => { exitLesson.current = exit; }, []);
    const [lessonGraphActions, setLessonGraphActions] = useState<{animationControls?: React.ReactNode}>();
    const location = useLocation();
    const {pathname, search, hash} = location;
    const returnContext = readDemonstrationReturnContext(location.state);
    const navigateRoute = useNavigate();
    const {families} = getDemonstrationCatalog();
    const demonstration = findDemonstration(pathname);
    const demonstrationId = demonstration?.id;
    const guidedExample = demonstrationId && resolveGuidedExample(search, demonstrationId);
    const lesson = guidedExample?.lesson ?? (demonstrationId && getLessonForDemonstration(demonstrationId));
    const lessonOwner = guidedExample?.owner ?? (demonstrationId && resolveGuidedLessonOwner(search, demonstrationId));
    const lessonOpen = Boolean(guidedExample);
    const chapter = useChapterActivity(props.lessonCapabilities, props.beforeDispose, closeLesson, props.disposeFailedGraph, undefined, lessonOpen);
    const familyInvestigation = readFamilyInvestigation(search, pathname);
    useEffect(() => {
        if (!familyInvestigation.invalid || lessonOpen) return;
        navigateRoute({pathname, search: removeFamilyInvestigation(search), hash}, {replace: true, state: location.state});
    }, [familyInvestigation.invalid, hash, lessonOpen, location.state, navigateRoute, pathname, search]);
    const family = families.find(entry => entry.id === demonstration?.family);
    const [pickerOpen, setPickerOpen] = useState(false);
    const switchButton = useRef<HTMLButtonElement>(null);
    const closePicker = (restoreFocus = true) => {
        setPickerOpen(false);
        if (restoreFocus) requestAnimationFrame(() => switchButton.current?.focus({preventScroll: true}));
    };
    const selectDemonstration = (entry: Demonstration, startLesson: boolean) => {
        closePicker(entry.path === pathname && (!startLesson || lessonOpen));
        if (entry.path === pathname) {
            if (chapter.activity && !startLesson) { chapter.freeExplore(); return; }
            if (startLesson && !lessonOpen) openGuidedLesson();
            return;
        }
        closeLesson.current?.();
        navigateRoute(entry.path + (startLesson ? '?learn=1' : ''), {state: location.state});
    };
    const navigationLabels: Record<Exclude<NavigationAction, 'fit'>, [string, string]> = {
        left: ['←', t('pan_left')], up: ['↑', t('pan_up')], down: ['↓', t('pan_down')],
        right: ['→', t('pan_right')], in: ['+', t('zoom_in')], out: ['−', t('zoom_out')],
    };
    const actions = demonstration?.navigationActions ?? ['left', 'up', 'down', 'right', 'in', 'out'] as const;
    const sections: {id: Section, label: string, hint: string}[] = [
    {id: "edit", label: t("edit"), hint: t("tool_group_edit_hint")},
    {id: "display", label: t("display"), hint: t("tool_group_display_hint")},
    {id: "save", label: t("save"), hint: t("tool_group_save_hint")}
];
    const {fullScreen: presentation} = useContext(SiteContext);
    const [section, setSection] = useState<Section>("edit");
    const [expanded, setExpanded] = useState(true);
    const [presentationControls, setPresentationControls] = useState(false);
    const [lessonMode, setLessonMode] = useState<LessonMode>(() => lessonOpen ? 'content' : 'closed');
    const inspector = useRef<HTMLElement>(null);
    // The content region is the inspector's only scroll owner; tab changes return it to the top.
    const inspectorContent = useRef<HTMLDivElement>(null);
    const workspaceRoot = useRef<HTMLElement>(null);
    const learnButton = useRef<HTMLButtonElement>(null);
    const openGuidedLesson = () => {
        if (!demonstration || !lessonOwner) return;
        const query = new URLSearchParams(search);
        query.delete('chapter'); query.delete('activity'); query.delete('explore');
        query.set('learn', '1');
        query.set('learnChapter', lessonOwner.chapterId);
        query.set('learnSection', lessonOwner.sectionId);
        navigateRoute({pathname, search: `?${query.toString()}`, hash}, {replace: true, state: location.state});
        setLessonMode('content');
    };
    useEffect(() => {
        if (!lesson || !demonstration || new URLSearchParams(search).get('learn') !== '1' || !lessonOwner) return;
        const query = new URLSearchParams(search);
        query.delete('chapter'); query.delete('activity'); query.delete('explore');
        query.set('learnChapter', lessonOwner.chapterId);
        query.set('learnSection', lessonOwner.sectionId);
        const nextSearch = `?${query.toString()}`;
        if (nextSearch !== search) navigateRoute({pathname, search: nextSearch, hash}, {replace: true, state: location.state});
    }, [demonstration, hash, lesson, lessonOwner, location.state, navigateRoute, pathname, search]);
    // The graph container is shared with the host (which mounts the board on it) and with the lesson overlay (which
    // keeps its prompt inside it).
    const graphContainer = useRef<HTMLDivElement | null>(null);
    const hostContainerRef = props.graphContainerRef;
    const setGraphContainer = useCallback((element: HTMLDivElement | null) => {
        graphContainer.current = element;
        if (typeof hostContainerRef === "function") hostContainerRef(element);
        else if (hostContainerRef) (hostContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = element;
    }, [hostContainerRef]);
    const fullScreen = presentation.fullScreen;
    const inspectorVisible = !fullScreen || presentationControls;
    // A requested lesson may arrive before a graph has finished creating its
    // board. Keep the normal workspace interactive until the graph-owned
    // capability is available; BaseGraph will provide it on the next render.
    const lessonActive = lessonOpen && Boolean(lesson && props.lessonCapabilities);
    useEffect(() => {
        const element = inspector.current as (HTMLElement & {inert?: boolean}) | null;
        if (element) element.inert = lessonActive && lessonMode === 'content';
    }, [lessonActive, lessonMode]);
    useLayoutEffect(() => {
        const element = workspaceRoot.current as (HTMLElement & {inert?: boolean}) | null;
        if (element) element.inert = Boolean(props.graphBusy);
    }, [props.graphBusy]);
    return <PresetLockContext.Provider value={lessonActive}><main ref={workspaceRoot} aria-busy={props.graphBusy || undefined}
        className={`demonstration-workspace ${fullScreen ? "is-presenting" : ""} ${lessonActive ? `lesson-open lesson-${lessonMode}` : ""}`}>
        <header className="workspace-heading">
            <div className="workspace-heading-copy"><nav className="workspace-breadcrumb" aria-label={t('library_breadcrumb')}>
                <Link to={returnContext?.location ?? '/bezeg-2.0/demonstrations'} state={location.state}>{t('demonstrations')}</Link>
                {family && <><span aria-hidden="true"> / </span><Link to={'/bezeg-2.0/demonstrations?topic=' + encodeURIComponent(family.id)}>{family.title}</Link></>}
                {demonstration && <><span aria-hidden="true"> / </span><span aria-current="page">{demonstration.catalogTitle}</span></>}
            </nav>
                <h1>{demonstration?.workspaceTitle ?? "Bezeg"}</h1><p>{props.description}</p>
                <svg className="workspace-botanical" viewBox="0 0 420 360" aria-hidden="true" focusable="false">
                    <g className="workspace-botanical-stems">
                        <path d="M410 358C367 279 327 207 278 157S203 69 170 7"/>
                        <path d="M278 157C313 120 350 96 402 83M326 207C364 193 391 170 416 137"/>
                        <path d="M237 108C204 91 164 76 122 42M266 140C265 95 259 51 253 7"/>
                        <path d="M356 271C386 250 402 226 414 198M205 74C174 68 145 69 111 77"/>
                    </g>
                    <g className="workspace-botanical-leaves">
                        <path d="M331 204C327 164 346 137 387 119C384 162 366 190 331 204Z"/>
                        <path d="M350 257C343 219 359 192 397 174C398 211 381 240 350 257Z"/>
                        <path d="M273 151C284 111 312 94 355 96C337 131 309 150 273 151Z"/>
                        <path d="M232 106C192 105 164 84 146 46C186 53 216 73 232 106Z"/>
                        <path d="M265 129C239 101 234 68 250 30C273 63 280 96 265 129Z"/>
                        <path d="M201 76C166 96 134 91 99 66C136 49 170 51 201 76Z"/>
                        <path d="M380 293C388 263 408 245 437 239C430 269 411 289 380 293Z"/>
                    </g>
                    <g className="workspace-botanical-flowers">
                        <g transform="translate(394 80)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-4" r="4"/><circle cx="9" cy="-7" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-13" r="4"/><circle cx="14" cy="2" r="4"/><circle cx="-15" cy="4" r="4"/></g>
                        <g transform="translate(416 131)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="8" cy="-8" r="4"/><circle cx="-8" cy="8" r="4"/><circle cx="9" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                        <g transform="translate(252 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                        <g transform="translate(168 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                        <g transform="translate(105 77)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                    </g>
                </svg>
            </div>
            <div className="workspace-actions">
                {chapter.readAbout && !lessonActive && !chapter.activity && <button disabled={props.pickerUnavailable} onClick={chapter.readAbout}>{t('chapter_read_about')}</button>}
                {!lessonActive && !chapter.activity && chapterActivityVisit.hasChapterReturn() && <Link to={chapterActivityVisit.readingReturnPath()} state={location.state}>{t('chapter_return')}</Link>}
                {demonstration && <button ref={switchButton} aria-disabled={props.graphBusy || props.pickerUnavailable || undefined}
                    aria-describedby={props.pickerUnavailable ? 'workspace-picker-unavailable' : undefined}
                    title={props.pickerUnavailable ? t('library_picker_busy') : undefined}
                    aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={() => {
                        if (props.graphBusy || props.pickerUnavailable) return;
                        props.pausePlayback?.();
                        setPickerOpen(true);
                    }}>{t('library_switch')}</button>}
                {props.pickerUnavailable && <span id="workspace-picker-unavailable" role="status">{t('library_picker_busy')}</span>}
                {lesson && props.lessonCapabilities && !lessonActive && <button ref={learnButton} onClick={openGuidedLesson} aria-expanded={lessonOpen}>{t('learn_this_demonstration')}</button>}
                {lessonActive && lessonMode === 'explore' && <>
                    {lessonGraphActions?.animationControls}
                </>}
                {fullScreen && <button onClick={() => setPresentationControls(!presentationControls)}
                    aria-expanded={presentationControls} aria-controls="workspace-inspector">{presentationControls ? t("hide_tools") : t("open_tools")}</button>}
                <button onClick={() => presentation.setFullScreen(!fullScreen)} aria-pressed={fullScreen}>
                    {fullScreen ? t("exit_presentation") : t("presentation_mode")}</button>
            </div>
        </header>
        {(chapter.invalidNotice || chapter.error || chapter.restarted) && <p className="activity-notice" role="status">
            {chapter.error ? t('chapter_scene_error') : chapter.invalidNotice ? t('chapter_invalid_context') : t('chapter_restarted')}
            {chapter.error && <>
                {!chapter.fatal && <button onClick={chapter.retry}>{t('chapter_retry')}</button>}
                <Link to={chapterActivityVisit.readingReturnPath()}>{t('chapter_return')}</Link>
                <a href={pathname}>{t('chapter_free_exploration')}</a>
            </>}
        </p>}
        {lessonOpen && lesson && props.lessonCapabilities && <GuidedLesson lesson={lesson} capabilities={props.lessonCapabilities}
            registerClose={registerLessonClose}
            registerExit={registerLessonExit}
            registerGraphActions={setLessonGraphActions}
            chapterOwner={lessonOwner ? {
                chapterTitle: getGuidedLessonChapterTitle(lessonOwner, language),
                sectionTitle: getGuidedLessonSectionTitle(lessonOwner, language),
                returnPath: guidedLessonReturnPath(lessonOwner),
                returnLabel: t('chapter_return'),
                onReturn: () => navigateRoute(guidedLessonReturnPath(lessonOwner), {state: location.state}),
            } : undefined}
            onModeChange={setLessonMode}
            onClose={() => {
                setLessonMode('closed');
                const query = new URLSearchParams(search);
                if (['learn', 'example', 'explore', 'chapter', 'activity'].some(key => query.has(key))) {
                    for (const key of ['learn', 'example', 'explore', 'chapter', 'activity']) query.delete(key);
                    navigateRoute({pathname, search: query.toString() ? `?${query.toString()}` : '', hash}, {replace: true, state: location.state});
                }
                setTimeout(() => learnButton.current?.focus(), 0);
            }}/>}
        <section className="workspace-graph" aria-label={t("interactive_graph")} data-lesson-locked={lessonActive && lessonMode === 'content' ? 'true' : undefined}>
            <div className="workspace-graph-heading"><span className="workspace-eyebrow">{t("graph_eyebrow")}</span></div>
            <JGBox ref={setGraphContainer}/>
            {actions.length > 0 && <div className="workspace-navigation" role="group" aria-label={t("graph_pan_and_zoom")}>
                {actions.map(action => {
                    if (action === 'fit') return <button key={action} onClick={() => props.navigate(action)}>{t('fit_points')}</button>;
                    const [text, label] = navigationLabels[action];
                    return <button key={action} disabled={lessonOpen && lessonMode === 'content'} aria-label={label} title={label} onClick={() => props.navigate(action)}>{text}</button>;
                })}
            </div>}
            <p className="workspace-gesture-hint">{demonstration?.view === 'surface' ? t("surface_gesture_hint") : t("pan_shift_drag_zoom_shift_mouse_wheel")}</p>
        </section>
        <LearningPrompt key={pathname} pathname={pathname}/>
        <aside ref={inspector} id="workspace-inspector" className="workspace-inspector" hidden={!inspectorVisible}
            aria-disabled={lessonActive && lessonMode === 'content' ? true : undefined} aria-label={t("demonstration_tools")}>
            <div className="inspector-toolbar">
            <div className="inspector-heading">
                <div><span className="workspace-inspector-kicker">{t("tools_for_this_graph")}</span><h2>{t("tools")}</h2></div>
                <button aria-expanded={expanded} aria-controls="inspector-content" onClick={() => setExpanded(!expanded)}>
                    {expanded ? t("collapse") : t("open")}
                    <svg aria-hidden="true" focusable="false" className="inspector-collapse-chevron" viewBox="0 0 16 16">
                        <path d={expanded ? 'M4 10 L8 6 L12 10' : 'M4 6 L8 10 L12 6'}/>
                    </svg>
                </button>
            </div>
            <div className="inspector-tabs" role="group" aria-label={t("tool_groups")}>
                {sections.map(tab => <button key={tab.id} aria-label={tab.label} aria-pressed={section === tab.id}
                    aria-describedby={`inspector-tab-hint-${tab.id}`} aria-controls={`inspector-${tab.id}`} title={tab.hint} onClick={() => {
                        setSection(tab.id); setExpanded(true);
                        if (inspectorContent.current) inspectorContent.current.scrollTop = 0;
                    }}>
                    <span>{tab.label}</span>
                </button>)}
                {sections.map(tab => <span key={tab.id} id={`inspector-tab-hint-${tab.id}`} className="visually-hidden">{tab.hint}</span>)}
            </div>
            </div>
            <div id="inspector-content" ref={inspectorContent} hidden={!expanded}>
                {sections.map(tab => <section key={tab.id} id={`inspector-${tab.id}`} hidden={section !== tab.id}
                    aria-label={tab.label}>{props[tab.id === "edit" ? "edit" : tab.id === "display" ? "display" : "save"]}</section>)}
            </div>
        </aside>
    </main>{pickerOpen && demonstration && <DemonstrationPicker current={demonstration} onClose={closePicker} onSelect={selectDemonstration}/>}</PresetLockContext.Provider>;
}
