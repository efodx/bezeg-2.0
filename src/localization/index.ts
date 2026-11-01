import {useSyncExternalStore} from 'react';
import {sl} from './sl';
import {en} from './en';
import {appStorage} from '../storage/appStorage';

export type Language = 'sl' | 'en';
export type MessageKey = keyof typeof sl;
export interface Message {key: MessageKey; params: Record<string, string | number | Message>}
type Parameters<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | Parameters<Rest> : never;
type Args<K extends MessageKey> = [Parameters<typeof sl[K]>] extends [never] ? [] : [Record<Parameters<typeof sl[K]>, string | number>];
type TranslationArguments = {[K in MessageKey]: [key: K, ...args: Args<K>]}[MessageKey];
type MessageArguments = {[K in MessageKey]: [Parameters<typeof sl[K]>] extends [never] ? [key: K] : [key: K, params: Record<Parameters<typeof sl[K]>, string | number | Message>]}[MessageKey];
const preferenceKey = 'bezeg-language';
const listeners = new Set<() => void>();
let language: Language = 'sl';
let persistenceFailed = false;
const languageLocks = new Set<() => boolean>();
let revision = 0;
try { if (appStorage.getItem(preferenceKey) === 'en') language = 'en'; } catch { persistenceFailed = true; }
const update = () => { revision++; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => revision;
/** Subscribe to language and language-lock changes outside React; returns the unsubscribe function. */
export function onLanguageChange(listener: () => void): () => void { return subscribe(listener); }
export function currentLanguage(): Language { return language; }
export function useLanguage() {
    useSyncExternalStore(subscribe, snapshot, snapshot);
    return {language, persistenceFailed, locked: languageLocked()};
}
/** Subscribes the calling component to language changes (like useLanguage) and returns the typed `t`. */
export function useT(): typeof t {
    useSyncExternalStore(subscribe, snapshot, snapshot);
    return t;
}
export function setLanguage(next: Language) {
    if (languageLocked() || (next !== 'sl' && next !== 'en')) return;
    language = next;
    document.documentElement.lang = language;
    try { appStorage.setItem(preferenceKey, next); persistenceFailed = false; } catch { persistenceFailed = true; }
    update();
}
/** True while any registered lock (such as a running figure export) keeps the language from changing. */
function languageLocked(): boolean { return [...languageLocks].some(isLocked => isLocked()); }
/** Lets another module hold the language fixed while its predicate is true; returns the unregister function. */
export function registerLanguageLock(isLocked: () => boolean): () => void { languageLocks.add(isLocked); return () => { languageLocks.delete(isLocked); }; }
/** A lock's predicate changed: re-render the components that show the lock. */
export function notifyLanguageLockChanged(): void { update(); }
export function t(...[key, parameters]: TranslationArguments): string {
    const template: string = (language === 'en' ? en[key] : sl[key]) ?? sl[key] ?? key;
    const params = (parameters ?? {}) as Record<string, string | number>;
    return template.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
}
export function message(...[key, parameters]: MessageArguments): Message {
    return {key, params: parameters ?? {}};
}
export function renderMessage(value: Message): string {
    const template: string = (language === 'en' ? en[value.key] : sl[value.key]) ?? sl[value.key];
    return template.replace(/\{(\w+)\}/g, (match, name) => {
        const parameter = value.params[name];
        return typeof parameter === 'object' ? renderMessage(parameter) : String(parameter ?? match);
    });
}
export class LocalizedError extends Error {
    constructor(readonly description: Message) {
        super();
        Object.defineProperty(this, 'message', {get: () => renderMessage(description)});
    }
}
if (typeof document !== 'undefined') document.documentElement.lang = language;
