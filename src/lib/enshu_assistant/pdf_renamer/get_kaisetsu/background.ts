import type { DownloadHandler } from '../../types.ts';

const KAISETSU_PDF_SUFFIXES: readonly string[] = ['GetKaisetsuPdf.pdf'];

export const createKaisetsuDownloadHandler = (): DownloadHandler => ({
    label: 'Kaisetsu',
    matches: (downloadItem: chrome.downloads.DownloadItem): boolean => {
        const filename = downloadItem?.filename ?? '';
        return KAISETSU_PDF_SUFFIXES.some((suffix) => filename.endsWith(suffix));
    }
});
