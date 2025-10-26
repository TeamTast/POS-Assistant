import { createTitleCache } from '@/lib/enshu_assistant/pdf_renamer/shared.ts';
import type { DestroyFn } from '@/lib/types.ts';
import type { MondaiTitleObserverOptions } from '@/lib/enshu_assistant/types.ts';

const DEFAULT_BUTTON_SELECTOR = '[data-url*="MondaiKaitoInsatsu"]' as const;
const DEFAULT_TITLE_SELECTORS = ['.page-head-title', '.enshu-set-nm', 'h2.page-title'] as const;

export const initMondaiTitleObserver = ({
    root = document,
    buttonSelector = DEFAULT_BUTTON_SELECTOR,
    titleSelectors = DEFAULT_TITLE_SELECTORS
}: MondaiTitleObserverOptions = {}): DestroyFn => {
    const cacheTitle = createTitleCache();

    const extractTitleText = (): string | null => {
        for (const selector of titleSelectors) {
            const elem = root.querySelector(selector);
            if (!elem) {
                continue;
            }

            const text = elem.textContent?.trim();
            if (text) {
                return text;
            }
        }

        return null;
    };

    const updateTitleFromDom = (): void => {
        const titleText = extractTitleText();
        if (titleText) {
            cacheTitle(titleText);
        }
    };

    const handleClick = (): void => {
        updateTitleFromDom();
    };

    const attachPrintHandler = (button: Element | null): void => {
        if (!(button instanceof HTMLElement) || button.dataset.posAssistantBound === 'true') {
            return;
        }

        button.dataset.posAssistantBound = 'true';
        button.addEventListener('click', handleClick, { capture: true });
        console.log('Set Listener on Print Button');
    };

    const tryAttachButton = (): void => {
        const button = root.querySelector(buttonSelector);
        attachPrintHandler(button);
    };

    updateTitleFromDom();
    tryAttachButton();

    const observer = new MutationObserver(() => {
        tryAttachButton();
        updateTitleFromDom();
    });

    observer.observe(root.body ?? root, { childList: true, subtree: true, characterData: true });

    const destroy: DestroyFn = () => {
        observer.disconnect();
    };

    return destroy;
};
