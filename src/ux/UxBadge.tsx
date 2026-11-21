import {useLocation} from "react-router-dom";
import {uxFlags} from "./flags";
import "./ux.css";

/** A small corner marker while lane C prototypes are on, with a way to switch them off and back to the tour. */
export function UxBadge() {
    const location = useLocation();
    const flags = [...uxFlags()];
    if (flags.length === 0 || location.pathname.endsWith('/ux-lab')) return null;
    const params = new URLSearchParams(location.search);
    params.set('ux', 'off');
    return <aside className="ux-badge" aria-label="Prototipi UX">
        <a href="/bezeg-2.0/ux-lab" title="Nazaj na pregled prototipov">UX {flags.join(' ')}</a>
        <a href={`${location.pathname}?${params.toString()}`} title="Ista stran brez prototipov">Izklopi</a>
    </aside>;
}
