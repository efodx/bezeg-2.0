/**
 * Which board cards a guided-lesson frame refers to (pure). Rules, generic and without per-lesson tables:
 * (a) the stem "odčit" (odčitek, odčitaj, ...) refers to the card that holds readouts; (b) "legend" to the legend card;
 * (c) a section card's title mentioned in the frame; (d) a coordinate pair or a decimal number of 4 or more characters (not "0,5", which is everywhere)
 * that appears both in the frame and in a card's current text.
 */
export interface RefCard {
    kind: string;
    /** The card holds the graph's readouts (the merged Besedilo, or Odčitki). */
    readouts?: boolean;
    legend?: boolean;
    /** A section card's title. */
    title?: string;
    /** What the card shows now (plain text). */
    text: string;
}

/** Frame text without TeX delimiters and decimal-comma braces, minus signs unified, lower case. */
export function normalizeTex(raw: string): string {
    return raw.replace(/\{,\}/g, ',').replace(/\\[()[\]]/g, '').replace(/[−–]/g, '-').toLowerCase();
}

const NUM = String.raw`-?\d+(?:,\d+)?`;
const PAIR = new RegExp(String.raw`\(\s*(${NUM})\s*([;,])\s*(${NUM})\s*\)`, 'g');
const DECIMAL = /\d+,\d+/g;

/** Canonical value tokens: pairs as "(a;b)" (a comma pair "(2,4)" without a space counts as the pair and as a decimal) and decimals. */
export function valueTokens(text: string): Set<string> {
    const t = normalizeTex(text).normalize('NFKC');
    const out = new Set<string>();
    for (const m of t.matchAll(PAIR)) {
        out.add(`(${m[1]};${m[3]})`);
    }
    // Decimals, outside of the pair separators that carry a space.
    const noPairs = t.replace(/(\d)\s*[;,]\s+(?=-?\d)/g, '$1 ');
    for (const m of noPairs.matchAll(DECIMAL)) if (m[0].length >= 4) out.add(m[0]);
    return out;
}

export function referencedCards(frameText: string, cards: RefCard[]): Set<string> {
    const frame = normalizeTex(frameText);
    const frameValues = valueTokens(frameText);
    const spaceless = frame.replace(/\s+/g, '');
    const out = new Set<string>();
    for (const c of cards) {
        if (c.readouts && /odčit/.test(frame)) out.add(c.kind);
        if (c.legend && /legend/.test(frame)) out.add(c.kind);
        if (c.title && c.title.trim() !== '' && frame.includes(c.title.toLowerCase())) out.add(c.kind);
        if (c.title && c.title.trim() !== '' && spaceless.includes(c.title.toLowerCase().replace(/\s+/g, ''))) out.add(c.kind);
        if (frameValues.size > 0) {
            const shown = valueTokens(c.text);
            if ([...frameValues].some(v => shown.has(v))) out.add(c.kind);
        }
    }
    return out;
}
