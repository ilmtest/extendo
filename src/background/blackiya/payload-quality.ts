import type { BlackiyaConversationEvent } from '@/src/background/types';

const GENERIC_TITLES = new Set(['New chat', 'Google Gemini', 'Gemini Conversation', 'Chats']);

const getTitle = (payload: Record<string, unknown>) => (typeof payload.title === 'string' ? payload.title.trim() : '');

const getMappingNodes = (payload: Record<string, unknown>) => {
    const mappingValue = payload.mapping;
    if (typeof mappingValue !== 'object' || mappingValue === null) {
        return [] as unknown[];
    }
    return Object.values(mappingValue);
};

const getNodeRole = (node: unknown) => {
    if (typeof node !== 'object' || node === null) {
        return undefined;
    }
    const message = (node as { message?: unknown }).message;
    if (typeof message !== 'object' || message === null) {
        return undefined;
    }
    const author = (message as { author?: unknown }).author;
    if (typeof author !== 'object' || author === null) {
        return undefined;
    }
    return (author as { role?: unknown }).role;
};

const getNodeText = (node: unknown) => {
    if (typeof node !== 'object' || node === null) {
        return '';
    }
    const message = (node as { message?: unknown }).message;
    if (typeof message !== 'object' || message === null) {
        return '';
    }
    const content = (message as { content?: unknown }).content;
    if (typeof content !== 'object' || content === null) {
        return '';
    }
    const partsValue = (content as { parts?: unknown }).parts;
    if (Array.isArray(partsValue)) {
        const parts = partsValue.filter((part): part is string => typeof part === 'string');
        const joined = parts.join('\n').trim();
        if (joined) {
            return joined;
        }
    }
    const fallback = (content as { content?: unknown }).content;
    return typeof fallback === 'string' ? fallback : '';
};

export const evaluatePayloadQuality = (payload: Record<string, unknown>) => {
    const title = getTitle(payload);
    const nodes = getMappingNodes(payload);
    let hasAssistantText = false;
    let hasUserPrompt = false;

    for (const node of nodes) {
        const role = getNodeRole(node);
        const text = getNodeText(node).trim();
        if (!text) {
            continue;
        }
        if (role === 'user') {
            hasUserPrompt = true;
        }
        if (role === 'assistant') {
            hasAssistantText = true;
        }
        if (hasAssistantText && hasUserPrompt) {
            break;
        }
    }

    const genericTitle = !title || GENERIC_TITLES.has(title);
    return {
        genericTitle,
        hasAssistantText,
        hasUserPrompt,
        readyForPersist: hasUserPrompt && hasAssistantText,
        title,
    };
};

export const isCanonicalCaptureMeta = (event: BlackiyaConversationEvent) => {
    const meta = event.capture_meta;
    if (!meta) {
        return true;
    }
    return meta.captureSource === 'canonical_api' && meta.fidelity === 'high' && meta.completeness === 'complete';
};
