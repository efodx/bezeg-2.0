import {Tex} from '../cards/Tex';

/**
 * A puck's parameter symbol, typeset without MathJax when it is simple (a letter, a Greek letter, an optional subscript and
 * superscript), so the strip is measured once and never shows TeX source. Anything else falls back to `Tex`.
 */

export interface SymbolParts {
    /** The base letter (Unicode). */
    base: string;
    /** An uppercase Greek base is upright, not italic. */
    upright: boolean;
    sub?: string;
    sup?: string;
}

const LOWER = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    varepsilon: 'ϵ', vartheta: 'ϑ', varpi: 'ϖ', varrho: 'ϱ', varsigma: 'ς', varphi: 'ϕ', varkappa: 'ϰ',
} as const;
const UPPER = {
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
} as const;

const greek = (name: string): {letter: string; upright: boolean} | undefined =>
    Object.hasOwn(UPPER, name) ? {letter: UPPER[name as keyof typeof UPPER], upright: true}
        : Object.hasOwn(LOWER, name) ? {letter: LOWER[name as keyof typeof LOWER], upright: false} : undefined;

/** One letter or one Greek macro at the start of `text`; the rest follows. */
function letter(text: string): {letter: string; upright: boolean; rest: string} | undefined {
    const macro = /^\\([A-Za-z]+)/.exec(text);
    if (macro) {
        const found = greek(macro[1]);
        return found ? {...found, rest: text.slice(macro[0].length)} : undefined;
    }
    return /^[A-Za-z]/.test(text) ? {letter: text[0], upright: false, rest: text.slice(1)} : undefined;
}

/** A part after `_` or `^`: one character or a braced group of letters, digits, commas and Greek macros. Returns the text and the rest. */
function part(text: string): {text: string; rest: string} | undefined {
    if (text.startsWith('{')) {
        const end = text.indexOf('}');
        if (end < 2) return undefined;
        let inner = text.slice(1, end);
        let out = '';
        while (inner) {
            if (/^[A-Za-z0-9,]/.test(inner)) { out += inner[0]; inner = inner.slice(1); continue; }
            const found = /^\\[A-Za-z]+/.test(inner) ? letter(inner) : undefined;
            if (!found) return undefined;
            out += found.letter;
            inner = found.rest;
        }
        return {text: out, rest: text.slice(end + 1)};
    }
    const found = /^\\[A-Za-z]+/.test(text) ? letter(text) : undefined;
    if (found) return {text: found.letter, rest: found.rest};
    return /^[A-Za-z0-9,]/.test(text) ? {text: text[0], rest: text.slice(1)} : undefined;
}

const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** A run of Unicode subscript or superscript digits at the start of `text` (x₀, x², a₁₁). */
function unicodeScript(text: string): {kind: 'sub' | 'sup'; text: string; length: number} | undefined {
    const kind = SUB_DIGITS.includes(text[0]) ? 'sub' : SUP_DIGITS.includes(text[0]) ? 'sup' : undefined;
    if (!kind) return undefined;
    const digits = kind === 'sub' ? SUB_DIGITS : SUP_DIGITS;
    let length = 0;
    while (length < text.length && digits.includes(text[length])) length += 1;
    return {kind, text: [...text.slice(0, length)].map(char => String(digits.indexOf(char))).join(''), length};
}

/** The parts of a simple symbol, or `null` when it needs real typesetting (fractions, calls, several letters). */
export function symbolParts(tex: string): SymbolParts | null {
    const base = letter(tex.trim());
    if (!base) return null;
    const result: SymbolParts = {base: base.letter, upright: base.upright};
    let rest = base.rest.trim();
    while (rest) {
        const script = unicodeScript(rest);
        if (script) {
            if (result[script.kind] !== undefined) return null;
            result[script.kind] = script.text;
            rest = rest.slice(script.length).trim();
            continue;
        }
        const mark = rest[0];
        if ((mark !== '_' && mark !== '^') || (mark === '_' ? result.sub : result.sup) !== undefined) return null;
        const found = part(rest.slice(1).trimStart());
        if (!found) return null;
        if (mark === '_') result.sub = found.text; else result.sup = found.text;
        rest = found.rest.trim();
    }
    return result;
}

/** The symbol as plain text for accessible names ("x0", "λ1"); the TeX source when it is not simple. */
export function symbolText(tex: string): string {
    const parts = symbolParts(tex);
    return parts ? `${parts.base}${parts.sub ?? ''}${parts.sup ?? ''}` : tex;
}

/** A parameter's name for a screen reader or a message: "name symbol" when it has a symbol, else the name. */
export function spokenName(name: string, symbol: string | undefined): string {
    return symbol ? `${bareName(name, symbol)} ${symbolText(symbol)}` : name;
}

/** A legacy label that still ends with its own symbol ("Središče c" with symbol `c`) without it; any other name unchanged. */
export function bareName(name: string, symbol: string | undefined): string {
    if (!symbol) return name;
    const text = symbolText(symbol);
    if (!name.endsWith(text) || !/\s/.test(name.charAt(name.length - text.length - 1))) return name;
    const bare = name.slice(0, name.length - text.length).trim();
    return bare === '' ? name : bare;
}

export function PuckSymbol({tex}: {tex: string}) {
    const parts = symbolParts(tex);
    if (!parts) return <Tex tex={tex} className="puck-symbol puck-symbol-tex"/>;
    return <span className="puck-symbol">
        <var data-upright={parts.upright ? '' : undefined}>{parts.base}</var>
        {parts.sub !== undefined && <sub>{parts.sub}</sub>}
        {parts.sup !== undefined && <sup>{parts.sup}</sup>}
    </span>;
}
