const SUBSCRIPTS: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    'ₙ': 'n', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k',
};

const SYMBOLS: Record<string, string> = {
    'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu', 'τ': '\\tau',
    'φ': '\\varphi', 'ω': '\\omega', 'ℓ': '\\ell', '∞': '\\infty',
};

/**
 * The math form of a plain point, line or segment name, in the delimiter form the shared point labels use (`"$$p_{0}$$"`).
 * Trailing digits, with or without an underscore, and Unicode subscripts become a subscript ("P1", "A_0", "S₁" to `P_{1}`,
 * `A_{0}`, `S_{1}`); a prime stays a prime ("A′" to `A'`); Greek letters, `ℓ` and `∞` become their TeX commands. Anything else
 * is typeset as it is. The JSXGraph `name` of the element stays the plain text: use this for the drawn label only.
 */
export function pointLabelMath(name: string): string {
    const body = name
        .replace(/[₀-₉ₙᵢⱼₖ]+/g, run => `_{${[...run].map(c => SUBSCRIPTS[c]).join('')}}`)
        .replace(/″/g, "''")
        .replace(/′/g, "'")
        .replace(/^([A-Za-z]+'*)_?(\d+)$/, '$1_{$2}')
        .replace(/[αβγδθλμτφωℓ∞]/g, c => `${SYMBOLS[c]} `)
        .trim();
    return `$$${body}$$`;
}
