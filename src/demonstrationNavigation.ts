import {getDemonstrationCatalog} from './demonstrations';
import type {FamilyId} from './demonstrations';

export type DemonstrationCatalogueLocation = Readonly<{
    pathname: '/bezeg-2.0/demonstrations';
    search: string;
    hash: string;
}>;

export type DemonstrationReturnContext = Readonly<{
    kind: 'demonstration-return';
    location: DemonstrationCatalogueLocation;
    cardId: string;
    scrollY: number;
    focusTarget: string;
}>;

const cataloguePath = '/bezeg-2.0/demonstrations';

/** Build app-owned return state from a validated in-app catalogue location. */
export function createDemonstrationReturnContext(
    location: {pathname: string; search?: string; hash?: string},
    cardId: string,
    scrollY: number,
    focusTarget: string,
): DemonstrationReturnContext | undefined {
    if (location.pathname !== cataloguePath || !cardId || !focusTarget || !Number.isFinite(scrollY)) return undefined;
    const params = new URLSearchParams(location.search ?? '');
    const topic = params.get('topic');
    if (topic !== null && !isFamilyId(topic)) params.delete('topic');
    if (params.get('q') === '') params.delete('q');
    const search = params.toString();
    return {
        kind: 'demonstration-return',
        location: {pathname: cataloguePath, search: search ? `?${search}` : '', hash: location.hash ?? ''},
        cardId,
        scrollY: Math.max(0, scrollY),
        focusTarget,
    };
}

/** Read return state safely; arbitrary URLs and malformed browser state are ignored. */
export function readDemonstrationReturnContext(state: unknown): DemonstrationReturnContext | undefined {
    if (!state || typeof state !== 'object') return undefined;
    const candidate = (state as {demonstrationReturn?: unknown}).demonstrationReturn;
    if (!candidate || typeof candidate !== 'object') return undefined;
    const value = candidate as Partial<DemonstrationReturnContext>;
    const location = value.location;
    if (value.kind !== 'demonstration-return' || !location || location.pathname !== cataloguePath
        || typeof location.search !== 'string' || typeof location.hash !== 'string'
        || typeof value.cardId !== 'string' || typeof value.focusTarget !== 'string'
        || typeof value.scrollY !== 'number' || !Number.isFinite(value.scrollY) || value.scrollY < 0) return undefined;
    const params = new URLSearchParams(location.search);
    const topic = params.get('topic');
    if (topic !== null && !isFamilyId(topic)) return undefined;
    return {
        kind: 'demonstration-return',
        location: {pathname: cataloguePath, search: location.search, hash: location.hash},
        cardId: value.cardId,
        scrollY: value.scrollY,
        focusTarget: value.focusTarget,
    };
}

function isFamilyId(value: string): value is FamilyId {
    return getDemonstrationCatalog().families.some(family => family.id === value);
}
