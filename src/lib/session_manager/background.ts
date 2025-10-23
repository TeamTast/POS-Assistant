import { AUTH_CHECK_MESSAGE } from './constants.ts';
import type { AuthCheckRequestMessage, AuthCheckResponseMessage } from './types.ts';

interface EvaluateAuthenticationParams {
  readonly url: string;
}

const isSessionErrorUrl = (url: unknown): boolean => {
  if (!url) {
    return false;
  }

  try {
    const normalized = url.toString().toLowerCase();
    return normalized.includes('/sessionerror.html');
  } catch (error) {
    return false;
  }
};

const evaluateAuthentication = async ({ url }: EvaluateAuthenticationParams): Promise<boolean> => {
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

    const finalUrl = response.url || url;
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
};

export const initSessionManagerBackground = (): void => {
  if (!chrome.runtime?.onMessage) {
    return;
  }

  chrome.runtime.onMessage.addListener((message: AuthCheckRequestMessage, _sender, sendResponse) => {
    if (!message || message.type !== AUTH_CHECK_MESSAGE) {
      return false;
    }

    const targetUrl = message.url;
    if (!targetUrl) {
      const payload: AuthCheckResponseMessage = { authenticated: false };
      sendResponse(payload);
      return false;
    }

    evaluateAuthentication({ url: targetUrl })
      .then((authenticated) => {
        const payload: AuthCheckResponseMessage = { authenticated };
        sendResponse(payload);
      })
      .catch((error: unknown) => {
        console.error('POS Assistant failed to verify authentication:', error);
        const payload: AuthCheckResponseMessage = { authenticated: false };
        sendResponse(payload);
      });

    return true;
  });
};
