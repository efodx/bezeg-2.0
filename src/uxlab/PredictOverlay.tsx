import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {UxBoard} from './board';
import type {Sample} from './geometrySamples';
import './uxlab.css';

export interface PredictOverlayProps {
    board: UxBoard;
    phase: 'predict' | 'revealing' | 'scored';
    score?: number;
    strokes: Sample[][];
    onStrokes(strokes: Sample[][]): void;
    onReveal(): void;
    onDismiss(): void;
}

function verdict(score: number): {title: string; text: string} {
    if (score >= 80) return {title: 'Zadetek!', text: 'Tvoja napoved se skoraj prekriva z grafom.'};
    if (score >= 55) return {title: 'Blizu.', text: 'Smer drži; poglej, kje se črti razideta.'};
    if (score >= 30) return {title: 'Delno.', text: 'Del si predvidel. Kje te je graf presenetil?'};
    return {title: 'Presenečenje.', text: 'Razlika med napovedjo in grafom je točno tisto, kar se splača razumeti.'};
}

/** Covers the board while the learner sketches what the next scene will look like. */
export function PredictOverlay(props: PredictOverlayProps) {
    const [rect, setRect] = useState<DOMRect>(() => props.board.containerObj.getBoundingClientRect());
    const drawing = useRef<Sample[] | null>(null);
    const [, setTick] = useState(0);
    useLayoutEffect(() => {
        let frame = 0;
        const follow = () => {
            const next = props.board.containerObj.getBoundingClientRect();
            setRect(previous => previous.x === next.x && previous.y === next.y && previous.width === next.width && previous.height === next.height ? previous : next);
            frame = requestAnimationFrame(follow);
        };
        frame = requestAnimationFrame(follow);
        return () => cancelAnimationFrame(frame);
    }, [props.board]);
    const {phase, onReveal} = props;
    useEffect(() => {
        if (phase !== 'predict') return;
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) onReveal(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [phase, onReveal]);
    const local = (event: React.PointerEvent): Sample => [event.clientX - rect.left, event.clientY - rect.top];
    const predicting = phase === 'predict';
    const path = (stroke: Sample[]) => stroke.length === 1
        ? `M${stroke[0][0] - 0.1},${stroke[0][1]} L${stroke[0][0] + 0.1},${stroke[0][1]}`
        : 'M' + stroke.map(point => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' L');
    const result = phase === 'scored' && props.score !== undefined && props.strokes.length > 0 ? verdict(props.score) : undefined;
    return createPortal(<div className={`ux-predict ux-predict-${phase}`} style={{left: rect.left, top: rect.top, width: rect.width, height: rect.height}}>
        <svg className="ux-predict-ink" width={rect.width} height={rect.height}
            onPointerDown={event => {
                if (!predicting) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                drawing.current = [local(event)];
                props.onStrokes([...props.strokes, drawing.current]);
            }}
            onPointerMove={event => {
                if (!predicting || !drawing.current) return;
                const point = local(event);
                const last = drawing.current[drawing.current.length - 1];
                if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 3) return;
                drawing.current.push(point);
                setTick(tick => tick + 1);
            }}
            onPointerUp={() => { drawing.current = null; }}
            onPointerCancel={() => { drawing.current = null; }}>
            {props.strokes.map((stroke, index) => <path key={index} d={path(stroke)}/>)}
        </svg>
        {predicting && <div className="ux-predict-bar" role="group" aria-label="Napoved">
            <span className="ux-predict-label"><strong>Napoved</strong> <span className="ux-long">Kaj se bo zgodilo z grafom? Nariši s prstom ali miško.</span><span className="ux-short">Nariši, kaj pričakuješ.</span></span>
            <span className="ux-predict-actions">
                {props.strokes.length > 0 && <button type="button" onClick={() => props.onStrokes([])}>Počisti</button>}
                <button type="button" className="ux-primary" onClick={onReveal}>{props.strokes.length ? 'Pokaži' : <>Pokaži<span className="ux-long"> brez napovedi</span></>}</button>
            </span>
        </div>}
        {result && <div className="ux-predict-result" role="status">
            <span className="ux-predict-score" style={{'--score': props.score} as React.CSSProperties}><b>{props.score}</b><small>%</small></span>
            <span><strong>{result.title}</strong> {result.text}</span>
            <button type="button" aria-label="Skrij napoved" onClick={props.onDismiss}>×</button>
        </div>}
    </div>, document.body);
}
