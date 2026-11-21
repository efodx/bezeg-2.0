import {useEffect} from 'react';
import {startBoardRoom} from './boardRoom';

/** Mounts the "Board makes room" behaviour (see boardRoom.ts) for as long as it renders. */
export function BoardRoom(): null {
    useEffect(() => (location.search.includes('noroom') ? undefined : startBoardRoom()), []);
    return null;
}
