const listeners = new Set<() => void>();
let failed = false;
export function reportNavigationFailure() { failed = true; listeners.forEach(listener => listener()); }
export function clearNavigationFailure() { failed = false; listeners.forEach(listener => listener()); }
export function navigationFailureSnapshot() { return failed; }
export function subscribeNavigationFailure(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
