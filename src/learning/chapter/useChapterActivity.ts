import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {findDemonstration} from '../../demonstrations';
import type {LessonGraphCapabilities} from '../model';
import {ActivitySession, ActivitySessionRollbackError} from './ActivitySession';
import {findActivity} from './activities';
import {reportNavigationFailure} from './navigationFailure';
import {clearPendingReadingReturn} from './navigationMemory';
import {activitySnapshots, ordinarySnapshots, rememberOrdinaryPath, relatedSections, chapterPath,
    readingReturnPath, setReturnSection, registerActivityEntry, hasReadingPredecessor, activityEntryState, readActivityEntry, prepareReadingReturn, isOrdinaryReturn} from './navigationMemory';

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
    closeLesson: React.MutableRefObject<(() => void) | undefined>, disposeFailedGraph?: () => void) {
    const location = useLocation();
    const navigate = useNavigate();
    const demo = findDemonstration(location.pathname);
    const {activity, invalid} = resolveActivityContext(location.search, demo?.id);
    const [error, setError] = useState(false);
    const [fatal, setFatal] = useState(false);
    const [invalidNotice, setInvalidNotice] = useState(invalid);
    const session = useRef<ActivitySession>();
    const restoreOrdinary = useRef<() => void>();
    const retryOperation = useRef<() => void>();
    const failed = useRef(false);
    const active = useRef(false);
    const [restarted, setRestarted] = useState(false);
    const marker = activity && readActivityEntry(location.state, activity.id);
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
        failed.current = false;
        active.current = false;
        retryOperation.current = undefined;
        const current = activity ? new ActivitySession(activity, capabilities) : undefined;
        session.current = current;
        try {
            if (activity && current) {
                setInvalidNotice(false);
                closeLesson.current?.();
                setReturnSection(activity.sectionId, activity.id);
                current.start(activitySnapshots.get(activity.id));
                active.current = true;
                registerActivityEntry(activity.id, location.key);
                // Reload cannot retain visit memory. The notice is informational and never persists progress.
                setRestarted(Boolean(marker?.started) && !activitySnapshots.has(activity.id)
                    && window.performance.getEntriesByType('navigation').some(entry =>
                        'type' in entry && entry.type === 'reload'));
            } else {
                const explicitReturn = location.state && typeof location.state === 'object' && location.state.chapterRestore === true;
                const saved = explicitReturn || isOrdinaryReturn(location.key, demo.id) ? ordinarySnapshots.get(demo.id) : undefined;
                const restore = () => { if (saved) {
                    const rollback = capabilities.captureState();
                    try { capabilities.pauseAnimations?.(); capabilities.restoreState(saved); capabilities.pauseAnimations?.(); }
                    catch (cause) {
                        try { capabilities.restoreState(rollback); }
                        catch (rollbackError) { throw new ActivitySessionRollbackError(cause, rollbackError); }
                        throw cause;
                    }
                } };
                restoreOrdinary.current = restore;
                restore();
            }
            setError(false);
        } catch (cause) {
            failed.current = true;
            setError(true);
            if (cause instanceof ActivitySessionRollbackError) { setFatal(true); disposeFailedGraph?.(); }
        }
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            if (activity) prepareReadingReturn(activity.sectionId, activity.id);
            try {
                closeLesson.current?.();
                if (activity && current && active.current && !failed.current) {
                    activitySnapshots.set(activity.id, current.capture());
                }
            } catch {
                // Keep the last good snapshot; a departure must still release the board.
                failed.current = true;
                reportNavigationFailure();
            }
            active.current = false;
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
        if (!activity || !active.current || marker?.started) return;
        const state = marker ? location.state : activityEntryState(location.state, activity.id);
        const entry = readActivityEntry(state, activity.id)!;
        navigate({pathname: location.pathname, search: location.search, hash: location.hash}, {
            replace: true, state: {...state, chapterActivity: {...entry, started: true}},
        });
    }, [activity, marker, location, navigate, capabilities]);

    const guard = (operation: () => void) => {
        retryOperation.current = operation;
        try { closeLesson.current?.(); operation(); setError(false); }
        catch (cause) {
            setError(true);
            if (cause instanceof ActivitySessionRollbackError) { failed.current = true; setFatal(true); disposeFailedGraph?.(); }
        }
    };
    return {
        activity, error, fatal, invalidNotice, restarted,
        retry: () => guard(retryOperation.current ?? (() => {
            if (activity && session.current) {
                session.current.start(activitySnapshots.get(activity.id));
                active.current = true; failed.current = false;
            } else restoreOrdinary.current?.();
        })),
        returnPath: activity ? readingReturnPath() : undefined,
        reset: () => guard(() => { session.current?.reset(); }),
        returnToReading: () => guard(() => {
            if (activity && session.current) activitySnapshots.set(activity.id, session.current.capture());
            if (activity) prepareReadingReturn(activity.sectionId, activity.id);
            if (hasReadingPredecessor(location.key) || marker?.predecessorReadingKey) navigate(-1);
            else navigate(readingReturnPath(), {state: location.state});
        }),
        freeExplore: () => guard(() => {
            if (!activity || !session.current || !demo) return;
            const snapshot = session.current.capture();
            activitySnapshots.set(activity.id, snapshot);
            ordinarySnapshots.set(demo.id, snapshot);
            navigate(cleanLocation(), {replace: true, state: location.state});
        }),
        readAbout: demo && relatedSections[demo.id] ? () => guard(() => {
            if (!capabilities) return;
            capabilities.pauseAnimations?.();
            const checkpoint = capabilities.captureState();
            ordinarySnapshots.set(demo.id, checkpoint);
            clearPendingReadingReturn();
            rememberOrdinaryPath(location.pathname + location.search + location.hash, location.key, demo.id);
            const previousState = location.state && typeof location.state === 'object' ? location.state : {};
            navigate(`${chapterPath}#${relatedSections[demo.id]}`, {state: {...previousState, chapterGraphId: demo.id}});
        }) : undefined,
    };
}
