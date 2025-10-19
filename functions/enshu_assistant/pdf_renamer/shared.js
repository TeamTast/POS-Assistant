export const sanitizeFilename = (name) => {
    const raw = String(name ?? '').trim();
    if (!raw) {
        return 'Untitled';
    }
    const sanitized = raw.replace(/[\\/:*?"<>|]/g, '_');
    return sanitized || 'Untitled';
};

export function createTitleCache({ logPrefix = 'Set PDF Title' } = {}) {
    let lastStoredTitle = null;

    return (rawTitle) => {
        const safeTitle = sanitizeFilename(rawTitle);
        if (safeTitle === lastStoredTitle) {
            return;
        }
        lastStoredTitle = safeTitle;

        chrome.storage.local.set({ lastPageTitle: safeTitle }, () => {
            console.log(`${logPrefix}:`, safeTitle);
        });

        chrome.runtime.sendMessage({ type: 'SET_PDF_TITLE', title: safeTitle });
    };
}

export function initDownloadFilenameManager({
    root = document,
    linkFilter = () => true,
    containerSelector = '#pnlPDFdownload',
    logPrefix = 'Set PDF Title'
} = {}) {
    const state = {
        lastAppliedFilename: null,
        missingLinkWarned: false,
        observedContainer: null,
        linkObserver: null,
        globalObserver: null
    };

    const findDownloadLink = () => {
        const container = root.querySelector(containerSelector);
        if (!container) {
            return null;
        }

        const links = container.querySelectorAll('a[href]');
        for (const link of links) {
            if (linkFilter(link)) {
                return link;
            }
        }

        return null;
    };

    const applyDownloadFilename = () => {
        chrome.storage.local.get('lastPageTitle', (result) => {
            const title = result?.lastPageTitle ?? 'Untitled';
            const safeTitle = `${sanitizeFilename(title)}.pdf`;
            const downloadLink = findDownloadLink();

            if (!downloadLink) {
                if (!state.missingLinkWarned) {
                    console.warn('PDF download link not found');
                    state.missingLinkWarned = true;
                }
                return;
            }

            state.missingLinkWarned = false;

            if (downloadLink.dataset.posAssistantEnsureDownload !== 'true') {
                downloadLink.dataset.posAssistantEnsureDownload = 'true';
                downloadLink.addEventListener('click', () => {
                    setTimeout(applyDownloadFilename, 0);
                }, { capture: true });
            }

            if (downloadLink.getAttribute('download') === safeTitle) {
                state.lastAppliedFilename = safeTitle;
                return;
            }

            downloadLink.setAttribute('download', safeTitle);
            if (state.lastAppliedFilename !== safeTitle) {
                console.log(`${logPrefix}:`, safeTitle);
                state.lastAppliedFilename = safeTitle;
            }
        });
    };

    const observeDownloadContainer = () => {
        const container = root.querySelector(containerSelector);
        if (!container || container === state.observedContainer) {
            return;
        }

        state.observedContainer = container;
        state.linkObserver?.disconnect();

        state.linkObserver = new MutationObserver(() => {
            applyDownloadFilename();
        });

        state.linkObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'download']
        });
    };

    const startGlobalObserver = () => {
        if (state.globalObserver) {
            return;
        }

        const target = root.body ?? root;
        if (!target) {
            return;
        }

        state.globalObserver = new MutationObserver(() => {
            observeDownloadContainer();
            applyDownloadFilename();
        });

        state.globalObserver.observe(target, { childList: true, subtree: true });
    };

    const initialize = () => {
        observeDownloadContainer();
        startGlobalObserver();
        applyDownloadFilename();
    };

    if (root.readyState && root.readyState === 'loading') {
        root.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }

    return {
        refresh: applyDownloadFilename,
        destroy: () => {
            state.linkObserver?.disconnect();
            state.globalObserver?.disconnect();
        }
    };
}
