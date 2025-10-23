import type { DownloadHandler } from '../../types.ts';

const MONDAI_PDF_SUFFIXES: readonly string[] = ['GetMondaiPdf.pdf'];

export const createMondaiDownloadHandler = (): DownloadHandler => ({
    label: 'Mondai',
    matches: (downloadItem: chrome.downloads.DownloadItem): boolean => {
        const filename = downloadItem?.filename ?? '';
        return MONDAI_PDF_SUFFIXES.some((suffix) => filename.endsWith(suffix));
    }
});
