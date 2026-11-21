import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {contentElements, findMainBoard, svgRoot, type UxBoard, type UxElement} from './board';
import {geometryKey} from './geometrySamples';
import './uxlab.css';

const TRACED = new Set(['curve', 'functiongraph', 'line', 'segment', 'polygon', 'arc', 'circle', 'sector', 'conic', 'ellipse', 'parabola', 'hyperbola', 'arrow', 'plot', 'spline', 'cardinalspline', 'integral', 'riemannsum', 'polygonalchain', 'semicircle', 'circumcircle', 'circumcirclearc', 'curvedifference', 'curveunion', 'curveintersection', 'inequality', 'tangent', 'normal', 'bisector', 'parallel', 'perpendicular']);
const MAX_LAYERS = 22;
const INTERVAL = 55;

function traced(element: UxElement): boolean {
    if (TRACED.has(element.elType)) return true;
    // Constructed points (a point on the curve at t, a centroid) leave a dotted path; the dragged handles do not.
    return (element.elType === 'point' || element.elType === 'glider' || element.elType === 'intersection' || element.elType === 'midpoint')
        && element.isDraggable === false;
}

/**
 * Lane B b3: while the learner drags a point or moves a control, earlier positions of every curve stay on the board
 * as fading onion skins, so the family of shapes a parameter sweeps out becomes visible.
 */
export function OnionTrails(props: {root: React.RefObject<HTMLElement>}) {
    const [board, setBoard] = useState<UxBoard>();
    const [layers, setLayers] = useState(0);
    const [kept, setKept] = useState(false);
    const keptRef = useRef(false);
    keptRef.current = kept;
    const clearRef = useRef<() => void>();
    useEffect(() => {
        const find = () => {
            const root = props.root.current ?? document;
            const next = findMainBoard(root);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 700);
        return () => window.clearInterval(timer);
    }, [props.root]);

    useEffect(() => {
        const root = props.root.current;
        const svg = board && svgRoot(board);
        if (!board || !svg || !root) return;
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('class', 'ux-onion');
        layer.setAttribute('pointer-events', 'none');
        svg.insertBefore(layer, svg.firstChild);
        let activeUntil = 0;
        let pointerActive = false;
        let lastShot = 0;
        let lastKey = '';
        let box = board.getBoundingBox().join(',');
        let fadeTimer = 0;
        const skins: SVGGElement[] = [];
        const restyle = () => {
            skins.forEach((skin, index) => {
                const age = skins.length - 1 - index;
                skin.style.opacity = skin.classList.contains('ux-onion-start') ? '0.5' : String(Math.max(keptRef.current ? 0.12 : 0.05, 0.42 * Math.pow(0.86, age)));
            });
            setLayers(skins.length);
        };
        const clear = () => {
            skins.splice(0).forEach(skin => skin.remove());
            lastKey = '';
            setLayers(0);
        };
        const active = () => pointerActive || performance.now() < activeUntil;
        const currentKey = () => contentElements(board).filter(traced).map(element => geometryKey(element.rendNode!)).join('#');
        const addSkin = (start = false) => {
            const skin = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            if (start) skin.setAttribute('class', 'ux-onion-start');
            for (const element of contentElements(board).filter(traced)) {
                const clone = element.rendNode!.cloneNode(true) as Element;
                clone.removeAttribute('id');
                clone.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
                if (element.elType === 'polygon') clone.setAttribute('fill-opacity', '0.04');
                skin.appendChild(clone);
            }
            layer.appendChild(skin);
            skins.push(skin);
            const limit = keptRef.current ? MAX_LAYERS * 4 : MAX_LAYERS;
            while (skins.length > limit) {
                // The starting shape of a gesture is the last thing to go.
                const index = skins.findIndex(item => !item.classList.contains('ux-onion-start'));
                skins.splice(index < 0 ? 0 : index, 1)[0].remove();
            }
            restyle();
        };
        const shoot = () => {
            const now = performance.now();
            if (!active() || now - lastShot < INTERVAL) return;
            const nextBox = board.getBoundingBox().join(',');
            if (nextBox !== box) { box = nextBox; clear(); return; }
            const key = currentKey();
            if (key === lastKey) return;
            lastShot = now;
            lastKey = key;
            addSkin();
        };
        const begin = () => {
            layer.getAnimations().forEach(animation => animation.cancel());
            window.clearTimeout(fadeTimer);
            box = board.getBoundingBox().join(',');
            lastKey = currentKey();
            // The starting shape stays as the first skin: where it was before the learner touched it.
            addSkin(true);
            lastShot = performance.now();
        };
        const scheduleFade = () => {
            window.clearTimeout(fadeTimer);
            fadeTimer = window.setTimeout(() => {
                if (active() || keptRef.current) return;
                const fading = layer.animate([{opacity: 1}, {opacity: 0}], {duration: 900, easing: 'ease-in'});
                fading.finished.then(() => { if (!active()) clear(); }, () => undefined);
            }, 2600);
        };
        const onPointerDown = (event: PointerEvent) => {
            if (!(event.target instanceof Element) || event.target.closest('.guided-lesson, .ux-predict, .ux-onion-chip')) return;
            pointerActive = true;
            begin();
        };
        const onPointerUp = () => {
            if (!pointerActive) return;
            pointerActive = false;
            scheduleFade();
        };
        const onKey = (event: Event) => {
            if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof SVGElement)) return;
            if (event instanceof KeyboardEvent && /^(Tab|Shift|Control|Alt|Meta|Escape)$/.test(event.key)) return;
            if (!active()) begin();
            activeUntil = performance.now() + 900;
            scheduleFade();
        };
        clearRef.current = clear;
        board.on('update', shoot);
        root.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('pointerup', onPointerUp, true);
        window.addEventListener('pointercancel', onPointerUp, true);
        root.addEventListener('keydown', onKey, true);
        root.addEventListener('input', onKey, true);
        return () => {
            board.off('update', shoot);
            root.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('pointerup', onPointerUp, true);
            window.removeEventListener('pointercancel', onPointerUp, true);
            root.removeEventListener('keydown', onKey, true);
            root.removeEventListener('input', onKey, true);
            window.clearTimeout(fadeTimer);
            layer.remove();
        };
    }, [board, props.root]);

    if (!board || (!layers && !kept)) return null;
    return createPortal(<div className="ux-onion-chip" role="group" aria-label="Sledi">
        <label><input type="checkbox" checked={kept} onChange={event => setKept(event.currentTarget.checked)}/> Ohrani sledi</label>
        {layers > 0 && <button type="button" onClick={() => clearRef.current?.()}>Počisti</button>}
    </div>, board.containerObj);
}
