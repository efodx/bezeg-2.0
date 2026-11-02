import {QuadratureGraph} from './QuadratureGraph';
import {DomainError} from './BaseFunctionGraph';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';

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
                object.on = vi.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: vi.fn(() => [-1, 2.6, 4.8, -1.8]),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** React state is NOT written during the tick, as inside one lesson scene: the actions must read the synchronous model. */
function makeGraph() {
    const graph = new QuadratureGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    graph.initialize();
    return graph;
}

test('a multi-action quadrature lesson scene runs in one synchronous sequence and later actions read the earlier ones', () => {
    const graph = makeGraph();
    const run = (action: LessonAction) => graph.applyLessonAction(action);
    for (const action of [
        {kind: 'function-choice', name: 'quadrature-function', value: 'exp'},
        {kind: 'function-parameter', name: 'quadrature-a', value: -1},
        {kind: 'function-parameter', name: 'quadrature-b', value: 2},
        {kind: 'function-parameter', name: 'quadrature-n', value: 5},
        // Simpson needs an even n, so the rule switch reads the n written above and raises it to 6
        {kind: 'function-choice', name: 'quadrature-rule', value: 'simpson'},
    ] as LessonAction[]) run(action);
    expect(graph.model).toEqual({rule: 'simpson', fn: 'exp', a: -1, b: 2, n: 6});
    expect(() => run({kind: 'function-parameter', name: 'quadrature-n', value: 7})).toThrow(DomainError);
    expect(() => run({kind: 'function-parameter', name: 'quadrature-a', value: 3})).toThrow(DomainError);
    expect(() => run({kind: 'function-choice', name: 'quadrature-rule', value: 'midpoint'})).toThrow(DomainError);
    expect(() => run({kind: 'function-choice', name: 'quadrature-function', value: 'cube'})).toThrow(DomainError);
    expect(graph.model).toEqual({rule: 'simpson', fn: 'exp', a: -1, b: 2, n: 6});
    expect(() => run({kind: 'function-parameter', name: 'root-x0', value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
});
