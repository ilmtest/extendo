import { browser } from 'wxt/browser';
import { doGetRequest } from '@/src/api';
import { QUERY_LOOKUP_RESULTS_KEY } from '@/src/background/constants';
import type { CompilationFetchRequest, CompilationFetchResponse } from '@/src/background/types';
import { buildCompilationEndpoint } from '@/src/background/utils';
import { getIlmTestApiInstance, getTranslationsApiInstance, saveEntryResults } from '@/src/utils/db';
import { log, logError } from '@/src/utils/logger';

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

export const handleActiveTabUpdated = (_tabId: number, changeInfo: { status?: string }, tab: { active?: boolean }) => {
    if (changeInfo.status === 'complete' && tab.active) {
        browser.action.setBadgeText({ text: '' });
    }
};

export const handleRuntimeInstalled = (details: { reason: string }) => {
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

export const handleContextMenuClick = (info: { menuItemId?: string | number; selectionText?: string }) => {
    if (info.menuItemId === QUERY_LOOKUP_RESULTS_KEY && info.selectionText) {
        void performTextLookup(info.selectionText);
    }
};

export const handleRuntimeMessage = (
    message: unknown,
    _sender: unknown,
    sendResponse: (response?: unknown) => void,
) => {
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

    void runFetch().catch((error) => {
        const failureReason = error instanceof Error ? error.message : 'unknown runtime error';
        logError('Extendo: Unexpected compilation fetch handler failure', failureReason);
        sendResponse({
            ok: false,
            error: `Failed to fetch compilation excerpt. ${failureReason}`,
        } satisfies CompilationFetchResponse);
    });

    return true; // signal async response to browser runtime
};
