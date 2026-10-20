import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {findDemonstration} from '../../demonstrations';
import type {LessonGraphCapabilities} from '../model';
import {ActivitySessionRollbackError} from './ActivitySession';
import {findActivity} from './activities';
import {reportNavigationFailure} from './navigationFailure';
import {chapterActivityVisit} from './ChapterActivityVisit';

/** URL data selects authored IDs only; graph-owned checkpoints never enter history or storage. */
export function resolveActivityContext(search: string, demonstrationId?: string) {
    const query = new URLSearchParams(search);
    const requested = query.has('chapter') || query.has('activity');
    const activity = findActivity(query.get('activity') ?? '');
    const valid = query.getAll('chapter').length === 1 && query.get('chapter') === 'bezier-curves'
        && query.getAll('activity').length === 1 && activity?.demonstrationId === demonstrationId;
    return {activity: valid ? activity : undefined, invalid: requested && !valid};
}

export function useChapterActivity(capabilities: LessonGraphCapabilities | undefined,
    beforeDispose: React.MutableRefObject<(() => void) | undefined> | undefined,
    closeLesson: React.MutableRefObject<(() => void) | undefined>, disposeFailedGraph?: () => void,
    visit = chapterActivityVisit) {
    const location = useLocation();
    const navigate = useNavigate();
    const demo = findDemonstration(location.pathname);
    const {activity, invalid} = resolveActivityContext(location.search, demo?.id);
    const [error, setError] = useState(false);
    const [fatal, setFatal] = useState(false);
    const [invalidNotice, setInvalidNotice] = useState(invalid);
    const [restarted, setRestarted] = useState(false);
    const marker = activity && visit.readActivityEntry(location.state, activity.id);
    const cleanLocation = useCallback(() => {
        const query = new URLSearchParams(location.search);
        query.delete('chapter'); query.delete('activity');
        return {pathname: location.pathname, search: query.toString() ? `?${query}` : '', hash: location.hash};
    }, [location.pathname, location.search, location.hash]);

    useEffect(() => {
        if (!invalid) return;
        setInvalidNotice(true);
        navigate(cleanLocation(), {replace: true, state: location.state});
    }, [invalid, navigate, cleanLocation, location.state]);

    useLayoutEffect(() => {
        if (!capabilities || !demo) return;
        let disposed = false;
        try {
            if (activity) {
                setInvalidNotice(false);
                visit.enterActivity(activity, capabilities, location.key, () => closeLesson.current?.());
                // Reload cannot retain visit memory. The notice is informational and never persists progress.
                setRestarted(Boolean(marker?.started) && !visit.hasActivitySnapshot(activity.id));
            } else {
                const explicitReturn = location.state && typeof location.state === 'object' && location.state.chapterRestore === true;
                visit.enterOrdinary(demo.id, capabilities, Boolean(explicitReturn), location.key,
                    () => closeLesson.current?.());
            }
            setError(false);
        } catch (cause) {
            setError(true);
            if (cause instanceof ActivitySessionRollbackError) { setFatal(true); disposeFailedGraph?.(); }
        }
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            try {
                if (activity) {
                    visit.departActivity(activity.id, activity.sectionId, () => closeLesson.current?.());
                } else {
                    try { closeLesson.current?.(); }
                    finally { visit.departOrdinary(); }
                }
            } catch {
                // Keep the last good snapshot; a departure must still release the board.
                reportNavigationFailure();
            }
        };
        if (beforeDispose) beforeDispose.current = dispose;
        return () => {
            dispose();
            if (beforeDispose?.current === dispose) beforeDispose.current = undefined;
        };
    // Language, inspector renders and unrelated query/hash edits must not replay a scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [capabilities, demo?.id, activity?.id]);

    useEffect(() => {
        if (!activity || !visit.isActivityActive(activity.id) || marker?.started) return;
        const state = marker ? location.state : visit.activityEntryState(location.state, activity.id);
        const entry = visit.readActivityEntry(state, activity.id)!;
        navigate({pathname: location.pathname, search: location.search, hash: location.hash}, {
            replace: true, state: {...state, chapterActivity: {...entry, started: true}},
        });
    }, [activity, marker, location, navigate, capabilities, error]);

    const guard = (operation: () => void) => {
        try { operation(); setError(false); }
        catch (cause) {
            setError(true);
            if (cause instanceof ActivitySessionRollbackError) { setFatal(true); disposeFailedGraph?.(); }
        }
    };
    return {
        activity, error, fatal, invalidNotice, restarted,
        retry: () => guard(() => visit.retry()),
        returnPath: activity ? visit.readingReturnPath() : undefined,
        reset: () => guard(() => { visit.resetActivity(); }),
        returnToReading: () => guard(() => {
            if (!activity) return;
            visit.returnToReading(activity.id, activity.sectionId, location.key, marker?.predecessorReadingKey,
                useHistoryBack => useHistoryBack
                    ? navigate(-1)
                    : navigate(visit.readingReturnPath(), {state: location.state}));
        }),
        freeExplore: () => guard(() => {
            if (!activity || !demo) return;
            visit.adoptForExploration(activity.id, demo.id,
                () => navigate(cleanLocation(), {replace: true, state: location.state}));
        }),
        readAbout: demo && visit.supportsRelatedReading(demo.id) ? () => guard(() => {
            if (!capabilities) return;
            visit.readAbout(demo.id, capabilities, location.pathname + location.search + location.hash, location.key, (path, graphId) => {
                const previousState = location.state && typeof location.state === 'object' ? location.state : {};
                navigate(path, {state: {...previousState, chapterGraphId: graphId}});
            });
        }) : undefined,
    };
}
