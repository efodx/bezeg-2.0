// The strip of parameter pucks in the board's bottom-left corner (task 05 slice 1). Always rendered at its natural width so the
// presenter can measure it; the layout then places it (or hides it until it has a place).
import {forwardRef} from 'react';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import type {ActionDeclaration, GraphDeclaration} from '../../graphs/base/declare/graphDeclaration';
import {PlaybackButtons, playbackBlocks} from '../../graphs/base/controls/PlaybackButtons';
import {useT} from '../../localization';
import type {Message} from '../../localization';
import {GroupActionPuck, ToggleActionPuck} from './ActionPucks';
import {ParameterPuck, type PuckParameter} from './ParameterPuck';
import type {PuckBounds} from './RangePuck';
import type {Rect} from '../layout/boardLayout';
import {wrappedStripHeight} from '../layout/boardLayout';
import './pucks.css';

/** A parameter whose puck carries its run's playback: the declared actions that start and reset it (slice 8). */
const PLAYBACK: Readonly<Record<string, {readonly play: string; readonly reset: string}>> = {
    'decasteljau-t': {play: 'play', reset: 'reset'},
};

/** One slot of the strip: a number parameter, a choice parameter, a toggle action, or the actions of one choice group. */
export type PuckItem =
    | {readonly kind: 'parameter'; readonly key: string; readonly parameter: PuckParameter}
    | {readonly kind: 'toggle'; readonly key: string; readonly action: ActionDeclaration}
    | {readonly kind: 'group'; readonly key: string; readonly group: {readonly key: string; readonly label: Message; readonly help?: Message}; readonly actions: readonly ActionDeclaration[]};

/**
 * What the strip shows, in declared order: the range and count parameters placed on the board, the choice parameters declared
 * `puck`, then the actions declared `puck` (a toggle each, a choice per group).
 */
export function puckItems(declaration: GraphDeclaration | undefined, bound: readonly string[] | undefined): PuckItem[] {
    if (!declaration || !bound) return [];
    const items: PuckItem[] = (declaration.parameters ?? []).flatMap((parameter): PuckItem[] =>
        parameter.placement === 'board' && bound.includes(parameter.key)
        && (parameter.kind === 'range' || parameter.kind === 'count' || (parameter.kind === 'choice' && parameter.puck === true))
            ? [{kind: 'parameter', key: parameter.key, parameter}] : []);
    const groups = new Map<string, ActionDeclaration[]>();
    for (const action of declaration.actions ?? []) {
        if (!action.puck || action.placement !== 'board') continue;
        if (action.puck === true) { items.push({kind: 'toggle', key: action.id, action}); continue; }
        const members = groups.get(action.puck.group.key);
        if (members) { members.push(action); continue; }
        const group: ActionDeclaration[] = [action];
        groups.set(action.puck.group.key, group);
        items.push({kind: 'group', key: action.puck.group.key, group: action.puck.group, actions: group});
    }
    return items;
}

/** The keys an item owns: its Orodja controls are left out (`PuckOwned`); a group owns its key and each member's id. */
export const puckOwnedKeys = (item: PuckItem): string[] => item.kind === 'group' ? [item.key, ...item.actions.map(action => action.id)] : [item.key];

/** What changes a slot's size: the item without the state of its actions. */
export const puckShapeOf = (items: readonly PuckItem[]): string => JSON.stringify(items.map(item =>
    item.kind === 'toggle' ? {...item, action: {...item.action, pressed: undefined}}
        : item.kind === 'group' ? {...item, actions: item.actions.map(action => ({...action, pressed: undefined}))} : item));

/** The natural size of a strip before it is measured: about one puck's width per parameter, one puck's height. */
export const estimateStrip = (count: number): {w: number; h: number} => ({w: count * 132 + Math.max(0, count - 1) * 8, h: 64});

/** The strip's height when its slots wrap into rows within `width` (8 px between slots and rows); one row when they all fit. */
export {wrappedStripHeight};

function Playback(props: {graph: BaseGraph<BaseGraphState>; actions: readonly ActionDeclaration[]; play: string; reset: string}) {
    const t = useT();
    const play = props.actions.find(action => action.id === props.play);
    const reset = props.actions.find(action => action.id === props.reset);
    if (!play || !reset) return null;
    const playing = play.pressed === true;
    return <PlaybackButtons groupLabel={t('animation_controls')} className="puck-playback" playing={playing}
        {...playbackBlocks({atStart: !reset.enabled, atEnd: false, playing})}
        onPlayPause={() => props.graph.performAction(play.id)} onReset={() => props.graph.performAction(reset.id)}/>;
}

export interface PuckStripProps {
    graph: BaseGraph<BaseGraphState>;
    items: readonly PuckItem[];
    actions: readonly ActionDeclaration[];
    bounds: () => PuckBounds | undefined;
    /** Where the layout put the strip; absent until it has a place (the strip is then laid out but not shown). */
    rect: Rect | null;
}

export const PuckStrip = forwardRef<HTMLDivElement, PuckStripProps>(function PuckStrip({graph, items, actions, bounds, rect}, ref) {
    return <div ref={ref} className="puck-strip" data-puck-strip=""
        style={rect ? {width: rect.w, height: rect.h, transform: `translate(${rect.x}px, ${rect.y}px)`} : {visibility: 'hidden'}}>
        {items.map(item => {
            const playback = PLAYBACK[item.key];
            return <div key={item.key} className="puck-slot">
                {item.kind === 'parameter' ? <ParameterPuck graph={graph} parameter={item.parameter} bounds={bounds}/>
                    : item.kind === 'toggle' ? <ToggleActionPuck graph={graph} action={item.action}/>
                        : <GroupActionPuck graph={graph} group={item.group} actions={item.actions}/>}
                {playback && <Playback graph={graph} actions={actions} play={playback.play} reset={playback.reset}/>}
            </div>;
        })}
    </div>;
});
