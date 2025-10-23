import { initDownloadFilenameManager } from '../shared.ts';
import type {
    DownloadFilenameManager,
    KaisetsuDownloadEnhancerOptions
} from '../../types.ts';

const KAISETSU_HREF_FRAGMENT = 'GetKaisetsuPdf';

export const initKaisetsuDownloadEnhancer = ({ root = document }: KaisetsuDownloadEnhancerOptions = {}): DownloadFilenameManager => (
    initDownloadFilenameManager({
        root,
        logPrefix: 'Set Kaisetsu PDF Title',
        linkFilter: (link) => {
            const href = link.getAttribute('href') ?? '';
            return href.includes(KAISETSU_HREF_FRAGMENT);
        }
    })
);
