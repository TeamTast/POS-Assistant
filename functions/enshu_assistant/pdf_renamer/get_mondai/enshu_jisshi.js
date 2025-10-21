import { createTitleCache } from '../shared.js';

const DEFAULT_BUTTON_SELECTOR = '[data-url*="MondaiKaitoInsatsu"]';
const DEFAULT_TITLE_SELECTORS = ['.page-head-title', '.enshu-set-nm', 'h2.page-title'];

export function initMondaiTitleObserver({
    root = document,
    buttonSelector = DEFAULT_BUTTON_SELECTOR,
    titleSelectors = DEFAULT_TITLE_SELECTORS
} = {}) {
    const cacheTitle = createTitleCache();

    const extractTitleText = () => {
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

    const updateTitleFromDom = () => {
        const titleText = extractTitleText();
        if (titleText) {
            cacheTitle(titleText);
        }
    };

    const handleClick = () => {
        updateTitleFromDom();
    };

    const attachPrintHandler = (button) => {
        if (!button || button.dataset.posAssistantBound === 'true') {
            return;
        }
        button.dataset.posAssistantBound = 'true';
        button.addEventListener('click', handleClick, { capture: true });
        console.log('Set Listener on Print Button');
    };

    const tryAttachButton = () => {
        const button = root.querySelector(buttonSelector);
        if (button) {
            attachPrintHandler(button);
        }
    };

    updateTitleFromDom();
    tryAttachButton();

    const observer = new MutationObserver(() => {
        tryAttachButton();
        updateTitleFromDom();
    });
    observer.observe(root.body ?? root, { childList: true, subtree: true, characterData: true });

    return () => {
        observer.disconnect();
    };
}
