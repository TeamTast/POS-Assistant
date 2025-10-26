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
            const { initSessionManager } = await import('@/lib/session_manager/content.ts');
            initSessionManager();
        } else if (/SSO1\/SSOMenu\/PosApplication\.aspx/i.test(url)) {
            const { initPosApplicationEnhancer } = await import('@/lib/pos_application_enhancer/content.ts');
            initPosApplicationEnhancer();
        } else {
            const { initEnshuAssistantContent } = await import('@/lib/enshu_assistant/content.ts');
            await initEnshuAssistantContent({ url });
        }
    } catch (error) {
        console.error('Failed to initialize POS Assistant content script:', error);
    }
})();
