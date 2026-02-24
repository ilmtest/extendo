import { browser } from 'wxt/browser';
import { buildSyntheticPullEvent } from '@/src/background/blackiya-sync-helpers';
import type { BlackiyaSyncState, BlackiyaSyncTriggerReason } from '@/src/background/blackiya-sync-manager';
import { BLACKIYA_API_VERSION, BLACKIYA_EVENTS_PORT_NAME } from '@/src/background/constants';
import type {
    BlackiyaGetLatestRequest,
    BlackiyaGetLatestResponse,
    BlackiyaGetLatestSuccessResponse,
    BlackiyaHealthResponse,
} from '@/src/background/types';
import { isBlackiyaConversationEvent, isBlackiyaGetLatestSuccessResponse } from '@/src/background/utils';
import { log, logError } from '@/src/utils/logger';
import type { processBlackiyaEvent } from './event-processor';

type RuntimePort = ReturnType<typeof browser.runtime.connect>;
export type BlackiyaEventSource = 'push' | 'pull_reconcile' | 'replay';

export const isBlackiyaHealthy = async (extensionId: string): Promise<boolean> => {
    try {
        const response = (await browser.runtime.sendMessage(extensionId, {
            api: BLACKIYA_API_VERSION,
            type: 'health.ping',
        })) as BlackiyaHealthResponse | undefined;
        return response?.ok === true;
    } catch {
        return false;
    }
};

export const pullLatestConversation = async (
    extensionId: string,
    triggerReason: BlackiyaSyncTriggerReason,
): Promise<BlackiyaGetLatestSuccessResponse | null> => {
    log('Extendo: Reconcile pull start', { extensionId, triggerReason });

    try {
        const request = {
            api: BLACKIYA_API_VERSION,
            type: 'conversation.getLatest',
            format: 'original',
        } satisfies BlackiyaGetLatestRequest;

        const response = (await browser.runtime.sendMessage(extensionId, request)) as
            | BlackiyaGetLatestResponse
            | undefined;

        if (isBlackiyaGetLatestSuccessResponse(response)) {
            log('Extendo: Reconcile pull success', {
                extensionId,
                triggerReason,
                conversationId: response.conversation_id,
                ts: response.ts,
            });
            return response;
        }

        if (response?.ok === false) {
            log('Extendo: Reconcile pull skip', {
                extensionId,
                triggerReason,
                code: response.code,
                message: response.message,
            });
            return null;
        }

        log('Extendo: Reconcile pull skip', { extensionId, triggerReason, reason: 'invalid-response' });
        return null;
    } catch (error) {
        logError('Extendo: Reconcile pull failed', error);
        return null;
    }
};

export const reconcileLatestAfterConnect = async (
    state: BlackiyaSyncState,
    extensionId: string,
    triggerReason: BlackiyaSyncTriggerReason,
    processEvent: typeof processBlackiyaEvent,
) => {
    const latestResponse = await pullLatestConversation(extensionId, triggerReason);
    if (!latestResponse) {
        return;
    }

    const syntheticEvent = buildSyntheticPullEvent(latestResponse);
    await processEvent(
        syntheticEvent,
        state.seenEventIds,
        state.lastSavedHashByConversationId,
        state.inFlightPayloadKeys,
        'pull_reconcile',
    );
};

export const connectToBlackiyaEvents = async (
    state: BlackiyaSyncState,
    extensionId: string,
    _triggerReason: BlackiyaSyncTriggerReason,
    processEvent: typeof processBlackiyaEvent,
): Promise<RuntimePort | null> => {
    log('Extendo: Attempting to start Blackiya event listener', {
        extensionId,
        portName: BLACKIYA_EVENTS_PORT_NAME,
    });

    const healthy = await isBlackiyaHealthy(extensionId);
    if (!healthy) {
        logError('Extendo: Blackiya health check failed; listener not started', extensionId);
        return null;
    }

    try {
        const port = browser.runtime.connect(extensionId, { name: BLACKIYA_EVENTS_PORT_NAME });

        port.onMessage.addListener((message) => {
            const inboundMessage = message as Record<string, unknown> | null;
            log('Extendo: Received message from Blackiya event stream', {
                api: inboundMessage?.api,
                type: inboundMessage?.type,
                eventId: inboundMessage?.event_id,
                conversationId: inboundMessage?.conversation_id,
            });

            if (!isBlackiyaConversationEvent(message)) {
                log('Extendo: Ignoring non-conversation Blackiya event message');
                return;
            }

            const source: BlackiyaEventSource = message.event_id.startsWith('replay:') ? 'replay' : 'push';
            void processEvent(
                message,
                state.seenEventIds,
                state.lastSavedHashByConversationId,
                state.inFlightPayloadKeys,
                source,
            );
        });

        log('Extendo: Connected to Blackiya External API', extensionId);
        return port;
    } catch (error) {
        logError('Extendo: Failed to connect to Blackiya', extensionId, error);
        return null;
    }
};
