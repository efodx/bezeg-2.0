import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {contentElements, coverBoard, elementSignature, findMainBoard, recoverBoards, svgRoot, type UxBoard, type UxElement} from './board';
import {bindControls, rangeInputs} from './controls';
import {applyRow, fanRows, rowName, type FanRow} from './fan';
import {geometryKey, sampleNode} from './geometrySamples';
import './uxlab.css';

const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});

const PALETTE = ['#6b3f80', '#b5651d', '#2c7393', '#7c8c25', '#a8385b', '#2f7d5a', '#8a6a12', '#4b4fa3', '#9b4f2f', '#3d6f6f'];
const GEOMETRY = /^(path|line|ellipse|circle|polygon|polyline|rect)$/i;
const KIND: Record<string, string> = {
    curve: 'krivulja', functiongraph: 'graf', line: 'premica', segment: 'daljica', point: 'točka', glider: 'drsna točka', circle: 'krožnica',
    polygon: 'večkotnik', arc: 'lok', sector: 'izsek', arrow: 'puščica', intersection: 'presečišče', midpoint: 'razpolovišče', conic: 'stožnica',
    integral: 'ploščina', riemannsum: 'Riemannova vsota', polygonalchain: 'lomljenka', angle: 'kot', tangent: 'tangenta', perpendicular: 'pravokotnica', parallel: 'vzporednica',
};

interface Probe {
    rows: FanRow[];
    names: string[];
    /** Element ids each row moves. */
    moves: Map<string, Set<string>>;
}

/** Accusative, for "Na … vpliva": na krivuljo, na premico, na točko P. */
const ACCUSATIVE: Record<string, string> = {
    krivulja: 'krivuljo', premica: 'premico', daljica: 'daljico', točka: 'točko', 'drsna točka': 'drsno točko', krožnica: 'krožnico', stožnica: 'stožnico',
    ploščina: 'ploščino', 'Riemannova vsota': 'Riemannovo vsoto', lomljenka: 'lomljenko', puščica: 'puščico', tangenta: 'tangento', pravokotnica: 'pravokotnico', vzporednica: 'vzporednico',
};

function elementLabel(element: UxElement): string {
    const kind = KIND[element.elType] ?? element.elType;
    const name = (element.name ?? '').replace(/<[^>]+>/g, '').replace(/[{}$\\]/g, '').trim();
    // Only names a learner would read on the board (P, P1, A'); internal ids such as s_d stay hidden.
    const readable = /^[A-Za-zα-ω](_?\d+)?'*$/.test(name) ? name.replace('_', '') : '';
    const accusative = ACCUSATIVE[kind] ?? kind;
    return readable ? `${accusative} ${readable}` : accusative;
}

/**
 * Elements keyed by what they look like and their order among look-alikes: some graphs rebuild every element on a
 * restore, so JSXGraph ids do not survive a probe.
 */
function stableElements(board: UxBoard): Map<string, UxElement> {
    const seen = new Map<string, number>();
    const result = new Map<string, UxElement>();
    for (const element of contentElements(board).filter(probeable)) {
        const signature = elementSignature(element);
        const index = seen.get(signature) ?? 0;
        seen.set(signature, index + 1);
        result.set(`${signature}#${index}`, element);
    }
    return result;
}

function probeable(element: UxElement): boolean {
    return Boolean(element.rendNode && GEOMETRY.test(element.rendNode.tagName)) && element.elType !== 'text' && element.elType !== 'label';
}

/**
 * Lane B b7: a dependency x-ray of any scene. Each free quantity is nudged once behind a frozen copy of the board; the
 * elements whose drawing changes depend on it. Pick a quantity and its dependants glow while the rest dims; tap an
 * element and the quantities (and inspector sliders) that move it light up.
 */
export function WhyLens(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [probe, setProbe] = useState<Probe>();
    const [busy, setBusy] = useState(false);
    const [focusRow, setFocusRow] = useState<string>();
    const [focusElement, setFocusElement] = useState<string>();
    const [message, setMessage] = useState('');
    const layer = useRef<SVGGElement>();
    const marked = useRef<Element[]>([]);
    const hovered = useRef(0);
    useEffect(() => { if (!window.__uxLesson) window.__uxLesson = {capabilities: props.capabilities, session: undefined}; }, [props.capabilities]);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
        };
        find();
        const timer = window.setInterval(find, 800);
        return () => window.clearInterval(timer);
    }, [props.root]);

    const run = useCallback(async () => {
        if (!board || busy) return;
        let base: LessonSceneCheckpoint;
        try { base = props.capabilities.captureState(); } catch { return; }
        const {rows, candidates} = fanRows(base.value, board.getBoundingBox(), 12, found => bindControls(found, props.root.current ?? document));
        if (rows.length === 0) { setMessage('Ta prizor nima prostih količin.'); return; }
        setBusy(true);
        const cover = coverBoard(board.containerObj);
        const keysNow = () => new Map([...stableElements(board)].map(([key, element]) => [key, geometryKey(element.rendNode!)]));
        const before = keysNow();
        const moves = new Map<string, Set<string>>();
        for (const row of rows) {
            // One step along the row's own ladder: small, and a value the graph has a slider position for.
            const tries = [row.now + 1, row.now - 1].filter(index => index >= 0 && index < row.deltas.length && row.deltas[index] !== 0);
            for (const index of tries) {
                try {
                    props.capabilities.restoreState({version: 1, value: applyRow(base.value, row, row.deltas[index])});
                    await nextFrames(2);
                    if (recoverBoards()) continue;
                    const after = keysNow();
                    const moved = new Set([...after].filter(([id, key]) => before.get(id) !== key).map(([id]) => id));
                    if (moved.size) { moves.set(row.id, moved); break; }
                } catch { recoverBoards(); }
                if (props.capabilities.isAvailable?.() === false) break;
            }
            if (props.capabilities.isAvailable?.() === false) break;
        }
        try { props.capabilities.restoreState(base); } catch { recoverBoards(); }
        await nextFrames(2);
        recoverBoards();
        cover.remove();
        setBusy(false);
        const kept = rows.filter(row => moves.has(row.id));
        if (kept.length === 0) { setMessage('Nobena količina ne premakne ničesar na grafu.'); return; }
        // Point rows come in pairs (↔, ↕) that move the same things: one chip per point.
        const merged: FanRow[] = [];
        for (const row of kept) {
            const twin = merged.find(other => other.kind === 'point' && row.kind === 'point' && other.key === row.key);
            if (twin) { moves.get(row.id)!.forEach(id => moves.get(twin.id)!.add(id)); continue; }
            merged.push(row);
        }
        const names = merged.map(row => rowName(row, undefined).replace(/\s[↔↕]$/, ''));
        const pointLabels = pointNamesFor(board, kept, candidates.grid);
        setProbe({rows: merged, names: merged.map((row, index) => pointLabels.get(row.key) ?? names[index]), moves});
        setFocusRow(undefined);
        setFocusElement(undefined);
        setMessage('');
    }, [board, busy, props.capabilities, props.root]);

    const close = useCallback(() => { setProbe(undefined); setFocusRow(undefined); setFocusElement(undefined); }, []);

    // Rows that move the focused element, and elements the focused row moves.
    const rowsForElement = useMemo(() => !probe || !focusElement ? [] : probe.rows.filter(row => probe.moves.get(row.id)?.has(focusElement)), [probe, focusElement]);
    const litRows = useMemo(() => new Set(focusRow ? [focusRow] : rowsForElement.map(row => row.id)), [focusRow, rowsForElement]);

    // The glow layer: clones of the lit elements in their quantity's colour; everything else dims.
    const paint = useCallback(() => {
        if (!board || !probe) return;
        const svg = svgRoot(board);
        if (!svg) return;
        if (!layer.current || !layer.current.isConnected) {
            layer.current = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            layer.current.setAttribute('class', 'ux-why-layer');
            layer.current.setAttribute('pointer-events', 'none');
            svg.appendChild(layer.current);
        }
        const active = focusRow ?? (focusElement ? '__element' : undefined);
        board.containerObj.classList.toggle('ux-why-dimmed', Boolean(active));
        if (!active) { layer.current.innerHTML = ''; return; }
        const byId = stableElements(board);
        const parts: string[] = [];
        const draw = (id: string, color: string, width: number) => {
            const node = byId.get(id)?.rendNode;
            if (!node) return;
            const clone = node.cloneNode(false) as Element;
            clone.removeAttribute('id');
            ['marker-start', 'marker-end', 'marker-mid', 'stroke-dasharray', 'style', 'class'].forEach(name => clone.removeAttribute(name));
            clone.setAttribute('stroke', color);
            clone.setAttribute('stroke-width', String(width));
            clone.setAttribute('stroke-linecap', 'round');
            clone.setAttribute('stroke-opacity', '.9');
            const tag = clone.tagName.toLowerCase();
            const small = (tag === 'ellipse' || tag === 'circle') && Number(clone.getAttribute('rx') ?? clone.getAttribute('r') ?? 0) < 9;
            clone.setAttribute('fill', small ? color : 'none');
            if (small) { clone.setAttribute('rx', '8'); clone.setAttribute('ry', '8'); clone.setAttribute('r', '8'); }
            parts.push(clone.outerHTML);
        };
        if (focusRow) {
            const index = probe.rows.findIndex(row => row.id === focusRow);
            for (const id of probe.moves.get(focusRow) ?? []) draw(id, PALETTE[index % PALETTE.length], 5);
        } else if (focusElement) {
            draw(focusElement, '#19372f', 6);
        }
        layer.current.innerHTML = parts.join('');
    }, [board, probe, focusRow, focusElement]);

    useEffect(() => {
        if (!board || !probe) return;
        paint();
        const onUpdate = () => paint();
        board.on('update', onUpdate);
        return () => board.off('update', onUpdate);
    }, [board, probe, paint]);

    useEffect(() => {
        if (probe || !board) return;
        layer.current?.remove();
        layer.current = undefined;
        board.containerObj.classList.remove('ux-why-dimmed');
    }, [probe, board]);
    useEffect(() => () => { layer.current?.remove(); document.querySelectorAll('.ux-why-dimmed').forEach(node => node.classList.remove('ux-why-dimmed')); }, []);

    // Tapping or hovering an element on the graph asks what moves it (nearest drawn element within a finger's reach).
    useEffect(() => {
        if (!board || !probe) return;
        const container = board.containerObj;
        const known = new Set([...probe.moves.values()].flatMap(ids => [...ids]));
        const nearest = (event: PointerEvent): string | undefined => {
            const svg = svgRoot(board);
            if (!svg || (event.target instanceof Element && event.target.closest('.ux-why, .ux-fan, .ux-match, .ux-fan-entry, .ux-why-entry'))) return undefined;
            const rect = svg.getBoundingClientRect();
            const x = event.clientX - rect.left, y = event.clientY - rect.top;
            let best: string | undefined;
            let bestDistance = event.pointerType === 'mouse' ? 10 : 18;
            for (const [key, element] of stableElements(board)) {
                const tag = element.rendNode!.tagName.toLowerCase();
                // Fills (a polygon's area) do not count; only strokes and points are things one points at.
                for (const [sx, sy] of sampleNode(element.rendNode!, 4)) {
                    const distance = Math.hypot(sx - x, sy - y) - (tag === 'ellipse' || tag === 'circle' ? 4 : 0) - (known.has(key) ? 1 : 0);
                    if (distance < bestDistance) { bestDistance = distance; best = key; }
                }
            }
            return best;
        };
        let frame = 0;
        const onMove = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse' || event.buttons) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const element = nearest(event);
                if (element) { setFocusRow(undefined); setFocusElement(element); }
            });
        };
        const onDown = (event: PointerEvent) => {
            const element = nearest(event);
            if (element) { setFocusRow(undefined); setFocusElement(element); }
        };
        container.addEventListener('pointermove', onMove);
        container.addEventListener('pointerdown', onDown, true);
        return () => { cancelAnimationFrame(frame); container.removeEventListener('pointermove', onMove); container.removeEventListener('pointerdown', onDown, true); };
    }, [board, probe]);

    // The inspector's sliders for the lit quantities get the same colour ring.
    useEffect(() => {
        marked.current.forEach(node => { node.classList.remove('ux-why-control'); (node as HTMLElement).style.removeProperty('--ux-why-color'); });
        marked.current = [];
        if (!probe) return;
        const root = props.root.current ?? document;
        const inputs = rangeInputs(root);
        const numbers = [...root.querySelectorAll<HTMLInputElement>('input[type=number], input[inputmode=decimal], input[inputmode=numeric]')].filter(input => input.offsetParent !== null);
        const labelText = (input: HTMLInputElement) => (input.labels?.[0]?.innerText ?? input.getAttribute('aria-label') ?? '').replace(/,\s*vrednost.*$/i, '').trim();
        probe.rows.forEach((row, index) => {
            if (!litRows.has(row.id)) return;
            let field: Element | null | undefined;
            const slider = row.label ? inputs.find(candidate => labelText(candidate) === row.label) : undefined;
            if (slider) {
                field = slider.closest('.form-range')?.parentElement ?? slider.parentElement;
            } else if (row.kind === 'scalar') {
                // A count has a stepper, not a slider: its label names it ("Stopnja n" for stopnja), or its value is unique.
                const name = probe.names[index].toLowerCase();
                const byName = name.length >= 3 ? numbers.filter(input => labelText(input).toLowerCase().includes(name)) : [];
                const byValue = numbers.filter(input => Number(input.value.replace(',', '.')) === row.leaves[0].value);
                const input = byName.length === 1 ? byName[0] : byValue.length === 1 ? byValue[0] : undefined;
                field = input?.parentElement;
            }
            if (!field) return;
            field.classList.add('ux-why-control');
            (field as HTMLElement).style.setProperty('--ux-why-color', PALETTE[index % PALETTE.length]);
            marked.current.push(field);
        });
    }, [probe, litRows, props.root]);

    if (!board || props.locked) return null;
    const focused = focusElement && board ? stableElements(board).get(focusElement) : undefined;
    const ui = !probe
        ? <div className="ux-why-entry">
            <button type="button" className="ux-why-open" disabled={busy} onClick={() => void run()}>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="5" cy="5" r="2.4" fill="currentColor"/><circle cx="5" cy="15" r="2.4" fill="currentColor"/><path d="M7 5 C12 5 11 10 15.5 10 M7 15 C12 15 11 10 15.5 10" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="16" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>
                {busy ? 'Preverjam …' : 'Kaj premika kaj?'}
            </button>
            {message && <span className="ux-match-message">{message}</span>}
        </div>
        : <div className="ux-why" role="group" aria-label="Kaj premika kaj">
            <div className="ux-why-head">
                <span className="ux-why-title">Kaj premika kaj?</span>
                <button type="button" className="ux-fan-close" aria-label="Zapri" onClick={close}>×</button>
            </div>
            <div className="ux-why-chips">
                {probe.rows.map((row, index) => {
                    const lit = litRows.has(row.id);
                    return <button key={row.id} type="button" aria-pressed={focusRow === row.id}
                        className={`${lit ? 'is-lit' : ''}${(focusRow || focusElement) && !lit ? ' is-faded' : ''}`}
                        style={{'--ux-why-color': PALETTE[index % PALETTE.length]} as React.CSSProperties}
                        onPointerEnter={event => { if (event.pointerType === 'mouse') { hovered.current = Date.now(); setFocusElement(undefined); setFocusRow(row.id); } }}
                        onFocus={() => { setFocusElement(undefined); setFocusRow(row.id); }}
                        onClick={() => {
                            // A mouse already lit the row on hover; a click keeps it. A tap toggles.
                            setFocusElement(undefined);
                            setFocusRow(current => current === row.id && Date.now() - hovered.current > 400 ? undefined : row.id);
                        }}>
                        <i aria-hidden="true"/>{probe.names[index]}<small>{probe.moves.get(row.id)?.size}</small>
                    </button>;
                })}
            </div>
            <p className="ux-why-readout" aria-live="polite">
                {focusRow && (() => {
                    const index = probe.rows.findIndex(row => row.id === focusRow);
                    const count = probe.moves.get(focusRow)?.size ?? 0;
                    return <><strong>{probe.names[index]}</strong> premakne {count === 1 ? 'en element' : count === 2 ? 'dva elementa' : count < 5 ? `${count} elemente` : `${count} elementov`} na grafu.</>;
                })()}
                {!focusRow && focused && (rowsForElement.length
                    ? <>Na <strong>{elementLabel(focused)}</strong> {rowsForElement.length === 1 ? 'vpliva' : 'vplivajo'}: {rowsForElement.map(row => probe.names[probe.rows.indexOf(row)]).join(', ')}.</>
                    : <>Na <strong>{elementLabel(focused)}</strong> ne vpliva nobena količina: je nepremično ozadje.</>)}
                {!focusRow && !focused && 'Dotakni se elementa na grafu ali izberi količino.'}
            </p>
        </div>;
    return createPortal(ui, board.containerObj);
}

function pointNamesFor(board: UxBoard, rows: FanRow[], grid: number | undefined): Map<string, string> {
    const names = new Map<string, string>();
    const unit = grid !== undefined ? 2 ** grid : 1;
    const handles = board.objectsList.filter(element => (element.elType === 'point' || element.elType === 'glider') && element.X && element.Y && element.name);
    for (const row of rows) {
        if (row.kind !== 'point' || !/(^|\.)points?\./i.test(row.key)) continue;
        // A point row knows one axis; the board point that matches it on that axis and is unique there names it.
        const value = row.leaves[0].value * unit;
        const candidates = handles.filter(element => Math.abs((row.axis === 'x' ? element.X!() : element.Y!()) - value) < 1e-6);
        if (candidates.length === 1 && !names.has(row.key)) names.set(row.key, (candidates[0].name ?? '').replace(/<[^>]+>/g, '').replace(/[{}$\\]/g, '').replace(/_(\d)/g, '$1').trim().slice(0, 6));
    }
    return names;
}
