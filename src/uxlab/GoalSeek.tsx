import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {coverBoard, findMainBoard, recoverBoards, type UxBoard} from './board';
import {readouts} from './SliderTrace';
import './uxlab.css';

const SAMPLES = 25;
const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});
const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
const plain = (text: string) => text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('sl');
const say = (value: number) => String(Number(value.toPrecision(Math.abs(value) >= 100 ? 5 : 4))).replace('.', ',').replace('-', '−');

interface Slider { input: HTMLInputElement; name: string; letter: string; min: number; max: number; step: number }
interface Stepper { field: HTMLElement; input: HTMLInputElement; name: string; letter: string; plus: HTMLButtonElement; minus: HTMLButtonElement }

function controls(): {sliders: Slider[]; steppers: Stepper[]} {
    const sliders: Slider[] = [], steppers: Stepper[] = [];
    // "Lega točke P (t, stopinje)" → t; "Središče c" → c.
    const letterOf = (name: string) => (name.match(/\(([a-zA-Zα-ωΑ-Ω])[,)]/)?.[1] ?? name.match(/\s([a-zA-Zα-ωΑ-Ω])(?:\s*\(.*\))?$/)?.[1] ?? '').toLocaleLowerCase('sl');
    document.querySelectorAll<HTMLElement>('#workspace-inspector .slider-field').forEach(field => {
        const input = field.querySelector<HTMLInputElement>('input[type=range]');
        if (!input || input.disabled || field.offsetParent === null || /velikost elementov/i.test(field.textContent ?? '')) return;
        const name = (field.querySelector('.slider-label label, .form-label')?.textContent ?? '').replace(/,\s*vrednost.*$/i, '').trim();
        sliders.push({input, name, letter: letterOf(name), min: Number(input.min), max: Number(input.max), step: Number(input.step) || 0});
    });
    // Count setters (the catalogue's CountSetter): a label, a number field between − and + buttons.
    document.querySelectorAll<HTMLElement>('#workspace-inspector .count-setter').forEach(field => {
        if (field.offsetParent === null) return;
        const buttons = [...field.querySelectorAll<HTMLButtonElement>('.count-setter-button')];
        const input = field.querySelector<HTMLInputElement>('input');
        if (buttons.length < 2 || !input) return;
        const name = field.querySelector('.count-setter-label')?.textContent?.trim() ?? '';
        steppers.push({field, input, name, letter: letterOf(name), plus: buttons[buttons.length - 1], minus: buttons[0]});
    });
    return {sliders, steppers};
}

function setSlider(slider: Slider, value: number) {
    const snapped = slider.step ? Math.round((value - slider.min) / slider.step) * slider.step + slider.min : value;
    valueSetter?.call(slider.input, String(Math.min(slider.max, Math.max(slider.min, Number(snapped.toFixed(9))))));
    slider.input.dispatchEvent(new Event('input', {bubbles: true}));
    slider.input.dispatchEvent(new Event('change', {bubbles: true}));
}

function glide(slider: Slider, to: number, done?: () => void) {
    const from = Number(slider.input.value), start = performance.now(), duration = 700;
    const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration), eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        setSlider(slider, from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(tick); else done?.();
    };
    requestAnimationFrame(tick);
}

const parseNumber = (text: string) => {
    const value = Number(text.trim().replace('−', '-').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(value) ? value : undefined;
};

/**
 * Lane B b21: a command line for any graph. "x = 2" sets a quantity by its letter or name; "napaka = 0,1" is a goal
 * seek (Excel's, for a graph): every slider is walked behind a cover, the readout's crossing of the target is found and
 * refined by the secant method on the real scene, and the slider glides there. The answer names the slider and value.
 */
export function GoalSeek(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [text, setText] = useState('');
    const [answer, setAnswer] = useState<{ok: boolean; text: string}>();
    const [busy, setBusy] = useState(false);
    const [examples, setExamples] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const field = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    // Examples from what the scene shows now: one quantity, one readout.
    useEffect(() => {
        if (!board || !open) return;
        const {sliders, steppers} = controls();
        const list: string[] = [];
        const stepper = steppers.find(item => item.letter);
        if (stepper) list.push(`${stepper.letter} = ${Math.min(9, (parseNumber(stepper.input.value) ?? 1) + 3)}`);
        const slider = sliders.find(item => item.letter);
        if (slider) { const raw = slider.min + (slider.max - slider.min) * 0.75; list.push(`${slider.letter} = ${say(slider.step ? Math.round((raw - slider.min) / slider.step) * slider.step + slider.min : raw)}`); }
        const names = new Set([...sliders, ...steppers].flatMap(item => [plain(item.name), item.letter]));
        const reading = [...readouts(board)].find(([label]) => label.length <= 28 && !names.has(plain(label)) && !/^[a-zα-ω]$/i.test(label) && !/^(stopnja|središče|točka|število|meja)/i.test(label));
        if (reading) list.push(`${reading[0]} = ${say(Number((reading[1] / 2).toPrecision(2)))}`);
        setExamples(list.slice(0, 3));
    }, [board, open]);

    const run = async (command: string) => {
        if (!board || busy) return;
        const match = command.match(/^(.+?)\s*(?:=|≈|:)\s*([−-]?\s*[\d.,]+)\s*$/);
        if (!match) { setAnswer({ok: false, text: 'Zapiši ukaz v obliki »oznaka = število«, na primer »x = 2« ali »napaka = 0,1«.'}); return; }
        const want = plain(match[1]), target = parseNumber(match[2]);
        if (target === undefined) { setAnswer({ok: false, text: 'Desno od enačaja mora biti število.'}); return; }
        const {sliders, steppers} = controls();
        // 1. A quantity by its letter or by its name.
        const slider = sliders.find(item => item.letter === want || plain(item.name) === want || plain(item.name).startsWith(`${want} `));
        if (slider) {
            if (target < slider.min || target > slider.max) { setAnswer({ok: false, text: `${slider.name} sega od ${say(slider.min)} do ${say(slider.max)}.`}); return; }
            glide(slider, target);
            setAnswer({ok: true, text: `${slider.name} → ${say(target)}`});
            return;
        }
        const stepper = steppers.find(item => item.letter === want || plain(item.name) === want);
        if (stepper) {
            const goal = Math.round(target);
            let guard = 60;
            const click = () => {
                const value = parseNumber(stepper.input.value);
                if (value === undefined || value === goal || guard-- <= 0) { setAnswer({ok: value === goal, text: value === goal ? `${stepper.name} → ${goal}` : `${stepper.name} ostane ${value ?? '?'}: ${goal} ni dovoljeno.`}); return; }
                (value < goal ? stepper.plus : stepper.minus).click();
                window.setTimeout(click, 90);
            };
            click();
            return;
        }
        // 2. A readout: goal seek over every slider.
        const labels = [...readouts(board).keys()];
        const label = labels.find(item => plain(item) === want) ?? labels.find(item => plain(item).includes(want)) ?? labels.find(item => plain(item).replace(/[^a-zčšž0-9]/g, '').includes(want.replace(/[^a-zčšž0-9]/g, '')));
        if (!label) { setAnswer({ok: false, text: `Na grafu ne najdem »${match[1].trim()}«. Poskusi s črko drsnika ali z imenom odčitka.`}); return; }
        let base: LessonSceneCheckpoint;
        try { base = caps.current.captureState(); } catch { return; }
        setBusy(true);
        setAnswer({ok: true, text: `Iščem, kateri drsnik da ${label} = ${say(target)} …`});
        const cover = coverBoard(board.containerObj);
        const read = async (item: Slider, value: number) => {
            setSlider(item, value);
            await nextFrames(2);
            recoverBoards();
            return readouts(board).get(label);
        };
        let best: {slider: Slider; value: number; reached: number; cost: number} | undefined;
        const ranges: string[] = [];
        let jump: {slider: Slider; at: number; below: number; above: number} | undefined;
        for (const item of sliders) {
            const start = Number(item.input.value);
            const xs = Array.from({length: SAMPLES}, (_, index) => item.min + (item.max - item.min) * index / (SAMPLES - 1));
            const ys: (number | undefined)[] = [];
            for (const x of xs) { try { ys.push(await read(item, x)); } catch { recoverBoards(); ys.push(undefined); } }
            try { caps.current.restoreState(base); } catch { recoverBoards(); }
            await nextFrames(1);
            const defined = ys.filter((y): y is number => y !== undefined);
            if (defined.length) ranges.push(`${item.name}: od ${say(Math.min(...defined))} do ${say(Math.max(...defined))}`);
            // Brackets of the crossing; the one closest to where the slider is now wins.
            for (let index = 0; index < SAMPLES - 1; index++) {
                const a = ys[index], b = ys[index + 1];
                if (a === undefined || b === undefined || (a - target) * (b - target) > 0 || a === b) continue;
                let x0 = xs[index], x1 = xs[index + 1], y0 = a - target, y1 = b - target;
                // Secant refinement on the real scene, inside the bracket.
                for (let iteration = 0; iteration < 5 && Math.abs(y1) > 1e-9; iteration++) {
                    const x2 = Math.min(Math.max(x1 - y1 * (x1 - x0) / (y1 - y0 || 1e-12), Math.min(xs[index], xs[index + 1])), Math.max(xs[index], xs[index + 1]));
                    const y2 = await read(item, x2).catch(() => undefined);
                    if (y2 === undefined) break;
                    x0 = x1; y0 = y1; x1 = x2; y1 = y2 - target;
                }
                try { caps.current.restoreState(base); } catch { recoverBoards(); }
                // A bracket around a jump is not a solution: the readout leaps over the target there.
                const span = Math.max(...defined) - Math.min(...defined);
                if (Math.abs(y1) > Math.max(0.02 * Math.abs(target), 0.01 * span, 1e-9)) {
                    jump ??= {slider: item, at: x1, below: Math.min(a, b), above: Math.max(a, b)};
                    continue;
                }
                const cost = Math.abs(x1 - start) / (item.max - item.min || 1);
                if (!best || cost < best.cost) best = {slider: item, value: x1, reached: y1 + target, cost};
            }
        }
        try { caps.current.restoreState(base); } catch { recoverBoards(); }
        await nextFrames(2);
        recoverBoards();
        cover.remove();
        setBusy(false);
        if (!best && jump) { setAnswer({ok: false, text: `${label} = ${say(target)} ni dosegljivo: pri ${jump.slider.letter || jump.slider.name} ≈ ${say(jump.at)} odčitek skoči z ${say(jump.below)} na ${say(jump.above)}.`}); return; }
        if (!best) { setAnswer({ok: false, text: `${label} = ${say(target)} ni dosegljivo z enim drsnikom. ${ranges.slice(0, 2).join('; ')}.`}); return; }
        const found = best;
        glide(found.slider, found.value, () => window.setTimeout(() => {
            const now = readouts(board).get(label);
            const value = now ?? found.reached;
            const exact = Math.abs(value - target) <= 1e-3 * Math.max(1, Math.abs(target));
            setAnswer({ok: true, text: `${exact ? '' : 'Najbližje, kar dopušča korak drsnika: '}${label} = ${say(value)} pri ${found.slider.letter || found.slider.name} = ${say(Number(found.slider.input.value))} (drsnik »${found.slider.name}«).`});
        }, 80));
    };

    if (!board || props.locked) return null;
    const host = board.containerObj;
    if (!open) return createPortal(<button type="button" className="ux-seek-open" onClick={() => { setOpen(true); window.setTimeout(() => field.current?.focus(), 30); }} title="Ukaz: nastavi količino ali poišči, kje odčitek doseže vrednost">⌨ Ukaz</button>, host);
    return createPortal(<form className="ux-seek" onSubmit={event => { event.preventDefault(); void run(text); }} onPointerDown={event => event.stopPropagation()}>
        <div className="ux-seek-row">
            <input ref={field} value={text} onChange={event => setText(event.target.value)} placeholder="npr. x = 2 ali napaka = 0,1" aria-label="Ukaz za graf" disabled={busy} enterKeyHint="go"/>
            <button type="submit" disabled={busy}>{busy ? '…' : 'Izvedi'}</button>
            <button type="button" className="ux-seek-close" aria-label="Zapri ukaz" onClick={() => { setOpen(false); setAnswer(undefined); }}>✕</button>
        </div>
        {answer ? <p className={`ux-seek-answer${answer.ok ? '' : ' is-error'}`} role="status">{answer.text}</p>
            : examples.length > 0 && <p className="ux-seek-examples">Primeri: {examples.map(example => <button type="button" key={example} onClick={() => { setText(example); void run(example); }}>{example}</button>)}</p>}
    </form>, host);
}
