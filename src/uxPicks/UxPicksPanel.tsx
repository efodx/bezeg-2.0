import React, {useState} from 'react';
import {PICKS, setPicks, togglePick, useEnabledPicks} from './picks';
import './UxPicksPanel.css';

/** Floating switchboard for the UX picks. Prototype-only UI: strings are inline Slovenian, not catalog keys. */
export function UxPicksPanel() {
    const enabled = useEnabledPicks();
    const [open, setOpen] = useState(false);
    const count = PICKS.filter(pick => enabled.has(pick.id)).length;
    const link = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('ux', count ? PICKS.filter(pick => enabled.has(pick.id)).map(pick => pick.id).join(',') : 'none');
        void navigator.clipboard?.writeText(url.toString());
    };
    return <aside className="ux-picks" aria-label="Prototipi">
        {open && <div className="ux-picks-sheet">
            <header>
                <strong>Prototipi</strong>
                <span>
                    <button type="button" onClick={() => setPicks(PICKS.map(pick => pick.id))}>vse</button>
                    <button type="button" onClick={() => setPicks([])}>nič</button>
                    <button type="button" onClick={link} title="Kopiraj povezavo s tem izborom">povezava</button>
                </span>
            </header>
            {PICKS.length === 0 && <p className="ux-picks-empty">Še ni prototipov.</p>}
            <ul>
                {PICKS.map(pick => <li key={pick.id}>
                    <label>
                        <input type="checkbox" checked={enabled.has(pick.id)} onChange={() => togglePick(pick.id)}/>
                        <span><b>{pick.title}</b> <small>{pick.from}</small><br/>{pick.note}</span>
                    </label>
                    {pick.tryAt && <a href={pick.tryAt}>poskusi</a>}
                </li>)}
            </ul>
        </div>}
        <button type="button" className="ux-picks-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            Prototipi {count}/{PICKS.length}
        </button>
    </aside>;
}
