import {describe, expect, test, vi} from 'vitest';
import {fitFormulaRows, stackFormula} from './formulaRows';

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

    test('returns rows it cannot break, and rows with their own line structure, unchanged', () => {
        for (const row of ['\\[a=b\\]', 'prose with \\(x\\) inline', '\\[a\\quad b\\] and more', '\\[a\\quad b\\\\ c\\]', '\\[a&=b\\quad c\\]'])
            expect(stackFormula(row, 3)).toBe(row);
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
});
