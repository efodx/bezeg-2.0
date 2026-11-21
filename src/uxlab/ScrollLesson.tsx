import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {LessonDefinition, LessonFrame, LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {framesForLessonStep} from '../learning/model';
import type {LessonSession} from '../learning/runtime/LessonSession';
import {typesetMath} from '../mathjax/loadMathJax';
import {coverBoard, findMainBoard, recoverBoards} from './board';
import {interpolateValue, refineGrid} from './morph';
import './uxlab.css';

type Text = {sl: string; en: string};
const say = (value: Text | undefined, language: string) => value ? (language === 'en' ? value.en : value.sl) || value.sl : '';
const smooth = (t: number) => t * t * (3 - 2 * t);
/** The graph moves while the last section of a step crosses the reading line, from this fraction of it on. */
const MORPH_FROM = 0.3;

interface Section { step: number; frame: number; data: LessonFrame }

/** The page or the nearest scrolling ancestor: the one the learner actually scrolls. */
function scroller(element: HTMLElement): HTMLElement | Window {
    for (let node = element.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 4) return node;
    }
    return window;
}

/** Where the reading line sits: 40 % down the visible part of the scroller (below a sticky graph on a phone). */
function readingLine(target: HTMLElement | Window, graph?: HTMLElement): number {
    if (target instanceof Window) {
        const top = graph && getComputedStyle(graph).position === 'sticky' ? Math.max(0, graph.getBoundingClientRect().bottom) : 0;
        return top + (window.innerHeight - top) * 0.4;
    }
    const rect = target.getBoundingClientRect();
    const top = Math.max(rect.top, 0), bottom = Math.min(rect.bottom, window.innerHeight);
    return top + (bottom - top) * 0.4;
}

/**
 * Lane B b17: the lesson as one scroll. Every frame of every step is one section of continuous text; the scroll
 * position is the lesson's clock. While the last section of a step crosses the reading line the graph morphs into the
 * next step's scene, so scrolling back plays it backwards. Scene checkpoints are computed once, behind a cover, from
 * the lesson's own scene actions; changes the learner makes inside a step are kept when they scroll away and back.
 */
export function ScrollLesson(props: {lesson: LessonDefinition; session: LessonSession; capabilities: LessonGraphCapabilities; language: string}) {
    const {lesson, language} = props;
    // The host hands a new capabilities object on renders; the scroll machinery must not restart with it.
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const root = useRef<HTMLDivElement>(null);
    const sections = useMemo<Section[]>(() => lesson.steps.flatMap((step, stepIndex) =>
        framesForLessonStep(step).map((data, frame) => ({step: stepIndex, frame, data}))), [lesson]);
    const scenes = useRef<LessonSceneCheckpoint[]>();
    const kept = useRef(new Map<number, LessonSceneCheckpoint>());
    const applied = useRef<string>('');
    const [active, setActive] = useState(0);
    const [morph, setMorph] = useState<{from: number; t: number}>();
    const [ready, setReady] = useState(false);

    // One checkpoint per step: the lesson's start, then that step's scene actions (a scene-less step shows the start).
    useEffect(() => {
        let cancelled = false, tries = 0, timer = 0;
        let cover: HTMLElement | undefined;
        const build = () => {
            if (cancelled) return;
            // The session captures its start checkpoint when the lesson starts, which may be after this mounts.
            const base = (props.session as unknown as {checkpoint?: LessonSceneCheckpoint}).checkpoint;
            const board = findMainBoard();
            if ((!base || !board) && tries++ < 40) { timer = window.setTimeout(build, 100); return; }
            if (!base) { setReady(true); return; }
            cover = board ? coverBoard(board.containerObj) : undefined;
            const capabilities = caps.current;
            const found: LessonSceneCheckpoint[] = [];
            let current: LessonSceneCheckpoint | undefined;
            try { current = capabilities.captureState(); } catch { /* keep the base */ }
            lesson.steps.forEach((step, index) => {
                try {
                    capabilities.restoreState(base);
                    step.scene?.actions.forEach(action => capabilities.apply(action));
                    found.push(capabilities.captureState());
                } catch {
                    recoverBoards();
                    found.push(found[index - 1] ?? base);
                }
            });
            try { capabilities.restoreState(current ?? found[0]); } catch { recoverBoards(); }
            const shown = cover;
            requestAnimationFrame(() => { recoverBoards(); shown?.remove(); });
            scenes.current = found;
            applied.current = 'rest:0';
            setReady(true);
        };
        build();
        return () => { cancelled = true; window.clearTimeout(timer); cover?.remove(); };
    }, [lesson, props.session]);

    useEffect(() => {
        if (root.current) void typesetMath(root.current, () => !!root.current?.isConnected).catch(() => undefined);
    }, [sections, language]);

    // The phone layout scrolls the page: the graph stays on screen above the text.
    useLayoutEffect(() => {
        document.documentElement.classList.add('ux-scroll-lesson');
        return () => document.documentElement.classList.remove('ux-scroll-lesson');
    }, []);

    useEffect(() => {
        const element = root.current;
        if (!element || !ready) return;
        let frame = 0;
        const capabilities = caps.current;
        const apply = (key: string, checkpoint: () => LessonSceneCheckpoint | undefined) => {
            if (applied.current === key) return;
            const value = checkpoint();
            if (!value) return;
            try { capabilities.restoreState(value); applied.current = key; } catch { recoverBoards(); }
        };
        const update = () => {
            frame = 0;
            const all = scenes.current;
            const nodes = [...element.querySelectorAll<HTMLElement>('.ux-scroll-section')];
            if (!all || nodes.length === 0) return;
            const graph = document.querySelector<HTMLElement>('.workspace-graph') ?? undefined;
            const line = readingLine(scroller(element), graph);
            // On a phone the progress rail rides on the lower edge of the sticky graph.
            const rail = element.querySelector<HTMLElement>('.ux-scroll-rail');
            const pinned = !!graph && getComputedStyle(graph).position === 'sticky';
            rail?.classList.toggle('is-fixed', pinned);
            if (rail && pinned) rail.style.top = `${Math.round(graph!.getBoundingClientRect().bottom)}px`;
            let index = 0;
            while (index < nodes.length - 1 && nodes[index + 1].getBoundingClientRect().top <= line) index++;
            const top = nodes[index].getBoundingClientRect().top;
            const next = nodes[index + 1];
            const fraction = next ? Math.min(1, Math.max(0, (line - top) / Math.max(1, next.getBoundingClientRect().top - top))) : 0;
            setActive(index);
            if (window.location.search.includes('uxdebug')) console.info('[ux b17]', index, Math.round(line), fraction.toFixed(2));
            const step = sections[index].step;
            const nextStep = next ? sections[index + 1].step : step;
            const t = nextStep !== step ? smooth(Math.min(1, Math.max(0, (fraction - MORPH_FROM) / (1 - MORPH_FROM)))) : 0;
            const restKey = applied.current.startsWith('rest:') ? Number(applied.current.slice(5)) : undefined;
            if (t <= 0) {
                setMorph(undefined);
                // Coming to rest in a step: its scene (or what the learner made of it there).
                apply(`rest:${step}`, () => kept.current.get(step) ?? all[step]);
                return;
            }
            if (restKey === step) {
                // Leaving a step: keep what the learner did there, so scrolling back returns to it.
                try { kept.current.set(step, capabilities.captureState()); } catch { /* the graph is gone */ }
            }
            const from = kept.current.get(step) ?? all[step];
            const to = kept.current.get(nextStep) ?? all[nextStep];
            setMorph({from: step, t});
            if (t >= 1) { apply(`rest:${nextStep}`, () => to); return; }
            const quantized = Math.round(t * 120) / 120;
            apply(`morph:${step}:${quantized}`, () => ({version: 1, value: interpolateValue(refineGrid(from.value), refineGrid(to.value), quantized, '', false, true)}));
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        // Capture: scroll events of any scroller (the panel on a desktop, the page on a phone) reach the document.
        document.addEventListener('scroll', schedule, {passive: true, capture: true});
        window.addEventListener('resize', schedule);
        schedule();
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('scroll', schedule, {capture: true});
            window.removeEventListener('resize', schedule);
        };
    }, [ready, sections]);

    const go = (index: number) => {
        const node = root.current?.querySelectorAll<HTMLElement>('.ux-scroll-section')[index];
        if (!node || !root.current) return;
        const target = scroller(root.current);
        const graph = document.querySelector<HTMLElement>('.workspace-graph') ?? undefined;
        const delta = node.getBoundingClientRect().top - readingLine(target, graph) + 2;
        if (target instanceof Window) window.scrollBy({top: delta, behavior: 'smooth'});
        else target.scrollBy({top: delta, behavior: 'smooth'});
    };

    const steps = lesson.steps.length;
    return <div ref={root} className="ux-scroll" data-ready={ready}>
        <nav className="ux-scroll-rail" aria-label="Odseki lekcije">
            {sections.map((section, index) => <button key={index} type="button" className={`ux-scroll-dot ${index === active ? 'is-active' : ''}${section.frame === 0 ? ' is-step' : ''}`}
                aria-label={`Korak ${section.step + 1}, okvir ${section.frame + 1}`} onClick={() => go(index)}/>)}
        </nav>
        <div className="ux-scroll-hint">Drsi po besedilu: graf sledi branju. Nazaj drsi, da se vrne.</div>
        {sections.map((section, index) => {
            const {data} = section;
            const first = section.frame === 0;
            const lastOfStep = sections[index + 1]?.step !== section.step;
            const moving = morph && morph.from === section.step && lastOfStep;
            return <section key={`${section.step}-${data.id}`} className={`ux-scroll-section${index === active ? ' is-active' : ''}${first ? ' is-step' : ''}`}>
                {first && <p className="ux-scroll-step">Korak {section.step + 1} od {steps} · {say(lesson.steps[section.step].title, language)}</p>}
                <h3>{say(data.title, language)}</h3>
                {data.body && <p data-tex={say(data.body, language)}>{say(data.body, language)}</p>}
                {data.notation?.map((formula, i) => <div key={i} className="guided-lesson-notation" data-tex={say(formula, language)}>{say(formula, language)}</div>)}
                {data.workedExample && <div className="guided-lesson-worked-example">
                    <h4>{say(data.workedExample.title, language)}</h4>
                    <div className="guided-lesson-notation" data-tex={say(data.workedExample.calculation, language)}>{say(data.workedExample.calculation, language)}</div>
                    <div className="guided-lesson-notation" data-tex={say(data.workedExample.result, language)}>{say(data.workedExample.result, language)}</div>
                    <p data-tex={say(data.workedExample.check, language)}>{say(data.workedExample.check, language)}</p>
                </div>}
                {data.prompt && <p className="ux-scroll-prompt" data-tex={say(data.prompt, language)}>{say(data.prompt, language)}</p>}
                {data.kind === 'observation' && <p className="ux-scroll-try">Graf je zdaj tvoj: preizkusi, nato beri naprej.</p>}
                {data.expectedObservations && data.expectedObservations.length > 0 && <details className="guided-lesson-expected">
                    <summary>Kaj bi moral opaziti</summary>
                    {data.expectedObservations.map((text, i) => <p key={i} data-tex={say(text, language)}>{say(text, language)}</p>)}
                </details>}
                {(data.action ?? (first ? lesson.steps[section.step].action : undefined)) && <button type="button" className="ux-scroll-action" onClick={() => {
                    const action = (data.action ?? lesson.steps[section.step].action)!.action;
                    try { caps.current.apply(action); kept.current.set(section.step, caps.current.captureState()); } catch { recoverBoards(); }
                }}>{say((data.action ?? lesson.steps[section.step].action)!.label, language)}</button>}
                {data.animation && <div className="ux-scroll-anim">{(['play', 'pause', 'replay'] as const).map(command =>
                    <button type="button" key={command} onClick={() => props.session.applyAnimation(data.animation!.animationId, command)}>
                        {command === 'play' ? '▶ Predvajaj' : command === 'pause' ? '❚❚ Ustavi' : '↺ Znova'}</button>)}</div>}
                {lastOfStep && section.step < steps - 1 && <div className={`ux-scroll-bridge${moving ? ' is-moving' : ''}`} aria-hidden="true">
                    <span style={{transform: `scaleX(${moving ? morph!.t : 0})`}}/>
                    <em>{moving ? 'graf se spreminja v naslednji prizor' : '↓ naprej drsi: graf se bo spremenil'}</em>
                </div>}
            </section>;
        })}
        <div className="ux-scroll-end">Konec lekcije. Graf ostane v zadnjem prizoru.</div>
    </div>;
}
