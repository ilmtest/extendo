import type { TokenVariant } from '@/src/background/types';

export const QUERY_LOOKUP_RESULTS_KEY = 'query_lookup_results';
export const COMPILATION_API_PATH = '/compilation/excerpts/shift';
export const TRANSLATIONS_API_PATH = '/translations';

export const BLACKIYA_API_VERSION = 'blackiya.events.v1';
export const BLACKIYA_EVENTS_PORT_NAME = BLACKIYA_API_VERSION;
export const BLACKIYA_CONNECT_RETRY_MS = 3000;
export const BLACKIYA_SYNC_HEARTBEAT_ALARM = 'BLACKIYA_SYNC_HEARTBEAT';
export const BLACKIYA_SYNC_HEARTBEAT_MINUTES = 1;
export const MAX_SEEN_EVENT_IDS = 200;
export const MAX_SAVED_BLACKIYA_HASHES = 200;

export const OPENAI_HOSTS = ['chatgpt.com', 'chat.openai.com'] as const;
export const GROK_HOSTS = ['grok.com', 'x.com'] as const;
export const GEMINI_HOSTS = ['gemini.google.com'] as const;

export const MAX_TOKENS_BY_VARIANT: Record<TokenVariant, number> = {
    leftCommandLeftOption0: 10000,
    rightCommandRightOption0: 20000,
    leftCommandLeftOption7: 7000,
    rightCommandRightOption5: 15000,
};
