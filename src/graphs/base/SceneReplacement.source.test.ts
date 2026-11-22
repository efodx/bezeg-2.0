import {replaceScene, type SceneReplacementHost, type SceneReplacementPlan} from "./SceneReplacement";
import {currentWrite, writeSourcesIdle, type WriteSource} from "./writes/writeSource";

type Seen = Array<[string, WriteSource | undefined]>;

function makeHost(seen: Seen, defer?: {afterCommit?: () => void}) {
    const record = (name: string) => seen.push([name, currentWrite()?.source]);
    const host: SceneReplacementHost<number, undefined> = {
        disposeScene: () => record("disposeScene"),
        suspendBoard: () => record("suspendBoard"),
        resumeBoard: () => record("resumeBoard"),
        replaceState: () => record("replaceState"),
        replaceSceneState: (next, afterCommit) => {
            record("replaceSceneState");
            next();
            if (defer) defer.afterCommit = afterCommit;
            else afterCommit();
        },
        restoreTransientState: () => record("restoreTransientState"),
        initialize: () => record("initialize"),
        syncReplacedScene: () => record("syncReplacedScene"),
        bumpWorkspaceRevision: () => record("bumpWorkspaceRevision"),
    };
    return host;
}

function syncPlan(seen: Seen, source?: WriteSource): SceneReplacementPlan<number, undefined> {
    const record = (name: string) => seen.push([name, currentWrite()?.source]);
    return {
        source,
        dispose: true,
        suspendBoard: true,
        importData: () => record("importData"),
        afterImport: () => record("afterImport"),
        state: {mode: "sync", state: () => { record("state"); return 1; }},
        afterState: () => record("afterState"),
        transientState: undefined,
        initialize: true,
        finish: () => record("finish"),
    };
}

afterEach(() => expect(writeSourcesIdle()).toBe(true));

test("a sync plan with source lesson runs every host and plan step as lesson", () => {
    const seen: Seen = [];
    replaceScene(makeHost(seen), syncPlan(seen, "lesson"));
    expect(seen.map(([name]) => name)).toEqual([
        "suspendBoard", "disposeScene", "importData", "resumeBoard", "afterImport", "state", "replaceState",
        "afterState", "restoreTransientState", "initialize", "syncReplacedScene", "finish",
    ]);
    for (const [name, source] of seen) expect([name, source]).toEqual([name, "lesson"]);
});

test("a deferred plan with source learner tags the steps the host runs later", async () => {
    const seen: Seen = [];
    const record = (name: string) => seen.push([name, currentWrite()?.source]);
    const defer: {afterCommit?: () => void} = {};
    const host = makeHost(seen, defer);
    const plan: SceneReplacementPlan<number, undefined> = {
        ...syncPlan(seen, "learner"),
        state: {
            mode: "deferred",
            next: () => { record("next"); return 2; },
            isCurrent: () => true,
            signal: new AbortController().signal,
            onCancel: () => undefined,
        },
        finish: () => record("finish"),
    };
    const promise = replaceScene(host, plan)!;
    expect(defer.afterCommit).toBeDefined();
    expect(writeSourcesIdle()).toBe(true);
    // The host commits later, outside any scope.
    expect(currentWrite()).toBeUndefined();
    defer.afterCommit!();
    await promise;
    const names = seen.map(([name]) => name);
    for (const name of ["next", "initialize", "syncReplacedScene", "finish"]) expect(names).toContain(name);
    for (const [name, source] of seen) expect([name, source]).toEqual([name, "learner"]);
});

test("a plan without source records untagged writes", () => {
    const seen: Seen = [];
    replaceScene(makeHost(seen), syncPlan(seen));
    expect(seen.length).toBeGreaterThan(0);
    for (const [name, source] of seen) expect([name, source]).toEqual([name, undefined]);
});
