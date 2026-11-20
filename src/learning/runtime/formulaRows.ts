/**
 * Keeps a lesson card's display-formula rows inside the card. A row wider than the card is first set in a smaller
 * size; one that is still too wide at the smallest readable size is broken into lines at the places an author
 * would break it (between statements, before an implication arrow, after a list comma) and typeset again.
 * Only a row that cannot be broken keeps its horizontal scroll.
 */

// Below this size a formula is harder to read than to scroll.
export const FORMULA_MIN_SCALE = 0.72;

const QUADS = new Set(['\\quad', '\\qquad']);
const ARROWS = new Set(['\\Longrightarrow', '\\Rightarrow', '\\implies', '\\Longleftrightarrow', '\\Leftrightarrow', '\\iff']);
const SPACES = new Set(['\\ ', '\\;', '\\,', '\\:', '\\quad', '\\qquad']);
const OPENERS = new Set(['\\left', '\\begin']);
const CLOSERS = new Set(['\\right', '\\end']);

/** How far a row is broken: between statements, then also before arrows, then also after list commas. */
export type StackLevel = 1 | 2 | 3;

function tokens(body: string): string[] {
    return body.match(/\\[a-zA-Z]+|\\[^a-zA-Z]|[^\\]/gs) ?? [];
}

/**
 * Rewrites a `\[...\]` row as stacked lines, or returns it unchanged when it has no place to break
 * (or already holds its own line structure).
 */
export function stackFormula(tex: string, level: StackLevel = 1): string {
    const open = tex.indexOf('\\[');
    const close = tex.lastIndexOf('\\]');
    if (open < 0 || close <= open || tex.slice(0, open).trim() !== '' || tex.slice(close + 2).trim() !== '') return tex;
    const lines: string[] = [];
    let line = '';
    let groups = 0;
    let brackets = 0;
    const list = tokens(tex.slice(open + 2, close));
    for (let index = 0; index < list.length; index++) {
        const token = list[index];
        if (token === '{' || OPENERS.has(token)) groups++;
        else if (token === '}' || CLOSERS.has(token)) groups = Math.max(0, groups - 1);
        else if (groups === 0 && (token === '(' || token === '[')) brackets++;
        else if (groups === 0 && (token === ')' || token === ']')) brackets = Math.max(0, brackets - 1);
        if (groups === 0) {
            // A row with its own rows or alignment is left as its author set it.
            if (token === '\\\\' || token === '&' || token === '\\tag') return tex;
            if (QUADS.has(token)) {
                lines.push(line);
                line = '';
                continue;
            }
            if (level >= 2 && ARROWS.has(token) && line.trim() !== '') {
                lines.push(line);
                line = token;
                continue;
            }
            if (level >= 3 && brackets === 0 && token === ',' && SPACES.has(list[index + 1] ?? '')) {
                lines.push(line + token);
                line = '';
                index++;
                continue;
            }
        }
        line += token;
    }
    lines.push(line);
    const kept = lines.map(part => part.trim()).filter(part => part !== '');
    if (kept.length < 2) return tex;
    return `\\[\\begin{gathered}${kept.join('\\\\[0.3em]')}\\end{gathered}\\]`;
}

const overflows = (row: HTMLElement) => row.scrollWidth > row.clientWidth + 1;

/** Sets the row's type smaller until it fits or reaches the smallest size; returns whether it fits. */
function shrinkToFit(row: HTMLElement): boolean {
    row.style.fontSize = '';
    let scale = 1;
    // The row's padding does not shrink with the type, so one pass can leave a few pixels over.
    for (let pass = 0; pass < 3 && overflows(row) && scale > FORMULA_MIN_SCALE; pass++) {
        scale = Math.max(FORMULA_MIN_SCALE, Math.floor(scale * (row.clientWidth / row.scrollWidth) * 100 - 1) / 100);
        row.style.fontSize = `${scale * 100}%`;
    }
    return !overflows(row);
}

async function stackUntilFits(row: HTMLElement, source: string, retypeset: (row: HTMLElement, tex: string) => Promise<unknown>) {
    let tried = source;
    for (const level of [1, 2, 3] as const) {
        const stacked = stackFormula(source, level);
        if (stacked === tried) continue;
        tried = stacked;
        row.style.fontSize = '';
        await retypeset(row, stacked);
        // The frame or the language may have changed while MathJax worked.
        if (!row.isConnected || row.dataset.tex !== source) return;
        if (shrinkToFit(row)) return;
    }
}

/**
 * Fits every display-formula row of a typeset lesson card. Prose rows keep their size: their text wraps.
 * `retypeset` replaces a row's source and typesets it again; without it rows are only set smaller.
 */
export function fitFormulaRows(panel: HTMLElement, retypeset?: (row: HTMLElement, tex: string) => Promise<unknown>) {
    panel.querySelectorAll<HTMLElement>('.guided-lesson-notation').forEach(row => {
        row.style.fontSize = '';
        if (!row.querySelector('mjx-container[display="true"]')) return;
        const source = row.dataset.tex;
        if (shrinkToFit(row) || !retypeset || source === undefined || row.dataset.stackedFor === source) return;
        // Remembered with its source, so a row that React refills (a language switch) is measured afresh.
        row.dataset.stackedFor = source;
        void stackUntilFits(row, source, retypeset).catch(() => undefined);
    });
}
