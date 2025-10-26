import { initDownloadFilenameManager } from '@/lib/enshu_assistant/pdf_renamer/shared.ts';
import type {
    DownloadFilenameManager,
    MondaiDownloadEnhancerOptions
} from '../../types.ts';

const MONDAI_HREF_FRAGMENT = 'GetMondaiPdf';

export const initMondaiDownloadEnhancer = ({ root = document }: MondaiDownloadEnhancerOptions = {}): DownloadFilenameManager => (
    initDownloadFilenameManager({
        root,
        logPrefix: 'Set Mondai PDF Title',
        linkFilter: (link) => {
            const href = link.getAttribute('href') ?? '';
            return href.includes(MONDAI_HREF_FRAGMENT);
        }
    })
);
