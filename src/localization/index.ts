import {useSyncExternalStore} from 'react';
import {sl} from './sl';
import {en} from './en';

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
let exportsInProgress = 0;
let exportFailed = false;
let revision = 0;
try { if (window.localStorage.getItem(preferenceKey) === 'en') language = 'en'; } catch { persistenceFailed = true; }
const update = () => { revision++; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => revision;
export function useLanguage() {
    useSyncExternalStore(subscribe, snapshot, snapshot);
    return {language, persistenceFailed, exporting: exportsInProgress > 0, exportFailed};
}
export function setLanguage(next: Language) {
    if (exportsInProgress > 0 || (next !== 'sl' && next !== 'en')) return;
    language = next;
    document.documentElement.lang = language;
    try { window.localStorage.setItem(preferenceKey, next); persistenceFailed = false; } catch { persistenceFailed = true; }
    update();
}
export function beginFigureExport() {
    if (exportsInProgress === 0) exportFailed = false;
    exportsInProgress++; update();
    let finished = false;
    return () => { if (!finished) { finished = true; exportsInProgress--; update(); } };
}
export function reportFigureExportFailure() { exportFailed = true; update(); }
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
