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

export type CompilationFetchResponse = { ok: true; text: string } | { ok: false; error: string };
