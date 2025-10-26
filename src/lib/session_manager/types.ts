import type { WindowRootOptions } from '@/lib/types.ts';
import type { AUTH_CHECK_MESSAGE } from '@/lib/session_manager/constants.ts';

export interface SessionManagerOptions extends WindowRootOptions<Window> {
  readonly targetUrl?: string;
  readonly studentMenuUrl?: string;
}

export interface AuthCheckRequestMessage {
  readonly type: typeof AUTH_CHECK_MESSAGE;
  readonly url?: string;
}

export interface AuthCheckResponseMessage {
  readonly authenticated: boolean;
}
