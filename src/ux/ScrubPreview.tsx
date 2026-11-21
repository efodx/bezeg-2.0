import React, {useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {getParam, splitLabel} from './paramRegistry';
import {drawn, meaningful} from './YourTurn';
import {settle, svgRootOf} from './family';
import './ScrubPreview.css';

/**
 * a19 — Look before you leap. Hover anywhere along a slider's track and the big board shows, as a dashed amber ghost,
 * the graph at the value under the pointer — before anything is changed. Sweep the pointer along the track and the
 * ghost sweeps through the family of curves; click and the real graph jumps to the ghost. Like the thumbnail preview
 * on a video's timeline, but drawn on the graph itself, so the graph stays the one place to look. Generic: every
 * `Slider` publishes itself to the shared registry under its input id; the board is set synchronously to the hovered
 * value, the changed shapes are cloned, and the live value is restored before the browser paints, so nothing flickers.
 */

interface Ghost { svg: SVGSVGElement; box: {width: number; height: number; left: number; top: number} }
interface Tip { x: number; y: number; text: string; locked: boolean }

const symbolOf = (label: string) => splitLabel(label).symbol ?? (label.match(/\s(\S{1,2})$/)?.[1] ?? label);
const shapeSignature = (node: Element) => ['d', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'width', 'height', 'transform']
    .map(name => node.getAttribute(name) ?? '').join('|');

export function ScrubPreview(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [ghost, setGhost] = useState<Ghost>();
    const [tip, setTip] = useState<Tip>();
    const host = useRef<HTMLDivElement>(null);
    const busy = useRef(false);
    const shown = useRef<{key: string; value: number} | undefined>(undefined);

    useEffect(() => {
        let pending: {input: HTMLInputElement; x: number} | undefined;
        let raf = 0;
        const clear = () => { shown.current = undefined; pending = undefined; setGhost(undefined); setTip(undefined); };
        const run = async () => {
            raf = 0;
            const job = pending;
            pending = undefined;
            if (!job || busy.current) return;
            const entry = getParam(job.input.id);
            const b = findBoard(props.frame.current);
            const svg = b && svgRootOf(b);
            if (!b || !svg || !meaningful(entry)) return;
            const rect = job.input.getBoundingClientRect();
            // The native thumb is centred on the value, so the usable track is inset by half a thumb on each side.
            const inset = 8;
            const fraction = Math.max(0, Math.min(1, (job.x - rect.left - inset) / Math.max(1, rect.width - 2 * inset)));
            const raw = entry.min + fraction * (entry.max - entry.min);
            const value = Math.round(Math.round((raw - entry.min) / entry.step) * entry.step * 1e9) / 1e9 + entry.min;
            const tipX = rect.left + inset + (value - entry.min) / (entry.max - entry.min) * (rect.width - 2 * inset);
            setTip({x: tipX, y: rect.top, text: `${symbolOf(entry.label)} = ${entry.format(Number(value.toPrecision(6)))}`, locked: entry.inert || entry.unavailable !== undefined});
            if (shown.current && shown.current.key === entry.key && Math.abs(shown.current.value - value) < 1e-12) return;
            if (Math.abs(value - entry.value) < 1e-12) { shown.current = {key: entry.key, value}; setGhost(undefined); return; }
            busy.current = true;
            const start = entry.value;
            try {
                const objects = drawn(b);
                const before = new Map(objects.map(object => [object.rendNode!.id, shapeSignature(object.rendNode!)]));
                await settle(b, [entry.key], [value]);
                const clone = svg.cloneNode(true) as SVGSVGElement;
                const changed = new Set(drawn(b).map(object => object.rendNode!).filter(node => before.get(node.id) !== shapeSignature(node)).map(node => node.id));
                await settle(b, [entry.key], [start]);
                // Keep only what this value would move; the still parts are on the live board already.
                clone.querySelectorAll('[id]').forEach(node => {
                    const tag = node.tagName.toLowerCase();
                    if (['path', 'line', 'ellipse', 'circle', 'polygon', 'rect', 'polyline'].includes(tag) && !changed.has(node.id)) node.remove();
                });
                clone.querySelectorAll('text, foreignObject, image').forEach(node => node.remove());
                clone.removeAttribute('id');
                const frame = props.frame.current!.getBoundingClientRect(), box = svg.getBoundingClientRect();
                shown.current = {key: entry.key, value};
                setGhost(changed.size ? {svg: clone, box: {width: box.width, height: box.height, left: box.left - frame.left, top: box.top - frame.top}} : undefined);
            } finally {
                busy.current = false;
                if (pending) raf = requestAnimationFrame(() => void run());
            }
        };
        const move = (event: PointerEvent) => {
            const input = (event.target as Element | null)?.closest?.('input[type="range"]') as HTMLInputElement | null;
            // Hover only: while the learner drags the thumb, the real graph is already moving.
            if (!input || event.pointerType === 'touch' || event.buttons !== 0 || !getParam(input.id)) {
                if (shown.current || pending) clear();
                return;
            }
            pending = {input, x: event.clientX};
            if (!raf) raf = requestAnimationFrame(() => void run());
        };
        const leave = (event: PointerEvent) => {
            if ((event.target as Element | null)?.closest?.('input[type="range"]')) clear();
        };
        // A click jumps the real graph to the ghost; the ghost then matches and disappears.
        // The native thumb geometry differs from our estimate by a few pixels, so a plain click lands exactly on the
        // previewed value (a drag that started with the click keeps the native value).
        let jump: {key: string; value: number; x: number} | undefined;
        const changed = (event: PointerEvent) => {
            const input = (event.target as Element | null)?.closest?.('input[type="range"]');
            jump = input && shown.current?.key === input.id ? {...shown.current, x: event.clientX} : undefined;
            shown.current = undefined; setGhost(undefined);
        };
        const click = (event: MouseEvent) => {
            const input = (event.target as Element | null)?.closest?.('input[type="range"]');
            if (jump && input?.id === jump.key && Math.abs(event.clientX - jump.x) < 4) getParam(jump.key)?.set(jump.value);
            jump = undefined;
        };
        document.addEventListener('click', click);
        document.addEventListener('pointermove', move, {passive: true});
        document.addEventListener('pointerout', leave, {passive: true});
        document.addEventListener('pointerdown', changed, {passive: true});
        return () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerout', leave);
            document.removeEventListener('pointerdown', changed);
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
            {tip.text}{ghost && <small>{tip.locked ? 'samo pogled: lekcija vodi ta drsnik' : 'klik: skoči sem'}</small>}
        </div>}
    </>;
}
