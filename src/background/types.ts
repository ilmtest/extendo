export type TokenVariant =
    | 'leftCommandLeftOption0'
    | 'rightCommandRightOption0'
    | 'leftCommandLeftOption7'
    | 'rightCommandRightOption5';
export type LLMProvider = 'openai' | 'grok' | 'gemini';

export type CompilationFetchRequest = {
    type: 'fetch-compilation-excerpt';
    provider: LLMProvider;
    maxTokens: number;
};

export type BlackiyaConversationEvent = {
    api: 'blackiya.events.v1';
    type: 'conversation.ready';
    event_id: string;
    conversation_id: string;
    payload: Record<string, unknown>;
};

export type CompilationFetchResponse = { ok: true; text: string } | { ok: false; error: string };

export type SaveBlackiyaJsonResponse = { ok: true } | { ok: false; error: string };

export type BlackiyaHealthResponse = {
    ok: boolean;
};
