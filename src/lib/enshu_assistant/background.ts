import { sanitizeFilename } from './pdf_renamer/shared.ts';
import { createMondaiDownloadHandler } from './pdf_renamer/get_mondai/background.ts';
import { createKaisetsuDownloadHandler } from './pdf_renamer/get_kaisetsu/background.ts';
import { getCachedPdfTitle, subscribeToCachedPdfTitle } from '../../storage.ts';
import type { DestroyFn } from '../types.ts';
import type { DownloadHandler } from './types.ts';

type DownloadSuggestCallback = (suggestion?: chrome.downloads.FilenameSuggestion) => void;

interface SetPdfTitleMessage {
    readonly type: 'SET_PDF_TITLE';
    readonly title?: string | null;
}

const setSuggestion = (
    suggest: DownloadSuggestCallback,
    filename: string | null
): void => {
    if (!filename) {
        suggest();
        return;
    }

    suggest({ filename, conflictAction: 'overwrite' });
};

export const initEnshuAssistantBackground = (): DestroyFn | void => {
    console.log('Initializing Enshu Assistant background service worker');

    let lastPdfTitle: string | null = null;

    const downloadHandlers: DownloadHandler[] = [
        createMondaiDownloadHandler(),
        createKaisetsuDownloadHandler()
    ];

    const setLastPdfTitle = (rawTitle: string | null | undefined): void => {
        if (!rawTitle) {
            return;
        }

        lastPdfTitle = sanitizeFilename(rawTitle);
        console.log('PDF Title:', lastPdfTitle);
    };

    const refreshTitleFromStorage = (): void => {
        void getCachedPdfTitle().then((cachedTitle) => {
            if (cachedTitle) {
                setLastPdfTitle(cachedTitle);
            }
        });
    };

    chrome.runtime.onMessage.addListener((msg: SetPdfTitleMessage) => {
        if (msg.type === 'SET_PDF_TITLE' && msg.title) {
            setLastPdfTitle(msg.title);
        }
    });

        const unsubscribeCachedTitle = subscribeToCachedPdfTitle((nextTitle: string | null) => {
        if (nextTitle) {
            setLastPdfTitle(nextTitle);
        }
    });

    chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
        console.log('Download filename intercepted:', item.filename);

        const handler = downloadHandlers.find((candidate) => candidate.matches(item));
        if (!handler) {
            suggest();
            return;
        }

        const applyRename = (title: string | null): void => {
            const safeTitle = title ? sanitizeFilename(title) : null;
            if (safeTitle) {
                console.log(`Change ${handler.label} PDF Title:`, `${safeTitle}.pdf`);
                setSuggestion(suggest, `${safeTitle}.pdf`);
                lastPdfTitle = safeTitle;
            } else {
                suggest();
            }
        };

        if (lastPdfTitle) {
            applyRename(lastPdfTitle);
            return;
        }

        void getCachedPdfTitle().then((storedTitle) => {
            const safeStoredTitle = storedTitle ? sanitizeFilename(storedTitle) : null;
            applyRename(safeStoredTitle);
        });
    });

    refreshTitleFromStorage();

    return () => {
        unsubscribeCachedTitle?.();
    };
};
