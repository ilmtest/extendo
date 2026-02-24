import { TRANSLATIONS_API_PATH } from '@/src/background/constants';
import type { SaveBlackiyaJsonResponse } from '@/src/background/types';
import { getTranslationsApiInstance } from '@/src/utils/db';
import { log, logError } from '@/src/utils/logger';

const buildTranslationEndpoint = (translationsApiInstance: string, translationId: string) =>
    `${translationsApiInstance}${TRANSLATIONS_API_PATH}/${encodeURIComponent(translationId)}`;

const getPayloadStats = (payload: Record<string, unknown>) => {
    try {
        const payloadString = JSON.stringify(payload);
        return {
            keys: Object.keys(payload).length,
            bytes: payloadString.length,
            payloadString,
        };
    } catch {
        return {
            keys: Object.keys(payload).length,
            bytes: 0,
            payloadString: null,
        };
    }
};

const saveTranslationPayload = async (payload: string, translationId: string): Promise<SaveBlackiyaJsonResponse> => {
    const translationsApiInstance = await getTranslationsApiInstance();
    if (!translationsApiInstance) {
        const error = 'Translations API instance is not configured';
        logError('Extendo: Translation save failed', error);
        return { ok: false, error };
    }

    const endpoint = buildTranslationEndpoint(translationsApiInstance, translationId);

    try {
        log('Extendo: Starting translation POST', {
            translationId,
            endpoint,
            payloadBytes: payload.length,
        });
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
        });

        if (!response.ok) {
            const failureReason = `${endpoint} -> ${response.status} ${response.statusText}`;
            const responseBody = await response.text().catch(() => '');
            logError('Extendo: Translation save failed', failureReason);
            if (responseBody) {
                logError('Extendo: Translation save failure response body', responseBody);
            }
            return { ok: false, error: `Failed to save translation payload. ${failureReason}` };
        }

        const responseBody = await response.text().catch(() => '');
        log('Extendo: Translation POST completed', {
            translationId,
            endpoint,
            status: response.status,
            statusText: response.statusText,
            responseBytes: responseBody.length,
        });
        return { ok: true };
    } catch (error) {
        const failureReason =
            error instanceof Error ? `${endpoint} -> ${error.message}` : `${endpoint} -> request failed`;
        logError('Extendo: Translation save failed', failureReason);
        return { ok: false, error: `Failed to save translation payload. ${failureReason}` };
    }
};

export const saveBlackiyaConversationPayload = async (
    payload: Record<string, unknown>,
    translationId: string,
): Promise<boolean> => {
    const { keys, bytes, payloadString } = getPayloadStats(payload);
    if (!payloadString) {
        logError('Extendo: Failed to serialize Blackiya payload', {
            translationId,
            payloadKeys: keys,
        });
        return false;
    }

    log('Extendo: Saving Blackiya conversation payload', {
        translationId,
        payloadKeys: keys,
        payloadBytes: bytes,
    });

    const response = await saveTranslationPayload(payloadString, translationId);
    if (!response.ok) {
        logError('Extendo: Failed to save Blackiya JSON', response.error);
        return false;
    }

    log('Extendo: Saved Blackiya JSON via background POST', translationId);
    return true;
};
