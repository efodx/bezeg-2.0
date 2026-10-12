import {t, useLanguage} from "../../localization";
import React, {useCallback, useContext, useEffect, useLayoutEffect, useRef, useState} from "react";
import {NavLink, useLocation, useNavigate} from "react-router-dom";
import {SiteContext} from "../context/react/SiteContext";
import {PresetLockContext} from "../context/react/PresetLockContext";
import {JGBox} from "../../JGBox";
import {findDemonstration, getDemonstrationCatalog, NavigationAction} from "../../demonstrations";
import "./DemonstrationWorkspace.css";
import "./WorkspaceControls.css";
import {LearningPrompt} from './LearningPrompt';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {GuidedLesson} from '../../learning/runtime/GuidedLesson';
import type {LessonGraphCapabilities} from '../../learning/model';

type Section = "edit" | "display" | "save";
type LessonMode = "content" | "explore" | "complete" | "closed";


export function DemonstrationWorkspace(props: {
    title: React.ReactNode, description: string, edit: React.ReactNode, display: React.ReactNode,
    save: React.ReactNode, navigate: (action: string) => void, lessonCapabilities?: LessonGraphCapabilities,
    graphBusy?: boolean, graphContainerRef?: React.Ref<HTMLDivElement>,
}) {
    useLanguage();
    const {pathname, search, hash} = useLocation();
    const navigateRoute = useNavigate();
    const {families} = getDemonstrationCatalog();
    const demonstration = findDemonstration(pathname);
    const lesson = demonstration && getLessonForDemonstration(demonstration.id);
    // The topic list opens the current family on every navigation; the user can still open and close families.
    const currentFamily = demonstration?.family;
    const [openFamilies, setOpenFamilies] = useState<ReadonlySet<string>>(() => new Set(currentFamily ? [currentFamily] : []));
    useEffect(() => {
        setOpenFamilies(new Set(currentFamily ? [currentFamily] : []));
    }, [pathname, currentFamily]);
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
    const [lessonOpen, setLessonOpen] = useState(() => new URLSearchParams(search).get('learn') === '1');
    const [lessonMode, setLessonMode] = useState<LessonMode>(() => new URLSearchParams(search).get('learn') === '1' ? 'content' : 'closed');
    const inspector = useRef<HTMLElement>(null);
    const workspaceRoot = useRef<HTMLElement>(null);
    const learnButton = useRef<HTMLButtonElement>(null);
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
        const shouldOpen = new URLSearchParams(search).get('learn') === '1';
        setLessonOpen(shouldOpen);
        setLessonMode(shouldOpen ? 'content' : 'closed');
    }, [pathname, search]);
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
            <div><span className="workspace-eyebrow">{t("bezeg_explore_curves")}</span>
                <h1>{props.title}</h1><p>{props.description}</p></div>
            <div className="workspace-actions">
                {lesson && props.lessonCapabilities && <button ref={learnButton} onClick={() => {setLessonMode('content'); setLessonOpen(true);}} aria-expanded={lessonOpen}>{t('learn_this_demonstration')}</button>}
                {fullScreen && <button onClick={() => setPresentationControls(!presentationControls)}
                    aria-expanded={presentationControls} aria-controls="workspace-inspector">{presentationControls ? t("hide_tools") : t("open_tools")}</button>}
                <button onClick={() => presentation.setFullScreen(!fullScreen)} aria-pressed={fullScreen}>
                    {fullScreen ? t("exit_presentation") : t("presentation_mode")}</button>
            </div>
        </header>
        {lessonOpen && lesson && props.lessonCapabilities && <GuidedLesson lesson={lesson} capabilities={props.lessonCapabilities}
            onModeChange={setLessonMode} graphContainer={graphContainer}
            onClose={() => {
                setLessonMode('closed');
                setLessonOpen(false);
                const query = new URLSearchParams(search);
                if (query.get('learn') === '1') {
                    query.delete('learn');
                    navigateRoute({pathname, search: query.toString() ? `?${query.toString()}` : '', hash}, {replace: true});
                }
                setTimeout(() => learnButton.current?.focus(), 0);
            }}/>}
        <nav className="workspace-topics" aria-label={t("demonstration_topics")}>
            <h2>{t("explore")}</h2>
            {families.map(family => {
                return <details key={family.id} open={openFamilies.has(family.id)} onToggle={event => {
                    const open = event.currentTarget.open;
                    setOpenFamilies(current => {
                        if (current.has(family.id) === open) return current;
                        const next = new Set(current);
                        if (open) next.add(family.id); else next.delete(family.id);
                        return next;
                    });
                }}>
                    <summary>{family.title}</summary>
                    {family.demonstrations.map(entry => <NavLink key={entry.id} to={entry.path}>{entry.catalogTitle}</NavLink>)}
                </details>;
            })}
        </nav>
        <section className="workspace-graph" aria-label={t("interactive_graph")} data-lesson-locked={lessonActive && lessonMode === 'content' ? 'true' : undefined}>
            <div className="workspace-graph-heading"><span className="workspace-eyebrow">{t("graph_eyebrow")}</span></div>
            <JGBox ref={setGraphContainer}/>
            <div className="workspace-navigation" role="group" aria-label={t("graph_pan_and_zoom")}>
                {actions.map(action => {
                    if (action === 'fit') return <button key={action} onClick={() => props.navigate(action)}>{t('fit_points')}</button>;
                    const [text, label] = navigationLabels[action];
                    return <button key={action} disabled={lessonOpen && lessonMode === 'content'} aria-label={label} title={label} onClick={() => props.navigate(action)}>{text}</button>;
                })}
            </div>
            <p className="workspace-gesture-hint">{t("pan_shift_drag_zoom_shift_mouse_wheel")}</p>
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
                <p>{t("inspector_intro")}</p>
            </div>
            <div className="inspector-tabs" role="group" aria-label={t("tool_groups")}>
                {sections.map(tab => <button key={tab.id} aria-label={tab.label} aria-pressed={section === tab.id}
                    aria-controls={`inspector-${tab.id}`} onClick={() => {setSection(tab.id); setExpanded(true); if (inspector.current) {inspector.current.scrollTop = 0;}}}>
                    <span>{tab.label}</span><small>{tab.hint}</small>
                </button>)}
            </div>
            </div>
            <div id="inspector-content" hidden={!expanded}>
                {sections.map(tab => <section key={tab.id} id={`inspector-${tab.id}`} hidden={section !== tab.id}
                    aria-label={tab.label}>{props[tab.id === "edit" ? "edit" : tab.id === "display" ? "display" : "save"]}</section>)}
            </div>
        </aside>
    </main></PresetLockContext.Provider>;
}
