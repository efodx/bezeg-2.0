import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {findMainBoard, type UxBoard} from './board';
import {format} from './LiveProse';
import './uxlab.css';

const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

interface Axis { input: HTMLInputElement; name: string; min: number; max: number; step: number }

function axes(): Axis[] {
    return [...document.querySelectorAll<HTMLElement>('#workspace-inspector .slider-field')].flatMap(field => {
        const input = field.querySelector<HTMLInputElement>('input[type=range]');
        if (!input || input.disabled || field.offsetParent === null || /velikost elementov/i.test(field.textContent ?? '')) return [];
        const label = (field.querySelector('.slider-label label, .form-label')?.textContent ?? input.labels?.[0]?.textContent ?? '').replace(/,\s*vrednost.*$/i, '').replace(/\([^)]*\)/g, '').trim();
        const token = label.split(/\s+/).pop() ?? '';
        return [{input, name: /^[A-Za-zα-ωΑ-Ω]$/.test(token) ? token : label, min: Number(input.min), max: Number(input.max), step: Number(input.step) || 0}];
    });
}

function setSlider(axis: Axis, value: number) {
    const snapped = axis.step ? Math.round((value - axis.min) / axis.step) * axis.step + axis.min : value;
    const text = String(Math.min(axis.max, Math.max(axis.min, Number(snapped.toFixed(9)))));
    if (axis.input.value === text) return;
    valueSetter?.call(axis.input, text);
    axis.input.dispatchEvent(new Event('input', {bubbles: true}));
    axis.input.dispatchEvent(new Event('change', {bubbles: true}));
}

type OrientationPermission = {requestPermission?: () => Promise<'granted' | 'denied'>};

/** Degrees of tilt that sweep a slider's whole range. */
const SWEEP = 70;

/**
 * Lane B b22: tilt the phone. Left–right tilt moves one slider, forward–back tilt another, like rolling a marble on a
 * tray: the graph answers the hands, not a thumb on a 4 px track. The pose when it starts is the zero, so the sliders
 * do not jump; a tap freezes them where they are.
 */
export function TiltScrub(props: {root: React.RefObject<HTMLElement>; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [touch, setTouch] = useState(false);
    const [active, setActive] = useState(false);
    const [names, setNames] = useState<string[]>([]);
    const [pair, setPair] = useState<[number, number]>([0, 1]);
    const [shown, setShown] = useState<{x?: string; y?: string; gamma: number; beta: number}>({gamma: 0, beta: 0});
    const [error, setError] = useState<string>();
    const zero = useRef<{gamma: number; beta: number; x?: number; y?: number}>();
    const pairRef = useRef(pair);
    pairRef.current = pair;

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
            setTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
            const list = axes().map(axis => axis.name);
            setNames(current => current.join('|') === list.join('|') ? current : list);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    useEffect(() => {
        if (!active) return;
        let smoothed: {gamma: number; beta: number} | undefined;
        const listener = (event: DeviceOrientationEvent) => {
            if (event.gamma === null || event.beta === null) return;
            smoothed = smoothed ? {gamma: smoothed.gamma * 0.6 + event.gamma * 0.4, beta: smoothed.beta * 0.6 + event.beta * 0.4} : {gamma: event.gamma, beta: event.beta};
            const all = axes();
            const x = all[pairRef.current[0]], y = all[pairRef.current[1]];
            if (!zero.current) zero.current = {gamma: smoothed.gamma, beta: smoothed.beta, x: x ? Number(x.input.value) : undefined, y: y ? Number(y.input.value) : undefined};
            const start = zero.current;
            const dGamma = smoothed.gamma - start.gamma, dBeta = smoothed.beta - start.beta;
            if (x && start.x !== undefined) setSlider(x, start.x + dGamma / SWEEP * (x.max - x.min));
            // Tipping the top edge away (beta grows) raises the value, as on a tray.
            if (y && y !== x && start.y !== undefined) setSlider(y, start.y + dBeta / SWEEP * (y.max - y.min));
            setShown({x: x ? `${x.name} = ${format(Number(x.input.value))}` : undefined, y: y && y !== x ? `${y.name} = ${format(Number(y.input.value))}` : undefined, gamma: dGamma, beta: dBeta});
        };
        window.addEventListener('deviceorientation', listener);
        return () => window.removeEventListener('deviceorientation', listener);
    }, [active]);

    const start = async () => {
        setError(undefined);
        const request = (window.DeviceOrientationEvent as unknown as OrientationPermission | undefined)?.requestPermission;
        if (request) {
            try { if (await request() !== 'granted') { setError('Brez dovoljenja za senzor nagiba ne gre.'); return; } } catch { setError('Senzor nagiba ni na voljo.'); return; }
        }
        zero.current = undefined;
        setActive(true);
    };

    if (!board || props.locked || !touch || names.length === 0) return null;
    const host = board.containerObj;
    const recenter = () => { zero.current = undefined; };
    const tiltX = Math.max(-1, Math.min(1, shown.gamma / SWEEP * 2)), tiltY = Math.max(-1, Math.min(1, shown.beta / SWEEP * 2));
    const ui = !active
        ? <button type="button" className="ux-tilt-open" onClick={() => void start()} title="Nagibaj telefon in drsnika se premikata">📱 Nagni</button>
        : <div className="ux-tilt" role="group" aria-label="Nagibanje telefona">
            <span className="ux-tilt-bubble" aria-hidden="true"><i style={{transform: `translate(${(tiltX * 14).toFixed(1)}px, ${(-tiltY * 14).toFixed(1)}px)`}}/></span>
            <span className="ux-tilt-axes">
                <label>↔ <select value={pair[0]} onChange={event => { setPair([Number(event.target.value), pair[1]]); recenter(); }}>{names.map((name, index) => <option key={index} value={index}>{name}</option>)}</select></label>
                {names.length > 1 && <label>↕ <select value={pair[1]} onChange={event => { setPair([pair[0], Number(event.target.value)]); recenter(); }}>{names.map((name, index) => <option key={index} value={index}>{name}</option>)}</select></label>}
            </span>
            <span className="ux-tilt-values">{shown.x ?? 'Nagni telefon levo ali desno'}{shown.y && <>{" · "}{shown.y}</>}</span>
            <button type="button" className="ux-tilt-stop" onClick={() => setActive(false)}>Ustavi</button>
        </div>;
    return <>
        {createPortal(ui, host)}
        {error && createPortal(<div className="ux-tilt-error" role="alert">{error}</div>, host)}
    </>;
}
