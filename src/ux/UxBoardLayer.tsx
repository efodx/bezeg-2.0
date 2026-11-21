import React from 'react';
import {uxEnabled} from './flags';
import {ParamPucks} from './ParamPucks';
import {GhostTrails} from './GhostTrails';

/** Lane-A prototypes that live on the board, each behind its own `?ux=` flag. */
export function UxBoardLayer(props: {frame: React.RefObject<HTMLDivElement>; lessonMode: string}) {
    return <>
        {uxEnabled('a2') && <GhostTrails frame={props.frame}/>}
        {(uxEnabled('a1') || uxEnabled('a3')) && <ParamPucks frame={props.frame}/>}
    </>;
}
