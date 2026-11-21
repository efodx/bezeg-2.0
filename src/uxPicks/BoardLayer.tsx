import React, {useRef} from 'react';
import {usePick} from './picks';
import {ParamPucks} from './a1/ParamPucks';
import {ScrubPreview} from './a19/ScrubPreview';

/** The board frame that hosts the on-board picks; each child renders only while its pick is on. */
export function UxBoardFrame(props: {children: React.ReactNode}) {
    const frame = useRef<HTMLDivElement>(null);
    const pucks = usePick('a1');
    const preview = usePick('a19');
    return <div className="ux-board-frame" ref={frame}>
        {props.children}
        {preview && <ScrubPreview frame={frame}/>}
        {pucks && <ParamPucks frame={frame}/>}
    </div>;
}
