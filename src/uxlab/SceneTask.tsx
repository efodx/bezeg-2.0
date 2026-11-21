import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {coverBoard, findMainBoard, recoverBoards, type UxBoard} from './board';
import {bloom} from './MatchChallenge';
import {readouts} from './SliderTrace';
import './uxlab.css';

const SAMPLES = 13;
const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});
const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

/** Two significant digits, Slovenian decimal comma: a target a person can hold in their head. */
function nice(value: number): number {
    if (value === 0) return 0;
    const magnitude = 10 ** (Math.floor(Math.log10(Math.abs(value))) - 1);
    return Math.round(value / magnitude) * magnitude;
}
function say(value: number): string {
    const rounded = Number(value.toPrecision(Math.abs(value) >= 100 ? 4 : 3));
    return String(rounded).replace('.', ',').replace('-', '−');
}

interface Slider { input: HTMLInputElement; name: string }
interface Task {
    slider: Slider;
    label: string;
    target: number;
    tolerance: number;
    solution: number;
    attempts: number;
    phase: 'solving' | 'right' | 'shown';
    current?: number;
}

function sliders(): Slider[] {
    return [...document.querySelectorAll<HTMLElement>('#workspace-inspector .slider-field')].flatMap(field => {
        const input = field.querySelector<HTMLInputElement>('input[type=range]');
        if (!input || input.disabled || field.offsetParent === null || /velikost elementov/i.test(field.textContent ?? '')) return [];
        const name = (field.querySelector('.slider-label label, .form-label')?.textContent ?? '').replace(/,\s*vrednost.*$/i, '').trim();
        return name ? [{input, name}] : [];
    });
}

function setSlider(input: HTMLInputElement, value: number) {
    valueSetter?.call(input, String(value));
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
}

/** Board texts and inspector lines that show the readout: hidden while the learner estimates it from the drawing. */
function maskReadout(board: UxBoard, label: string, on: boolean) {
    // The same quantity may appear under other labels ("napaka |f(x) − Tₙ(x)|" on the board, "Napaka f(x) − Tₙ(x)" in the list).
    const labels = new Set([label]);
    if (on) {
        const all = readouts(board);
        const value = all.get(label);
        if (value !== undefined) for (const [other, reading] of all) if (Math.abs(reading - value) <= 1e-9 + 1e-4 * Math.abs(value)) labels.add(other);
    }
    const shows = (text: string) => { const plain = text.replace(/ /g, ' '); return /=/.test(plain) && [...labels].some(item => plain.includes(item)); };
    for (const element of board.objectsList) {
        if (element.elType !== 'text' || !element.rendNode) continue;
        const node = element.rendNode as HTMLElement;
        const hit = on && shows(node.textContent ?? '');
        node.classList.toggle('ux-task-masked', hit);
    }
    document.querySelectorAll<HTMLElement>('#workspace-inspector li:not(.readout-list-row), #workspace-inspector p, #workspace-inspector td').forEach(node => {
        node.classList.toggle('ux-task-masked', on && shows(node.textContent ?? ''));
    });
    document.querySelectorAll<HTMLElement>('#workspace-inspector .readout-list-row').forEach(row => {
        const hit = on && labels.has((row.firstElementChild?.textContent ?? '').replace(/\s+/g, ' ').trim());
        row.lastElementChild?.classList.toggle('ux-task-masked', hit);
    });
}

/**
 * Lane B b19: every scene makes its own exercises. The prototype walks one slider behind a cover, reads every
 * "label = number" the scene shows, and asks for a value the scene really reaches ("Nastavi točko x tako, da bo napaka
 * 0,5"). The readout is hidden, so the learner estimates it from the drawing, commits with Preveri, and only then sees
 * the number. Any setting that reaches the target counts, however the learner got there.
 */
export function SceneTask(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [available, setAvailable] = useState(false);
    const [task, setTask] = useState<Task>();
    const [busy, setBusy] = useState(false);
    const [streak, setStreak] = useState(0);
    const [phone, setPhone] = useState(false);
    const [message, setMessage] = useState('');
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const recent = useRef<string[]>([]);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
            setAvailable(sliders().length > 0);
            setPhone(window.matchMedia('(max-width: 700px)').matches);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    // Keep the readout hidden while solving: the board redraws its texts on every update.
    useEffect(() => {
        if (!board || !task) return;
        const apply = () => maskReadout(board, task.label, task.phase === 'solving');
        apply();
        const timer = window.setInterval(apply, 60);
        return () => { window.clearInterval(timer); maskReadout(board, task.label, false); };
    }, [board, task]);

    const generate = async () => {
        if (!board || busy) return;
        let base: LessonSceneCheckpoint;
        try { base = caps.current.captureState(); } catch { return; }
        setBusy(true);
        setMessage('');
        setTask(undefined);
        const cover = coverBoard(board.containerObj);
        const candidates = sliders().sort(() => Math.random() - 0.5);
        let made: Task | undefined;
        for (const slider of candidates) {
            const {input} = slider;
            const min = Number(input.min), max = Number(input.max), step = Number(input.step) || 0;
            const start = Number(input.value);
            const values = Array.from({length: SAMPLES}, (_, index) => {
                const raw = min + (max - min) * index / (SAMPLES - 1);
                return step ? Math.min(max, Math.round((raw - min) / step) * step + min) : raw;
            });
            const rows: Map<string, number>[] = [];
            const key = () => { try { return JSON.stringify(caps.current.captureState().value); } catch { return ''; } };
            let previous = key();
            for (const value of values) {
                try {
                    setSlider(input, value);
                    await nextFrames(2);
                    recoverBoards();
                    const state = key();
                    rows.push(state === previous && value !== start ? new Map() : readouts(board));
                    previous = state;
                } catch { recoverBoards(); rows.push(new Map()); }
            }
            try { caps.current.restoreState(base); } catch { recoverBoards(); }
            await nextFrames(2);
            const labels = [...new Set(rows.flatMap(row => [...row.keys()]))].filter(label => !recent.current.includes(`${slider.name}|${label}`));
            const usable = labels.map(label => ({label, series: rows.map(row => row.get(label))})).filter(item => {
                const defined = item.series.filter((value): value is number => value !== undefined);
                if (defined.length < SAMPLES * 0.6 || new Set(defined.map(value => value.toFixed(6))).size < 4) return false;
                // Not the slider's own value under another name.
                return !item.series.every((value, index) => value === undefined || Math.abs(value - values[index]) < 1e-6 * Math.max(1, Math.abs(values[index])));
            });
            if (usable.length === 0) continue;
            const choice = usable[Math.floor(Math.random() * usable.length)];
            const here = values.reduce((best, value, index) => Math.abs(value - start) < Math.abs(values[best] - start) ? index : best, 0);
            const indices = choice.series.map((value, index) => ({value, index}))
                .filter((item): item is {value: number; index: number} => item.value !== undefined && Math.abs(item.index - here) >= 3 && item.index > 0 && item.index < SAMPLES - 1);
            if (indices.length === 0) continue;
            const pick = indices[Math.floor(Math.random() * indices.length)];
            const defined = choice.series.filter((value): value is number => value !== undefined);
            const range = Math.max(...defined) - Math.min(...defined);
            const target = nice(pick.value);
            made = {slider, label: choice.label, target, tolerance: Math.max(Math.abs(target) * 0.08, range * 0.01, Math.abs(target - pick.value) * 1.5), solution: values[pick.index], attempts: 0, phase: 'solving'};
            recent.current = [...recent.current.slice(-3), `${slider.name}|${choice.label}`];
            break;
        }
        recoverBoards();
        cover.remove();
        setBusy(false);
        if (!made) { setMessage('V tem prizoru ne najdem odčitka, ki bi ga lahko nastavil z drsnikom.'); return; }
        (window as unknown as {__uxTask?: unknown}).__uxTask = {solution: made.solution, target: made.target, label: made.label};
        setTask(made);
        made.slider.input.closest<HTMLElement>('.slider-field')?.classList.add('ux-task-slider');
        window.setTimeout(() => made?.slider.input.closest<HTMLElement>('.slider-field')?.classList.remove('ux-task-slider'), 2400);
    };

    const check = () => {
        if (!board || !task) return;
        const value = readouts(board).get(task.label);
        if (value === undefined) { setTask({...task, current: undefined}); setMessage('Odčitka trenutno ni na grafu.'); return; }
        if (Math.abs(value - task.target) <= task.tolerance) {
            setTask({...task, phase: 'right', current: value});
            setStreak(streak + 1);
            bloom(board.containerObj);
            return;
        }
        const attempts = task.attempts + 1;
        setTask({...task, attempts, current: value, phase: attempts >= 2 ? 'shown' : 'solving'});
        if (attempts < 2) setMessage(value > task.target ? 'Preveč. Poglej graf še enkrat in popravi.' : 'Premalo. Poglej graf še enkrat in popravi.');
        else setStreak(0);
    };

    const showSolution = () => {
        if (!task) return;
        setSlider(task.slider.input, task.solution);
        window.setTimeout(() => { if (board) setTask(current => current && {...current, current: readouts(board).get(current.label)}); }, 120);
    };

    if (!board || props.locked || !available) return null;
    const host = board.containerObj;
    if (!task) return createPortal(<div className={`ux-task-dock${phone ? ' is-phone' : ''}`}>
        <button type="button" className="ux-task-open" disabled={busy} onClick={() => void generate()}>{busy ? 'Sestavljam nalogo …' : '🎯 Naloga'}</button>
        {message && <span className="ux-task-message">{message}</span>}
    </div>, host);

    const card = <div className={`ux-task${phone ? ' is-sheet' : ''}`} role="region" aria-label="Naloga iz prizora" aria-live="polite">
        <div className="ux-task-head">
            <strong>🎯 Naloga{streak > 0 ? ` · niz ${streak}` : ''}</strong>
            <button type="button" className="ux-task-close" aria-label="Zapri nalogo" onClick={() => { setTask(undefined); setMessage(''); }}>✕</button>
        </div>
        <p className="ux-task-text">Nastavi drsnik <b>»{task.slider.name}«</b> tako, da bo <b>{task.label} = {say(task.target)}</b>.</p>
        {task.phase === 'solving' && <p className="ux-task-hint">{message || 'Odčitek je skrit: oceni ga z grafa, nato preveri.'}</p>}
        {task.phase === 'right' && <p className="ux-task-ok">Zadetek! {task.label} = {say(task.current!)}.</p>}
        {task.phase === 'shown' && <p className="ux-task-hint">Zdaj je {task.label} = {say(task.current ?? NaN)}. Cilj doseže na primer pri {task.slider.name.split(' ').pop()} = {say(task.solution)}.</p>}
        <div className="ux-task-actions">
            {task.phase === 'solving' && <button type="button" className="ux-task-primary" onClick={check}>Preveri</button>}
            {task.phase === 'shown' && <button type="button" onClick={showSolution}>Pokaži rešitev na grafu</button>}
            <button type="button" className={task.phase === 'solving' ? '' : 'ux-task-primary'} onClick={() => void generate()}>{busy ? '…' : 'Nova naloga'}</button>
        </div>
    </div>;
    return createPortal(card, phone ? document.body : host);
}
