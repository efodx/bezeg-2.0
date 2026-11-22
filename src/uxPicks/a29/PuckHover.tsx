import React, {useEffect, useRef, useState} from 'react';
import {declaredPuckHelp} from '../declare/graphUxStore';
import {getParam, isSweeping, listParams, splitLabel, type ParamEntry} from '../a1/paramRegistry';
import {captureGhost, findBoard, captureQueue, type Ghost} from '../a19/ghost';
import {analyse, type Fan} from './fan';
import {trackFraction, valueAt} from './track';
import '../a19/ScrubPreview.css';
import './PuckHover.css';

/**
 * Pick a29 (from a29 + a19 in ux-challenge/a): a hover card on the pucks. The bottom strip of a slider puck is its track:
 * the pointer's x there is a value, the board shows the graph at that value as a dashed ghost, and pressing without
 * dragging jumps there (see `jumpValue` in Puck). Anywhere else on a puck, and on keyboard focus, the card shows what the
 * parameter does: a27's fan of neighbouring values drawn on the board, and one sentence naming what stays fixed.
 */

/** `name` and `about`: the parameter's full name and the text that went with its control in the tools (hidden there while
 * the pucks show it; owner, 2026-11-21: "the accompanying text ... should be moved to the tooltip"). */
interface Card {key: string; x: number; top: number; symbol: string; head?: string; note?: string; sentence?: string; busy?: boolean; name?: string; about?: string[]; how?: string}
interface Shown {fan: Fan; box: {left: number; top: number; width: number; height: number}}
type Job = {kind: 'ghost'; key: string; value: number} | {kind: 'overview'; key: string};

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);
/** What a card says when no fan could be drawn: nothing; how to preview is part of the how-to line below. */
const noFanHint = (_entry: ParamEntry) => '';
/** How to use the puck, in one line (the native tooltip it replaced): for the input in use, touch or pointer. */
const howTo = (entry: ParamEntry) => {
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (entry.kind !== 'range') return touch ? 'Povleci levo ali desno ali pritisni − in +.' : 'Povleci levo ali desno ali pritisni − in +; kazalec nad − ali + pokaže predogled.';
    return touch ? 'Povleci levo ali desno, za fino nastavljanje dvigni prst.'
        : 'Povleci levo ali desno; kazalec nad črto spodaj pokaže predogled, dvoklik vnese število, puščice premaknejo za korak.';
};
/** Pointer travel (px) along the track before the previewed value is chosen again. */
const AIM_DEADZONE_PX = 3;
/** How long (ms) an empty ghost waits before the previous one is withdrawn. */
const GHOST_HOLD_MS = 170;
/** How long (ms) the pointer rests on a puck before its overview probe starts. */
const OVERVIEW_DWELL_MS = 220;
const stateSignature = () => listParams().map(p => `${p.key}=${p.value}`).join(';');

export function PuckHover(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [ghost, setGhost] = useState<Ghost>();
    const [card, setCard] = useState<Card>();
    const [shown, setShown] = useState<Shown>();
    const host = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let busy = false;
        let pending: Job | undefined;
        let wanted: string | undefined;
        // The queued capture (next frame while captures are cheap, idle time once they are expensive): at most one.
        const queued = captureQueue(() => void run());
        let dwell = 0;
        let unghost = 0;
        // A press (a drag, a jump) is under way: no probe starts, and one in flight stops at its next step.
        let pressed = false;
        let hovered: HTMLElement | undefined;
        let ghostId: string | undefined;
        // Where the preview value was last chosen: a hand's tremor at a value boundary must not flip the preview back and forth.
        let aimed: {puck: HTMLElement; x: number} | undefined;
        const cache = new Map<string, {sig: string; fan: Fan | undefined}>();

        const unaim = () => {
            hovered?.classList.remove('is-aiming');
            hovered?.style.removeProperty('--aim');
        };
        const clear = () => {
            unaim(); hovered = undefined;
            pending = undefined; wanted = undefined; ghostId = undefined; aimed = undefined;
            window.clearTimeout(dwell); dwell = 0;
            window.clearTimeout(unghost); unghost = 0;
            setGhost(undefined); setCard(undefined); setShown(undefined);
        };
        // A ghost that has nothing to show (the pointer crosses the live value, or a value where the graph does not differ) is
        // withdrawn only if no ghost follows within a moment, so crossing it does not blink the preview off and on.
        const showGhost = (next: Ghost | undefined) => {
            window.clearTimeout(unghost); unghost = 0;
            if (next) setGhost(next); else unghost = window.setTimeout(() => { unghost = 0; setGhost(undefined); }, GHOST_HOLD_MS);
        };
        const boxOf = (svg: SVGSVGElement) => {
            const frame = props.frame.current!.getBoundingClientRect(), box = svg.getBoundingClientRect();
            return {left: box.left - frame.left, top: box.top - frame.top, width: box.width, height: box.height};
        };
        const anchor = (puck: HTMLElement) => {
            const frame = props.frame.current!.getBoundingClientRect(), box = puck.getBoundingClientRect();
            const row = (puck.closest('.ux-pucks-row') ?? puck).getBoundingClientRect();
            const half = 170; // half the widest card (with the tools text)
            return {x: Math.max(half, Math.min(frame.width - half, box.left + box.width / 2 - frame.left)), top: row.top - frame.top - 8};
        };
        const isWanted = (job: Job) => wanted === (job.kind === 'ghost' ? `g:${job.key}:${job.value}` : `o:${job.key}`);

        const queue = () => queued.poke();
        const run = async () => {
            const job = pending;
            if (!job) return;
            if (busy || pressed) return;
            pending = undefined;
            const board = findBoard(props.frame.current);
            const svg = board?.renderer.svgRoot;
            const entry = getParam(job.key);
            if (!board || !svg || !entry) return;
            busy = true;
            try {
                if (job.kind === 'ghost') {
                    if (entry.kind !== 'range') return;
                    if (Math.abs(job.value - entry.value) < 1e-12) { showGhost(undefined); return; }
                    const start = entry.value;
                    const result = await captureGhost(props.frame.current!, board, svg, () => entry.setRaw(job.value), () => (getParam(job.key) as typeof entry | undefined)?.setRaw(start));
                    if (isWanted(job)) showGhost(result);
                } else {
                    const sig = stateSignature();
                    let cached = cache.get(job.key);
                    if (!cached || cached.sig !== sig) {
                        const stop = () => pressed || !isWanted(job);
                        const fan = await analyse(board, svg, entry, stop);
                        if (stop()) return; // abandoned: nothing was learnt, nothing is cached
                        if (isSweeping()) { // no probe while something sweeps: say so, cache nothing
                            setCard(current => current && current.key === job.key ? {...current, busy: false, sentence: 'Med gibanjem ni predogleda.'} : current);
                            return;
                        }
                        // The probe leaves the values as they were, so the signature taken before still holds.
                        cached = {sig, fan};
                        cache.set(job.key, cached);
                    }
                    if (!isWanted(job)) return;
                    setShown(cached.fan && {fan: cached.fan, box: boxOf(svg)});
                    setCard(current => current && current.key === job.key
                        ? {...current, busy: false, sentence: cached!.fan ? cached!.fan.sentence : noFanHint(entry)} : current);
                }
            } finally {
                busy = false;
                if (pending) queue();
            }
        };
        const schedule = (job: Job) => {
            pending = job;
            window.clearTimeout(dwell); dwell = 0;
            // The overview probe walks the graph through neighbouring values: it waits for the pointer to rest, so a pointer
            // crossing a puck on its way to press it never starts one (a first drag would otherwise hitch behind it).
            if (job.kind === 'overview') { dwell = window.setTimeout(() => { dwell = 0; queue(); }, OVERVIEW_DWELL_MS); return; }
            queue();
        };

        const overview = (puck: HTMLElement, entry: ParamEntry) => {
            const id = `o:${entry.key}`;
            if (wanted === id) return;
            wanted = id; ghostId = undefined;
            window.clearTimeout(unghost); unghost = 0; setGhost(undefined); setShown(undefined);
            const cached = cache.get(entry.key);
            const fresh = cached && cached.sig === stateSignature();
            setCard({key: entry.key, ...anchor(puck), symbol: symbolOf(entry), busy: !fresh, name: entry.label, about: declaredPuckHelp(entry.key) ? [declaredPuckHelp(entry.key)!] : [], how: howTo(entry),
                sentence: fresh ? (cached.fan ? cached.fan.sentence : noFanHint(entry)) : undefined});
            schedule({kind: 'overview', key: entry.key});
        };

        const move = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            if (event.buttons !== 0) { if (wanted || hovered) clear(); return; }
            // The − and + of a count are previewed by a19's own tip; two boxes at once would crowd the board.
            if ((event.target as Element | null)?.closest?.('.ux-count-step, .count-setter-button')) { if (wanted || hovered) clear(); return; }
            const puck = (event.target as Element | null)?.closest?.('.ux-puck[data-param]') as HTMLElement | null;
            const entry = puck && getParam(puck.dataset.param!);
            if (!puck || !entry) { if (wanted || hovered) clear(); return; }
            if (hovered !== puck) { unaim(); hovered = puck; }
            const fraction = entry.kind === 'range' ? trackFraction(puck, event.clientX, event.clientY) : undefined;
            if (entry.kind !== 'range' || fraction === undefined) {
                unaim(); aimed = undefined;
                overview(puck, entry);
                return;
            }
            if (aimed && aimed.puck === puck && wanted?.startsWith('g:') && Math.abs(event.clientX - aimed.x) < AIM_DEADZONE_PX) return;
            aimed = {puck, x: event.clientX};
            const value = valueAt(entry, fraction);
            puck.classList.add('is-aiming');
            puck.style.setProperty('--aim', String(fraction));
            const locked = entry.inert || entry.unavailable !== undefined || !!puck.closest('.workspace-graph[data-lesson-locked="true"]');
            const same = Math.abs(value - entry.value) < 1e-12;
            const id = `g:${entry.key}:${value}`;
            const a = anchor(puck);
            setShown(undefined);
            setCard({key: entry.key, ...a, symbol: symbolOf(entry), head: `${symbolOf(entry)} = ${entry.format(value)}`,
                note: same ? 'tukaj je zdaj' : locked ? 'samo pogled: lekcija vodi ta drsnik' : 'klik: skoči sem'});
            if (wanted === id) return;
            wanted = id;
            ghostId = id;
            schedule({kind: 'ghost', key: entry.key, value});
        };
        let touching = false;
        const focusIn = (event: FocusEvent) => {
            if (touching) return; // a tap focuses the puck; whether it opens the card is decided on release
            const puck = (event.target as Element | null)?.closest?.('.ux-puck[data-param]') as HTMLElement | null;
            const entry = puck && getParam(puck.dataset.param!);
            if (!puck || !entry || hovered === puck) return;
            hovered = puck;
            overview(puck, entry);
        };
        const focusOut = (event: FocusEvent) => {
            if ((event.target as Element | null)?.closest?.('.ux-puck[data-param]')) clear();
        };
        const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') clear(); };
        // A press hides the preview; the puck itself decides whether the press jumps or scrubs.
        // Touch has no hover: a tap on a puck's name (not its value, track or buttons) toggles the same overview card, a tap anywhere else closes it.
        let touch: {id: number; x: number; y: number; puck: HTMLElement; wasOpen: boolean} | undefined;
        const down = (event: PointerEvent) => {
            pressed = true;
            const puck = (event.target as Element | null)?.closest?.('.ux-puck[data-param]') as HTMLElement | null;
            if (event.pointerType === 'touch') {
                touching = true;
                touch = puck && event.isPrimary ? {id: event.pointerId, x: event.clientX, y: event.clientY, puck, wasOpen: wanted === `o:${puck.dataset.param}`} : undefined;
                if (!puck) clear();
            }
            if (puck) { const keep = hovered; clear(); hovered = keep; }
        };
        const nameTapped = (puck: HTMLElement, entry: ParamEntry, event: PointerEvent) => {
            const target = event.target as Element | null;
            if (target?.closest?.('button, .ux-puck-value, .ux-puck-input')) return false;
            if (entry.kind === 'range' && trackFraction(puck, event.clientX, event.clientY) !== undefined) return false;
            const value = puck.querySelector('.ux-puck-value, .ux-puck-input')?.getBoundingClientRect();
            return !value || event.clientX < value.left;
        };
        const up = (event: PointerEvent) => {
            pressed = false;
            if (event.pointerType !== 'touch') return;
            const start = touch;
            touch = undefined;
            touching = false;
            if (!start || start.id !== event.pointerId || event.type !== 'pointerup') return;
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4) return;
            const entry = getParam(start.puck.dataset.param!);
            if (!entry || !nameTapped(start.puck, entry, event)) { clear(); return; }
            if (start.wasOpen) { clear(); return; }
            hovered = start.puck;
            overview(start.puck, entry);
        };
        document.addEventListener('pointermove', move, {passive: true});
        document.addEventListener('pointerdown', down, {passive: true});
        document.addEventListener('pointerup', up, {passive: true});
        document.addEventListener('pointercancel', up, {passive: true});
        document.addEventListener('focusin', focusIn);
        document.addEventListener('focusout', focusOut);
        document.addEventListener('keydown', keydown);
        void ghostId;
        return () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerdown', down);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            document.removeEventListener('focusin', focusIn);
            document.removeEventListener('focusout', focusOut);
            document.removeEventListener('keydown', keydown);
            queued.stop();
            unaim();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.frame]);

    useEffect(() => {
        const node = host.current;
        if (!node) return;
        node.replaceChildren();
        if (!ghost) return;
        ghost.svg.setAttribute('width', String(ghost.box.width));
        ghost.svg.setAttribute('height', String(ghost.box.height));
        node.appendChild(ghost.svg);
    }, [ghost]);

    return <>
        <div ref={host} className="ux-scrub-ghost" aria-hidden="true" style={ghost ? ghost.box : {display: 'none'}}/>
        {shown && <svg className="ux-hover-fan" aria-hidden="true" style={shown.box} width={shown.box.width} height={shown.box.height}>
            {shown.fan.paths.map((path, i) => <path key={i} d={path.d} className={path.offset < 0 ? 'is-less' : 'is-more'} style={{opacity: Math.abs(path.offset) === 1 ? 0.8 : 0.4}}/>)}
            {shown.fan.pins.map((pin, i) => <g key={i} transform={`translate(${pin.sx} ${pin.sy})`}><circle r="10" className="ux-hover-halo"/><circle r="4.5"/><text x="12" y="-11">{pin.text}</text></g>)}
        </svg>}
        {card && <div className={`ux-hover-card${card.about?.length ? ' has-about' : ''}`} style={{left: card.x, top: card.top}} role="status">
            {card.head
                ? <><strong>{card.head}</strong>{card.note && <small>{card.note}</small>}</>
                : <>{card.name && card.name !== card.symbol && <strong className="ux-hover-name">{card.name}</strong>}
                    {card.about?.map((text, i) => <p key={i} className="ux-hover-about">{text}</p>)}
                    {(card.busy || card.sentence) && <span><i>{card.symbol}</i> {card.busy ? 'graf preizkuša sosednje vrednosti …' : card.sentence}</span>}
                    {card.how && <span className="ux-hover-how">{card.how}</span>}
                    {!card.busy && shown && <small><b className="is-less"/>manjše <b className="is-more"/>večje vrednosti</small>}</>}
        </div>}
    </>;
}
