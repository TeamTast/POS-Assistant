import { AUTH_CHECK_MESSAGE } from './constants.js';

function isSessionErrorUrl(url) {
    if (!url) {
        return false;
    }
    try {
        const normalized = url.toString().toLowerCase();
        return normalized.includes('/sessionerror.html');
    } catch (error) {
        return false;
    }
}

async function evaluateAuthentication({ url }) {
    if (!url || typeof fetch !== 'function') {
        return false;
    }

    try {
        const response = await fetch(url, {
            credentials: 'include',
            redirect: 'follow',
            cache: 'no-store',
            mode: 'cors'
        });

        const finalUrl = response?.url || url;
        if (isSessionErrorUrl(finalUrl)) {
            return false;
        }

        if (response.redirected && isSessionErrorUrl(response.url)) {
            return false;
        }

        return response.ok;
    } catch (error) {
        console.warn('POS Assistant authentication check failed:', error);
        return false;
    }
}

export function initSessionManagerBackground() {
    if (!chrome.runtime || !chrome.runtime.onMessage) {
        return;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || message.type !== AUTH_CHECK_MESSAGE) {
            return false;
        }

        const targetUrl = message.url;
        if (!targetUrl) {
            sendResponse({ authenticated: false });
            return false;
        }

        evaluateAuthentication({ url: targetUrl })
            .then(authenticated => {
                sendResponse({ authenticated });
            })
            .catch(error => {
                console.error('POS Assistant failed to verify authentication:', error);
                sendResponse({ authenticated: false });
            });

        return true;
    });
}
