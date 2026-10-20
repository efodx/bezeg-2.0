import {ChapterActivityVisit} from './ChapterActivityVisit';
import {findActivity} from './activities';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../model';

function graph(): LessonGraphCapabilities {
    return {
        captureState: vi.fn((): LessonSceneCheckpoint => ({version: 1, value: {value: 3}})),
        restoreState: vi.fn(),
        apply: vi.fn(),
    };
}

test('ordinary departure drops retry closures that would retain a departed graph', () => {
    const visit = new ChapterActivityVisit();
    const departedGraph = graph();
    const openReading = vi.fn();

    visit.readAbout('bezier', departedGraph, '/bezeg-2.0/bezier/curve', 'entry', openReading);
    expect(openReading).toHaveBeenCalledOnce();
    expect(departedGraph.captureState).toHaveBeenCalledOnce();

    visit.departOrdinary();
    vi.mocked(departedGraph.captureState).mockClear();
    visit.retry();

    expect(departedGraph.captureState).not.toHaveBeenCalled();
});

test('ordinary attachment retains lesson cleanup for read-about and its retry', () => {
    const visit = new ChapterActivityVisit();
    const ordinaryGraph = graph();
    const closeLesson = vi.fn().mockImplementationOnce(() => { throw new Error('lesson cleanup failed'); });
    const openReading = vi.fn();
    visit.enterOrdinary('bezier', ordinaryGraph, false, 'entry', closeLesson);

    expect(() => visit.readAbout('bezier', ordinaryGraph, '/bezeg-2.0/bezier/curve', 'entry', openReading))
        .toThrow('lesson cleanup failed');
    expect(ordinaryGraph.captureState).not.toHaveBeenCalled();
    visit.retry();
    expect(closeLesson).toHaveBeenCalledTimes(2);
    expect(openReading).toHaveBeenCalledOnce();
    expect(ordinaryGraph.captureState).toHaveBeenCalledOnce();
});

test('throwing lesson cleanup skips capture but clears the old session and preserves its last valid snapshot', () => {
    const visit = new ChapterActivityVisit();
    let value = 9;
    const makeGraph = (): LessonGraphCapabilities => ({
        captureState: vi.fn((): LessonSceneCheckpoint => ({version: 1, value})),
        restoreState: vi.fn((checkpoint: LessonSceneCheckpoint) => { value = checkpoint.value as number; }),
        apply: vi.fn(action => { if (action.kind === 'prepared-scene') value = 0; }),
    });
    const firstGraph = makeGraph();
    const activity = findActivity('shape-control')!;
    visit.enterActivity(activity, firstGraph, 'activity-key');
    value = 24;
    visit.returnToReading(activity.id, activity.sectionId, 'activity-key', undefined, vi.fn());
    value = 37;
    const closeLesson = vi.fn(() => { throw new Error('lesson cleanup failed'); });

    expect(() => visit.departActivity(activity.id, activity.sectionId, closeLesson)).toThrow('lesson cleanup failed');
    expect(closeLesson).toHaveBeenCalledOnce();
    expect(firstGraph.captureState).toHaveBeenCalledTimes(3);
    expect(visit.isActivityActive(activity.id)).toBe(false);
    visit.retry();
    expect(firstGraph.captureState).toHaveBeenCalledTimes(3);

    const secondGraph = makeGraph();
    visit.enterActivity(activity, secondGraph, 'next-entry');
    expect(value).toBe(24);
});
