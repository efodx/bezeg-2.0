import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {contentElements, elementSignature, findMainBoard, svgRoot, traced, type UxBoard, type UxElement} from './board';
import {sampleNode, type Sample} from './geometrySamples';
import './uxlab.css';

const LOW_HZ = 196;   // G3
const HIGH_HZ = 1046; // C6
const SWEEP_MS = 2600;
const TYPES = new Set(['curve', 'functiongraph', 'line', 'segment', 'arc', 'circle', 'conic', 'ellipse', 'parabola', 'hyperbola', 'polygonalchain', 'spline', 'cardinalspline', 'plot', 'tangent', 'normal']);
const KIND: Record<string, string> = {curve: 'krivulja', functiongraph: 'graf', line: 'premica', segment: 'daljica', arc: 'lok', circle: 'krožnica', conic: 'stožnica', polygonalchain: 'lomljenka', tangent: 'tangenta'};
const WAVES: OscillatorType[] = ['sine', 'triangle'];

interface Track { key: string; label: string; color: string; samples: Sample[]; byX: boolean }

/** A function graph runs one way in x: it is swept by x, so two graphs are heard at the same x. */
function monotoneInX(samples: Sample[]): boolean {
    if (samples.length < 3) return false;
    const direction = Math.sign(samples[samples.length - 1][0] - samples[0][0]);
    if (direction <= 0) return false;
    return samples.every((sample, index) => index === 0 || sample[0] >= samples[index - 1][0] - 0.5);
}

/** The point of a track at sweep time t, or undefined in a gap. */
function pointAt(track: Track, t: number, width: number): Sample | undefined {
    const samples = track.samples;
    if (track.byX) {
        const x = t * width;
        if (x < samples[0][0] || x > samples[samples.length - 1][0]) return undefined;
        let low = 0, high = samples.length - 1;
        while (high - low > 1) { const middle = (low + high) >> 1; if (samples[middle][0] <= x) low = middle; else high = middle; }
        const [x0, y0] = samples[low], [x1, y1] = samples[high];
        if (Math.abs(y1 - y0) > 40) return undefined;
        return [x, x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0)];
    }
    const position = t * (samples.length - 1);
    const i = Math.min(samples.length - 2, Math.floor(position));
    const k = position - i;
    // A jump between samples is a gap (an asymptote, a curve leaving the board): silence there.
    if (Math.hypot(samples[i + 1][0] - samples[i][0], samples[i + 1][1] - samples[i][1]) > 24) return undefined;
    return [samples[i][0] + (samples[i + 1][0] - samples[i][0]) * k, samples[i][1] + (samples[i + 1][1] - samples[i][1]) * k];
}

function keyed(board: UxBoard): Map<string, UxElement> {
    const seen = new Map<string, number>();
    const result = new Map<string, UxElement>();
    for (const element of contentElements(board)) {
        if (!TYPES.has(element.elType) || !traced(element)) continue;
        const signature = elementSignature(element);
        const index = seen.get(signature) ?? 0;
        seen.set(signature, index + 1);
        result.set(`${signature}#${index}`, element);
    }
    return result;
}

function strokeOf(element: UxElement): string {
    const node = element.rendNode;
    const stroke = (node ? getComputedStyle(node).stroke : '') || node?.getAttribute('stroke') || String(element.visProp?.strokecolor ?? '#19372f');
    return stroke && stroke !== 'none' ? stroke : '#19372f';
}

function labelOf(element: UxElement): string {
    const kind = KIND[element.elType] ?? element.elType;
    const name = (element.name ?? '').replace(/<[^>]+>/g, '').replace(/[{}$\\]/g, '').trim();
    return /^[A-Za-zα-ω](_?\d+)?'*$/.test(name) ? `${kind} ${name.replace('_', '')}` : kind;
}

/** Samples of a drawn path in drawing order, only the parts inside the board (a gap is silence). */
function trackSamples(element: UxElement, board: UxBoard): Sample[] {
    return sampleNode(element.rendNode!, 3).filter(([x, y]) => x >= -2 && y >= -2 && x <= board.canvasWidth + 2 && y <= board.canvasHeight + 2);
}

function pitch(y: number, height: number): number {
    const level = Math.min(1, Math.max(0, 1 - y / height));
    return LOW_HZ * Math.pow(HIGH_HZ / LOW_HZ, level);
}

/**
 * Lane B b10: hear the graph. Up to two drawn curves play as tones swept along their path: height is pitch, left and
 * right is stereo. In loop mode the sweep repeats while the learner drags, so a change of shape is heard; two curves
 * that nearly agree beat against each other and fall into unison as they meet.
 */
export function ListenGraph(props: {root: React.RefObject<HTMLElement>; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [open, setOpen] = useState(false);
    const [choices, setChoices] = useState<{key: string; label: string; color: string; length: number}[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [playing, setPlaying] = useState(false);
    const [loop, setLoop] = useState(true);
    const [readout, setReadout] = useState('');
    const audio = useRef<{context: AudioContext; voices: {osc: OscillatorNode; gain: GainNode; pan: StereoPannerNode}[]; master: GainNode}>();
    const frame = useRef(0);
    const layer = useRef<SVGGElement>();
    const loopRef = useRef(loop);
    loopRef.current = loop;

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    const listChoices = useCallback(() => {
        if (!board) return [];
        const found = [...keyed(board)].map(([key, element]) => {
            let length = 0;
            try { length = (element.rendNode as SVGGeometryElement).getTotalLength(); } catch { /* not drawn */ }
            return {key, label: labelOf(element), color: strokeOf(element), length};
        }).filter(choice => choice.length > 30).sort((a, b) => b.length - a.length).slice(0, 8);
        // Same label twice: number them in drawing order.
        const counts = new Map<string, number>();
        found.forEach(choice => counts.set(choice.label, (counts.get(choice.label) ?? 0) + 1));
        const seen = new Map<string, number>();
        return found.map(choice => {
            if ((counts.get(choice.label) ?? 0) < 2) return choice;
            const index = (seen.get(choice.label) ?? 0) + 1;
            seen.set(choice.label, index);
            return {...choice, label: `${choice.label} ${index}`};
        });
    }, [board]);

    const openPanel = () => {
        const found = listChoices();
        setChoices(found);
        // The two longest curves of different colours: usually the function and its companion.
        const first = found[0];
        const second = found.find(choice => first && choice.color !== first.color);
        setSelected([first, second].filter(Boolean).map(choice => choice!.key));
        setOpen(true);
    };

    const stop = useCallback(() => {
        cancelAnimationFrame(frame.current);
        setPlaying(false);
        const current = audio.current;
        if (current) {
            current.master.gain.setTargetAtTime(0, current.context.currentTime, 0.05);
            window.setTimeout(() => { current.voices.forEach(voice => { try { voice.osc.stop(); } catch { /* stopped */ } }); void current.context.close(); }, 250);
            audio.current = undefined;
        }
        if (layer.current) layer.current.innerHTML = '';
    }, []);

    const play = useCallback(() => {
        if (!board || selected.length === 0) return;
        stop();
        const Context = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
        if (!Context) { setReadout('Ta brskalnik ne predvaja zvoka.'); return; }
        const context = new Context();
        const master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        master.gain.setTargetAtTime(0.9, context.currentTime, 0.05);
        const voices = selected.map((_, index) => {
            const osc = context.createOscillator();
            osc.type = WAVES[index % WAVES.length];
            const gain = context.createGain();
            gain.gain.value = 0;
            const pan = context.createStereoPanner();
            osc.connect(gain).connect(pan).connect(master);
            osc.start();
            return {osc, gain, pan};
        });
        audio.current = {context, voices, master};
        setPlaying(true);
        const svg = svgRoot(board);
        if (svg && (!layer.current || !layer.current.isConnected)) {
            layer.current = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            layer.current.setAttribute('class', 'ux-listen-layer');
            layer.current.setAttribute('pointer-events', 'none');
            svg.appendChild(layer.current);
        }
        let start = performance.now();
        let frames = 0;
        let tracks: Track[] = [];
        const resample = () => {
            const byKey = keyed(board);
            tracks = selected.flatMap(key => {
                const element = byKey.get(key);
                if (!element) return [];
                const drawn = trackSamples(element, board);
                // A graph drawn right to left is still a function of x.
                const samples = drawn.length > 1 && drawn[drawn.length - 1][0] < drawn[0][0] ? [...drawn].reverse() : drawn;
                return [{key, label: labelOf(element), color: strokeOf(element), samples, byX: monotoneInX(samples)}];
            });
        };
        resample();
        const tick = (now: number) => {
            let t = (now - start) / SWEEP_MS;
            if (t >= 1) {
                if (!loopRef.current) { stop(); return; }
                start = now;
                t = 0;
            }
            // The shape is read every frame: a drag during the sweep is heard at once.
            resample();
            const time = context.currentTime;
            const dots: string[] = [];
            const notes: string[] = [];
            tracks.forEach((track, index) => {
                const voice = voices[index];
                if (!voice) return;
                const point = track.samples.length >= 2 ? pointAt(track, t, board.canvasWidth) : undefined;
                if (!point) { voice.gain.gain.setTargetAtTime(0, time, 0.02); notes.push('—'); return; }
                const [x, y] = point;
                const gap = false;
                const frequency = pitch(y, board.canvasHeight);
                voice.osc.frequency.setTargetAtTime(frequency, time, 0.012);
                voice.gain.gain.setTargetAtTime(gap ? 0 : index === 0 ? 0.16 : 0.12, time, 0.02);
                voice.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, x / board.canvasWidth * 2 - 1)), time, 0.02);
                dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#fffdf5" stroke="${track.color}" stroke-width="3"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${track.color}"/>`);
                notes.push(`${Math.round(frequency)} Hz`);
            });
            if (tracks.length === 2 && voices.length === 2 && dots.length === 2) {
                const a = voices[0].osc.frequency.value, b = voices[1].osc.frequency.value;
                const beat = Math.abs(a - b);
                notes.push(beat < 1.5 ? 'v sozvočju' : beat < 25 ? `utripanje ${beat.toFixed(0)} Hz` : 'narazen');
            }
            if (layer.current) layer.current.innerHTML = dots.join('') + (tracks.some(track => track.byX) ? `<line x1="${(t * board.canvasWidth).toFixed(1)}" x2="${(t * board.canvasWidth).toFixed(1)}" y1="0" y2="${board.canvasHeight}" stroke="#5d3b6e" stroke-opacity=".25" stroke-width="2"/>` : '');
            if (++frames % 6 === 0) setReadout(notes.join(' · '));
            frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
    }, [board, selected, stop]);
    useEffect(() => () => stop(), [stop]);

    // A different selection while playing restarts with the new voices.
    useEffect(() => { if (playing) play(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected]);

    const toggle = (key: string) => setSelected(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key].slice(-2));

    if (!board || props.locked) return null;
    const ui = !open
        ? <div className="ux-listen-entry">
            <button type="button" className="ux-listen-open" onClick={openPanel}>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 8 H6 L10 4.5 V15.5 L6 12 H3 Z" fill="currentColor"/><path d="M13 7 Q15 10 13 13 M15.5 5 Q19 10 15.5 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                Poslušaj graf
            </button>
        </div>
        : <div className="ux-listen" role="group" aria-label="Poslušaj graf">
            <div className="ux-why-head">
                <span className="ux-why-title">Poslušaj graf</span>
                <button type="button" className="ux-fan-close" aria-label="Zapri" onClick={() => { stop(); setOpen(false); }}>×</button>
            </div>
            <p className="ux-listen-hint">Višina je višina tona, levo in desno je levo in desno. Izberi do dve krivulji.</p>
            <div className="ux-why-chips">
                {choices.map(choice => <button key={choice.key} type="button" aria-pressed={selected.includes(choice.key)}
                    className={selected.includes(choice.key) ? 'is-lit' : ''} style={{'--ux-why-color': choice.color} as React.CSSProperties}
                    onClick={() => toggle(choice.key)}><i aria-hidden="true"/>{choice.label}</button>)}
            </div>
            <div className="ux-listen-row">
                <button type="button" className="ux-clip-play ux-listen-play" aria-label={playing ? 'Ustavi' : 'Predvajaj'} disabled={selected.length === 0} onClick={() => playing ? stop() : play()}>
                    {playing
                        ? <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor"/></svg>
                        : <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M6 4 L16 10 L6 16 Z" fill="currentColor"/></svg>}
                </button>
                <label className="ux-listen-loop"><input type="checkbox" checked={loop} onChange={event => setLoop(event.target.checked)}/> V zanki (vleci med poslušanjem)</label>
            </div>
            <div className="ux-listen-readout" aria-live="off">{playing ? readout : selected.length === 2 ? 'Dve krivulji: ko se ujemata, se toni zlijejo v en ton.' : ''}</div>
        </div>;
    return createPortal(ui, board.containerObj);
}
