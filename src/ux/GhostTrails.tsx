import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {watchBoard} from './boardAccess';
import {useOscillators} from './oscillators';
import './GhostTrails.css';

/**
 * a2 — Long exposure. While your hand is on the mathematics (dragging a point, scrubbing a parameter, an oscillating
 * parameter), every board element that moves leaves a fading afterimage, so a sweep draws the whole family of curves,
 * a dragged point draws its locus, and a moving tangent draws its envelope. Works on any JSXGraph board: it watches the
 * rendered SVG of every moving element and clones what changed.
 */

const GEOMETRY_ATTRIBUTES = ['d', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'points'];
const SKIPPED_TYPES = new Set([5, 18, 24]); // ticks, text, grid
const MAX_GHOSTS = 220;
const SNAPSHOT_MS = 45;

interface Ghost { node: SVGElement; born: number; base: number }

function signature(node: Element): string {
    let out = node.tagName;
    for (const name of GEOMETRY_ATTRIBUTES) {
        const value = node.getAttribute(name);
        if (value !== null) out += `|${value}`;
    }
    return out;
}

type BoardObject = {id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean}; visProp?: {fixed?: boolean}};

export function GhostTrails(props: {frame: React.RefObject<HTMLDivElement>}) {
    const oscillating = useOscillators();
    const holdingRef = useRef(false);
    const [keep, setKeep] = useState(false);
    const keepRef = useRef(keep);
    keepRef.current = keep;
    const [count, setCount] = useState(0);
    const clearRef = useRef<() => void>(() => undefined);
    holdingRef.current = oscillating.size > 0;
    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        let pointerHeld = false;
        const down = () => { pointerHeld = true; };
        const up = () => { pointerHeld = false; };
        frame.addEventListener('pointerdown', down, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', up, true);
        const stop = watchBoard(frame, (board: Board) => {
            const renderer = (board as unknown as {renderer: {svgRoot?: SVGSVGElement; layer?: SVGGElement[]}}).renderer;
            const root = renderer.svgRoot;
            if (!root) return;
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'ux-ghosts');
            group.setAttribute('pointer-events', 'none');
            const anchor = renderer.layer?.[2] ?? null;
            root.insertBefore(group, anchor && anchor.parentNode === root ? anchor : root.firstChild?.nextSibling ?? null);
            const last = new Map<string, string>();
            const ghosts: Ghost[] = [];
            let lastSnapshot = 0;
            let primed = false;
            let raf = 0;
            const clear = () => {
                for (const ghost of ghosts) ghost.node.remove();
                ghosts.length = 0;
                setCount(0);
            };
            clearRef.current = clear;
            const objects = () => (board as unknown as {objectsList: BoardObject[]}).objectsList;
            const snapshot = (record: boolean) => {
                const now = performance.now();
                for (const object of objects()) {
                    const node = object.rendNode;
                    if (!node || SKIPPED_TYPES.has(object.type) || object.elType === 'axis' || object.elType === 'text') continue;
                    if (!object.visPropCalc?.visible) { last.delete(object.id); continue; }
                    const tag = node.tagName.toLowerCase();
                    if (!['path', 'line', 'ellipse', 'circle', 'polygon', 'rect'].includes(tag)) continue;
                    const sig = signature(node);
                    const previous = last.get(object.id);
                    last.set(object.id, sig);
                    if (!record || previous === undefined || previous === sig) continue;
                    const clone = node.cloneNode(false) as SVGElement;
                    clone.removeAttribute('id');
                    clone.removeAttribute('class');
                    clone.removeAttribute('style');
                    const fill = node.getAttribute('fill');
                    const isPoint = object.elType === 'point' || object.elType === 'glider';
                    clone.setAttribute('fill', isPoint ? (node.getAttribute('fill') ?? 'none') : fill && fill !== 'none' ? fill : 'none');
                    clone.setAttribute('fill-opacity', isPoint ? '1' : '0.05');
                    const width = Number(node.getAttribute('stroke-width') ?? 2);
                    clone.setAttribute('stroke-width', String(isPoint ? width : Math.max(1, width * 0.8)));
                    clone.removeAttribute('stroke-dasharray');
                    const base = isPoint ? 0.45 : 0.36;
                    clone.setAttribute('opacity', String(base));
                    group.appendChild(clone);
                    ghosts.push({node: clone, born: now, base});
                }
                while (ghosts.length > MAX_GHOSTS) ghosts.shift()!.node.remove();
            };
            const onUpdate = () => {
                const now = performance.now();
                if (!primed) { snapshot(false); primed = true; lastSnapshot = now; return; }
                if (now - lastSnapshot < SNAPSHOT_MS) return;
                lastSnapshot = now;
                snapshot(true);
                if (!raf) raf = requestAnimationFrame(fade);
            };
            const onView = () => { clear(); last.clear(); primed = false; };
            let lastCount = -1;
            let wasHolding = false;
            let releasedAt = 0;
            const fade = (now: number) => {
                raf = 0;
                const holding = pointerHeld || holdingRef.current;
                if (wasHolding && !holding) releasedAt = now;
                wasHolding = holding;
                const keepAll = keepRef.current;
                for (let i = ghosts.length - 1; i >= 0; i--) {
                    const ghost = ghosts[i];
                    // The exposure stays open while a hand is on the mathematics: ghosts keep about six seconds of history.
                    // Released, it closes in 1.2 s, counted from the release or from a later ghost's birth.
                    const age = keepAll ? 0 : Math.max(0, 1 - (now - ghost.born) / 6000);
                    const closing = keepAll || holding ? 1 : Math.max(0, 1 - (now - Math.max(ghost.born, releasedAt)) / 1200);
                    const opacity = ghost.base * age * closing;
                    if (opacity <= 0.01) { ghost.node.remove(); ghosts.splice(i, 1); continue; }
                    ghost.node.setAttribute('opacity', opacity.toFixed(3));
                }
                if (ghosts.length !== lastCount) { lastCount = ghosts.length; setCount(ghosts.length); }
                if (ghosts.length > 0) raf = requestAnimationFrame(fade);
            };
            const b = board as unknown as {on(event: string, handler: () => void): void; off(event: string, handler: () => void): void};
            b.on('update', onUpdate);
            b.on('boundingbox', onView);
            return () => {
                b.off('update', onUpdate);
                b.off('boundingbox', onView);
                cancelAnimationFrame(raf);
                group.remove();
            };
        });
        return () => {
            stop();
            frame.removeEventListener('pointerdown', down, true);
            window.removeEventListener('pointerup', up, true);
            window.removeEventListener('pointercancel', up, true);
        };
    }, [props.frame]);
    return <div className="ux-ghost-tools">
        <button type="button" aria-pressed={keep} onClick={() => setKeep(!keep)} title="Ohrani sledi, dokler jih ne pobrišeš">
            <svg viewBox="0 0 20 14" aria-hidden="true"><path d="M2 12 C 6 2, 10 2, 18 4"/><path d="M2 12 C 6 5, 11 5, 18 8" opacity=".55"/><path d="M2 12 C 7 8, 12 8, 18 12" opacity=".3"/></svg>
            {keep ? 'Sled ostane' : 'Dolga osvetlitev'}
        </button>
        {keep && count > 0 && <button type="button" onClick={() => clearRef.current()}>Pobriši</button>}
    </div>;
}
