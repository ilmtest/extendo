import { browser } from 'wxt/browser';
import { doGetRequest } from '@/src/api';
import {
    BLACKIYA_API_VERSION,
    BLACKIYA_CONNECT_RETRY_MS,
    BLACKIYA_EVENTS_PORT_NAME,
    MAX_SEEN_EVENT_IDS,
    QUERY_LOOKUP_RESULTS_KEY,
    TRANSLATIONS_API_PATH,
} from '@/src/background/constants';
import type {
    BlackiyaConversationEvent,
    BlackiyaHealthResponse,
    CompilationFetchRequest,
    CompilationFetchResponse,
    SaveBlackiyaJsonResponse,
} from '@/src/background/types';
import {
    buildCompilationEndpoint,
    isBlackiyaConversationEvent,
} from '@/src/background/utils';
import {
    getBlackiyaExtensionId,
    getIlmTestApiInstance,
    getTranslationsApiInstance,
    saveEntryResults,
} from '@/src/utils/db';
import { log, logError } from '@/src/utils/logger';

type RuntimePort = ReturnType<typeof browser.runtime.connect>;

const buildTranslationEndpoint = (translationsApiInstance: string, translationId: string) =>
    `${translationsApiInstance}${TRANSLATIONS_API_PATH}/${encodeURIComponent(translationId)}`;

const saveTranslationPayload = async (payload: string, translationId: string) => {
    const translationsApiInstance = await getTranslationsApiInstance();
    if (!translationsApiInstance) {
        const error = 'Translations API instance is not configured';
        logError('Extendo: Translation save failed', error);
        return { ok: false, error } satisfies SaveBlackiyaJsonResponse;
    }

    const endpoint = buildTranslationEndpoint(translationsApiInstance, translationId);

    try {
        log(`Extendo: POST /translations/${translationId} -> ${endpoint}`);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload,
        });

        if (!response.ok) {
            const failureReason = `${endpoint} -> ${response.status} ${response.statusText}`;
            logError('Extendo: Translation save failed', failureReason);
            return {
                ok: false,
                error: `Failed to save translation payload. ${failureReason}`,
            } satisfies SaveBlackiyaJsonResponse;
        }

        log(`Extendo: Translation saved for ${translationId} at ${endpoint}`);
        return { ok: true } satisfies SaveBlackiyaJsonResponse;
    } catch (error) {
        const failureReason =
            error instanceof Error ? `${endpoint} -> ${error.message}` : `${endpoint} -> request failed`;
        logError('Extendo: Translation save failed', failureReason);
        return {
            ok: false,
            error: `Failed to save translation payload. ${failureReason}`,
        } satisfies SaveBlackiyaJsonResponse;
    }
};

const performTextLookup = async (selectedText: string) => {
    if (!selectedText?.trim()) {
        return;
    }

    try {
        browser.action.setBadgeText({ text: '...' });

        const ilmTestApiInstance = await getIlmTestApiInstance();
        if (!ilmTestApiInstance) {
            browser.action.setBadgeText({ text: '' });
            return;
        }

        const urlWithQueryParams = `${ilmTestApiInstance}/entries.php?query=${encodeURIComponent(
            JSON.stringify([selectedText]),
        )}`;

        const data = await doGetRequest<Record<string, unknown>[]>(urlWithQueryParams);
        const results = data.map((item) => ({
            [`${QUERY_LOOKUP_RESULTS_KEY}_timestamp`]: new Date().toLocaleTimeString(),
            [QUERY_LOOKUP_RESULTS_KEY]: selectedText,
            ...item,
        }));

        browser.action.setBadgeText({ text: results.length.toString() });

        if (results.length > 0) {
            await saveEntryResults(results);
        }
    } catch (error) {
        logError('performTextLookup failed', error);
        browser.action.setBadgeText({ text: '!' });
    }
};

const saveBlackiyaConversationPayload = async (payload: Record<string, unknown>, translationId: string) => {
    const response = await saveTranslationPayload(JSON.stringify(payload), translationId);
    if (!response.ok) {
        logError('Extendo: Failed to save Blackiya JSON', response.error);
        return;
    }

    log('Extendo: Saved Blackiya JSON via background POST', translationId);
};

const processBlackiyaEvent = async (event: BlackiyaConversationEvent, seenEventIds: Set<string>) => {
    if (seenEventIds.has(event.event_id)) {
        return;
    }

    seenEventIds.add(event.event_id);
    if (seenEventIds.size > MAX_SEEN_EVENT_IDS) {
        const oldestEventId = seenEventIds.values().next().value;
        if (typeof oldestEventId === 'string') {
            seenEventIds.delete(oldestEventId);
        }
    }

    log('Extendo: Received Blackiya event', event.type, event.conversation_id);
    await saveBlackiyaConversationPayload(event.payload, event.conversation_id);
};

const isBlackiyaHealthy = async (extensionId: string) => {
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

const connectToBlackiyaEvents = async (seenEventIds: Set<string>, extensionId: string): Promise<RuntimePort | null> => {
    const healthy = await isBlackiyaHealthy(extensionId);
    if (!healthy) {
        return null;
    }

    try {
        const port = browser.runtime.connect(extensionId, {
            name: BLACKIYA_EVENTS_PORT_NAME,
        });

        port.onMessage.addListener((message) => {
            if (!isBlackiyaConversationEvent(message)) {
                return;
            }
            void processBlackiyaEvent(message, seenEventIds);
        });

        log('Extendo: Connected to Blackiya External API', extensionId);
        return port;
    } catch (error) {
        logError('Extendo: Failed to connect to Blackiya', extensionId, error);
    }

    return null;
};

const startBlackiyaExternalApiSync = () => {
    const seenEventIds = new Set<string>();
    let hasWarnedMissingExtensionId = false;

    const connect = async () => {
        const extensionId = await getBlackiyaExtensionId();
        if (!extensionId) {
            if (!hasWarnedMissingExtensionId) {
                logError('Extendo: Missing Blackiya extension ID in settings; skipping Blackiya sync');
                hasWarnedMissingExtensionId = true;
            }
            setTimeout(() => {
                void connect();
            }, BLACKIYA_CONNECT_RETRY_MS);
            return;
        }
        hasWarnedMissingExtensionId = false;

        const port = await connectToBlackiyaEvents(seenEventIds, extensionId);
        if (!port) {
            setTimeout(() => {
                void connect();
            }, BLACKIYA_CONNECT_RETRY_MS);
            return;
        }

        port.onDisconnect.addListener(() => {
            const disconnectError = browser.runtime.lastError;
            if (disconnectError?.message) {
                logError('Extendo: Disconnected from Blackiya', disconnectError.message);
            } else {
                log('Extendo: Disconnected from Blackiya');
            }

            setTimeout(() => {
                void connect();
            }, BLACKIYA_CONNECT_RETRY_MS);
        });
    };

    void connect();
};

const handleActiveTabUpdated = (_tabId: number, changeInfo: { status?: string }, tab: { active?: boolean }) => {
    if (changeInfo.status === 'complete' && tab.active) {
        browser.action.setBadgeText({ text: '' });
    }
};

const handleRuntimeInstalled = (details: { reason: string }) => {
    const manifestData = browser.runtime.getManifest();

    if (details.reason === 'install') {
        log(`${manifestData.name} by ${manifestData.author ?? 'unknown'} installed v${manifestData.version}.`);
    } else if (details.reason === 'update') {
        log(`${manifestData.name} by ${manifestData.author ?? 'unknown'} updated to v${manifestData.version}.`);
    }

    browser.contextMenus.removeAll().finally(() => {
        browser.contextMenus.create({
            contexts: ['selection'],
            id: QUERY_LOOKUP_RESULTS_KEY,
            title: 'Query Selected Text',
        });
    });
};

const handleContextMenuClick = (info: { menuItemId?: string | number; selectionText?: string }) => {
    if (info.menuItemId === QUERY_LOOKUP_RESULTS_KEY && info.selectionText) {
        void performTextLookup(info.selectionText);
    }
};

const handleRuntimeMessage = (message: unknown, _sender: unknown, sendResponse: (response?: unknown) => void) => {
    const typedMessage = message as CompilationFetchRequest | undefined;

    if (typedMessage?.type !== 'fetch-compilation-excerpt') {
        return;
    }

    const runFetch = async () => {
        const translationsApiInstance = await getTranslationsApiInstance();
        if (!translationsApiInstance) {
            sendResponse({
                ok: false,
                error: 'Translations API instance is not configured.',
            } satisfies CompilationFetchResponse);
            return;
        }

        const endpoint = buildCompilationEndpoint(
            translationsApiInstance,
            typedMessage.provider,
            typedMessage.maxTokens,
        );

        try {
            const response = await fetch(endpoint, { method: 'GET' });
            if (!response.ok) {
                sendResponse({
                    ok: false,
                    error: `Failed to fetch compilation excerpt. ${endpoint} -> ${response.status} ${response.statusText}`,
                } satisfies CompilationFetchResponse);
                return;
            }

            const text = await response.text();
            sendResponse({ ok: true, text } satisfies CompilationFetchResponse);
        } catch (error) {
            const failureReason =
                error instanceof Error ? `${endpoint} -> ${error.message}` : `${endpoint} -> request failed`;
            sendResponse({
                ok: false,
                error: `Failed to fetch compilation excerpt. ${failureReason}`,
            } satisfies CompilationFetchResponse);
        }
    };

    void runFetch();
    return true;
};

export default defineBackground(() => {
    startBlackiyaExternalApiSync();

    browser.tabs.onUpdated.addListener(handleActiveTabUpdated);
    browser.runtime.onInstalled.addListener(handleRuntimeInstalled);
    browser.contextMenus.onClicked.addListener(handleContextMenuClick);
    browser.runtime.onMessage.addListener(handleRuntimeMessage);
});
