import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const bridgeSource = readFileSync(resolve(process.cwd(), 'public/history-entry-bridge.js'), 'utf8');
const storageKey = 'bezeg-2.0:history-entry-bridge:v1';
type BridgeWindow = {
    location: URL;
    history: {state: unknown; replaceState: (...args: unknown[]) => void};
    sessionStorage: {getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void};
    BezegHistoryEntryBridge?: {captureBeforeRedirect: () => void; restoreRedirect: () => void};
};

function harness(url: string, state: unknown, storage = new Map<string, string>()) {
    const location = new URL(url);
    const replacements: unknown[][] = [];
    const window: BridgeWindow = {
        location,
        history: {state, replaceState: (...args: unknown[]) => replacements.push(args)},
        sessionStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        },
    };
    new Function('window', bridgeSource)(window);
    return {window, storage, replacements};
}

const target = '/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control&other=kept&note=a~and~b#control-points';
const githubRedirectUrl = (path: string) => {
    const url = new URL(path, 'https://example.test');
    const route = url.pathname.slice('/bezeg-2.0'.length) + url.search;
    return `${url.origin}/bezeg-2.0/?/~v2~${encodeURIComponent(route)}${url.hash}`;
};
const marker = {
    v: 1, entryId: 'bezier-1792512345000-1', chapterId: 'bezier-curves', activityId: 'shape-control',
    demonstrationId: 'bezier', started: true, predecessorReadingKey: 'read-1', graphSnapshot: {points: [[100, 200]]},
};

describe('GitHub Pages history-entry bridge', () => {
    it('round-trips only bounded chapter metadata and React Router history fields through a real redirect URL', () => {
        const storage = new Map<string, string>();
        const page404 = harness(`https://example.test${target}`, {
            usr: {chapterActivity: marker, chapterGraphId: 'decasteljau', unrelated: {secret: true},
                chapterReadingInvocation: {v: 1, activityId: 'shape-control', sectionId: 'control-points', readingKey: 'route-key'}},
            key: 'route-key', idx: 7, arbitrary: 'discard',
        }, storage);
        page404.window.BezegHistoryEntryBridge!.captureBeforeRedirect();

        const raw = storage.get(storageKey)!;
        expect(raw).not.toContain('graphSnapshot');
        expect(raw).not.toContain('unrelated');
        expect(raw).not.toContain('arbitrary');
        const tampered = JSON.parse(raw) as {state: {usr: Record<string, unknown>; [key: string]: unknown}};
        tampered.state.usr.graphSnapshot = {points: [[900, 800]]};
        tampered.state.usr.chapterActivity = {...marker, injected: 'discard'};
        tampered.state.injected = {arbitrary: true};
        storage.set(storageKey, JSON.stringify(tampered));
        const index = harness(githubRedirectUrl(target), null, storage);
        index.window.BezegHistoryEntryBridge!.restoreRedirect();

        expect(index.replacements).toEqual([[{
            usr: {chapterActivity: {
                v: 1, entryId: marker.entryId, chapterId: 'bezier-curves', activityId: 'shape-control',
                demonstrationId: 'bezier', started: true, predecessorReadingKey: 'read-1',
            }, chapterGraphId: 'decasteljau', chapterReadingInvocation: {
                v: 1, activityId: 'shape-control', sectionId: 'control-points', readingKey: 'route-key',
            }}, key: 'route-key', idx: 7,
        }, '', target]]);
        expect(storage.has(storageKey)).toBe(false);
    });

    it('clears a mismatched or expired handoff and restores no navigation state', () => {
        const storage = new Map([[storageKey, JSON.stringify({
            v: 1, target: '/another/path', expiresAt: Date.now() + 10000, state: {usr: {}, key: 'k', idx: 1},
        })]]);
        const index = harness(githubRedirectUrl(target), null, storage);
        index.window.BezegHistoryEntryBridge!.restoreRedirect();
        expect(index.replacements[0][0]).toBeNull();
        expect(storage.has(storageKey)).toBe(false);

        const stale = new Map([[storageKey, JSON.stringify({
            v: 1, target, expiresAt: Date.now() - 1, state: {usr: {chapterGraphId: 'bezier'}, key: 'k', idx: 1},
        })]]);
        const staleIndex = harness(githubRedirectUrl(target), null, stale);
        staleIndex.window.BezegHistoryEntryBridge!.restoreRedirect();
        expect(staleIndex.replacements[0][0]).toBeNull();
        expect(stale.has(storageKey)).toBe(false);
    });

    it('omits mismatched activity markers, preserves a bounded ordinary graph id, and tolerates denied storage', () => {
        const storage = new Map<string, string>();
        const page404 = harness(`https://example.test${target}`, {
            usr: {chapterActivity: {...marker, activityId: 'other'}, chapterGraphId: 'decasteljau', snapshot: {x: 1}},
            key: 'route-key', idx: 4,
        }, storage);
        page404.window.BezegHistoryEntryBridge!.captureBeforeRedirect();
        expect(JSON.parse(storage.get(storageKey)!)).toMatchObject({state: {
            usr: {chapterGraphId: 'decasteljau'}, key: 'route-key', idx: 4,
        }});

        const denied = harness(githubRedirectUrl(target), null);
        denied.window.sessionStorage.getItem = () => { throw new Error('storage disabled'); };
        expect(() => denied.window.BezegHistoryEntryBridge!.restoreRedirect()).not.toThrow();
        expect(denied.replacements[0][0]).toBeNull();
    });
});
