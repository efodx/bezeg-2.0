import {EulerGraph} from './EulerGraph';
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

/** A graph on a real scene store: the whole scene runs in one synchronous tick, so later actions read what earlier ones wrote. */
function makeGraph() {
    const graph = new EulerGraph() as any;
    graph.board = fakeBoard();
    graph.graphSession = {isReady: true, isAlive: true};
    graph.boardUpdate = vi.fn();
    graph.initialize();
    return graph;
}

test('a multi-action Euler lesson scene runs in one synchronous sequence and later actions read the earlier ones', () => {
    const graph = makeGraph();
    const run = (action: LessonAction) => graph.applyLessonAction(action);
    for (const action of [
        {kind: 'function-choice', name: 'euler-example', value: 'linear-relaxation'},
        {kind: 'function-choice', name: 'euler-step', value: '0.25'},
        // x0 moves past the default end x = 1, so the end x must be raised first and the later x0 reads it
        {kind: 'function-parameter', name: 'euler-end', value: 3},
        {kind: 'function-parameter', name: 'euler-x0', value: 2},
        // y0 reads the x0 written above
        {kind: 'function-parameter', name: 'euler-y0', value: -1},
    ] as LessonAction[]) run(action);
    expect(graph.model).toMatchObject({example: 'linear-relaxation', step: 0.25, xEnd: 3, x0: 2, y0: -1});
    const before = {...graph.model};
    expect(() => run({kind: 'function-parameter', name: 'euler-end', value: 1})).toThrow(DomainError);
    expect(() => run({kind: 'function-parameter', name: 'euler-x0', value: 4})).toThrow(DomainError);
    expect(() => run({kind: 'function-parameter', name: 'euler-y0', value: 11})).toThrow(DomainError);
    expect(() => run({kind: 'function-choice', name: 'euler-step', value: '0.3'})).toThrow(DomainError);
    expect(() => run({kind: 'function-choice', name: 'euler-example', value: 'cube'})).toThrow(DomainError);
    expect(graph.model).toEqual(before);
    expect(() => run({kind: 'function-parameter', name: 'root-x0', value: 1} as LessonAction)).toThrow(UnsupportedLessonActionError);
});

test('the euler-exact visibility target hides and shows the exact curve and other targets stay unsupported', () => {
    const graph = makeGraph();
    expect(graph.model.showExact).toBe(true);
    graph.applyLessonAction({kind: 'function-visibility', target: 'euler-exact', visible: false});
    expect(graph.model.showExact).toBe(false);
    // A later action in the same tick reads the hidden state and leaves it alone.
    graph.applyLessonAction({kind: 'function-choice', name: 'euler-step', value: '0.25'});
    expect(graph.model).toMatchObject({showExact: false, step: 0.25});
    graph.applyLessonAction({kind: 'function-visibility', target: 'euler-exact', visible: true});
    expect(graph.model.showExact).toBe(true);
    expect(() => graph.applyLessonAction({kind: 'function-visibility', target: 'reference', visible: true})).toThrow(UnsupportedLessonActionError);
});
