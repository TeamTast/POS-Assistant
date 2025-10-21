import { createTitleCache } from '../shared.js';

const DEFAULT_TITLE_SELECTORS = ['.page-head-sub'];

export function initKaisetsuTitleObserver({
    root = document,
    titleSelectors = DEFAULT_TITLE_SELECTORS
} = {}) {
    const cacheTitle = createTitleCache({ logPrefix: 'Set Kaisetsu PDF Title' });

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

    updateTitleFromDom();

    const observerTarget = root.body ?? root;
    if (!observerTarget) {
        return () => {};
    }

    const observer = new MutationObserver(() => {
        updateTitleFromDom();
    });

    observer.observe(observerTarget, { childList: true, subtree: true, characterData: true, attributes: true });

    return () => {
        observer.disconnect();
    };
}
