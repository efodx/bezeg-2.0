import React, {useEffect} from 'react';
import {installLessonTweens} from './lessonTweens';
import {uxEnabled} from './flags';
import {ParamPucks} from './ParamPucks';
import {GhostTrails} from './GhostTrails';
import {CurveGrab} from './CurveGrab';
import {PredictSketch} from './PredictSketch';
import {CurveSound} from './CurveSound';
import {YourTurn} from './YourTurn';
import {LiveProse} from './LiveProse';
import {GraphGame} from './GraphGame';
import {SketchFit} from './SketchFit';
import {Storyboard} from './Storyboard';
import './UxBoardLayer.css';

/** Lane-A prototypes that live on the board, each behind its own `?ux=` flag. */
export function UxBoardLayer(props: {frame: React.RefObject<HTMLDivElement>; lessonMode: string}) {
    useEffect(() => uxEnabled('a6') ? installLessonTweens() : undefined, []);
    useEffect(() => {
        const frame = props.frame.current;
        if (!frame) return;
        document.body.classList.add('ux-lane-a');
        // Clicks that land on the bare board still hide the lesson card, exactly as the catcher did.
        const click = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (!target || target.closest('.ux-board-frame [class*="ux-"]') || event.defaultPrevented) return;
            if ((window as unknown as {__uxConsumed?: number}).__uxConsumed! > performance.now() - 250) return;
            (document.querySelector('.guided-lesson-graph-catcher') as HTMLElement | null)?.click();
        };
        frame.addEventListener('click', click);
        return () => { document.body.classList.remove('ux-lane-a'); frame.removeEventListener('click', click); };
    }, [props.frame]);
    return <>
        {uxEnabled('a5') && <PredictSketch frame={props.frame}/>}
        {uxEnabled('a4') && <CurveGrab frame={props.frame}/>}
        {uxEnabled('a2') && <GhostTrails frame={props.frame}/>}
        {uxEnabled('a7') && <CurveSound frame={props.frame}/>}
        {uxEnabled('a12') && <Storyboard frame={props.frame}/>}
        {uxEnabled('a11') && <SketchFit frame={props.frame}/>}
        {uxEnabled('a10') && <GraphGame frame={props.frame}/>}
        {uxEnabled('a9') && <LiveProse frame={props.frame}/>}
        {uxEnabled('a8') && <YourTurn frame={props.frame}/>}
        {(uxEnabled('a1') || uxEnabled('a3')) && <ParamPucks frame={props.frame}/>}
    </>;
}
