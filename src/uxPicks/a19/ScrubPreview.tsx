import React, {useEffect, useRef, useState} from 'react';
import {getParam, splitLabel, type ParamEntry} from '../a1/paramRegistry';
import {captureGhost, findBoard, captureQueue, type Ghost, type JxgBoard} from './ghost';
import {PRESENTATION_LABEL} from '../a1/ParamPucks';
import './ScrubPreview.css';

/**
 * Pick a19 (from ux-challenge/a, extended): look before you leap. Hover a slider's track and the board shows, as a dashed
 * amber ghost, the graph at the value under the pointer; click and the real graph jumps there. Extended to counts: hover
 * the − or + of any CountSetter (inspector or count puck) and the ghost shows the graph one step down or up.
 * Generic: the board is set to the hovered value, the changed shapes are cloned, and the live value is restored.
 */

/** `below`: the tip hangs under the slider track, so it never covers the row's number field above it. */
interface Tip {x: number; y: number; text: string; note?: string; below?: boolean}

const symbolOf = (label: string) => splitLabel(label).symbol ?? (label.match(/\s(\S{1,2})$/)?.[1] ?? label);

const meaningful = (entry: ParamEntry | undefined): entry is ParamEntry => !!entry && !entry.display && !PRESENTATION_LABEL.test(entry.label)
    && (entry.kind === 'count' || entry.max > entry.min);

type Job = {kind: 'range'; input: HTMLInputElement; x: number} | {kind: 'count'; key: string; direction: 1 | -1; button: Element};

export function ScrubPreview(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [ghost, setGhost] = useState<Ghost>();
    const [tip, setTip] = useState<Tip>();
    const host = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let busy = false;
        let shown: string | undefined;
        let pending: Job | undefined;
        const queued = captureQueue(() => void run());
        let unghost = 0;
        const clear = () => { shown = undefined; pending = undefined; window.clearTimeout(unghost); unghost = 0; setGhost(undefined); setTip(undefined); };
        // A ghost with nothing to show (the pointer crosses the live value, or a bound) is withdrawn only if no ghost follows within
        // a moment, so crossing it does not blink the preview off and on.
        const showGhost = (next: Ghost | undefined) => {
            window.clearTimeout(unghost); unghost = 0;
            if (next) setGhost(next); else unghost = window.setTimeout(() => { unghost = 0; setGhost(undefined); }, 170);
        };

        /** Sets the board to the probed value, clones what moved, and restores the live value. */
        const capture = async (board: JxgBoard, svg: SVGSVGElement, apply: () => void, restore: () => void) => {
            showGhost(await captureGhost(props.frame.current!, board, svg, apply, restore));
        };

        const run = async () => {
            const job = pending;
            pending = undefined;
            if (!job || busy) return;
            const board = findBoard(props.frame.current);
            const svg = board?.renderer.svgRoot;
            if (!board || !svg) return;
            busy = true;
            try {
                if (job.kind === 'range') {
                    const entry = getParam(job.input.id);
                    if (!meaningful(entry) || entry.kind !== 'range') return;
                    const rect = job.input.getBoundingClientRect();
                    // The native thumb is centred on the value, so the usable track is inset by half a thumb on each side.
                    const inset = 8;
                    const fraction = Math.max(0, Math.min(1, (job.x - rect.left - inset) / Math.max(1, rect.width - 2 * inset)));
                    const raw = entry.min + fraction * (entry.max - entry.min);
                    const value = Math.round(Math.round((raw - entry.min) / entry.step) * entry.step * 1e9) / 1e9 + entry.min;
                    const tipX = rect.left + inset + (value - entry.min) / (entry.max - entry.min) * (rect.width - 2 * inset);
                    const locked = entry.inert || entry.unavailable !== undefined;
                    setTip({x: tipX, y: rect.bottom, below: true, text: `${symbolOf(entry.label)} = ${entry.format(Number(value.toPrecision(6)))}`,
                        note: Math.abs(value - entry.value) < 1e-12 ? undefined : locked ? 'samo pogled: lekcija vodi ta drsnik' : 'klik: skoči sem'});
                    const id = `${entry.key}:${value}`;
                    if (shown === id) return;
                    shown = id;
                    if (Math.abs(value - entry.value) < 1e-12) { showGhost(undefined); return; }
                    const start = entry.value;
                    await capture(board, svg, () => entry.setRaw(value), () => entry.setRaw(start));
                } else {
                    const entry = getParam(job.key);
                    if (!meaningful(entry) || entry.kind !== 'count') return;
                    const target = entry.value + job.direction;
                    const blocked = job.direction < 0 ? entry.min !== undefined && entry.value <= entry.min : entry.max !== undefined && entry.value >= entry.max;
                    const rect = job.button.getBoundingClientRect();
                    setTip({x: rect.left + rect.width / 2, y: rect.top, text: `${symbolOf(entry.label)} = ${entry.format(target)}`, note: blocked ? 'meja: naprej ne gre' : 'tako bo po kliku'});
                    const id = `${entry.key}:${target}`;
                    if (shown === id) return;
                    shown = id;
                    if (blocked) { showGhost(undefined); return; }
                    const forward = job.direction > 0 ? () => entry.plus() : () => entry.minus();
                    const back = job.direction > 0 ? () => getParam(entry.key)?.kind === 'count' && (getParam(entry.key) as typeof entry).minus()
                        : () => getParam(entry.key)?.kind === 'count' && (getParam(entry.key) as typeof entry).plus();
                    await capture(board, svg, () => { forward(); }, () => { back(); });
                }
            } finally {
                busy = false;
                if (pending) queued.poke();
            }
        };
        const schedule = (job: Job) => { pending = job; queued.poke(); };

        const countJob = (target: Element | null): Job | undefined => {
            const button = target?.closest?.('.count-setter-button, .ux-count-step');
            const owner = button?.closest('[data-param]');
            const key = owner?.getAttribute('data-param');
            if (!button || !key || !getParam(key)) return undefined;
            // Puck steps are icons and say their direction in data-step; the inspector's CountSetter buttons are the glyphs − and +.
            const step = button.getAttribute('data-step');
            const direction = step ? (Number(step) > 0 ? 1 : -1) : button.textContent?.trim() === '+' ? 1 : -1;
            return {kind: 'count', key, direction, button};
        };
        const move = (event: PointerEvent) => {
            if (event.pointerType === 'touch' || event.buttons !== 0) { if (shown || pending) clear(); return; }
            const target = event.target as Element | null;
            const input = target?.closest?.('input[type="range"]') as HTMLInputElement | null;
            if (input && getParam(input.id)) { schedule({kind: 'range', input, x: event.clientX}); return; }
            const count = countJob(target);
            if (count) { schedule(count); return; }
            if (shown || pending) clear();
        };
        // A click on the track jumps the real graph to the previewed value; a click on − or + does its own step.
        let jump: {key: string; value: number; x: number} | undefined;
        const down = (event: PointerEvent) => {
            const input = (event.target as Element | null)?.closest?.('input[type="range"]') as HTMLInputElement | null;
            const value = shown?.startsWith(`${input?.id}:`) ? Number(shown.slice(shown.lastIndexOf(':') + 1)) : undefined;
            jump = input && value !== undefined ? {key: input.id, value, x: event.clientX} : undefined;
            shown = undefined; window.clearTimeout(unghost); unghost = 0; setGhost(undefined); setTip(undefined);
        };
        const click = (event: MouseEvent) => {
            const input = (event.target as Element | null)?.closest?.('input[type="range"]');
            const entry = jump && getParam(jump.key);
            if (jump && entry?.kind === 'range' && input?.id === jump.key && Math.abs(event.clientX - jump.x) < 4) entry.set(jump.value);
            jump = undefined;
        };
        document.addEventListener('pointermove', move, {passive: true});
        document.addEventListener('pointerdown', down, {passive: true});
        document.addEventListener('click', click);
        return () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerdown', down);
            document.removeEventListener('click', click);
            queued.stop();
        };
    }, [props.frame]);

    useEffect(() => {
        const node = host.current;
        if (!node) return;
        node.replaceChildren();
        if (!ghost) return;
        ghost.svg.setAttribute('width', String(ghost.box.width));
        ghost.svg.setAttribute('height', String(ghost.box.height));
        node.appendChild(ghost.svg);
    }, [ghost]);

    return <>
        <div ref={host} className="ux-scrub-ghost" aria-hidden="true" style={ghost ? ghost.box : {display: 'none'}}/>
        {tip && <div className={`ux-scrub-tip${tip.below ? ' ux-scrub-tip-below' : ''}`} style={{left: tip.x, top: tip.y}} role="status">
            {tip.text}{tip.note && <small>{tip.note}</small>}
        </div>}
    </>;
}
