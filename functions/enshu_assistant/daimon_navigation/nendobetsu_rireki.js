import { createDaimonCountRecorder } from '../../../storage.js';

const DAIMON_SELECTOR = 'td.daimon-row-no span.rireki';

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

const extractEnshuSetId = (rawUrl) => {
    try {
        const parsed = new URL(rawUrl);
        const value = parsed.searchParams.get('enshuSetId');
        return value ? value.trim() : '';
    } catch (error) {
        console.warn('Failed to parse URL for enshuSetId:', error);
        return '';
    }
};

const detectMaxDaimon = (root = document) => {
    const daimons = Array.from(root.querySelectorAll(DAIMON_SELECTOR));
    if (!daimons.length) {
        return null;
    }

    const daimonNumbers = daimons
        .map((element) => Number(element?.textContent ?? ''))
        .filter((value) => Number.isFinite(value) && value > 0);

    if (!daimonNumbers.length) {
        return null;
    }

    return Math.max(...daimonNumbers);
};

export function initNendobetsuDaimonCollector({ root = document, url } = {}) {
    const resolvedUrl = resolveUrl(root, url);
    const enshuSetId = extractEnshuSetId(resolvedUrl);

    if (!enshuSetId) {
        return () => {};
    }

    const recordDaimonCount = createDaimonCountRecorder();
    let lastLoggedCount = null;

    const handleUpdate = () => {
        const maxDaimon = detectMaxDaimon(root);
        if (!Number.isFinite(maxDaimon) || maxDaimon <= 0) {
            return;
        }

        if (lastLoggedCount !== maxDaimon) {
            console.log('大問の数:', maxDaimon);
            lastLoggedCount = maxDaimon;
        }

        recordDaimonCount({ enshuSetId, maxDaimon });
    };

    const observer = new MutationObserver(handleUpdate);
    const target = root.body ?? root;

    if (target) {
        observer.observe(target, { childList: true, subtree: true });
    }

    if (root.readyState === 'loading') {
        root.addEventListener('DOMContentLoaded', handleUpdate, { once: true });
    } else {
        handleUpdate();
    }

    return () => {
        observer.disconnect();
    };
}
