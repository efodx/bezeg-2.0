import React, {useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {currentParams, getParam, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {Bloom, drawn, meaningful, tolerance} from './YourTurn';
import {settle, svgRootOf} from './family';
import {uxEnabled} from './flags';
import './Challenge.css';

/**
 * a24 — A challenge for a friend. Shape any graph with the sliders, press "Izziv" and get a link. Whoever opens it sees
 * the same graph page at its starting values with your graph drawn as a dashed target, and has to hit it with the
 * sliders; a closeness bar and a move counter keep score, an elderflower bloom says "zadeto". Then they make one back.
 * Students set each other tasks, which is retrieval and explanation at once. Static and client-only: the challenge
 * lives in the link (parameter labels and values), the target is drawn by setting the board to it for a moment.
 */

interface Stored { l: string; v: number }
const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? (entry.label.match(/\s(\S{1,2})$/)?.[1] ?? entry.label);
const shapeSignature = (node: Element) => ['d', 'points', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'r'].map(name => node.getAttribute(name) ?? '').join('|');

function encode(items: Stored[]): string {
    const json = JSON.stringify(items);
    return btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(text: string): Stored[] | undefined {
    try {
        const bytes = Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const value = JSON.parse(new TextDecoder().decode(bytes));
        return Array.isArray(value) && value.every(item => typeof item?.l === 'string' && Number.isFinite(item?.v)) ? value : undefined;
    } catch { return undefined; }
}
const incoming = () => typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('izziv') ?? undefined;

export function Challenge(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const usable = params.filter(entry => meaningful(entry) && entry.unavailable === undefined);
    const starts = useRef(new Map<string, number>());
    for (const entry of usable) if (!starts.current.has(entry.label)) starts.current.set(entry.label, entry.value);

    const [panel, setPanel] = useState(false);
    const [copied, setCopied] = useState(false);
    const [code] = useState(incoming);
    const [target, setTarget] = useState<{keys: string[]; values: number[]; ghost?: SVGSVGElement; box?: {width: number; height: number; left: number; top: number}}>();
    const [problem, setProblem] = useState<string>();
    const startedAt = useRef(0);
    const [seconds, setSeconds] = useState(0);
    const [solved, setSolved] = useState(false);
    const host = useRef<HTMLDivElement>(null);

    // The friend's side: build the target once the sliders are there.
    useEffect(() => {
        if (!code || target || usable.length === 0) return;
        const timer = window.setTimeout(async () => {
            const items = decode(code);
            if (!items) { setProblem('Povezava izziva je poškodovana.'); return; }
            const keys: string[] = [], values: number[] = [];
            for (const item of items) {
                const entry = currentParams().find(e => e.label === item.l);
                if (!entry) continue;
                const value = Math.min(entry.max, Math.max(entry.min, item.v));
                if (Math.abs(value - entry.value) > tolerance(entry)) { keys.push(entry.key); values.push(value); }
            }
            if (keys.length === 0) { setProblem('Ta izziv se ne ujema s to stranjo.'); return; }
            const b = findBoard(props.frame.current);
            const svg = b && svgRootOf(b);
            if (!b || !svg) return;
            const start = keys.map(key => getParam(key)!.value);
            const before = new Map(drawn(b).map(object => [object.rendNode!.id, shapeSignature(object.rendNode!)]));
            await settle(b, keys, values);
            const clone = svg.cloneNode(true) as SVGSVGElement;
            const changed = new Set(drawn(b).map(object => object.rendNode!).filter(node => before.get(node.id) !== shapeSignature(node)).map(node => node.id));
            await settle(b, keys, start);
            clone.querySelectorAll('[id]').forEach(node => {
                if (['path', 'line', 'ellipse', 'circle', 'polygon', 'rect', 'polyline'].includes(node.tagName.toLowerCase()) && !changed.has(node.id)) node.remove();
            });
            clone.querySelectorAll('text, foreignObject, image').forEach(node => node.remove());
            const frame = props.frame.current!.getBoundingClientRect(), box = svg.getBoundingClientRect();
            startedAt.current = performance.now();
            setTarget({keys, values, ghost: clone, box: {width: box.width, height: box.height, left: box.left - frame.left, top: box.top - frame.top}});
        }, 700);
        return () => window.clearTimeout(timer);
    }, [code, target, usable.length, props.frame]);

    useEffect(() => {
        const node = host.current;
        if (!node || !target?.ghost || !target.box) return;
        target.ghost.setAttribute('width', String(target.box.width));
        target.ghost.setAttribute('height', String(target.box.height));
        node.replaceChildren(target.ghost);
    }, [target]);


    const closeness = target ? target.keys.map((key, i) => {
        const entry = getParam(key);
        if (!entry) return 0;
        return Math.max(0, 1 - Math.abs(entry.value - target.values[i]) / ((entry.max - entry.min) * 0.35));
    }) : [];
    const score = closeness.length ? closeness.reduce((a, b) => a + b, 0) / closeness.length : 0;
    const hit = !!target && target.keys.every((key, i) => { const entry = getParam(key); return !!entry && Math.abs(entry.value - target.values[i]) <= tolerance(entry); });
    useEffect(() => {
        if (!hit || solved || !target) return;
        // Land exactly on the target so the curves coincide.
        target.keys.forEach((key, i) => getParam(key)?.set(target.values[i]));
        setSeconds(Math.max(1, Math.round((performance.now() - startedAt.current) / 1000)));
        setSolved(true);
    }, [hit, solved, target]);

    const changedNow = usable.filter(entry => Math.abs(entry.value - (starts.current.get(entry.label) ?? entry.value)) > tolerance(entry));
    const link = (() => {
        if (typeof window === 'undefined') return '';
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set('ux', 'a24');
        url.searchParams.set('izziv', encode(changedNow.map(entry => ({l: entry.label, v: Number(entry.value.toPrecision(8))}))));
        return url.toString();
    })();
    const copy = async (input: HTMLInputElement | null) => {
        try { await navigator.clipboard.writeText(link); setCopied(true); return; } catch { /* plain http: fall back */ }
        if (input) { input.select(); setCopied(document.execCommand('copy')); }
    };
    const inputRef = useRef<HTMLInputElement>(null);
    const bottom = 64 + ['a10', 'a11', 'a13', 'a14', 'a15', 'a18', 'a21'].filter(flag => uxEnabled(flag as 'a10')).length * 48;
    const own = () => { window.history.replaceState(null, '', `${window.location.pathname}?ux=a24`); setTarget(undefined); setSolved(false); host.current?.replaceChildren(); setPanel(true); };

    if (usable.length === 0) return null;
    return <>
        {target?.box && <div ref={host} className={`ux-challenge-ghost${solved ? ' is-solved' : ''}`} style={target.box} aria-hidden="true"/>}
        {code && target && <div className="ux-challenge-bar" role="status">
            {solved
                ? <><b>Zadeto!</b> V {seconds} s. <button type="button" onClick={own}>Ustvari izziv zanj</button></>
                : <><b>Izziv</b> Premakni drsnike, da graf pokrije črtkano krivuljo ({target.keys.length === 1 ? 'spremenjen je 1 parameter' : target.keys.length === 2 ? 'spremenjena sta 2 parametra' : `spremenjeni so ${target.keys.length} parametri`}).
                    <span className="ux-challenge-meter" aria-label={`Bližina ${Math.round(score * 100)} %`}><span style={{width: `${Math.round(score * 100)}%`}}/></span></>}
        </div>}
        {solved && <Bloom/>}
        {code && problem && <p className="ux-challenge-bar" role="status">{problem} <button type="button" onClick={own}>Ustvari svoj izziv</button></p>}
        {!code || problem ? <button type="button" className={`ux-challenge-start${panel ? ' is-on' : ''}`} style={{bottom}} aria-expanded={panel} onClick={() => { setPanel(value => !value); setCopied(false); }}
            title="Oblikuj graf in pošlji izziv prijatelju">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.5"/><circle cx="10" cy="10" r="0.8" className="eye"/></svg>
            Izziv
        </button> : null}
        {panel && (!code || problem) && <div className="ux-challenge-panel" role="dialog" aria-label="Izziv za prijatelja">
            <b>Izziv za prijatelja</b>
            {changedNow.length === 0
                ? <p>Najprej z drsniki oblikuj graf, ki naj ga prijatelj zadene. Začel bo z današnjimi vrednostmi.</p>
                : <>
                    <p>Prijatelj bo videl tvoj graf črtkano in ga bo moral zadeti: {changedNow.map(entry => <i key={entry.key}>{symbolOf(entry)}</i>).reduce<React.ReactNode[]>((out, item, i) => i ? [...out, ', ', item] : [item], [])}.</p>
                    <input ref={inputRef} readOnly value={link} onFocus={event => event.currentTarget.select()} aria-label="Povezava izziva"/>
                    <span className="ux-challenge-actions">
                        <button type="button" onClick={() => void copy(inputRef.current)}>{copied ? 'Kopirano ✓' : 'Kopiraj povezavo'}</button>
                        <a href={link} target="_blank" rel="noreferrer">Preizkusi sam</a>
                    </span>
                </>}
        </div>}
    </>;
}
