import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {findBoard} from './boardAccess';
import {currentParams, getParam, observeParamChanges, splitLabel, type ParamEntry} from './paramRegistry';
import {drawn, meaningful} from './YourTurn';
import {settle, svgRootOf} from './family';
import './Linker.css';

/**
 * a20 — Links between controls and the graph. Point at a slider and the objects it moves light up on the board while
 * everything else steps back; point at (or tap) anything on the board and the sliders that move it glow in the
 * inspector, with a label next to the pointer: "to premikata c in d", "tega ne premakne noben drsnik". The inspector
 * stops being a list of names and becomes a map of what controls what. Generic: Bezeg nudges every parameter in turn
 * through the shared slider registry, notes which shapes changed, and restores the values before the browser paints.
 */

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);
const shapeSignature = (node: Element) => ['d', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'width', 'height', 'transform']
    .map(name => node.getAttribute(name) ?? '').join('|');
const usable = (entry: ParamEntry | undefined): entry is ParamEntry => meaningful(entry) && entry.unavailable === undefined;

type LinkMap = Map<string, Set<string>>; // param key → rendNode ids it moves

async function scan(b: Board): Promise<LinkMap> {
    const map: LinkMap = new Map();
    for (const entry of currentParams().filter(usable)) {
        const nodes = () => new Map(drawn(b).map(object => [object.rendNode!.id, shapeSignature(object.rendNode!)]));
        const before = nodes();
        const span = entry.max - entry.min;
        const delta = Math.max(entry.step, span * 0.03);
        const start = entry.value;
        const next = start + delta <= entry.max || entry.cyclic !== undefined ? start + delta : start - delta;
        await settle(b, [entry.key], [next]);
        const after = nodes();
        await settle(b, [entry.key], [start]);
        map.set(entry.key, new Set([...after].filter(([id, sig]) => before.has(id) && before.get(id) !== sig).map(([id]) => id)));
    }
    return map;
}

export function Linker(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [label, setLabel] = useState<{x: number; y: number; text: React.ReactNode}>();
    const links = useRef<LinkMap>();
    const stale = useRef(true);
    const scanning = useRef(false);

    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        let hotNodes: Element[] = [];
        let hotFields: Element[] = [];
        let svgDim: SVGSVGElement | undefined;
        let sticky = 0;
        const clear = () => {
            hotNodes.forEach(node => node.classList.remove('ux-link-hot'));
            hotFields.forEach(node => node.classList.remove('ux-link-field-hot'));
            svgDim?.classList.remove('ux-link-dim');
            hotNodes = []; hotFields = []; svgDim = undefined;
        };
        const ensure = async () => {
            const b = findBoard(frame);
            if (!b) return undefined;
            if (stale.current && !scanning.current) {
                scanning.current = true;
                try { links.current = await scan(b); stale.current = false; } finally { scanning.current = false; }
            }
            return links.current ? {b, map: links.current} : undefined;
        };
        // Any value change (the learner, the lesson, a prototype) can change what moves what: rescan lazily.
        const unobserve = observeParamChanges(() => { if (!scanning.current) stale.current = true; });

        const showSlider = async (key: string) => {
            const ready = await ensure();
            if (!ready) return;
            clear();
            const svg = svgRootOf(ready.b);
            const ids = ready.map.get(key);
            if (!svg || !ids) return;
            svgDim = svg;
            svg.classList.add('ux-link-dim');
            hotNodes = [...ids].map(id => svg.querySelector(`[id="${CSS.escape(id)}"]`)).filter(Boolean) as Element[];
            hotNodes.forEach(node => node.classList.add('ux-link-hot'));
        };
        const showObject = async (node: Element, x: number, y: number) => {
            const ready = await ensure();
            if (!ready) return;
            clear();
            const keys = [...ready.map].filter(([, ids]) => ids.has(node.id)).map(([key]) => key);
            node.classList.add('ux-link-hot');
            hotNodes = [node];
            hotFields = keys.map(key => document.getElementById(key)?.closest('.slider-field')).filter(Boolean) as Element[];
            hotFields.forEach(field => field.classList.add('ux-link-field-hot'));
            const symbols = keys.map(key => getParam(key)).filter(usable).map(symbolOf);
            const frameRect = frame.getBoundingClientRect();
            setLabel({x: x - frameRect.left, y: y - frameRect.top, text: symbols.length === 0
                ? 'tega ne premakne noben drsnik'
                : <>{symbols.length === 1 ? 'to premika ' : 'to premikajo '}{symbols.map((symbol, i) => <React.Fragment key={i}>{i > 0 && (i === symbols.length - 1 ? ' in ' : ', ')}<i>{symbol}</i></React.Fragment>)}</>});
        };

        let current: Element | string | undefined;
        const over = (event: PointerEvent) => {
            const target = event.target as Element | null;
            if (!target) return;
            if (event.buttons !== 0) { if (current) { current = undefined; clear(); setLabel(undefined); } return; }
            const field = target.closest?.('.slider-field');
            const input = field?.querySelector('input[type="range"]');
            if (input && usable(getParam(input.id))) {
                if (current !== input.id) { current = input.id; setLabel(undefined); void showSlider(input.id); }
                return;
            }
            const b = findBoard(frame);
            const svg = b && svgRootOf(b);
            const shape = svg && svg.contains(target) && b ? drawn(b).find(object => object.rendNode === target)?.rendNode : undefined;
            if (shape) {
                if (current !== shape) { current = shape; void showObject(shape, event.clientX, event.clientY); }
                else setLabel(value => value && {...value, x: event.clientX - frame.getBoundingClientRect().left, y: event.clientY - frame.getBoundingClientRect().top});
                return;
            }
            if (current && performance.now() > sticky) { current = undefined; clear(); setLabel(undefined); }
        };
        // Touch has no hover: a tap on a shape shows its links for a few seconds.
        const tap = (event: PointerEvent) => {
            if (event.pointerType !== 'touch') return;
            const b = findBoard(frame);
            const target = event.target as Element | null;
            const shape = b && target ? drawn(b).find(object => object.rendNode === target)?.rendNode : undefined;
            if (!shape) return;
            current = shape; sticky = performance.now() + 3500;
            void showObject(shape, event.clientX, event.clientY);
            window.setTimeout(() => { if (current === shape && performance.now() >= sticky) { current = undefined; clear(); setLabel(undefined); } }, 3600);
        };
        const focus = (event: FocusEvent) => {
            const input = (event.target as Element | null)?.closest?.('input[type="range"]');
            if (input && usable(getParam(input.id))) { current = input.id; void showSlider(input.id); }
        };
        const blur = () => { if (typeof current === 'string') { current = undefined; clear(); } };
        document.addEventListener('pointermove', over, {passive: true});
        document.addEventListener('pointerdown', tap, {passive: true});
        document.addEventListener('focusin', focus);
        document.addEventListener('focusout', blur);
        return () => {
            unobserve();
            clear();
            document.removeEventListener('pointermove', over);
            document.removeEventListener('pointerdown', tap);
            document.removeEventListener('focusin', focus);
            document.removeEventListener('focusout', blur);
        };
    }, [props.frame]);

    return label ? <div className="ux-link-label" style={{left: label.x, top: label.y}} role="status">{label.text}</div> : null;
}
