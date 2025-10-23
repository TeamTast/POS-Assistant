import { createDaimonCountRecorder } from '../../../storage.ts';
import type { DestroyFn } from '../../types.ts';
import type { DaimonNavigationOptions } from '../types.ts';

const DAIMON_SELECTOR = 'td.daimon-row-no span.rireki' as const;

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

const extractEnshuSetId = (rawUrl: string): string => {
    try {
        const parsed = new URL(rawUrl);
        const value = parsed.searchParams.get('enshuSetId');
        return value ? value.trim() : '';
    } catch (error) {
        console.warn('Failed to parse URL for enshuSetId:', error);
        return '';
    }
};

const detectMaxDaimon = (root: Document = document): number | null => {
    const daimons = Array.from(root.querySelectorAll<HTMLElement>(DAIMON_SELECTOR));
    if (daimons.length === 0) {
        return null;
    }

    const daimonNumbers = daimons
        .map((element) => Number(element?.textContent ?? ''))
        .filter((value): value is number => Number.isFinite(value) && value > 0);

    if (daimonNumbers.length === 0) {
        return null;
    }

    return Math.max(...daimonNumbers);
};

export const initNendobetsuDaimonCollector = ({ root = document, url }: DaimonNavigationOptions = {}): DestroyFn => {
    const resolvedUrl = resolveUrl(root, url);
    const enshuSetId = extractEnshuSetId(resolvedUrl);

    if (!enshuSetId) {
        return () => {};
    }

    const recordDaimonCount = createDaimonCountRecorder();
    let lastLoggedCount: number | null = null;

        const handleUpdate = (): void => {
            const maxDaimon = detectMaxDaimon(root);
            if (typeof maxDaimon !== 'number' || !Number.isFinite(maxDaimon) || maxDaimon <= 0) {
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

    const destroy: DestroyFn = () => {
        observer.disconnect();
    };

    return destroy;
};
