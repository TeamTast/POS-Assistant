const KAISETSU_PDF_SUFFIXES = ['GetKaisetsuPdf.pdf'];

export function createKaisetsuDownloadHandler() {
    return {
        label: 'Kaisetsu',
        matches: (downloadItem) => {
            const filename = downloadItem?.filename ?? '';
            return KAISETSU_PDF_SUFFIXES.some((suffix) => filename.endsWith(suffix));
        }
    };
}
