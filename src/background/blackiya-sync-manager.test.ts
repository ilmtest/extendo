import { describe, expect, test } from 'bun:test';

import { createBlackiyaSyncManager } from '@/src/background/blackiya-sync-manager';
import type { PersistedConversationHashEntry } from '@/src/background/types';

const HEARTBEAT_ALARM_NAME = 'BLACKIYA_SYNC_HEARTBEAT';

const flushAsync = async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
    await Promise.resolve();
};

describe('blackiya sync manager', () => {
    test('init schedules heartbeat and runs bootstrap connect + reconcile', async () => {
        const alarms: Array<{ name: string; periodInMinutes: number }> = [];
        const connectCalls: string[] = [];
        const reconcileCalls: string[] = [];

        const manager = createBlackiyaSyncManager({
            heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
            heartbeatPeriodInMinutes: 1,
            reconnectDelayMs: 3000,
            maxSavedPayloadHashes: 200,
            getBlackiyaExtensionId: async () => 'ext-id',
            getBlackiyaSavedConversationHashes: async () => [],
            connectToBlackiyaEvents: async (_state, _extensionId, reason) => {
                connectCalls.push(reason);
                return {
                    onDisconnect: {
                        addListener: () => {},
                    },
                };
            },
            reconcileLatestAfterConnect: async (_state, _extensionId, reason) => {
                reconcileCalls.push(reason);
            },
            createHeartbeatAlarm: (name, periodInMinutes) => {
                alarms.push({ name, periodInMinutes });
            },
            getDisconnectErrorMessage: () => undefined,
            setTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
            clearTimer: () => {},
            log: () => {},
            logError: () => {},
        });

        manager.init();
        await flushAsync();

        expect(alarms).toEqual([{ name: HEARTBEAT_ALARM_NAME, periodInMinutes: 1 }]);
        expect(connectCalls).toEqual(['bootstrap']);
        expect(reconcileCalls).toEqual(['bootstrap']);
    });

    test('matching heartbeat alarm triggers reconcile while active connection avoids extra connect', async () => {
        const connectCalls: string[] = [];
        const reconcileCalls: string[] = [];

        const manager = createBlackiyaSyncManager({
            heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
            heartbeatPeriodInMinutes: 1,
            reconnectDelayMs: 3000,
            maxSavedPayloadHashes: 200,
            getBlackiyaExtensionId: async () => 'ext-id',
            getBlackiyaSavedConversationHashes: async () => [],
            connectToBlackiyaEvents: async (_state, _extensionId, reason) => {
                connectCalls.push(reason);
                return {
                    onDisconnect: {
                        addListener: () => {},
                    },
                };
            },
            reconcileLatestAfterConnect: async (_state, _extensionId, reason) => {
                reconcileCalls.push(reason);
            },
            createHeartbeatAlarm: () => {},
            getDisconnectErrorMessage: () => undefined,
            setTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
            clearTimer: () => {},
            log: () => {},
            logError: () => {},
        });

        await manager.ensureConnectedAndReconciled('startup');
        manager.handleAlarm({ name: 'OTHER_ALARM' });
        await flushAsync();
        manager.handleAlarm({ name: HEARTBEAT_ALARM_NAME });
        await flushAsync();

        expect(connectCalls).toEqual(['startup']);
        expect(reconcileCalls).toEqual(['startup', 'alarm_heartbeat']);
    });

    test('disconnect schedules reconnect and retries with disconnect reason', async () => {
        const disconnectHandlers: Array<() => void> = [];
        const connectCalls: string[] = [];
        const reconcileCalls: string[] = [];
        const timers = new Map<number, () => void>();
        let timerId = 0;

        const manager = createBlackiyaSyncManager({
            heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
            heartbeatPeriodInMinutes: 1,
            reconnectDelayMs: 3000,
            maxSavedPayloadHashes: 200,
            getBlackiyaExtensionId: async () => 'ext-id',
            getBlackiyaSavedConversationHashes: async () => [],
            connectToBlackiyaEvents: async (_state, _extensionId, reason) => {
                connectCalls.push(reason);
                return {
                    onDisconnect: {
                        addListener: (listener) => {
                            disconnectHandlers.push(listener);
                        },
                    },
                };
            },
            reconcileLatestAfterConnect: async (_state, _extensionId, reason) => {
                reconcileCalls.push(reason);
            },
            createHeartbeatAlarm: () => {},
            getDisconnectErrorMessage: () => undefined,
            setTimer: (callback) => {
                timerId += 1;
                timers.set(timerId, callback);
                return timerId as unknown as ReturnType<typeof setTimeout>;
            },
            clearTimer: (timer) => {
                timers.delete(timer as unknown as number);
            },
            log: () => {},
            logError: () => {},
        });

        await manager.ensureConnectedAndReconciled('startup');
        expect(connectCalls).toEqual(['startup']);

        disconnectHandlers[0]?.();
        expect(timers.size).toBe(1);

        const [scheduledId, callback] = [...timers.entries()][0];
        timers.delete(scheduledId);
        callback();
        await flushAsync();

        expect(connectCalls).toEqual(['startup', 'disconnect_retry']);
        expect(reconcileCalls).toEqual(['startup', 'disconnect_retry']);
    });

    test('state hydration restores persisted hashes with max bound before connect', async () => {
        const stateSnapshots: Array<Map<string, string>> = [];
        const persisted: PersistedConversationHashEntry[] = [
            ['conv-1', 'hash-1'],
            ['conv-2', 'hash-2'],
        ];

        const manager = createBlackiyaSyncManager({
            heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
            heartbeatPeriodInMinutes: 1,
            reconnectDelayMs: 3000,
            maxSavedPayloadHashes: 1,
            getBlackiyaExtensionId: async () => 'ext-id',
            getBlackiyaSavedConversationHashes: async () => persisted,
            connectToBlackiyaEvents: async (state) => {
                stateSnapshots.push(new Map(state.lastSavedHashByConversationId));
                return {
                    onDisconnect: {
                        addListener: () => {},
                    },
                };
            },
            reconcileLatestAfterConnect: async () => {},
            createHeartbeatAlarm: () => {},
            getDisconnectErrorMessage: () => undefined,
            setTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
            clearTimer: () => {},
            log: () => {},
            logError: () => {},
        });

        await manager.ensureConnectedAndReconciled('startup');

        expect(stateSnapshots).toHaveLength(1);
        expect(stateSnapshots[0].size).toBe(1);
        expect(stateSnapshots[0].get('conv-2')).toBe('hash-2');
    });

    test('missing extension id logs once and schedules reconnect', async () => {
        let reconnectSchedules = 0;
        let loggedMissingCount = 0;

        const manager = createBlackiyaSyncManager({
            heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
            heartbeatPeriodInMinutes: 1,
            reconnectDelayMs: 3000,
            maxSavedPayloadHashes: 200,
            getBlackiyaExtensionId: async () => '',
            getBlackiyaSavedConversationHashes: async () => [],
            connectToBlackiyaEvents: async () => null,
            reconcileLatestAfterConnect: async () => {},
            createHeartbeatAlarm: () => {},
            getDisconnectErrorMessage: () => undefined,
            setTimer: () => {
                reconnectSchedules += 1;
                return reconnectSchedules as unknown as ReturnType<typeof setTimeout>;
            },
            clearTimer: () => {},
            log: () => {},
            logError: (...args) => {
                if (String(args[0]).includes('Missing Blackiya extension ID')) {
                    loggedMissingCount += 1;
                }
            },
        });

        await manager.ensureConnectedAndReconciled('startup');
        await manager.ensureConnectedAndReconciled('startup');

        expect(reconnectSchedules).toBe(2);
        expect(loggedMissingCount).toBe(1);
    });

    test('does not reconcile when connect attempt fails', async () => {
        let reconcileCalls = 0;

        const manager = createBlackiyaSyncManager({
            heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
            heartbeatPeriodInMinutes: 1,
            reconnectDelayMs: 3000,
            maxSavedPayloadHashes: 200,
            getBlackiyaExtensionId: async () => 'ext-id',
            getBlackiyaSavedConversationHashes: async () => [],
            connectToBlackiyaEvents: async () => null,
            reconcileLatestAfterConnect: async () => {
                reconcileCalls += 1;
            },
            createHeartbeatAlarm: () => {},
            getDisconnectErrorMessage: () => undefined,
            setTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
            clearTimer: () => {},
            log: () => {},
            logError: () => {},
        });

        await manager.ensureConnectedAndReconciled('startup');

        expect(reconcileCalls).toBe(0);
    });

    test('waits for in-flight connect before reconciliation', async () => {
        let resolveConnect = () => {};
        const reconcileCalls: string[] = [];

        const manager = createBlackiyaSyncManager({
            heartbeatAlarmName: HEARTBEAT_ALARM_NAME,
            heartbeatPeriodInMinutes: 1,
            reconnectDelayMs: 3000,
            maxSavedPayloadHashes: 200,
            getBlackiyaExtensionId: async () => 'ext-id',
            getBlackiyaSavedConversationHashes: async () => [],
            connectToBlackiyaEvents: async () => {
                await new Promise<void>((resolve) => {
                    resolveConnect = () => {
                        resolve();
                    };
                });
                return {
                    onDisconnect: {
                        addListener: () => {},
                    },
                };
            },
            reconcileLatestAfterConnect: async (_state, _extensionId, reason) => {
                reconcileCalls.push(reason);
            },
            createHeartbeatAlarm: () => {},
            getDisconnectErrorMessage: () => undefined,
            setTimer: () => 1 as unknown as ReturnType<typeof setTimeout>,
            clearTimer: () => {},
            log: () => {},
            logError: () => {},
        });

        const startupRun = manager.ensureConnectedAndReconciled('startup');
        const heartbeatRun = manager.ensureConnectedAndReconciled('alarm_heartbeat');

        await flushAsync();
        expect(reconcileCalls).toHaveLength(0);

        resolveConnect();
        await startupRun;
        await heartbeatRun;

        expect(reconcileCalls).toEqual(['startup', 'alarm_heartbeat']);
    });
});
