import {afterEach, describe, expect, test, vi} from 'vitest';
import {typesetMath} from './loadMathJax';

type Item = {typesetRoot: Element};
type Api = {
    startup: {promise: Promise<void>; document: {math: Item[] & {remove: (...items: Item[]) => void}}};
    typesetClear: ReturnType<typeof vi.fn>;
    typesetPromise: ReturnType<typeof vi.fn>;
};

const setApi = (api: Api) => { (window as Window & {MathJax?: Api}).MathJax = api; };

afterEach(() => { delete (window as Window & {MathJax?: Api}).MathJax; document.body.innerHTML = ''; });

describe('typesetMath keeps typeset output from nesting', () => {
    test('the assistive MathML is out of the tree during a pass and back afterwards', async () => {
        // MathJax's MathML input finds `<math>` inside mjx-assistive-mml and wraps it in a new formula (nested, one level per pass).
        const element = document.createElement('div');
        element.innerHTML = '<mjx-container><mjx-math></mjx-math><mjx-assistive-mml><math></math></mjx-assistive-mml></mjx-container>';
        document.body.append(element);
        let mathSeenByPass = -1;
        setApi({
            startup: {promise: Promise.resolve(), document: {math: Object.assign([], {remove: () => undefined})}},
            typesetClear: vi.fn(),
            typesetPromise: vi.fn(async () => { mathSeenByPass = element.querySelectorAll('math').length; }),
        });
        for (let pass = 0; pass < 5; pass++) await typesetMath(element);
        expect(mathSeenByPass).toBe(0);
        expect(element.querySelectorAll('mjx-assistive-mml')).toHaveLength(1);
        expect(element.querySelectorAll('math')).toHaveLength(1);
    });

    test('formulas whose output was removed from the page leave MathJax\'s math list', async () => {
        const live = document.createElement('div');
        const gone = document.createElement('div');
        document.body.append(live);
        const items: Item[] = [{typesetRoot: live}, {typesetRoot: gone}];
        const list = Object.assign(items, {remove: vi.fn((...removed: Item[]) => {
            removed.forEach(item => items.splice(items.indexOf(item), 1));
        })});
        setApi({
            startup: {promise: Promise.resolve(), document: {math: list}},
            typesetClear: vi.fn(),
            typesetPromise: vi.fn().mockResolvedValue(undefined),
        });
        await typesetMath(live);
        expect(items.map(item => item.typesetRoot)).toEqual([live]);
    });
});
