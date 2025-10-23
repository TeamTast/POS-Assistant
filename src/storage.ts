import type { DestroyFn } from './lib/types.ts';
import type { DaimonCountRecord, DaimonCountRecorder } from './lib/enshu_assistant/types.ts';

const STORAGE_ROOT_PREFIX = 'posAssistant:' as const;

export const hasChromeStorage = (): boolean => typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);

export type NamespacedKeyFactory = (key: string | number | null | undefined) => string | null;

export const createNamespacedKeyFactory = (namespace: string | number | null | undefined): NamespacedKeyFactory => {
    const sanitizedNamespace = String(namespace ?? '').trim();
    if (!sanitizedNamespace) {
        return () => null;
    }

    const prefix = `${STORAGE_ROOT_PREFIX}${sanitizedNamespace}:`;

    return (key: string | number | null | undefined) => {
        const rawKey = String(key ?? '').trim();
        if (!rawKey) {
            return null;
        }
        return `${prefix}${rawKey}`;
    };
};

const readLocalValue = <TValue>(storageKey: string | null): Promise<TValue | null> =>
    new Promise((resolve) => {
        if (!hasChromeStorage() || !storageKey) {
            resolve(null);
            return;
        }

        chrome.storage.local.get(storageKey, (result) => {
            if (chrome.runtime?.lastError) {
                console.warn(`Read storage failed (${storageKey}):`, chrome.runtime.lastError.message);
                resolve(null);
                return;
            }
            resolve((result?.[storageKey] ?? null) as TValue | null);
        });
    });

interface WriteLocalValueResult {
    readonly ok: boolean;
    readonly error?: chrome.runtime.LastError | null;
}

const writeLocalValue = <TValue>(storageKey: string | null, value: TValue): Promise<WriteLocalValueResult> =>
    new Promise((resolve) => {
        if (!hasChromeStorage() || !storageKey) {
            resolve({ ok: false, error: null });
            return;
        }

        chrome.storage.local.set({ [storageKey]: value }, () => {
            if (chrome.runtime?.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError });
                return;
            }
            resolve({ ok: true });
        });
    });

const subscribeLocalValue = <TValue>(storageKey: string | null, handler: (value: TValue | null) => void): DestroyFn => {
    if (!hasChromeStorage() || !storageKey) {
        return () => {};
    }

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
        if (area !== 'local' || !Object.prototype.hasOwnProperty.call(changes, storageKey)) {
            return;
        }
        handler((changes[storageKey]?.newValue ?? null) as TValue | null);
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
        chrome.storage.onChanged.removeListener(listener);
    };
};

const daimonKeyFactory = createNamespacedKeyFactory('daimonNavigation');

export const getDaimonStorageKey = (enshuSetId: string | null | undefined): string | null => daimonKeyFactory(enshuSetId);

interface CreateDaimonCountRecorderOptions {
    readonly logPrefix?: string;
}

export const createDaimonCountRecorder = ({ logPrefix = 'Store Daimon Count' }: CreateDaimonCountRecorderOptions = {}): DaimonCountRecorder => {
    let lastSetId: string | null = null;
    let lastCount: number | null = null;

    return ({ enshuSetId, maxDaimon }: DaimonCountRecord): void => {
        const count = Number(maxDaimon);
        const storageKey = getDaimonStorageKey(enshuSetId);

        if (!storageKey || Number.isNaN(count) || count <= 0) {
            return;
        }

        if (lastSetId === storageKey && lastCount === count) {
            return;
        }

        lastSetId = storageKey;
        lastCount = count;

        void writeLocalValue(storageKey, { maxDaimon: count }).then((result) => {
            if (!result?.ok) {
                if (result?.error) {
                    console.warn(`${logPrefix} failed:`, result.error.message);
                }
                return;
            }
            console.log(`${logPrefix}:`, enshuSetId, count);
        });
    };
};

export const getStoredDaimonCount = (enshuSetId: string | null | undefined): Promise<number | null> => {
    const storageKey = getDaimonStorageKey(enshuSetId);
    if (!storageKey) {
        return Promise.resolve(null);
    }

    return readLocalValue<{ maxDaimon?: number }>(storageKey).then((entry) => {
        const count = Number(entry?.maxDaimon);
        return Number.isFinite(count) && count > 0 ? count : null;
    });
};

export const subscribeToDaimonCount = (
    enshuSetId: string | null | undefined,
    callback: (nextCount: number | null) => void
): DestroyFn => {
    const storageKey = getDaimonStorageKey(enshuSetId);

    if (!storageKey) {
        return () => {};
    }

    return subscribeLocalValue<{ maxDaimon?: number }>(storageKey, (nextValue) => {
        const count = Number(nextValue?.maxDaimon);
        callback(Number.isFinite(count) && count > 0 ? count : null);
    });
};

const pdfRenamerKeyFactory = createNamespacedKeyFactory('pdfRenamer');
const PDF_TITLE_KEY = pdfRenamerKeyFactory('lastPageTitle');

interface PdfTitleMessage {
    readonly type: 'SET_PDF_TITLE';
    readonly title: string | null;
}

const sendPdfTitleMessage = (title: string | null): void => {
    try {
        const message: PdfTitleMessage = { type: 'SET_PDF_TITLE', title };
        chrome.runtime?.sendMessage?.(message);
    } catch (error) {
        console.warn('Notify PDF title failed:', error);
    }
};

interface SetCachedPdfTitleOptions {
    readonly logPrefix?: string;
}

export const setCachedPdfTitle = (title: string | null | undefined, { logPrefix = 'Set PDF Title' }: SetCachedPdfTitleOptions = {}): void => {
    const payload = typeof title === 'string' ? title : null;

    void writeLocalValue(PDF_TITLE_KEY, payload).then((result) => {
        if (!result?.ok) {
            if (result?.error) {
                console.warn(`${logPrefix} failed:`, result.error.message);
            }
            return;
        }
        if (payload) {
            console.log(`${logPrefix}:`, payload);
        }
    });

    sendPdfTitleMessage(payload);
};

export const getCachedPdfTitle = (): Promise<string | null> => (
    readLocalValue<string | null>(PDF_TITLE_KEY).then((value) => {
        const trimmed = String(value ?? '').trim();
        return trimmed || null;
    })
);

export const subscribeToCachedPdfTitle = (callback: (title: string | null) => void): DestroyFn =>
    subscribeLocalValue<string | null>(PDF_TITLE_KEY, (nextValue) => {
        const trimmed = String(nextValue ?? '').trim();
        callback(trimmed || null);
    });
