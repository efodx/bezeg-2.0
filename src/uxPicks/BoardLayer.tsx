import React, {useRef, useState} from 'react';
import {usePick} from './picks';
import {ParamPucks} from './a1/ParamPucks';
import {ScrubPreview} from './a19/ScrubPreview';
import {PuckHover} from './a29/PuckHover';
import {BoardCards} from './boardText/BoardTextCard';
import {BoardDock} from './dock/BoardDock';
import {useEditingParam} from './a1/paramRegistry';

/**
 * The board frame that hosts the on-board picks; each child renders only while its pick is on. Pucks and cards sit in
 * the board dock (src/uxPicks/dock) so they never overlap; the tray under the board is a dock region too.
 */
export function UxBoardFrame(props: {children: React.ReactNode}) {
    const frame = useRef<HTMLDivElement>(null);
    const [tray, setTray] = useState<HTMLDivElement | null>(null);
    const pucks = usePick('a1');
    const preview = usePick('a19');
    const hover = usePick('a29');
    const boardText = usePick('boardText');
    const toolsCard = usePick('toolsCard');
    // While a puck is typed into, the hover previews are unmounted, which also clears their ghosts from the board.
    const typing = useEditingParam() !== undefined;
    return <>
        <div className="ux-board-frame" ref={frame}>
            {props.children}
            {preview && !typing && <ScrubPreview frame={frame}/>}
            {pucks && hover && !typing && <PuckHover frame={frame}/>}
            {(pucks || boardText || toolsCard) && <BoardDock frame={frame} tray={tray}>
                {pucks && <ParamPucks frame={frame}/>}
                {boardText && <BoardCards frame={frame}/>}
            </BoardDock>}
        </div>
        <div className="ux-dock-tray" data-region="tray" ref={setTray}/>
    </>;
}
