import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {findMainBoard, recoverBoards, type UxBoard} from './board';
import {applyRow} from './fan';
import {bindings, findRow, format, livePicture, namedSymbol, type Binding} from './LiveProse';
import './uxlab.css';

/** One-letter words of Slovenian prose: never read as a quantity in plain text. */
const WORDS = new Set(['v', 'z', 's', 'k', 'o', 'a', 'i', 'u']);
const IMPERATIVE = /^(premakni|premikaj|spremeni|spreminjaj|povleci|povečaj|zmanjšaj|nastavi|primerjaj|opazuj|preizkusi|poskusi|izberi|vrti|zavrti|pomakni|dvigni|spusti)/i;

interface Step { binding: Binding; anchor?: Element }

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

/** The quantities a prompt names, in reading order: rendered symbols, or "noun x" in plain text. */
function namedQuantities(prompt: Element, symbols: Map<string, Binding>): Step[] {
    const found: {at: number; step: Step}[] = [];
    const text = prompt.textContent ?? '';
    const seen = new Set<string>();
    prompt.querySelectorAll('mjx-container').forEach(container => {
        const symbol = namedSymbol(container);
        if (!symbol || !symbols.has(symbol) || seen.has(symbol)) return;
        seen.add(symbol);
        found.push({at: text.indexOf(container.textContent ?? '\u0000'), step: {binding: symbols.get(symbol)!, anchor: container}});
    });
    if (!prompt.querySelector('mjx-container')) {
        for (const [symbol, binding] of symbols) {
            if (seen.has(symbol)) continue;
            const label = binding.control?.querySelector?.('.count-setter-label')?.textContent ?? (binding.control instanceof HTMLInputElement ? binding.control.labels?.[0]?.textContent : '') ?? '';
            const stem = label.trim().split(/\s+/)[0]?.slice(0, 4).toLowerCase();
            const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // "središče c", "stopnjo n": the label's noun before the letter; a bare letter only when it is not a word.
            const withNoun = stem && stem.length >= 3 ? new RegExp(`${stem}\\p{L}*\\s+${escaped}(?![\\p{L}])`, 'iu').exec(text) : null;
            const bare = WORDS.has(symbol) ? null : new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'u').exec(text);
            const match = withNoun ?? bare;
            if (!match) continue;
            seen.add(symbol);
            found.push({at: match.index, step: {binding}});
        }
    }
    return found.sort((a, b) => a.at - b.at).map(item => item.step).slice(0, 3);
}

function promptBlocks(board: UxBoard | undefined): HTMLElement[] {
    const blocks: HTMLElement[] = [];
    document.querySelectorAll<HTMLElement>('.workspace-learning p').forEach(block => blocks.push(block));
    document.querySelectorAll<HTMLElement>('p, li').forEach(block => {
        if (board?.containerObj.contains(block) || block.closest('.workspace-learning, #workspace-inspector, .uxlab-page, header, nav')) return;
        if (!block.querySelector('mjx-container') || !IMPERATIVE.test((block.textContent ?? '').trim())) return;
        blocks.push(block);
    });
    return blocks;
}

/**
 * Lane B b15: "Pokaži mi", a ghost hand that demonstrates a prompt. Any instruction that names quantities ("Premakni
 * središče c in spremeni stopnjo n") gets a small button; the hand then reaches for each named slider or stepper (or the
 * letter in the text when the inspector is hidden), sweeps it while the graph moves, and puts everything back.
 */
export function GhostHand(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities}) {
    const [board, setBoard] = useState<UxBoard>();
    const [hand, setHand] = useState<{x: number; y: number; pressed: boolean; label: string; visible: boolean}>();
    const playing = useRef<{cancelled: boolean; base: LessonSceneCheckpoint} | undefined>();
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
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

    useEffect(() => {
        if (!board) return;
        const picture = livePicture(board);
        let symbols = new Map<string, Binding>();

        const play = async (button: HTMLButtonElement, steps: Step[]) => {
            if (playing.current) { playing.current.cancelled = true; return; }
            let base: LessonSceneCheckpoint;
            try { base = caps.current.captureState(); } catch { return; }
            const run = {cancelled: false, base};
            playing.current = run;
            button.classList.add('is-playing');
            button.textContent = 'Ustavi';
            picture.show();
            const lesson = Boolean(document.querySelector('.demonstration-workspace.lesson-content'));
            try {
                for (const {binding, anchor} of steps) {
                    if (run.cancelled) break;
                    const row = findRow(base.value, board, binding.key);
                    if (!row) continue;
                    const start = row.leaves[0].value;
                    const control = !lesson && binding.control && binding.control.offsetParent !== null ? binding.control : undefined;
                    const span = binding.max - binding.min;
                    const whole = binding.step >= 1;
                    // A sweep you can see but not a different example: about a quarter of the range, and never across
                    // zero from a nonzero value (b ≠ 0 in f(b x)): downwards it stops at a quarter of the value.
                    const reach = whole ? Math.max(2 * binding.step, Math.round(0.25 * Math.abs(start))) : start !== 0 ? Math.min(0.25 * span, Math.max(0.6 * Math.abs(start), 0.1 * span)) : 0.2 * span;
                    const down = !whole && start !== 0 && binding.min < 0 && binding.max > 0 ? Math.min(reach, 0.75 * Math.abs(start)) : reach;
                    const name = binding.symbol;
                    const where = (value: number): {x: number; y: number} => {
                        if (control instanceof HTMLInputElement) {
                            const rect = control.getBoundingClientRect();
                            return {x: rect.left + 8 + (rect.width - 16) * (value - binding.min) / (span || 1), y: rect.top + rect.height / 2};
                        }
                        if (control) {
                            const buttons = control.querySelectorAll<HTMLElement>('button');
                            const target = value >= start ? buttons[buttons.length - 1] : buttons[0];
                            const rect = (target ?? control).getBoundingClientRect();
                            return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
                        }
                        const element = anchor ?? board.containerObj;
                        const rect = element.getBoundingClientRect();
                        const offset = anchor ? (value - start) / (reach || 1) * 46 : (value - start) / (reach || 1) * rect.width * 0.25;
                        return {x: rect.left + rect.width / 2 + offset, y: anchor ? rect.top + rect.height / 2 : rect.bottom - 30};
                    };
                    control?.scrollIntoView?.({block: 'nearest', behavior: 'smooth'});
                    const first = where(start);
                    setHand({...first, pressed: false, label: `${name} = ${format(start)}`, visible: true});
                    await wait(520);
                    if (run.cancelled) break;
                    setHand(current => current && {...current, pressed: true});
                    await wait(160);
                    const duration = 2100;
                    const began = performance.now();
                    let last = start;
                    while (!run.cancelled) {
                        const t = (performance.now() - began) / duration;
                        if (t >= 1) break;
                        const wave = Math.sin(t * 2 * Math.PI);
                        let value = start + (wave >= 0 ? reach : down) * wave;
                        if (whole) value = start + Math.round((value - start) / binding.step) * binding.step;
                        else if (binding.step) value = binding.min + Math.round((value - binding.min) / binding.step) * binding.step;
                        value = Math.min(binding.max, Math.max(binding.min, Number(value.toFixed(9))));
                        if (value !== last) {
                            try { caps.current.restoreState({version: 1, value: applyRow(base.value, row, value - start)}); last = value; } catch { recoverBoards(); }
                        }
                        const at = where(last);
                        setHand({...at, pressed: !whole || Math.round(t * 16) % 4 !== 0, label: `${name} = ${format(last)}`, visible: true});
                        await new Promise(resolve => requestAnimationFrame(resolve));
                    }
                    try { caps.current.restoreState(base); } catch { recoverBoards(); }
                    setHand(current => current && {...current, pressed: false, label: `${name} = ${format(start)}`});
                    await wait(380);
                }
            } finally {
                try { caps.current.restoreState(base); } catch { recoverBoards(); }
                setHand(current => current && {...current, visible: false});
                window.setTimeout(() => setHand(undefined), 300);
                picture.hide();
                button.classList.remove('is-playing');
                button.textContent = '✋ Pokaži mi';
                playing.current = undefined;
            }
        };

        const decorate = () => {
            let checkpoint: LessonSceneCheckpoint;
            try { checkpoint = caps.current.captureState(); } catch { return; }
            if (!playing.current) symbols = bindings(checkpoint, board);
            for (const block of promptBlocks(board)) {
                const existing = block.querySelector<HTMLButtonElement>(':scope > .ux-hand-button');
                const steps = namedQuantities(block, symbols);
                if (steps.length === 0) { existing?.remove(); continue; }
                const signature = steps.map(step => step.binding.symbol).join(',');
                if (existing && existing.dataset.uxSteps === signature) continue;
                existing?.remove();
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ux-hand-button';
                button.dataset.uxSteps = signature;
                button.textContent = '✋ Pokaži mi';
                button.title = `Pokaže, kako premikati ${signature}`;
                button.addEventListener('click', event => {
                    event.stopPropagation();
                    void play(button, namedQuantities(block, symbols));
                });
                block.appendChild(button);
            }
        };
        decorate();
        const timer = window.setInterval(decorate, 900);
        return () => {
            window.clearInterval(timer);
            if (playing.current) playing.current.cancelled = true;
            picture.hide();
            document.querySelectorAll('.ux-hand-button').forEach(button => button.remove());
        };
    }, [board]);

    if (!hand) return null;
    return createPortal(<div className={`ux-hand ${hand.pressed ? 'is-pressed' : ''} ${hand.visible ? '' : 'is-leaving'}`} style={{left: hand.x, top: hand.y}} aria-hidden="true">
        <svg viewBox="0 0 40 48" width="40" height="48">
            <path d="M14 22V7.5a3 3 0 0 1 6 0V20 M20 18.5V5a3 3 0 0 1 6 0v14 M26 19V8.5a3 3 0 0 1 6 0v17c0 9-5.5 15-13.5 15-5.5 0-9-2.6-11.6-7.6L3 24.6a3 3 0 0 1 4.9-3.4L14 27"
                fill="#fffdf5" stroke="#5d3b6e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>{hand.label}</span>
    </div>, document.body);
}
