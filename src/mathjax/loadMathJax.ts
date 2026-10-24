export type MathJaxApi = {
    startup?: {promise?: Promise<unknown>};
    typesetClear?: (elements?: Element[]) => void;
    typesetPromise?: (elements?: Element[]) => Promise<void>;
};

type MathJaxWindow = Window & {MathJax?: MathJaxApi | Record<string, unknown>};
const SCRIPT_ID = 'MathJax-script';
const LOAD_TIMEOUT_MS = 15000;
let loading: Promise<MathJaxApi> | undefined;

function apiOnWindow(): MathJaxApi | undefined {
    const value = (window as MathJaxWindow).MathJax;
    return value && 'typesetPromise' in value && typeof value.typesetPromise === 'function'
        ? value as MathJaxApi : undefined;
}

async function waitForStartup(api: MathJaxApi): Promise<MathJaxApi> {
    let timeout = 0;
    try {
        await Promise.race([
            api.startup?.promise ?? Promise.resolve(),
            new Promise<never>((_, reject) => {
                timeout = window.setTimeout(() => reject(new Error('MathJax startup timed out.')), LOAD_TIMEOUT_MS);
            }),
        ]);
    } finally {
        window.clearTimeout(timeout);
    }
    if (!api.typesetPromise) throw new Error('MathJax started without a typesetting API.');
    return api;
}

function loadFromScript(): Promise<MathJaxApi> {
    const presentApi = apiOnWindow();
    if (presentApi) return waitForStartup(presentApi).catch(error => {
        delete (window as MathJaxWindow).MathJax;
        document.getElementById(SCRIPT_ID)?.remove();
        throw error;
    });

    return new Promise((resolve, reject) => {
        const win = window as MathJaxWindow;
        const hadConfig = win.MathJax !== undefined;
        const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
            ?? document.createElement('script');
        const createdHere = !script.isConnected;
        let settled = false;
        const finish = (error?: Error, api?: MathJaxApi) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            script.removeEventListener('load', onLoad);
            script.removeEventListener('error', onError);
            if (error) {
                script.remove();
                if (!hadConfig || createdHere) delete win.MathJax;
                reject(error);
                return;
            }
            resolve(api!);
        };
        const onLoad = () => {
            const api = apiOnWindow();
            if (!api) {
                finish(new Error('MathJax loaded without exposing its typesetting API.'));
                return;
            }
            void waitForStartup(api).then(
                ready => finish(undefined, ready),
                error => finish(error instanceof Error ? error : new Error('MathJax startup failed.')),
            );
        };
        const onError = () => finish(new Error('MathJax failed to load.'));
        const timeout = window.setTimeout(
            () => finish(new Error('MathJax loading timed out.')),
            LOAD_TIMEOUT_MS,
        );

        script.addEventListener('load', onLoad, {once: true});
        script.addEventListener('error', onError, {once: true});
        if (createdHere) {
            script.id = SCRIPT_ID;
            script.async = true;
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            document.head.append(script);
        }
    });
}

/** Shares one external MathJax request, and clears failed attempts so callers can retry. */
export function loadMathJax(): Promise<MathJaxApi> {
    const presentApi = apiOnWindow();
    if (presentApi) return waitForStartup(presentApi).catch(error => {
        if ((window as MathJaxWindow).MathJax === presentApi) delete (window as MathJaxWindow).MathJax;
        document.getElementById(SCRIPT_ID)?.remove();
        throw error;
    });
    if (loading) return loading;
    const request = loadFromScript();
    loading = request.catch(error => {
        loading = undefined;
        throw error;
    });
    return loading;
}

/** Loads MathJax on demand and typesets only while the owning surface is still active. */
export async function typesetMath(
    element: HTMLElement,
    isActive: () => boolean = () => true,
): Promise<void> {
    const api = await loadMathJax();
    if (!isActive()) return;
    api.typesetClear?.([element]);
    await api.typesetPromise?.([element]);
}
