import { STUDENT_MENU_URL } from '../session_manager/constants.js';

const INIT_FLAG = '__posAssistantPosApplicationInitialized';
const STYLE_ELEMENT_ID = 'pos-assistant-posapplication-style';
const APP_FRAME_ID = 'appFrame';

function injectBaseStyle({ document }) {
    if (!document || document.getElementById(STYLE_ELEMENT_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = `
        html, body {
            height: 100%;
            max-height: 100vh;
            margin: 0;
            overflow: hidden;
        }

        body {
            height: 100vh;
        }

        #frame {
            overflow: hidden;
        }

        #appFrame {
            width: 100%;
            border: 0;
        }
    `;
    const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    head.appendChild(style);
}

function calculateFrameHeight({ root, frameElement, appFrameElement, footerElement }) {
    const viewportHeight = root.innerHeight;
    const topOffsetTarget = frameElement || appFrameElement;
    if (!topOffsetTarget) {
        return viewportHeight;
    }
    const topOffset = topOffsetTarget.getBoundingClientRect().top;
    const footerHeight = footerElement ? footerElement.getBoundingClientRect().height : 0;
    return Math.max(Math.round(viewportHeight - topOffset - footerHeight), 0);
}

function applyHeight({ element, heightPx, isIframe }) {
    if (!element) {
        return;
    }
    const value = `${heightPx}px`;
    if (element.dataset.posAssistantHeight === value) {
        return;
    }
    element.dataset.posAssistantHeight = value;
    element.style.setProperty('height', value, 'important');
    element.style.setProperty('max-height', value, 'important');
    if (isIframe) {
        element.style.setProperty('min-height', value, 'important');
        element.style.setProperty('width', '100%', 'important');
        element.style.setProperty('overflow', 'auto', 'important');
        element.setAttribute('scrolling', 'auto');
    }
}

function normalizeUrl(url) {
    if (!url) {
        return '';
    }
    try {
        const parsed = new URL(url, STUDENT_MENU_URL);
        parsed.hash = '';
        return parsed.toString().toLowerCase();
    } catch (error) {
        return String(url).trim().toLowerCase();
    }
}

function isStudentLoginUrl(url) {
    const normalized = normalizeUrl(url);
    return normalized.startsWith('https://pos.toshin.com/sso1/ssologin/studentlogin.aspx');
}

function setupHeightManager({ root }) {
    const { document } = root;
    const frameElement = document.getElementById('frame');
    const footerElement = document.getElementById('footer');
    const appFrameElement = document.getElementById(APP_FRAME_ID);

    if (!appFrameElement) {
        return;
    }

    let isApplying = false;

    const resetApplyingFlag = () => {
        if (typeof root.requestAnimationFrame === 'function') {
            root.requestAnimationFrame(() => {
                isApplying = false;
            });
        } else {
            root.setTimeout(() => {
                isApplying = false;
            }, 0);
        }
    };

    const updateHeight = () => {
        const heightPx = calculateFrameHeight({
            root,
            frameElement,
            appFrameElement,
            footerElement
        });
        isApplying = true;
        applyHeight({ element: appFrameElement, heightPx, isIframe: true });
        applyHeight({ element: frameElement, heightPx });
        if (frameElement) {
            frameElement.style.setProperty('overflow', 'hidden', 'important');
        }
        resetApplyingFlag();
    };

    updateHeight();

    const resizeHandler = () => updateHeight();
    root.addEventListener('resize', resizeHandler);

    let visualViewportHandler;
    if (root.visualViewport) {
        visualViewportHandler = () => updateHeight();
        root.visualViewport.addEventListener('resize', visualViewportHandler);
        root.visualViewport.addEventListener('scroll', visualViewportHandler);
    }

    let layoutObserver;
    if (typeof root.ResizeObserver === 'function') {
        layoutObserver = new root.ResizeObserver(() => updateHeight());
        [frameElement, footerElement].forEach(target => {
            if (target) {
                layoutObserver.observe(target);
            }
        });
    }

    const observer = new MutationObserver(() => {
        if (isApplying) {
            return;
        }
        updateHeight();
    });

    observer.observe(appFrameElement, {
        attributes: true,
        attributeFilter: ['style']
    });

    root.addEventListener('beforeunload', () => {
        observer.disconnect();
        root.removeEventListener('resize', resizeHandler);
        if (visualViewportHandler && root.visualViewport) {
            root.visualViewport.removeEventListener('resize', visualViewportHandler);
            root.visualViewport.removeEventListener('scroll', visualViewportHandler);
        }
        if (layoutObserver) {
            layoutObserver.disconnect();
        }
    });
}

function setupAppFrameRedirect({ root }) {
    const { document } = root;
    const appFrameElement = document.getElementById(APP_FRAME_ID);

    if (!appFrameElement) {
        return;
    }

    const redirectUrl = STUDENT_MENU_URL;

    const redirectToStudentMenu = () => {
        if (!appFrameElement) {
            return;
        }

        let currentUrl = '';
        try {
            if (appFrameElement.contentWindow && appFrameElement.contentWindow.location) {
                currentUrl = appFrameElement.contentWindow.location.href;
            }
        } catch (error) {
            /* accessing cross-origin frame may throw; fall back to src */
        }

        if (!currentUrl) {
            currentUrl = appFrameElement.src || '';
        }

        if (!isStudentLoginUrl(currentUrl)) {
            appFrameElement.dataset.posAssistantRedirecting = '';
            return;
        }

        if (appFrameElement.dataset.posAssistantRedirecting === '1') {
            return;
        }

        appFrameElement.dataset.posAssistantRedirecting = '1';

        try {
            root.location.replace(redirectUrl);
        } catch (error) {
            root.location.href = redirectUrl;
        }
    };

    const handleLoad = () => {
        appFrameElement.dataset.posAssistantRedirecting = '';
        redirectToStudentMenu();
    };

    appFrameElement.addEventListener('load', handleLoad);
    redirectToStudentMenu();

    root.addEventListener('beforeunload', () => {
        appFrameElement.removeEventListener('load', handleLoad);
    });
}

function enhancePosApplication({ root }) {
    injectBaseStyle(root);
    const { document } = root;
    if (document) {
        const { documentElement, body } = document;
        if (documentElement) {
            documentElement.style.setProperty('overflow', 'hidden', 'important');
            documentElement.style.setProperty('height', '100%', 'important');
        }
        if (body) {
            body.style.setProperty('overflow', 'hidden', 'important');
            body.style.setProperty('height', '100vh', 'important');
            body.style.setProperty('max-height', '100vh', 'important');
            body.style.setProperty('margin', '0', 'important');
        }
    }
    setupHeightManager({ root });
    setupAppFrameRedirect({ root });
}

export function initPosApplicationEnhancer({ root = window } = {}) {
    if (!root || root.top !== root) {
        return;
    }

    if (root[INIT_FLAG]) {
        return;
    }
    root[INIT_FLAG] = true;

    const execute = () => {
        try {
            enhancePosApplication({ root });
        } catch (error) {
            console.error('POS Assistant failed to enhance PosApplication.aspx:', error);
        }
    };

    if (root.document.readyState === 'loading') {
        root.document.addEventListener('DOMContentLoaded', execute, { once: true });
    } else {
        execute();
    }
}
