import { initDownloadFilenameManager } from '../shared.js';

const KAISETSU_HREF_FRAGMENT = 'GetKaisetsuPdf';

export function initKaisetsuDownloadEnhancer({ root = document } = {}) {
    return initDownloadFilenameManager({
        root,
        logPrefix: 'Set Kaisetsu PDF Title',
        linkFilter: (link) => {
            const href = link.getAttribute('href') ?? '';
            return href.includes(KAISETSU_HREF_FRAGMENT);
        }
    });
}
