import BaseGraph from '../base/BaseGraph';
import {DomainError, mathTextHtml} from './BaseFunctionGraph';
import {LinearFunctionGraph} from './LinearFunctionGraph';
import {LessonAction} from '../../learning/model';
import {beginFigureExport, setLanguage} from '../../localization';

const DEFAULT_BOX = [-6, 8, 6, -4];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>};
            if (type === 'point') {
                const free = parents.every((parent: unknown) => typeof parent === 'number');
                object.x = free ? parents[0] : undefined;
                object.y = free ? parents[1] : undefined;
                object.X = () => (free ? object.x : parents[0]());
                object.Y = () => (free ? object.y : parents[1]());
                object.moveTo = vi.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                object.setAttribute = vi.fn();
                object.on = vi.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: vi.fn(() => DEFAULT_BOX),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph before its first initialize(): the board exists, the scene does not. */
function makeUninitializedGraph() {
    const graph = new LinearFunctionGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true, dispose: vi.fn()};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    return graph;
}

const parameter = (name: any, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const preset = (boardState?: { boundingBox: number[] }) => ({id: 'linear-function', data: {x1: 0, y1: 1, x2: 2, y2: 5}, boardState}) as any;

beforeEach(() => setLanguage('sl'));

describe('the imported view applies to one initialize only', () => {
    test('a preset with a view keeps it through the initialize that follows, and later initializes use the default view again', () => {
        const graph = makeUninitializedGraph();
        graph.importPreset(preset({boundingBox: [-1, 2, 3, -4]}));
        graph.board.setBoundingBox.mockClear();
        graph.initialize();
        expect(graph.board.setBoundingBox).not.toHaveBeenCalled();
        // e.g. the figure batch export of a preset without a view, or any regeneration
        graph.initialize();
        expect(graph.board.setBoundingBox).toHaveBeenCalledWith(DEFAULT_BOX, true);
    });

    test('a preset applied to a live scene sets its own view directly and does not leave the flag set', () => {
        const graph = makeUninitializedGraph();
        graph.initialize();
        graph.importPreset(preset({boundingBox: [-1, 2, 3, -4]}));
        expect(graph.board.setBoundingBox).toHaveBeenLastCalledWith([-1, 2, 3, -4], true);
        graph.board.setBoundingBox.mockClear();
        graph.initialize();
        expect(graph.board.setBoundingBox).toHaveBeenCalledWith(DEFAULT_BOX, true);
    });

    test('a preset without a view gets the default view', () => {
        const graph = makeUninitializedGraph();
        graph.importPreset(preset());
        graph.board.setBoundingBox.mockClear();
        graph.initialize();
        expect(graph.board.setBoundingBox).toHaveBeenCalledWith(DEFAULT_BOX, true);
    });
});

describe('a dead graph session is never touched', () => {
    test('a drag or input after unmount only updates the model and drops the scene references', () => {
        const graph = makeUninitializedGraph();
        graph.initialize();
        const point = graph.board.objectsList.find((object: any) => object.type === 'point' && object.handlers.drag);
        expect(graph.generatedObjectCount).toBeGreaterThan(0);
        graph.unmount();
        expect(graph.generatedObjectCount).toBe(0);
        expect(graph.p1).toBeUndefined();
        graph.setState.mockClear();
        graph.board = undefined;
        point.moveTo.mockClear();
        expect(() => point.handlers.drag()).not.toThrow();
        expect(() => graph.commitModel({...graph.model, x2: 4})).not.toThrow();
        expect(graph.model.x2).toBe(4);
        expect(graph.setState).not.toHaveBeenCalled();
        expect(point.moveTo).not.toHaveBeenCalled();
    });
});

describe('language changes', () => {
    test('only an actual language change updates the board, not a figure-export state change', () => {
        vi.spyOn(BaseGraph.prototype, 'mount').mockImplementation(() => undefined);
        try {
            const graph = makeUninitializedGraph();
            graph.mount(document.createElement('div'));
            expect(graph.boardUpdate).not.toHaveBeenCalled();
            const endExport = beginFigureExport();
            endExport();
            expect(graph.boardUpdate).not.toHaveBeenCalled();
            setLanguage('en');
            expect(graph.boardUpdate).toHaveBeenCalledTimes(1);
            setLanguage('en');
            expect(graph.boardUpdate).toHaveBeenCalledTimes(1);
            setLanguage('sl');
            expect(graph.boardUpdate).toHaveBeenCalledTimes(2);
            vi.spyOn(BaseGraph.prototype, 'unmount').mockImplementation(() => undefined);
            graph.unmount();
            setLanguage('en');
            expect(graph.boardUpdate).toHaveBeenCalledTimes(2);
        } finally {
            vi.restoreAllMocks();
        }
    });
});

describe('domain errors', () => {
    test('inspector changes swallow only a DomainError and say whether the value applied; a lesson action throws it', () => {
        const graph = makeUninitializedGraph();
        graph.initialize();
        expect(graph.ignoreOutOfDomain(() => graph.setCoordinate('x1', 3))).toBe(true);
        expect(graph.model.x1).toBe(3);
        expect(graph.ignoreOutOfDomain(() => graph.setCoordinate('x1', 99999))).toBe(false);
        expect(graph.model.x1).toBe(3);
        expect(() => graph.applyLessonAction(parameter('x1', 99999))).toThrow(DomainError);
        const bug = new TypeError('a real bug');
        expect(() => graph.ignoreOutOfDomain(() => { throw bug; })).toThrow(bug);
        expect(new DomainError('x')).toBeInstanceOf(Error);
    });
});

describe('mathTextHtml', () => {
    it('italicizes one-letter variables and keeps names upright', () => {
        expect(mathTextHtml('f(x) = sin(2x + φ)')).toBe('<i>f</i>(<i>x</i>) = sin(2<i>x</i> + <i>φ</i>)');
        expect(mathTextHtml('f′(x₀) = 2, Δy = 4')).toBe('<i>f</i>′(<i>x</i>₀) = 2, Δ<i>y</i> = 4');
    });

    it('escapes HTML before adding markup', () => {
        expect(mathTextHtml('a < b & c')).toBe('<i>a</i> &lt; <i>b</i> &amp; <i>c</i>');
    });
});
