import type {
    BlackiyaConversationEvent,
    BlackiyaGetLatestSuccessResponse,
    PersistedConversationHashEntry,
} from '@/src/background/types';

const stableStringify = (value: unknown): string => {
    if (value === undefined) {
        return 'null';
    }

    if (value === null) {
        return 'null';
    }

    if (typeof value !== 'object') {
        const serialized = JSON.stringify(value);
        return serialized ?? 'null';
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, itemValue]) => itemValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right));
    const serializedEntries = entries.map(([key, itemValue]) => `${JSON.stringify(key)}:${stableStringify(itemValue)}`);
    return `{${serializedEntries.join(',')}}`;
};

export const hashPayloadForDedupe = (payload: Record<string, unknown>) => {
    const serialized = stableStringify(payload);
    let hash = 2166136261;
    for (let index = 0; index < serialized.length; index += 1) {
        hash ^= serialized.charCodeAt(index);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return `${hash >>> 0}`;
};

export const createPayloadFingerprintKey = (conversationId: string, payloadHash: string) =>
    `${conversationId}:${payloadHash}`;

export const reserveInFlightPayloadReservation = (inFlightPayloadKeys: Set<string>, payloadKey: string) => {
    if (inFlightPayloadKeys.has(payloadKey)) {
        return false;
    }

    inFlightPayloadKeys.add(payloadKey);
    return true;
};

export const clearInFlightPayloadReservation = (inFlightPayloadKeys: Set<string>, payloadKey: string) => {
    inFlightPayloadKeys.delete(payloadKey);
};

export const rememberSeenEventId = (seenEventIds: Set<string>, eventId: string, maxSeenEventIds: number) => {
    if (seenEventIds.has(eventId)) {
        return false;
    }

    seenEventIds.add(eventId);
    if (seenEventIds.size > maxSeenEventIds) {
        const oldestEventId = seenEventIds.values().next().value;
        if (typeof oldestEventId === 'string') {
            seenEventIds.delete(oldestEventId);
        }
    }

    return true;
};

export const isPayloadHashDuplicate = (
    lastSavedHashByConversationId: Map<string, string>,
    conversationId: string,
    payloadHash: string,
) => lastSavedHashByConversationId.get(conversationId) === payloadHash;

export const rememberPayloadHash = (
    lastSavedHashByConversationId: Map<string, string>,
    conversationId: string,
    payloadHash: string,
    maxSavedPayloadHashes: number,
) => {
    if (lastSavedHashByConversationId.has(conversationId)) {
        lastSavedHashByConversationId.delete(conversationId);
    }

    lastSavedHashByConversationId.set(conversationId, payloadHash);
    if (lastSavedHashByConversationId.size > maxSavedPayloadHashes) {
        const oldestConversationId = lastSavedHashByConversationId.keys().next().value;
        if (typeof oldestConversationId === 'string') {
            lastSavedHashByConversationId.delete(oldestConversationId);
        }
    }
};

export const shouldSkipPayloadByHash = (
    lastSavedHashByConversationId: Map<string, string>,
    conversationId: string,
    payloadHash: string,
) => {
    if (isPayloadHashDuplicate(lastSavedHashByConversationId, conversationId, payloadHash)) {
        return true;
    }

    lastSavedHashByConversationId.set(conversationId, payloadHash);
    return false;
};

export const toPersistedConversationHashEntries = (
    lastSavedHashByConversationId: Map<string, string>,
): PersistedConversationHashEntry[] => Array.from(lastSavedHashByConversationId.entries());

export const mapFromPersistedConversationHashEntries = (
    entries: PersistedConversationHashEntry[],
    maxSavedPayloadHashes: number,
) => {
    const map = new Map<string, string>(entries);

    while (map.size > maxSavedPayloadHashes) {
        const oldestConversationId = map.keys().next().value;
        if (typeof oldestConversationId !== 'string') {
            break;
        }
        map.delete(oldestConversationId);
    }

    return map;
};

export const buildSyntheticPullEvent = (response: BlackiyaGetLatestSuccessResponse): BlackiyaConversationEvent => ({
    api: response.api,
    type: 'conversation.updated',
    event_id: `pull:${response.conversation_id}:${response.ts}`,
    conversation_id: response.conversation_id,
    payload: response.data,
});
