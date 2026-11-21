import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import './dock.css';

/**
 * The board dock: one host for everything the picks put on or beside the graph, so objects never overlap.
 * Regions along the board's edges: 'top-start' and 'top-end' are the left and right ends of a top rail that wraps
 * onto more lines when its ends do not fit; 'bottom' is the strip along the bottom edge; 'tray' sits directly under
 * the board (phones). Add an object with `<DockCard .../>` (a movable, foldable card) or `<DockItem .../>` (anything).
 */
export type DockRegion = 'top-start' | 'top-end' | 'bottom' | 'tray';

export const PHONE_QUERY = '(max-width: 700px)';

interface DockApi {
    regions: Partial<Record<DockRegion, HTMLElement | null>>;
    phone: boolean;
    /** The card open on a phone (one at a time), by kind. */
    phoneOpen: string | null;
    setPhoneOpen(kind: string | null): void;
    frame: React.RefObject<HTMLElement | null>;
}

const DockContext = createContext<DockApi | null>(null);
export function useDock(): DockApi | null { return useContext(DockContext); }

export function usePhone(): boolean {
    const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches === true);
    useEffect(() => {
        const query = window.matchMedia?.(PHONE_QUERY);
        if (!query) return;
        const read = () => setPhone(query.matches);
        read();
        query.addEventListener('change', read);
        return () => query.removeEventListener('change', read);
    }, []);
    return phone;
}

export function BoardDock(props: {frame: React.RefObject<HTMLElement | null>; tray: HTMLElement | null; children: React.ReactNode}) {
    const [start, setStart] = useState<HTMLElement | null>(null);
    const [end, setEnd] = useState<HTMLElement | null>(null);
    const [bottom, setBottom] = useState<HTMLElement | null>(null);
    const [phoneOpen, setPhoneOpen] = useState<string | null>(null);
    const phone = usePhone();
    const api = useMemo<DockApi>(() => ({
        regions: {'top-start': start, 'top-end': end, bottom, tray: props.tray},
        phone, phoneOpen, setPhoneOpen, frame: props.frame,
    }), [start, end, bottom, props.tray, phone, phoneOpen, props.frame]);
    return <DockContext.Provider value={api}>
        <div className="ux-dock" data-dock="">
            <div className="ux-dock-top">
                <div className="ux-dock-region ux-dock-start" data-region="top-start" ref={setStart}/>
                <div className="ux-dock-region ux-dock-end" data-region="top-end" ref={setEnd}/>
            </div>
            <div className="ux-dock-region ux-dock-bottom" data-region="bottom" ref={setBottom}/>
        </div>
        {props.children}
    </DockContext.Provider>;
}

/** Puts its children in a dock region. On a phone `phoneRegion` replaces `region` (e.g. pucks move to the tray). */
export function DockItem(props: {region: DockRegion; phoneRegion?: DockRegion; children: React.ReactNode}) {
    const dock = useDock();
    if (!dock) return null;
    const target = dock.regions[dock.phone && props.phoneRegion ? props.phoneRegion : props.region];
    return target ? createPortal(props.children, target) : null;
}
