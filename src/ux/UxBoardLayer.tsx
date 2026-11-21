import React, {useEffect} from 'react';
import {installLessonTweens} from './lessonTweens';
import {uxEnabled} from './flags';
import {ParamPucks} from './ParamPucks';
import {GhostTrails} from './GhostTrails';
import {CurveGrab} from './CurveGrab';
import {PredictSketch} from './PredictSketch';

/** Lane-A prototypes that live on the board, each behind its own `?ux=` flag. */
export function UxBoardLayer(props: {frame: React.RefObject<HTMLDivElement>; lessonMode: string}) {
    useEffect(() => uxEnabled('a6') ? installLessonTweens() : undefined, []);
    return <>
        {uxEnabled('a5') && <PredictSketch frame={props.frame}/>}
        {uxEnabled('a4') && <CurveGrab frame={props.frame}/>}
        {uxEnabled('a2') && <GhostTrails frame={props.frame}/>}
        {(uxEnabled('a1') || uxEnabled('a3')) && <ParamPucks frame={props.frame}/>}
    </>;
}
