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
    type: 'conversation.ready' | 'conversation.updated';
    event_id: string;
    conversation_id: string;
    payload: Record<string, unknown>;
    capture_meta?: {
        captureSource?: 'canonical_api' | 'dom_snapshot_degraded';
        fidelity?: 'high' | 'degraded';
        completeness?: 'complete' | 'partial';
    };
    content_hash?: string | null;
};

export type BlackiyaGetLatestRequest = {
    api: 'blackiya.events.v1';
    type: 'conversation.getLatest';
    format?: 'original' | 'common';
};

export type BlackiyaGetLatestSuccessResponse = {
    ok: true;
    api: 'blackiya.events.v1';
    ts: number;
    conversation_id: string;
    format: 'original';
    data: Record<string, unknown>;
};

export type BlackiyaFailureResponse = {
    ok: false;
    api: 'blackiya.events.v1';
    ts: number;
    code: 'INVALID_REQUEST' | 'NOT_FOUND' | 'UNAVAILABLE' | 'INTERNAL_ERROR';
    message: string;
};

export type BlackiyaGetLatestResponse = BlackiyaGetLatestSuccessResponse | BlackiyaFailureResponse;
export type PersistedConversationHashEntry = [conversationId: string, payloadHash: string];

export type CompilationFetchResponse = { ok: true; text: string } | { ok: false; error: string };

export type SaveBlackiyaJsonResponse = { ok: true } | { ok: false; error: string };

export type BlackiyaHealthResponse = {
    ok: boolean;
};
