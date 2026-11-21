/**
 * Prototype c6 "Poslušaj" (an instrument; after audio graphs for blind students and Desmos's audio trace). A playhead
 * sweeps the board from left to right and every drawn curve sings its height: higher on the board, higher pitch;
 * the sound pans from the left speaker to the right; a gap in a curve is silence and a crossing of the x axis clicks.
 * Symmetry, periodicity, growth and roots become audible, and an oscillating slider (c2) plays the graph like a
 * theremin. Reads only the drawn picture, so it works on every board.
 */
import type {Board} from "jsxgraph";
import {boardShapes, sampleShape} from "./boardShapes";
import "./ux.css";

type Vec = [number, number];
const SWEEP_SECONDS = 4.5;
const VOICES = 4;
const LOW = 196, HIGH = 1046;
const WAVES: OscillatorType[] = ['sine', 'triangle', 'sine', 'triangle'];
const VOICE_COLOURS = ['#c47b1f', '#3f8f5a', '#5a6fb0', '#a0507a'];

interface Track { points: Vec[]; colour: string }

function tracks(board: Board): Track[] {
    return boardShapes(board)
        .filter(shape => !shape.dot && ['curve', 'functiongraph'].includes(shape.element.elType))
        .map(shape => ({points: sampleShape(shape, 3), colour: shape.node.getAttribute('stroke') ?? '#19372f'}))
        .filter(track => track.points.length > 4)
        .slice(0, VOICES);
}

/** Heights where a track meets the vertical line at x (screen coordinates); several for a curve that turns back. */
function heightsAt(track: Track, x: number): number[] {
    const found: number[] = [];
    const points = track.points;
    for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1], [x1, y1] = points[i];
        if (Math.abs(x1 - x0) > 40 || Math.abs(y1 - y0) > 120) continue; // a jump is a gap, not a segment
        if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) found.push(y0 + (y1 - y0) * (x - x0) / (x1 - x0));
    }
    return found;
}

export function attachListen(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ux-listen-button';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor"/><path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>Poslušaj</span>';
    button.title = 'Poslušaj graf: višja točka zveni višje, ničla klikne';
    const head = document.createElement('div');
    head.className = 'ux-listen-head';
    head.hidden = true;
    container.append(button, head);
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) button.addEventListener(type, event => event.stopPropagation());

    let audio: AudioContext | undefined;
    let running: {stop: () => void} | undefined;

    const play = () => {
        audio ??= new AudioContext();
        void audio.resume();
        const context = audio;
        const master = context.createGain();
        master.gain.value = 0.0001;
        master.gain.exponentialRampToValueAtTime(0.5, context.currentTime + 0.08);
        master.connect(context.destination);
        const voices = Array.from({length: VOICES}, (_, index) => {
            const oscillator = context.createOscillator();
            oscillator.type = WAVES[index];
            const gain = context.createGain();
            gain.gain.value = 0;
            const pan = context.createStereoPanner();
            oscillator.connect(gain).connect(pan).connect(master);
            oscillator.start();
            const marker = document.createElement('span');
            marker.className = 'ux-listen-marker';
            marker.style.background = VOICE_COLOURS[index];
            marker.hidden = true;
            head.appendChild(marker);
            return {oscillator, gain, pan, marker, lastY: NaN};
        });
        const click = () => {
            const tick = context.createOscillator();
            const tickGain = context.createGain();
            tick.type = 'square';
            tick.frequency.value = 1800;
            tickGain.gain.setValueAtTime(0.18, context.currentTime);
            tickGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
            tick.connect(tickGain).connect(master);
            tick.start();
            tick.stop(context.currentTime + 0.07);
        };
        let current = tracks(board);
        let lastSample = performance.now();
        const began = performance.now();
        let frame = 0;
        head.hidden = false;
        button.setAttribute('aria-pressed', 'true');
        button.querySelector('span')!.textContent = 'Ustavi';

        const stop = () => {
            cancelAnimationFrame(frame);
            const now = context.currentTime;
            master.gain.cancelScheduledValues(now);
            master.gain.setValueAtTime(master.gain.value, now);
            master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            for (const voice of voices) voice.oscillator.stop(now + 0.15);
            window.setTimeout(() => master.disconnect(), 300);
            head.replaceChildren();
            head.hidden = true;
            button.setAttribute('aria-pressed', 'false');
            button.querySelector('span')!.textContent = 'Poslušaj';
            running = undefined;
        };
        running = {stop};

        const tick = (now: number) => {
            const width = svg.clientWidth, height = svg.clientHeight;
            const progress = (now - began) / 1000 / SWEEP_SECONDS;
            if (progress >= 1) { stop(); return; }
            if (now - lastSample > 120) { current = tracks(board); lastSample = now; }
            const x = progress * width;
            head.style.transform = `translateX(${x}px)`;
            const axisY = board.origin.scrCoords[2];
            const at = context.currentTime;
            voices.forEach((voice, index) => {
                const track = current[index];
                const ys = track ? heightsAt(track, x).filter(y => y >= -20 && y <= height + 20) : [];
                if (ys.length === 0) {
                    voice.gain.gain.setTargetAtTime(0, at, 0.02);
                    voice.marker.hidden = true;
                    voice.lastY = NaN;
                    return;
                }
                // The point nearest to the previous one keeps a voice on its own branch.
                const y = Number.isFinite(voice.lastY) ? ys.reduce((best, value) => Math.abs(value - voice.lastY) < Math.abs(best - voice.lastY) ? value : best) : ys[0];
                if (Number.isFinite(voice.lastY) && (voice.lastY - axisY) * (y - axisY) < 0) click();
                voice.lastY = y;
                const unit = Math.min(1, Math.max(0, 1 - y / height));
                voice.oscillator.frequency.setTargetAtTime(LOW * Math.pow(HIGH / LOW, unit), at, 0.015);
                voice.gain.gain.setTargetAtTime(0.22 / Math.max(1, current.length * 0.8), at, 0.02);
                voice.pan.pan.setTargetAtTime(progress * 1.6 - 0.8, at, 0.03);
                voice.marker.hidden = false;
                voice.marker.style.transform = `translate(-50%, ${y}px)`;
                voice.marker.style.background = track.colour;
            });
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
    };

    button.addEventListener('click', event => {
        event.stopPropagation();
        if (running) running.stop();
        else play();
    });

    return () => {
        running?.stop();
        void audio?.close();
        button.remove();
        head.remove();
    };
}
