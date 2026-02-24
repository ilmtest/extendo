import {
    clearInFlightPayloadReservation,
    createPayloadFingerprintKey,
    hashPayloadForDedupe,
    isPayloadHashDuplicate,
    rememberPayloadHash,
    rememberSeenEventId,
    reserveInFlightPayloadReservation,
    toPersistedConversationHashEntries,
} from '@/src/background/blackiya-sync-helpers';
import { MAX_SAVED_BLACKIYA_HASHES, MAX_SEEN_EVENT_IDS } from '@/src/background/constants';
import type { BlackiyaConversationEvent } from '@/src/background/types';
import { saveBlackiyaSavedConversationHashes } from '@/src/utils/db';
import { log, logError } from '@/src/utils/logger';
import type { BlackiyaEventSource } from './connection';
import { saveBlackiyaConversationPayload } from './conversation-persistence';
import { evaluatePayloadQuality, isCanonicalCaptureMeta } from './payload-quality';

const persistSavedBlackiyaConversationHashes = async (lastSavedHashByConversationId: Map<string, string>) =>
    saveBlackiyaSavedConversationHashes(toPersistedConversationHashEntries(lastSavedHashByConversationId));

export const processBlackiyaEvent = async (
    event: BlackiyaConversationEvent,
    seenEventIds: Set<string>,
    lastSavedHashByConversationId: Map<string, string>,
    inFlightPayloadKeys: Set<string>,
    source: BlackiyaEventSource,
) => {
    if (event.type !== 'conversation.ready' && event.type !== 'conversation.updated') {
        log('Extendo: Skipping unsupported Blackiya event type', {
            eventId: event.event_id,
            eventType: event.type,
            conversationId: event.conversation_id,
            source,
        });
        return;
    }

    if (!isCanonicalCaptureMeta(event)) {
        log('Extendo: Skipping non-canonical Blackiya payload', {
            captureMeta: event.capture_meta,
            conversationId: event.conversation_id,
            eventId: event.event_id,
            eventType: event.type,
            source,
        });
        return;
    }

    const quality = evaluatePayloadQuality(event.payload);
    if (!quality.readyForPersist) {
        log('Extendo: Skipping Blackiya payload due to quality gate', {
            conversationId: event.conversation_id,
            eventId: event.event_id,
            eventType: event.type,
            genericTitle: quality.genericTitle,
            hasAssistantText: quality.hasAssistantText,
            hasUserPrompt: quality.hasUserPrompt,
            source,
            title: quality.title,
        });
        return;
    }

    if (quality.genericTitle) {
        log('Extendo: Accepting payload with generic title (non-blocking)', {
            conversationId: event.conversation_id,
            eventId: event.event_id,
            eventType: event.type,
            source,
            title: quality.title,
        });
    }

    if (!rememberSeenEventId(seenEventIds, event.event_id, MAX_SEEN_EVENT_IDS)) {
        log('Extendo: Skipping duplicate Blackiya event id', {
            eventId: event.event_id,
            conversationId: event.conversation_id,
            source,
        });
        return;
    }

    let payloadHash = '';
    try {
        payloadHash = hashPayloadForDedupe(event.payload);
    } catch (error) {
        logError('Extendo: Failed to hash Blackiya payload for dedupe', {
            eventId: event.event_id,
            conversationId: event.conversation_id,
            source,
            error,
        });
        return;
    }

    if (isPayloadHashDuplicate(lastSavedHashByConversationId, event.conversation_id, payloadHash)) {
        log('Extendo: Payload skipped by hash dedupe', {
            eventId: event.event_id,
            conversationId: event.conversation_id,
            source,
            payloadHash,
        });
        return;
    }

    const payloadKey = createPayloadFingerprintKey(event.conversation_id, payloadHash);
    if (!reserveInFlightPayloadReservation(inFlightPayloadKeys, payloadKey)) {
        log('Extendo: Payload skipped by in-flight dedupe', {
            eventId: event.event_id,
            conversationId: event.conversation_id,
            source,
            payloadHash,
        });
        return;
    }

    try {
        log('Extendo: Received Blackiya callback event', {
            eventId: event.event_id,
            eventType: event.type,
            conversationId: event.conversation_id,
            payloadHash,
            source,
            payloadKeys: Object.keys(event.payload).length,
        });

        const saved = await saveBlackiyaConversationPayload(event.payload, event.conversation_id);
        if (!saved) {
            return;
        }

        rememberPayloadHash(
            lastSavedHashByConversationId,
            event.conversation_id,
            payloadHash,
            MAX_SAVED_BLACKIYA_HASHES,
        );
        await persistSavedBlackiyaConversationHashes(lastSavedHashByConversationId);
    } finally {
        clearInFlightPayloadReservation(inFlightPayloadKeys, payloadKey);
    }
};
