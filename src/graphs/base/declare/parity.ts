/**
 * Parity by golden values (task 02, slice 4; recipe in `docs/reviews/ux-picks-app-wide/02-parity.md`). Before a graph's
 * present inspector panel is removed, {@link recordParity} records what the panel shows over sampled states (Slovenian
 * text of its read-off rows, notes and the board's caption texts). {@link checkParity} renders the graph's declaration to
 * text for the same states and reports every difference. Test support only; the recordings are deleted in task 10.
 */
import {act} from '@testing-library/react';
import JXG from 'jsxgraph';
import type BaseGraph from '../BaseGraph';
import type {BaseGraphState} from '../BaseGraph';
import {mountGraph} from '../realGraphTestHarness';
import {formatNumber} from '../../../analysis/format';
import {isMessageNumber, renderMessage, setLanguage, type Message, type MessageNumber} from '../../../localization';
import type {FormattedValue, GraphDeclaration} from './graphDeclaration';

/** One sampled state: a name and the writes that bring the graph into it from the previous state. */
export interface ParityState {
    readonly name: string;
    readonly apply: (graph: BaseGraph<BaseGraphState>) => void | Promise<void>;
}

export interface RecordedRow {
    /** Stable locator: the label text plus its order among rows with that label (`label#0`). */
    readonly key: string;
    readonly label: string;
    readonly value: string;
}

export interface RecordedState {
    readonly name: string;
    readonly rows: readonly RecordedRow[];
    /** Sentences the panel shows next to the rows (`data-readout-note`). */
    readonly notes: readonly string[];
    /** Unlabelled read-offs (`<output>`, such as "t = 0,50"). */
    readonly outputs: readonly string[];
    /** Visible text objects of the board, sorted. */
    readonly captions: readonly string[];
}

export interface ParityRecording {
    readonly graph: string;
    readonly language: 'sl';
    readonly states: readonly RecordedState[];
}

/** Whitespace collapsed (non-breaking and thin spaces included) and the minus sign unified: the only tolerated differences. */
export const normalise = (text: string): string =>
    text.replace(/[\s   ]+/g, ' ').replace(/[−–‒]/g, '-').trim();

const textOf = (element: Element | null | undefined): string => normalise(element?.textContent ?? '');

/** What the mounted panel shows now. */
export function readPanel(container: HTMLElement, graph: BaseGraph<BaseGraphState>, name: string): RecordedState {
    const counts = new Map<string, number>();
    const rows: RecordedRow[] = [];
    // A control the declaration does not take over (the curve point editor stays in Orodja) is marked `data-parity-retained`.
    const shown = (element: Element): boolean => element.closest('[data-parity-retained]') === null;
    container.querySelectorAll('[data-readout]:not([data-readout-live])').forEach(element => {
        if (!shown(element)) return;
        const term = element.querySelector('dt');
        const value = element.querySelector('dd');
        const label = term ? textOf(term) : '';
        const order = counts.get(label) ?? 0;
        counts.set(label, order + 1);
        rows.push({key: `${label}#${order}`, label, value: value ? textOf(value) : textOf(element)});
    });
    const notes = [...container.querySelectorAll('[data-readout-note]')].filter(shown).map(textOf);
    const outputs = [...container.querySelectorAll('output')].filter(shown).map(textOf).filter(text => text !== '');
    const board = (graph as unknown as {board?: JXG.Board}).board;
    const captions: string[] = [];
    for (const object of (board?.objectsList ?? []) as any[]) {
        if (!object.visPropCalc?.visible) continue;
        if (object.elType !== 'text' && object.elType !== 'smartlabel') continue;
        // A caption may be HTML (one block per line): record the plain text of each line.
        const source = String(object.plaintext ?? object.htmlStr ?? '').replace(/<\/(div|p|br)>|<br\s*\/?>/g, '\n').replace(/<[^>]*>/g, '');
        for (const line of source.split('\n')) {
            const text = normalise(line);
            if (text) captions.push(text);
        }
    }
    return {name, rows, notes, outputs, captions: captions.sort()};
}

/** Mounts `graph`, applies each state in turn and records the panel after it. Slovenian. */
export async function recordParity(id: string, graph: BaseGraph<BaseGraphState>, states: readonly ParityState[]): Promise<ParityRecording> {
    return (await recordParityWithDeclarations(id, graph, states)).recording;
}

/** As {@link recordParity}, and the graph's `getDeclaration()` after each state (`undefined` for an undeclared graph). */
export async function recordParityWithDeclarations(id: string, graph: BaseGraph<BaseGraphState>, states: readonly ParityState[]):
    Promise<{recording: ParityRecording; declarations: (GraphDeclaration | undefined)[]}> {
    setLanguage('sl');
    const mounted = mountGraph(graph);
    const recorded: RecordedState[] = [];
    const declarations: (GraphDeclaration | undefined)[] = [];
    try {
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 1)); });
        for (const state of states) {
            await act(async () => { await state.apply(graph); });
            await act(async () => { await new Promise(resolve => setTimeout(resolve, 1)); });
            recorded.push(readPanel(mounted.view.container, graph, state.name));
            declarations.push(graph.getDeclaration());
        }
    } finally {
        mounted.view.unmount();
    }
    return {recording: {graph: id, language: 'sl', states: recorded}, declarations};
}

/** Text of a declared value: a number in the language's format, a message rendered. */
export const valueText = (value: MessageNumber | Message | FormattedValue): string => {
    if ('kind' in value && value.kind === 'formatted') return normalise(value.text);
    return normalise(isMessageNumber(value as never) ? formatNumber((value as MessageNumber).value, 'sl', (value as MessageNumber).maxDecimals) : renderMessage(value as Message));
};

/** A declaration as the text a presenter would show. */
export interface RenderedDeclaration {
    /** `name symbol value unit` per row. */
    readonly rows: readonly {readonly id: string; readonly name: string; readonly symbol: string; readonly value: string; readonly unit: string; readonly text: string}[];
    readonly notes: readonly string[];
    readonly formula: string;
    /** Declared parameters' symbols: a recorded control read-off "symbol = value" is that parameter's. */
    readonly parameterSymbols: readonly string[];
}

export function renderDeclaration(declaration: GraphDeclaration | undefined): RenderedDeclaration {
    const rows = (declaration?.readouts ?? []).flatMap(group => group.rows).map(row => {
        const name = row.name ? normalise(renderMessage(row.name)) : '';
        const symbol = row.symbol ?? '';
        const value = valueText(row.value);
        const unit = row.unit ? normalise(renderMessage(row.unit)) : '';
        return {id: String(row.id), name, symbol, value, unit, text: normalise(`${name} ${symbol} ${value} ${unit}`)};
    });
    const notes = [
        ...(declaration?.notes ?? []).map(note => normalise(renderMessage(note.text))),
        ...(declaration?.readoutHelp ? [normalise(renderMessage(declaration.readoutHelp))] : []),
    ];
    const formula = declaration?.formula ? normalise(`${renderMessage(declaration.formula.label)} ${declaration.formula.tex}`) : '';
    const parameterSymbols = (declaration?.parameters ?? []).flatMap(parameter => parameter.symbol ? [normalise(parameter.symbol)] : []);
    return {rows, notes, formula, parameterSymbols};
}

export interface ParityDifference {
    readonly state: number;
    readonly stateName: string;
    readonly kind: 'missing' | 'extra' | 'different';
    readonly where: string;
    readonly recorded?: string;
    readonly declared?: string;
}

export interface ParityReport {
    readonly differences: readonly ParityDifference[];
    /** Board captions no declared text equals or contains: information, not a failure (the declaration has no caption field). */
    readonly uncoveredCaptions: readonly {readonly state: number; readonly caption: string}[];
}

/**
 * Compares a recording with declarations rendered per state. A recorded row matches the declared row with the same name
 * (or symbol, or id) and must show the same value (`value`, or `value unit`); a recorded row with no such declared row may
 * instead be a declared note carrying that text (a graph may turn a labelled sentence into a note). Recorded notes must
 * be declared notes in order; a declared row or note nothing recorded is `extra`.
 */
export function checkParity(recording: ParityRecording, declarations: readonly (GraphDeclaration | undefined)[]): ParityReport {
    const differences: ParityDifference[] = [];
    const uncoveredCaptions: {state: number; caption: string}[] = [];
    recording.states.forEach((state, index) => {
        const add = (d: Omit<ParityDifference, 'state' | 'stateName'>) => differences.push({state: index, stateName: state.name, ...d});
        if (index >= declarations.length) {
            add({kind: 'missing', where: 'declaration', recorded: state.name});
            return;
        }
        const rendered = renderDeclaration(declarations[index]);
        const usedRows = new Set<number>();
        const usedNotes = new Set<number>();
        for (const row of state.rows) {
            const at = rendered.rows.findIndex((candidate, i) => !usedRows.has(i) && [candidate.name, candidate.symbol, candidate.id].some(label => label !== '' && normalise(label) === row.label));
            if (at >= 0) {
                usedRows.add(at);
                const candidate = rendered.rows[at];
                const wanted = row.value;
                if (wanted !== candidate.value && wanted !== normalise(`${candidate.value} ${candidate.unit}`)) {
                    add({kind: 'different', where: `row ${row.key}`, recorded: wanted, declared: normalise(`${candidate.value} ${candidate.unit}`)});
                }
                continue;
            }
            const note = rendered.notes.findIndex((text, i) => !usedNotes.has(i) && text === row.value);
            if (note >= 0) usedNotes.add(note);
            else add({kind: 'missing', where: `row ${row.key}`, recorded: row.value});
        }
        for (const text of state.notes) {
            const note = rendered.notes.findIndex((candidate, i) => !usedNotes.has(i) && candidate === text);
            if (note >= 0) usedNotes.add(note);
            else add({kind: 'missing', where: 'note', recorded: text});
        }
        rendered.rows.forEach((row, i) => { if (!usedRows.has(i)) add({kind: 'extra', where: `row ${row.id}`, declared: row.text}); });
        rendered.notes.forEach((text, i) => { if (!usedNotes.has(i)) add({kind: 'extra', where: 'note', declared: text}); });
        const pool = [...rendered.rows.map(row => row.text), ...rendered.notes, rendered.formula];
        for (const output of state.outputs) {
            const at = rendered.rows.findIndex((row, i) => !usedRows.has(i) && (row.value === output || row.text === output || row.text.includes(output) || output.includes(row.value)));
            if (at >= 0) { usedRows.add(at); continue; }
            const note = rendered.notes.findIndex((text, i) => !usedNotes.has(i) && text.includes(output));
            if (note >= 0) usedNotes.add(note);
            // A control's own read-off ("t = 0,50" beside a slider) is the declared parameter's value, which the presenter shows
            // from the binding; the declaration carries no value to compare, so the symbol must match.
            else if (rendered.parameterSymbols.some(symbol => output.startsWith(`${symbol} =`))) continue;
            // A bare read-off of a declared parameter (a slider's "2"): covered only by a declared row of that parameter's own
            // symbol showing the same value, so an unrelated row with a coincident value never covers it.
            else if (rendered.rows.some(row => rendered.parameterSymbols.includes(row.symbol) && row.value === output)) continue;
            else add({kind: 'missing', where: 'output', recorded: output});
        }
        for (const caption of state.captions) {
            if (!pool.some(text => text.includes(caption))) uncoveredCaptions.push({state: index, caption});
        }
    });
    return {differences, uncoveredCaptions};
}

/**
 * Parity compares readout rows, notes and outputs; a declaration with none of them (and no readout help or status) shows no
 * values, so a graph with no recording has nothing to compare and `just graph-check` reports parity as not applicable.
 */
export const showsNoValues = (declaration: GraphDeclaration | undefined): boolean =>
    declaration !== undefined && !(declaration.readouts ?? []).some(group => group.rows.length > 0) && !(declaration.notes ?? []).length
    && declaration.readoutHelp === undefined && !(declaration.status ?? []).length;

/** Whether a golden recording shows no rows, notes or outputs in any state (a missing recording shows nothing known). */
export const goldenShowsNothing = (golden: ParityRecording | undefined): boolean =>
    golden !== undefined && golden.states.every(state => state.rows.length === 0 && state.notes.length === 0 && state.outputs.length === 0);

/**
 * Parity is not applicable to a demonstration only when its golden recording shows no values in every state and its
 * declaration (one per recorded state: the default and every lesson scene) shows none either. Otherwise a recording is required.
 */
export const parityNotApplicable = (golden: ParityRecording | undefined, declarations: readonly (GraphDeclaration | undefined)[]): boolean =>
    goldenShowsNothing(golden) && declarations.length > 0 && declarations.every(showsNoValues);

/** One line per difference, for a test failure message. */
export const describeDifferences = (report: ParityReport): string =>
    report.differences.map(d => `state ${d.state} (${d.stateName}): ${d.kind} ${d.where}${d.recorded !== undefined ? ` recorded "${d.recorded}"` : ''}${d.declared !== undefined ? ` declared "${d.declared}"` : ''}`).join('\n');
