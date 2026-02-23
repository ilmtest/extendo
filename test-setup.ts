import { mock } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// Mock wxt/browser
const storageMock = {
    local: {
        get: async () => ({}),
        remove: async () => {},
        set: async () => {},
    },
};

const browserMock = {
    runtime: {
        getURL: (path: string) => `chrome-extension://mock/${path}`,
    },
    storage: storageMock,
};

mock.module('wxt/browser', () => ({
    browser: browserMock,
}));

const testGlobal = globalThis as typeof globalThis & {
    browser: typeof browserMock;
    chrome: {
        runtime: {
            getURL: (path: string) => string;
        };
    };
};
testGlobal.browser = browserMock;
testGlobal.chrome = {
    runtime: {
        getURL: browserMock.runtime.getURL,
    },
};

// Mock logger globally to prevent storage writes during tests
mock.module('@/src/utils/logger', () => ({
    logger: {
        debug: () => {},
        error: () => {},
        info: () => {},
        warn: () => {},
    },
}));
