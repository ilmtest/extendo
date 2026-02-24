import { describe, expect, test } from 'bun:test';

import {
    buildCompilationEndpoint,
    getMaxTokensForVariant,
    getProviderFromUrl,
    isBlackiyaConversationEvent,
    isBlackiyaGetLatestSuccessResponse,
} from '@/src/background/utils';

describe('background utils', () => {
    test('getMaxTokensForVariant returns mapped values', () => {
        expect(getMaxTokensForVariant('leftCommandLeftOption0')).toBe(10000);
        expect(getMaxTokensForVariant('rightCommandRightOption0')).toBe(20000);
        expect(getMaxTokensForVariant('leftCommandLeftOption7')).toBe(7000);
        expect(getMaxTokensForVariant('rightCommandRightOption5')).toBe(15000);
    });

    test('getProviderFromUrl resolves providers from hostnames', () => {
        expect(getProviderFromUrl('https://chatgpt.com/c/123')).toBe('openai');
        expect(getProviderFromUrl('https://chat.openai.com/chat')).toBe('openai');
        expect(getProviderFromUrl('https://x.com/i/grok')).toBe('grok');
        expect(getProviderFromUrl('https://grok.com/chat')).toBe('grok');
        expect(getProviderFromUrl('https://gemini.google.com/app')).toBe('gemini');
    });

    test('getProviderFromUrl falls back to openai', () => {
        expect(getProviderFromUrl('https://example.com')).toBe('openai');
        expect(getProviderFromUrl('not-a-url')).toBe('openai');
        expect(getProviderFromUrl()).toBe('openai');
    });

    test('buildCompilationEndpoint creates provider and maxTokens query params', () => {
        const endpoint = buildCompilationEndpoint('https://api.example.com', 'grok', 15000);
        expect(endpoint).toBe('https://api.example.com/compilation/excerpts/shift?provider=grok&maxTokens=15000');
    });

    test('isBlackiyaConversationEvent validates payload shape', () => {
        expect(
            isBlackiyaConversationEvent({
                api: 'blackiya.events.v1',
                type: 'conversation.ready',
                event_id: 'event-1',
                conversation_id: 'conv-1',
                payload: { hello: 'world' },
            }),
        ).toBe(true);

        expect(
            isBlackiyaConversationEvent({
                api: 'blackiya.events.v1',
                type: 'conversation.updated',
                event_id: 'event-1',
                conversation_id: 'conv-1',
                payload: { hello: 'world' },
            }),
        ).toBe(true);

        expect(isBlackiyaConversationEvent(null)).toBe(false);

        expect(
            isBlackiyaConversationEvent({
                api: 'blackiya.events.v1',
                type: 'conversation.ready',
                event_id: 'event-2',
                conversation_id: 'conv-2',
                payload: { hello: 'world' },
                capture_meta: {
                    captureSource: 'canonical_api',
                    fidelity: 'high',
                    completeness: 'complete',
                },
                content_hash: 'abc123',
            }),
        ).toBe(true);

        expect(
            isBlackiyaConversationEvent({
                api: 'blackiya.events.v1',
                type: 'conversation.updated',
                event_id: 'event-3',
                conversation_id: 'conv-3',
                payload: {
                    title: 'Google Gemini',
                    mapping: {
                        n1: {
                            message: {
                                author: { role: 'user' },
                                content: { parts: ['hello'] },
                            },
                        },
                        n2: {
                            message: {
                                author: { role: 'assistant' },
                                content: { parts: ['world'] },
                            },
                        },
                    },
                },
            }),
        ).toBe(true);
    });

    test('isBlackiyaGetLatestSuccessResponse validates response shape', () => {
        expect(
            isBlackiyaGetLatestSuccessResponse({
                ok: true,
                api: 'blackiya.events.v1',
                ts: Date.now(),
                conversation_id: 'conv-1',
                format: 'original',
                data: { hello: 'world' },
            }),
        ).toBe(true);

        expect(
            isBlackiyaGetLatestSuccessResponse({
                ok: true,
                api: 'blackiya.events.v1',
                ts: Date.now(),
                conversation_id: 'conv-1',
                format: 'common',
                data: { hello: 'world' },
            }),
        ).toBe(false);
    });
});
