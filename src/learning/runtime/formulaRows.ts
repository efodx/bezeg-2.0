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

/** How far a row is broken: between statements, then also before arrows, then also after list commas and top-level semicolons, then also before each relation of an equality chain. */
export type StackLevel = 1 | 2 | 3 | 4;

const RELATIONS = new Set(['=', '<', '>', '\\approx', '\\le', '\\leq', '\\ge', '\\geq', '\\neq', '\\ne', '\\equiv', '\\sim']);

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
    let hasRelation = false;
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
                hasRelation = false;
                continue;
            }
            if (level >= 2 && ARROWS.has(token) && line.trim() !== '') {
                lines.push(line);
                line = token;
                hasRelation = false;
                continue;
            }
            if (level >= 4 && brackets === 0 && RELATIONS.has(token)) {
                if (hasRelation) {
                    lines.push(line);
                    line = `{}${token}`;
                    continue;
                }
                hasRelation = true;
            }
            if (level >= 3 && brackets === 0 && token === ';') {
                lines.push(line + token);
                line = '';
                hasRelation = false;
                continue;
            }
            if (level >= 3 && brackets === 0 && token === ',' && SPACES.has(list[index + 1] ?? '')) {
                lines.push(line + token);
                line = '';
                hasRelation = false;
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

/**
 * Splits one inline formula body at its top-level relations into several inline formulas separated by spaces, so the
 * browser can wrap between them: `A=B=C` becomes `\(A\) \({}=B\) \({}=C\)`. Returns undefined when there is nothing to split.
 */
export function splitInlineFormula(body: string): string | undefined {
    const parts: string[] = [];
    let part = '';
    let groups = 0;
    let brackets = 0;
    const list = tokens(body);
    for (let index = 0; index < list.length; index++) {
        const token = list[index];
        if (token === '{' || OPENERS.has(token)) groups++;
        else if (token === '}' || CLOSERS.has(token)) groups = Math.max(0, groups - 1);
        else if (groups === 0 && (token === '(' || token === '[')) brackets++;
        else if (groups === 0 && (token === ')' || token === ']')) brackets = Math.max(0, brackets - 1);
        if (groups === 0 && (token === '\\\\' || token === '&' || token === '\\tag')) return undefined;
        if (groups === 0 && brackets === 0 && RELATIONS.has(token) && part.trim() !== '') {
            parts.push(part);
            part = '{}';
        }
        part += token;
        // A list written inside one formula (`31;\ 121;\ 223`) is broken after each separator, like a list of words.
        if (groups === 0 && brackets === 0 && (token === ';' || token === ',') && SPACES.has(list[index + 1] ?? '')) {
            parts.push(part);
            part = '';
            index++;
        }
    }
    if (part.trim() !== '') parts.push(part);
    return parts.length < 2 ? undefined : parts.map(piece => `\\(${piece.trim()}\\)`).join(' ');
}

const INLINE = /\\\((.*?)\\\)/gs;

/** Source text with the formulas at the given positions (in order of appearance) split; undefined when none changed. */
export function splitInlineFormulas(source: string, wide: ReadonlySet<number>): string | undefined {
    let changed = false;
    let position = 0;
    const next = source.replace(INLINE, (whole, body: string) => {
        const split = wide.has(position++) ? splitInlineFormula(body) : undefined;
        if (split === undefined) return whole;
        changed = true;
        return split;
    });
    return changed ? next : undefined;
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
    for (const level of [1, 2, 3, 4] as const) {
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
 * Fits every display-formula row of a typeset lesson card. Prose keeps its size: its text wraps, and a formula too wide for its line is split (see fitProse).
 * `retypeset` replaces a row's source and typesets it again; without it rows are only set smaller.
 */
export function fitFormulaRows(panel: HTMLElement, retypeset?: (row: HTMLElement, tex: string) => Promise<unknown>) {
    panel.querySelectorAll<HTMLElement>('.guided-lesson-notation').forEach(row => {
        row.style.fontSize = '';
        if (!row.querySelector('mjx-container[display="true"]')) return;
        const source = row.dataset.tex;
        forgetOtherSource(row);
        if (shrinkToFit(row) || !retypeset || source === undefined || row.dataset.stackedFor === source) return;
        // Remembered with its source, so a row that React refills (a language switch) is measured afresh.
        row.dataset.stackedFor = source;
        void stackUntilFits(row, source, retypeset).catch(() => undefined);
    });
    panel.querySelectorAll<HTMLElement>('[data-tex]:not(.guided-lesson-notation)').forEach(element => {
        void fitProse(element, retypeset).catch(() => undefined);
    });
}

/**
 * A refilled element holds its new source unbroken. The mark of the source it was broken for is dropped then, also
 * when the new source fits: switching back refills the first source unbroken, and it has to be broken again.
 */
function forgetOtherSource(element: HTMLElement) {
    if (element.dataset.stackedFor !== undefined && element.dataset.stackedFor !== element.dataset.tex) delete element.dataset.stackedFor;
}

const SCROLL_CLASS = 'guided-lesson-prose-scroll';

/** The inline formulas of a prose element whose right edge lies outside its line, by position among all its formulas. */
function wideFormulas(element: HTMLElement): {count: number, wide: Set<number>} {
    // The scroll width is no measure here: the hidden screen-reader copy of a formula can reach past the line.
    const limit = element.getBoundingClientRect().right;
    const containers = Array.from(element.querySelectorAll<HTMLElement>('mjx-container:not([display="true"])'));
    const wide = new Set<number>();
    containers.forEach((container, index) => { if (container.getBoundingClientRect().right > limit + 1) wide.add(index); });
    return {count: containers.length, wide};
}

/**
 * Prose whose inline formula is wider than its line: that formula is split at its relations so the line can wrap;
 * prose that still overflows scrolls sideways instead of being cut.
 */
async function fitProse(element: HTMLElement, retypeset?: (row: HTMLElement, tex: string) => Promise<unknown>) {
    const source = element.dataset.tex;
    forgetOtherSource(element);
    // A paragraph that scrolls sideways is a keyboard stop, so its hidden part can be reached with the arrow keys.
    const mark = () => {
        const scrolls = element.classList.toggle(SCROLL_CLASS, wideFormulas(element).wide.size > 0);
        if (scrolls) element.tabIndex = 0;
        else element.removeAttribute('tabindex');
    };
    const {count, wide} = wideFormulas(element);
    if (source === undefined || !retypeset || element.dataset.stackedFor === source || wide.size === 0) return mark();
    element.dataset.stackedFor = source;
    if (count !== Array.from(source.matchAll(INLINE)).length) return mark();
    const split = splitInlineFormulas(source, wide);
    if (split === undefined) return mark();
    await retypeset(element, split);
    if (!element.isConnected || element.dataset.tex !== source) return;
    mark();
}

