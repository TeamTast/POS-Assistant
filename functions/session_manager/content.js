import {
    AUTH_CHECK_MESSAGE,
    STUDENT_MENU_URL,
    POS_LANDING_HOSTS as POS_LANDING_HOSTS_ARRAY,
    LANDING_URL
} from './constants.js';

const DEFAULT_TARGET_URL = LANDING_URL;
const POS_LANDING_HOSTS = new Set(
    Array.isArray(POS_LANDING_HOSTS_ARRAY) ? POS_LANDING_HOSTS_ARRAY.map(host => host.toLowerCase()) : []
);

function shouldRedirect({ locationHref }) {
    if (!locationHref) {
        return false;
    }
    const normalized = locationHref.toLowerCase();
    return normalized.includes('/sso1/ssomenu/sessionerror.html')
        || normalized.includes('/rbt2/rbt_student/page/errorpages/rbtloginerror.aspx');
}

function isSessionLandingPage({ location }) {
    if (!location) {
        return false;
    }
    const hostname = (location.hostname || '').toLowerCase();
    if (!POS_LANDING_HOSTS.has(hostname)) {
        return false;
    }
    const pathname = (location.pathname || '').replace(/\/+$/, '').toLowerCase();
    return pathname === '/pos';
}

async function isAuthenticated({ studentMenuUrl }) {
    if (!studentMenuUrl || !chrome?.runtime?.sendMessage) {
        return false;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            type: AUTH_CHECK_MESSAGE,
            url: studentMenuUrl
        });
        return Boolean(response && response.authenticated);
    } catch (error) {
        console.warn('POS Assistant failed to verify authentication:', error);
    }
    return false;
}

function redirectTo({ root, destination, reason }) {
    if (!root || !destination) {
        return;
    }
    try {
        console.log('POS Assistant redirect:', reason, '→', destination);
    } catch (error) {
        /* noop */
    }
    root.setTimeout(() => {
        try {
            root.location.replace(destination);
        } catch (error) {
            console.error('Failed to redirect:', error);
        }
    }, 0);
}

async function handleLandingRedirect({
    root,
    studentMenuUrl
}) {
    if (!root || !root.document || !root.location) {
        return false;
    }

    if (!isSessionLandingPage({ location: root.location })) {
        return false;
    }

    const authenticated = await isAuthenticated({ studentMenuUrl });
    if (!authenticated) {
        return false;
    }

    redirectTo({
        root,
        destination: studentMenuUrl,
        reason: 'authenticated session detected on landing page'
    });
    return true;
}

export function initSessionManager({
    targetUrl = DEFAULT_TARGET_URL,
    root = window,
    studentMenuUrl = STUDENT_MENU_URL
} = {}) {
    if (!root || root.top !== root) {
        return;
    }

    (async () => {
        const redirected = await handleLandingRedirect({
            root,
            studentMenuUrl
        });
        if (redirected) {
            return;
        }

        const current = root.location.href;
        if (!shouldRedirect({ locationHref: current })) {
            return;
        }

        if (current === targetUrl) {
            return;
        }

        redirectTo({
            root,
            destination: targetUrl,
            reason: 'session error detected'
        });
    })().catch(error => {
        console.error('POS Assistant session manager failed:', error);
    });
}
