/**
 * UX picks: prototypes adopted from the ux-challenge/a-c branches for live evaluation. This is a prototype branch, not
 * shipped work; anything the owner keeps gets a spec and the normal workflow on master.
 *
 * Adding a prototype: append an entry to PICKS, gate its code with `usePick('<id>')` (React) or `pickOn('<id>')`.
 * Removing one: delete its entry and its gated code. Toggling is live: the panel writes the enabled set to
 * localStorage, and `?ux=a,b` in the URL replaces it (`?ux=none` turns everything off).
 */
import {useSyncExternalStore} from 'react';

export type Pick = {
    id: string;
    /** Short Slovenian name shown in the panel. */
    title: string;
    /** Source prototype, e.g. 'a28' or 'b23 + c24'. */
    from: string;
    /** One sentence on what it does and where to look. */
    note: string;
    /** Optional page where the prototype shows best. */
    tryAt?: string;
};

export const PICKS: readonly Pick[] = [
    {id: 'b1', title: 'Prehodi', from: 'b1', note: 'Naprej in Nazaj v vodeni lekciji: graf zvezno zdrsne v nov prizor, novo se nariše, staro zbledi. Deluje v vseh lekcijah.', tryAt: '/bezeg-2.0/functions/transformations?learn=1'},
    {id: 'a1', title: 'Parametri na grafu', from: 'a1 + števci', note: 'Vsak drsnik in vsak števec (− n +) je ploščica na grafu: povleci levo ali desno, za fino nastavljanje dvigni prst; kolešček in puščice tudi delujejo.', tryAt: '/bezeg-2.0/functions/transformations'},
    {id: 'a19', title: 'Poglej, preden skočiš', from: 'a19 + števci', note: 'Z miško potuj po drsniku v orodjih: graf črtkano pokaže, kako bi bil videti pri tej vrednosti; klik skoči tja. Nad − ali + števca pokaže korak nižje ali višje.', tryAt: '/bezeg-2.0/functions/transformations'},
    {id: 'a3', title: 'Parameter se premika sam', from: 'a3 + števci', note: 'Gumb ∿ na ploščici (potrebuje »Parametri na grafu«): drsnik sam niha med mejama, števec sam šteje gor in dol. Več jih lahko teče hkrati.', tryAt: '/bezeg-2.0/bernstein'},
    // {id: 'example', title: 'Primer', from: 'a1', note: 'Kaj naredi in kje ga najdeš.', tryAt: '/bezeg-2.0/functions/transformations'},
    {id: 'a29', title: 'Predogled na ploščici', from: 'a29 + a19', note: 'Potrebuje »Parametri na grafu«: spodnji pas ploščice je njena proga. Z miško nad njim vidiš graf pri tisti vrednosti, klik skoči tja, vlečenje še vedno drsi; drugje na ploščici (ali s tipkovnico) kartica pove, kaj drsnik počne.', tryAt: '/bezeg-2.0/functions/transformations'},
    {id: 'dockTools', title: 'Orodja ob lekciji', from: 'želja lastnika', note: 'Vodena lekcija na koraku z orodji: dokler je kartica pripeta nad orodji, so orodja nizka; ko kartico odneseš drugam, orodja zrastejo čez ves stolpec, ob ponovnem pripenjanju se spet skrčijo.', tryAt: '/bezeg-2.0/functions/transformations?learn=1'},
    {id: 'boardText', title: 'Besedilo in legenda v karticah', from: 'lastna ideja', note: 'Formula in izpisi, ki so risani na grafu, se preselijo v kartico »Besedilo« (zgoraj desno), legenda iz orodij ali z grafa pa v kartico »Legenda« (zgoraj levo). Obe premakneš in skriješ vsako posebej; vrednosti ostanejo žive.', tryAt: '/bezeg-2.0/analysis/taylor'},
];

const STORAGE_KEY = 'bezeg.uxPicks';
const listeners = new Set<() => void>();
let enabled: ReadonlySet<string> = initialSet();

function initialSet(): ReadonlySet<string> {
    if (typeof window === 'undefined') return new Set();
    const fromUrl = new URLSearchParams(window.location.search).get('ux');
    if (fromUrl !== null) {
        const set = new Set(fromUrl === 'none' ? [] : fromUrl.split(/[,\s]+/).filter(Boolean));
        save(set);
        return set;
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return new Set(raw ? (JSON.parse(raw) as string[]) : PICKS.map(pick => pick.id));
    } catch {
        return new Set(PICKS.map(pick => pick.id));
    }
}

function save(set: ReadonlySet<string>) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* private window: session only */ }
}

export function pickOn(id: string): boolean {
    return enabled.has(id);
}

export function enabledPicks(): ReadonlySet<string> {
    return enabled;
}

export function setPicks(next: Iterable<string>) {
    enabled = new Set(next);
    save(enabled);
    listeners.forEach(listener => listener());
}

export function togglePick(id: string) {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicks(next);
}

export function subscribePicks(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/** Re-renders the caller when the prototype is switched on or off. */
export function usePick(id: string): boolean {
    return useSyncExternalStore(subscribePicks, () => enabled.has(id), () => false);
}

export function useEnabledPicks(): ReadonlySet<string> {
    return useSyncExternalStore(subscribePicks, () => enabled, () => enabled);
}
