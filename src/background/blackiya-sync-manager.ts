import { mapFromPersistedConversationHashEntries } from '@/src/background/blackiya-sync-helpers';
import type { PersistedConversationHashEntry } from '@/src/background/types';

export type BlackiyaSyncTriggerReason = 'bootstrap' | 'startup' | 'installed' | 'alarm_heartbeat' | 'disconnect_retry';

export type BlackiyaSyncState = {
    seenEventIds: Set<string>;
    lastSavedHashByConversationId: Map<string, string>;
    inFlightPayloadKeys: Set<string>;
};

type AlarmPayload = {
    name: string;
};

type SyncPort = {
    onDisconnect: {
        addListener: (listener: () => void) => void;
    };
};

type CreateBlackiyaSyncManagerOptions = {
    heartbeatAlarmName: string;
    heartbeatPeriodInMinutes: number;
    reconnectDelayMs: number;
    maxSavedPayloadHashes: number;
    getBlackiyaExtensionId: () => Promise<string>;
    getBlackiyaSavedConversationHashes: () => Promise<PersistedConversationHashEntry[]>;
    connectToBlackiyaEvents: (
        state: BlackiyaSyncState,
        extensionId: string,
        triggerReason: BlackiyaSyncTriggerReason,
    ) => Promise<SyncPort | null>;
    reconcileLatestAfterConnect: (
        state: BlackiyaSyncState,
        extensionId: string,
        triggerReason: BlackiyaSyncTriggerReason,
    ) => Promise<void>;
    createHeartbeatAlarm: (name: string, periodInMinutes: number) => void;
    getDisconnectErrorMessage: () => string | undefined;
    setTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
    clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
    log: (...args: unknown[]) => void;
    logError: (...args: unknown[]) => void;
};

export const createBlackiyaSyncManager = (options: CreateBlackiyaSyncManagerOptions) => {
    const state: BlackiyaSyncState = {
        seenEventIds: new Set<string>(),
        lastSavedHashByConversationId: new Map<string, string>(),
        inFlightPayloadKeys: new Set<string>(),
    };

    let activePort: SyncPort | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let connectPromise: Promise<boolean> | null = null;
    let hasWarnedMissingExtensionId = false;
    let hasHydrated = false;

    const hydrateState = async () => {
        if (hasHydrated) {
            return;
        }

        const persistedHashes = await options.getBlackiyaSavedConversationHashes();
        state.lastSavedHashByConversationId = mapFromPersistedConversationHashEntries(
            persistedHashes,
            options.maxSavedPayloadHashes,
        );
        hasHydrated = true;

        options.log('Extendo: Loaded persisted Blackiya hash dedupe cache', {
            conversations: state.lastSavedHashByConversationId.size,
        });
    };

    const clearReconnectTimer = () => {
        if (reconnectTimer !== null) {
            options.clearTimer(reconnectTimer);
            reconnectTimer = null;
        }
    };

    const scheduleReconnect = (triggerReason: BlackiyaSyncTriggerReason) => {
        clearReconnectTimer();
        reconnectTimer = options.setTimer(() => {
            reconnectTimer = null;
            void ensureConnectedAndReconciled(triggerReason);
        }, options.reconnectDelayMs);
    };

    const connect = async (extensionId: string, triggerReason: BlackiyaSyncTriggerReason) => {
        if (activePort !== null) {
            return true;
        }

        if (connectPromise) {
            return connectPromise;
        }

        connectPromise = (async () => {
            options.log('Extendo: Listener connect start', { extensionId, triggerReason });
            const port = await options.connectToBlackiyaEvents(state, extensionId, triggerReason);
            if (!port) {
                scheduleReconnect(triggerReason);
                return false;
            }

            clearReconnectTimer();
            activePort = port;
            options.log('Extendo: Listener connect success', { extensionId, triggerReason });

            port.onDisconnect.addListener(() => {
                activePort = null;
                const disconnectMessage = options.getDisconnectErrorMessage();
                if (disconnectMessage) {
                    options.logError('Extendo: Disconnected from Blackiya', {
                        message: disconnectMessage,
                        triggerReason: 'disconnect_retry',
                    });
                } else {
                    options.log('Extendo: Disconnected from Blackiya', {
                        triggerReason: 'disconnect_retry',
                    });
                }

                scheduleReconnect('disconnect_retry');
            });

            return true;
        })().finally(() => {
            connectPromise = null;
        });

        return connectPromise;
    };

    const ensureConnectedAndReconciled = async (triggerReason: BlackiyaSyncTriggerReason) => {
        await hydrateState();

        const extensionId = await options.getBlackiyaExtensionId();
        if (!extensionId) {
            if (!hasWarnedMissingExtensionId) {
                options.logError('Extendo: Missing Blackiya extension ID in settings; skipping Blackiya sync');
                hasWarnedMissingExtensionId = true;
            }
            scheduleReconnect(triggerReason);
            return;
        }
        hasWarnedMissingExtensionId = false;

        const connected = await connect(extensionId, triggerReason);
        if (!connected) {
            options.log('Extendo: Skipping reconcile; Blackiya listener is not connected', {
                extensionId,
                triggerReason,
            });
            return;
        }

        await options.reconcileLatestAfterConnect(state, extensionId, triggerReason);
    };

    const scheduleHeartbeatAlarm = () => {
        options.createHeartbeatAlarm(options.heartbeatAlarmName, options.heartbeatPeriodInMinutes);
        options.log('Extendo: Scheduled Blackiya sync heartbeat alarm', {
            alarmName: options.heartbeatAlarmName,
            periodInMinutes: options.heartbeatPeriodInMinutes,
        });
    };

    const handleAlarm = (alarm: AlarmPayload) => {
        if (alarm.name !== options.heartbeatAlarmName) {
            return;
        }

        void ensureConnectedAndReconciled('alarm_heartbeat');
    };

    const init = () => {
        options.log('Extendo: Starting Blackiya event sync bootstrap');
        scheduleHeartbeatAlarm();
        void ensureConnectedAndReconciled('bootstrap');
    };

    return {
        ensureConnectedAndReconciled,
        handleAlarm,
        init,
        state,
    };
};
