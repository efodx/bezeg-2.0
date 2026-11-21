import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities} from '../learning/model';
import {findMainBoard, recoverBoards, type UxBoard} from './board';
import {clipFromHash, clipToHash, sceneAt, type Clip, type ClipFrame} from './clip';
import './uxlab.css';

type Phase = 'idle' | 'recording' | 'ready' | 'playing';

const MAX_MS = 20000;
const HASH = '#uxclip=';

function toUser(board: UxBoard, clientX: number, clientY: number): [number, number] | undefined {
    const rect = board.containerObj.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return undefined;
    const [left, top, right, bottom] = board.getBoundingBox();
    return [left + x / rect.width * (right - left), top - y / rect.height * (top - bottom)];
}

function toScreen(board: UxBoard, [x, y]: [number, number]): [number, number] {
    const rect = board.containerObj.getBoundingClientRect();
    const [left, top, right, bottom] = board.getBoundingBox();
    return [(x - left) / (right - left) * rect.width, (top - y) / (top - bottom) * rect.height];
}

const seconds = (ms: number) => `${Math.floor(ms / 1000)},${Math.floor(ms % 1000 / 100)} s`;

/**
 * Lane B b8: record a short manipulation of any graph, with a ghost fingertip where the hand was, give it a caption,
 * replay and scrub it, and share it as a link (the clip lives in the URL hash). A teacher's "watch this" or a student's
 * teach-back, with no server.
 */
export function ClipRecorder(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [phase, setPhase] = useState<Phase>('idle');
    const [clip, setClip] = useState<Clip>();
    const [time, setTime] = useState(0);
    const [caption, setCaption] = useState('');
    const [link, setLink] = useState('');
    const [message, setMessage] = useState('');
    const [shared, setShared] = useState(false);
    const frames = useRef<ClipFrame[]>([]);
    const started = useRef(0);
    const pointer = useRef<{at?: [number, number]; down: boolean}>({down: false});
    const playback = useRef(0);
    const finger = useRef<HTMLDivElement>(null);
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    useEffect(() => { if (!window.__uxLesson) window.__uxLesson = {capabilities: props.capabilities, session: undefined}; }, [props.capabilities]);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    const push = useCallback((force = false) => {
        const now = performance.now() - started.current;
        const last = frames.current[frames.current.length - 1];
        if (!force && last && now - last.t < 33) return;
        let value: unknown;
        try { value = props.capabilities.captureState().value; } catch { return; }
        frames.current.push({t: now, value, pointer: pointer.current.at, down: pointer.current.down});
    }, [props.capabilities]);

    const stopRecording = useCallback(() => {
        if (phaseRef.current !== 'recording') return;
        push(true);
        // Trim the idle tail: keep half a second after the last change of the scene.
        const all = frames.current;
        let lastChange = 0;
        for (let index = 1; index < all.length; index++) if (JSON.stringify(all[index].value) !== JSON.stringify(all[index - 1].value)) lastChange = index;
        const cutoff = all[lastChange].t + 500;
        const recorded = all.filter(frame => frame.t <= cutoff);
        if (recorded.length < 3) { setPhase('idle'); setMessage('Nič se ni premaknilo. Med snemanjem premikaj točke ali drsnike.'); return; }
        setClip({route: window.location.pathname, caption: '', frames: recorded});
        if (window.location.search.includes('uxdebug')) (window as unknown as {__uxClip: unknown}).__uxClip = recorded;
        setTime(recorded[recorded.length - 1].t);
        setPhase('ready');
    }, [push]);

    // Recording: every board update and pointer move becomes a frame (≈30 per second at most).
    useEffect(() => {
        if (!board || phase !== 'recording') return;
        const container = board.containerObj;
        // The graph writes its state after the host commits: read it a frame after the board moved.
        let pending = 0;
        const onUpdate = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; push(); }); };
        const onMove = (event: PointerEvent) => {
            // The way to the stop button is not part of the explanation.
            const onControls = event.target instanceof Element && Boolean(event.target.closest('.ux-clip, .ux-clip-entry'));
            pointer.current.at = onControls && !pointer.current.down ? undefined : toUser(board, event.clientX, event.clientY);
            onUpdate();
        };
        const onDown = (event: PointerEvent) => {
            if (event.target instanceof Element && event.target.closest('.ux-clip, .ux-clip-entry')) { pointer.current.at = undefined; return; }
            pointer.current.down = true;
            pointer.current.at = toUser(board, event.clientX, event.clientY);
            push(true);
        };
        const onUp = () => { pointer.current.down = false; push(true); };
        const onLeave = () => { if (!pointer.current.down) { pointer.current.at = undefined; push(); } };
        board.on('update', onUpdate);
        // The board captures the pointer while dragging, so moves are read on the window.
        window.addEventListener('pointermove', onMove, true);
        container.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointerup', onUp, true);
        container.addEventListener('pointerleave', onLeave);
        const timer = window.setInterval(() => {
            const elapsed = performance.now() - started.current;
            setTime(elapsed);
            if (elapsed >= MAX_MS) stopRecording();
        }, 100);
        return () => {
            board.off('update', onUpdate);
            window.removeEventListener('pointermove', onMove, true);
            container.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointerup', onUp, true);
            container.removeEventListener('pointerleave', onLeave);
            window.clearInterval(timer);
            cancelAnimationFrame(pending);
        };
    }, [board, phase, push, stopRecording]);

    const record = () => {
        frames.current = [];
        started.current = performance.now();
        pointer.current = {down: false};
        setMessage('');
        setLink('');
        setShared(false);
        setTime(0);
        setPhase('recording');
        push(true);
    };

    const show = useCallback((t: number) => {
        if (!clip || !board) return;
        const scene = sceneAt(clip, t);
        try { props.capabilities.restoreState({version: 1, value: scene.value}); } catch { recoverBoards(); }
        const dot = finger.current;
        if (dot) {
            if (scene.pointer) {
                const [x, y] = toScreen(board, scene.pointer);
                dot.style.translate = `${x}px ${y}px`;
                dot.classList.toggle('is-down', Boolean(scene.down));
                dot.style.opacity = '1';
            } else dot.style.opacity = '0';
        }
        setTime(t);
    }, [board, clip, props.capabilities]);

    const pause = useCallback(() => { cancelAnimationFrame(playback.current); if (phaseRef.current === 'playing') setPhase('ready'); }, []);

    const play = useCallback((from?: number) => {
        if (!clip) return;
        const end = clip.frames[clip.frames.length - 1].t;
        const start = from !== undefined ? from : time >= end - 1 ? 0 : time;
        const origin = performance.now() - start;
        setPhase('playing');
        const tick = (now: number) => {
            const t = now - origin;
            show(Math.min(t, end));
            if (t >= end) { setPhase('ready'); return; }
            playback.current = requestAnimationFrame(tick);
        };
        playback.current = requestAnimationFrame(tick);
    }, [clip, show, time]);
    useEffect(() => () => cancelAnimationFrame(playback.current), []);

    // A shared link opens straight into the player and plays once.
    useEffect(() => {
        if (!board || clip || !window.location.hash.startsWith(HASH)) return;
        let cancelled = false;
        void clipFromHash(window.location.hash.slice(HASH.length)).then(loaded => {
            if (cancelled) return;
            if (loaded.route !== window.location.pathname) { setMessage('Ta posnetek je bil posnet na drugem grafu.'); return; }
            setClip(loaded);
            if (window.location.search.includes('uxdebug')) (window as unknown as {__uxClip: unknown}).__uxClip = loaded.frames;
            setCaption(loaded.caption);
            setShared(true);
            setTime(0);
            setPhase('ready');
        }).catch(() => setMessage('Posnetka iz povezave ni bilo mogoče prebrati.'));
        return () => { cancelled = true; };
    }, [board, clip]);
    const autoplayed = useRef(false);
    useEffect(() => {
        if (!shared || !clip || autoplayed.current) return;
        autoplayed.current = true;
        show(0);
        const timer = window.setTimeout(() => play(0), 900);
        return () => window.clearTimeout(timer);
    }, [shared, clip, show, play]);

    // Touching the graph during playback hands it back to the learner.
    useEffect(() => {
        if (!board || phase !== 'playing') return;
        const container = board.containerObj;
        const onDown = (event: PointerEvent) => { if (event.target instanceof Element && !event.target.closest('.ux-clip')) pause(); };
        container.addEventListener('pointerdown', onDown, true);
        return () => container.removeEventListener('pointerdown', onDown, true);
    }, [board, phase, pause]);

    const share = async () => {
        if (!clip) return;
        try {
            const hash = await clipToHash({...clip, caption});
            const url = new URL(window.location.href);
            url.hash = HASH.slice(1) + hash;
            setLink(url.toString());
            try { await navigator.clipboard?.writeText(url.toString()); setMessage('Povezava je kopirana.'); } catch { setMessage('Kopiraj povezavo spodaj.'); }
        } catch { setMessage('Posnetka ni bilo mogoče zapakirati v povezavo.'); }
    };

    const discard = () => {
        pause();
        setClip(undefined);
        setPhase('idle');
        setLink('');
        setCaption('');
        setShared(false);
        if (window.location.hash.startsWith(HASH)) history.replaceState(null, '', window.location.pathname + window.location.search);
    };

    if (!board || props.locked) return null;
    const end = clip ? clip.frames[clip.frames.length - 1].t : 0;
    const showFinger = phase === 'playing' || (phase === 'ready' && time > 0 && time < end);
    const ui = <>
        {phase === 'idle' && <div className="ux-clip-entry">
            <button type="button" className="ux-clip-open" onClick={record}><span className="ux-clip-dot" aria-hidden="true"/>Posnemi</button>
            {message && <span className="ux-match-message">{message}</span>}
        </div>}
        {phase === 'recording' && <div className="ux-clip ux-clip-rec" role="status">
            <span className="ux-clip-dot is-live" aria-hidden="true"/>
            <span>Snemam · {seconds(time)}</span>
            <span className="ux-long">Premikaj točke in drsnike.</span>
            <button type="button" className="ux-primary" onClick={stopRecording}>Ustavi</button>
        </div>}
        {(phase === 'ready' || phase === 'playing') && clip && <div className={`ux-clip ux-clip-player${phase === 'playing' ? ' is-playing' : ''}`} role="group" aria-label="Posnetek">
            {shared && <div className="ux-clip-kicker">Posnetek</div>}
            <div className="ux-clip-row">
                <button type="button" className="ux-clip-play" aria-label={phase === 'playing' ? 'Premor' : 'Predvajaj'} onClick={() => phase === 'playing' ? pause() : play()}>
                    {phase === 'playing'
                        ? <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/></svg>
                        : <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M6 4 L16 10 L6 16 Z" fill="currentColor"/></svg>}
                </button>
                <input type="range" className="ux-clip-scrub" min={0} max={Math.round(end)} step={10} value={Math.round(time)} aria-label="Čas posnetka"
                    onChange={event => { pause(); show(Number(event.target.value)); }}/>
                <span className="ux-clip-time">{seconds(time)}</span>
            </div>
            {!shared && <input className="ux-clip-caption" placeholder="Napis, npr. »Glej, kaj naredi c.«" value={caption} maxLength={120} onChange={event => setCaption(event.target.value)}/>}
            <div className="ux-clip-actions">
                {!shared && <button type="button" className="ux-primary" onClick={() => void share()}>Deli povezavo</button>}
                {!shared && <button type="button" onClick={record}>Znova</button>}
                {shared && <button type="button" className="ux-primary" onClick={() => { setShared(false); setCaption(''); record(); }}>Odgovori s svojim posnetkom</button>}
                <button type="button" onClick={discard}>{shared ? 'Zapri' : 'Zavrzi'}</button>
            </div>
            {link && <input className="ux-clip-link" readOnly value={link} onFocus={event => event.currentTarget.select()} aria-label="Povezava do posnetka"/>}
            {message && phase !== 'playing' && <div className="ux-clip-message">{message}</div>}
        </div>}
        {(phase === 'playing' || phase === 'ready') && clip && caption && <div className={`ux-clip-subtitle${phase === 'playing' ? ' is-on' : ''}`}>{caption}</div>}
        <div ref={finger} className="ux-clip-finger" aria-hidden="true" style={{display: showFinger ? undefined : 'none'}}/>
    </>;
    return createPortal(ui, board.containerObj);
}
