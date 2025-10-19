import { sanitizeFilename } from './pdf_renamer/shared.js';
import { createMondaiDownloadHandler } from './pdf_renamer/get_mondai/background.js';
import { createKaisetsuDownloadHandler } from './pdf_renamer/get_kaisetsu/background.js';

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
        chrome.storage.local.get('lastPageTitle', (result) => {
            if (chrome.runtime.lastError) {
                console.warn('Error:', chrome.runtime.lastError.message);
                return;
            }
            if (result && result.lastPageTitle) {
                setLastPdfTitle(result.lastPageTitle);
            }
        });
    };

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'SET_PDF_TITLE' && msg.title) {
            setLastPdfTitle(msg.title);
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.lastPageTitle) {
            setLastPdfTitle(changes.lastPageTitle.newValue);
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

        chrome.storage.local.get('lastPageTitle', (result) => {
            const storedTitle = result && result.lastPageTitle ? sanitizeFilename(result.lastPageTitle) : null;
            applyRename(storedTitle);
        });
    });

    refreshTitleFromStorage();
}
