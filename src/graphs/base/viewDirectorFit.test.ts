import DecasteljauGraph from '../curves/bezier/DecasteljauGraph';
import TaylorGraph from '../functions/TaylorGraph';
import BaseFunctionGraph from '../functions/BaseFunctionGraph';

// Task 07 slice 5: where the view director runs, the old visible-points fit never does; elsewhere it stays.
function withBoard<G extends object>(proto: G) {
    const graph = Object.create(proto) as any;
    const setIntent = vi.fn();
    graph.board = {
        objectsList: [], container: document.createElement('div'), getBoundingBox: () => [-1, 1, 1, -1],
        applyZoom: vi.fn(), suspendUpdate: vi.fn(),
    };
    Object.defineProperty(graph, 'boardView', {value: {setIntent}});
    graph.fitView = vi.fn(() => [0, 1, 1, 0]);
    return {graph, setIntent};
}

test('a typed point outside the view on a director graph does not run the old fit', () => {
    const {graph, setIntent} = withBoard(DecasteljauGraph.prototype);
    graph.setViewDirector({fitNow: vi.fn()});
    graph.fitToVisiblePoints([[50, 50]]);
    expect(graph.fitView).not.toHaveBeenCalled();
    expect(setIntent).not.toHaveBeenCalled();
});

test('the fit button on a director graph asks the director once and not the old fit', () => {
    const {graph, setIntent} = withBoard(TaylorGraph.prototype);
    const director = {fitNow: vi.fn()};
    graph.setViewDirector(director);
    graph.navigateBoard('fit');
    expect(director.fitNow).toHaveBeenCalledTimes(1);
    expect(graph.fitView).not.toHaveBeenCalled();
    expect(setIntent).not.toHaveBeenCalled();
});

test('a graph whose director has gone keeps the old fit', () => {
    const {graph, setIntent} = withBoard(DecasteljauGraph.prototype);
    graph.setViewDirector({fitNow: vi.fn()});
    graph.setViewDirector(undefined);
    graph.fitToVisiblePoints([[50, 50]]);
    expect(graph.fitView).toHaveBeenCalledTimes(1);
    expect(setIntent).toHaveBeenCalledTimes(1);
});

test('an undeclared graph still uses the old fit for the fit button', () => {
    const {graph, setIntent} = withBoard(BaseFunctionGraph.prototype);
    graph.navigateBoard('fit');
    expect(graph.fitView).toHaveBeenCalledTimes(1);
    expect(setIntent).toHaveBeenCalledTimes(1);
});
