import { describe, expect, test } from 'bun:test';

import {
    buildSyntheticPullEvent,
    clearInFlightPayloadReservation,
    createPayloadFingerprintKey,
    hashPayloadForDedupe,
    isPayloadHashDuplicate,
    mapFromPersistedConversationHashEntries,
    rememberPayloadHash,
    rememberSeenEventId,
    reserveInFlightPayloadReservation,
    toPersistedConversationHashEntries,
} from '@/src/background/blackiya-sync-helpers';

describe('blackiya sync helpers', () => {
    test('buildSyntheticPullEvent creates stable pull event shape', () => {
        const event = buildSyntheticPullEvent({
            ok: true,
            api: 'blackiya.events.v1',
            ts: 123,
            conversation_id: 'conv-7',
            format: 'original',
            data: { x: 1 },
        });

        expect(event.event_id).toBe('pull:conv-7:123');
        expect(event.type).toBe('conversation.updated');
        expect(event.conversation_id).toBe('conv-7');
    });

    test('rememberSeenEventId dedupes and evicts oldest id', () => {
        const seen = new Set<string>();
        expect(rememberSeenEventId(seen, 'e1', 2)).toBe(true);
        expect(rememberSeenEventId(seen, 'e1', 2)).toBe(false);
        expect(rememberSeenEventId(seen, 'e2', 2)).toBe(true);
        expect(rememberSeenEventId(seen, 'e3', 2)).toBe(true);

        expect(seen.has('e1')).toBe(false);
        expect(seen.has('e2')).toBe(true);
        expect(seen.has('e3')).toBe(true);
    });

    test('payload hash dedupe only skips exact conversation hash match', () => {
        const hashes = new Map<string, string>();
        const payloadHash = hashPayloadForDedupe({ alpha: 1 });

        expect(isPayloadHashDuplicate(hashes, 'conv-1', payloadHash)).toBe(false);
        rememberPayloadHash(hashes, 'conv-1', payloadHash, 2);
        expect(isPayloadHashDuplicate(hashes, 'conv-1', payloadHash)).toBe(true);
        expect(isPayloadHashDuplicate(hashes, 'conv-2', payloadHash)).toBe(false);
    });

    test('payload hash is deterministic across object key ordering', () => {
        const left = hashPayloadForDedupe({
            a: 1,
            b: 2,
            nested: {
                z: 'z',
                y: 'y',
            },
        });
        const right = hashPayloadForDedupe({
            nested: {
                y: 'y',
                z: 'z',
            },
            b: 2,
            a: 1,
        });

        expect(left).toBe(right);
    });

    test('rememberPayloadHash evicts oldest conversation hash', () => {
        const hashes = new Map<string, string>();
        rememberPayloadHash(hashes, 'conv-1', 'h1', 2);
        rememberPayloadHash(hashes, 'conv-2', 'h2', 2);
        rememberPayloadHash(hashes, 'conv-3', 'h3', 2);

        expect(hashes.has('conv-1')).toBe(false);
        expect(hashes.get('conv-2')).toBe('h2');
        expect(hashes.get('conv-3')).toBe('h3');
    });

    test('persisted entry conversion round-trips', () => {
        const hashes = new Map<string, string>([
            ['conv-1', 'h1'],
            ['conv-2', 'h2'],
        ]);

        const persisted = toPersistedConversationHashEntries(hashes);
        const restored = mapFromPersistedConversationHashEntries(persisted, 10);

        expect(restored.get('conv-1')).toBe('h1');
        expect(restored.get('conv-2')).toBe('h2');
    });

    test('in-flight reservation prevents concurrent duplicate processing', () => {
        const inFlight = new Set<string>();
        const key = createPayloadFingerprintKey('conv-1', 'h1');

        expect(reserveInFlightPayloadReservation(inFlight, key)).toBe(true);
        expect(reserveInFlightPayloadReservation(inFlight, key)).toBe(false);

        clearInFlightPayloadReservation(inFlight, key);

        expect(reserveInFlightPayloadReservation(inFlight, key)).toBe(true);
    });
});
