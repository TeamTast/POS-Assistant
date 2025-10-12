export function initEnshuAssistantPrint({ root = document } = {}) {
    const sanitizeFilename = (name) => name.replace(/[\/:*?"<>|]/g, '_');

    const applyDownloadFilename = () => {
        chrome.storage.local.get('lastPageTitle', (result) => {
            const title = result.lastPageTitle || 'Untitled';
            const safeTitle = `${sanitizeFilename(title)}.pdf`;

            const downloadLink = root.querySelector('#pnlPDFdownload a[href*="GetMondaiPdf"]');
            if (!downloadLink) {
                console.warn('PDF Title not found');
                return;
            }

            downloadLink.setAttribute('download', safeTitle);
            console.log('Set PDF Title:', safeTitle);
        });
    };

    if (root.readyState && root.readyState === 'loading') {
        root.addEventListener('DOMContentLoaded', applyDownloadFilename, { once: true });
    } else {
        applyDownloadFilename();
    }

    return {
        refresh: applyDownloadFilename
    };
}
