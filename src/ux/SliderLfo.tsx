/**
 * Prototype c2 "Nihalo" (a synthesizer's LFO on every slider). One press sets the parameter sweeping back and forth
 * through its whole range, a second press doubles the tempo, a third stops it. Several sliders can swing at once at
 * their own tempos, which turns any graph into a little machine (and, with c1, into a family of curves).
 */
import {useEffect, useRef, useState} from "react";
import "./ux.css";

interface LfoProps {
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => unknown;
    inert: boolean;
    cyclic?: number;
    label: string;
}

const SPEEDS = [0, 1, 2.6] as const;
/** Seconds to cross the whole range once at speed 1. */
const CROSSING_SECONDS = 3.2;

export function SliderLfo(props: LfoProps) {
    const [speedIndex, setSpeedIndex] = useState(0);
    const latest = useRef(props);
    latest.current = props;
    const button = useRef<HTMLButtonElement>(null);
    const speed = SPEEDS[speedIndex];

    useEffect(() => {
        if (speed === 0) return undefined;
        const field = button.current?.closest('.slider-field');
        // Taking hold of the slider (or typing a value) stops the swing, as touching a vibrating string does.
        const stop = (event: Event) => {
            if (button.current && event.target instanceof Node && button.current.contains(event.target)) return;
            setSpeedIndex(0);
        };
        field?.addEventListener('pointerdown', stop);
        field?.addEventListener('keydown', stop);
        const {min, max, value, cyclic} = latest.current;
        const span = max - min;
        // Position along a there-and-back path: 0..1 rising, 1..2 falling (a cyclic slider only rises and wraps).
        let position = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
        if (cyclic === undefined && position >= 1) position = 1;
        let lastShown = value;
        let previous = performance.now();
        let frame = window.requestAnimationFrame(function tick(now) {
            const current = latest.current;
            const dt = Math.min(0.1, (now - previous) / 1000);
            previous = now;
            if (current.inert) {
                setSpeedIndex(0);
                return;
            }
            position += dt * speed / CROSSING_SECONDS;
            const range = current.cyclic ?? (current.max - current.min);
            let unit: number;
            if (current.cyclic !== undefined) {
                position %= 1;
                unit = position;
            } else {
                position %= 2;
                unit = position <= 1 ? position : 2 - position;
            }
            let next = current.min + unit * range;
            if (current.step > 0) next = current.min + Math.round((next - current.min) / current.step) * current.step;
            next = current.cyclic !== undefined
                ? current.min + ((next - current.min) % current.cyclic + current.cyclic) % current.cyclic
                : Math.min(current.max, Math.max(current.min, next));
            next = Math.round(next * 1e9) / 1e9;
            if (next !== lastShown) {
                lastShown = next;
                current.onChange(next);
            }
            frame = window.requestAnimationFrame(tick);
        });
        return () => {
            window.cancelAnimationFrame(frame);
            field?.removeEventListener('pointerdown', stop);
            field?.removeEventListener('keydown', stop);
        };
    }, [speed]);

    const title = speed === 0 ? `Zaniha ${props.label}: vrednost samodejno potuje po vsem razponu`
        : speed === SPEEDS[1] ? 'Pritisni še enkrat za hitrejše nihanje' : 'Ustavi nihanje';
    return <button ref={button} type="button" className="ux-lfo" data-speed={speedIndex} aria-pressed={speed !== 0} disabled={props.inert && speed === 0}
                   aria-label={speed === 0 ? `Zaniha: ${props.label}` : `Nihanje ${speedIndex === 1 ? 'počasi' : 'hitro'}: ${props.label}`} title={title}
                   onClick={() => setSpeedIndex(index => (index + 1) % SPEEDS.length)}>
        <svg viewBox="0 0 24 14" width="20" height="12" aria-hidden="true">
            <path className="ux-lfo-wave" d="M0 7 C3 0 6 0 9 7 S15 14 18 7 S21 0 24 7 S30 14 33 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {speed !== 0 && <span className="ux-lfo-speed">{speedIndex === 1 ? '1×' : '2×'}</span>}
    </button>;
}
