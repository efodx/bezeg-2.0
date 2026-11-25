// One declared range or count parameter as a puck, wired to the graph's arbiter (task 05 slice 1).
// It reads its own key through the binding reader and writes as `learner`; the strip re-renders it only when its parameter or value changes.
import {memo, useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import type {ChoiceParameter, CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {hasPuckLiveValues} from '../../graphs/base/controls/PuckOwnership';
import {renderMessage, useLanguage} from '../../localization';
import {useSweep} from '../sweep/useSweep';
import {ChoicePuck} from './ChoicePuck';
import {CountPuck} from './CountPuck';
import {RangePuck, type PuckBounds} from './RangePuck';

export type PuckParameter = RangeParameter | CountParameter | ChoiceParameter;

export interface ParameterPuckProps {
    graph: BaseGraph<BaseGraphState>;
    parameter: PuckParameter;
    /** The board's rectangle for the drag ruler; must be stable. */
    bounds?: () => PuckBounds | undefined;
}

const NONE = Number.NaN;
const noSubscribe = () => () => undefined;
const noSnapshot = (): number | undefined => undefined;

/** Commits per puck key since load: tests read it to show a write to one key renders only that key's puck. */
export const puckRenderCounts = new Map<string, number>();

/** A choice puck: the option's value as text, written to the arbiter as the learner. */
function ChoiceParameterPuck({graph, parameter}: {graph: BaseGraph<BaseGraphState>; parameter: ChoiceParameter}) {
    const key = parameter.key;
    const read = useCallback(() => {
        const arbiter = graph.parameters;
        return !arbiter || !arbiter.keys().includes(key) ? '' : String(arbiter.read(key));
    }, [graph, key]);
    const value = useSyncExternalStore(graph.store.subscribe, read);
    useLanguage(); // the memoised puck renames its texts on a language switch
    useEffect(() => { puckRenderCounts.set(key, (puckRenderCounts.get(key) ?? 0) + 1); });
    if (value === '') return null;
    return <div className="puck-host" data-puck-key={key}>
        <ChoicePuck label={renderMessage(parameter.label)} symbol={parameter.symbol} help={parameter.help ? renderMessage(parameter.help) : undefined} value={value}
            options={parameter.options.map(option => ({value: option.value, label: renderMessage(option.label), text: option.short ? renderMessage(option.short) : undefined}))}
            onSelect={next => { graph.parameters?.write(key, next, 'learner'); }}/>
    </div>;
}

function ParameterPuckView({graph, parameter, bounds}: ParameterPuckProps) {
    if (parameter.kind === 'choice') return <ChoiceParameterPuck graph={graph} parameter={parameter}/>;
    return <NumberParameterPuck graph={graph} parameter={parameter} bounds={bounds}/>;
}

function NumberParameterPuck({graph, parameter, bounds}: ParameterPuckProps & {parameter: RangeParameter | CountParameter}) {
    const key = parameter.key;
    const read = useCallback(() => {
        const arbiter = graph.parameters;
        if (!arbiter || !arbiter.keys().includes(key)) return NONE;
        return Number(arbiter.read(key));
    }, [graph, key]);
    const stored = useSyncExternalStore(graph.store.subscribe, read);
    // A parameter the graph drives outside its store while it runs (playing t) shows that value.
    const live = hasPuckLiveValues(graph) ? graph.puckLiveValue(key) : undefined;
    const liveValue = useSyncExternalStore(live?.subscribe ?? noSubscribe, live?.getSnapshot ?? noSnapshot);
    const value = liveValue ?? stored;
    const [refusal, setRefusal] = useState<string | undefined>();
    useEffect(() => { puckRenderCounts.set(key, (puckRenderCounts.get(key) ?? 0) + 1); });
    const onWrite = useCallback((next: number) => {
        const result = graph.parameters?.write(key, next, 'learner');
        if (result?.status === 'refused-domain') setRefusal(result.error.message);
        else setRefusal(undefined);
    }, [graph, key]);
    const sweep = useSweep(graph, parameter);
    const onHold = useCallback(() => graph.parameters?.hold(key) ?? (() => undefined), [graph, key]);
    if (Number.isNaN(value)) return null;
    return <div className="puck-host" data-puck-key={key}>
        {parameter.kind === 'range'
            ? <RangePuck parameter={parameter} value={value} onWrite={onWrite} bounds={bounds} refusal={refusal} sweep={sweep} onHold={onHold}/>
            : <CountPuck parameter={parameter} value={value} onWrite={onWrite} refusal={refusal} sweep={sweep} onHold={onHold}/>}
    </div>;
}

const sameProps = (a: ParameterPuckProps, b: ParameterPuckProps) =>
    a.graph === b.graph && a.bounds === b.bounds && JSON.stringify(a.parameter) === JSON.stringify(b.parameter);

export const ParameterPuck = memo(ParameterPuckView, sameProps);
