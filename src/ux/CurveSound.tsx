import React, {useEffect, useRef, useState} from 'react';
import type {Board} from 'jsxgraph';
import {watchBoard} from './boardAccess';
import './CurveSound.css';

/**
 * a7 — Listen to the curve. A playhead sweeps the board from left to right; every visible curve is a voice whose pitch is
 * its height at the playhead (two octaves from the bottom of the view to the top) and whose pan follows the playhead.
 * A zero of a curve clicks, two curves crossing chime. Drag the playhead to scrub by hand. Parameters changed while it
 * loops (pucks, oscillation, a grabbed curve) are heard at once. Works on any board: it reads JSXGraph's sampled curves.
 */

type Vec = [number, number];
type BoardObject = {id: string; type: number; elType?: string; rendNode?: SVGElement; visPropCalc?: {visible?: boolean}; points?: {usrCoords: number[]}[]};
type BoardLike = Board & {objectsList: BoardObject[]; containerObj: HTMLElement; getBoundingBox(): number[]; on(e: string, h: () => void): void; off(e: string, h: () => void): void};

const PERIOD = 4200;
const MAX_VOICES = 4;
const WAVES: OscillatorType[] = ['triangle', 'sine', 'square', 'sawtooth'];

interface Voice { osc: OscillatorNode; gain: GainNode; pan: StereoPannerNode; lastY?: number; color: string }

/** The heights where a polyline crosses the vertical line at x (all of them, for curves that fold back). */
function heightsAt(points: {usrCoords: number[]}[], x: number): number[] {
    const out: number[] = [];
    for (let i = 0; i + 1 < points.length; i++) {
        const a = points[i].usrCoords, b = points[i + 1].usrCoords;
        if (!a[0] || !b[0]) continue;
        const ax = a[1] / a[0], ay = a[2] / a[0], bx = b[1] / b[0], by = b[2] / b[0];
        if (![ax, ay, bx, by].every(Number.isFinite)) continue;
        if ((ax - x) * (bx - x) > 0 || ax === bx) continue;
        out.push(ay + (by - ay) * (x - ax) / (bx - ax));
    }
    return out;
}

export function CurveSound(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [playing, setPlaying] = useState(false);
    const playingRef = useRef(false);
    playingRef.current = playing;
    const controls = useRef<{start(): void; stop(): void}>({start: () => undefined, stop: () => undefined});
    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        return watchBoard(frame, (rawBoard: Board) => {
            const board = rawBoard as BoardLike;
            const container = board.containerObj;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'ux-sound-layer');
            svg.setAttribute('aria-hidden', 'true');
            const grip = document.createElement('div');
            grip.className = 'ux-sound-grip';
            grip.title = 'Povleci predvajalno črto';
            frame.appendChild(svg);
            frame.appendChild(grip);
            let context: AudioContext | undefined;
            let master: GainNode | undefined;
            const voices = new Map<string, Voice>();
            let raf = 0;
            let phase = 0;
            let last = 0;
            let scrubbing = false;
            let rings: {x: number; y: number; born: number; kind: 'zero' | 'cross'}[] = [];
            let crossLast = new Map<string, number>();
            const ensureAudio = () => {
                if (context) return context;
                const AudioCtor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
                if (!AudioCtor) return undefined;
                context = new AudioCtor();
                const filter = context.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 2400;
                master = context.createGain();
                master.gain.value = 0.9;
                master.connect(filter).connect(context.destination);
                return context;
            };
            const ping = (frequency: number, duration: number, level: number) => {
                if (!context || !master) return;
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.type = 'sine';
                osc.frequency.value = frequency;
                gain.gain.setValueAtTime(level, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
                osc.connect(gain).connect(master);
                osc.start();
                osc.stop(context.currentTime + duration + 0.02);
            };
            const voiceFor = (object: BoardObject, index: number): Voice | undefined => {
                const existing = voices.get(object.id);
                if (existing) return existing;
                if (!context || !master || voices.size >= MAX_VOICES) return undefined;
                const osc = context.createOscillator();
                osc.type = WAVES[index % WAVES.length];
                const gain = context.createGain();
                gain.gain.value = 0;
                const pan = context.createStereoPanner();
                osc.connect(gain).connect(pan).connect(master);
                osc.start();
                const color = object.rendNode?.getAttribute('stroke') ?? '#587445';
                const voice = {osc, gain, pan, color};
                voices.set(object.id, voice);
                return voice;
            };
            const silenceAll = () => {
                for (const voice of voices.values()) {
                    if (context) voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.05);
                    const v = voice;
                    window.setTimeout(() => { try { v.osc.stop(); } catch { /* stopped */ } }, 300);
                }
                voices.clear();
            };
            const curves = () => (board.objectsList as BoardObject[]).filter(object => object.type === 8 && object.visPropCalc?.visible && object.points && object.points.length > 1
                && (object.rendNode?.getAttribute('stroke-opacity') ?? '1') !== '0');
            const render = (now: number) => {
                const box = board.getBoundingBox();
                const [left, top, right, bottom] = box;
                const width = container.clientWidth, height = container.clientHeight;
                const x = left + phase * (right - left);
                const sx = phase * width;
                const parts: string[] = [`<line class="ux-playhead" x1="${sx}" x2="${sx}" y1="0" y2="${height}"/>`];
                const seen = new Set<string>();
                const ys: {id: string; y: number}[] = [];
                curves().forEach((object, index) => {
                    const heights = heightsAt(object.points!, x).filter(y => y <= top && y >= bottom);
                    const voice = playingRef.current ? voiceFor(object, index) : undefined;
                    const y = heights[0];
                    if (voice) seen.add(object.id);
                    if (y === undefined) {
                        if (voice && context) voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.03);
                        if (voice) voice.lastY = undefined;
                        return;
                    }
                    ys.push({id: object.id, y});
                    const syy = (top - y) / (top - bottom) * height;
                    const color = voice?.color ?? object.rendNode?.getAttribute('stroke') ?? '#587445';
                    parts.push(`<circle class="ux-voice" cx="${sx}" cy="${syy}" r="6" style="fill:${color}"/>`);
                    if (voice && context) {
                        const frequency = 196 * Math.pow(2, 2.2 * (y - bottom) / (top - bottom));
                        voice.osc.frequency.setTargetAtTime(frequency, context.currentTime, 0.015);
                        voice.gain.gain.setTargetAtTime(0.11 / Math.max(1, voices.size * 0.7), context.currentTime, 0.03);
                        voice.pan.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, phase * 1.8 - 0.9)), context.currentTime, 0.03);
                        // A zero of the curve clicks.
                        if (voice.lastY !== undefined && voice.lastY * y < 0 && Math.abs(voice.lastY - y) < (top - bottom) / 4) {
                            ping(1568, 0.09, 0.22);
                            rings.push({x: sx, y: (top - 0) / (top - bottom) * height, born: now, kind: 'zero'});
                        }
                        voice.lastY = y;
                    }
                });
                // Two curves crossing chime.
                if (playingRef.current) for (let i = 0; i < ys.length; i++) for (let j = i + 1; j < ys.length; j++) {
                    const key = `${ys[i].id}|${ys[j].id}`;
                    const difference = ys[i].y - ys[j].y;
                    const previous = crossLast.get(key);
                    if (previous !== undefined && previous * difference < 0 && Math.abs(previous - difference) < (top - bottom) / 4) {
                        ping(1046, 0.25, 0.14); ping(1318, 0.3, 0.1);
                        rings.push({x: sx, y: (top - ys[i].y) / (top - bottom) * height, born: now, kind: 'cross'});
                    }
                    crossLast.set(key, difference);
                }
                for (const [id, voice] of voices) if (!seen.has(id)) {
                    if (context) voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.05);
                    try { voice.osc.stop((context?.currentTime ?? 0) + 0.3); } catch { /* stopped */ }
                    voices.delete(id);
                }
                rings = rings.filter(ring => now - ring.born < 700);
                for (const ring of rings) {
                    const age = (now - ring.born) / 700;
                    parts.push(`<circle class="ux-ring ux-ring-${ring.kind}" cx="${ring.x}" cy="${ring.y}" r="${6 + age * 22}" style="opacity:${1 - age}"/>`);
                }
                svg.innerHTML = parts.join('');
                grip.style.left = `${sx}px`;
            };
            const loop = (now: number) => {
                raf = 0;
                if (!playingRef.current) return;
                const dt = last ? now - last : 0;
                last = now;
                if (!scrubbing) phase = (phase + dt / PERIOD) % 1;
                render(now);
                raf = requestAnimationFrame(loop);
            };
            controls.current = {
                start: () => {
                    const audio = ensureAudio();
                    void audio?.resume();
                    frame.classList.add('ux-sounding');
                    last = 0;
                    crossLast = new Map();
                    if (!raf) raf = requestAnimationFrame(loop);
                },
                stop: () => {
                    frame.classList.remove('ux-sounding');
                    cancelAnimationFrame(raf);
                    raf = 0;
                    silenceAll();
                    svg.innerHTML = '';
                },
            };
            const scrubTo = (event: PointerEvent) => {
                const rect = container.getBoundingClientRect();
                phase = Math.max(0, Math.min(0.9999, (event.clientX - rect.left) / rect.width));
            };
            const down = (event: PointerEvent) => { scrubbing = true; grip.setPointerCapture(event.pointerId); scrubTo(event); event.preventDefault(); };
            const move = (event: PointerEvent) => { if (scrubbing) scrubTo(event); };
            const up = () => { scrubbing = false; };
            grip.addEventListener('pointerdown', down);
            grip.addEventListener('pointermove', move);
            grip.addEventListener('pointerup', up);
            grip.addEventListener('pointercancel', up);
            if (playingRef.current) controls.current.start();
            return () => {
                controls.current.stop();
                void context?.close();
                svg.remove();
                grip.remove();
            };
        });
    }, [props.frame]);
    const toggle = () => {
        if (playing) { controls.current.stop(); setPlaying(false); }
        else { setPlaying(true); playingRef.current = true; controls.current.start(); }
    };
    return <div className="ux-sound-tools">
        <button type="button" aria-pressed={playing} onClick={toggle} title="Krivulje zapojejo: višina tona je višina krivulje">
            <svg viewBox="0 0 20 16" aria-hidden="true"><path d="M2 6 H5 L9 2 V14 L5 10 H2 Z"/>{playing ? <path d="M12 5 C14 7, 14 9, 12 11 M14.5 3 C18 6, 18 10, 14.5 13"/> : <path d="M13 6 L17 10 M17 6 L13 10"/>}</svg>
            {playing ? 'Ustavi zvok' : 'Poslušaj krivuljo'}
        </button>
        {playing && <p className="ux-sound-hint">Višina tona = višina krivulje · klik = ničla · zvonec = presečišče</p>}
    </div>;
}
