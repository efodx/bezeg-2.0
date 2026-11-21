import React, {useRef} from 'react';
import {usePick} from './picks';
import {ParamPucks} from './a1/ParamPucks';

/** The board frame that hosts the on-board picks; each child renders only while its pick is on. */
export function UxBoardFrame(props: {children: React.ReactNode}) {
    const frame = useRef<HTMLDivElement>(null);
    const pucks = usePick('a1');
    return <div className="ux-board-frame" ref={frame}>
        {props.children}
        {pucks && <ParamPucks frame={frame}/>}
    </div>;
}
