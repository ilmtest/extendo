import { browser } from 'wxt/browser';
import { createBlackiyaSyncManager } from '@/src/background/blackiya-sync-manager';
import {
    BLACKIYA_CONNECT_RETRY_MS,
    BLACKIYA_SYNC_HEARTBEAT_ALARM,
    BLACKIYA_SYNC_HEARTBEAT_MINUTES,
    MAX_SAVED_BLACKIYA_HASHES,
} from '@/src/background/constants';
import { getBlackiyaExtensionId, getBlackiyaSavedConversationHashes } from '@/src/utils/db';
import { log, logError } from '@/src/utils/logger';
import { connectToBlackiyaEvents, reconcileLatestAfterConnect } from './blackiya/connection';
import { processBlackiyaEvent } from './blackiya/event-processor';
import {
    handleActiveTabUpdated,
    handleContextMenuClick,
    handleRuntimeInstalled,
    handleRuntimeMessage,
} from './blackiya/handlers';

const startBlackiyaExternalApiSync = () =>
    createBlackiyaSyncManager({
        heartbeatAlarmName: BLACKIYA_SYNC_HEARTBEAT_ALARM,
        heartbeatPeriodInMinutes: BLACKIYA_SYNC_HEARTBEAT_MINUTES,
        reconnectDelayMs: BLACKIYA_CONNECT_RETRY_MS,
        maxSavedPayloadHashes: MAX_SAVED_BLACKIYA_HASHES,
        getBlackiyaExtensionId,
        getBlackiyaSavedConversationHashes,
        connectToBlackiyaEvents: (state, extensionId, triggerReason) =>
            connectToBlackiyaEvents(state, extensionId, triggerReason, processBlackiyaEvent),
        reconcileLatestAfterConnect: (state, extensionId, triggerReason) =>
            reconcileLatestAfterConnect(state, extensionId, triggerReason, processBlackiyaEvent),
        createHeartbeatAlarm: (name, periodInMinutes) => {
            browser.alarms.create(name, { periodInMinutes });
        },
        getDisconnectErrorMessage: () => browser.runtime.lastError?.message,
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        clearTimer: (timer) => clearTimeout(timer),
        log,
        logError,
    });

export default defineBackground(() => {
    const blackiyaSync = startBlackiyaExternalApiSync();
    blackiyaSync.init();

    browser.tabs.onUpdated.addListener(handleActiveTabUpdated);
    browser.runtime.onInstalled.addListener((details) => {
        handleRuntimeInstalled(details);
        void blackiyaSync.ensureConnectedAndReconciled('installed');
    });
    browser.runtime.onStartup.addListener(() => {
        void blackiyaSync.ensureConnectedAndReconciled('startup');
    });
    browser.alarms.onAlarm.addListener(blackiyaSync.handleAlarm);
    browser.contextMenus.onClicked.addListener(handleContextMenuClick);
    browser.runtime.onMessage.addListener(handleRuntimeMessage);
});
