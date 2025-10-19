const MONDAI_PDF_SUFFIXES = ['GetMondaiPdf.pdf'];

export function createMondaiDownloadHandler() {
    return {
        label: 'Mondai',
        matches: (downloadItem) => {
            const filename = downloadItem?.filename ?? '';
            return MONDAI_PDF_SUFFIXES.some((suffix) => filename.endsWith(suffix));
        }
    };
}
