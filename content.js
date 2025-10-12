(async () => {
    try {
        const url = window.location.href;
        if (/sessionerror\.html/i.test(url)) {
            const { initRedirectLogin } = await import(chrome.runtime.getURL('functions/redirect_login/content.js'));
            initRedirectLogin();
        } else if (/MondaiKaitoInsatsu/.test(url)) {
            const { initEnshuAssistantPrint } = await import(chrome.runtime.getURL('functions/enshu_assistant/content_print.js'));
            initEnshuAssistantPrint();
        } else {
            const { initEnshuAssistantParent } = await import(chrome.runtime.getURL('functions/enshu_assistant/content_parent.js'));
            initEnshuAssistantParent();
        }
    } catch (error) {
        console.error('Failed to initialize POS Assistant content script:', error);
    }
})();
