import { getCachedPdfTitle, setCachedPdfTitle } from '@/lib/storage.ts';
import type { DestroyFn } from '@/lib/types.ts';
import type {
    DownloadFilenameManager,
    DownloadFilenameManagerOptions,
    TitleCacheWriter
} from '@/lib/enshu_assistant/types.ts';

export const sanitizeFilename = (name: unknown): string => {
    const raw = String(name ?? '').trim();
    if (!raw) {
        return 'Untitled';
    }

    const sanitized = raw.replace(/[\\/:*?"<>|]/g, '_');
    return sanitized || 'Untitled';
};

interface TitleCacheOptions {
    readonly logPrefix?: string;
}

export const createTitleCache = ({ logPrefix = 'Set PDF Title' }: TitleCacheOptions = {}): TitleCacheWriter => {
    let lastStoredTitle: string | null = null;

    return (rawTitle: string | null | undefined): void => {
        const safeTitle = sanitizeFilename(rawTitle);
        if (safeTitle === lastStoredTitle) {
            return;
        }

        lastStoredTitle = safeTitle;
        setCachedPdfTitle(safeTitle, { logPrefix });
    };
};

interface DownloadFilenameState {
    lastAppliedFilename: string | null;
    missingLinkWarned: boolean;
    observedContainer: Element | null;
    linkObserver: MutationObserver | null;
    globalObserver: MutationObserver | null;
}

const defaultLinkFilter = (_link: HTMLAnchorElement): boolean => true;

const schedule = (documentRoot: Document, task: () => void): void => {
    const win = documentRoot.defaultView;
    if (win?.setTimeout) {
        win.setTimeout(task, 0);
        return;
    }

    setTimeout(task, 0);
};

export const initDownloadFilenameManager = ({
    root = document,
    linkFilter = defaultLinkFilter,
    containerSelector = '#pnlPDFdownload',
    logPrefix = 'Set PDF Title'
}: DownloadFilenameManagerOptions = {}): DownloadFilenameManager => {
    const state: DownloadFilenameState = {
        lastAppliedFilename: null,
        missingLinkWarned: false,
        observedContainer: null,
        linkObserver: null,
        globalObserver: null
    };

    const findDownloadLink = (): HTMLAnchorElement | null => {
        const container = root.querySelector(containerSelector);
        if (!(container instanceof Element)) {
            return null;
        }

        const links = container.querySelectorAll<HTMLAnchorElement>('a[href]');
        for (const link of links) {
            if (linkFilter(link)) {
                return link;
            }
        }

        return null;
    };

    const applyDownloadFilename = (): void => {
        void getCachedPdfTitle().then((title) => {
            const safeTitle = `${sanitizeFilename(title)}.pdf`;
            const downloadLink = findDownloadLink();

            if (!downloadLink) {
                if (!state.missingLinkWarned) {
                    console.warn('PDF download link not found');
                    state.missingLinkWarned = true;
                }
                return;
            }

            state.missingLinkWarned = false;

            if (downloadLink.dataset.posAssistantEnsureDownload !== 'true') {
                downloadLink.dataset.posAssistantEnsureDownload = 'true';
                downloadLink.addEventListener(
                    'click',
                    () => {
                        schedule(root, applyDownloadFilename);
                    },
                    { capture: true }
                );
            }

            if (downloadLink.getAttribute('download') === safeTitle) {
                state.lastAppliedFilename = safeTitle;
                return;
            }

            downloadLink.setAttribute('download', safeTitle);
            if (state.lastAppliedFilename !== safeTitle) {
                console.log(`${logPrefix}:`, safeTitle);
                state.lastAppliedFilename = safeTitle;
            }
        });
    };

    const observeDownloadContainer = (): void => {
        const container = root.querySelector(containerSelector);
        if (!(container instanceof Element) || container === state.observedContainer) {
            return;
        }

        state.observedContainer = container;
        state.linkObserver?.disconnect();

        state.linkObserver = new MutationObserver(() => {
            applyDownloadFilename();
        });

        state.linkObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'download']
        });
    };

    const startGlobalObserver = (): void => {
        if (state.globalObserver) {
            return;
        }

        const target = root.body ?? root;
        if (!target) {
            return;
        }

        state.globalObserver = new MutationObserver(() => {
            observeDownloadContainer();
            applyDownloadFilename();
        });

        state.globalObserver.observe(target, { childList: true, subtree: true });
    };

    const initialize = (): void => {
        observeDownloadContainer();
        startGlobalObserver();
        applyDownloadFilename();
    };

    if (root.readyState === 'loading') {
        root.addEventListener('DOMContentLoaded', initialize as EventListener, { once: true });
    } else {
        initialize();
    }

    const destroy: DestroyFn = () => {
        state.linkObserver?.disconnect();
        state.globalObserver?.disconnect();
        state.linkObserver = null;
        state.globalObserver = null;
        state.observedContainer = null;
    };

    return {
        refresh: applyDownloadFilename,
        destroy
    };
};
