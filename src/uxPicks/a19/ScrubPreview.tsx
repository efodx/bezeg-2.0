import React, {useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {asProbe, getParam, splitLabel, type ParamEntry} from '../a1/paramRegistry';
import {PRESENTATION_LABEL} from '../a1/ParamPucks';
import './ScrubPreview.css';

/**
 * Pick a19 (from ux-challenge/a, extended): look before you leap. Hover a slider's track and the board shows, as a dashed
 * amber ghost, the graph at the value under the pointer; click and the real graph jumps there. Extended to counts: hover
 * the − or + of any CountSetter (inspector or count puck) and the ghost shows the graph one step down or up.
 * Generic: the board is set to the hovered value, the changed shapes are cloned, and the live value is restored.
 */

interface JxgObject {id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean}}
interface JxgBoard {containerObj?: HTMLElement; objectsList: JxgObject[]; renderer: {svgRoot?: SVGSVGElement}; on(event: string, handler: () => void): void; off(event: string, handler: () => void): void}
interface Ghost {svg: SVGSVGElement; box: {width: number; height: number; left: number; top: number}}
interface Tip {x: number; y: number; text: string; note?: string}

const SKIPPED_TYPES = new Set([5, 18, 24]);
const DRAWN_TAGS = ['path', 'line', 'ellipse', 'circle', 'polygon', 'rect'];

function findBoard(frame: HTMLElement | null): JxgBoard | undefined {
    const boards = (window as unknown as {JXG?: {boards?: Record<string, JxgBoard>}}).JXG?.boards;
    if (!frame || !boards) return undefined;
    let best: JxgBoard | undefined;
    for (const board of Object.values(boards)) {
        const container = board.containerObj;
        if (!container || !container.isConnected || !frame.contains(container)) continue;
        if (!best || container.clientWidth * container.clientHeight > best.containerObj!.clientWidth * best.containerObj!.clientHeight) best = board;
    }
    return best;
}

const drawn = (board: JxgBoard) => board.objectsList.filter(object => object.rendNode && object.visPropCalc?.visible
    && !SKIPPED_TYPES.has(object.type) && object.elType !== 'axis' && object.elType !== 'text' && object.elType !== 'ticks'
    && DRAWN_TAGS.includes(object.rendNode.tagName.toLowerCase()));

const shapeSignature = (node: Element) => ['d', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'width', 'height', 'transform']
    .map(name => node.getAttribute(name) ?? '').join('|');

const symbolOf = (label: string) => splitLabel(label).symbol ?? (label.match(/\s(\S{1,2})$/)?.[1] ?? label);

const meaningful = (entry: ParamEntry | undefined): entry is ParamEntry => !!entry && !entry.display && !PRESENTATION_LABEL.test(entry.label)
    && (entry.kind === 'count' || entry.max > entry.min);

/** Runs `write` and waits until the board has redrawn. */
async function settle(board: JxgBoard, write: () => void) {
    let redrawn = false;
    const mark = () => { redrawn = true; };
    board.on('update', mark);
    try { asProbe(() => flushSync(write)); } finally { board.off('update', mark); }
    if (redrawn) return;
    await new Promise<void>(resolve => {
        let left = 4;
        const done = () => { board.off('update', done); resolve(); };
        const tick = () => { if (--left <= 0) done(); else requestAnimationFrame(tick); };
        board.on('update', done);
        requestAnimationFrame(tick);
    });
}

type Job = {kind: 'range'; input: HTMLInputElement; x: number} | {kind: 'count'; key: string; direction: 1 | -1; button: Element};

export function ScrubPreview(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [ghost, setGhost] = useState<Ghost>();
    const [tip, setTip] = useState<Tip>();
    const host = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let busy = false;
        let shown: string | undefined;
        let pending: Job | undefined;
        let raf = 0;
        const clear = () => { shown = undefined; pending = undefined; setGhost(undefined); setTip(undefined); };

        /** Sets the board to the probed value, clones what moved, and restores the live value. */
        const capture = async (board: JxgBoard, svg: SVGSVGElement, apply: () => void, restore: () => void) => {
            const before = new Map(drawn(board).map(object => [object.rendNode!.id, shapeSignature(object.rendNode!)]));
            let clone: SVGSVGElement;
            let changed: Set<string>;
            try {
                await settle(board, apply);
                clone = svg.cloneNode(true) as SVGSVGElement;
                changed = new Set(drawn(board).map(object => object.rendNode!).filter(node => before.get(node.id) !== shapeSignature(node)).map(node => node.id));
            } finally {
                await settle(board, restore);
            }
            clone.querySelectorAll('[id]').forEach(node => {
                const tag = node.tagName.toLowerCase();
                if (['path', 'line', 'ellipse', 'circle', 'polygon', 'rect', 'polyline'].includes(tag) && !changed.has(node.id)) node.remove();
            });
            clone.querySelectorAll('text, foreignObject, image').forEach(node => node.remove());
            clone.removeAttribute('id');
            const frame = props.frame.current!.getBoundingClientRect(), box = svg.getBoundingClientRect();
            setGhost(changed.size ? {svg: clone, box: {width: box.width, height: box.height, left: box.left - frame.left, top: box.top - frame.top}} : undefined);
        };

        const run = async () => {
            raf = 0;
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
                    setTip({x: tipX, y: rect.top, text: `${symbolOf(entry.label)} = ${entry.format(Number(value.toPrecision(6)))}`,
                        note: Math.abs(value - entry.value) < 1e-12 ? undefined : locked ? 'samo pogled: lekcija vodi ta drsnik' : 'klik: skoči sem'});
                    const id = `${entry.key}:${value}`;
                    if (shown === id) return;
                    shown = id;
                    if (Math.abs(value - entry.value) < 1e-12) { setGhost(undefined); return; }
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
                    if (blocked) { setGhost(undefined); return; }
                    const forward = job.direction > 0 ? () => entry.plus() : () => entry.minus();
                    const back = job.direction > 0 ? () => getParam(entry.key)?.kind === 'count' && (getParam(entry.key) as typeof entry).minus()
                        : () => getParam(entry.key)?.kind === 'count' && (getParam(entry.key) as typeof entry).plus();
                    await capture(board, svg, () => { forward(); }, () => { back(); });
                }
            } finally {
                busy = false;
                if (pending) raf = requestAnimationFrame(() => void run());
            }
        };
        const schedule = (job: Job) => { pending = job; if (!raf) raf = requestAnimationFrame(() => void run()); };

        const countJob = (target: Element | null): Job | undefined => {
            const button = target?.closest?.('.count-setter-button, .ux-count-step');
            const owner = button?.closest('[data-param]');
            const key = owner?.getAttribute('data-param');
            if (!button || !key || !getParam(key)) return undefined;
            return {kind: 'count', key, direction: button.textContent?.trim() === '+' ? 1 : -1, button};
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
            shown = undefined; setGhost(undefined); setTip(undefined);
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
            if (raf) cancelAnimationFrame(raf);
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
        {tip && <div className="ux-scrub-tip" style={{left: tip.x, top: tip.y}} role="status">
            {tip.text}{tip.note && <small>{tip.note}</small>}
        </div>}
    </>;
}
