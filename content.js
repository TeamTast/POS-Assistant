(async () => {
    try {
        const url = window.location.href;
        let isLandingPage = false;
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.toLowerCase();
            const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();
            isLandingPage = (hostname === 'www.toshin.com' || hostname === 'toshin.com') && pathname === '/pos';
        } catch (error) {
            /* noop */
        }

        if (/sessionerror\.html/i.test(url) || /RBTLoginError\.aspx/i.test(url) || isLandingPage) {
            const { initSessionManager } = await import(chrome.runtime.getURL('functions/session_manager/content.js'));
            initSessionManager();
        } else if (/SSO1\/SSOMenu\/PosApplication\.aspx/i.test(url)) {
            const { initPosApplicationEnhancer } = await import(chrome.runtime.getURL('functions/pos_application_enhancer/content.js'));
            initPosApplicationEnhancer();
        } else {
            const { initEnshuAssistantContent } = await import(chrome.runtime.getURL('functions/enshu_assistant/content.js'));
            await initEnshuAssistantContent({ url });
        }
    } catch (error) {
        console.error('Failed to initialize POS Assistant content script:', error);
    }
})();
