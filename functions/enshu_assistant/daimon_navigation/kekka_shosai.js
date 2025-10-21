import { getStoredDaimonCount, subscribeToDaimonCount } from '../../../storage.js';

const NAV_CONTAINER_CLASS = 'pos-assistant-daimon-nav';
const NAV_STYLE_ID = 'pos-assistant-daimon-nav-style';

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

const ensureStyleElement = (root) => {
    if (!root?.head) {
        return null;
    }

    if (root.getElementById(NAV_STYLE_ID)) {
        return root.getElementById(NAV_STYLE_ID);
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

const extractPageParams = (rawUrl) => {
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

const parseDaimonId = (daimonId) => {
    const raw = String(daimonId ?? '').trim();
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

const buildNavigationButton = ({ root, label, onClick }) => {
    const button = root.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = `${NAV_CONTAINER_CLASS}__button button-flat button-white button-inline`;
    button.addEventListener('click', onClick);

    return button;
};

const normalizeText = (value) => {
    if (!value) {
        return '';
    }

    return value.replace(/\s+/g, ' ').trim();
};

const isInlineButtonElement = (element) => {
    if (!element || element.nodeType !== 1) {
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

    return classList.contains('btn') ||
        classList.contains('button') ||
        classList.contains('btn-primary') ||
        classList.contains('btn-secondary') ||
        classList.contains('button-primary');
};

const findExplanationHeading = (root) => {
    const candidates = root.querySelectorAll('h2.page-title');
    for (const candidate of candidates) {
        const text = normalizeText(candidate.textContent);
        if (text && text.startsWith('解答解説')) {
            return candidate;
        }
    }

    return null;
};

const findPageBackContainer = (root) => root.querySelector('p.page-back');

const renderNavigation = ({
    root,
    container,
    baseUrl,
    daimonPrefix,
    currentNumber,
    totalDaimon
}) => {
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

    const appendNavButton = (targetNumber, label) => {
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

export function initKekkaShosaiNavigation({ root = document, url } = {}) {
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

    const ensureContainerPlacement = () => {
        const pageBack = findPageBackContainer(root);
        if (pageBack) {
            container.setAttribute('data-placement', 'inline');
            const firstAction = Array.from(pageBack.children).find((child) => (
                child !== container &&
                typeof child.matches === 'function' &&
                child.matches('button, a')
            ));
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
        let anchor = heading;

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

    let latestKnownCount = null;

    const updateNavigation = (totalDaimon) => {
        if (!Number.isFinite(totalDaimon) || totalDaimon <= 0) {
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

    getStoredDaimonCount(enshuSetId).then((initialCount) => {
        if (Number.isFinite(initialCount) && initialCount > 0) {
            updateNavigation(initialCount);
        }
    });

    const unsubscribe = subscribeToDaimonCount(enshuSetId, (nextCount) => {
        if (Number.isFinite(nextCount) && nextCount > 0) {
            updateNavigation(nextCount);
        }
    });

    if (root.readyState === 'loading') {
        root.addEventListener('DOMContentLoaded', () => {
            ensureContainerPlacement();

            if (Number.isFinite(latestKnownCount) && latestKnownCount > 0) {
                updateNavigation(latestKnownCount);
            }
        }, { once: true });
    }

    return () => {
        container.remove();

        unsubscribe?.();
    };
}
