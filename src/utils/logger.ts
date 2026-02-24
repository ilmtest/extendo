import { Logger } from 'tslog';
import { browser } from 'wxt/browser';

const LOG_STORAGE_KEY = 'extendo_log_entries';
const MAX_LOG_ENTRIES = 500;
const LOG_FLUSH_DEBOUNCE_MS = 250;

const tsLogger = new Logger();

type LogEntry = {
    level: 'debug' | 'info' | 'error';
    message: string;
    timestamp: number;
};

let cachedEntries: LogEntry[] | null = null;
let pendingEntries: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;
let logVersion = 0;

const serializeArg = (value: unknown) => {
    if (value === null || value === undefined) {
        return String(value);
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    return String(value);
};

const trimEntries = (entries: LogEntry[]) => {
    if (entries.length <= MAX_LOG_ENTRIES) {
        return entries;
    }
    return entries.slice(entries.length - MAX_LOG_ENTRIES);
};

const readStoredEntries = async () => {
    try {
        const records = (await browser.storage.local.get(LOG_STORAGE_KEY)) ?? {};
        if (!Array.isArray(records[LOG_STORAGE_KEY])) {
            return [] as LogEntry[];
        }

        return trimEntries(records[LOG_STORAGE_KEY] as LogEntry[]);
    } catch (error) {
        tsLogger.error('Failed to read persisted logs', error);
        return [] as LogEntry[];
    }
};

const flushPendingEntries = async () => {
    if (flushPromise) {
        return flushPromise;
    }

    const flushVersion = logVersion;
    flushPromise = (async () => {
        if (flushTimer !== null) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }

        if (cachedEntries === null) {
            cachedEntries = await readStoredEntries();
        }

        while (pendingEntries.length > 0) {
            if (flushVersion !== logVersion) {
                return;
            }

            const batch = pendingEntries;
            pendingEntries = [];
            cachedEntries = trimEntries([...(cachedEntries ?? []), ...batch]);

            await browser.storage.local.set({ [LOG_STORAGE_KEY]: cachedEntries });
        }
    })()
        .catch((error) => {
            tsLogger.error('Failed to persist log entries', error);
        })
        .finally(() => {
            flushPromise = null;
            if (pendingEntries.length > 0 && flushTimer === null) {
                flushTimer = setTimeout(() => {
                    flushTimer = null;
                    void flushPendingEntries();
                }, LOG_FLUSH_DEBOUNCE_MS);
            }
        });

    return flushPromise;
};

const scheduleFlush = () => {
    if (flushTimer !== null || flushPromise) {
        return;
    }

    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushPendingEntries();
    }, LOG_FLUSH_DEBOUNCE_MS);
};

const queuePersistEntry = (entry: LogEntry) => {
    pendingEntries.push(entry);
    scheduleFlush();
};

const writeEntry = (level: LogEntry['level'], args: unknown[]) => {
    const message = args.map(serializeArg).join(' ');
    tsLogger[level](...args);
    const entry: LogEntry = { level, message, timestamp: Date.now() };
    queuePersistEntry(entry);
};

export const debug = (...args: unknown[]) => writeEntry('debug', args);
export const log = (...args: unknown[]) => writeEntry('info', args);
export const logError = (...args: unknown[]) => writeEntry('error', args);

export const getLogEntries = async () => {
    await flushPendingEntries();

    if (cachedEntries !== null) {
        return [...cachedEntries];
    }

    cachedEntries = await readStoredEntries();
    return [...cachedEntries];
};

export const clearLogEntries = async () => {
    const activeFlush = flushPromise;
    logVersion += 1;
    if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    pendingEntries = [];
    cachedEntries = [];

    if (activeFlush) {
        await activeFlush;
    }

    await browser.storage.local.set({ [LOG_STORAGE_KEY]: [] });
};
