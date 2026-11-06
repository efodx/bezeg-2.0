const SYMBOLS: Readonly<Record<string, string>> = {
    '\\pi': 'π', '\\sin': 'sin', '\\cos': 'cos', '\\dots': '…', '\\ge': '≥', '\\le': '≤', '\\pm': '±', '\\cdot': '·',
    '\\theta': 'θ', '\\colon': ':', '\\%': '%', '\\ ': ' ',
};
const SUPERSCRIPTS: Readonly<Record<string, string>> = {0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
const SUBSCRIPTS: Readonly<Record<string, string>> = {0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉'};

/** The next LaTeX argument at `start`: a braced group, a command, or one character. */
function readArgument(latex: string, start: number): {value: string, end: number} {
    let at = start;
    while (latex[at] === ' ') at += 1;
    if (latex[at] === '{') {
        let depth = 0;
        for (let end = at; end < latex.length; end += 1) {
            if (latex[end] === '{') depth += 1;
            if (latex[end] === '}') depth -= 1;
            if (depth === 0) return {value: latex.slice(at + 1, end), end: end + 1};
        }
    }
    const command = /^\\[a-zA-Z]+/.exec(latex.slice(at));
    if (command) return {value: command[0], end: at + command[0].length};
    return {value: latex.slice(at, at + 1), end: at + 1};
}

const grouped = (text: string): string => /[+\-−·\s]/.test(text) ? `(${text})` : text;

function scripted(text: string, digits: Readonly<Record<string, string>>, fallback: string): string {
    return /^\d+$/.test(text) ? [...text].map(digit => digits[digit]).join('') : `${fallback}${text}`;
}

function plainMath(latex: string): string {
    let result = '';
    let at = 0;
    while (at < latex.length) {
        const rest = latex.slice(at);
        const command = /^\\(?:[a-zA-Z]+|.)/.exec(rest)?.[0];
        if (rest.startsWith('{,}')) {
            result += ',';
            at += 3;
        } else if (command === '\\frac' || command === '\\tfrac') {
            const numerator = readArgument(latex, at + command.length);
            const denominator = readArgument(latex, numerator.end);
            result += `${grouped(plainMath(numerator.value))}/${grouped(plainMath(denominator.value))}`;
            at = denominator.end;
        } else if (command === '\\sqrt' || command === '\\bar' || command === '\\operatorname') {
            const argument = readArgument(latex, at + command.length);
            const text = plainMath(argument.value);
            if (command === '\\sqrt') result += `√${grouped(text)}`;
            else if (command === '\\bar') result += `${text}̄`;
            else result += text;
            at = argument.end;
        } else if (command) {
            result += SYMBOLS[command] ?? command;
            at += command.length;
        } else if (latex[at] === '^' || latex[at] === '_') {
            const argument = readArgument(latex, at + 1);
            const text = plainMath(argument.value);
            result += latex[at] === '^' ? scripted(text, SUPERSCRIPTS, '^') : scripted(text, SUBSCRIPTS, '_');
            at = argument.end;
        } else {
            result += latex[at];
            at += 1;
        }
    }
    return result;
}

/**
 * Plain text for an image's `alt` attribute from copy that marks math with \( \). The attribute is never typeset, so
 * the delimiters and commands would otherwise reach assistive technology literally.
 */
export function mathAltText(text: string): string {
    return text.replace(/\\\((.*?)\\\)/g, (_, latex: string) => plainMath(latex));
}
