// The strip of parameter pucks in the board's bottom-left corner (task 05 slice 1). Always rendered at its natural width so the
// presenter can measure it; the layout then places it (or hides it until it has a place).
import {forwardRef} from 'react';
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import type {ActionDeclaration, CountParameter, GraphDeclaration, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {PlaybackButtons, playbackBlocks} from '../../graphs/base/controls/PlaybackButtons';
import {useT} from '../../localization';
import {ParameterPuck} from './ParameterPuck';
import type {PuckBounds} from './RangePuck';
import type {Rect} from '../layout/boardLayout';
import {wrappedStripHeight} from '../layout/boardLayout';
import './pucks.css';

/** A parameter whose puck carries its run's playback: the declared actions that start and reset it (slice 8). */
const PLAYBACK: Readonly<Record<string, {readonly play: string; readonly reset: string}>> = {
    'decasteljau-t': {play: 'play', reset: 'reset'},
};

/** What the strip shows: the declaration's range and count parameters placed on the board, in declared order. */
export function puckParameters(declaration: GraphDeclaration | undefined, bound: readonly string[] | undefined): (RangeParameter | CountParameter)[] {
    if (!declaration || !bound) return [];
    return (declaration.parameters ?? []).flatMap(parameter =>
        (parameter.kind === 'range' || parameter.kind === 'count') && parameter.placement === 'board' && bound.includes(parameter.key) ? [parameter] : []);
}

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
    parameters: readonly (RangeParameter | CountParameter)[];
    actions: readonly ActionDeclaration[];
    bounds: () => PuckBounds | undefined;
    /** Where the layout put the strip; absent until it has a place (the strip is then laid out but not shown). */
    rect: Rect | null;
}

export const PuckStrip = forwardRef<HTMLDivElement, PuckStripProps>(function PuckStrip({graph, parameters, actions, bounds, rect}, ref) {
    return <div ref={ref} className="puck-strip" data-puck-strip=""
        style={rect ? {width: rect.w, height: rect.h, transform: `translate(${rect.x}px, ${rect.y}px)`} : {visibility: 'hidden'}}>
        {parameters.map(parameter => {
            const playback = PLAYBACK[parameter.key];
            return <div key={parameter.key} className="puck-slot">
                <ParameterPuck graph={graph} parameter={parameter} bounds={bounds}/>
                {playback && <Playback graph={graph} actions={actions} play={playback.play} reset={playback.reset}/>}
            </div>;
        })}
    </div>;
});
