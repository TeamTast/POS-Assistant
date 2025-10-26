import { STUDENT_MENU_URL } from '@/lib/session_manager/constants.ts';
import type { PosApplicationEnhancerOptions } from './types.ts';

const INIT_FLAG = '__posAssistantPosApplicationInitialized' as const;
const STYLE_ELEMENT_ID = 'pos-assistant-posapplication-style' as const;
const APP_FRAME_ID = 'appFrame' as const;

type PosApplicationWindow = Window & { [INIT_FLAG]?: boolean };

interface InjectBaseStyleParams {
    readonly document: Document;
}

const injectBaseStyle = ({ document }: InjectBaseStyleParams): void => {
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
};

interface CalculateFrameHeightParams {
    readonly root: Window;
    readonly frameElement: HTMLElement | null;
    readonly appFrameElement: HTMLIFrameElement | null;
    readonly footerElement: HTMLElement | null;
}

const calculateFrameHeight = ({ root, frameElement, appFrameElement, footerElement }: CalculateFrameHeightParams): number => {
    const viewportHeight = root.innerHeight;
    const topOffsetTarget = frameElement || appFrameElement;
    if (!topOffsetTarget) {
        return viewportHeight;
    }
    const topOffset = topOffsetTarget.getBoundingClientRect().top;
    const footerHeight = footerElement ? footerElement.getBoundingClientRect().height : 0;
    return Math.max(Math.round(viewportHeight - topOffset - footerHeight), 0);
};

interface ApplyHeightParams {
    readonly element: HTMLElement | null;
    readonly heightPx: number;
    readonly isIframe?: boolean;
}

const applyHeight = ({ element, heightPx, isIframe = false }: ApplyHeightParams): void => {
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
};

const normalizeUrl = (url: string | URL | null | undefined): string => {
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
};

const isStudentLoginUrl = (url: string | URL | null | undefined): boolean => {
    const normalized = normalizeUrl(url);
    return normalized.startsWith('https://pos.toshin.com/sso1/ssologin/studentlogin.aspx');
};

interface SetupHeightManagerParams {
    readonly root: Window;
}

const setupHeightManager = ({ root }: SetupHeightManagerParams): void => {
    const { document } = root;
    const frameElement = document.getElementById('frame') as HTMLElement | null;
    const footerElement = document.getElementById('footer') as HTMLElement | null;
    const appFrameElement = document.getElementById(APP_FRAME_ID) as HTMLIFrameElement | null;

    if (!appFrameElement) {
        return;
    }

    let isApplying = false;

    const resetApplyingFlag = (): void => {
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

    const updateHeight = (): void => {
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

    const resizeHandler = (): void => updateHeight();
    root.addEventListener('resize', resizeHandler);

    let visualViewportHandler: (() => void) | undefined;
    if (root.visualViewport) {
        visualViewportHandler = () => updateHeight();
        root.visualViewport.addEventListener('resize', visualViewportHandler);
        root.visualViewport.addEventListener('scroll', visualViewportHandler);
    }

        let layoutObserver: ResizeObserver | undefined;
        if (typeof ResizeObserver === 'function') {
            layoutObserver = new ResizeObserver(() => updateHeight());
            [frameElement, footerElement].forEach((target) => {
                if (target) {
                    layoutObserver?.observe(target);
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
};

interface SetupAppFrameRedirectParams {
    readonly root: Window;
}

const setupAppFrameRedirect = ({ root }: SetupAppFrameRedirectParams): void => {
    const { document } = root;
    const appFrameElement = document.getElementById(APP_FRAME_ID) as HTMLIFrameElement | null;

    if (!appFrameElement) {
        return;
    }

    const redirectUrl = STUDENT_MENU_URL;

    const redirectToStudentMenu = (): void => {
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

    const handleLoad = (): void => {
        appFrameElement.dataset.posAssistantRedirecting = '';
        redirectToStudentMenu();
    };

    appFrameElement.addEventListener('load', handleLoad);
    redirectToStudentMenu();

    root.addEventListener('beforeunload', () => {
        appFrameElement.removeEventListener('load', handleLoad);
    });
};

interface EnhancePosApplicationParams {
    readonly root: Window;
}

const enhancePosApplication = ({ root }: EnhancePosApplicationParams): void => {
    injectBaseStyle({ document: root.document });
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
};

export const initPosApplicationEnhancer = ({ root = window }: PosApplicationEnhancerOptions = {}): void => {
    if (!root || root.top !== root) {
        return;
    }

    const flaggedRoot = root as PosApplicationWindow;

    if (flaggedRoot[INIT_FLAG]) {
        return;
    }
    flaggedRoot[INIT_FLAG] = true;

    const execute = (): void => {
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
};
