const DEFAULT_TARGET_URL = 'https://www.toshin.com/pos/';

function shouldRedirect({ locationHref }) {
    if (!locationHref) {
        return false;
    }
    const normalized = locationHref.toLowerCase();
    return normalized.includes('/sso1/ssomenu/sessionerror.html')
        || normalized.includes('/rbt2/rbt_student/page/errorpages/rbtloginerror.aspx');
}

export function initRedirectLogin({
    targetUrl = DEFAULT_TARGET_URL,
    root = window
} = {}) {
    if (!root || root.top !== root) {
        return;
    }

    const current = root.location.href;
    if (!shouldRedirect({ locationHref: current })) {
        return;
    }

    if (current === targetUrl) {
        return;
    }

    console.log('Session error detected. Redirecting to:', targetUrl);
    root.setTimeout(() => {
        try {
            root.location.replace(targetUrl);
        } catch (error) {
            console.error('Failed to redirect to login:', error);
        }
    }, 0);
}
