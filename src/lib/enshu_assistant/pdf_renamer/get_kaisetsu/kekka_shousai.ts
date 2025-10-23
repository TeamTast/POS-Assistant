import { createTitleCache } from '../shared.ts';
import type { DestroyFn } from '../../../types.ts';
import type { KaisetsuTitleObserverOptions } from '../../types.ts';

const DEFAULT_TITLE_SELECTORS = ['.page-head-sub'] as const;

export const initKaisetsuTitleObserver = ({
    root = document,
    titleSelectors = DEFAULT_TITLE_SELECTORS
}: KaisetsuTitleObserverOptions = {}): DestroyFn => {
    const cacheTitle = createTitleCache({ logPrefix: 'Set Kaisetsu PDF Title' });

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

    updateTitleFromDom();

    const observerTarget = root.body ?? root;
    if (!observerTarget) {
        return () => {};
    }

    const observer = new MutationObserver(() => {
        updateTitleFromDom();
    });

    observer.observe(observerTarget, { childList: true, subtree: true, characterData: true, attributes: true });

    const destroy: DestroyFn = () => {
        observer.disconnect();
    };

    return destroy;
};
