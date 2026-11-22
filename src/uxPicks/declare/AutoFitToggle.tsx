import React from 'react';
import {useGraphUx} from './graphUxStore';
import {useAutoFit} from './useViewFit';
import {setAutoFit} from './viewPort';
import './autoFit.css';

/**
 * The switch for automatic view fitting, beside "Prilagodi točkam" (owner, 2026-11-22: "one mode, but make it turnable on/off").
 * Shown only for a graph that declares its focus. Prototype-only, inline Slovenian.
 */
export function AutoFitToggle() {
    const focus = useGraphUx()?.focus;
    const on = useAutoFit();
    if (!focus) return null;
    return <button type="button" className="ux-autofit-toggle" data-navigation="autofit" aria-pressed={on}
        title={on ? 'Pogled se sam prilagodi kartam in korakom lekcije. Klik izklopi.' : 'Pogled se premakne samo, ko ga premaknete vi ali pritisnete »Prilagodi točkam«. Klik vklopi.'}
        onClick={() => setAutoFit(!on)}>
        <span aria-hidden="true" className="ux-autofit-box">{on ? '✓' : ''}</span> Samodejno
    </button>;
}
