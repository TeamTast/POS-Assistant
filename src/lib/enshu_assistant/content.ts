import type { DestroyFn } from '../types.ts';
import type { EnshuAssistantContentInitializer } from './types.ts';

const MONDAI_PRINT_PATTERN = /MondaiKaitoInsatsu/i;
const KAISETSU_PAGE_PATTERN = /OPCTTS_Student\/KekkaShou?sai/i;
const NENDOBETSU_RIREKI_PATTERN = /OPCTTS_Student\/NendobetsuRireki/i;
const ENSHU_JISSHI_PATTERN = /OPCTTS_Student\/EnshuJisshi/i;

const resolveUrl = (root: Document, explicitUrl: string | null | undefined): string => {
    if (explicitUrl) {
        return explicitUrl;
    }

    const fromRoot = root.defaultView?.location?.href;
    if (fromRoot) {
        return fromRoot;
    }

    if (typeof location !== 'undefined' && location.href) {
        return location.href;
    }

    return '';
};

const noop: DestroyFn = () => {};

export const initEnshuAssistantContent: EnshuAssistantContentInitializer = async ({ root = document, url } = {}) => {
    const currentUrl = resolveUrl(root, url);

    if (NENDOBETSU_RIREKI_PATTERN.test(currentUrl)) {
        const { initNendobetsuDaimonCollector } = await import('./daimon_navigation/nendobetsu_rireki.ts');
        return initNendobetsuDaimonCollector({ root, url: currentUrl });
    }

    if (KAISETSU_PAGE_PATTERN.test(currentUrl)) {
        const [
            { initKaisetsuTitleObserver },
            { initKaisetsuDownloadEnhancer },
            { initKekkaShosaiNavigation }
        ] = await Promise.all([
            import('./pdf_renamer/get_kaisetsu/kekka_shousai.ts'),
            import('./pdf_renamer/get_kaisetsu/download.ts'),
            import('./daimon_navigation/kekka_shosai.ts')
        ]);

        const destroyTitleObserver = initKaisetsuTitleObserver({ root });
        const downloadManager = initKaisetsuDownloadEnhancer({ root });
        const destroyDaimonNavigation = initKekkaShosaiNavigation({ root, url: currentUrl });

        return () => {
            destroyTitleObserver?.();
            downloadManager?.destroy?.();
            destroyDaimonNavigation?.();
        };
    }

    if (MONDAI_PRINT_PATTERN.test(currentUrl)) {
        const { initMondaiDownloadEnhancer } = await import('./pdf_renamer/get_mondai/mondai_kaito_insatsu.ts');
        const downloadManager = initMondaiDownloadEnhancer({ root });

        return () => {
            downloadManager?.destroy?.();
        };
    }

    if (ENSHU_JISSHI_PATTERN.test(currentUrl)) {
        const [{ initMarksheetDeletion }, { initMondaiTitleObserver }] = await Promise.all([
            import('./marksheet_enhancer/enshu_jisshi.ts'),
            import('./pdf_renamer/get_mondai/enshu_jisshi.ts')
        ]);

        const destroyTitleObserver = initMondaiTitleObserver({ root });
        const destroyMarksheetDeletion = initMarksheetDeletion({ root });

        return () => {
            destroyMarksheetDeletion?.();
            destroyTitleObserver?.();
        };
    }

    const { initMondaiTitleObserver } = await import('./pdf_renamer/get_mondai/enshu_jisshi.ts');
    return initMondaiTitleObserver({ root }) ?? noop;
};
