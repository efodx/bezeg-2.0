import React, {useRef} from 'react';
import {usePick} from './picks';
import {ParamPucks} from './a1/ParamPucks';
import {ScrubPreview} from './a19/ScrubPreview';
import {PuckHover} from './a29/PuckHover';
import {GhostHand} from './c11/GhostHand';
import {BoardTextCard} from './boardText/BoardTextCard';

/** The board frame that hosts the on-board picks; each child renders only while its pick is on. */
export function UxBoardFrame(props: {children: React.ReactNode}) {
    const frame = useRef<HTMLDivElement>(null);
    const pucks = usePick('a1');
    const preview = usePick('a19');
    const hover = usePick('a29');
    const hand = usePick('c11');
    const boardText = usePick('boardText');
    return <div className="ux-board-frame" ref={frame}>
        {props.children}
        {preview && <ScrubPreview frame={frame}/>}
        {pucks && hover && <PuckHover frame={frame}/>}
        {pucks && <ParamPucks frame={frame}/>}
        {hand && <GhostHand frame={frame}/>}
        {boardText && <BoardTextCard frame={frame}/>}
    </div>;
}
