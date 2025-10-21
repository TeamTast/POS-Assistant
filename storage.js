const STORAGE_ROOT_PREFIX = 'posAssistant:';

export const hasChromeStorage = () => typeof chrome !== 'undefined' && chrome?.storage?.local;

export const createNamespacedKeyFactory = (namespace) => {
    const sanitizedNamespace = String(namespace ?? '').trim();
    if (!sanitizedNamespace) {
        return () => null;
    }

    const prefix = `${STORAGE_ROOT_PREFIX}${sanitizedNamespace}:`;

    return (key) => {
        const rawKey = String(key ?? '').trim();
        if (!rawKey) {
            return null;
        }
        return `${prefix}${rawKey}`;
    };
};

const readLocalValue = (storageKey) => new Promise((resolve) => {
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
        resolve(result?.[storageKey] ?? null);
    });
});

const writeLocalValue = (storageKey, value) => new Promise((resolve) => {
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

const subscribeLocalValue = (storageKey, handler) => {
    if (!hasChromeStorage() || !storageKey || typeof handler !== 'function') {
        return () => {};
    }

    const listener = (changes, area) => {
        if (area !== 'local' || !Object.prototype.hasOwnProperty.call(changes, storageKey)) {
            return;
        }
        handler(changes[storageKey]?.newValue ?? null);
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
        chrome.storage.onChanged.removeListener(listener);
    };
};

const daimonKeyFactory = createNamespacedKeyFactory('daimonNavigation');

export const getDaimonStorageKey = (enshuSetId) => daimonKeyFactory(enshuSetId);

export function createDaimonCountRecorder({ logPrefix = 'Store Daimon Count' } = {}) {
    let lastSetId = null;
    let lastCount = null;

    return ({ enshuSetId, maxDaimon }) => {
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

        writeLocalValue(storageKey, { maxDaimon: count }).then((result) => {
            if (!result?.ok) {
                if (result?.error) {
                    console.warn(`${logPrefix} failed:`, result.error.message);
                }
                return;
            }
            console.log(`${logPrefix}:`, enshuSetId, count);
        });
    };
}

export function getStoredDaimonCount(enshuSetId) {
    const storageKey = getDaimonStorageKey(enshuSetId);
    if (!storageKey) {
        return Promise.resolve(null);
    }

    return readLocalValue(storageKey).then((entry) => {
        const count = Number(entry?.maxDaimon);
        return Number.isFinite(count) && count > 0 ? count : null;
    });
}

export function subscribeToDaimonCount(enshuSetId, callback) {
    const storageKey = getDaimonStorageKey(enshuSetId);

    if (!storageKey || typeof callback !== 'function') {
        return () => {};
    }

    return subscribeLocalValue(storageKey, (nextValue) => {
        const count = Number(nextValue?.maxDaimon);
        callback(Number.isFinite(count) && count > 0 ? count : null);
    });
}

const pdfRenamerKeyFactory = createNamespacedKeyFactory('pdfRenamer');
const PDF_TITLE_KEY = pdfRenamerKeyFactory('lastPageTitle');

const sendPdfTitleMessage = (title) => {
    try {
        chrome.runtime?.sendMessage?.({ type: 'SET_PDF_TITLE', title });
    } catch (error) {
        console.warn('Notify PDF title failed:', error);
    }
};

export function setCachedPdfTitle(title, { logPrefix = 'Set PDF Title' } = {}) {
    const payload = typeof title === 'string' ? title : null;

    writeLocalValue(PDF_TITLE_KEY, payload).then((result) => {
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
}

export function getCachedPdfTitle() {
    return readLocalValue(PDF_TITLE_KEY).then((value) => {
        const trimmed = String(value ?? '').trim();
        return trimmed || null;
    });
}

export function subscribeToCachedPdfTitle(callback) {
    if (typeof callback !== 'function') {
        return () => {};
    }

    return subscribeLocalValue(PDF_TITLE_KEY, (nextValue) => {
        const trimmed = String(nextValue ?? '').trim();
        callback(trimmed || null);
    });
}
