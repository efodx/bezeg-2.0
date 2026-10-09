const STORAGE_PREFIX = 'bezeg-2.0:';

/** Keep each release's browser data separate while retaining the original
 * preset keys inside the established import/export file format.
 */
export class NamespacedStorage implements Storage {
    constructor(private readonly getStorage: () => Storage, private readonly prefix = STORAGE_PREFIX) {}

    private get storage() {
        return this.getStorage();
    }

    private physicalKey(key: string) {
        return this.prefix + key;
    }

    private appKeys() {
        const storage = this.storage;
        const keys: string[] = [];
        for (let index = 0; index < storage.length; index++) {
            const key = storage.key(index);
            if (key?.startsWith(this.prefix)) { keys.push(key.slice(this.prefix.length)); }
        }
        return keys;
    }

    get length() {
        return this.appKeys().length;
    }

    clear() {
        const storage = this.storage;
        this.appKeys().forEach(key => storage.removeItem(this.physicalKey(key)));
    }

    getItem(key: string) {
        return this.storage.getItem(this.physicalKey(key));
    }

    key(index: number) {
        return this.appKeys()[index] ?? null;
    }

    removeItem(key: string) {
        this.storage.removeItem(this.physicalKey(key));
    }

    setItem(key: string, value: string) {
        this.storage.setItem(this.physicalKey(key), value);
    }
}

export const appStorage = new NamespacedStorage(() => window.localStorage);
