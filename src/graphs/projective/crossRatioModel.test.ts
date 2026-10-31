import {
    CROSS_RATIO_COORD_LIMIT, CROSS_RATIO_EXAMPLES, CROSS_RATIO_VIEW_BOX, CrossRatioModel, evaluateCrossRatio, fractionText, parseCrossRatioModel,
    serializeCrossRatioModel,
} from './crossRatioModel';
import {handlePosition, moveHandle, nudgeHandle} from './crossRatioEdit';
import {describeCrossRatio} from './crossRatioText';
import {renderMessage, setLanguage, t} from '../../localization';

beforeEach(() => setLanguage('sl'));

const withModel = (patch: Partial<CrossRatioModel>): CrossRatioModel => ({...CROSS_RATIO_EXAMPLES.default, ...patch});
const ratioOf = (r: {status: string; value?: {num: bigint; den: bigint}} | undefined) =>
    r?.status === 'ok' && r.value ? `${r.value.num}/${r.value.den}` : r?.status;

test('the default example gives 9/8 for the originals and for the exact images', () => {
    const scene = evaluateCrossRatio(CROSS_RATIO_EXAMPLES.default);
    expect(scene.status).toBe('ok');
    expect(ratioOf(scene.originalRatio)).toBe('9/8');
    expect(ratioOf(scene.imageRatio)).toBe('9/8');
    const images = (scene.imageViews ?? []).map(v => v.kind === 'finite' ? [fractionText(v.x), fractionText(v.y)] : 'ideal');
    expect(images).toEqual([['0', '1'], ['8/11', '15/11'], ['24/13', '25/13'], ['16/7', '15/7']]);
    expect(scene.idealIndex).toBeUndefined();
});

test('the harmonic example gives -1', () => {
    const scene = evaluateCrossRatio(CROSS_RATIO_EXAMPLES.harmonic);
    expect(ratioOf(scene.originalRatio)).toBe('-1/1');
    expect(ratioOf(scene.imageRatio)).toBe('-1/1');
});

test('D at -10 projects to a point at infinity in the direction (-40, -20) and the limit formula gives 33/20', () => {
    const scene = evaluateCrossRatio(CROSS_RATIO_EXAMPLES.infinity);
    expect(scene.status).toBe('ok');
    expect(scene.idealIndex).toBe(3);
    const view = scene.imageViews?.[3];
    expect(view?.kind).toBe('ideal');
    if (view?.kind !== 'ideal') return;
    // the kernel stores the direction in lowest terms, so (-40, -20) is (2, 1) up to sign and scale
    expect(view.direction[0] * 1n).toBe(2n * view.direction[1]);
    expect(view.direction[0] === 2n || view.direction[0] === -2n).toBe(true);
    expect(ratioOf(scene.originalRatio)).toBe('33/20');
    expect(ratioOf(scene.imageRatio)).toBe('33/20');
    // the limit formula (A,B;C,inf) = (C-A)/(C-B) on the image abscissae: no division by the ideal point
    const finite = (i: number) => { const v = scene.imageViews?.[i]; if (v?.kind !== 'finite') throw new Error('finite'); return v.x; };
    const [a, b, c] = [finite(0), finite(1), finite(2)];
    const num = (c.num * a.den - a.num * c.den) * b.den * c.den;
    const den = (c.num * b.den - b.num * c.den) * a.den * c.den;
    expect(num * 20n).toBe(den * 33n);
});

test('the text switches to the limit formula and names the point at infinity', () => {
    const text = describeCrossRatio(evaluateCrossRatio(CROSS_RATIO_EXAMPLES.infinity), t, 'sl');
    expect(text.statusKind).toBe('ideal');
    expect(text.limit).toContain('(C′ − A′)/(C′ − B′) = 33/20');
    expect(text.status).toContain('D′');
    expect(text.images).toContain('D′: točka v neskončnosti');
    expect(text.imageRatio).toContain('33/20');
    expect(text.imageRatio).toContain('1,65');
    const plain = describeCrossRatio(evaluateCrossRatio(CROSS_RATIO_EXAMPLES.default), t, 'sl');
    expect(plain.limit).toBeUndefined();
    expect(plain.originalRatio).toContain('9/8');
    expect(plain.originalRatio).toContain('1,125');
});

test('an undefined projection is a stated status without ratios, NaN or Infinity', () => {
    const cases: Array<[string, CrossRatioModel, string]> = [
        ['centre on the first line', withModel({centre: {x: 2, y: 0}}), 'centre-on-line'],
        ['centre on the second line', withModel({centre: {x: 4, y: 3}}), 'centre-on-line'],
        ['coinciding points', withModel({params: [0, 1, 1, 4]}), 'coincident-points'],
        ['coinciding second-line points', withModel({line2: [{x: 1, y: 1}, {x: 1, y: 1}]}), 'degenerate-second-line'],
    ];
    for (const [name, model, status] of cases) {
        const scene = evaluateCrossRatio(model);
        expect(scene.status, name).toBe(status);
        const text = describeCrossRatio(scene, t, 'sl');
        expect(text.statusKind, name).toBe('undefined');
        expect(text.imageRatio, name).toBeUndefined();
        expect(JSON.stringify(text), name).not.toMatch(/NaN|Infinity/);
    }
});

test('the cross-ratio of the images equals the original for every placement of a sampled grid', () => {
    let checked = 0;
    for (const x of [-6, -1, 0, 3, 7]) {
        for (const y of [-4, 2, 5, 9]) {
            for (const params of [[0, 1, 3, 4], [-2, 5, 1, 7], [3, -3, 0, 9]] as const) {
                const scene = evaluateCrossRatio(withModel({centre: {x, y}, params}));
                if (scene.status !== 'ok') continue;
                expect(ratioOf(scene.imageRatio)).toBe(ratioOf(scene.originalRatio));
                checked++;
            }
        }
    }
    expect(checked).toBeGreaterThan(30);
});

test('a valid model survives export and import unchanged and independent of the input', () => {
    const model = withModel({example: 'custom', params: [-3, 2, 5, 9], centre: {x: 1, y: -2}});
    const parsed = parseCrossRatioModel(JSON.parse(JSON.stringify(serializeCrossRatioModel(model))));
    expect(parsed.ok && parsed.value).toEqual(model);
    if (parsed.ok) expect(parsed.value.centre).not.toBe(model.centre);
});

test('invalid imports are refused with a message that names the field and the repair', () => {
    const base = serializeCrossRatioModel(CROSS_RATIO_EXAMPLES.default);
    const refusals: Array<[unknown, string]> = [
        [[], 'objekt'],
        [{...base, example: 'nope'}, 'default, harmonic, infinity, custom'],
        [{...base, params: [0, 1, 3]}, 'params'],
        [{...base, params: [0, 1.5, 3, 4]}, 'params[1]'],
        [{...base, params: [0, 1, 3, 31]}, 'med -30 in 30'],
        [{...base, centre: null}, 'centre'],
        [{...base, centre: {x: 'a', y: 0}}, 'centre.x'],
        [{...base, line2: [{x: 0, y: 1}]}, 'line2'],
        [{...base, line2: [{x: 0, y: 1}, {x: 2, y: 99}]}, 'line2[1].y'],
    ];
    for (const [data, expected] of refusals) {
        const parsed = parseCrossRatioModel(data);
        expect(parsed.ok, JSON.stringify(data)).toBe(false);
        if (parsed.ok) continue;
        const text = renderMessage(parsed.rejection);
        expect(text, JSON.stringify(data)).toContain(expected);
    }
    expect(CROSS_RATIO_COORD_LIMIT).toBe(30);
});

test('moving a handle snaps to the grid, clamps, keeps A-D on the line and marks the example custom', () => {
    const model = CROSS_RATIO_EXAMPLES.default;
    const moved = moveHandle(model, 1, {x: 2.6, y: 7});
    expect(moved.params).toEqual([0, 3, 3, 4]);
    expect(moved.example).toBe('custom');
    expect(handlePosition(moved, 1)).toEqual({x: 3, y: 0});
    expect(moveHandle(model, 1, {x: 1.2, y: 0})).toBe(model);
    expect(moveHandle(model, 3, {x: 500, y: 0}).params[3]).toBe(CROSS_RATIO_COORD_LIMIT);
    expect(moveHandle(model, 4, {x: 1, y: -99}).centre).toEqual({x: 1, y: -CROSS_RATIO_COORD_LIMIT});
    expect(moveHandle(model, 5, {x: 1, y: 1}).line2[0]).toEqual({x: 1, y: 1});
    expect(moveHandle(model, 9, {x: 1, y: 1})).toBe(model);
    expect(moveHandle(model, 0, {x: NaN, y: 0})).toBe(model);
});

test('keyboard stepping moves one grid step and ignores the vertical step for A-D', () => {
    const model = CROSS_RATIO_EXAMPLES.default;
    expect(nudgeHandle(model, 2, 1, 0).params[2]).toBe(4);
    expect(nudgeHandle(model, 2, 0, 1)).toBe(model);
    expect(nudgeHandle(model, 4, 0, -1).centre).toEqual({x: 0, y: 4});
    expect(nudgeHandle(model, 4, 0, 1).centre).toEqual({x: 0, y: 6});
});

test('every example keeps its handles, finite images and centre inside the view box', () => {
    const [left, top, right, bottom] = CROSS_RATIO_VIEW_BOX;
    const inside = (x: number, y: number) => x > left && x < right && y < top && y > bottom;
    for (const model of Object.values(CROSS_RATIO_EXAMPLES)) {
        for (let handle = 0; handle < 7; handle++) {
            const at = handlePosition(model, handle);
            expect(inside(at.x, at.y), `${model.example} handle ${handle}`).toBe(true);
        }
        for (const view of evaluateCrossRatio(model).imageViews ?? []) {
            if (view.kind === 'finite') expect(inside(view.view.x, view.view.y), `${model.example} image`).toBe(true);
        }
    }
});

test('an import naming an example with different values is stored as custom, so the example buttons stay truthful', () => {
    const edited = {...serializeCrossRatioModel(CROSS_RATIO_EXAMPLES.default), params: [0, 1, 3, 5]};
    const parsed = parseCrossRatioModel(edited);
    expect(parsed.ok && parsed.value.example).toBe('custom');
    const same = parseCrossRatioModel(serializeCrossRatioModel(CROSS_RATIO_EXAMPLES.harmonic));
    expect(same.ok && same.value.example).toBe('harmonic');
});
