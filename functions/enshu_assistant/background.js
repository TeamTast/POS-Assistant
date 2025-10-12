export function initEnshuAssistantBackground() {
    console.log('Initializing Enshu Assistant background service worker');
    let lastPdfTitle = null;

    const sanitizeFilename = (name) => name.replace(/[\\/:*?"<>|]/g, '_');

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

        const applyRename = (title) => {
            if (title) {
                console.log('Change PDF Title:', `${title}.pdf`);
                suggest({ filename: `${title}.pdf`, conflictAction: 'overwrite' });
                lastPdfTitle = null;
            } else {
                suggest();
            }
        };

        if (item.filename === 'GetMondaiPdf.pdf') {
            if (lastPdfTitle) {
                applyRename(lastPdfTitle);
            } else {
                chrome.storage.local.get('lastPageTitle', (result) => {
                    const storedTitle = result && result.lastPageTitle ? sanitizeFilename(result.lastPageTitle) : null;
                    applyRename(storedTitle);
                });
            }
        } else {
            suggest();
        }
    });

    refreshTitleFromStorage();
}
