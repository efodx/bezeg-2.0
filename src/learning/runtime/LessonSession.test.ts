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
    const session = new LessonSession(lesson, fake.capabilities);
    session.start();
    session.next();
    session.next();
    expect(session.snapshot().status).toBe('complete');
    session.close();
    expect(session.snapshot().status).toBe('closed');
    expect(fake.getValue()).toBe('original');
    expect(fake.capabilities.restoreState).toHaveBeenCalled();
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
