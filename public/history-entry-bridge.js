/* Bezeg extension for the MIT-licensed rafgraph GitHub Pages SPA redirect. */
(function (root) {
    'use strict';

    var storageKey = 'bezeg-2.0:history-entry-bridge:v1';
    var handoffLifetime = 60 * 1000;
    var idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
    var routerKeyPattern = /^[A-Za-z0-9_-]{1,128}$/;

    function boundedActivity(usr, search) {
        var marker = usr && usr.chapterActivity;
        var params = new URLSearchParams(search);
        if (!marker || typeof marker !== 'object' || Array.isArray(marker)
            || params.getAll('chapter').length !== 1 || params.getAll('activity').length !== 1
            || params.get('chapter') !== marker.chapterId || params.get('activity') !== marker.activityId
            || marker.v !== 1 || marker.chapterId !== 'bezier-curves'
            || typeof marker.activityId !== 'string' || !idPattern.test(marker.activityId)
            || typeof marker.demonstrationId !== 'string' || !idPattern.test(marker.demonstrationId)
            || typeof marker.started !== 'boolean'
            || typeof marker.entryId !== 'string' || !/^bezier-\d{1,16}-\d{1,8}$/.test(marker.entryId)
            || (marker.predecessorReadingKey !== undefined
                && (typeof marker.predecessorReadingKey !== 'string' || marker.predecessorReadingKey.length > 128))) return;

        return {
            v: 1,
            entryId: marker.entryId,
            chapterId: marker.chapterId,
            activityId: marker.activityId,
            demonstrationId: marker.demonstrationId,
            started: marker.started,
            ...(marker.predecessorReadingKey ? {predecessorReadingKey: marker.predecessorReadingKey} : {}),
        };
    }

    function boundedRouterState(state, search) {
        if (!state || typeof state !== 'object' || Array.isArray(state)
            || !Number.isInteger(state.idx) || state.idx < 0 || state.idx > 1000000
            || typeof state.key !== 'string' || !routerKeyPattern.test(state.key)
            || !state.usr || typeof state.usr !== 'object' || Array.isArray(state.usr)) return;
        var usr = {};
        if (typeof state.usr.chapterGraphId === 'string' && idPattern.test(state.usr.chapterGraphId)) {
            usr.chapterGraphId = state.usr.chapterGraphId;
        }
        var activity = boundedActivity(state.usr, search);
        if (activity) usr.chapterActivity = activity;
        var invocation = state.usr.chapterReadingInvocation;
        if (invocation && typeof invocation === 'object' && !Array.isArray(invocation)
            && invocation.v === 1 && typeof invocation.activityId === 'string' && idPattern.test(invocation.activityId)
            && typeof invocation.sectionId === 'string' && idPattern.test(invocation.sectionId)
            && typeof invocation.readingKey === 'string' && routerKeyPattern.test(invocation.readingKey)
            && invocation.readingKey === state.key) {
            usr.chapterReadingInvocation = {
                v: 1, activityId: invocation.activityId, sectionId: invocation.sectionId, readingKey: invocation.readingKey,
            };
        }
        if (Object.keys(usr).length === 0) return;
        return {usr: usr, key: state.key, idx: state.idx};
    }

    function captureBeforeRedirect() {
        var location = root.location;
        var target = location.pathname + location.search + location.hash;
        try {
            root.sessionStorage.removeItem(storageKey);
            var state = boundedRouterState(root.history.state, location.search);
            if (!state) return;
            root.sessionStorage.setItem(storageKey, JSON.stringify({
                v: 1,
                target: target,
                expiresAt: Date.now() + handoffLifetime,
                state: state,
            }));
        } catch (_) {
            // Storage is best-effort. The normal canonical URL redirect still works without it.
        }
    }

    function takeFor(target) {
        var raw;
        try {
            raw = root.sessionStorage.getItem(storageKey);
            root.sessionStorage.removeItem(storageKey);
        } catch (_) {
            return;
        }
        if (!raw || raw.length > 4096) return;
        try {
            var saved = JSON.parse(raw);
            if (!saved || saved.v !== 1 || saved.target !== target
                || !Number.isFinite(saved.expiresAt) || saved.expiresAt < Date.now()
                || saved.expiresAt > Date.now() + handoffLifetime
                || !saved.state || typeof saved.state !== 'object'
                || !boundedRouterState(saved.state, new URL(target, root.location.origin).search)) return;
            return boundedRouterState(saved.state, new URL(target, root.location.origin).search);
        } catch (_) {
            return;
        }
    }

    function redirectTarget(location) {
        var redirect = location.search.slice(1);
        if (redirect.indexOf('/~v2~') === 0) {
            try {
                return location.pathname.slice(0, -1) + decodeURIComponent(redirect.slice(5)) + location.hash;
            } catch (_) {
                return location.pathname;
            }
        }
        var decoded = redirect.split('&').map(function (part) {
            return part.replace(/~and~/g, '&');
        }).join('?');
        return location.pathname.slice(0, -1) + decoded + location.hash;
    }

    function restoreRedirect() {
        var location = root.location;
        if (location.search[1] !== '/') {
            takeFor(undefined); // discard a stale handoff on an ordinary entry
            return;
        }
        var target = redirectTarget(location);
        var state = takeFor(target);
        root.history.replaceState(state || null, '', target);
    }

    root.BezegHistoryEntryBridge = {captureBeforeRedirect: captureBeforeRedirect, restoreRedirect: restoreRedirect};
}(window));
