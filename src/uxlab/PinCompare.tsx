import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {findMainBoard, svgRoot, type UxBoard} from './board';
import {format} from './LiveProse';
import {morphScene, type MorphHandle} from './morph';
import {snapshot} from './ParameterFan';
import {readouts} from './SliderTrace';
import './uxlab.css';

interface Pin {
    checkpoint: LessonSceneCheckpoint;
    ghost: string;
    view: [number, number, number, number];
    width: number;
    height: number;
    readings: Map<string, number>;
}

function pinNow(board: UxBoard, capabilities: LessonGraphCapabilities): Pin | undefined {
    let checkpoint: LessonSceneCheckpoint;
    try { checkpoint = capabilities.captureState(); } catch { return undefined; }
    return {checkpoint, ghost: snapshot(board).ghost, view: board.getBoundingBox(), width: board.canvasWidth, height: board.canvasHeight, readings: readouts(board)};
}

/** Screen coordinates of the pinned view mapped into today's view, so the ghost stays put in the plane when the learner pans or zooms. */
function viewTransform(pin: Pin, board: UxBoard): string {
    const [l0, t0, r0, b0] = pin.view;
    const [l1, t1, r1, b1] = board.getBoundingBox();
    const sx = (r0 - l0) / pin.width * board.canvasWidth / (r1 - l1);
    const sy = (t0 - b0) / pin.height * board.canvasHeight / (t1 - b1);
    const ox = (l0 - l1) / (r1 - l1) * board.canvasWidth;
    const oy = (t1 - t0) / (t1 - b1) * board.canvasHeight;
    return `matrix(${sx} 0 0 ${sy} ${ox} ${oy})`;
}

/**
 * Lane B b20: pin a scene and compare. "📌 Pripni" keeps the current drawing as a berry ghost on the graph and its
 * readouts in a small table; while the learner explores, the table shows now, then and the difference for every readout.
 * "A ⇄ B" morphs the graph to the pinned setting and pins the one it left, so two settings can be flipped like slides.
 */
export function PinCompare(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [pin, setPin] = useState<Pin>();
    const [now, setNow] = useState<Map<string, number>>(new Map());
    const [phone, setPhone] = useState(false);
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const layer = useRef<SVGGElement>();
    const morph = useRef<MorphHandle>();

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
            setPhone(window.matchMedia('(max-width: 700px)').matches);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    // The ghost lives in the board's own SVG, behind the live drawing, and follows pan and zoom.
    useEffect(() => {
        if (!board || !pin) { layer.current?.remove(); layer.current = undefined; return; }
        let frame = 0;
        const draw = () => {
            const svg = svgRoot(board);
            if (svg) {
                if (!layer.current || !layer.current.isConnected) {
                    layer.current = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    layer.current.setAttribute('class', 'ux-pin-ghost');
                    layer.current.setAttribute('pointer-events', 'none');
                    layer.current.innerHTML = pin.ghost;
                    svg.insertBefore(layer.current, svg.firstChild);
                }
                layer.current.setAttribute('transform', viewTransform(pin, board));
            }
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(frame); layer.current?.remove(); layer.current = undefined; };
    }, [board, pin]);

    useEffect(() => {
        if (!board || !pin) return;
        const read = () => setNow(readouts(board));
        read();
        const timer = window.setInterval(read, 200);
        return () => window.clearInterval(timer);
    }, [board, pin]);

    const swap = () => {
        if (!board || !pin) return;
        morph.current?.finish();
        const left = pinNow(board, caps.current);
        try { caps.current.restoreState(pin.checkpoint); } catch { return; }
        morph.current = morphScene(caps.current, left?.checkpoint ?? pin.checkpoint, {duration: 650});
        if (left) setPin(left);
    };

    if (!board || props.locked) return null;
    const host = board.containerObj;
    if (!pin) return createPortal(<button type="button" className="ux-pin-open" title="Pripni ta prizor in ga primerjaj z naslednjim" onClick={() => setPin(pinNow(board, caps.current))}>📌 Pripni</button>, host);

    const labels = [...new Set([...pin.readings.keys(), ...now.keys()])];
    const rows = labels.map(label => ({label, then: pin.readings.get(label), now: now.get(label)}))
        .filter(row => row.then !== undefined || row.now !== undefined)
        // The same quantity under two labels (board text and readout list): keep the first, the list's.
        .filter((row, index, all) => all.findIndex(other => other.then === row.then && other.now === row.now) === index);
    const visible = (delta: number | undefined) => delta !== undefined && format(Math.abs(delta)) !== '0';
    const changed = rows.filter(row => row.then !== undefined && row.now !== undefined && visible(row.now - row.then));
    const shown = (changed.length ? changed : rows).slice(0, phone ? 4 : 7);
    const card = <div className={`ux-pin${phone ? ' is-phone' : ''}`} role="region" aria-label="Primerjava s pripetim prizorom" onPointerDown={event => event.stopPropagation()}>
        <div className="ux-pin-head">
            <strong><span className="ux-pin-swatch" aria-hidden="true"/> Pripeto</strong>
            <button type="button" className="ux-pin-swap" onClick={swap} title="Graf se premakne v pripeti prizor, trenutni se pripne">A ⇄ B</button>
            <button type="button" className="ux-pin-close" aria-label="Odpni" onClick={() => setPin(undefined)}>✕</button>
        </div>
        {shown.length > 0 ? <table className="ux-pin-table">
            <thead><tr><th/><th>pripeto</th><th>zdaj</th><th>razlika</th></tr></thead>
            <tbody>{shown.map(row => {
                const delta = row.then !== undefined && row.now !== undefined ? row.now - row.then : undefined;
                return <tr key={row.label} className={visible(delta) ? 'is-changed' : ''}>
                    <th scope="row" title={row.label}>{row.label}</th>
                    <td>{row.then !== undefined ? format(row.then) : '–'}</td>
                    <td>{row.now !== undefined ? format(row.now) : '–'}</td>
                    <td className={!visible(delta) ? '' : delta! > 0 ? 'is-up' : 'is-down'}>{!visible(delta) ? '·' : `${delta! > 0 ? '+' : '−'}${format(Math.abs(delta!))}`}</td>
                </tr>;
            })}</tbody>
        </table> : <p className="ux-pin-note">Vijolična sled je pripeti prizor. Spremeni graf in primerjaj.</p>}
        {changed.length === 0 && shown.length > 0 && <p className="ux-pin-note">Spremeni graf: razlike se pokažejo tu in kot vijolična sled.</p>}
    </div>;
    return createPortal(card, host);
}
