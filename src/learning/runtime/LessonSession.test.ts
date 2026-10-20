import {LessonAction, LessonDefinition, LessonGraphCapabilities, LessonSceneCheckpoint} from '../model';
import {LessonSession} from './LessonSession';
import type {Mock} from 'vitest';

const lesson: LessonDefinition = {
    id: 'test', demonstrationId: 'bezier', title: {sl: 'Test', en: 'Test'}, summary: {sl: 'Test', en: 'Test'},
    steps: [
        {id: 'one', title: {sl: 'Ena', en: 'One'}, body: {sl: 'Telo', en: 'Body'}, scene: {actions: [{kind: 'parameter', name: 't', value: 0.25}]}},
        {id: 'two', title: {sl: 'Dve', en: 'Two'}, body: {sl: 'Telo', en: 'Body'}, action: {label: {sl: 'Pokaži', en: 'Show'}, action: {kind: 'curve-visibility', target: 'control-polygon', visible: true}}},
    ],
};

const framedLesson: LessonDefinition = {
    id: 'framed-test', demonstrationId: 'bezier', title: {sl: 'Test', en: 'Test'}, summary: {sl: 'Test', en: 'Test'},
    steps: [
        {
            id: 'framed-one', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Telo', en: 'Body'},
            frames: [
                {id: 'framed-one-explanation', kind: 'explanation', title: {sl: 'Razlaga', en: 'Explanation'}, body: {sl: 'Telo', en: 'Body'}},
                {id: 'framed-one-observation', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Opazuj', en: 'Observe'}},
            ],
        },
        {id: 'framed-two', title: {sl: 'Drugi korak', en: 'Second step'}, body: {sl: 'Telo', en: 'Body'}},
    ],
};

const emptySceneLesson: LessonDefinition = {
    id: 'empty-scene-test', demonstrationId: 'bezier', title: {sl: 'Test', en: 'Test'}, summary: {sl: 'Test', en: 'Test'},
    steps: [{id: 'empty', title: {sl: 'Prazno', en: 'Empty'}, body: {sl: 'Telo', en: 'Body'}, scene: {actions: []}}],
};

function fakeCapabilities() {
    let value = 'original';
    const actions: LessonAction[] = [];
    const checkpoint: LessonSceneCheckpoint = {version: 1, value};
    const capabilities: LessonGraphCapabilities = {
        captureState: vi.fn(() => checkpoint),
        restoreState: vi.fn(state => {value = state.value as string;}),
        apply: vi.fn(action => {
            actions.push(action);
            value = JSON.stringify(action);
        }),
        stopAnimations: vi.fn(),
    };
    return {capabilities, actions, getValue: () => value};
}

test('starts on the first scene and re-applies target scenes without persistence', () => {
    const fake = fakeCapabilities();
    const session = new LessonSession(lesson, fake.capabilities);
    session.start();
    expect(session.snapshot()).toMatchObject({status: 'content', stepIndex: 0});
    expect(fake.getValue()).toBe(JSON.stringify({kind: 'parameter', name: 't', value: 0.25}));
    expect(fake.capabilities.restoreState).not.toHaveBeenCalled();

    session.next();
    expect(session.snapshot().stepIndex).toBe(1);
    expect(fake.getValue()).toBe('original');
    session.applyCurrentAction();
    expect(fake.getValue()).toBe(JSON.stringify({kind: 'curve-visibility', target: 'control-polygon', visible: true}));
});

test('restores the captured graph even when the first scene has no actions', () => {
    const fake = fakeCapabilities();
    const session = new LessonSession(emptySceneLesson, fake.capabilities);

    session.start();

    expect(fake.capabilities.restoreState).not.toHaveBeenCalled();
    session.close();
    expect(fake.capabilities.restoreState).toHaveBeenCalledWith({version: 1, value: 'original'});
});

test('moves through explicit frames before changing steps and cancels transient animation', () => {
    const fake = fakeCapabilities();
    const session = new LessonSession(framedLesson, fake.capabilities);
    session.start();
    expect(session.snapshot()).toMatchObject({status: 'content', stepIndex: 0, frameIndex: 0});

    session.next();
    expect(session.snapshot()).toMatchObject({status: 'explore', stepIndex: 0, frameIndex: 1});
    session.next();
    expect(session.snapshot()).toMatchObject({status: 'content', stepIndex: 1, frameIndex: 0});
    session.back();
    expect(session.snapshot()).toMatchObject({status: 'explore', stepIndex: 0, frameIndex: 1});
    session.close();
    expect(fake.capabilities.stopAnimations).toHaveBeenCalled();
    expect(fake.capabilities.restoreState).toHaveBeenCalled();
});

test('exit restores the captured state and completion leaves the final scene available', () => {
    const fake = fakeCapabilities();
    const finalSceneAction: LessonAction = {kind: 'curve-visibility', target: 'control-polygon', visible: true};
    const completionLesson: LessonDefinition = {
        ...lesson,
        steps: [lesson.steps[0], {...lesson.steps[1], scene: {actions: [finalSceneAction]}}],
    };
    const session = new LessonSession(completionLesson, fake.capabilities);
    session.start();
    session.next();
    expect(fake.getValue()).toBe(JSON.stringify(finalSceneAction));
    session.next();
    expect(session.snapshot().status).toBe('complete');
    expect(fake.getValue()).toBe(JSON.stringify(finalSceneAction));
    session.close();
    expect(session.snapshot().status).toBe('closed');
    expect(fake.getValue()).toBe('original');
    expect(fake.capabilities.restoreState).toHaveBeenCalled();
});

test('synchronous scene actions read earlier writes and a later failure restores lesson entry', () => {
    const state = {t: 0.1, observedT: 0.1};
    const observedValues: number[] = [];
    const capabilities: LessonGraphCapabilities = {
        captureState: vi.fn((): LessonSceneCheckpoint => ({version: 1, value: {...state}})),
        restoreState: vi.fn(saved => Object.assign(state, saved.value as object)),
        apply: vi.fn(action => {
            if (action.kind === 'parameter' && action.name === 't') state.t = action.value;
            else if (action.kind === 'animation' && action.animationId === 'bisection' && action.command === 'next-step') observedValues.push(state.t);
            else throw new Error('later action failed');
        }),
        stopAnimations: vi.fn(),
    };
    const dependentSceneLesson: LessonDefinition = {
        ...lesson,
        steps: [{...lesson.steps[0], scene: {actions: [
            {kind: 'parameter', name: 't', value: 0.75},
            {kind: 'animation', animationId: 'bisection', command: 'next-step'},
            {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        ]}}],
    };
    const session = new LessonSession(dependentSceneLesson, capabilities);

    expect(() => session.start()).toThrow('later action failed');
    expect(observedValues).toEqual([0.75]);
    expect(state).toEqual({t: 0.1, observedT: 0.1});
    expect(capabilities.apply).toHaveBeenCalledTimes(3);
    expect(capabilities.restoreState).toHaveBeenCalledWith({version: 1, value: {t: 0.1, observedT: 0.1}});
});

test('surfaces lesson rollback failure after a later action fails', () => {
    const state = {t: 0.1};
    const capabilities: LessonGraphCapabilities = {
        captureState: vi.fn((): LessonSceneCheckpoint => ({version: 1, value: {...state}})),
        restoreState: vi.fn(() => {throw new Error('rollback unavailable');}),
        apply: vi.fn(action => {
            if (action.kind === 'parameter' && action.name === 't') state.t = action.value;
            else throw new Error('later action failed');
        }),
        stopAnimations: vi.fn(),
    };
    const failingLesson: LessonDefinition = {
        ...lesson,
        steps: [{...lesson.steps[0], scene: {actions: [
            {kind: 'parameter', name: 't', value: 0.75},
            {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        ]}}],
    };

    expect(() => new LessonSession(failingLesson, capabilities).start()).toThrow('rollback unavailable');
    expect(state.t).toBe(0.75);
    expect(capabilities.restoreState).toHaveBeenCalledTimes(1);
});

test('an absent scene restores lesson entry when navigation crosses into that step', () => {
    const fake = fakeCapabilities();
    const sceneThenNoScene: LessonDefinition = {
        ...lesson,
        steps: [lesson.steps[0], {...lesson.steps[1], scene: undefined}],
    };
    const session = new LessonSession(sceneThenNoScene, fake.capabilities);

    session.start();
    expect(fake.getValue()).not.toBe('original');
    session.next();

    expect(fake.getValue()).toBe('original');
    expect(session.snapshot()).toMatchObject({status: 'content', stepIndex: 1});
});

test('an explicit empty scene restores lesson entry on navigation', () => {
    const fake = fakeCapabilities();
    const sceneThenEmptyScene: LessonDefinition = {
        ...lesson,
        steps: [lesson.steps[0], {...lesson.steps[1], scene: {actions: []}}],
    };
    const session = new LessonSession(sceneThenEmptyScene, fake.capabilities);

    session.start();
    session.next();

    expect(fake.getValue()).toBe('original');
    expect(session.snapshot()).toMatchObject({status: 'content', stepIndex: 1});
});

test('entry capture failure leaves the graph unchanged and does not apply a scene', () => {
    const fake = fakeCapabilities();
    (fake.capabilities.captureState as Mock).mockImplementation(() => {throw new Error('capture failed');});
    const session = new LessonSession(lesson, fake.capabilities);

    expect(() => session.start()).toThrow('capture failed');
    expect(fake.getValue()).toBe('original');
    expect(fake.capabilities.apply).not.toHaveBeenCalled();
});

test('a scene restore failure is surfaced instead of applying the next scene', () => {
    const fake = fakeCapabilities();
    const session = new LessonSession(lesson, fake.capabilities);
    session.start();
    (fake.capabilities.restoreState as Mock).mockImplementation(() => {throw new Error('restore failed');});

    expect(() => session.next()).toThrow('restore failed');
    expect(fake.capabilities.apply).toHaveBeenCalledTimes(1);
});

test('unsupported or failed actions restore the checkpoint before reporting an error', () => {
    const fake = fakeCapabilities();
    const session = new LessonSession(lesson, fake.capabilities);
    session.start();
    (fake.capabilities.apply as Mock).mockImplementationOnce(() => {throw new Error('unsupported');});
    expect(() => session.reset()).toThrow('unsupported');
    expect(fake.getValue()).toBe('original');
});

test('closing after the graph has been disposed does not restore through a dead capability', () => {
    const fake = fakeCapabilities();
    const unavailable = {
        ...fake.capabilities,
        isAvailable: () => false,
    } as LessonGraphCapabilities & {isAvailable: () => boolean};
    const session = new LessonSession(lesson, unavailable);
    session.start();
    (fake.capabilities.restoreState as Mock).mockClear();

    expect(() => session.close()).not.toThrow();
    expect(fake.capabilities.restoreState).not.toHaveBeenCalled();
});

test('returns the same snapshot object until a transition changes it and notifies subscribers', () => {
    const session = new LessonSession(lesson, fakeCapabilities().capabilities);
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    const initial = session.getSnapshot();
    expect(session.getSnapshot()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();

    session.start();
    const started = session.getSnapshot();
    expect(started).not.toBe(initial);
    expect(session.getSnapshot()).toBe(started);
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    session.next();
    expect(session.getSnapshot()).not.toBe(started);
    expect(session.getSnapshot().stepIndex).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);

    // A no-op transition (back at the very first frame) keeps identity and stays silent.
    session.back();
    const first = session.getSnapshot();
    listener.mockClear();
    session.back();
    expect(session.getSnapshot()).toBe(first);
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
    session.next();
    expect(listener).not.toHaveBeenCalled();
});
