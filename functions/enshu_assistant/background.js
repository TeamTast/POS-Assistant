import { sanitizeFilename } from './pdf_renamer/shared.js';
import { createMondaiDownloadHandler } from './pdf_renamer/get_mondai/background.js';
import { createKaisetsuDownloadHandler } from './pdf_renamer/get_kaisetsu/background.js';
import { getCachedPdfTitle, subscribeToCachedPdfTitle } from '../../storage.js';

export function initEnshuAssistantBackground() {
    console.log('Initializing Enshu Assistant background service worker');
    let lastPdfTitle = null;

    const downloadHandlers = [
        createMondaiDownloadHandler(),
        createKaisetsuDownloadHandler()
    ];

    const setLastPdfTitle = (rawTitle) => {
        if (!rawTitle) {
            return;
        }
        lastPdfTitle = sanitizeFilename(rawTitle);
        console.log('PDF Title:', lastPdfTitle);
    };

    const refreshTitleFromStorage = () => {
        getCachedPdfTitle().then((cachedTitle) => {
            if (cachedTitle) {
                setLastPdfTitle(cachedTitle);
            }
        });
    };

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'SET_PDF_TITLE' && msg.title) {
            setLastPdfTitle(msg.title);
        }
    });

    const unsubscribeCachedTitle = subscribeToCachedPdfTitle((nextTitle) => {
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

        const applyRename = (title) => {
            const safeTitle = title ? sanitizeFilename(title) : null;
            if (safeTitle) {
                console.log(`Change ${handler.label} PDF Title:`, `${safeTitle}.pdf`);
                suggest({ filename: `${safeTitle}.pdf`, conflictAction: 'overwrite' });
                lastPdfTitle = safeTitle;
            } else {
                suggest();
            }
        };

        if (lastPdfTitle) {
            applyRename(lastPdfTitle);
            return;
        }

        getCachedPdfTitle().then((storedTitle) => {
            const safeStoredTitle = storedTitle ? sanitizeFilename(storedTitle) : null;
            applyRename(safeStoredTitle);
        });
    });

    refreshTitleFromStorage();

    return () => {
        unsubscribeCachedTitle?.();
    };
}
