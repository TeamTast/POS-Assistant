import { initDownloadFilenameManager } from '../shared.js';

const MONDAI_HREF_FRAGMENT = 'GetMondaiPdf';

export function initMondaiDownloadEnhancer({ root = document } = {}) {
    return initDownloadFilenameManager({
        root,
        logPrefix: 'Set Mondai PDF Title',
        linkFilter: (link) => {
            const href = link.getAttribute('href') ?? '';
            return href.includes(MONDAI_HREF_FRAGMENT);
        }
    });
}
