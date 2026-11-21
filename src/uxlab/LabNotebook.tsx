import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../learning/model';
import {findMainBoard, recoverBoards, type UxBoard} from './board';
import {format} from './LiveProse';
import {bloom} from './MatchChallenge';
import {morphScene} from './morph';
import {snapshot, type Thumb} from './ParameterFan';
import {readouts} from './SliderTrace';
import './uxlab.css';

const nextFrames = (count: number) => new Promise<void>(resolve => {
    const step = (left: number) => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
});
const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

interface Quantity { name: string; value: number; input?: HTMLInputElement; min?: number; max?: number; step?: number }
interface Change { name: string; from: number; to: number }
interface Entry {
    id: number;
    kind: 'change' | 'test';
    changes: Change[];
    effects: Change[];
    /** Readouts that stayed put: an invariant is often the point (an inscribed angle, a sum). */
    kept: Change[];
    context?: Change[];
    before: Thumb;
    after: Thumb;
    checkpoint: LessonSceneCheckpoint;
    from: LessonSceneCheckpoint;
    verdict?: 'holds' | 'breaks' | 'flat';
    claim?: string;
}
interface Settled { key: string; checkpoint: LessonSceneCheckpoint; quantities: Quantity[]; readings: Map<string, number>; thumb: Thumb }
interface Conjecture { name: string; direction: 1 | -1; label: string; sign: 1 | -1 | 0; count: number; contradicted: boolean; delta: number }

/** "Središče c" → "c"; a label without a one-letter symbol stays a (short) label. */
function shortName(label: string): string {
    label = label.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    const token = label.replace(/[(),:]/g, ' ').trim().split(/\s+/).pop() ?? '';
    if (/^[A-Za-zα-ωΑ-Ω]$/.test(token)) return token;
    return label.length > 22 ? `${label.slice(0, 21)}…` : label;
}

function quantities(): Quantity[] {
    const found: Quantity[] = [];
    document.querySelectorAll<HTMLElement>('#workspace-inspector .slider-field').forEach(field => {
        const input = field.querySelector<HTMLInputElement>('input[type=range]');
        if (!input || input.disabled || field.offsetParent === null || /velikost elementov/i.test(field.textContent ?? '')) return;
        const label = (field.querySelector('.slider-label label, .form-label')?.textContent ?? input.labels?.[0]?.textContent ?? '').replace(/,\s*vrednost.*$/i, '').trim();
        if (label) found.push({name: shortName(label), value: Number(input.value), input, min: Number(input.min), max: Number(input.max), step: Number(input.step) || 0});
    });
    document.querySelectorAll<HTMLElement>('#workspace-inspector .count-setter').forEach(setter => {
        if (setter.offsetParent === null) return;
        const label = setter.querySelector('.count-setter-label')?.textContent ?? '';
        const field = setter.querySelector<HTMLInputElement>('input');
        const value = Number(field?.value ?? setter.querySelector('.count-setter-value')?.textContent);
        if (label && Number.isFinite(value)) found.push({name: shortName(label.trim()), value});
    });
    return found;
}

function setSlider(quantity: Quantity, value: number) {
    if (!quantity.input || quantity.min === undefined || quantity.max === undefined) return;
    const snapped = quantity.step ? Math.round((value - quantity.min) / quantity.step) * quantity.step + quantity.min : value;
    valueSetter?.call(quantity.input, String(Math.min(quantity.max, Math.max(quantity.min, Number(snapped.toFixed(9))))));
    quantity.input.dispatchEvent(new Event('input', {bubbles: true}));
    quantity.input.dispatchEvent(new Event('change', {bubbles: true}));
}

const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 + 1e-6 * Math.max(Math.abs(a), Math.abs(b));

/** Readouts that moved, without the moved quantities echoed back under their own name. */
function effectsOf(before: Map<string, number>, after: Map<string, number>, changes: Change[]): Change[] {
    const effects: Change[] = [];
    for (const [label, to] of after) {
        const from = before.get(label);
        if (from === undefined || near(from, to)) continue;
        const echo = changes.some(change => (near(change.from, from) && near(change.to, to)) || shortName(label) === change.name || label.trim() === change.name);
        if (echo) continue;
        // One quantity shown twice (board text and readout list) is one effect, under its shorter name.
        const twin = effects.findIndex(effect => near(effect.from, from) && near(effect.to, to));
        if (twin < 0) effects.push({name: label, from, to});
        else if (label.length < effects[twin].name.length) effects[twin] = {name: label, from, to};
    }
    return effects;
}

function keptOf(before: Map<string, number>, after: Map<string, number>, names: string[]): Change[] {
    const kept: Change[] = [];
    for (const [label, to] of after) {
        const from = before.get(label);
        if (from === undefined || !near(from, to) || names.includes(shortName(label)) || label.trim().length < 2) continue;
        const twin = kept.findIndex(item => near(item.to, to));
        if (twin < 0) kept.push({name: label, from, to});
        else if (label.length < kept[twin].name.length) kept[twin] = {name: label, from, to};
    }
    return kept;
}

const verb = (sign: number) => sign > 0 ? 'poveča' : 'zmanjša';
/** "from → to" with as many decimals as it takes for a real change not to print as "0 → 0". */
function arrow(change: Change): string {
    let from = format(change.from), to = format(change.to);
    for (let digits = 3; from === to && digits <= 6; digits++) {
        const fixed = (value: number) => { let text = value.toFixed(digits); if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, ''); return text.replace('.', ',').replace('-', '−'); };
        from = fixed(change.from); to = fixed(change.to);
    }
    return `${from} → ${to}`;
}

/** Rules that the learner's own experiments suggest: the same move, the same readout, the same direction. */
function conjectures(entries: Entry[]): Conjecture[] {
    const groups = new Map<string, {name: string; direction: 1 | -1; entries: Entry[]}>();
    for (const entry of entries) {
        if (entry.changes.length !== 1) continue;
        const change = entry.changes[0];
        const direction = change.to > change.from ? 1 : -1;
        const key = `${change.name}|${direction}`;
        const group = groups.get(key) ?? {name: change.name, direction, entries: []};
        group.entries.push(entry);
        groups.set(key, group);
    }
    const result: Conjecture[] = [];
    for (const group of groups.values()) {
        if (group.entries.length < 2) continue;
        const labels = new Map<string, number[]>();
        for (const entry of group.entries) for (const effect of entry.effects) labels.set(effect.name, [...(labels.get(effect.name) ?? []), Math.sign(effect.to - effect.from)]);
        const delta = group.entries.reduce((sum, entry) => sum + Math.abs(entry.changes[0].to - entry.changes[0].from), 0) / group.entries.length;
        for (const [label, signs] of labels) {
            if (signs.length < 2) continue;
            const positive = signs.filter(sign => sign > 0).length, negative = signs.length - positive;
            const sign = positive >= negative ? 1 : -1;
            result.push({name: group.name, direction: group.direction, label, sign, count: Math.max(positive, negative), contradicted: positive > 0 && negative > 0, delta});
        }
    }
    // Invariants: whatever you did to one quantity, this readout never moved.
    const byName = new Map<string, Entry[]>();
    for (const entry of entries) if (entry.changes.length === 1) byName.set(entry.changes[0].name, [...(byName.get(entry.changes[0].name) ?? []), entry]);
    for (const [name, list] of byName) {
        if (list.length < 2) continue;
        const label = list[0].kept.map(item => item.name).find(candidate => list.every(entry => entry.kept.some(item => item.name === candidate)));
        if (!label) continue;
        const delta = list.reduce((sum, entry) => sum + Math.abs(entry.changes[0].to - entry.changes[0].from), 0) / list.length;
        result.push({name, direction: 1, label, sign: 0, count: list.length, contradicted: false, delta});
    }
    // Contradictions first (they are the interesting ones), then invariants, then the best-supported rules.
    const rank = (rule: Conjecture) => rule.contradicted ? 2 : rule.sign === 0 ? 1 : 0;
    return result.sort((a, b) => rank(b) - rank(a) || b.count - a.count).slice(0, 3);
}

function ThumbPair(props: {entry: Entry; width: number; height: number}) {
    const box = props.entry.after.box ?? props.entry.before.box;
    const pad = 12;
    const view = box ? `${box[0] - pad} ${box[1] - pad} ${box[2] - box[0] + 2 * pad} ${box[3] - box[1] + 2 * pad}` : `0 0 ${props.width} ${props.height}`;
    return <svg className="ux-lab-thumb" viewBox={view} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g className="ux-lab-before" dangerouslySetInnerHTML={{__html: props.entry.before.markup}}/>
        <g dangerouslySetInnerHTML={{__html: props.entry.after.markup}}/>
    </svg>;
}

/**
 * Lane B b23: a lab notebook. Every settled change of the scene is written down as an experiment (what you moved, what the
 * readouts did, a before/after sketch). From two or more alike experiments the notebook drafts a rule ("če povečaš n, se
 * napaka zmanjša") and offers to test it elsewhere, with the other quantities shaken up; a rule that breaks is the lesson.
 */
export function LabNotebook(props: {root: React.RefObject<HTMLElement>; capabilities: LessonGraphCapabilities; locked: boolean}) {
    const [board, setBoard] = useState<UxBoard>();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState<Entry>();
    const [busy, setBusy] = useState(false);
    const [phone, setPhone] = useState(false);
    const caps = useRef(props.capabilities);
    caps.current = props.capabilities;
    const settled = useRef<Settled>();
    const pending = useRef<{key: string; since: number}>();
    const pointer = useRef(false);
    const quiet = useRef(false);
    const counter = useRef(0);
    const toastTimer = useRef(0);

    useEffect(() => {
        const find = () => {
            const next = findMainBoard(props.root.current ?? document);
            setBoard(current => current === next ? current : next);
            setPhone(window.matchMedia('(max-width: 700px)').matches);
        };
        find();
        const timer = window.setInterval(find, 800);
        const down = () => { pointer.current = true; };
        const up = () => { pointer.current = false; };
        window.addEventListener('pointerdown', down, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', up, true);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('pointerdown', down, true);
            window.removeEventListener('pointerup', up, true);
            window.removeEventListener('pointercancel', up, true);
        };
    }, [props.root]);

    const capture = (current: UxBoard): Settled | undefined => {
        let checkpoint: LessonSceneCheckpoint;
        try { checkpoint = caps.current.captureState(); } catch { return undefined; }
        return {key: JSON.stringify(checkpoint.value), checkpoint, quantities: quantities(), readings: readouts(current), thumb: snapshot(current)};
    };

    // Watch the scene; when it has been still for half a second, write down what changed since the last still moment.
    useEffect(() => {
        if (!board || props.locked) return;
        settled.current = capture(board);
        const timer = window.setInterval(() => {
            if (pointer.current || quiet.current) return;
            let key: string;
            try { key = JSON.stringify(caps.current.captureState().value); } catch { return; }
            const now = performance.now();
            if (!pending.current || pending.current.key !== key) { pending.current = {key, since: now}; return; }
            if (settled.current?.key === key || now - pending.current.since < 500) return;
            const previous = settled.current;
            const next = capture(board);
            if (!next) return;
            settled.current = next;
            if (!previous) return;
            const names = (list: Quantity[]) => list.map(item => item.name).join('|');
            // A new lesson step brings other controls: a new scene, not an experiment.
            if (names(previous.quantities) !== names(next.quantities)) return;
            const changes = next.quantities.flatMap((quantity, index) => near(quantity.value, previous.quantities[index].value) ? [] : [{name: quantity.name, from: previous.quantities[index].value, to: quantity.value}]);
            if (changes.length > 2) return;
            const effects = effectsOf(previous.readings, next.readings, changes);
            const kept = keptOf(previous.readings, next.readings, next.quantities.map(item => item.name));
            const entry: Entry = {id: ++counter.current, kind: 'change', changes, effects, kept, before: previous.thumb, after: next.thumb, checkpoint: next.checkpoint, from: previous.checkpoint};
            setEntries(list => [entry, ...list].slice(0, 40));
            setToast(entry);
            window.clearTimeout(toastTimer.current);
            toastTimer.current = window.setTimeout(() => setToast(undefined), 4200);
        }, 200);
        return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [board, props.locked]);

    useEffect(() => () => window.clearTimeout(toastTimer.current), []);

    /** Replays an entry: back to where it started, then the move itself as a morph. */
    const replay = (entry: Entry) => {
        quiet.current = true;
        try {
            caps.current.restoreState(entry.checkpoint);
            const morph = morphScene(caps.current, entry.from, {duration: 900});
            void (morph?.done ?? Promise.resolve()).finally(() => {
                if (board) settled.current = capture(board);
                quiet.current = false;
            });
        } catch { recoverBoards(); quiet.current = false; }
    };

    /** Tests a rule somewhere else: other sliders shaken to fresh values, the same move made again. */
    const test = async (rule: Conjecture) => {
        if (!board || busy) return;
        const all = quantities();
        const moved = all.find(item => item.name === rule.name);
        if (!moved?.input || moved.min === undefined || moved.max === undefined) return;
        setBusy(true);
        quiet.current = true;
        try {
            const others = all.filter(item => item !== moved && item.input);
            const context: Change[] = [];
            for (const other of others) {
                const fraction = 0.1 + Math.random() * 0.8;
                const from = other.value;
                setSlider(other, other.min! + (other.max! - other.min!) * fraction);
                context.push({name: other.name, from, to: Number(other.input!.value)});
            }
            const span = moved.max - moved.min;
            const delta = Math.min(rule.delta || span / 4, span / 2);
            const start = rule.direction > 0 ? moved.min + Math.random() * (span - delta) : moved.min + delta + Math.random() * (span - delta);
            setSlider(moved, start);
            await nextFrames(3);
            recoverBoards();
            const first = capture(board);
            const startValue = Number(moved.input.value);
            setSlider(moved, startValue + rule.direction * delta);
            await nextFrames(3);
            recoverBoards();
            const second = capture(board);
            if (!first || !second) return;
            const endValue = Number(moved.input.value);
            const change = {name: moved.name, from: startValue, to: endValue};
            const effects = effectsOf(first.readings, second.readings, [change]);
            const effect = effects.find(item => item.name === rule.label);
            const kept = keptOf(first.readings, second.readings, all.map(item => item.name));
            const verdict: Entry['verdict'] = rule.sign === 0
                ? (effect ? 'breaks' : second.readings.has(rule.label) ? 'holds' : 'flat')
                : !effect ? 'flat' : Math.sign(effect.to - effect.from) === rule.sign ? 'holds' : 'breaks';
            const entry: Entry = {
                id: ++counter.current, kind: 'test', changes: [change], effects: effect ? [effect, ...effects.filter(item => item !== effect).slice(0, 1)] : effects.slice(0, 2),
                kept: kept.filter(item => item.name === rule.label), context: context.filter(item => !near(item.from, item.to)), before: first.thumb, after: second.thumb, checkpoint: second.checkpoint, from: first.checkpoint, verdict,
                claim: rule.sign === 0 ? `ko spreminjaš ${rule.name}, se ${rule.label} ne spremeni` : `če ${rule.name} ${verb(rule.direction)}š, se ${rule.label} ${verb(rule.sign)}`,
            };
            setEntries(list => [entry, ...list].slice(0, 40));
            settled.current = second;
            pending.current = {key: second.key, since: performance.now()};
            if (verdict === 'holds') bloom(board.containerObj);
        } catch { recoverBoards(); } finally {
            quiet.current = false;
            setBusy(false);
        }
    };

    if (!board || props.locked) return null;
    const host = board.containerObj;
    const rules = conjectures(entries.filter(entry => entry.kind === 'change'));
    const sentence = (entry: Entry) => {
        const moved = entry.changes.length ? entry.changes.map(change => <span key={change.name}><b>{change.name}</b> {arrow(change)}</span>) : [<span key="drag">premik na grafu</span>];
        const effects = entry.effects.slice(0, 3).map(effect => <span key={effect.name} className={effect.to > effect.from ? 'is-up' : 'is-down'}>{effect.name} {arrow(effect)}</span>);
        return <>{moved}{(effects.length > 0 || entry.kept.length > 0) && <span className="ux-lab-then" aria-label="posledica">⇒</span>}{effects.length > 0 ? effects : entry.kept.length > 0
            ? entry.kept.slice(0, 2).map(item => <span key={item.name} className="ux-lab-kept">{item.name} ostane {format(item.to)}</span>)
            : <span className="ux-lab-none">odčitki enaki</span>}</>;
    };
    const tab = <button type="button" className="ux-lab-open" aria-expanded={open} onClick={() => setOpen(value => !value)}
        title="Laboratorijski dnevnik: vsak tvoj poskus je zapisan">📓 Dnevnik{entries.length > 0 && <span className="ux-lab-count">{entries.length}</span>}</button>;
    const toastNode = toast && !open && <div className={`ux-lab-toast${phone ? ' is-fixed' : ''}`} role="status"><span className="ux-lab-toast-tag">Zapisano</span>{sentence(toast)}</div>;
    const panel = open && <div className={`ux-lab${phone ? ' is-sheet' : ''}`} role="dialog" aria-label="Laboratorijski dnevnik" onPointerDown={event => event.stopPropagation()}>
        <div className="ux-lab-head">
            <strong>Laboratorijski dnevnik</strong>
            {entries.length > 0 && <button type="button" className="ux-lab-clear" onClick={() => setEntries([])}>Počisti</button>}
            <button type="button" className="ux-lab-close" aria-label="Zapri dnevnik" onClick={() => setOpen(false)}>✕</button>
        </div>
        {rules.length > 0 && <div className="ux-lab-rules">
            {rules.map(rule => <div key={`${rule.name}|${rule.direction}|${rule.label}`} className={`ux-lab-rule${rule.contradicted ? ' is-mixed' : ''}`}>
                <span className="ux-lab-rule-tag">{rule.contradicted ? 'Protislovje' : rule.sign === 0 ? 'Nespremenljivka?' : 'Domneva'}</span>
                <span className="ux-lab-rule-text">{rule.contradicted
                    ? <>Ob {rule.direction > 0 ? 'povečanju' : 'zmanjšanju'} {rule.name} {rule.label} enkrat narašča, drugič pada. Od česa je to odvisno?</>
                    : rule.sign === 0 ? <>Ko spreminjaš {rule.name}, se {rule.label} ne spremeni <small>({rule.count}× v tvojih poskusih)</small></>
                    : <>Če {rule.name} {verb(rule.direction)}š, se {rule.label} {verb(rule.sign)} <small>({rule.count}× v tvojih poskusih)</small></>}</span>
                <button type="button" className="ux-lab-test" disabled={busy || !quantities().find(item => item.name === rule.name)?.input} onClick={() => void test(rule)}>{busy ? 'Preizkušam …' : 'Preizkusi drugje'}</button>
            </div>)}
        </div>}
        {entries.length === 0 ? <p className="ux-lab-empty">Premakni drsnik ali točko. Vsak poskus se zapiše sam, iz podobnih poskusov pa dnevnik sestavi domnevo, ki jo lahko preizkusiš.</p>
            : <ol className="ux-lab-list">{entries.map(entry => <li key={entry.id} className={`ux-lab-entry${entry.kind === 'test' ? ` is-test is-${entry.verdict}` : ''}`}>
                <button type="button" className="ux-lab-replay" title="Ponovi ta poskus na grafu" onClick={() => replay(entry)}>
                    <ThumbPair entry={entry} width={board.canvasWidth} height={board.canvasHeight}/>
                </button>
                <div className="ux-lab-text">
                    {entry.kind === 'test' && <div className="ux-lab-verdict">{entry.verdict === 'holds' ? '✓ Drži tudi tu' : entry.verdict === 'breaks' ? '✗ Tu ne drži' : '– Tu se ne spremeni'}: <i>{entry.claim}</i></div>}
                    <div className="ux-lab-sentence">{sentence(entry)}</div>
                    {entry.context && entry.context.length > 0 && <div className="ux-lab-context">pri {entry.context.map(item => `${item.name} = ${format(item.to)}`).join(', ')}</div>}
                </div>
                <span className="ux-lab-num">#{entry.id}</span>
            </li>)}</ol>}
    </div>;
    return <>
        {createPortal(<>{tab}{!phone && toastNode}{!phone && panel}</>, host)}
        {phone && createPortal(<>{toastNode}{panel}</>, document.body)}
    </>;
}
