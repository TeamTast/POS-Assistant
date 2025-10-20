const MONDAI_PRINT_PATTERN = /MondaiKaitoInsatsu/i;
const KAISETSU_PAGE_PATTERN = /OPCTTS_Student\/KekkaShou?sai/i;
const ENSHU_JISSHI_PATTERN = /OPCTTS_Student\/EnshuJisshi/i;

const resolveUrl = (root, explicitUrl) => {
    if (explicitUrl) {
        return explicitUrl;
    }

    const fromRoot = root?.defaultView?.location?.href;
    if (fromRoot) {
        return fromRoot;
    }

    if (typeof location !== 'undefined' && location.href) {
        return location.href;
    }

    return '';
};

export async function initEnshuAssistantContent({ root = document, url } = {}) {
    const currentUrl = resolveUrl(root, url);

    if (KAISETSU_PAGE_PATTERN.test(currentUrl)) {
        const [{ initKaisetsuTitleObserver }, { initKaisetsuDownloadEnhancer }] = await Promise.all([
            import('./pdf_renamer/get_kaisetsu/page.js'),
            import('./pdf_renamer/get_kaisetsu/download.js')
        ]);

        const destroyTitleObserver = initKaisetsuTitleObserver({ root });
        const downloadManager = initKaisetsuDownloadEnhancer({ root });

        return () => {
            destroyTitleObserver?.();
            downloadManager?.destroy?.();
        };
    }

    if (MONDAI_PRINT_PATTERN.test(currentUrl)) {
        const { initMondaiDownloadEnhancer } = await import('./pdf_renamer/get_mondai/print.js');
        const downloadManager = initMondaiDownloadEnhancer({ root });

        return () => {
            downloadManager?.destroy?.();
        };
    }

    if (ENSHU_JISSHI_PATTERN.test(currentUrl)) {
        const [
            { initMarksheetDeletion },
            { initMondaiTitleObserver }
        ] = await Promise.all([
            import('./marksheet_deletion/index.js'),
            import('./pdf_renamer/get_mondai/parent.js')
        ]);

        const destroyTitleObserver = initMondaiTitleObserver({ root });
        const destroyMarksheetDeletion = initMarksheetDeletion({ root });

        return () => {
            destroyMarksheetDeletion?.();
            destroyTitleObserver?.();
        };
    }

    const { initMondaiTitleObserver } = await import('./pdf_renamer/get_mondai/parent.js');
    return initMondaiTitleObserver({ root });
}
