import {describe, expect, test, vi} from 'vitest';
import {fitFormulaRows, splitInlineFormula, splitInlineFormulas, stackFormula} from './formulaRows';

const stacked = (...lines: string[]) => `\\[\\begin{gathered}${lines.join('\\\\[0.3em]')}\\end{gathered}\\]`;

describe('stackFormula', () => {
    test('breaks a row between its statements', () => {
        expect(stackFormula("\\[r(t)=(t-\\sin t;\\,1-\\cos t),\\quad r'(t)=(1-\\cos t;\\,\\sin t),\\qquad r''(t)=(\\sin t;\\,\\cos t)\\]"))
            .toBe(stacked('r(t)=(t-\\sin t;\\,1-\\cos t),', "r'(t)=(1-\\cos t;\\,\\sin t),", "r''(t)=(\\sin t;\\,\\cos t)"));
    });

    test('leaves spacing inside groups, fences and environments alone', () => {
        const row = '\\[N_{i,0}(t)=\\begin{cases}1,\\quad u_i\\le t<u_{i+1}\\\\0,\\quad \\text{otherwise}\\end{cases}\\]';
        expect(stackFormula(row, 3)).toBe(row);
        expect(stackFormula('\\[\\left(a,\\quad b\\right)\\qquad x^{a\\quad b}\\]')).toBe(stacked('\\left(a,\\quad b\\right)', 'x^{a\\quad b}'));
    });

    test('breaks before implication arrows only from the second level', () => {
        const row = '\\[x=2y-4 \\Longrightarrow 5y^2-20y+15=0 \\Longrightarrow y^2-4y+3=0\\]';
        expect(stackFormula(row, 1)).toBe(row);
        expect(stackFormula(row, 2)).toBe(stacked('x=2y-4', '\\Longrightarrow 5y^2-20y+15=0', '\\Longrightarrow y^2-4y+3=0'));
    });

    test('breaks after list commas only at the third level, never inside brackets or decimals', () => {
        const row = '\\[m_1=\\frac32,\\ f(m_1)=(1{,}5;\\,2),\\ m_2=1{,}25\\]';
        expect(stackFormula(row, 2)).toBe(row);
        expect(stackFormula(row, 3)).toBe(stacked('m_1=\\frac32,', 'f(m_1)=(1{,}5;\\,2),', 'm_2=1{,}25'));
    });

    test('breaks after a top-level semicolon at the third level, not inside brackets', () => {
        const row = '\\[P=(-4,-2),(-3,3); b_1=(-1;\\,2); c=5\\]';
        expect(stackFormula(row, 2)).toBe(row);
        expect(stackFormula(row, 3)).toBe(stacked('P=(-4,-2),(-3,3);', 'b_1=(-1;\\,2);', 'c=5'));
    });

    test('breaks an equality chain before each further relation at the fourth level, with an empty left side', () => {
        const row = '\\[a=b+c=d\\approx e\\]';
        expect(stackFormula(row, 3)).toBe(row);
        expect(stackFormula(row, 4)).toBe(stacked('a=b+c', '{}=d', '{}\\approx e'));
    });

    test('never breaks a chain inside groups, fences, brackets or environments', () => {
        for (const row of ['\\[x^{a=b=c}\\]', '\\[\\left(a=b=c\\right)\\]', '\\[f(a=b=c)=d\\]', '\\[\\begin{cases}a=b=c\\end{cases}\\]', '\\[a=b=c\\tag{1}\\]'])
            expect(stackFormula(row, 4)).toBe(row);
    });

    test('returns rows it cannot break, and rows with their own line structure, unchanged', () => {
        for (const row of ['\\\\[a=b\\\\]', 'prose with \\\\(x\\\\) inline', '\\\\[a\\\\quad b\\\\] and more', '\\\\[a\\\\quad b\\\\\\\\ c\\\\]', '\\\\[a&=b\\\\quad c\\\\]'])
            expect(stackFormula(row, 3)).toBe(row);
    });
});

describe('inline formula splitting', () => {
    test('splits a chain at its top-level relations into spaced inline formulas', () => {
        expect(splitInlineFormula('A=B=C')).toBe('\\(A\\) \\({}=B\\) \\({}=C\\)');
        expect(splitInlineFormula('x^{a=b}+f(a=b)')).toBeUndefined();
        expect(splitInlineFormula('31;\\ 121;\\ 1{,}5')).toBe('\\(31;\\) \\(121;\\) \\(1{,}5\\)');
        expect(splitInlineFormula('(1;\\ 2)')).toBeUndefined();
        expect(splitInlineFormula('a=b\\\\c=d')).toBeUndefined();
    });

    test('splits only the formulas marked wide', () => {
        const source = 'Prva \\(a=b=c\\) in druga \\(d=e=f\\).';
        expect(splitInlineFormulas(source, new Set([1]))).toBe('Prva \\(a=b=c\\) in druga \\(d\\) \\({}=e\\) \\({}=f\\).');
        expect(splitInlineFormulas(source, new Set())).toBeUndefined();
        expect(splitInlineFormulas('Samo \\(x^2\\).', new Set([0]))).toBeUndefined();
    });
});

describe('fitFormulaRows prose', () => {
    // A paragraph with inline formulas; jsdom has no layout, so the widths are stubbed from the source: 10px a character.
    function paragraph(tex: string, clientWidth: number) {
        const element = document.createElement('p');
        element.dataset.tex = tex;
        let source = tex;
        const formulas = () => Array.from(source.matchAll(/\\\((.*?)\\\)/gs));
        const sync = () => {
            element.innerHTML = formulas().map(() => '<mjx-container></mjx-container>').join(' ');
            const parts = Array.from(element.children) as HTMLElement[];
            // Pieces fill a line and wrap to the next one; a piece wider than the line sticks out of it.
            let left = 0;
            formulas().forEach((match, index) => {
                const width = match[1].length * 10;
                if (left > 0 && left + width > clientWidth) left = 0;
                left += width;
                const right = left;
                parts[index].getBoundingClientRect = () => ({right} as DOMRect);
            });
        };
        sync();
        Object.defineProperty(element, 'clientWidth', {get: () => clientWidth});
        element.getBoundingClientRect = () => ({right: clientWidth} as DOMRect);
        const retypeset = vi.fn(async (target: HTMLElement, next: string) => { if (target === element) { source = next; sync(); } });
        const panel = document.createElement('section');
        panel.append(element);
        document.body.append(panel);
        return {element, panel, retypeset, source: () => source};
    }

    test('a wide formula is split and the paragraph then needs no scrolling', async () => {
        const {element, panel, retypeset, source} = paragraph('\\(aaaa=bbbb=cccc=dddd\\)', 150);
        fitFormulaRows(panel, retypeset);
        await vi.waitFor(() => expect(retypeset).toHaveBeenCalledTimes(1));
        expect(source()).toBe('\\(aaaa\\) \\({}=bbbb\\) \\({}=cccc\\) \\({}=dddd\\)');
        await vi.waitFor(() => expect(element.classList.contains('guided-lesson-prose-scroll')).toBe(false));
        expect(element.hasAttribute('tabindex')).toBe(false);
    });

    test('a formula that fits stays whole', async () => {
        const {panel, retypeset} = paragraph('\\(a=b\\)', 150);
        fitFormulaRows(panel, retypeset);
        await Promise.resolve();
        expect(retypeset).not.toHaveBeenCalled();
    });

    test('a wide formula with nothing to split makes the paragraph scroll sideways', async () => {
        const {element, panel, retypeset} = paragraph('\\(aaaaaaaaaaaaaaaaaaaaaaaaaa\\)', 150);
        fitFormulaRows(panel, retypeset);
        await vi.waitFor(() => expect(element.classList.contains('guided-lesson-prose-scroll')).toBe(true));
        // ...and is a keyboard stop, so the part past the edge can be reached without a pointer.
        expect(element.tabIndex).toBe(0);
        expect(retypeset).not.toHaveBeenCalled();
    });
});

describe('fitFormulaRows stacking', () => {
    // jsdom has no layout: a row is as wide as the longest line of its source, 10px a character, scaled by its type.
    function row(tex: string, clientWidth: number) {
        const element = document.createElement('div');
        element.className = 'guided-lesson-notation';
        element.dataset.tex = tex;
        element.innerHTML = '<mjx-container display="true"></mjx-container>';
        let source = tex;
        const lineWidth = () => Math.max(...source.replace(/^\\\[\\begin\{gathered\}|\\end\{gathered\}\\\]$/g, '').split('\\\\[0.3em]').map(line => line.length * 10));
        Object.defineProperty(element, 'clientWidth', {get: () => clientWidth});
        Object.defineProperty(element, 'scrollWidth', {get: () => Math.max(clientWidth, Math.round(lineWidth() * (parseFloat(element.style.fontSize || '100') / 100)))});
        const retypeset = vi.fn(async (target: HTMLElement, next: string) => { if (target === element) source = next; });
        const panel = document.createElement('section');
        panel.append(element);
        document.body.append(panel);
        // React refills a row whose text changed (a language switch).
        const refill = (next: string) => { element.dataset.tex = next; source = next; };
        return {element, panel, retypeset, refill, source: () => source};
    }

    test('a row that fits when set smaller is not broken', async () => {
        const {element, panel, retypeset} = row('\\[aaaaaaaaaa\\quad bbbbbbbbbb\\]', 240);
        fitFormulaRows(panel, retypeset);
        await Promise.resolve();
        expect(retypeset).not.toHaveBeenCalled();
        expect(parseFloat(element.style.fontSize)).toBeLessThan(100);
        expect(parseFloat(element.style.fontSize)).toBeGreaterThanOrEqual(72);
    });

    test('a row too wide at the smallest size is broken between statements and set at full size again', async () => {
        const tex = '\\[aaaaaaaaaaaaaaaaaaaa\\quad bbbbbbbbbbbbbbbbbbbb\\]';
        const {element, panel, retypeset, source} = row(tex, 240);
        fitFormulaRows(panel, retypeset);
        await vi.waitFor(() => expect(retypeset).toHaveBeenCalledTimes(1));
        expect(source()).toBe(stacked('aaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbb'));
        await vi.waitFor(() => expect(element.style.fontSize).toBe(''));
        // A later pass (a resize) does not typeset the row again.
        fitFormulaRows(panel, retypeset);
        await Promise.resolve();
        expect(retypeset).toHaveBeenCalledTimes(1);
    });

    test('a refilled row (new source) is measured afresh', async () => {
        const {panel, retypeset, refill} = row('\\[aaaaaaaaaaaaaaaaaaaa\\quad bbbbbbbbbbbbbbbbbbbb\\]', 240);
        fitFormulaRows(panel, retypeset);
        await vi.waitFor(() => expect(retypeset).toHaveBeenCalledTimes(1));
        refill('\\[cccccccccccccccccccccccccccccccccccc\\quad d\\]');
        fitFormulaRows(panel, retypeset);
        await vi.waitFor(() => expect(retypeset).toHaveBeenCalledTimes(2));
    });

    test('a row refilled with a source that fits and then with the first one again is broken again', async () => {
        const wide = '\\[aaaaaaaaaaaaaaaaaaaa\\quad bbbbbbbbbbbbbbbbbbbb\\]';
        const {panel, retypeset, refill, source} = row(wide, 240);
        fitFormulaRows(panel, retypeset);
        await vi.waitFor(() => expect(retypeset).toHaveBeenCalledTimes(1));
        // The other language's row fits, so nothing is typeset again...
        refill('\\[cc\\quad d\\]');
        fitFormulaRows(panel, retypeset);
        await Promise.resolve();
        expect(retypeset).toHaveBeenCalledTimes(1);
        // ...and switching back refills the unbroken source, which has to be broken once more.
        refill(wide);
        fitFormulaRows(panel, retypeset);
        await vi.waitFor(() => expect(retypeset).toHaveBeenCalledTimes(2));
        expect(source()).toBe(stacked('aaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbb'));
    });
});
