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
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
    try {
        await Promise.race([
            api.startup?.promise ?? Promise.resolve(),
            new Promise<never>((_, reject) => {
                timeout = globalThis.setTimeout(() => reject(new Error('MathJax startup timed out.')), LOAD_TIMEOUT_MS);
            }),
        ]);
    } finally {
        globalThis.clearTimeout(timeout);
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
            globalThis.clearTimeout(timeout);
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
        const timeout = globalThis.setTimeout(
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

/**
 * Loads MathJax on demand and typesets only while the owning surface is still active.
 * `prepare` runs after the element's earlier typesetting is cleared, so it can replace the source to typeset.
 */
export async function typesetMath(
    element: HTMLElement,
    isActive: () => boolean = () => true,
    prepare?: () => void,
): Promise<void> {
    const api = await loadMathJax();
    if (!isActive()) return;
    api.typesetClear?.([element]);
    prepare?.();
    await api.typesetPromise?.([element]);
    if (isActive()) bindTrailingPunctuation(element);
}

/** The class of the span that holds an inline formula and the punctuation after it (`white-space: nowrap` in `src/index.css`). */
const BOUND_MATH_CLASS = 'math-with-punctuation';

/** Closing punctuation that may not start a line: a full stop, comma, colon, semicolon, mark or closing bracket or quote. */
const TRAILING_PUNCTUATION = /^[.,:;!?…)\]}»“”’"']+/;

/**
 * A typeset inline formula is an atomic inline, so the browser may break a line between it and the punctuation after it and
 * start the next line with a lone full stop. Each inline formula followed directly by closing punctuation is wrapped with
 * that punctuation in a span that does not break. Display math, formulas already bound and other text are left alone.
 */
export function bindTrailingPunctuation(root: HTMLElement): void {
    for (const math of root.querySelectorAll<HTMLElement>('mjx-container:not([display="true"])')) {
        if (math.parentElement?.classList.contains(BOUND_MATH_CLASS)) continue;
        const next = math.nextSibling;
        if (!(next instanceof Text)) continue;
        const punctuation = TRAILING_PUNCTUATION.exec(next.data)?.[0];
        if (!punctuation) continue;
        const bound = document.createElement('span');
        bound.className = BOUND_MATH_CLASS;
        math.before(bound);
        bound.append(math, document.createTextNode(punctuation));
        next.data = next.data.slice(punctuation.length);
    }
}
