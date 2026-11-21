/** Best-effort conversion of the graphs' plain-HTML texts ("Tₙ(x) = 2", "napaka |f(x) − Tₙ(x)|") to TeX for the card. */

const SUB = '\u0001', SUB_END = '\u0002', SUP = '\u0003', SUP_END = '\u0004', DEC = '\u0005';
const SUB_CHARS: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '-',
    'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x', 'ₕ': 'h', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₚ': 'p', 'ₛ': 's', 'ₜ': 't',
    'ᵢ': 'i', 'ⱼ': 'j',
};
const SUP_CHARS: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-',
    'ⁿ': 'n', 'ˣ': 'x', 'ʸ': 'y', 'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵏ': 'k', 'ᵐ': 'm', 'ᵗ': 't', 'ⁱ': 'i', 'ʲ': 'j', 'ᵘ': 'u',
};
const SYMBOLS: Record<string, string> = {
    '−': '-', '–': '-', '·': '\\cdot ', '×': '\\times ', '→': '\\to ', '≈': '\\approx ', '≤': '\\le ', '≥': '\\ge ', '≠': '\\ne ',
    '∞': '\\infty ', 'π': '\\pi ', 'φ': '\\varphi ', 'θ': '\\theta ', 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ',
    'ε': '\\varepsilon ', 'λ': '\\lambda ', 'μ': '\\mu ', 'σ': '\\sigma ', 'ω': '\\omega ', 'κ': '\\kappa ', 'τ': '\\tau ', 'ρ': '\\rho ',
    'Δ': '\\Delta ', 'Σ': '\\Sigma ', 'Ω': '\\Omega ', '′': "'", '″': "''", '°': '^{\\circ}', '√': '\\surd ', '∫': '\\int ', '±': '\\pm ',
    '%': '\\%', '#': '\\#', '&': '\\&', '{': '\\{', '}': '\\}', '\\': '', '^': '', '_': '\\_', '~': '', '$': '\\$',
    ';': ';\\,', ',': ',\\,', '…': '\\ldots ',
};
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'exp', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'min', 'max', 'lim', 'det']);

/** Unicode scripts and decimal commas become private markers, so the tokenizer sees groups. */
function normalise(s: string): string {
    const subs = Object.keys(SUB_CHARS).join(''), sups = Object.keys(SUP_CHARS).join('');
    return s
        .replace(new RegExp(`[${subs}]+`, 'g'), m => SUB + [...m].map(c => SUB_CHARS[c]).join('') + SUB_END)
        .replace(new RegExp(`[${sups}]+`, 'g'), m => SUP + [...m].map(c => SUP_CHARS[c]).join('') + SUP_END)
        .replace(/(\d),(?=\d)/g, `$1${DEC}`);
}

/** TeX (no delimiters) for a text that mixes symbols and Slovenian words. Marker characters come from `htmlToMarked`. */
export function toTeX(raw: string): string {
    const s = normalise(raw);
    const re = /\u0001([^\u0002]*)\u0002|\u0003([^\u0004]*)\u0004|\p{L}{2,}|\s+|[\s\S]/gu;
    const parts: {tex: string; text: boolean; space: boolean}[] = [];
    for (const m of s.matchAll(re)) {
        const t = m[0];
        if (m[1] !== undefined) parts.push({tex: `_{${toTeX(m[1])}}`, text: false, space: false});
        else if (m[2] !== undefined) parts.push({tex: `^{${toTeX(m[2])}}`, text: false, space: false});
        else if (/^\s+$/.test(t)) parts.push({tex: '', text: false, space: true});
        else if (t === DEC) parts.push({tex: '{,}', text: false, space: false});
        else if (/^\p{L}{2,}$/u.test(t)) {
            const lower = t.toLowerCase();
            parts.push(FUNCS.has(lower) ? {tex: `\\${lower} `, text: false, space: false} : {tex: `\\text{${t}}`, text: true, space: false});
        } else parts.push({tex: SYMBOLS[t] ?? t, text: false, space: false});
    }
    let out = '';
    parts.forEach((p, i) => {
        if (p.space) { if (parts[i - 1]?.text || parts[i + 1]?.text) out += '\\ '; return; }
        out += p.tex;
    });
    return out.trim();
}

/** Plain text with inline math only where a word carries a script or is a lone letter ("Tₙ", "f"). */
export function proseToHtml(raw: string): string {
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return raw.split(/(\s+)/).map(w => {
        const clean = w.replace(/[.,;:]+$/, ''), tail = w.slice(clean.length);
        if (clean !== '' && (/^\p{L}$/u.test(clean) || /[\u0001\u0003]/.test(normalise(clean)))) return `\\(${toTeX(clean)}\\)${esc(tail)}`;
        return esc(w);
    }).join('');
}

/** Flattens a rendered line to a string with script markers; the `<i>` and `<div>` wrappers are dropped. */
export function htmlToMarked(node: Node): string {
    let out = '';
    node.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? '';
        else if (n instanceof HTMLElement) {
            const tag = n.tagName.toLowerCase();
            if (tag === 'sub') out += SUB + htmlToMarked(n) + SUB_END;
            else if (tag === 'sup') out += SUP + htmlToMarked(n) + SUP_END;
            else if (tag === 'br') out += '\n';
            else if (tag === 'mjx-container') out += n.querySelector('mjx-assistive-mml')?.textContent ?? '';
            else out += htmlToMarked(n);
        }
    });
    return out.replace(/ /g, ' ');
}
