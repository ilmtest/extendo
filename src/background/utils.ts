import {
    BLACKIYA_API_VERSION,
    COMPILATION_API_PATH,
    GEMINI_HOSTS,
    GROK_HOSTS,
    MAX_TOKENS_BY_VARIANT,
    OPENAI_HOSTS,
} from '@/src/background/constants';
import type { BlackiyaConversationEvent, LLMProvider, TokenVariant } from '@/src/background/types';

const hostnameMatchesAny = (hostname: string, hosts: readonly string[]) =>
    hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));

export const getMaxTokensForVariant = (variant: TokenVariant) => MAX_TOKENS_BY_VARIANT[variant];

export const getProviderFromUrl = (tabUrl?: string): LLMProvider => {
    if (!tabUrl) {
        return 'openai';
    }

    try {
        const { hostname } = new URL(tabUrl);

        if (hostnameMatchesAny(hostname, OPENAI_HOSTS)) {
            return 'openai';
        }

        if (hostnameMatchesAny(hostname, GROK_HOSTS)) {
            return 'grok';
        }

        if (hostnameMatchesAny(hostname, GEMINI_HOSTS)) {
            return 'gemini';
        }
    } catch {
        // ignore
    }

    return 'openai';
};

export const buildCompilationEndpoint = (translationsApiInstance: string, provider: LLMProvider, maxTokens: number) => {
    const query = new URLSearchParams({
        provider,
        maxTokens: maxTokens.toString(),
    });
    return `${translationsApiInstance}${COMPILATION_API_PATH}?${query.toString()}`;
};

export const isBlackiyaConversationEvent = (value: unknown): value is BlackiyaConversationEvent => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const data = value as Record<string, unknown>;
    return (
        data.api === BLACKIYA_API_VERSION &&
        data.type === 'conversation.ready' &&
        typeof data.event_id === 'string' &&
        typeof data.conversation_id === 'string' &&
        typeof data.payload === 'object' &&
        data.payload !== null
    );
};
