import { getStoredDaimonCount, subscribeToDaimonCount } from '@/lib/storage.ts';
import type { DestroyFn } from '@/lib/types.ts';
import type { DaimonNavigationOptions } from '@/lib/enshu_assistant/types.ts';

const NAV_CONTAINER_CLASS = 'pos-assistant-daimon-nav' as const;
const NAV_STYLE_ID = 'pos-assistant-daimon-nav-style' as const;

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

const ensureStyleElement = (root: Document): HTMLStyleElement | null => {
    if (!root.head) {
        return null;
    }

    const existing = root.getElementById(NAV_STYLE_ID);
    if (existing instanceof HTMLStyleElement) {
        return existing;
    }

    const style = root.createElement('style');
    style.id = NAV_STYLE_ID;
    style.textContent = `
                .${NAV_CONTAINER_CLASS} {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                }
                .${NAV_CONTAINER_CLASS}[data-placement="inline"] {
                        margin: 0 16px 0 0;
                }
                .${NAV_CONTAINER_CLASS}[data-placement="stacked"] {
                        display: flex;
                        flex-wrap: wrap;
                        margin: 12px 0;
                }
                .${NAV_CONTAINER_CLASS}__button {
                        white-space: nowrap;
                        background-color: #fff;
                        background-image: none !important;
                        padding-right: 12px;
                }
        `;

    root.head.appendChild(style);
    return style;
};

interface PageParams {
    readonly url: URL | null;
    readonly enshuSetId: string;
    readonly daimonId: string;
}

const extractPageParams = (rawUrl: string): PageParams => {
    try {
        const parsed = new URL(rawUrl);
        const enshuSetId = parsed.searchParams.get('enshuSetId');
        const daimonId = parsed.searchParams.get('daimonId');
        return {
            url: parsed,
            enshuSetId: enshuSetId ? enshuSetId.trim() : '',
            daimonId: daimonId ? daimonId.trim() : ''
        };
    } catch (error) {
        console.warn('Failed to parse KekkaShosai URL:', error);
        return { url: null, enshuSetId: '', daimonId: '' };
    }
};

interface ParsedDaimonId {
    readonly prefix: string;
    readonly currentNumber: number;
}

const parseDaimonId = (daimonId: string): ParsedDaimonId | null => {
    const raw = daimonId.trim();
    if (raw.length < 2) {
        return null;
    }

    const prefix = raw.slice(0, -2);
    const suffix = raw.slice(-2);
    const number = Number.parseInt(suffix, 10);

    if (!Number.isFinite(number) || number <= 0) {
        return null;
    }

    return { prefix, currentNumber: number };
};

interface BuildNavigationButtonParams {
    readonly root: Document;
    readonly label: string;
    readonly onClick: () => void;
}

const buildNavigationButton = ({ root, label, onClick }: BuildNavigationButtonParams): HTMLButtonElement => {
    const button = root.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = `${NAV_CONTAINER_CLASS}__button button-flat button-white button-inline`;
    button.addEventListener('click', onClick);

    return button;
};

const normalizeText = (value: string | null | undefined): string => {
    if (!value) {
        return '';
    }

    return value.replace(/\s+/g, ' ').trim();
};

const isInlineButtonElement = (element: Element | null): element is Element => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }

    const tag = element.tagName ? element.tagName.toLowerCase() : '';
    if (tag === 'button') {
        return true;
    }

    if (tag === 'a') {
        const role = element.getAttribute('role');
        if (role && role.toLowerCase() === 'button') {
            return true;
        }
    }

    const classList = element.classList;
    if (!classList) {
        return false;
    }

    return (
        classList.contains('btn') ||
        classList.contains('button') ||
        classList.contains('btn-primary') ||
        classList.contains('btn-secondary') ||
        classList.contains('button-primary')
    );
};

const findExplanationHeading = (root: Document): HTMLElement | null => {
    const candidates = root.querySelectorAll<HTMLElement>('h2.page-title');
    for (const candidate of candidates) {
        const text = normalizeText(candidate.textContent);
        if (text && text.startsWith('解答解説')) {
            return candidate;
        }
    }

    return null;
};

const findPageBackContainer = (root: Document): HTMLElement | null =>
    root.querySelector('p.page-back');

interface RenderNavigationParams {
    readonly root: Document;
    readonly container: HTMLElement | null;
    readonly baseUrl: URL | null;
    readonly daimonPrefix: string;
    readonly currentNumber: number;
    readonly totalDaimon: number;
}

const renderNavigation = ({
    root,
    container,
    baseUrl,
    daimonPrefix,
    currentNumber,
    totalDaimon
}: RenderNavigationParams): void => {
    if (!container || !baseUrl || !Number.isFinite(totalDaimon) || totalDaimon <= 0) {
        if (container) {
            container.innerHTML = '';
            container.hidden = true;
            container.setAttribute('aria-hidden', 'true');
        }
        return;
    }

    const normalizedTotal = Math.floor(totalDaimon);
    container.innerHTML = '';

    const appendNavButton = (targetNumber: number, label: string): void => {
        if (targetNumber < 1 || targetNumber > normalizedTotal) {
            return;
        }

        const suffix = String(targetNumber).padStart(2, '0');
        const targetId = `${daimonPrefix}${suffix}`;
        const targetUrl = new URL(baseUrl.toString());
        targetUrl.searchParams.set('daimonId', targetId);

        const button = buildNavigationButton({
            root,
            label,
            onClick: () => {
                root.defaultView?.location?.assign(targetUrl.toString());
            }
        });

        container.appendChild(button);
    };

    if (currentNumber > 1) {
        appendNavButton(currentNumber - 1, '← 前の大問へ');
    }

    if (currentNumber < normalizedTotal) {
        appendNavButton(currentNumber + 1, '次の大問へ →');
    }

    const shouldHide = container.childElementCount === 0;
    container.hidden = shouldHide;
    container.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
};

export const initKekkaShosaiNavigation = ({ root = document, url }: DaimonNavigationOptions = {}): DestroyFn => {
    const resolvedUrl = resolveUrl(root, url);
    const { url: parsedUrl, enshuSetId, daimonId } = extractPageParams(resolvedUrl);

    if (!parsedUrl || !enshuSetId || !daimonId) {
        return () => {};
    }

    const parsedDaimon = parseDaimonId(daimonId);
    if (!parsedDaimon) {
        return () => {};
    }

    ensureStyleElement(root);

    const container = root.createElement('span');
    container.className = NAV_CONTAINER_CLASS;
    container.setAttribute('data-placement', 'inline');

    const ensureContainerPlacement = (): void => {
        const pageBack = findPageBackContainer(root);
        if (pageBack) {
            container.setAttribute('data-placement', 'inline');
            const children = Array.from(pageBack.children) as Element[];
            const firstAction = children.find(
                (child) => child !== container && typeof child.matches === 'function' && child.matches('button, a')
            );
            if (firstAction) {
                if (container.parentNode !== pageBack || container.nextSibling !== firstAction) {
                    pageBack.insertBefore(container, firstAction);
                }
            } else if (container.parentNode !== pageBack) {
                pageBack.appendChild(container);
            }
            return;
        }

        const heading = findExplanationHeading(root);

        if (!heading || !heading.parentNode) {
            container.setAttribute('data-placement', 'stacked');
            if (!container.isConnected && root.body) {
                root.body.insertBefore(container, root.body.firstChild);
            }
            return;
        }

        container.setAttribute('data-placement', 'stacked');
        const parent = heading.parentNode;
        let anchor: Element = heading;

        let probe = heading.nextElementSibling;
        while (probe && isInlineButtonElement(probe)) {
            anchor = probe;
            probe = anchor.nextElementSibling;
        }

        const previousElementSibling = container.previousElementSibling;

        if (container.parentNode !== parent || previousElementSibling !== anchor) {
            anchor.insertAdjacentElement('afterend', container);
        }
    };

    ensureContainerPlacement();

    let latestKnownCount: number | null = null;

    const updateNavigation = (totalDaimon: number | null): void => {
        if (typeof totalDaimon !== 'number' || !Number.isFinite(totalDaimon) || totalDaimon <= 0) {
            container.innerHTML = '';
            container.hidden = true;
            container.setAttribute('aria-hidden', 'true');
            return;
        }

        latestKnownCount = totalDaimon;

        ensureContainerPlacement();
        renderNavigation({
            root,
            container,
            baseUrl: parsedUrl,
            daimonPrefix: parsedDaimon.prefix,
            currentNumber: parsedDaimon.currentNumber,
            totalDaimon
        });
    };

    void getStoredDaimonCount(enshuSetId).then((initialCount) => {
        if (typeof initialCount === 'number' && Number.isFinite(initialCount) && initialCount > 0) {
            updateNavigation(initialCount);
        }
    });

        const unsubscribe = subscribeToDaimonCount(enshuSetId, (nextCount: number | null) => {
        if (typeof nextCount === 'number' && Number.isFinite(nextCount) && nextCount > 0) {
            updateNavigation(nextCount);
        }
    });

    if (root.readyState === 'loading') {
        root.addEventListener(
            'DOMContentLoaded',
            () => {
                ensureContainerPlacement();

                if (typeof latestKnownCount === 'number' && Number.isFinite(latestKnownCount) && latestKnownCount > 0) {
                    updateNavigation(latestKnownCount);
                }
            },
            { once: true }
        );
    }

    const destroy: DestroyFn = () => {
        container.remove();
        unsubscribe?.();
    };

    return destroy;
};
